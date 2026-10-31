-- Run only after the owner has created and verified an account.
-- Replace the email below with the explicitly approved administrator email.
-- Never grant roles from signup metadata or browser input.
insert into public.elan_staff(user_id,role)
select id,'admin' from auth.users where lower(email)=lower('REPLACE_WITH_VERIFIED_OWNER_EMAIL') and email_confirmed_at is not null
on conflict(user_id) do update set role='admin';
-- Confirm exactly the intended account was granted access in the Dashboard.
