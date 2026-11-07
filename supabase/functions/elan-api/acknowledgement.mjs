import {branded,site} from './mail-brand.mjs';
export const emailConfigured=env=>!!(env('GMAIL_APP_PASSWORD')||(env('RESEND_API_KEY')&&env('EMAIL_FROM')));
export function acknowledgementContent(row){
 const oc=row.details?.intent==='2027 organising committee application'||String(row.details?.application_version)==='2';
 return branded(oc?'Your Élan 2027 OC application has arrived':'Your enquiry has reached Élan Summit',['Hi '+row.full_name+',',oc?'Thank you for applying to the Élan Summit 2027 organising committee. We have received your application. Our recruitment team will read your answers and share the next step in your applicant portal.':'Thank you for getting in touch. The Élan team has received your enquiry and will follow up using this email address.',...(oc?['Sign in with the email you applied with to see your status. If we invite you to interview, you can confirm the time or request a different one there. You do not need a ticket or a participant profile.']:[]),'Your reference: '+row.id],oc?'Open my application':'Visit Élan Summit',site+(oc?'/application-status':'/'));
}
export async function sendAcknowledgement(db,id,env,fetcher=fetch,gmailSender,applicantAuth){
 const password=env('GMAIL_APP_PASSWORD'),key=env('RESEND_API_KEY'),from=env('EMAIL_FROM');
 if(!emailConfigured(env)&&!applicantAuth){await db.from('elan_acknowledgements').update({status:'unconfigured'}).eq('enquiry_id',id).in('status',['pending','unconfigured','failed']);return 'unconfigured';}
 // Claim once. A crashed/uncertain delivery is never silently resent.
 const claim=await db.from('elan_acknowledgements').update({status:'sending',attempted_at:new Date().toISOString()}).eq('enquiry_id',id).in('status',['pending','unconfigured','failed']).select('enquiry_id').maybeSingle();
 if(claim.error)return 'failed';if(!claim.data){const r=await db.from('elan_acknowledgements').select('status').eq('enquiry_id',id).maybeSingle();return r.data?.status||'unavailable';}
 const row=await db.from('elan_enquiries').select('id,full_name,email,details').eq('id',id).single();
 if(row.error){await db.from('elan_acknowledgements').update({status:'failed'}).eq('enquiry_id',id);return 'failed';}
 try{
 if(applicantAuth&&(row.data.details?.application_version==2||row.data.details?.intent==='2027 organising committee application')){
  const account=await db.rpc('elan_application_account',{p_id:id});if(account.error||!account.data)throw Error('Account lookup failed');
  let issued;
  if(account.data==='new')issued=await db.auth.admin.inviteUserByEmail(row.data.email,{redirectTo:site+'/portal/set-password.html?next=application',data:{invite_context:'applicant'}});
  else if(!emailConfigured(env)||account.data==='unverified')issued=await applicantAuth.signInWithOtp({email:row.data.email,options:{shouldCreateUser:false,emailRedirectTo:site+'/application-status.html'}});
  if(issued){if(issued.error){await db.from('elan_acknowledgements').update({status:'failed'}).eq('enquiry_id',id);return 'failed';}await db.from('elan_acknowledgements').update({status:'sent',sent_at:new Date().toISOString(),provider_id:'auth'}).eq('enquiry_id',id);return 'sent';}
 }
 if(!emailConfigured(env)){await db.from('elan_acknowledgements').update({status:'unconfigured'}).eq('enquiry_id',id);return 'unconfigured';}
 if(password){
  const send=gmailSender||(await import('./gmail-smtp.mjs')).sendGmail;
  const delivery=await send({password,to:row.data.email,id,...acknowledgementContent(row.data)});
  if(!delivery.accepted?.some(address=>String(address).toLowerCase()===row.data.email.toLowerCase())){
   await db.from('elan_acknowledgements').update({status:'failed'}).eq('enquiry_id',id);return 'failed';
  }
  await db.from('elan_acknowledgements').update({status:'sent',sent_at:new Date().toISOString(),provider_id:delivery.messageId}).eq('enquiry_id',id);return 'sent';
 }
 const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'elan-enquiry-'+id},body:JSON.stringify({from,to:[row.data.email],reply_to:'the.elan.summit@gmail.com',...acknowledgementContent(row.data)}),signal:AbortSignal.timeout(12000)});
 if(!response.ok){await db.from('elan_acknowledgements').update({status:response.status>=500?'sending':'failed'}).eq('enquiry_id',id);return response.status>=500?'sending':'failed';}
 const result=await response.json();await db.from('elan_acknowledgements').update({status:'sent',sent_at:new Date().toISOString(),provider_id:result.id}).eq('enquiry_id',id);return 'sent';
 }catch(error){
 // Explicit SMTP rejection is safe to retry. Timeout/lost connection may have sent;
 // retain 'sending' for reconciliation instead of creating duplicate mail.
 if(password&&(error?.responseCode>=400||error?.code==='EAUTH')){
  await db.from('elan_acknowledgements').update({status:'failed'}).eq('enquiry_id',id);return 'failed';
 }
 return 'sending';
 }
}
