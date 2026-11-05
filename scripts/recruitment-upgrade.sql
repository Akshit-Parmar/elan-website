-- Additive upgrade. Keeps all applications, content and existing access assignments.
create table public.elan_oc_recruitment (
 enquiry_id uuid primary key references public.elan_enquiries(id) on delete cascade,
 stage text not null default 'new' check(stage in ('new','shortlisted','interview','selected','not_selected')),
 notes text not null default '' check(length(notes)<=6000),
 interview_at timestamptz,
 interview_details text not null default '' check(length(interview_details)<=1000),
 version integer not null default 1,
 updated_at timestamptz not null default now()
);
alter table public.elan_oc_recruitment enable row level security;
revoke all on public.elan_oc_recruitment from public,anon,authenticated;
grant select on public.elan_oc_recruitment to authenticated;
create policy recruitment_admin on public.elan_oc_recruitment for select to authenticated using(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'));
create table public.elan_oc_recruitment_history (
 id uuid primary key default gen_random_uuid(),enquiry_id uuid not null references public.elan_enquiries(id) on delete cascade,
 stage text not null,notes text not null,interview_at timestamptz,interview_details text not null,
 actor uuid not null references auth.users,created_at timestamptz not null default now()
);
create index recruitment_history_enquiry on public.elan_oc_recruitment_history(enquiry_id,created_at desc);
alter table public.elan_oc_recruitment_history enable row level security;
revoke all on public.elan_oc_recruitment_history from public,anon,authenticated;
grant select on public.elan_oc_recruitment_history to authenticated;
create policy recruitment_history_admin on public.elan_oc_recruitment_history for select to authenticated using(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'));
create function elan_private.save_recruitment(p_id uuid,p_stage text,p_notes text,p_interview timestamptz,p_details text,p_expected integer) returns public.elan_oc_recruitment language plpgsql security definer set search_path='' as $$
declare r public.elan_oc_recruitment;
begin
 if not exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') then raise exception 'Administrator access required';end if;
 if not exists(select 1 from public.elan_enquiries where id=p_id and (details->>'intent'='2027 organising committee application' or details->>'application_version'='2')) then raise exception 'OC application not found';end if;
 perform pg_advisory_xact_lock(hashtextextended('recruitment:'||p_id,0));
 if p_expected is null or coalesce((select version from public.elan_oc_recruitment where enquiry_id=p_id),0)<>p_expected then raise exception 'This application was updated. Reload before saving.';end if;
 insert into public.elan_oc_recruitment(enquiry_id,stage,notes,interview_at,interview_details) values(p_id,p_stage,p_notes,p_interview,p_details)
 on conflict(enquiry_id) do update set stage=excluded.stage,notes=excluded.notes,interview_at=excluded.interview_at,interview_details=excluded.interview_details,version=elan_oc_recruitment.version+1,updated_at=now() returning * into r;
 insert into public.elan_oc_recruitment_history(enquiry_id,stage,notes,interview_at,interview_details,actor) values(p_id,r.stage,r.notes,r.interview_at,r.interview_details,auth.uid());
 return r;
end $$;
create function public.elan_save_recruitment(p_id uuid,p_stage text,p_notes text,p_interview timestamptz,p_details text,p_expected integer) returns public.elan_oc_recruitment language sql security invoker set search_path='' as $$select elan_private.save_recruitment(p_id,p_stage,p_notes,p_interview,p_details,p_expected)$$;
revoke all on function elan_private.save_recruitment(uuid,text,text,timestamptz,text,integer),public.elan_save_recruitment(uuid,text,text,timestamptz,text,integer) from public,anon;
grant execute on function elan_private.save_recruitment(uuid,text,text,timestamptz,text,integer),public.elan_save_recruitment(uuid,text,text,timestamptz,text,integer) to authenticated;
alter table public.elan_oc_tasks add column due_on date;
create function elan_private.oc_summary() returns jsonb language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') and not exists(select 1 from public.elan_oc_reviewers where user_id=auth.uid()) then raise exception 'Leadership or administrator access required';end if;
 return jsonb_build_object('tasks',coalesce((select jsonb_agg(t) from (select department,count(*) filter(where status<>'Done') as open,count(*) filter(where status<>'Done' and due_on<(now() at time zone 'Asia/Kolkata')::date) as overdue from public.elan_oc_tasks group by department order by department)t),'[]'::jsonb),'reviews',coalesce((select jsonb_agg(r) from (select department,count(*) filter(where status='pending') as pending,count(*) filter(where status='later') as later from public.elan_oc_requests group by department order by department)r),'[]'::jsonb));end$$;
create function public.elan_oc_summary() returns jsonb language sql security invoker set search_path='' as $$select elan_private.oc_summary()$$;
revoke all on function elan_private.oc_summary(),public.elan_oc_summary() from public,anon;
grant execute on function elan_private.oc_summary(),public.elan_oc_summary() to authenticated;
alter table public.elan_oc_requests add column submitter_label text not null default '';
update public.elan_oc_requests r set submitter_label=coalesce(a.label,'Organiser') from public.elan_oc_access a where a.user_id=r.submitted_by;
create function elan_private.oc_label_submitter() returns trigger language plpgsql security definer set search_path='' as $$begin
new.submitter_label:=coalesce((select label from public.elan_oc_access where user_id=new.submitted_by),'Organiser');return new;end$$;
revoke all on function elan_private.oc_label_submitter() from public,anon,authenticated;
create trigger oc_label_submitter before insert on public.elan_oc_requests for each row execute function elan_private.oc_label_submitter();
