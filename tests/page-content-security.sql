begin;
select set_config('request.jwt.claims',json_build_object('sub',(select user_id from public.elan_staff where role='admin' limit 1),'role','authenticated')::text,true);
set local role authenticated;
insert into public.elan_page_content(key,page,text,published) values('00000000000000000000000000000001','qa-test.html','Temporary policy verification',false);
update public.elan_page_content set text='Updated by existing admin role' where key='00000000000000000000000000000001';
do $$ begin
 if not exists(select 1 from public.elan_page_content where key='00000000000000000000000000000001' and text='Updated by existing admin role') then raise exception 'Admin update failed';end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ declare n integer; begin
 begin
 insert into public.elan_page_content(key,page,text) values('00000000000000000000000000000002','qa-test.html','Must be denied');
 raise exception 'Non-admin insert was allowed';
 exception when insufficient_privilege then null; end;
 update public.elan_page_content set text='Must not change' where key='00000000000000000000000000000001';get diagnostics n=row_count;
 if n<>0 then raise exception 'Non-admin update was allowed';end if;
 if exists(select 1 from public.elan_page_content where key='00000000000000000000000000000001') then raise exception 'Unpublished row exposed';end if;
end $$;
reset role;
set local role anon;
do $$ begin
 if exists(select 1 from public.elan_page_content where key='00000000000000000000000000000001') then raise exception 'Draft exposed to anon';end if;
 begin
 insert into public.elan_page_content(key,page,text) values('00000000000000000000000000000003','qa-test.html','Must be denied');raise exception 'Anon insert was allowed';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
update public.elan_page_content set published=true where key='00000000000000000000000000000001';
set local role anon;
do $$ begin
 if not exists(select 1 from public.elan_page_content where key='00000000000000000000000000000001') then raise exception 'Published content not readable';end if;
end $$;
reset role;
rollback;
select 'PASS: admin write, non-admin denial, anon denial, draft privacy and published reads; test rows rolled back' as result;
