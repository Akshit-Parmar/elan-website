from pathlib import Path
root=Path(__file__).resolve().parents[1]
files=[root/'scripts/content-schema.sql',*sorted((root/'supabase/migrations').glob('*.sql')),root/'scripts/guest-seed.sql']
(root/'supabase/fresh-project.sql').write_text('-- FRESH EMPTY PROJECT ONLY. Do not run on the existing hosted database.\n\n'+'\n\n'.join('-- '+str(f.relative_to(root))+'\n'+f.read_text() for f in files))
print('Wrote supabase/fresh-project.sql')
