import {getPortal,wrongPortal} from './portal-access.js';
import {dueLabel,leadershipSummary} from './workspace-summary.js';
import {submitReview,reviewView} from './leadership-review.js';
import {finance,registry,toolNames,handoffDesk} from './department-tools.js';
import {createClient} from './vendor/supabase.js';
import {esc} from './organiser-utils.js';
const table='elan_oc_board';
const read=async q=>{const r=await q;if(r.error)throw r.error;return r.data;};
const safe=url=>{try{return new URL(url).protocol==='https:'?url:null;}catch{return null;}};
function notice(host,msg){host.textContent=msg;}
export function composer(host,{sb,dept,admin=false,after}) {
 host.innerHTML='<form class="team-form"><h3>Post to the panel</h3>'+(admin?'<label>Department<input name="dept" list="oc-deps" maxlength="90" required></label>':'')+'<label>Audience<select name="audience"><option value="department">Whole department</option><option value="lead">Department leads</option>'+(admin?'<option value="member">Department members</option>':'')+'</select></label><label>Type<select name="kind"><option value="briefing">Briefing</option><option value="resource">Resource link</option></select></label><label>Title<input name="title" required maxlength="160"></label><label>Details<textarea name="body" rows="4" required maxlength="4000"></textarea></label><label hidden>Resource URL<input name="url" type="url" placeholder="https://" maxlength="2000" disabled></label><button>'+ (admin?'Publish to panel':'Submit for review')+'</button><p role="status"></p></form>';
 const f=host.querySelector('form');f.elements.kind.onchange=()=>{const resource=f.elements.kind.value==='resource';f.elements.url.disabled=!resource;f.elements.url.required=resource;f.elements.url.parentElement.hidden=!resource;f.elements.body.required=!resource;};
 f.onsubmit=async e=>{e.preventDefault();if(f.inert)return;const v=Object.fromEntries(new FormData(f)),url=(v.url||'').trim(),out=f.querySelector('[role=status]');if(v.kind==='resource'&&!safe(url)){notice(out,'Enter a full HTTPS link.');return;}f.inert=true;try{const post={department:(admin?v.dept:dept).trim(),audience:v.audience,kind:v.kind,title:v.title.trim(),body:v.body.trim(),url};if(admin)await read(sb.from(table).insert(post));else await submitReview(sb,'board',post);f.reset();f.elements.kind.onchange();notice(out,admin?'Published.':'Submitted for leadership review.');await after();}catch(err){notice(out,err.message);}finally{f.inert=false;}};
}
export async function panel({host,sb,session}){
 const actual=await getPortal(sb);if(actual!=='organiser'){wrongPortal(host,actual,'organiser',sb);return;}
 await read(sb.rpc('elan_claim_appointment'));

 const mine=await read(sb.from('elan_oc_access').select('department,role').eq('user_id',session.user.id).maybeSingle());
 const reviewer=await read(sb.from('elan_oc_reviewers').select('seat').eq('user_id',session.user.id).maybeSingle());
 const signout=async()=>{const r=await sb.auth.signOut();if(!r.error)location.reload();else alert(r.error.message);};
 if(mine||reviewer){const {operationsDesk}=await import('./operations-desk.js');await operationsDesk({host,sb,session,mine,reviewer,signout,composer});return;}
 if(!mine){const staff=await read(sb.from('elan_staff').select('role').eq('user_id',session.user.id).maybeSingle()),admin=staff?.role==='admin';
 host.innerHTML='<section class="access-arrival"><div class="access-story"><small>ÉLAN / THE ORGANISING TEAM</small><h1>'+ (admin?'Team management.':'Your team workspace.')+'</h1><p>'+ (admin?'You’re signed in as an administrator. Manage the team here while 2027 department and leadership roles are being decided.':'You’re signed in. Your department workspace will open here once the organising team assigns your role.')+'</p><small>Signed in as '+esc(session.user.email)+'</small></div><div class="access-actions">'+(admin?'<small>ADMINISTRATOR TOOLS</small><a href="/admin.html?section=oc_roster"><strong>2026 committee directory</strong><span>Add people, edit biographies and manage portraits ↗</span></a><a href="/admin.html?section=oc_control"><strong>2027 committee access</strong><span>Assign departments and manage approval seats ↗</span></a>':'<small>NEXT STEP</small><h2>Waiting for an assignment</h2><p>If you’ve already been selected, contact the team with the email shown here.</p><a href="mailto:the.elan.summit@gmail.com">Contact the organising team ↗</a>')+'<button class="team-out" type="button">Sign out</button></div></section>';host.querySelector('.team-out').onclick=signout;return;}
}
async function start(){const host=document.querySelector('#team-root');if(!host)return;
 try{const config=await fetch('/assets/public-config.json').then(r=>r.json());const sb=createClient(config.supabaseUrl,config.publishableKey,{auth:{flowType:'pkce'}});const {data:{session}}=await sb.auth.getSession();if(session){await panel({host,sb,session});return;}
 host.innerHTML='<section class="team-entry studio-entry"><div><small>PRIVATE WORKSPACE / 2027</small><h1>Organiser<br><em>control panel.</em></h1><p>Use the email you gave the director. Your team, responsibilities and approval inbox appear here once access is assigned.</p></div><form class="team-form"><h2>Team sign-in</h2><label>Organiser email<input name="email" type="email" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button>Open my workspace ↗</button><p role="status"></p><a href="/portal/login.html?next=organisers">Create an account or reset your password</a></form></section>';
 const f=host.querySelector('form');f.onsubmit=async e=>{e.preventDefault();f.inert=true;notice(f.querySelector('[role=status]'),'Signing in…');try{const auth=await read(sb.auth.signInWithPassword({email:f.email.value.trim(),password:f.password.value}));await panel({host,sb,session:auth.session});}catch(err){notice(f.querySelector('[role=status]'),err.message);}finally{f.inert=false;}};}catch(err){notice(host,'Unable to open the organiser panel. '+err.message);}}
if(document.querySelector('#team-root'))start();
