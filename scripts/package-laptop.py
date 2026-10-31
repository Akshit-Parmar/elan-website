from pathlib import Path
import shutil, subprocess, re, os, zipfile
repo=Path(__file__).resolve().parents[1]
import argparse
parser=argparse.ArgumentParser(description='Build the complete laptop browsing ZIP')
parser.add_argument('--output',type=Path,required=True)
args=parser.parse_args()
root=args.output.resolve()/'Elan-Laptop-Package'
if root.exists():shutil.rmtree(root)
root.mkdir(parents=True,exist_ok=True)
source=root/'Full-Project';source.mkdir(exist_ok=True)
for name in subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard'],cwd=repo,text=True).splitlines():
 if name.startswith('.git') or name.startswith('.openai/'):continue
 p=repo/name
 if p.is_file():
  dst=source/name;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dst)
web=root/'Browse-Website';shutil.copytree(repo/'dist',web,dirs_exist_ok=True)
for p in web.rglob('*.html'):
 s=p.read_text()
 def rel(m):
  value=m.group(3); target,sep,frag=value.partition('#'); target,querysep,query=target.partition('?')
  path=web/target.lstrip('/')
  if path.is_dir():path=path/'index.html'
  value=os.path.relpath(path,p.parent).replace(os.sep,'/')+(querysep+query if querysep else '')+(sep+frag if sep else '')
  return m.group(1)+m.group(2)+value+m.group(2)
 s=re.sub(r'((?:href|src|action|poster)=)([\"\'])(/(?!/)[^\"\']*)\2',rel,s)
 p.write_text(s)
site=web/'assets/site.js';s=site.read_text();s='\n'.join(s.splitlines()[2:])
s=re.sub(r'import\([\"\']/assets/([^\"\']+)[\"\']\)',r'loadLocalScript("\1")',s)
s='''const localAssetBase = new URL('.',document.currentScript.src);
function loadLocalScript(name){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL(name,localAssetBase);s.onload=resolve;s.onerror=reject;document.head.append(s);});}
if(document.querySelector('[data-app],form[data-mode="stored-enquiry"]')){
 const notice=document.createElement('p');notice.className='app-status';notice.textContent='Local preview — forms are disabled. You can contact the team by email. See START-HERE.txt for connected mode.';
 const status=document.querySelector('#app-status');if(status){status.textContent=notice.textContent;}else{(document.querySelector('main')||document.body).prepend(notice);}
 document.querySelectorAll('form').forEach(f=>{f.addEventListener('submit',e=>e.preventDefault());f.querySelectorAll('button[type=submit],input[type=submit]').forEach(b=>b.disabled=true);});
}
''' +s
site.write_text(s)
p=web/'assets/enhancements.js';s=p.read_text().replace("try{const config=await fetch", "try{throw new Error('Bundled local content');const config=await fetch");p.write_text(s)
(root/'OPEN-WEBSITE.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Open Élan Summit</title><meta http-equiv="refresh" content="0;url=Browse-Website/index.html"><body style="background:#e9d4c3;color:#13273f;font:20px Georgia;padding:50px"><h1>Élan Summit</h1><a href="Browse-Website/index.html">Open the website →</a><p>If the website does not open, extract the entire ZIP first, then open this file.</p></body></html>''')
(root/'start_website.py').write_text('''from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
import webbrowser
root = Path(__file__).resolve().parent / 'Full-Project' / 'dist'
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(root)))
url = 'http://127.0.0.1:%s' % server.server_port
print('Elan Summit is running at ' + url)
print('Keep this window open while browsing. Close it or press Ctrl+C to stop.')
webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
''')
(root/'START-WEBSITE-WINDOWS.bat').write_bytes(b'''@echo off\r\ncd /d "%~dp0"\r\npy -3 --version >nul 2>&1\r\nif not errorlevel 1 (\r\n py -3 start_website.py\r\n goto finished\r\n)\r\npython --version >nul 2>&1\r\nif not errorlevel 1 (\r\n python start_website.py\r\n goto finished\r\n)\r\necho Python 3 is required for the live-connected local server.\r\necho Install it from https://www.python.org/downloads/ then try again.\r\necho You can browse without installing anything: open OPEN-WEBSITE.html instead.\r\n:finished\r\npause\r\n''')
(root/'START-HERE.txt').write_text('''ELAN SUMMIT - LAPTOP PACKAGE - 28 OCTOBER 2026

1. Download the ZIP to your laptop.
2. Right-click it and choose Extract All. Extract everything together.
3. Open the extracted Elan-Laptop-Package folder.
4. Double-click OPEN-WEBSITE.html. It opens in your default browser.

No installation is needed for this browsing copy. All website pages, local photos,
logo, favicon, biographies, terms and visual scripts are included. Internal
links have been adapted to work directly from files. Keep the folders together.
Google web fonts load when connected; offline the site uses fallback fonts.

LIVE-CONNECTED MODE
For login, enquiries and database features, install Python 3 if needed, then
double-click START-WEBSITE-WINDOWS.bat. This starts a local-only web server and
opens your browser. Keep its terminal window open while browsing. On Mac/Linux,
run python3 start_website.py from this folder.

The server uses the actual prebuilt application and its existing Supabase
connection. Internet is required. Changes submitted here can affect the live
project. Auth email links also depend on Supabase redirect/SMTP configuration.
Registration remains closed and payments require merchant setup; downloading
this ZIP does not activate those features.

WHAT IS INCLUDED
Browse-Website: direct-file browsing copy, with live submissions disabled.
Full-Project: current source, unmodified deployable dist, Supabase API,
migrations, content seeds, tests, docs, assets and retained original reference.
Full-Project/docs/SETUP.md: complete backend/deployment setup instructions.

The current contact email is the.elan.summit@gmail.com. The two Crisis Command
judges and Shreeni's portrait are included. Devika's supplied portrait is included.

This includes backend SOURCE and setup files, not a running offline Supabase
service or a backup of managed accounts, private database data, secrets or
merchant credentials. Backend services remain hosted. It does not include the
entire 30+ GB event-photo collection; it includes the website's selected assets.
''')
# Validate every static local HTML resource/link after rewriting.
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
missing=[]
class Check(HTMLParser):
 def handle_starttag(self,tag,attrs):
  for k,v in attrs:
   if k not in ('href','src','poster') or not v:continue
   u=urlsplit(v)
   if u.scheme or u.netloc or not u.path:continue
   dest=(self.path.parent/unquote(u.path)).resolve()
   if not dest.exists():missing.append((str(self.path.relative_to(web)),v))
for p in web.rglob('*.html'):
 c=Check();c.path=p;c.feed(p.read_text())
assert not missing,missing
for p in (web/'assets').glob('*.js'):
 subprocess.run(['node','--check',str(p)],check=True,capture_output=True)
archive=root.parent/'Elan-Laptop-Complete.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(root.rglob('*')):
  if p.is_file():z.write(p,p.relative_to(root.parent))
with zipfile.ZipFile(archive) as z:assert z.testzip() is None
print(str(archive));print(f'{archive.stat().st_size/1024/1024:.1f} MB; {len(list(web.rglob("*.html")))} browsable pages; all local HTML links valid')
