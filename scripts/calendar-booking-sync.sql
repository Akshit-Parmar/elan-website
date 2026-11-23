begin;
create table if not exists elan_private.calendar_connection(singleton boolean primary key default true check(singleton),owner_id uuid not null references auth.users(id),calendar_id text not null,title_prefix text not null,interviewers uuid[] not null,token_hash text not null,last_sync timestamptz);
create table if not exists elan_private.calendar_bookings(calendar_id text not null,event_id text not null,enquiry_id uuid references public.elan_enquiries(id) on delete cascade,source_updated timestamptz,last_version integer,status text not null,note text,updated_at timestamptz not null default now(),primary key(calendar_id,event_id));
alter table elan_private.calendar_connection enable row level security;
alter table elan_private.calendar_bookings enable row level security;
revoke all on elan_private.calendar_connection,elan_private.calendar_bookings from public,anon,authenticated;
create or replace function public.elan_calendar_configure(p_calendar text,p_title text,p_interviewers uuid[]) returns jsonb language plpgsql security definer set search_path='' as $$
declare secret text;
begin
 if not exists(select 1 from public.elan_staff s join auth.users u on u.id=s.user_id where s.user_id=auth.uid() and s.role='admin' and u.email_confirmed_at is not null and u.deleted_at is null) then raise exception 'Admin access required';end if;
 if p_calendar is null or p_title is null or length(trim(p_calendar)) not between 3 and 250 or length(trim(p_title)) not between 5 and 150 or coalesce(cardinality(p_interviewers),0)=0 then raise exception 'Enter the calendar ID, interview event title prefix and interviewers';end if;
 if exists(select 1 from unnest(p_interviewers) i where not exists(select 1 from auth.users u where u.id=i and u.email_confirmed_at is not null and u.deleted_at is null and (exists(select 1 from public.elan_staff s where s.user_id=i and role='admin') or exists(select 1 from public.elan_oc_reviewers r where r.user_id=i)))) then raise exception 'Choose active leadership interviewers';end if;
 secret:=encode(extensions.gen_random_bytes(32),'hex');
 insert into elan_private.calendar_connection values(true,auth.uid(),trim(p_calendar),trim(p_title),p_interviewers,encode(extensions.digest(secret,'sha256'),'hex'),null) on conflict(singleton) do update set owner_id=excluded.owner_id,calendar_id=excluded.calendar_id,title_prefix=excluded.title_prefix,interviewers=excluded.interviewers,token_hash=excluded.token_hash,last_sync=null;
 return jsonb_build_object('token',secret,'calendar',trim(p_calendar),'title',trim(p_title));
end$$;
create or replace function public.elan_calendar_status() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not elan_private.recruitment_manager() then raise exception 'Recruitment access required';end if;
 return jsonb_build_object('connection',(select jsonb_build_object('calendar',calendar_id,'title',title_prefix,'last_sync',last_sync) from elan_private.calendar_connection),'issues',(select coalesce(jsonb_agg(jsonb_build_object('event',event_id,'status',status,'note',note,'updated_at',updated_at)),'[]') from (select * from elan_private.calendar_bookings where status='attention' order by updated_at desc limit 20) b));
end$$;
create or replace function public.elan_calendar_disable() returns void language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from public.elan_staff s join auth.users u on u.id=s.user_id where s.user_id=auth.uid() and s.role='admin' and u.email_confirmed_at is not null and u.deleted_at is null) then raise exception 'Admin access required';end if;
 delete from elan_private.calendar_connection where singleton=true;
end$$;
create or replace function public.elan_calendar_receive(p_token text,p_calendar text,p_event jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare c elan_private.calendar_connection;b elan_private.calendar_bookings;r public.elan_oc_recruitment;eid text;stamp timestamptz;at_time timestamptz;end_time timestamptz;mins integer;matches uuid[];link text;cancelled boolean;issue text;
begin
 select * into c from elan_private.calendar_connection where singleton;
 if p_token is null or p_calendar is null or c.token_hash is null or length(p_token)<>64 or c.token_hash<>encode(extensions.digest(p_token,'sha256'),'hex') or c.calendar_id<>p_calendar or not exists(select 1 from public.elan_staff s join auth.users u on u.id=s.user_id where s.user_id=c.owner_id and s.role='admin' and u.email_confirmed_at is not null and u.deleted_at is null) then raise exception 'Calendar connection not authorised' using errcode='42501';end if;
 update elan_private.calendar_connection set last_sync=now() where singleton=true;
 if p_event->>'type'='heartbeat' then return jsonb_build_object('status','ok');end if;
 if pg_column_size(p_event)>20000 then raise exception 'Event too large';end if;
 eid:=p_event->>'id';if eid is null or length(eid) not between 1 and 200 then raise exception 'Invalid event';end if;
 cancelled:=coalesce(p_event->>'status'='cancelled',false);stamp:=(p_event->>'updated')::timestamptz;
 if stamp is null then raise exception 'Missing source update time';end if;
 perform pg_advisory_xact_lock(hashtext('elan-interview-calendar'));
 select * into b from elan_private.calendar_bookings where calendar_id=p_calendar and event_id=eid for update;
 if b.status='ignored' then return jsonb_build_object('status','ignored');end if;
 if b.status in ('synced','cancelled') and b.source_updated>=stamp then return jsonb_build_object('status','unchanged');end if;
 if b.event_id is null and (cancelled or left(coalesce(p_event->>'summary',''),length(c.title_prefix))<>c.title_prefix) then return jsonb_build_object('status','ignored');end if;
 begin
 if b.enquiry_id is null then
 select array_agg(distinct e.id) into matches from public.elan_enquiries e join public.elan_oc_recruitment x on x.enquiry_id=e.id where x.stage='interview' and exists(select 1 from jsonb_array_elements(coalesce(p_event->'attendees','[]')) a where lower(trim(a->>'email'))=lower(trim(e.email)) and coalesce(a->>'organizer','false')<>'true');
 if coalesce(cardinality(matches),0)<>1 then raise exception 'Match exactly one Interview-stage applicant by email';end if;
 b.enquiry_id:=matches[1];
 end if;
 perform pg_advisory_xact_lock(hashtext('recruitment:'||b.enquiry_id::text));
 select * into r from public.elan_oc_recruitment where enquiry_id=b.enquiry_id for update;
 if r.stage<>'interview' or r.enquiry_id is null then return jsonb_build_object('status','ignored_stage');end if;
 if b.last_version is not null and r.version<>b.last_version then raise exception 'Application changed manually; review the Calendar booking before importing';end if;
 if b.event_id is null and exists(select 1 from elan_private.calendar_bookings where enquiry_id=r.enquiry_id and status='synced') then raise exception 'Another active booking already exists for this application';end if;
 if exists(select 1 from unnest(c.interviewers) i where not exists(select 1 from auth.users u where u.id=i and u.email_confirmed_at is not null and u.deleted_at is null and (exists(select 1 from public.elan_staff s where s.user_id=i and s.role='admin') or exists(select 1 from public.elan_oc_reviewers v where v.user_id=i)))) then raise exception 'Configured interviewer no longer has leadership access';end if;
 if b.last_version is null and r.interview_published then raise exception 'This application already has a manually recorded interview. Keep it or clear its published booking before retrying';end if;
 if not cancelled then
 at_time:=(p_event->'start'->>'dateTime')::timestamptz;end_time:=(p_event->'end'->>'dateTime')::timestamptz;
 mins:=extract(epoch from (end_time-at_time))/60;
 link:=coalesce(nullif(p_event->>'hangoutLink',''),nullif(p_event->>'location',''));
 if at_time is null or end_time is null or mins not between 5 and 180 or link is null or length(link)>1500 then raise exception 'Booking needs a timed slot, duration of 5–180 minutes and joining link or location';end if;
 if b.last_version is null and at_time<now() then raise exception 'Past booking needs manual review';end if;
 if exists(select 1 from public.elan_oc_recruitment x where x.enquiry_id<>r.enquiry_id and x.stage='interview' and x.interview_published and x.interviewer_ids && c.interviewers and tstzrange(x.interview_at,x.interview_at+make_interval(mins=>x.duration_minutes),'[)') && tstzrange(at_time,end_time,'[)')) then raise exception 'Assigned interviewers have an overlapping interview';end if;
 end if;
 if b.last_version is not null and ((cancelled and not r.interview_published and r.interview_at is null) or (not cancelled and r.interview_published and r.interview_at=at_time and r.duration_minutes=mins and r.interview_instructions=link and r.interviewer_ids=c.interviewers and r.interview_reply='confirmed')) then
 update elan_private.calendar_bookings set source_updated=stamp,status=case when cancelled then 'cancelled' else 'synced' end,note=null,updated_at=now() where calendar_id=p_calendar and event_id=eid;return jsonb_build_object('status','unchanged');end if;
 update public.elan_oc_recruitment set interview_at=case when cancelled then null else at_time end,interview_published=not cancelled,interview_instructions=case when cancelled then '' else link end,duration_minutes=case when cancelled then duration_minutes else mins end,interviewer_ids=c.interviewers,interview_reply=case when cancelled then '' else 'confirmed' end,interview_reply_note='',version=version+1,updated_at=now() where enquiry_id=r.enquiry_id returning * into r;
 insert into elan_private.calendar_bookings values(p_calendar,eid,r.enquiry_id,stamp,r.version,case when cancelled then 'cancelled' else 'synced' end,null,now()) on conflict(calendar_id,event_id) do update set enquiry_id=excluded.enquiry_id,source_updated=excluded.source_updated,last_version=excluded.last_version,status=excluded.status,note=null,updated_at=now();
 insert into public.elan_oc_recruitment_history(enquiry_id,stage,notes,interview_at,interview_details,actor) values(r.enquiry_id,r.stage,'Google Calendar booking '||case when cancelled then 'cancelled' else 'synchronised' end,r.interview_at,'Automatic Calendar sync configured by administrator',c.owner_id);
 return jsonb_build_object('status',case when cancelled then 'cancelled' else 'synced' end);
 exception when others then
 issue:=case when sqlstate='P0001' then sqlerrm else 'Booking could not be imported; check its time, attendees and joining details' end;
 insert into elan_private.calendar_bookings values(p_calendar,eid,b.enquiry_id,stamp,b.last_version,'attention',issue,now()) on conflict(calendar_id,event_id) do update set status='attention',note=excluded.note,updated_at=now();
 return jsonb_build_object('status','attention');
 end;
end$$;
revoke all on function public.elan_calendar_configure(text,text,uuid[]),public.elan_calendar_status(),public.elan_calendar_disable(),public.elan_calendar_receive(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.elan_calendar_configure(text,text,uuid[]),public.elan_calendar_status(),public.elan_calendar_disable() to authenticated;
grant execute on function public.elan_calendar_receive(text,text,jsonb) to anon;
commit;
