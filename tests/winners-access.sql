begin;
insert into public.elan_winners(id,competition,award,name,approved,published) values
('00000000-0000-4000-8000-000000000001','Crisis Command','TEST','TEST DRAFT',false,false),
('00000000-0000-4000-8000-000000000002','Crisis Command','TEST','TEST PUBLIC',true,true);
set local role anon;
do $$ begin
 if (select count(*) from public.elan_winners where id in ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002'))<>1 then raise exception 'Draft visibility failed'; end if;
 begin insert into public.elan_winners(competition,award,name) values('Crisis Command','TEST','BAD'); raise exception 'Anon write allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',true);
set local role authenticated;
do $$ begin
 begin insert into public.elan_winners(competition,award,name) values('Crisis Command','TEST','BAD'); raise exception 'Nonadmin insert allowed'; exception when insufficient_privilege then null; end;
 update public.elan_winners set name='BAD' where id='00000000-0000-4000-8000-000000000002';
 if found then raise exception 'Nonadmin update allowed'; end if;
 delete from public.elan_winners where id='00000000-0000-4000-8000-000000000002';
 if found then raise exception 'Nonadmin delete allowed'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select user_id::text from public.elan_staff where role='admin' limit 1),true);
set local role authenticated;
do $$ declare new_id uuid; begin
 insert into public.elan_winners(competition,award,name) values('Cent$ible','TEST','TEST ADMIN') returning id into new_id;
 update public.elan_winners set approved=true,published=true,sort_order=2 where id=new_id;
 if not found then raise exception 'Admin update failed'; end if;
 delete from public.elan_winners where id=new_id;
 if not found then raise exception 'Admin delete failed'; end if;
 begin update public.elan_winners set published=true where id='00000000-0000-4000-8000-000000000001'; raise exception 'Unapproved publication allowed'; exception when check_violation then null; end;
end $$;
rollback;
select 'PASS: public reads only approved published winners; nonadmins cannot write; admin CRUD and permission constraint pass; fixtures rolled back' as result;
