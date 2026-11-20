-- Additive upgrade. Existing applicant emails, permissions and dual approval remain in place.
begin;
alter table public.elan_oc_recruitment add column if not exists duration_minutes integer not null default 30 check(duration_minutes between 5 and 180);
alter table public.elan_oc_recruitment add column if not exists interviewer_ids uuid[] not null default '{}';
create or replace function elan_private.check_interview_slot() returns trigger language plpgsql security definer set search_path='' as $$
begin
 select * into new from public.elan_oc_recruitment where enquiry_id=new.enquiry_id;
 if new.stage='interview' and new.interview_published and new.interview_at is not null then
 perform pg_advisory_xact_lock(hashtext('elan-interview-calendar'));
 if exists(select 1 from unnest(new.interviewer_ids) i where not exists(select 1 from auth.users u where u.id=i and u.email_confirmed_at is not null and u.deleted_at is null and (exists(select 1 from public.elan_staff s where s.user_id=i and s.role='admin') or exists(select 1 from public.elan_oc_reviewers r where r.user_id=i)))) then raise exception 'Choose an active interviewer';end if;
 if exists(select 1 from public.elan_oc_recruitment r where r.enquiry_id<>new.enquiry_id and r.stage='interview' and r.interview_published and r.interviewer_ids && new.interviewer_ids and tstzrange(r.interview_at,r.interview_at+make_interval(mins=>r.duration_minutes),'[)') && tstzrange(new.interview_at,new.interview_at+make_interval(mins=>new.duration_minutes),'[)')) then raise exception 'An assigned interviewer already has an interview during this time';end if;
 end if;return new;
end$$;
drop trigger if exists elan_interview_slot on public.elan_oc_recruitment;
create constraint trigger elan_interview_slot after insert or update on public.elan_oc_recruitment deferrable initially deferred for each row execute function elan_private.check_interview_slot();
create or replace function public.elan_save_scheduled_review(p_id uuid,p_stage text,p_notes text,p_interview timestamptz,p_details text,p_expected integer,p_message text,p_published boolean,p_instructions text,p_duration integer,p_interviewers uuid[]) returns public.elan_oc_recruitment language plpgsql security definer set search_path='' as $$
declare r public.elan_oc_recruitment;old_r public.elan_oc_recruitment;
begin
 if not elan_private.recruitment_manager() then raise exception 'Recruitment access required' using errcode='42501';end if;
 if p_duration not between 5 and 180 or p_duration is null then raise exception 'Choose a duration from 5 to 180 minutes';end if;
 if p_stage='interview' and p_published and coalesce(cardinality(p_interviewers),0)=0 then raise exception 'Assign at least one interviewer';end if;
 perform pg_advisory_xact_lock(hashtext('elan-interview-calendar'));
 perform pg_advisory_xact_lock(hashtext('recruitment:'||p_id::text));
 select * into old_r from public.elan_oc_recruitment where enquiry_id=p_id;
 -- Deferred slot validation checks the final duration and interviewer assignment.
 r:=elan_private.save_application_review(p_id,p_stage,p_notes,p_interview,p_details,p_expected,p_message,p_published,p_instructions);
 update public.elan_oc_recruitment set duration_minutes=p_duration,interviewer_ids=coalesce(p_interviewers,'{}'),interview_published=p_stage='interview' and p_published,interview_reply=case when old_r.interview_at is not distinct from p_interview and old_r.interview_instructions=p_instructions and old_r.interview_published=p_published and old_r.duration_minutes=p_duration and old_r.interviewer_ids=p_interviewers then old_r.interview_reply else '' end,interview_reply_note=case when old_r.interview_at is not distinct from p_interview and old_r.interview_instructions=p_instructions and old_r.interview_published=p_published and old_r.duration_minutes=p_duration and old_r.interviewer_ids=p_interviewers then old_r.interview_reply_note else '' end where enquiry_id=p_id returning * into r;
 return r;
end$$;
-- Calendar access returns only the signed-in applicant's published interview.
create or replace function public.elan_my_interview_calendar() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if elan_private.login_portal()<>'applicant' then raise exception 'Applicant access required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',r.enquiry_id,'interview_at',r.interview_at,'duration_minutes',r.duration_minutes,'instructions',r.interview_instructions)) from public.elan_oc_recruitment r join public.elan_enquiries e on e.id=r.enquiry_id join auth.users u on lower(u.email)=lower(e.email) where u.id=auth.uid() and u.email_confirmed_at is not null and u.deleted_at is null and r.stage='interview' and r.interview_published),'[]');
end$$;
create table if not exists public.elan_work_handoffs(id uuid primary key default gen_random_uuid(),from_department text not null,to_department text not null,created_by uuid not null references auth.users,title text not null,brief text not null,due_on date not null,status text not null default 'requested' check(status in ('requested','accepted','in_progress','delivered','closed')),version integer not null default 1,updated_at timestamptz not null default now());
alter table public.elan_work_handoffs enable row level security;
revoke all on public.elan_work_handoffs from public,anon,authenticated;
create or replace function elan_private.operations_leader(u uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from auth.users a where a.id=u and a.email_confirmed_at is not null and a.deleted_at is null and (exists(select 1 from public.elan_staff s where s.user_id=u and s.role='admin') or exists(select 1 from public.elan_oc_reviewers r where r.user_id=u)))$$;
create or replace function public.elan_work_handoff_save(p_id uuid,p_title text,p_brief text,p_from text,p_to text,p_due date,p_status text,p_expected integer) returns uuid language plpgsql security definer set search_path='' as $$
declare a public.elan_oc_access;h public.elan_work_handoffs;boss boolean:=elan_private.operations_leader(auth.uid());
begin
 if elan_private.login_portal() not in ('organiser','admin') then raise exception 'Organiser access required' using errcode='42501';end if;
 select * into a from public.elan_oc_access where user_id=auth.uid();
 if p_id is null then
 if not boss and a.department is distinct from p_from then raise exception 'Use your own department';end if;
 if not exists(select 1 from public.elan_oc_modules where department=p_from) or not exists(select 1 from public.elan_oc_modules where department=p_to) or p_from=p_to or length(trim(p_title)) not between 1 and 160 or length(trim(p_brief)) not between 1 and 2500 or p_due is null then raise exception 'Choose two departments, a title, brief and deadline';end if;
 insert into public.elan_work_handoffs(from_department,to_department,created_by,title,brief,due_on) values(p_from,p_to,auth.uid(),trim(p_title),trim(p_brief),p_due) returning id into p_id;return p_id;
 end if;
 select * into strict h from public.elan_work_handoffs where id=p_id for update;
 if h.version<>p_expected then raise exception 'This handoff changed. Refresh before saving';end if;
 if not boss and not (a.department=h.to_department and a.role='lead' and p_status in ('accepted','in_progress','delivered')) and not (a.department=h.from_department and (a.role='lead' or h.created_by=auth.uid()) and p_status='closed') then raise exception 'Only the receiving head can accept or deliver; the requesting team confirms completion' using errcode='42501';end if;
 if not ((h.status='requested' and p_status='accepted') or (h.status='accepted' and p_status in ('in_progress','delivered')) or (h.status='in_progress' and p_status='delivered') or (h.status='delivered' and p_status='closed')) then raise exception 'Choose the next handoff step';end if;
 update public.elan_work_handoffs set status=p_status,version=version+1,updated_at=now() where id=p_id;return p_id;
end$$;
create table if not exists public.elan_work_revisions(request_id uuid primary key references public.elan_oc_requests,requested_by uuid not null references auth.users,note text not null check(length(note) between 5 and 1500),created_at timestamptz default now(),replacement_id uuid unique references public.elan_oc_requests);
alter table public.elan_work_revisions enable row level security;
revoke all on public.elan_work_revisions from public,anon,authenticated;
create or replace function public.elan_request_revision(p_id uuid,p_note text) returns void language plpgsql security definer set search_path='' as $$
declare r public.elan_oc_requests;
begin
 if not exists(select 1 from public.elan_oc_reviewers where user_id=auth.uid()) or elan_private.login_portal()<>'organiser' then raise exception 'Leadership access required' using errcode='42501';end if;
 select * into strict r from public.elan_oc_requests where id=p_id for update;
 if r.status<>'pending' then raise exception 'This review has already closed';end if;
 insert into public.elan_work_revisions(request_id,requested_by,note) values(p_id,auth.uid(),trim(p_note));
 update public.elan_oc_requests set status='later' where id=p_id;
end$$;
create or replace function elan_private.revision_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin if new.status in ('pending','approved') and exists(select 1 from public.elan_work_revisions where request_id=new.id) then raise exception 'This version was returned for revision. Review its replacement instead';end if;return new;end$$;
drop trigger if exists elan_revision_guard on public.elan_oc_requests;
create trigger elan_revision_guard before update on public.elan_oc_requests for each row execute function elan_private.revision_guard();
create or replace function public.elan_submit_revision(p_original uuid,p_new uuid,p_payload jsonb,p_proof text) returns void language plpgsql security definer set search_path='' as $$
declare r public.elan_oc_requests;v public.elan_work_revisions;
begin
 if elan_private.login_portal()<>'organiser' then raise exception 'Organiser access required' using errcode='42501';end if;
 select * into strict r from public.elan_oc_requests where id=p_original for update;
 select * into strict v from public.elan_work_revisions where request_id=p_original for update;
 if r.submitted_by<>auth.uid() or not exists(select 1 from public.elan_oc_access where user_id=auth.uid() and department=r.department) or v.replacement_id is not null then raise exception 'Only the original author can submit one replacement';end if;
 perform elan_private.review_submit(p_new,r.kind,p_payload,p_proof);
 update public.elan_work_revisions set replacement_id=p_new where request_id=p_original;
 update public.elan_oc_requests set status='rejected' where id=p_original;
end$$;
create table if not exists elan_private.work_mail(id uuid primary key default gen_random_uuid(),recipient uuid not null references auth.users on delete cascade,event_key text not null,topic text not null,ref_id uuid,title text not null,essential boolean not null default false,status text not null default 'pending' check(status in ('pending','sending','sent','failed','uncertain','cancelled')),attempts integer not null default 0,available_at timestamptz not null default now(),created_at timestamptz not null default now(),attempted_at timestamptz,sent_at timestamptz,unique(recipient,event_key));
create table if not exists elan_private.work_mail_preferences(user_id uuid primary key references auth.users on delete cascade,frequency text not null check(frequency in ('instant','daily')));
alter table elan_private.work_mail enable row level security;
alter table elan_private.work_mail_preferences enable row level security;
revoke all on elan_private.work_mail,elan_private.work_mail_preferences from public,anon,authenticated;
create index if not exists work_mail_due on elan_private.work_mail(status,available_at);
create or replace function elan_private.work_mail_allowed(u uuid,t text,i uuid) returns boolean language plpgsql stable security definer set search_path='' as $$
declare a public.elan_oc_access;
begin
 if not exists(select 1 from auth.users where id=u and email_confirmed_at is not null and deleted_at is null) then return false;end if;
 if elan_private.operations_leader(u) then return true;end if;
 select * into a from public.elan_oc_access where user_id=u;
 if a.user_id is null then return false;end if;
 if t='application' then return exists(select 1 from public.elan_enquiries e where e.id=i and (elan_private.department_key(a.department)='hr' or elan_private.department_key(e.details->>'department')=elan_private.department_key(a.department)));
 elsif t='interview' then return exists(select 1 from public.elan_oc_recruitment r where r.enquiry_id=i and u=any(r.interviewer_ids) and r.stage='interview' and r.interview_published);
 elsif t='task' then return exists(select 1 from public.elan_oc_tasks r where r.id=i and (r.department=a.department and (r.assigned_to=u or a.role='lead')));
 elsif t='review' then return exists(select 1 from public.elan_oc_requests r where r.id=i and (r.department=a.department and (r.submitted_by=u or a.role='lead')) and (r.kind<>'board' or r.payload->>'audience' in ('department',a.role) or r.submitted_by=u));
 elsif t='handoff' then return exists(select 1 from public.elan_work_handoffs r where r.id=i and (r.created_by=u or a.role='lead' and a.department in (r.from_department,r.to_department)));
 elsif t='briefing' then return exists(select 1 from public.elan_oc_board r where r.id=i and r.department=a.department and r.audience in ('department',a.role));end if;
 return false;
end$$;
create or replace function elan_private.queue_work_mail(k text,t text,i uuid,title_in text,urgent boolean default false) returns void language plpgsql security definer set search_path='' as $$
begin
 insert into elan_private.work_mail(recipient,event_key,topic,ref_id,title,essential,available_at)
 select u.id,k,t,i,left(title_in,250),urgent,case when not urgent and p.frequency='daily' then ((now() at time zone 'Asia/Kolkata')::date+case when (now() at time zone 'Asia/Kolkata')::time<time '09:00' then 0 else 1 end+time '09:00') at time zone 'Asia/Kolkata' else now() end from auth.users u left join elan_private.work_mail_preferences p on p.user_id=u.id where elan_private.work_mail_allowed(u.id,t,i) on conflict(recipient,event_key) do nothing;
end$$;
create or replace function elan_private.work_event() returns trigger language plpgsql security definer set search_path='' as $$
declare i uuid;t text;title_in text;k text;urgent boolean:=false;
begin
 if tg_op='UPDATE' and to_jsonb(new)=to_jsonb(old) then return new;end if;
 if tg_table_name='elan_enquiries' then
 if not (new.details->>'intent'='2027 organising committee application' or new.details->>'application_version'='2') then return new;end if;i:=new.id;t:='application';title_in:='New OC application received';
 elsif tg_table_name='elan_oc_recruitment' then select * into new from public.elan_oc_recruitment where enquiry_id=new.enquiry_id; if tg_op='UPDATE' and (new.stage,new.interview_at,new.interview_published,new.interview_instructions,new.interview_reply,new.applicant_message,new.duration_minutes,new.interviewer_ids) is not distinct from (old.stage,old.interview_at,old.interview_published,old.interview_instructions,old.interview_reply,old.applicant_message,old.duration_minutes,old.interviewer_ids) then return new;end if;i:=new.enquiry_id;t:='application';title_in:='OC application updated · '||replace(new.stage,'_',' ');
 elsif tg_table_name='elan_oc_tasks' then i:=new.id;t:='task';title_in:='Task '||case when tg_op='INSERT' then 'assigned' else 'updated' end||': '||new.title;
 elsif tg_table_name='elan_oc_requests' then i:=new.id;t:='review';title_in:='Department submission · '||new.status;
 elsif tg_table_name='elan_oc_votes' then i:=new.request_id;t:='review';title_in:='A leadership decision was recorded';
 elsif tg_table_name='elan_work_revisions' then i:=new.request_id;t:='review';title_in:=case when new.replacement_id is null then 'Changes requested on your submission' else 'Revised submission received' end;
 elsif tg_table_name='elan_work_handoffs' then i:=new.id;t:='handoff';title_in:='Department handoff · '||replace(new.status,'_',' ')||': '||new.title;
 elsif tg_table_name='elan_oc_board' then i:=new.id;t:='briefing';title_in:='Department briefing: '||new.title;
 else return new;end if;
 k:=tg_table_name||':'||i::text||':'||md5(to_jsonb(new)::text);
 perform elan_private.queue_work_mail(k,t,i,title_in,urgent);return new;
end$$;
do $$declare t text;begin foreach t in array array['elan_enquiries','elan_oc_recruitment','elan_oc_tasks','elan_oc_requests','elan_work_revisions','elan_work_handoffs','elan_oc_board','elan_oc_votes'] loop execute format('drop trigger if exists elan_work_event on public.%I',t);execute format('create constraint trigger elan_work_event after insert or update on public.%I deferrable initially deferred for each row execute function elan_private.work_event()',t);end loop;end$$;
create or replace function public.elan_work_preferences(p_frequency text) returns void language plpgsql security definer set search_path='' as $$
begin if elan_private.login_portal() not in ('organiser','admin') then raise exception 'Workspace access required';end if;insert into elan_private.work_mail_preferences values(auth.uid(),p_frequency) on conflict(user_id) do update set frequency=excluded.frequency;end$$;
create or replace function public.elan_work_desk() returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.elan_oc_access;boss boolean:=elan_private.operations_leader(auth.uid());
begin
 if elan_private.login_portal() not in ('organiser','admin') then raise exception 'Workspace access required';end if;
 select * into a from public.elan_oc_access where user_id=auth.uid();
 return jsonb_build_object('frequency',coalesce((select frequency from elan_private.work_mail_preferences where user_id=auth.uid()),'instant'),
 'notifications',coalesce((select jsonb_agg(x) from (select id,title,created_at,status,topic from elan_private.work_mail where recipient=auth.uid() and elan_private.work_mail_allowed(auth.uid(),topic,ref_id) order by created_at desc limit 30)x),'[]'),
 'handoffs',coalesce((select jsonb_agg(h order by h.due_on) from public.elan_work_handoffs h where boss or a.department in (h.from_department,h.to_department)),'[]'),
 'revisions',coalesce((select jsonb_agg(jsonb_build_object('request_id',v.request_id,'note',v.note,'replacement_id',v.replacement_id,'payload',r.payload,'kind',r.kind,'proof',r.proof,'author',r.submitted_by)) from public.elan_work_revisions v join public.elan_oc_requests r on r.id=v.request_id where elan_private.work_mail_allowed(auth.uid(),'review',r.id)),'[]'),
 'interviews',coalesce((select jsonb_agg(jsonb_build_object('id',r.enquiry_id,'at',r.interview_at,'duration',r.duration_minutes)) from public.elan_oc_recruitment r where auth.uid()=any(r.interviewer_ids) and r.stage='interview' and r.interview_published and r.interview_at>now()),'[]'),
 'health',case when boss then jsonb_build_object('failed',(select count(*) from elan_private.work_mail where status='failed'),'uncertain',(select count(*) from elan_private.work_mail where status='uncertain'),'delayed',(select count(*) from elan_private.work_mail where status='pending' and available_at<now()-interval '30 minutes'),'issues',coalesce((select jsonb_agg(x) from(select id,title,status,created_at from elan_private.work_mail where status in ('failed','uncertain') order by created_at desc limit 20)x),'[]'),'oldest_pending',(select min(available_at) from elan_private.work_mail where status='pending')) else null end);
end$$;
-- Worker-only functions. Never grant these to browser roles.
create or replace function elan_private.work_event_current(m elan_private.work_mail) returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 if not elan_private.work_mail_allowed(m.recipient,m.topic,m.ref_id) then return false;end if;
 if m.topic='application' and not exists(select 1 from public.elan_enquiries where id=m.ref_id) then return false;end if;
 if m.event_key like 'interview-reminder:%' then return exists(select 1 from public.elan_oc_recruitment r where r.enquiry_id=m.ref_id and r.stage='interview' and r.interview_published and r.interview_at>now() and position(r.interview_at::text in m.event_key)>0);end if;
 if m.event_key like 'task-reminder:%' then return exists(select 1 from public.elan_oc_tasks where id=m.ref_id and status<>'Done');end if;
 if m.event_key like 'handoff-reminder:%' then return exists(select 1 from public.elan_work_handoffs where id=m.ref_id and status not in ('closed','delivered'));end if;
 if m.event_key like 'review-reminder:%' then return exists(select 1 from public.elan_oc_requests where id=m.ref_id and status='pending');end if;
 return true;
end$$;
revoke all on function elan_private.work_event_current(elan_private.work_mail) from public,anon,authenticated;
create or replace function public.elan_claim_work_mail() returns jsonb language plpgsql security definer set search_path='' as $$
declare r record;daykey text:=((now() at time zone 'Asia/Kolkata')::date)::text;outbox jsonb;
begin
 update elan_private.work_mail set status='uncertain' where status='sending' and attempted_at<now()-interval '10 minutes';
 for r in select * from public.elan_oc_tasks where status<>'Done' and due_on<=(now() at time zone 'Asia/Kolkata')::date loop perform elan_private.queue_work_mail('task-reminder:'||r.id||':'||daykey,'task',r.id,'Task due: '||r.title);end loop;
 for r in select * from public.elan_work_handoffs where status not in ('closed','delivered') and due_on<=(now() at time zone 'Asia/Kolkata')::date loop perform elan_private.queue_work_mail('handoff-reminder:'||r.id||':'||daykey,'handoff',r.id,'Handoff due: '||r.title);end loop;
 for r in select * from public.elan_oc_requests where status='pending' and created_at<now()-interval '1 day' loop perform elan_private.queue_work_mail('review-reminder:'||r.id||':'||daykey,'review',r.id,'A department submission is waiting for a decision');end loop;
 for r in select * from public.elan_oc_recruitment where stage='interview' and interview_published and interview_at>now() and interview_at<=now()+interval '24 hours' loop perform elan_private.queue_work_mail('interview-reminder:'||r.enquiry_id||':'||r.interview_at||':'||case when r.interview_at<=now()+interval '1 hour' then '1h' else '24h' end,'interview',r.enquiry_id,'Interview reminder: '||to_char(r.interview_at at time zone 'Asia/Kolkata','DD Mon HH24:MI')||' IST',true);end loop;
 update elan_private.work_mail m set status='cancelled' where m.status in ('pending','failed') and ((m.event_key like 'task-reminder:%' and not exists(select 1 from public.elan_oc_tasks t where t.id=m.ref_id and t.status<>'Done')) or (m.event_key like 'handoff-reminder:%' and not exists(select 1 from public.elan_work_handoffs h where h.id=m.ref_id and h.status not in ('closed','delivered'))) or (m.event_key like 'review-reminder:%' and not exists(select 1 from public.elan_oc_requests req where req.id=m.ref_id and req.status='pending')));
 update elan_private.work_mail m set status='cancelled' where status in ('pending','failed') and not elan_private.work_event_current(m);
 with recipients as(select recipient from elan_private.work_mail where status in ('pending','failed') and attempts<5 and available_at<=now() group by recipient order by min(available_at) limit 3),picked as (select m.id from elan_private.work_mail m join recipients u on u.recipient=m.recipient where m.status in ('pending','failed') and m.attempts<5 and m.available_at<=now() order by m.available_at limit 300 for update of m skip locked),claimed as(update elan_private.work_mail m set status='sending',attempts=attempts+1,attempted_at=now() from picked where m.id=picked.id returning m.*)
 select coalesce(jsonb_agg(x),'[]') into outbox from(select c.recipient,u.email,case when exists(select 1 from public.elan_staff s where s.user_id=c.recipient and s.role='admin') then '/admin' else '/organisers' end as portal,jsonb_agg(jsonb_build_object('id',c.id,'title',c.title) order by c.created_at) as events from claimed c join auth.users u on u.id=c.recipient group by c.recipient,u.email)x;
 return outbox;
end$$;
create or replace function public.elan_work_mail_current(p_ids uuid[]) returns boolean language sql security definer set search_path='' as $$select count(*)=cardinality(p_ids) and coalesce(bool_and(status='sending' and elan_private.work_event_current(m)),false) from elan_private.work_mail m where id=any(p_ids)$$;
create or replace function public.elan_finish_work_mail(p_ids uuid[],p_status text) returns void language plpgsql security definer set search_path='' as $$begin
 if p_status not in ('sent','failed','uncertain','cancelled') then raise exception 'Invalid delivery status';end if;
 update elan_private.work_mail set status=p_status,sent_at=case when p_status='sent' then now() else null end,available_at=now()+interval '15 minutes' where id=any(p_ids) and status='sending';end$$;
revoke all on function public.elan_claim_work_mail(),public.elan_work_mail_current(uuid[]),public.elan_finish_work_mail(uuid[],text) from public,anon,authenticated;
grant execute on function public.elan_claim_work_mail(),public.elan_work_mail_current(uuid[]),public.elan_finish_work_mail(uuid[],text) to service_role;
do $$declare r record;begin for r in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('elan_save_scheduled_review','elan_my_interview_calendar','elan_work_handoff_save','elan_request_revision','elan_submit_revision','elan_work_preferences','elan_work_desk') loop execute 'revoke all on function '||r.sig||' from public,anon';execute 'grant execute on function '||r.sig||' to authenticated';end loop;
for r in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='elan_private' and p.proname in ('check_interview_slot','operations_leader','revision_guard','work_mail_allowed','queue_work_mail','work_event') loop execute 'revoke all on function '||r.sig||' from public,anon,authenticated';end loop;end$$;
create or replace function elan_private.application_mail_snapshot(p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',e.id,'name',e.full_name,'email',e.email,'stage',r.stage,
 'department',case when r.stage='selected' then coalesce((select m.department from public.elan_oc_members_2027 m where m.email=lower(trim(e.email)) limit 1),e.details->>'department') else e.details->>'department' end,
 'message',r.applicant_message,'duration_minutes',r.duration_minutes,
 'interview_at',case when r.stage='interview' and r.interview_published then r.interview_at end,
 'instructions',case when r.stage='interview' and r.interview_published then r.interview_instructions else '' end,
 'reply',case when r.stage='interview' and r.interview_published then r.interview_reply else '' end)
 from public.elan_enquiries e join public.elan_oc_recruitment r on r.enquiry_id=e.id
 where e.id=p_id and (e.details->>'application_version'='2' or e.details->>'intent'='2027 organising committee application')
$$;
create or replace function elan_private.queue_application_mail() returns trigger language plpgsql security definer set search_path='' as $$
declare r public.elan_oc_recruitment; snap jsonb; k text; priority integer:=0; old_stage text;
begin
 select * into r from public.elan_oc_recruitment where enquiry_id=new.enquiry_id;
 if not found then return null;end if;
 snap:=elan_private.application_mail_snapshot(new.enquiry_id);
 if snap is null then return null;end if;
 old_stage:=case when tg_op='INSERT' then 'new' else old.stage end;
 if old_stage is distinct from r.stage then k:=r.stage;priority:=30;end if;
 if r.stage='interview' and r.interview_published and r.interview_at>now() and
 (tg_op='INSERT' or not old.interview_published or old.stage<>'interview' or old.interview_at is distinct from r.interview_at or old.interview_instructions is distinct from r.interview_instructions or old.duration_minutes is distinct from r.duration_minutes) then
 k:=case when tg_op='UPDATE' and old.stage='interview' and old.interview_published then 'interview_changed' else 'interview_invitation' end;priority:=40;
 elsif tg_op='UPDATE' and old.stage='interview' and old.interview_published and r.stage='interview' and not r.interview_published then k:='interview_cancelled';priority:=40;
 end if;
 if priority=0 and tg_op='UPDATE' and old.interview_reply is distinct from r.interview_reply and r.stage='interview' and r.interview_published and r.interview_reply<>'' then k:='reply_'||r.interview_reply;priority:=20;end if;
 if priority=0 and tg_op='UPDATE' and old.applicant_message is distinct from r.applicant_message and length(trim(r.applicant_message))>0 then k:='update';priority:=10;end if;
 if priority=0 then return null;end if;
 -- Deferred triggers see the final transaction state. One email per review version,
 -- even though saving a review updates the row twice.
 insert into public.elan_application_mail(enquiry_id,event_key,kind,payload)
 values(r.enquiry_id,r.enquiry_id||':review:'||r.version,k,snap||jsonb_build_object('priority',priority))
 on conflict(event_key) do update set kind=excluded.kind,payload=excluded.payload
 where elan_application_mail.status='pending' and (elan_application_mail.payload->>'priority')::integer < priority;
 return null;
end $$;
create or replace function public.elan_claim_application_mail(p_id uuid default null) returns setof public.elan_application_mail language plpgsql security definer set search_path='' as $$
begin
 -- A timed-out SMTP request may have been accepted. Never silently resend it.
 update public.elan_application_mail set status='uncertain',error_code='delivery_unknown' where status='sending' and attempted_at<now()-interval '10 minutes';
 -- One 24-hour reminder per published interview time, only while confirmation is outstanding.
 insert into public.elan_application_mail(enquiry_id,event_key,kind,payload)
 select r.enquiry_id,r.enquiry_id||':reminder:'||r.interview_at,'interview_reminder',elan_private.application_mail_snapshot(r.enquiry_id)||jsonb_build_object('priority',10)
 from public.elan_oc_recruitment r where r.stage='interview' and r.interview_published and r.interview_reply=''
 and r.interview_at>now()+interval '1 hour' and r.interview_at<=now()+interval '24 hours'
 and (p_id is null or r.enquiry_id=p_id)
 and exists(select 1 from public.elan_application_mail m where m.enquiry_id=r.enquiry_id and m.kind in ('interview_invitation','interview_changed') and m.status='sent' and (m.payload->>'interview_at')::timestamptz=r.interview_at and m.sent_at<now()-interval '30 minutes')
 on conflict(event_key) do nothing;
 insert into public.elan_application_mail(enquiry_id,event_key,kind,payload)
 select r.enquiry_id,r.enquiry_id||':one-hour:'||r.interview_at,'interview_start_reminder',elan_private.application_mail_snapshot(r.enquiry_id)||jsonb_build_object('priority',10) from public.elan_oc_recruitment r where r.stage='interview' and r.interview_published and r.interview_reply<>'reschedule' and r.interview_at>now() and r.interview_at<=now()+interval '1 hour' and (p_id is null or r.enquiry_id=p_id) on conflict(event_key) do nothing;
 -- Superseded decisions, withdrawn invitations and deleted applications must not leak stale updates.
 update public.elan_application_mail m set status='cancelled',error_code='superseded'
 where m.status in ('pending','failed') and (p_id is null or m.enquiry_id=p_id)
 and ((m.payload-'priority') is distinct from elan_private.application_mail_snapshot(m.enquiry_id)
 or (m.kind in ('interview_invitation','interview_changed','interview_reminder','interview_start_reminder') and (m.payload->>'interview_at')::timestamptz<=now()));
 return query with picked as (
 select m.id from public.elan_application_mail m where m.status in ('pending','failed') and m.attempts<5 and m.available_at<=now()
 and (p_id is null or m.enquiry_id=p_id) order by m.created_at for update skip locked limit 5
 ) update public.elan_application_mail m set status='sending',attempts=m.attempts+1,attempted_at=now(),error_code=null
 from picked where m.id=picked.id returning m.*;
end $$;
create or replace function public.elan_application_mail_current(p_mail uuid) returns boolean language sql security definer set search_path='' as $$
 select exists(select 1 from public.elan_application_mail m where m.id=p_mail and m.status='sending'
 and (m.payload-'priority')=elan_private.application_mail_snapshot(m.enquiry_id)
 and (m.kind not in ('interview_invitation','interview_changed','interview_reminder','interview_start_reminder') or (m.payload->>'interview_at')::timestamptz>now()))
$$;

-- Refresh only unsent snapshots after adding the duration field; never touch an in-flight delivery.
update public.elan_application_mail set payload=elan_private.application_mail_snapshot(enquiry_id)||jsonb_build_object('priority',coalesce((payload->>'priority')::int,10)) where status in ('pending','failed') and (payload-'priority')=(elan_private.application_mail_snapshot(enquiry_id)-'duration_minutes');

create or replace function public.elan_retry_work_mail(p_id uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if not elan_private.operations_leader(auth.uid()) then raise exception 'Leadership access required';end if;
 update elan_private.work_mail set status='pending',attempts=0,available_at=now() where id=p_id and status='failed';
 if not found then raise exception 'Only known failed deliveries can be retried';end if;
end$$;
revoke all on function public.elan_retry_work_mail(uuid) from public,anon;
grant execute on function public.elan_retry_work_mail(uuid) to authenticated;
commit;
