import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {dispatchApplicationMail} from '../elan-api/application-mail.mjs';
const env=(key:string)=>Deno.env.get(key)||'';
Deno.serve(async req=>{
 const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
 if(req.method!=='POST')return new Response('{}',{status:405,headers});
 const token=env('APPLICANT_MAIL_JOB_TOKEN');
 if(token.length<32||req.headers.get('Authorization')!=='Bearer '+token)return new Response('{}',{status:401,headers});
 try{
 const db=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
 return new Response(JSON.stringify(await dispatchApplicationMail(db,env)),{headers});
 }catch{return new Response(JSON.stringify({error:'Applicant email worker failed; check the queue.'}),{status:500,headers});}
});
