"""Configure a portable export using PUBLIC credentials only."""
import argparse,json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--url',required=True);p.add_argument('--publishable-key',required=True);p.add_argument('--origin',required=True);a=p.parse_args()
if not a.publishable_key.startswith('sb_publishable_'):p.error('Only a Supabase publishable key belongs in the frontend.')
if not a.url.startswith('https://') or not a.origin.startswith(('https://','http://localhost','http://127.0.0.1')):p.error('Use HTTPS for hosted URLs.')
root=Path(__file__).resolve().parents[1]
c=json.loads((root/'src/public-config.json').read_text());old=c['supabaseUrl'];c.update(supabaseUrl=a.url.rstrip('/'),publishableKey=a.publishable_key)
(root/'src/public-config.json').write_text(json.dumps(c,indent=2))
b=root/'scripts/build.py';s=b.read_text();import re;s=re.sub(r"ORIGIN='[^']*'",'ORIGIN='+repr(a.origin.rstrip('/')),s);b.write_text(s)
p=root/'scripts/content-schema.sql';p.write_text(p.read_text().replace(old,a.url.rstrip('/')))
print('Public configuration updated. Set ALLOWED_ORIGINS, Auth redirect URLs, and backend secrets separately; rebuild the site.')
