from pathlib import Path
import hashlib,json
from search_metadata import canonical,social_metadata

def build_apps(root):
 src=root/'src';out=root/'dist'
 for name in ['app-home.css','app-home.js','pwa.js']:(out/'assets'/name).write_bytes((src/name).read_bytes())
 (out/'app.html').write_bytes((src/'app-home.html').read_bytes())
 (out/'offline.html').write_bytes((src/'offline.html').read_bytes())
 for name in ['app.html','offline.html']:
  page=out/name;text=page.read_text();url=canonical(name)
  extra='<link rel="icon" href="/favicon.ico"><link rel="canonical" href="'+url+'"><meta property="og:url" content="'+url+'">'+social_metadata('Élan Summit','Your event, application and team workspace.')
  page.write_text(text.replace('</head>',extra+'</head>'))
 version=hashlib.sha256(b''.join(p.read_bytes() for p in sorted(src.rglob('*')) if p.is_file())).hexdigest()[:16]
 (out/'service-worker.js').write_text((src/'service-worker.js').read_text().replace('__VERSION__',version))
 manifest=json.loads((out/'site.webmanifest').read_text());manifest.update(id='/',start_url='/app.html',scope='/',display='standalone',background_color='#f7f3eb',description='Your Élan Summit event, application and team workspace.')
 manifest['shortcuts']=[{'name':'My workspace','url':'/app.html'},{'name':'Apply for the OC','url':'/join-oc-2027.html'},{'name':'Explore Élan','url':'/next-edition.html'}]
 (out/'site.webmanifest').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
 for page in out.rglob('*.html'):
  if page.name in ['offline.html','app.html']:continue
  body=page.read_text()
  if '</body>' not in body:continue
  body=body.replace('</body>','<script type="module" src="/assets/pwa.js"></script></body>')
  body=body.replace('<div class="footer-legal">','<div class="footer-legal"><a href="/app.html">Get the Élan app</a>',1)
  page.write_text(body)
 with (out/'_headers').open('a') as f:f.write('\n/service-worker.js\n  Cache-Control: no-cache\n  Service-Worker-Allowed: /\n\n/app.html\n  X-Robots-Tag: noindex, follow\n\n/offline.html\n  X-Robots-Tag: noindex, follow\n')
