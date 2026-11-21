export const interviewBookingURL='https://calendar.app.google/b2bKN2LUkKdZ4sQY7';
import {branded,site} from './mail-brand.mjs';
import {emailConfigured} from './acknowledgement.mjs';
export function applicationMailContent(row){
 const p=row.payload,when=p.interview_at?new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'full',timeStyle:'short'}).format(new Date(p.interview_at))+' IST (UTC+05:30)':'';
 const messages={
 under_review:['Your Élan OC application is under review','Our team is reviewing your application for the 2027 organising committee. We will email you when there is a further update. No action is needed from you right now.'],
 shortlisted:['You have been shortlisted for the Élan OC','Your application has been shortlisted. This is not a final appointment. The team will share the next step through your applicant portal.'],
 interview:['Choose a time for your Élan OC interview','We would like to invite you to an interview for the Élan Summit 2027 organising committee. Choose a suitable time from the available slots using the booking link below. Please book with the same name and email address you used in your application.'],
 interview_invitation:['Your Élan OC interview invitation','Your interview has been scheduled. Please open your applicant portal to confirm attendance or request another time.'],
 interview_changed:['Your Élan OC interview details have changed','The team has updated your interview arrangements. Please check the details below and confirm the new invitation in your applicant portal.'],
 interview_cancelled:['Your Élan OC interview invitation has been withdrawn','The previous interview invitation is no longer active. Please do not use the earlier time or meeting details. Check your applicant portal for the next step.'],
 interview_start_reminder:['Your Élan OC interview starts within an hour','Your interview is coming up. Please check the meeting instructions and be ready a few minutes before the start time.'],
 interview_reminder:['Reminder: please confirm your Élan OC interview','Your interview is within the next 24 hours and we have not received your confirmation. Please confirm attendance or request another time in your applicant portal.'],
 reply_confirmed:['Your Élan OC interview attendance is confirmed','We have recorded your confirmation. You can find the interview details below and in your applicant portal.'],
 reply_reschedule:['We received your interview rescheduling request','The team has received your request for another interview time. A new time is not confirmed yet. We will email you when the arrangements are updated.'],
 waitlisted:['An update on your Élan OC application','Your application is on the waiting list. You have not been assigned an organising role. We will contact you if a suitable place becomes available.'],
 selected:['You have been selected for the Élan 2027 OC','You have been selected for the Élan Summit 2027 organising committee'+(p.department?' in '+p.department:'')+'. Sign in with the email you applied with to view your department workspace. If your access is still pending, contact the team.'],
 not_selected:['An update on your Élan OC application','Thank you for taking the time to apply to the Élan Summit 2027 organising committee. We will not be taking this application forward. We appreciate the time and effort you put into your application.'],
 new:['Your Élan OC application status has been updated','Your application is marked as received. You can check the current status in your applicant portal.'],
 update:['A message about your Élan OC application','The team has added an update to your application. Please read the message below and check your applicant portal for any action needed.']
 };
 const copy=messages[row.kind];if(!copy)throw Error('Unsupported mail event');
 const showInterview=['interview_invitation','interview_changed','interview_reminder','interview_start_reminder','reply_confirmed'].includes(row.kind);
 if(showInterview&&!when)throw Error('Missing interview time');
 const booking=row.kind==='interview';
 const paragraphs=['Hi '+p.name+',',copy[1],...(showInterview?['Interview: '+when,...(p.duration_minutes?['Duration: '+p.duration_minutes+' minutes']:[]),p.instructions]:[]),...(p.message&&p.message!=='Your application has reached the interview stage. Once your invitation is published, your interview time and joining instructions will appear here. Please confirm your attendance when those details are available.'&&p.message!=='We would like to invite you to an interview for the Élan Summit 2027 organising committee. Choose a suitable time from the available slots using the booking link below. Please book with the same name and email address you used in your application.'?['Message from the team: '+p.message]:[]),...(booking?['Check the time zone shown on the booking page before choosing your slot. If you have already booked, keep your existing booking; there is no need to book again.','If no available time works for you, reply to this email and share your availability.','Track your application: '+site+'/application-status']:[]),'Application reference: '+p.id];
 return branded(copy[0],paragraphs,booking?'Choose my interview time':row.kind==='selected'?'Open organiser workspace':'Open applicant portal',booking?interviewBookingURL:site+(row.kind==='selected'?'/organisers':'/application-status'));
}
export async function dispatchApplicationMail(db,env,fetcher=fetch,gmailSender,id=null){
 if(!emailConfigured(env))return {configured:false,processed:0};
 const claimed=await db.rpc('elan_claim_application_mail',{p_id:id});if(claimed.error)throw Error('Email queue unavailable');
 const summary={configured:true,processed:0,sent:0,failed:0,uncertain:0,cancelled:0};
 for(const row of claimed.data||[]){
  let deliveryStarted=false;
  async function finish(status,extra={}){
   const result=await db.from('elan_application_mail').update({status,...extra}).eq('id',row.id).eq('status','sending');
   if(result.error)throw Error('Email delivery state could not be saved');
   summary[status]++;summary.processed++;
  }
  try{
   // Recheck after claiming, so an edited/deleted application is not sent from a stale claim.
   const check=await db.rpc('elan_application_mail_current',{p_mail:row.id});
   if(check.error)throw Error('Application lookup failed');
   if(!check.data){await finish('cancelled',{error_code:'superseded'});continue;}
   const content=applicationMailContent(row);
   let provider;
   if(env('GMAIL_APP_PASSWORD')){
    const send=gmailSender||(await import('./gmail-smtp.mjs')).sendGmail;
    deliveryStarted=true;
    const result=await send({password:env('GMAIL_APP_PASSWORD'),to:row.payload.email,id:'application-'+row.id,...content});
    if(!result.accepted?.some(x=>String(x).toLowerCase()===row.payload.email.toLowerCase())){await finish('failed',{error_code:'recipient_rejected',available_at:new Date(Date.now()+900000).toISOString()});continue;}
    provider=result.messageId;
   }else{
    deliveryStarted=true;
    const result=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env('RESEND_API_KEY'),'Content-Type':'application/json','Idempotency-Key':'elan-application-'+row.id},body:JSON.stringify({from:env('EMAIL_FROM'),to:[row.payload.email],reply_to:'the.elan.summit@gmail.com',...content}),signal:AbortSignal.timeout(12000)});
    if(!result.ok){await finish(result.status>=500?'uncertain':'failed',{error_code:result.status>=500?'delivery_unknown':'provider_rejected',available_at:new Date(Date.now()+900000).toISOString()});continue;}
    provider=(await result.json()).id;
   }
   await finish('sent',{sent_at:new Date().toISOString(),provider_id:provider});
  }catch(e){
   const safe=!deliveryStarted||e?.responseCode>=400||e?.code==='EAUTH';
   try{await finish(safe?'failed':'uncertain',{error_code:safe?'delivery_rejected':'delivery_unknown',available_at:new Date(Date.now()+900000).toISOString()});}catch{/* Keep sending: the next claim marks abandoned jobs uncertain. */}
  }
 }
 return summary;
}
