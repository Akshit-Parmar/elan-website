import {dispatchWorkMail} from '../elan-api/work-mail.mjs';
import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {dispatchApplicationMail} from '../elan-api/application-mail.mjs';
import {sendMailAlerts} from '../elan-api/mail-alerts.mjs';
const env=(key:string)=>Deno.env.get(key)||'';
Deno.serve(async req=>{
 const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
 const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(req.method!=='POST')return response({},405);
 const bearer=req.headers.get('Authorization')||'';
 if(!/^Bearer [a-zA-Z0-9_-]{32,256}$/.test(bearer))return response({},401);
 try{
 const db=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
 const auth=await db.rpc('elan_verify_mail_worker',{p_token:bearer.slice(7)});
 if(auth.error||auth.data!==true)return response({},401);
 const result=await dispatchApplicationMail(db,env);
 const workspace=await dispatchWorkMail(db,env);
 const alerts=await sendMailAlerts(db,env);
 const heartbeat=await db.rpc('elan_mail_worker_completed',{p_configured:result.configured,p_processed:result.processed+workspace.processed});
 if(heartbeat.error)throw Error('Worker health update failed');
 return response({...result,alerts,workspace},result.configured?200:503);
 }catch{return response({error:'Applicant email worker failed; check the queue.'},500);}
});
