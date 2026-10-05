import hashlib,hmac,json,logging,os,re,threading,time
from collections import defaultdict
from datetime import datetime
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit,parse_qs
from collectors import fetch,parse_vehicles,oil_prices,now
from storage import Store

BASE=Path(__file__).parent
log=logging.getLogger('vehicle-service')
store=None
update_lock=threading.Lock()
stop=threading.Event()

def record_event(kind,message):
    events=store.get('events',[])
    events.append(dict(time=now(),kind=kind,message=message))
    store.put('events',events[-100:])

def refresh(kind='all'):
    if not update_lock.acquire(blocking=False):return False
    try:
        if kind in ('all','oil'):
            try:
                rates=oil_prices();store.put('rates',rates)
                store.put('oil_job',dict(attempt=now(),ok=True))
                record_event('oil','中油牌價更新成功')
            except Exception as e:
                store.put('oil_job',dict(attempt=now(),ok=False,error=str(e)))
                record_event('oil','更新失敗，保留上次牌價：'+str(e))
        if kind in ('all','vehicles'):
            vehicles=store.get('vehicles',[]);groups=defaultdict(list)
            for item in vehicles:
                if not item.get('history'):groups[item['source']].append(item)
            state=store.get('sources',{})
            for url,existing in groups.items():
                previous=state.get(url,{})
                try:
                    content=fetch(url);digest=hashlib.sha256(content).hexdigest()
                    parsed=None if content.startswith(b'%PDF') or '.pdf' in url.lower() else parse_vehicles(content,existing)
                    if parsed is not None:
                        vehicles=[x for x in vehicles if x.get('history') or x['source']!=url]+parsed
                        store.put('vehicles',vehicles)
                        entry=dict(status='updated',checked_at=now(),success_at=now(),hash=digest,count=len(parsed),brand=existing[0]['brand'])
                    else:
                        changed=bool(previous.get('hash') and previous['hash']!=digest)
                        entry={**previous,'status':'review_required' if changed or previous.get('status')=='review_required' else 'monitored','checked_at':now(),'hash':digest,'brand':existing[0]['brand'],'count':len(existing)}
                    state[url]=entry
                except Exception as e:
                    state[url]={**previous,'status':'error','checked_at':now(),'error':str(e),'brand':existing[0]['brand'],'count':len(existing)}
                store.put('sources',state)
                if stop.is_set():break
            store.put('vehicles_job',dict(attempt=now(),sources=len(state),updated=sum(x['status']=='updated' for x in state.values())))
            record_event('vehicles','完成已收錄來源檢查；失敗或待確認來源保留原資料')
        return True
    finally:update_lock.release()

def due(key,hours):
    stamp=store.get(key,{}).get('attempt')
    if not stamp:return True
    return time.time()-datetime.fromisoformat(stamp).timestamp()>=hours*3600
def schedule():
    while not stop.is_set():
        try:
            oil=due('oil_job',max(1,float(os.getenv('OIL_INTERVAL_HOURS','6'))))
            cars=due('vehicles_job',max(1,float(os.getenv('VEHICLE_INTERVAL_HOURS','168'))))
            if oil or cars:refresh('all' if oil and cars else 'oil' if oil else 'vehicles')
        except Exception:log.exception('Scheduled update failed')
        stop.wait(60)

def status():
    vehicles=store.get('vehicles',[]);sources=store.get('sources',{})
    return dict(vehicle_count=len(vehicles),historical_count=sum(bool(x.get('history')) for x in vehicles),current_count=sum(not x.get('history') for x in vehicles),brand_count=len({x['brand'] for x in vehicles}),running=update_lock.locked(),automatic=os.getenv('AUTO_UPDATE','true').lower()=='true',oil=store.get('oil_job',{}),vehicles=store.get('vehicles_job',{}),sources=sources,events=store.get('events',[]),storage='PostgreSQL' if store.url else 'SQLite')

def render_page():
    s=(BASE/'public/index.html').read_text(encoding='utf-8')
    vehicles=store.get('vehicles',[]);rates=store.get('rates',{})
    payload=json.dumps(vehicles,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
    s=re.sub(r'(<script id="vehicleData" type="application/json">).*?(</script>)',lambda m:m[1]+payload+m[2],s,flags=re.S)
    prices=json.dumps(rates['prices'],separators=(',',':'))
    s=re.sub(r"prices=\{[^}]+\},rates=",lambda m:'prices='+prices+',rates=',s,count=1)
    effective=rates.get('effective_label','2026/10/05');checked=rates.get('checked_at') or '尚未自動更新，使用初始牌價'
    # Keep tariff dates and car year information unchanged; only current oil labels change.
    for grade,label in [('92','92 無鉛'),('95','95 無鉛'),('98','98 無鉛'),('diesel','超級柴油')]:
        s=re.sub(re.escape(label)+r' · [\d.]+ 元/L',label+' · '+str(rates['prices'][grade])+' 元/L',s)
    s=s.replace('2026/10/05 生效快照，非即時連線；站點優惠另計。',effective+' 生效；站點優惠另計。')
    s=s.replace('請依原車手冊確認油種；牌價採 2026/10/05 快照。','請依車主手冊確認油種；目前牌價生效日：'+effective+'。')
    s=s.replace('油價採中油 2026/10/05 牌價；','油價由中油資料定期更新；')
    s=s.replace('離線資料不會自動更新。','車款規格依各筆標示的整理日期；電價目前仍為固定資料。')
    s=re.sub(r'9 個品牌、158 種車款',str(len({x['brand'] for x in vehicles}))+' 個品牌、'+str(len(vehicles))+' 種車款',s)
    pending=sum(x.get('status')=='review_required' for x in store.get('sources',{}).values())
    text='油價生效日：'+effective+'｜最近取得資料：'+checked+'。車款資料依各筆日期顯示。'
    if pending:text+=' 有 '+str(pending)+' 個來源更新待確認，暫沿用上一筆規格。'
    import html
    banner='<aside class="panel" style="margin:20px 0;padding:18px" aria-label="資料更新狀態"><strong>資料更新狀態</strong><p class="note">'+html.escape(text)+'</p><a href="/status">查看更新紀錄</a></aside>'
    s=s.replace('<section id="catalog"',banner+'<section id="catalog"',1)
    return s

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(BASE/'public'),**kwargs)
    def send_json(self,payload,code=200):
        b=json.dumps(payload,ensure_ascii=False).encode();self.send_response(code);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
    def send_html(self,s):
        b=s.encode();self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
    def do_GET(self):
        u=urlsplit(self.path)
        if u.path in ('/','/index.html'):return self.send_html(render_page())
        if u.path=='/health':return self.send_json({'ok':True,'vehicles':len(store.get('vehicles',[]))})
        if u.path=='/api/vehicles':
            q=parse_qs(u.query);data=store.get('vehicles',[])
            for field in ('brand','power','year','year_kind'):
                if q.get(field):data=[x for x in data if str(x.get(field,''))==q[field][0]]
            scope=q.get('scope',[''])[0]
            if scope=='current':data=[x for x in data if not x.get('history')]
            elif scope=='history':data=[x for x in data if x.get('history') and not x.get('classic')]
            elif scope=='classic':data=[x for x in data if x.get('classic')]
            if q.get('q'):
                term=q['q'][0].lower();data=[x for x in data if term in (x['brand']+' '+x['model']+' '+x['variant']+' '+' '.join(x.get('aliases',[]))).lower()]
            return self.send_json({'count':len(data),'vehicles':data})
        if u.path=='/api/rates':return self.send_json(store.get('rates'))
        if u.path=='/api/status':return self.send_json(status())
        if u.path=='/status':
            return self.send_html('''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>資料更新紀錄</title><style>body{font:16px system-ui;max-width:1000px;margin:30px auto;padding:20px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f3f5f4;padding:20px}a{color:#264e36}</style><a href="/">回到換車比較</a><h1>資料更新紀錄</h1><p>updated：已更新規格；monitored：僅監測來源；review_required：來源有變更，沿用舊規格；error：取得或解析失敗，沿用舊資料。</p><pre id="result">正在讀取…</pre><script>fetch('/api/status').then(r=>{if(!r.ok)throw Error();return r.json()}).then(x=>document.getElementById('result').textContent=JSON.stringify(x,null,2)).catch(()=>document.getElementById('result').textContent='無法取得更新紀錄，請稍後重試。');</script></html>''')
        if u.path.startswith('/api/'):return self.send_json({'error':'Not found'},404)
        if u.path not in ('/favicon.ico',) and not u.path.startswith('/images/'):return self.send_error(404)
        # Restrict static requests to known image files; no source, seed, or database exposure.
        file=(BASE/'public'/u.path.lstrip('/')).resolve()
        if BASE.joinpath('public').resolve() not in file.parents:return self.send_error(404)
        return super().do_GET()
    def do_HEAD(self):
        if urlsplit(self.path).path in ('/','/index.html','/health'):
            self.send_response(200);self.send_header('Cache-Control','no-store');self.end_headers()
        else:self.send_error(404)
    def do_POST(self):
        if urlsplit(self.path).path!='/api/update':return self.send_json({'error':'Not found'},404)
        token=os.getenv('ADMIN_TOKEN','');auth=self.headers.get('Authorization','')
        if not token or not hmac.compare_digest(auth,'Bearer '+token):return self.send_json({'error':'Unauthorized'},401)
        if update_lock.locked():return self.send_json({'error':'Update already running'},409)
        kind=parse_qs(urlsplit(self.path).query).get('kind',['all'])[0]
        if kind not in ('all','oil','vehicles'):return self.send_json({'error':'Unsupported update kind'},400)
        threading.Thread(target=refresh,args=(kind,),daemon=True).start()
        return self.send_json({'accepted':True,'kind':kind},202)

def main():
    global store
    logging.basicConfig(level=logging.INFO);store=Store();store.seed();store.import_history()
    if os.getenv('AUTO_UPDATE','true').lower()=='true':threading.Thread(target=schedule,daemon=True).start()
    server=ThreadingHTTPServer(('0.0.0.0',int(os.getenv('PORT','8080'))),Handler)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:stop.set();server.server_close()
if __name__=='__main__':main()
