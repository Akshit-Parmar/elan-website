from pathlib import Path
import shutil, subprocess, re, os, zipfile
repo=Path(__file__).resolve().parents[1]
import argparse
parser=argparse.ArgumentParser(description='Build the complete laptop browsing ZIP')
parser.add_argument('--output',type=Path,required=True)
args=parser.parse_args()
root=args.output.resolve()/'Elan-Homepage-Preview'
if root.exists():shutil.rmtree(root)
root.mkdir(parents=True,exist_ok=True)
source=root/'Changed-Source';source.mkdir(exist_ok=True)
for name in ('src/home.html','src/crisis.html','src/flagships.js','src/editorial.css','src/about.html','src/founders.html','src/app.js','src/app.css','src/site.js','src/site-photos.js','src/enhancements.js','scripts/build.py'):
 p=repo/name;dst=source/name;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dst)
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
(root/'START-HERE.txt').write_text("""ELAN HOMEPAGE PREVIEW

Extract the entire ZIP, then double-click OPEN-WEBSITE.html.
This is a separate homepage design preview, not a production update.
The live website and the previously accepted release are unchanged.

The revised homepage retains the original palette, logo and 3D entrance.
It preserves the original opening copy and archive photo link, with shorter story sections,
a real event photograph and a compact archive link in its footer.
The First edition menu is present consistently on every page.
Crisis Command now includes a photo-led briefing, a cabinet section and a scroll-driven simulation sequence, with clearly labelled 2026 details. About and Founders now have revised layouts, portrait navigation and more personal copy.

Forms and account actions are disabled in this local browsing copy.
Fonts load with an internet connection; fallback fonts are used offline.
Changed-Source contains all revised source files for review.

ADMIN PHOTO EDITOR (requires the connected website)
After deployment, sign in as admin and open Website photos. Filter by page,
choose Change photo, select a JPEG/PNG/WebP under 8 MB, preview it and save.
If a photo appears on several pages, changing it updates those appearances;
the editor lists the affected pages. Restore original reverses the replacement.
Guest and gallery records remain editable through their existing admin tabs.
Uploads use the existing Supabase media storage and admin-only save endpoint.
No new database migration is needed. The real signed-in upload/save flow still
needs an authenticated test after deployment. This offline copy cannot upload.
Do not upload this preview ZIP as a production release.
""")
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
archive=root.parent/'Elan-Homepage-Preview.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(root.rglob('*')):
  if p.is_file():z.write(p,p.relative_to(root.parent))
with zipfile.ZipFile(archive) as z:assert z.testzip() is None
print(str(archive));print(f'{archive.stat().st_size/1024/1024:.1f} MB; {len(list(web.rglob("*.html")))} browsable pages; all local HTML links valid')
