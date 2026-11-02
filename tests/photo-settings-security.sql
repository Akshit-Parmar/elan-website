begin;
select set_config('request.jwt.claim.sub',(select user_id::text from public.elan_staff where role='admin' limit 1),true);
set local role authenticated;
insert into public.elan_photo_settings(key,focal_x,focal_y,featured) values('qa-rollback-photo',22,77,true);
update public.elan_photo_settings set focal_x=33 where key='qa-rollback-photo';
do $$ begin if not exists(select 1 from public.elan_photo_settings where key='qa-rollback-photo' and focal_x=33) then raise exception 'Admin save failed';end if;end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
set local role authenticated;
do $$ begin
 begin insert into public.elan_photo_settings(key) values('qa-unauthorised');raise exception 'Unauthorized insert succeeded';exception when insufficient_privilege then null;end;
 update public.elan_photo_settings set focal_x=99 where key='qa-rollback-photo';
 if exists(select 1 from public.elan_photo_settings where key='qa-rollback-photo' and focal_x=99) then raise exception 'Unauthorized update succeeded';end if;
end $$;
reset role;
set local role anon;
do $$ begin if not exists(select 1 from public.elan_photo_settings where key='qa-rollback-photo' and focal_x=33) then raise exception 'Public metadata read failed';end if;end $$;
rollback;
