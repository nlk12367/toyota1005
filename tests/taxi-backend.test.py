"""Local SQLite/HTTP regression, no collector network or user input upload."""
import sys, tempfile, os, threading, urllib.request, urllib.error, json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import app
from collectors import parse_electricity_prices
from storage import Store
from http.server import ThreadingHTTPServer
scratch=Path(__file__).resolve().parents[3]/'work'
scratch.mkdir(exist_ok=True)
os.environ['DATABASE_URL']=''
with tempfile.TemporaryDirectory(dir=scratch) as directory:
    os.environ['DATA_DIR']=directory
    app.store=Store(); app.store.seed(); app.store.import_history()
    fixture={'metadata':{'實施日期':'2025-10-01'},'data':{
        '表燈非時間電價':{'住宅用':{
            '120度以下部分':{'夏月':{'單價':1.78},'非夏月':{'單價':1.78}},
            '121~330度部分':{'夏月':{'單價':2.55},'非夏月':{'單價':2.26}},
            '331~500度部分':{'夏月':{'單價':3.8},'非夏月':{'單價':3.13}},
            '501~700度部分':{'夏月':{'單價':5.14},'非夏月':{'單價':4.24}},
            '701~1000度部分':{'夏月':{'單價':6.44},'非夏月':{'單價':5.27}},
            '1001度以上部分':{'夏月':{'單價':8.86},'非夏月':{'單價':7.03}}}},
        '電動車充換電設施電價':{'流動電費':{
            '週一至週五':{
                '尖峰時間':{'夏月':{'單價':12.47,'時段':'16:00~22:00'},'非夏月':{'單價':12.14,'時段':'15:00~21:00'}},
                '離峰時間':{'夏月':{'單價':3.05,'時段':'00:00~16:00/22:00~24:00'},'非夏月':{'單價':2.9,'時段':'00:00~15:00/21:00~24:00'}}},
            '週六、週日及離峰日':{'離峰時間':{'夏月':{'單價':3.05},'非夏月':{'單價':2.9}}}}}}}
    tariff=parse_electricity_prices(json.dumps(fixture,ensure_ascii=False).encode())
    assert tariff['residential']['summer'][0]=={'limit':120,'rate':1.78}
    assert tariff['residential']['non_summer'][-1]=={'limit':None,'rate':7.03}
    assert tariff['ev_facility']['weekday_peak_summer']==12.47
    assert tariff['ev_facility']['weekend_non_summer']==2.9
    app.store.put('electricity_rates',tariff)
    cached=app.store.get('vehicles');assert app.store.get('vehicles') is cached
    os.environ['DATA_DIR']=str(Path(directory)/'cache-probe')
    probe=Store();probe.put('vehicles',[{'id':'first'}]);first=probe.get('vehicles')
    assert probe.get('vehicles') is first
    replacement=[{'id':'replacement'}];probe.put('vehicles',replacement)
    assert probe.get('vehicles') is replacement
    os.environ['DATA_DIR']=directory
    server=ThreadingHTTPServer(('127.0.0.1',0),app.Handler)
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    base='http://127.0.0.1:'+str(server.server_port)
    try:
        with urllib.request.urlopen(base+'/') as response:
            assert response.headers['Cache-Control']=='no-store'
            body=response.read();page=body.decode();assert len(body)<200_000
            assert page.count('<script src="./taxi.js"></script>')==1
            assert '計程車營運版比較系統' in page
            embedded=page.split('<script id="vehicleData" type="application/json">',1)[1].split('</script>',1)[0]
            assert all('specs' not in item for item in json.loads(embedded))
            assert '<script src="./vendor/tex-svg.js"></script>' not in page
        with urllib.request.urlopen(base+'/api/vehicles?scope=current&summary=1') as response:
            listing=json.load(response);assert listing['count']>0 and listing['vehicles']
            first=listing['vehicles'][0];assert 'specs' not in first and isinstance(first['ref'],int)
        with urllib.request.urlopen(base+'/api/vehicle-detail?ref='+str(first['ref'])) as response:
            detail=json.load(response);assert detail['specs']
        with urllib.request.urlopen(base+'/api/vehicles?scope=history&summary=1') as response:
            listing=json.load(response);assert listing['count']>0 and 'specs' not in listing['vehicles'][0]
        with urllib.request.urlopen(base+'/taxi.js') as response:
            assert response.status==200 and response.headers['Cache-Control']=='no-cache' and b'TaxiModel' in response.read()
        for asset in ['/taxi-config.js','/images/advisor-mascot.svg','/images/night-mountains.svg','/liff-ui.js','/liff-ui.css','/formulas.js','/vendor/tex-svg.js','/vendor/leaflet.js','/vendor/leaflet.css','/vendor/taiwan-outline.js','/region-map.js','/google-map-config.js','/google-region-map.js']:
            with urllib.request.urlopen(base+asset) as response: assert response.status==200 and len(response.read())>0
        with urllib.request.urlopen(base+'/api/electricity-rates') as response:
            assert response.headers['Cache-Control']=='no-store'
            published=json.load(response);assert published['residential']['summer'][0]['rate']==1.78
            assert published['ev_facility']['weekday_peak_summer']==12.47
        with urllib.request.urlopen(base+'/api/rates') as response:
            oil=json.load(response);assert oil['prices']['95']>0 and oil['effective_label'] and 'checked_at' in oil
        with urllib.request.urlopen(base+'/health') as response:
            assert json.load(response)['ok']
        os.environ['GOOGLE_MAPS_API_KEY']='test-only-key'
        os.environ['GOOGLE_MAPS_MAP_ID']='test-only-map'
        with urllib.request.urlopen(base+'/google-map-config.js') as response:
            assert response.headers['Cache-Control']=='no-store'
            config=json.loads(response.read().decode().split('=',1)[1].rstrip(';'))
            assert config=={'apiKey':'test-only-key','mapId':'test-only-map'}
        del os.environ['GOOGLE_MAPS_API_KEY'];del os.environ['GOOGLE_MAPS_MAP_ID']
        try: urllib.request.urlopen(base+'/app.py'); raise AssertionError('source exposed')
        except urllib.error.HTTPError as e: assert e.code==404
        print(f'Backend checks passed: HTML {len(body):,} bytes, lazy summary/detail endpoints, electricity tariff validation/API, cache headers, health, source restriction; SQLite seed/history unchanged.')
    finally:server.shutdown();server.server_close();thread.join()

