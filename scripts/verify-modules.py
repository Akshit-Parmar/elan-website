from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]/'dist'
missing=[]
for p in (root/'assets').glob('*.js'):
 for ref in re.findall(r'(?:from\s*|import\s*\(\s*)[\'\"]([^\'\"]+)[\'\"]',p.read_text()):
  if ref.startswith(('./','../','/assets/')):
   target=root/ref.lstrip('/') if ref.startswith('/') else p.parent/ref
   if not target.exists():missing.append(f'{p.name} -> {ref}')
assert not missing,'Missing module dependencies: '+str(missing)
print('PASS: all static and dynamic local module imports resolve in the deployment.')
