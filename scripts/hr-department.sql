-- HR uses the existing department task, briefing and submission tools.
-- Recruitment review remains restricted to appointed leadership and admin.
insert into public.elan_oc_modules(department,tool) values ('HR (Human Resource)','general') on conflict (department) do nothing;
