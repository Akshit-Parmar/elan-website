"""Offline release checks; never connects to production or sends email."""
from pathlib import Path
import subprocess,sys,os
root=Path(__file__).resolve().parents[1]
def run(args,env=None):
 print('Checking: '+' '.join(args),flush=True)
 subprocess.run(args,cwd=root,check=True,env=env)
run([sys.executable,'scripts/build.py'])
for script in ['verify.py','verify-modules.py','verify-search.py']:
 run([sys.executable,'scripts/'+script])
run(['node','--test',*[str(p.relative_to(root)) for p in sorted((root/'tests').glob('*.test.mjs'))]])
for pattern in ['*-dom.mjs','*-postgres.mjs']:
 for p in sorted((root/'tests').glob(pattern)):run(['node',str(p.relative_to(root))])
for mode in ['error','reject']:
 run(['node','tests/recruitment-dashboard-dom.mjs'],{**os.environ,'HEALTH_MODE':mode})
print('Release checks passed. Deploy separately; verify live login and key pages after deployment.')
