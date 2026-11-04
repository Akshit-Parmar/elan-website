alter table public.elan_oc_modules drop constraint elan_oc_modules_tool_check;
alter table public.elan_oc_modules add check(tool in ('finance','outreach','operations','programme','media','partnerships','general','social'));
insert into public.elan_oc_modules(department,tool) values('Social Media','social');
create table public.elan_oc_reviewers(seat text primary key check(seat in ('director','assistant')),user_id uuid unique not null references auth.users,label text not null);
create table public.elan_oc_requests(id uuid primary key,department text not null,kind text not null check(kind in ('journal','record','board','attachment')),payload jsonb not null,proof text not null default '',submitted_by uuid not null default auth.uid(),created_at timestamptz not null default now(),status text not null default 'pending' check(status in ('pending','approved','later','rejected')),round int not null default 1);
create table public.elan_oc_votes(request_id uuid references public.elan_oc_requests,round int not null,seat text not null,actor uuid not null,decision text not null check(decision in ('approve','later','reject')),note text not null check(length(note)<=1500),created_at timestamptz default now(),primary key(request_id,round,seat),unique(request_id,round,actor));
create index oc_review_department on public.elan_oc_requests(department,created_at desc);
alter table public.elan_oc_reviewers enable row level security;
alter table public.elan_oc_requests enable row level security;
alter table public.elan_oc_votes enable row level security;
revoke all on public.elan_oc_reviewers,public.elan_oc_requests,public.elan_oc_votes from public,anon,authenticated;
grant select on public.elan_oc_reviewers,public.elan_oc_requests,public.elan_oc_votes to authenticated;
create policy oc_seat_read on public.elan_oc_reviewers for select to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'));
create policy oc_review_read on public.elan_oc_requests for select to authenticated using(exists(select 1 from public.elan_oc_reviewers where user_id=(select auth.uid())) or exists(select 1 from public.elan_oc_access a where a.user_id=(select auth.uid()) and a.department=elan_oc_requests.department and (kind<>'board' or payload->>'audience' in ('department',a.role) or submitted_by=a.user_id)));
create policy oc_vote_read on public.elan_oc_votes for select to authenticated using(exists(select 1 from public.elan_oc_requests where id=request_id));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('elan-oc-review-files','elan-oc-review-files',false,8388608,array['image/jpeg','image/png','image/webp','application/pdf']);
create policy oc_review_file_add on storage.objects for insert to authenticated with check(bucket_id='elan-oc-review-files' and split_part(name,'/',1)=(select auth.uid())::text and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/proof\.(pdf|jpg|png|webp)$' and exists(select 1 from public.elan_oc_access where user_id=(select auth.uid())));
create policy oc_review_file_read on storage.objects for select to authenticated using(bucket_id='elan-oc-review-files' and exists(select 1 from public.elan_oc_requests r where r.proof=storage.objects.name and (
 exists(select 1 from public.elan_oc_reviewers v where v.user_id=(select auth.uid())) or
 exists(select 1 from public.elan_oc_access a where a.user_id=(select auth.uid()) and a.department=r.department and (a.user_id=r.submitted_by or a.role='lead' or r.status='approved') and (r.kind<>'board' or r.payload->>'audience' in ('department',a.role) or a.user_id=r.submitted_by))
)));
-- Keep legacy posted records readable, but new writes must pass the review functions.
revoke insert(id,module_id,book_date,kind,amount,memo,reverses) on public.elan_oc_journal from authenticated;
revoke insert(module_id,title,details),update(title,details) on public.elan_oc_records from authenticated;
drop policy oc_bill_write on storage.objects;
drop policy oc_board_lead_write on public.elan_oc_board;
drop policy oc_board_lead_remove on public.elan_oc_board;
create function elan_private.review_seat(s text,email_in text) returns void language plpgsql security definer set search_path='' as $$
declare u auth.users;
begin
if not exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') then raise exception 'Administrator required';end if;
if email_in='' then delete from public.elan_oc_reviewers where seat=s;return;end if;
select * into strict u from auth.users where lower(email)=lower(trim(email_in)) and email_confirmed_at is not null;
insert into public.elan_oc_reviewers values(s,u.id,u.email) on conflict(seat) do update set user_id=excluded.user_id,label=excluded.label;
end$$;
create function elan_private.review_submit(i uuid,k text,p jsonb,f text) returns void language plpgsql security definer set search_path='' as $$
declare a public.elan_oc_access;m public.elan_oc_modules;r public.elan_oc_records;j public.elan_oc_journal; own uuid:=auth.uid();
begin
select * into strict a from public.elan_oc_access where user_id=own;
select * into m from public.elan_oc_modules where department=a.department;
if jsonb_typeof(p)<>'object' or octet_length(p::text)>15000 then raise exception 'Invalid submission';end if;
if f<>'' and (f !~ ('^'||own::text||'/'||i::text||'/proof[.](pdf|jpg|png|webp)$') or not exists(select 1 from storage.objects where bucket_id='elan-oc-review-files' and name=f)) then raise exception 'Upload evidence before submitting';end if;
if k in ('journal','attachment') then
 if m.tool is distinct from 'finance' or f='' then raise exception 'Finance assignment and evidence required';end if;
 if k='journal' then
 if not(coalesce(p->>'kind','') in ('opening','receipt','spend','borrow','repay','equipment','invoice','collect','bill','settle')) or coalesce((p->>'amount')::numeric,0) not between 0.01 and 999999999999.99 or (p->>'amount')::numeric<>round((p->>'amount')::numeric,2) or coalesce(length(trim(p->>'memo')),0) not between 1 and 500 or (p->>'book_date')::date is null or (p->>'book_date')::date>(now() at time zone 'Asia/Kolkata')::date then raise exception 'Check transaction fields';end if;
 end if;
 if k='attachment' or p->>'reverses' is not null then select * into strict j from public.elan_oc_journal where id=coalesce(p->>'reverses',p->>'entry')::uuid and module_id=m.id;
 if (k='journal' and (a.role<>'lead' or j.kind<>p->>'kind' or j.amount<>(p->>'amount')::numeric or j.reverses is not null or j.book_date>(p->>'book_date')::date)) or (k='attachment' and a.role<>'lead' and j.created_by<>own) then raise exception 'Invalid finance change';end if;end if;
elsif k='record' then
 if m.id is null or m.tool='finance' or coalesce(length(trim(p->>'title')),0) not between 1 and 180 or jsonb_typeof(p->'details') is distinct from 'object' or octet_length((p->'details')::text)>=12000 then raise exception 'Invalid register item';end if;
 if p->>'target' is not null then select * into strict r from public.elan_oc_records where id=(p->>'target')::uuid and module_id=m.id and updated_at=(p->>'version')::timestamptz and (created_by=own or a.role='lead');end if;
elsif k='board' then
 if a.role<>'lead' or coalesce(p->>'audience','') not in ('department','lead') or coalesce(p->>'kind','') not in ('resource','briefing') or coalesce(length(trim(p->>'title')),0) not between 1 and 160 or length(p->>'body')>4000 or (p->>'kind'='resource' and coalesce(p->>'url','') !~ '^https://[^[:space:]]+$') or (p->>'kind'='briefing' and coalesce(length(trim(p->>'body')),0)=0) then raise exception 'Invalid briefing or resource';end if;
else raise exception 'Unsupported submission';end if;
insert into public.elan_oc_requests(id,department,kind,payload,proof,submitted_by) values(i,a.department,k,p-'module_id'||jsonb_build_object('module_id',m.id),f,own);
end$$;
create function elan_private.review_decide(i uuid,d text,n text) returns text language plpgsql security definer set search_path='' as $$
declare r public.elan_oc_requests; s text; result text; p jsonb; m uuid;
begin
select seat into strict s from public.elan_oc_reviewers where user_id=auth.uid() for share;
select * into strict r from public.elan_oc_requests where id=i for update;
if r.status<>'pending' then raise exception 'This round has closed';end if;
insert into public.elan_oc_votes(request_id,round,seat,actor,decision,note) values(i,r.round,s,auth.uid(),d,n);
select case when count(*)<2 then 'pending' when bool_or(decision='reject') then 'rejected' when bool_or(decision='later') then 'later' else 'approved' end into result from public.elan_oc_votes where request_id=i and round=r.round;
p:=r.payload;m:=(p->>'module_id')::uuid;
if result='approved' then
 if r.kind='journal' then insert into public.elan_oc_journal(id,module_id,book_date,kind,amount,memo,created_by,reverses) values(i,m,(p->>'book_date')::date,p->>'kind',(p->>'amount')::numeric,p->>'memo',r.submitted_by,(p->>'reverses')::uuid);
 elsif r.kind='record' and p->>'target' is null then insert into public.elan_oc_records(id,module_id,title,details,created_by) values(i,m,p->>'title',p->'details',r.submitted_by);
 elsif r.kind='record' then update public.elan_oc_records set title=p->>'title',details=p->'details' where id=(p->>'target')::uuid and module_id=m and updated_at=(p->>'version')::timestamptz;if not found then raise exception 'Original has changed. Reject this version and submit an updated proposal.';end if;
 elsif r.kind='board' then insert into public.elan_oc_board(department,audience,kind,title,body,url,created_by) values(r.department,p->>'audience',p->>'kind',p->>'title',coalesce(p->>'body',''),coalesce(p->>'url',''),r.submitted_by);end if;
end if;
update public.elan_oc_requests set status=result where id=i;return result;
end$$;
create function elan_private.review_reopen(i uuid) returns void language plpgsql security definer set search_path='' as $$begin
if not exists(select 1 from public.elan_oc_reviewers where user_id=auth.uid()) then raise exception 'Reviewer required';end if;
update public.elan_oc_requests set status='pending',round=round+1 where id=i and status='later';if not found then raise exception 'Only deferred items can be reopened';end if;end$$;
create function public.elan_review_seat(s text,email_in text) returns void language sql security invoker set search_path='' as $$select elan_private.review_seat(s,email_in)$$;
revoke all on function public.elan_review_seat(text,text),elan_private.review_seat(text,text) from public,anon;
grant execute on function public.elan_review_seat(text,text),elan_private.review_seat(text,text) to authenticated;
create function public.elan_review_submit(i uuid,k text,p jsonb,f text) returns void language sql security invoker set search_path='' as $$select elan_private.review_submit(i,k,p,f)$$;
revoke all on function public.elan_review_submit(uuid,text,jsonb,text),elan_private.review_submit(uuid,text,jsonb,text) from public,anon;
grant execute on function public.elan_review_submit(uuid,text,jsonb,text),elan_private.review_submit(uuid,text,jsonb,text) to authenticated;
create function public.elan_review_decide(i uuid,d text,n text) returns text language sql security invoker set search_path='' as $$select elan_private.review_decide(i,d,n)$$;
revoke all on function public.elan_review_decide(uuid,text,text),elan_private.review_decide(uuid,text,text) from public,anon;
grant execute on function public.elan_review_decide(uuid,text,text),elan_private.review_decide(uuid,text,text) to authenticated;
create function public.elan_review_reopen(i uuid) returns void language sql security invoker set search_path='' as $$select elan_private.review_reopen(i)$$;
revoke all on function public.elan_review_reopen(uuid),elan_private.review_reopen(uuid) from public,anon;
grant execute on function public.elan_review_reopen(uuid),elan_private.review_reopen(uuid) to authenticated;
