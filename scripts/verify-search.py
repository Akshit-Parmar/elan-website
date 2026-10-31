from pathlib import Path
from html.parser import HTMLParser
import json,xml.etree.ElementTree as ET
from search_metadata import ORIGIN,DESCRIPTIONS,canonical
out=Path(__file__).resolve().parents[1]/'dist'
class Head(HTMLParser):
 def __init__(self,text):
  super().__init__();self.meta={};self.canon=[];self.schemas=[];self.ld=False;self.feed(text)
 def handle_starttag(self,t,a):
  a=dict(a)
  if t=='meta':self.meta[a.get('name',a.get('property'))]=a.get('content')
  if t=='link' and a.get('rel')=='canonical':self.canon.append(a['href'])
  if t=='script' and a.get('type')=='application/ld+json':self.ld=True
 def handle_endtag(self,t):
  if t=='script':self.ld=False
 def handle_data(self,s):
  if self.ld:self.schemas.append(json.loads(s))
urls=[e.text for e in ET.parse(out/'sitemap.xml').findall('.//{*}loc')]
assert len(urls)==len(set(urls))==len(DESCRIPTIONS)
for p in out.rglob('*.html'):
 if p.name.startswith('google'):continue
 path=p.relative_to(out).as_posix();h=Head(p.read_text());public=path in DESCRIPTIONS
 assert h.canon==[canonical(path)],path
 assert ('noindex' not in h.meta['robots'])==public,path
 assert (canonical(path) in urls)==public,path
 assert h.meta['og:url']==canonical(path),path
 if public:
  assert h.meta['description']==DESCRIPTIONS[path],path
  assert len(h.schemas)==1 and h.schemas[0]['@context']=='https://schema.org',path
  assert h.schemas[0]['@graph'][2]['url']==canonical(path),path
assert len(set(DESCRIPTIONS.values()))==len(DESCRIPTIONS)
robots=(out/'robots.txt').read_text()
assert robots.startswith('User-agent: *\nAllow: /\n')
assert 'Sitemap: '+ORIGIN+'/sitemap.xml' in robots
assert 'User-agent: OAI-SearchBot\nAllow: /' in robots
assert (out/'google93c0d60b076d9bb6.html').read_bytes()==(out.parent/'reference/v1/public/google93c0d60b076d9bb6.html').read_bytes()
print(f'PASS: {len(urls)} canonical public URLs; unique descriptions, JSON-LD and social URLs verified. Account pages excluded. Search Console verification file preserved.')
