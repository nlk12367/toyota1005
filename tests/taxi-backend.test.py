"""Local SQLite/HTTP regression, no collector network or user input upload."""
import sys, tempfile, os, threading, urllib.request, urllib.error, json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import app
from storage import Store
from http.server import ThreadingHTTPServer
scratch=Path(__file__).resolve().parents[3]/'work'
scratch.mkdir(exist_ok=True)
os.environ['DATABASE_URL']=''
with tempfile.TemporaryDirectory(dir=scratch) as directory:
    os.environ['DATA_DIR']=directory
    app.store=Store(); app.store.seed(); app.store.import_history()
    server=ThreadingHTTPServer(('127.0.0.1',0),app.Handler)
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    base='http://127.0.0.1:'+str(server.server_port)
    try:
        with urllib.request.urlopen(base+'/') as response:
            page=response.read().decode();assert page.count('<script src="./taxi.js"></script>')==1
            assert '計程車營運版比較系統' in page
        with urllib.request.urlopen(base+'/taxi.js') as response:
            assert response.status==200 and b'TaxiModel' in response.read()
        for asset in ['/liff-ui.js','/liff-ui.css','/formulas.js','/vendor/tex-svg.js','/vendor/leaflet.js','/vendor/leaflet.css','/vendor/taiwan-outline.js','/region-map.js','/google-map-config.js','/google-region-map.js']:
            with urllib.request.urlopen(base+asset) as response: assert response.status==200 and len(response.read())>0
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
        print('Backend checks passed: rendered page, taxi.js, health, source restriction; SQLite seed/history unchanged.')
    finally:server.shutdown();server.server_close();thread.join()

