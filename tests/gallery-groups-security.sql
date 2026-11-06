-- Run after the incremental migration, inside a rollback-only transaction.
insert into auth.users(id,email) values('10000000-0000-4000-8000-000000000091','gallery-test@example.invalid');
insert into public.elan_staff(user_id,role) values('10000000-0000-4000-8000-000000000091','admin');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000091',true);
set local role authenticated;
select public.elan_manage_gallery_group('create','QA album',null);
reset role;
insert into public.elan_media(id,edition_slug,title,alt_text,image_url,category,credit,published,sort_order) values('10000000-0000-4000-8000-000000000092','2026','QA photo','QA photo','/assets/qa.jpg','QA album','',false,0);
set local role authenticated;
select public.elan_manage_gallery_group('rename','QA album','QA renamed');
do $$ begin
 begin perform public.elan_manage_gallery_group('remove','QA renamed',null);raise exception 'Expected missing destination rejection';exception when others then if sqlerrm='Expected missing destination rejection' then raise;end if;end;
 begin perform public.elan_manage_gallery_group('create','venue',null);raise exception 'Expected duplicate rejection';exception when unique_violation then null;end;
end $$;
select public.elan_manage_gallery_group('remove','QA renamed','Venue');
reset role;
do $$ begin
 if not exists(select 1 from public.elan_media where id='10000000-0000-4000-8000-000000000092' and category='Venue' and published=false) then raise exception 'Photo preservation failed';end if;
 if exists(select 1 from public.elan_gallery_groups where name='QA renamed') then raise exception 'Removal failed';end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000099',true);
set local role authenticated;
do $$ begin
 begin perform public.elan_manage_gallery_group('create','Forbidden',null);raise exception 'Nonadmin was allowed';exception when others then if sqlerrm='Nonadmin was allowed' then raise;end if;end;
 begin insert into public.elan_gallery_groups(name) values('Forbidden direct');raise exception 'Direct insert allowed';exception when insufficient_privilege then null;end;
end $$;
set local role anon;
select count(*) as publicly_readable_groups from public.elan_gallery_groups;
do $$ begin
 begin perform public.elan_manage_gallery_group('create','Forbidden anon',null);raise exception 'Anon allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
