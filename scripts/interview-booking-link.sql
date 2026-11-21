begin;
create or replace function elan_private.application_stage_message(stage text) returns text language sql immutable set search_path='' as $$ select case stage
when 'new' then 'Thank you for applying to the Élan Summit 2027 organising committee. We have received your application. You can follow its progress here.'
when 'under_review' then 'Your application is now under review. Our team is looking through your answers and department preferences. We will update you when there is a decision or a next step.'
when 'shortlisted' then 'You have been shortlisted for the Élan Summit 2027 organising committee. We would like to take your application forward. Interview details or further instructions will appear here once confirmed. You do not need to submit another application.'
when 'interview' then 'We would like to invite you to an interview for the Élan Summit 2027 organising committee. Choose a suitable time from the available slots using the booking link below. Please book with the same name and email address you used in your application.'
when 'waitlisted' then 'Your application is on the waiting list. We have not confirmed an organising role for you at this stage. If a suitable place becomes available, we will update you here and by email.'
when 'selected' then 'You have been selected for the Élan Summit 2027 organising committee. Your confirmed department and onboarding details will be shared with you. Open the organiser workspace once your assigned access is active.'
when 'not_selected' then 'Thank you for the time and effort you put into your application. We will not be taking it forward for the Élan Summit 2027 organising committee. We appreciate your interest in being part of the team.'
else '' end $$;
commit;
