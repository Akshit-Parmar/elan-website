begin;
do $$ begin perform set_config('request.jwt.claims',json_build_object('sub',(select user_id from public.elan_staff where role='admin' limit 1),'role','authenticated')::text,true);end $$;
set local role authenticated;
do $$ declare v bigint; rid uuid; restore jsonb; ids uuid[]; begin
 v:=public.elan_save_page_draft('qa-workflow.html','[{"type":"text","key":"ffffffffffffffffffffffffffffff01","text":"Draft words","href":null,"original_text":"Original words","original_href":null,"restore":false}]',0);
 if exists(select 1 from public.elan_page_content where key='ffffffffffffffffffffffffffffff01') then raise exception 'Draft leaked to live content';end if;
 begin perform public.elan_save_page_draft('qa-workflow.html','[]',0);raise exception 'Stale write accepted';exception when raise_exception then if sqlerrm='Stale write accepted' then raise;end if;end;
 rid:=public.elan_publish_page_draft('qa-workflow.html',v);
 if not exists(select 1 from public.elan_page_content where key='ffffffffffffffffffffffffffffff01' and text='Draft words' and published) then raise exception 'Publish failed';end if;
 select before_changes into restore from public.elan_page_revisions where id=rid;
 v:=public.elan_save_page_draft('qa-workflow.html',restore,v+1);perform public.elan_publish_page_draft('qa-workflow.html',v);
 if exists(select 1 from public.elan_page_content where key='ffffffffffffffffffffffffffffff01' and published) then raise exception 'Restore failed';end if;
 v:=public.elan_save_page_draft('qa-workflow.html','[{"type":"text","key":"ffffffffffffffffffffffffffffff01","text":"Must roll back","href":null},{"type":"image","slot":"qa-image","id":"ffffffff-ffff-4fff-8fff-fffffffffff1","url":"https://evil.example/photo.jpg","alt":"No","original_src":"/assets/img/qa.jpg","original_alt":"Original"}]',v+1);
 begin perform public.elan_publish_page_draft('qa-workflow.html',v);raise exception 'Invalid image accepted';exception when check_violation then null;end;
 if exists(select 1 from public.elan_page_content where key='ffffffffffffffffffffffffffffff01' and text='Must roll back') then raise exception 'Partial publication escaped rollback';end if;
 insert into public.elan_stories(kind,title,name,body,published,approved) values('testimonial','QA story','Test person','Test words',false,false);
 begin insert into public.elan_stories(kind,title,name,body,published,approved) values('testimonial','Unapproved','Test person','Test words',true,false);raise exception 'Unapproved publication allowed';exception when check_violation then null;end;
 select array_agg(id order by sort_order desc) into ids from public.elan_media where credit not like 'site-slot:%' and credit not like 'site-image:%';
 if cardinality(ids)>0 then if public.elan_reorder_gallery(ids)<>cardinality(ids) then raise exception 'Reorder failed';end if;end if;
end $$;
reset role;
do $$ begin perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',true);end $$;
set local role authenticated;
do $$ begin
 if exists(select 1 from public.elan_page_drafts where page='qa-workflow.html') or exists(select 1 from public.elan_page_revisions where page='qa-workflow.html') or exists(select 1 from public.elan_stories where title='QA story') then raise exception 'Private content exposed';end if;
 begin perform public.elan_save_page_draft('qa-forbidden.html','[]',0);raise exception 'Non-admin write allowed';exception when raise_exception then if sqlerrm<>'Administrator access required' then raise;end if;end;
 begin perform public.elan_publish_page_draft('qa-workflow.html',1);raise exception 'Non-admin publish allowed';exception when raise_exception then if sqlerrm<>'Administrator access required' then raise;end if;end;
 begin perform public.elan_reorder_gallery(array[]::uuid[]);raise exception 'Non-admin reorder allowed';exception when raise_exception then if sqlerrm<>'Administrator access required' then raise;end if;end;
 begin insert into public.elan_stories(kind,title) values('story','Forbidden');raise exception 'Non-admin story allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role anon;
do $$ begin
 if exists(select 1 from public.elan_stories where title='QA story') then raise exception 'Draft story exposed to anon';end if;
 begin perform public.elan_save_page_draft('qa-forbidden.html','[]',0);raise exception 'Anon draft allowed';exception when insufficient_privilege then null;end;
end $$;
rollback;
select 'PASS: draft privacy, conflict detection, publish, history restore, atomic rollback, story approval, gallery ordering and role isolation' as result;
