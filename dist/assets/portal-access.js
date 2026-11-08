export const portals={
 admin:{title:'Admin',url:'/admin.html'},organiser:{title:'Organiser',url:'/organisers'},applicant:{title:'Applicant',url:'/application-status.html'},participant:{title:'Participant',url:'/portal/index.html'}
};
export function pagePortal(mode){return mode==='admin'?'admin':mode==='applications'?'applicant':'participant';}
export async function getPortal(sb){const r=await sb.rpc('elan_login_portal');if(r.error||!portals[r.data])throw Error('Could not verify access. Please sign in again.');return r.data;}
export function wrongPortal(host,actual,desired,sb){
 const real=portals[actual],wanted=portals[desired];
 host.innerHTML='<section class="app-card ops-paper" role="alert"><small>ÉLAN / ACCOUNT ACCESS</small><h2>Use the '+real.title+' portal.</h2><p>This account belongs to the '+real.title+' portal and cannot open the '+wanted.title+' portal.</p><p><a class="app-button" href="'+real.url+'">Open '+real.title+' portal →</a></p><button type="button" data-switch>Sign out and use another account</button></section>';
 host.querySelector('[data-switch]').onclick=async()=>{const r=await sb.auth.signOut({scope:'local'});if(!r.error)location.reload();};
}

// A signed-out or switched account must not leave the previous account's page on screen.
export function watchWorkspace(sb,session,host){
 let leaving=false;
 const refresh=()=>{if(leaving)return;leaving=true;host.replaceChildren();setTimeout(()=>location.reload(),0);};
 const {data:{subscription}}=sb.auth.onAuthStateChange((event,next)=>{
  if(event==='SIGNED_OUT'||(next?.user?.id&&next.user.id!==session.user.id))refresh();
 });
 window.addEventListener('pageshow',e=>{if(e.persisted)refresh();});
 window.addEventListener('pagehide',()=>{subscription.unsubscribe();},{once:true});
}
