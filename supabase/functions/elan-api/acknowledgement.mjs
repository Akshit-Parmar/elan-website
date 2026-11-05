export function acknowledgementContent(row){
 const oc=row.details?.intent==='2027 organising committee application'||String(row.details?.application_version)==='2';
 return {subject:oc?'We have your Élan OC application':'We have your enquiry | Élan Summit',text:`Hi ${row.full_name},\n\nThank you for ${oc?'applying to the Élan 2027 organising committee':'getting in touch with Élan'}. We have received your information, and our team will review it and get back to you shortly.\n\n${oc?'You can track your application and interview invitations at https://elansummit.com/application-status . Sign in with a verified account using this email address.\n\n':''}Reference: ${row.id}\n\nIf you have a question, reply to this email.\nThe Élan team`};
}
export async function sendAcknowledgement(db,id,env,fetcher=fetch){
 const key=env('RESEND_API_KEY'),from=env('EMAIL_FROM');
 if(!key||!from){await db.from('elan_acknowledgements').update({status:'unconfigured'}).eq('enquiry_id',id).in('status',['pending','unconfigured','failed']);return 'unconfigured';}
 // Claim once. A crashed/uncertain delivery is never silently resent.
 const claim=await db.from('elan_acknowledgements').update({status:'sending',attempted_at:new Date().toISOString()}).eq('enquiry_id',id).in('status',['pending','unconfigured','failed']).select('enquiry_id').maybeSingle();
 if(claim.error)return 'failed';if(!claim.data){const r=await db.from('elan_acknowledgements').select('status').eq('enquiry_id',id).maybeSingle();return r.data?.status||'unavailable';}
 const row=await db.from('elan_enquiries').select('id,full_name,email,details').eq('id',id).single();
 if(row.error){await db.from('elan_acknowledgements').update({status:'failed'}).eq('enquiry_id',id);return 'failed';}
 try{
 const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'elan-enquiry-'+id},body:JSON.stringify({from,to:[row.data.email],reply_to:'the.elan.summit@gmail.com',...acknowledgementContent(row.data)}),signal:AbortSignal.timeout(12000)});
 if(!response.ok){await db.from('elan_acknowledgements').update({status:response.status>=500?'sending':'failed'}).eq('enquiry_id',id);return response.status>=500?'sending':'failed';}
 const result=await response.json();await db.from('elan_acknowledgements').update({status:'sent',sent_at:new Date().toISOString(),provider_id:result.id}).eq('enquiry_id',id);return 'sent';
 }catch{return 'sending';}
}
