from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import re, hashlib

ROOT=Path(__file__).resolve().parents[1]
OLD=ROOT/'reference/v1/public'
OUT=ROOT/'dist'
errors=[]
class Document(HTMLParser):
    def __init__(self,text):
        super().__init__();self.links=[];self.ids=set();self.tags=[];self.feed(text)
    def handle_starttag(self,tag,attrs):
        a=dict(attrs);self.tags.append((tag,a))
        if 'id' in a:self.ids.add(a['id'])
        for key in ['href','src']:
            if a.get(key):self.links.append((tag,key,a[key]))

docs={p:Document(p.read_text()) for p in OUT.rglob('*.html')}
old_routes={p.relative_to(OLD) for p in OLD.rglob('*.html')}
for route in old_routes:
    if not (OUT/route).is_file():errors.append(f'Missing route {route}')
for name in ['terms.html','privacy.html','refund.html','code-of-conduct.html']:
    old=re.search(r'<main\b[^>]*>.*?</main>',(OLD/name).read_text(),re.S).group(0)
    new=re.search(r'<main\b[^>]*>.*?</main>',(OUT/name).read_text(),re.S).group(0)
    old=old.replace('elan@sgischool.in','the.elan.summit@gmail.com')
    if old!=new:errors.append(f'Changed legal main content: {name}')
for old in [OLD/'favicon.ico',*list((OLD/'assets/img').rglob('*'))]:
    if old.is_file():
        new=OUT/old.relative_to(OLD)
        if not new.exists() or hashlib.sha256(old.read_bytes()).digest()!=hashlib.sha256(new.read_bytes()).digest():errors.append(f'Missing/changed brand asset: {old.name}')
for path,doc in docs.items():
    if path.name.startswith('google'):continue
    for tag,key,ref in doc.links:
        url=urlsplit(ref)
        if url.scheme or url.netloc:continue
        if not url.path:target=path
        elif url.path.startswith('/'):target=OUT/url.path.lstrip('/')
        else:target=path.parent/unquote(url.path)
        target=target.resolve()
        if target.is_dir():target=target/'index.html'
        if not target.exists():errors.append(f'Broken local reference {path.relative_to(OUT)} -> {ref}')
        elif url.fragment and target in docs and url.fragment not in docs[target].ids:errors.append(f'Broken anchor {path.relative_to(OUT)} -> {ref}')
    scripts=[a.get('src','') for tag,a in doc.tags if tag=='script' and a.get('type')!='application/ld+json']
    if scripts!=['/assets/site.js','/assets/polish.js']:errors.append(f'Unexpected script in {path.name}: {scripts}')
    if not any(tag=='link' and a.get('rel')=='icon' for tag,a in doc.tags):errors.append(f'No favicon on {path.name}')
    if 'elan@sgischool.in' in path.read_text():errors.append(f'Old contact email in {path.name}')
    if 'aohgapmexswwzvcxknbg' in path.read_text():errors.append(f'Old production backend in served page {path.name}')
if errors:
    print('\n'.join(errors));raise SystemExit(1)
print(f'PASS: {len(old_routes)} original routes retained; {len(docs)} total pages; all local references resolve.')
print('PASS: Legal main bodies unchanged except approved contact email; original favicon and all image assets preserved byte-for-byte.')
print('PASS: No old production backend or executable legacy payment/auth scripts in served pages.')
