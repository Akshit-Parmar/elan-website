import {branded,site} from './mail-brand.mjs';
import {emailConfigured} from './acknowledgement.mjs';
export function workMailContent(row){
 if(!['/admin','/organisers'].includes(row.portal)||!row.events?.length)throw Error('Invalid notification');
 return branded(row.events.length===1?'Élan · '+row.events[0].title:'Élan · '+row.events.length+' workspace updates',[
 'Here is the latest from your Élan workspace.',...row.events.map(e=>e.title),
 'Open your workspace for the current details and any action needed. Only updates relevant to your responsibilities are included.',
 'You can choose immediate updates or a daily summary in Today → Email preferences. Account, applicant and interview messages remain immediate.'
 ],'Open your workspace',site+row.portal);
}
export async function dispatchWorkMail(db,env,fetcher=fetch,gmailSender){
 if(!emailConfigured(env))return {configured:false,processed:0};
 const q=await db.rpc('elan_claim_work_mail');if(q.error)throw Error('Workspace mail queue unavailable');
 const totals={configured:true,processed:0,sent:0,failed:0,uncertain:0,cancelled:0};
 for(const row of q.data||[]){const ids=row.events.map(e=>e.id);let started=false;
 const finish=async state=>{const r=await db.rpc('elan_finish_work_mail',{p_ids:ids,p_status:state});if(r.error)throw Error('Could not record delivery');totals[state]++;totals.processed+=ids.length;};
 try{const check=await db.rpc('elan_work_mail_current',{p_ids:ids});if(check.error)throw Error('Permission check failed');if(!check.data){await finish('cancelled');continue;}
 const content=workMailContent(row);
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ids.slice().sort().join(',')));
 const key='workspace-'+Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
 if(env('GMAIL_APP_PASSWORD')){const send=gmailSender||(await import('./gmail-smtp.mjs')).sendGmail;started=true;const sent=await send({password:env('GMAIL_APP_PASSWORD'),to:row.email,id:key,...content});if(!sent.accepted?.some(x=>String(x).toLowerCase()===row.email.toLowerCase())){await finish('failed');continue;}}
 else{started=true;const r=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env('RESEND_API_KEY'),'Content-Type':'application/json','Idempotency-Key':key.slice(0,256)},body:JSON.stringify({from:env('EMAIL_FROM'),to:[row.email],reply_to:'the.elan.summit@gmail.com',...content}),signal:AbortSignal.timeout(12000)});if(!r.ok){await finish(r.status>=500?'uncertain':'failed');continue;}}
 await finish('sent');
 }catch(e){try{await finish(!started||e.responseCode>=400||e.code==='EAUTH'?'failed':'uncertain');}catch{ /* Abandoned sends become uncertain on the next worker run. */ }}
 }return totals;
}
