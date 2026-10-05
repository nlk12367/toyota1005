import json, os, sqlite3
from contextlib import contextmanager
from pathlib import Path

class Store:
    def __init__(self):
        self.url=os.getenv('DATABASE_URL','')
        if not self.url:
            self.path=Path(os.getenv('DATA_DIR','data'))/'vehicles.sqlite3'
            self.path.parent.mkdir(parents=True,exist_ok=True)
        with self.connect() as con:
            con.execute('CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
    @contextmanager
    def connect(self):
        if self.url:
            import psycopg
            con=psycopg.connect(self.url,connect_timeout=15)
        else:con=sqlite3.connect(self.path,timeout=30)
        try:
            yield con
            con.commit()
        except Exception:
            con.rollback()
            raise
        finally:con.close()
    def get(self,key,default=None):
        with self.connect() as con:
            row=con.execute('SELECT value FROM app_state WHERE key='+('%s' if self.url else '?'),(key,)).fetchone()
            return json.loads(row[0]) if row else default
    def put(self,key,value):
        marks='%s,%s' if self.url else '?,?'
        with self.connect() as con:
            con.execute('INSERT INTO app_state (key,value) VALUES ('+marks+') ON CONFLICT(key) DO UPDATE SET value=excluded.value',(key,json.dumps(value,ensure_ascii=False)))
    def seed(self):
        base=Path(__file__).parent/'seed'
        for name in ('vehicles','rates'):
            if self.get(name) is None:
                self.put(name,json.loads((base/(name+'.json')).read_text(encoding='utf-8')))

    def import_history(self):
        """Merge versioned archival records into existing deployed databases."""
        base=Path(__file__).parent/'seed'
        file=base/'history.json'
        if not file.exists():return
        archive=json.loads(file.read_text(encoding='utf-8'))
        incoming={x['id']:x for x in archive}
        existing=self.get('vehicles',[])
        kept=[x for x in existing if x.get('id') not in incoming and not str(x.get('id','')).startswith(('archive-gov-','archive-yahoo-'))]
        self.put('vehicles',kept+archive)
