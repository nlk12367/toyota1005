"""Adapters for the Taiwan official specification pages already present in the seed.
PDFs and Tesla pages are monitored for changes, not guessed into PS/km/L fields.
"""
import hashlib,html,json,re
from datetime import datetime
from zoneinfo import ZoneInfo
from urllib.request import Request,urlopen
from html.parser import HTMLParser

OIL_URL='https://www.cpc.com.tw/GetOilPriceJson.aspx?type=TodayOilPriceString'
ELECTRICITY_URL='https://service.taipower.com.tw/data/opendata/apply/file/d007008/001.json'
def now(): return datetime.now(ZoneInfo('Asia/Taipei')).isoformat(timespec='seconds')
def fetch(url):
    with urlopen(Request(url,headers={'User-Agent':'VehicleComparison/1.0 (+official-specification-monitor)','Accept':'text/html,application/json,application/pdf'}),timeout=30) as r:
        if r.status!=200: raise ValueError('HTTP '+str(r.status))
        b=r.read(25*1024*1024+1)
        if len(b)>25*1024*1024: raise ValueError('Source exceeds 25 MiB')
        return b
def clean(x): return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]*>',' ',str(x)))).strip()
def num(x):
    m=re.match(r'\s*([0-9]+(?:\.[0-9]+)?)',x.replace(',',''))
    return float(m[1]) if m else None
class N:
    def __init__(self,tag='',attrs=()): self.tag=tag;self.a=dict(attrs);self.children=[]
    def text(self): return ' '.join(c.text() if isinstance(c,N) else c for c in self.children).strip()
    def all(self,p):
        result=[]
        for c in self.children:
            if isinstance(c,N):
                if p(c): result.append(c)
                result.extend(c.all(p))
        return result
    def cls(self,v): return v in self.a.get('class','').split()
class P(HTMLParser):
    def __init__(self,t): super().__init__();self.root=N();self.stack=[self.root];self.feed(t)
    def handle_starttag(self,tag,attrs):
        n=N(tag,attrs);self.stack[-1].children.append(n)
        if tag not in ('meta','link','img','input','br','hr','source','area','wbr','base','embed','param'):self.stack.append(n)
    def handle_endtag(self,tag):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag==tag: self.stack=self.stack[:i];break
    def handle_data(self,s): self.stack[-1].children.append(s)
def matrix(table):
    result=[];pending={}
    for tr in table.all(lambda n:n.tag=='tr'):
        row={};new={}
        for c,(txt,left) in pending.items():
            row[c]=txt
            if left>1:new[c]=(txt,left-1)
        col=0
        for cell in [n for n in tr.children if isinstance(n,N) and n.tag in ('td','th')]:
            while col in row:col+=1
            for k in range(int(cell.a.get('colspan','1'))):
                row[col+k]=clean(cell.text())
                if int(cell.a.get('rowspan','1'))>1:new[col+k]=(clean(cell.text()),int(cell.a['rowspan'])-1)
            col+=int(cell.a.get('colspan','1'))
        pending=new;result.append([row.get(i,'') for i in range(max(row,default=-1)+1)])
    return result
def record(template,variant,pairs,power=None,model=None):
    mode=power or template['power']
    def find(predicate):return next((num(b) for a,b in pairs if predicate(a) and num(b) is not None),None)
    combined=find(lambda a:('綜效' in a or '系統總' in a) and ('馬力' in a or '輸出' in a))
    hp=combined if combined is not None else (None if mode in ('HEV','PHEV') else find(lambda a:'馬力' in a and '馬達' not in a and '電動' not in a))
    eff=find(lambda a:('用電效率' in a) if mode=='BEV' else ('平均油耗' in a or '油耗測試值' in a or ('測試值' in a and ('km/L' in a or 'km/l' in a or '能源效率' in a))))
    if hp is not None and not 1<=hp<=2000:raise ValueError('Horsepower outside supported bounds')
    if eff is not None and not .1<=eff<=(1000 if mode=='PHEV' else 100):raise ValueError('Efficiency outside supported bounds')
    grade=next(('95' for a,b in pairs if ('適用燃料' in a or '燃料種類' in a) and '95' in b),None)
    # Preserve verified RAV4 manual grade only for the same source/variant.
    if grade is None and template.get('variant')==variant and template.get('grade'):grade=template['grade']
    return dict(brand=template['brand'],model=model or template['model'],variant=variant,power=mode,hp=hp,eff=eff,grade=grade,source=template['source'],date=now()[:10],status='官方規格已自動更新',specs=pairs)
def parse_vehicles(content,existing):
    t=content.decode('utf-8-sig');root=P(t).root;first=existing[0];brand=first['brand'];url=first['source'];out=[]
    def template(v):return next((x for x in existing if x['variant']==v),first)
    if brand=='Toyota':
        rows=[]
        for row in root.all(lambda n:n.cls('compare-row')):
            cols=row.all(lambda n:n.cls('compare-content-col'))
            if cols:rows.append([clean(n.text()) for n in cols])
        if len(rows)<2:raise ValueError('Toyota specification structure changed')
        for i,v in enumerate(rows[0][1:],1):
            pairs=[[r[0],r[i]] for r in rows[1:] if len(r)>i]
            combined=any('綜效馬力' in a and num(b) for a,b in pairs)
            mode='PHEV' if 'PHEV' in v+rows[0][0] else 'BEV' if first['power']=='BEV' else '柴油' if first['power']=='柴油' else 'HEV' if combined else '汽油'
            out.append(record(template(v),v,pairs,mode,rows[0][0]))
    elif brand in ('Mitsubishi','Hyundai'):
        split=re.split(r'var spec_data\s*=\s*',t,maxsplit=1)
        if len(split)!=2:raise ValueError('Specification JSON not found')
        data=json.JSONDecoder().raw_decode(split[1])[0]
        names={n.a['value']:clean(n.text()) for n in root.all(lambda n:n.tag=='option' and n.a.get('value','').isdigit())}
        for key,groups in data.items():
            if key not in names:raise ValueError('Variant labels not found')
            v=names[key];pairs=[[clean(r['title']),clean(r['spec'])] for g in groups.values() for r in g]
            mode='MHEV' if brand=='Mitsubishi' and first['power']=='MHEV' else 'HEV' if any('綜效' in a and num(b) for a,b in pairs) else '汽油'
            out.append(record(template(v),v,pairs,mode))
    elif brand=='Nissan':
        tables=root.all(lambda n:n.tag=='table')
        if not tables:raise ValueError('Nissan table missing')
        rows=matrix(tables[0]);labels=3 if first['model']=='SENTRA' else 2;variants=rows[0][labels:]
        for i,v in enumerate(variants):
            pairs=[[' / '.join(dict.fromkeys(a for a in r[:labels] if a)),r[labels+i]] for r in rows[1:] if len(r)==len(rows[0])]
            out.append(record(template(v),v,pairs,'汽油'))
    elif brand=='Honda' and first['model']=='CR-V':
        # Match published headers to known order; a changed roster requires review.
        variants=['VTi-S','S','e:HEV S','e:HEV Prestige']
        header_text=' '.join(clean(n.text()) for n in root.all(lambda n:n.tag in ('th','td')))
        if not all(v in header_text for v in variants):raise ValueError('Honda CR-V variants changed')
        pairs=[[] for _ in variants]
        for table in root.all(lambda n:n.tag=='table'):
            for r in matrix(table):
                if len(r)==5 and r[0] and r[1:]!=variants:
                    for i in range(4):pairs[i].append([r[0],r[i+1]])
        out=[record(template(v),v,pairs[i],'HEV' if 'e:HEV' in v else '汽油') for i,v in enumerate(variants)]
    elif brand=='Honda' and first['model']=='FIT':
        variants={}
        for block in root.all(lambda n:n.tag=='div' and n.cls('showHideContainer')):
            forms=block.all(lambda n:n.tag=='div' and n.cls('specForm'))
            if not forms:continue
            heads=[clean(n.text()) for n in forms[0].all(lambda n:n.tag=='div' and n.cls('specForm-td'))]
            for form in forms[1:]:
                vals=[clean(n.text()) for n in form.all(lambda n:n.tag=='div' and n.cls('specForm-td'))]
                if vals and len(vals)==len(heads):variants.setdefault(vals[0],[]).extend([[a,b] for a,b in zip(heads[1:],vals[1:])])
        out=[record(template(v),v,pairs,'HEV' if 'e:HEV' in v else '汽油') for v,pairs in variants.items()]
    else:return None
    if not out or any(not x['variant'] or len(x['specs'])<5 for x in out):raise ValueError('Incomplete specification data')
    if len(out)<max(1,len(existing)//2):raise ValueError('Too many variants disappeared; review required')
    if len({(x['model'],x['variant'],x['power']) for x in out})!=len(out):raise ValueError('Duplicate variant labels')
    # Do not overwrite a previously known core value with a blank extraction.
    for item in out:
        prior=next((x for x in existing if x['variant']==item['variant'] and x['power']==item['power']),None)
        if prior and any(prior.get(k) is not None and item.get(k) is None for k in ('hp','eff')):
            raise ValueError('A previously known specification disappeared; review required')
    return out
def oil_prices():
    payload=json.loads(fetch(OIL_URL).decode('utf-8-sig'))
    prices={grade:float(payload[field]) for grade,field in [('92','sPrice1'),('95','sPrice2'),('98','sPrice3'),('diesel','sPrice5')]}
    if not all(1<v<100 for v in prices.values()):raise ValueError('Oil prices out of range')
    if not prices['92']<=prices['95']<=prices['98']:raise ValueError('Oil grade prices inconsistent')
    return dict(prices=prices,source=OIL_URL,effective_label=payload['PriceUpdate'],checked_at=now())

def parse_electricity_prices(content):
    """Validate Taipower's public tariff JSON before replacing saved rates."""
    payload=json.loads(content.decode('utf-8-sig'))
    metadata=payload['metadata'];data=payload['data']
    effective_date=metadata['實施日期']
    if not re.fullmatch(r'20\d{2}-\d{2}-\d{2}',str(effective_date)):
        raise ValueError('Taipower tariff effective date is invalid')
    household=data['表燈非時間電價']['住宅用']
    brackets=[('120度以下部分',120),('121~330度部分',330),('331~500度部分',500),('501~700度部分',700),('701~1000度部分',1000),('1001度以上部分',None)]
    residential={}
    for season,official in [('summer','夏月'),('non_summer','非夏月')]:
        tiers=[]
        for label,limit in brackets:
            rate=float(household[label][official]['單價'])
            if not 0<rate<100:raise ValueError('Taipower household rate outside supported range')
            tiers.append({'limit':limit,'rate':rate})
        if any(a['rate']>b['rate'] for a,b in zip(tiers,tiers[1:])):
            raise ValueError('Taipower household tiers are inconsistent')
        residential[season]=tiers
    facility=data['電動車充換電設施電價']['流動電費']
    weekday=facility['週一至週五'];weekend=facility['週六、週日及離峰日']['離峰時間']
    ev_facility={
        'weekday_peak_summer':float(weekday['尖峰時間']['夏月']['單價']),
        'weekday_peak_non_summer':float(weekday['尖峰時間']['非夏月']['單價']),
        'weekday_off_peak_summer':float(weekday['離峰時間']['夏月']['單價']),
        'weekday_off_peak_non_summer':float(weekday['離峰時間']['非夏月']['單價']),
        'weekend_summer':float(weekend['夏月']['單價']),
        'weekend_non_summer':float(weekend['非夏月']['單價']),
        'weekday_peak_hours_summer':weekday['尖峰時間']['夏月']['時段'],
        'weekday_peak_hours_non_summer':weekday['尖峰時間']['非夏月']['時段'],
    }
    rate_fields=('weekday_peak_summer','weekday_peak_non_summer','weekday_off_peak_summer',
                 'weekday_off_peak_non_summer','weekend_summer','weekend_non_summer')
    if not all(0<ev_facility[key]<100 for key in rate_fields):
        raise ValueError('Taipower EV facility rates outside supported range')
    return {'source':ELECTRICITY_URL,'effective_date':effective_date,'checked_at':now(),
            'residential':residential,'ev_facility':ev_facility,
            'summer_months':[6,7,8,9]}

def electricity_prices():
    return parse_electricity_prices(fetch(ELECTRICITY_URL))
