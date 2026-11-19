import {createClient} from './vendor/supabase.js';
import {getPortal,portals} from './portal-access.js';
const form=document.querySelector('#sign-in'),note=document.querySelector('#signin-status'),open=document.querySelector('#open-workspace'),out=document.querySelector('#home-signout'),account=document.querySelector('#account-note');
let sb;
async function showAccount(){
 const {data:{session},error}=await sb.auth.getSession();if(error)throw error;
 if(!session){form.hidden=false;open.hidden=true;out.hidden=true;return;}
 out.hidden=false;const portal=await getPortal(sb);open.href=portals[portal].url;open.textContent='Open '+portals[portal].title.toLowerCase()+' workspace';open.hidden=false;out.hidden=false;form.hidden=true;account.textContent='Signed in as '+session.user.email+'. Your assigned workspace is ready.';
}
form.addEventListener('submit',async e=>{e.preventDefault();if(!sb||!form.reportValidity()||form.dataset.busy)return;form.dataset.busy='true';const button=form.querySelector('button');button.disabled=true;note.textContent='Signing in…';note.dataset.error='false';try{const values=new FormData(form);const {error}=await sb.auth.signInWithPassword({email:String(values.get('email')).trim(),password:String(values.get('password'))});if(error)throw error;await showAccount();location.assign(open.href);}catch(err){note.textContent=err.message||'Could not sign in. Please try again.';note.dataset.error='true';note.focus();}finally{delete form.dataset.busy;button.disabled=false;}});
out.onclick=async()=>{out.disabled=true;try{const {error}=await sb.auth.signOut({scope:'local'});if(error)throw error;location.reload();}catch(e){account.textContent=e.message;out.disabled=false;}};
try{const response=await fetch('/assets/public-config.json');if(!response.ok)throw Error('Could not load sign-in settings.');const config=await response.json();sb=createClient(config.supabaseUrl,config.publishableKey,{auth:{flowType:'pkce'}});await showAccount();}catch(e){note.textContent=e.message||'Connect to the internet and try again.';note.dataset.error='true';if(!sb)form.querySelector('button').disabled=true;}
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
