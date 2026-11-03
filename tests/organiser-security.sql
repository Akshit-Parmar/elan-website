begin;
insert into public.elan_enquiries(id,kind,full_name,email,details,status) values('f1000000-0000-4000-8000-000000000001','contact','Organiser test','test@example.invalid','{}','new');
insert into public.elan_media(id,edition_slug,title,alt_text,image_url,category,credit,sort_order,published) values('f1000000-0000-4000-8000-000000000002','2026','Test baseline','Test','/assets/edition-2026/opening.webp','Opening Ceremony','',1,true);
select set_config('request.jwt.claim.sub',(select user_id::text from public.elan_staff where role='admin' limit 1),true);
set local role authenticated;
do $$declare v jsonb; rid uuid; w public.elan_enquiry_workflow; c int;begin
 select id into rid from public.elan_collection_revisions where record_key='f1000000-0000-4000-8000-000000000002';
 select count(*) into c from public.elan_bulk_gallery(array['f1000000-0000-4000-8000-000000000002'::uuid],'move','DJ Night');if c<>1 then raise exception 'Bulk count failed';end if;
 select to_jsonb(m) into v from public.elan_media m where id='f1000000-0000-4000-8000-000000000002';
 v:=public.elan_restore_collection(rid,v);if v->>'category'<>'Opening Ceremony' then raise exception 'Restore failed';end if;
 begin perform public.elan_restore_collection(rid,'{}');raise exception 'Stale restore accepted';exception when others then if SQLERRM not like 'Content changed.%' then raise;end if;end;
 select * into w from public.elan_save_workflow('f1000000-0000-4000-8000-000000000001',null,'Private test','2026-11-05',0);if w.version<>1 then raise exception 'Workflow version failed';end if;
 begin perform public.elan_save_workflow('f1000000-0000-4000-8000-000000000001',null,'Overwrite',null,0);raise exception 'Stale workflow accepted';exception when others then if SQLERRM not like 'Another organiser%' then raise;end if;end;
 if not exists(select 1 from public.elan_organiser_options()) then raise exception 'Organisers missing';end if;
 insert into public.elan_photo_fingerprints(media_id,sha256) values('f1000000-0000-4000-8000-000000000002',repeat('a',64));
end $$;
reset role;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000099',true);
set local role authenticated;
do $$begin
 if exists(select 1 from public.elan_collection_revisions) or exists(select 1 from public.elan_enquiry_workflow) or exists(select 1 from public.elan_photo_fingerprints) or exists(select 1 from public.elan_visit_totals) then raise exception 'Private records leaked';end if;
 begin perform public.elan_bulk_gallery(array['f1000000-0000-4000-8000-000000000002'::uuid],'hide');raise exception 'Nonadmin bulk accepted';exception when others then if SQLERRM<>'Administrator access required' then raise;end if;end;
 begin perform public.elan_organiser_options();raise exception 'Nonadmin staff access';exception when others then if SQLERRM<>'Administrator access required' then raise;end if;end;
 begin perform public.elan_restore_collection('f1000000-0000-4000-8000-000000000099','{}');raise exception 'Nonadmin restore accepted';exception when others then if SQLERRM<>'Administrator access required' then raise;end if;end;
 begin perform public.elan_save_workflow('f1000000-0000-4000-8000-000000000001',null,'bad',null,1);raise exception 'Nonadmin workflow accepted';exception when others then if SQLERRM<>'Administrator access required' then raise;end if;end;
end $$;
reset role;
set local role anon;
select public.elan_record_visit('gallery','view');
select public.elan_record_visit('admin','view');
do $$begin
 begin perform 1 from public.elan_enquiry_workflow;raise exception 'Anonymous notes read accepted';exception when insufficient_privilege then null;end;
 begin perform public.elan_restore_collection('f1000000-0000-4000-8000-000000000099','{}');raise exception 'Anonymous restore accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$begin if exists(select 1 from public.elan_visit_totals where page='admin') then raise exception 'Private page counted';end if;end $$;
rollback;
select 'PASS: admin bulk, history restore, stale-write protection, private notes, nonadmin denial and anonymous aggregate validation; test records rolled back' as result;
