import {branded,site} from './mail-brand.mjs';
import {emailConfigured} from './acknowledgement.mjs';
export async function sendMailAlerts(db,env,fetcher=fetch,gmailSender){
 if(!emailConfigured(env))return {sent:0,failed:0};
 const result=await db.rpc('elan_claim_mail_alerts');if(result.error)throw Error('Email alert check failed');
 const summary={sent:0,failed:0};
 for(const alert of result.data||[]){
 const content=branded('Élan: applicant email delivery needs attention',[`${alert.count} applicant email records need attention.`, 'Open OC applications and select Email needs attention. Check delivery history before retrying. An uncertain delivery may already have reached the recipient.', 'This is a daily operational alert. No application status has been changed.'],'Review email delivery',site+'/admin.html');
 try{
 if(env('GMAIL_APP_PASSWORD')){const send=gmailSender||(await import('./gmail-smtp.mjs')).sendGmail;const r=await send({password:env('GMAIL_APP_PASSWORD'),to:alert.email,id:'mail-alert-'+alert.id+'-'+alert.day,...content});if(!r.accepted?.some(x=>String(x).toLowerCase()===alert.email.toLowerCase()))throw Error('Rejected');}
 else{const r=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env('RESEND_API_KEY'),'Content-Type':'application/json','Idempotency-Key':'elan-mail-alert-'+alert.id+'-'+alert.day},body:JSON.stringify({from:env('EMAIL_FROM'),to:[alert.email],...content}),signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Rejected');}
 summary.sent++;
 }catch{summary.failed++;}
 }
 return summary;
}
