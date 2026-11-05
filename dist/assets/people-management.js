import {esc,allTable} from './organiser-utils.js';
import {editorStyles} from './visual-editor.js';
const data=async q=>{const r=await q;if(r.error)throw r.error;return r.data;};
export async function confirmRemoval({title,description,email,remove}){
 const d=document.createElement('dialog');d.className='studio-dialog removal-dialog';d.setAttribute('aria-label',title);
 d.innerHTML=`<form><small>PERMANENT REMOVAL</small><h2>${esc(title)}</h2><p>${esc(description)}</p><p>Type <strong>${esc(email)}</strong> to confirm.</p><label>Email confirmation<input name="confirm_email" type="email" autocomplete="off" required></label><p role="status"></p><div class="app-actions"><button type="button" data-cancel>Cancel</button><button type="submit" class="danger-action" disabled>Delete permanently</button></div></form>`;
 document.body.append(d);const f=d.querySelector('form'),input=f.elements.confirm_email,button=f.querySelector('[type=submit]'),out=f.querySelector('[role=status]');let busy=false;
 return new Promise(resolve=>{
  d.querySelector('[data-cancel]').onclick=()=>{if(!busy)d.close();};d.oncancel=e=>{if(busy)e.preventDefault();};
  input.oninput=()=>button.disabled=input.value.trim().toLowerCase()!==email.toLowerCase();
  d.onclose=()=>{d.remove();resolve(d.returnValue==='deleted');};
  f.onsubmit=async e=>{e.preventDefault();if(busy||button.disabled||!f.reportValidity())return;busy=true;f.inert=true;out.textContent='Deleting…';try{await remove(input.value.trim());d.close('deleted');}catch(err){out.textContent=err.message||'Could not delete. Your record has not been confirmed as removed.';}finally{busy=false;f.inert=false;}};
  d.showModal();d.querySelector('[data-cancel]').focus();
 });
}
export async function accountManager({sb,api,host,isCurrent}){
 editorStyles();host.innerHTML='<section class="app-card people-manager"><span class="app-badge">PEOPLE & TEAMS / ACCOUNTS</span><h2>Website accounts.</h2><p>Manage logins separately from applications and committee profiles. Staff accounts and accounts with event records or uploads are protected from deletion.</p><form class="people-search"><label>Find an account<input name="query" type="search" maxlength="150" placeholder="Name or email"></label><button>Search</button></form><p data-result role="status"></p><div data-accounts></div><div class="app-actions"><button data-prev>Previous</button><button data-next>Next</button></div></section>';
 let offset=0,query='',seq=0;const q=s=>host.querySelector(s),out=q('[data-result]');
 async function load(){const current=++seq;out.textContent='Loading accounts…';q('[data-prev]').disabled=true;q('[data-next]').disabled=true;
 try{const r=await data(sb.rpc('elan_accounts',{p_search:query,p_offset:offset}));if(!isCurrent()||current!==seq)return;
 out.textContent=`${r.total} ${r.total===1?'account':'accounts'} · showing ${r.rows.length?offset+1:0}–${offset+r.rows.length}`;
 q('[data-accounts]').innerHTML=r.rows.map(u=>`<article class="people-row"><div><span class="app-badge">${esc(u.role|| (u.department?'Organiser':'Participant'))}</span><h3>${esc(u.full_name||u.email||'Account')}</h3><p>${esc(u.email)}${u.department?' · '+esc(u.department):''}</p><small>${u.email_confirmed_at?'Email verified':'Email not verified'} · Joined ${new Date(u.created_at).toLocaleDateString()}</small></div><button class="secondary" data-remove-account="${esc(u.id)}" ${u.role?'disabled':''}>${u.role?'Protected staff account':'Review deletion'}</button></article>`).join('')||'<p>No matching accounts.</p>';
 q('[data-prev]').disabled=offset===0;q('[data-next]').disabled=offset+r.rows.length>=r.total;
 for(const b of host.querySelectorAll('[data-remove-account]'))b.onclick=async()=>{b.disabled=true;try{
 const check=await data(sb.rpc('elan_account_removal_check',{p_id:b.dataset.removeAccount}));if(!isCurrent())return;
 if(check.blockers.length){out.textContent='Cannot delete this account yet: '+check.blockers.join('; ')+'. Existing records and files were kept.';out.scrollIntoView({block:'center'});return;}
 const deleted=await confirmRemoval({title:'Delete this account?',description:'This removes the login, profile and organiser access. It cannot be undone. OC applications, public committee profiles and the private member register are separate and will remain.',email:check.email,remove:confirm_email=>api('account-delete',{id:b.dataset.removeAccount,confirm_email})});
 if(deleted&&isCurrent()){offset=0;await load();out.textContent='Account deleted. Applications and public profiles were not removed.';}
 }catch(err){out.textContent=err.message;}finally{b.disabled=false;}};
 }catch(err){out.textContent=err.message;}}
 q('form').onsubmit=e=>{e.preventDefault();query=q('input').value.trim();offset=0;load();};q('[data-prev]').onclick=()=>{offset=Math.max(0,offset-30);load();};q('[data-next]').onclick=()=>{offset+=30;load();};await load();
}
export async function directMembers({sb,host,isCurrent}){
 editorStyles();const [rows,modules,access]=await Promise.all([allTable(sb,'elan_oc_members_2027'),allTable(sb,'elan_oc_modules'),allTable(sb,'elan_oc_access')]);if(!isCurrent())return;
 host.innerHTML='<section class="app-card people-manager"><div class="studio-head"><div><span class="app-badge">PEOPLE & TEAMS / 2027</span><h2>Your organising team.</h2><p>Add a directly appointed member without an application. Records here are private.</p></div><button data-add-member>Add OC member +</button></div><p>For public photos and biographies, use <a href="/admin.html?section=oc_roster">2026 OC members</a>. To manage existing login assignments, use <a href="/admin.html?section=oc_control">Committee & access</a>.</p><label>Find a member<input data-search type="search" placeholder="Name, department or email"></label><p role="status" data-member-status></p><div data-members></div></section>';
 const q=s=>host.querySelector(s);let currentAccess=access;
 function draw(){const term=q('[data-search]').value.toLowerCase();const visible=rows.filter(r=>[r.name,r.email,r.department].join(' ').toLowerCase().includes(term)).sort((a,b)=>a.name.localeCompare(b.name));
 q('[data-members]').innerHTML=visible.map(r=>{const a=currentAccess.find(a=>a.label.toLowerCase()===r.email);return `<article class="people-row"><div><span class="app-badge">${esc(r.department)}</span><h3>${esc(r.name)}</h3><p>${esc(r.role)} · ${esc(r.email)}</p><small>${a?'Login access: '+esc(a.role)+' · '+esc(a.department):'No organiser access assigned'}</small></div><button data-edit-member="${r.id}">Edit member ↗</button></article>`;}).join('')||'<p>No members added here yet. Existing login assignments remain in Committee & access.</p>';
 for(const b of host.querySelectorAll('[data-edit-member]'))b.onclick=()=>edit(rows.find(r=>r.id===b.dataset.editMember));
 }
 function edit(original){const d=document.createElement('dialog');d.className='studio-dialog member-dialog';d.setAttribute('aria-label',original?'Edit OC member':'Add OC member');
 const field=(name,label,type='text',max=150)=>`<label>${label}<input name="${name}" type="${type}" maxlength="${max}" value="${esc(original?.[name]||'')}" ${['name','email','department','role'].includes(name)?'required':''}></label>`;
 d.innerHTML=`<form class="app-form"><div class="studio-head"><div><small>ÉLAN 2027 / DIRECT APPOINTMENT</small><h2>${original?'Edit member':'Add a team member.'}</h2></div><button type="button" data-close>Close ×</button></div><div class="member-fields">${field('name','Full name')}${field('email','Account email','email',254)}${field('phone','Phone (optional)','tel',40)}${field('department','Department','text',90)}${field('role','Committee role')}<label>Workspace access<select name="access"><option value="record_only">Save record only; leave login access unchanged</option><option value="member">Grant member access in this department</option><option value="lead">Grant department lead access</option></select></label></div><datalist id="direct-departments">${modules.map(m=>`<option value="${esc(m.department)}">`).join('')}</datalist><p>To grant access, this person must already have a verified account with the same email. They choose their own password. A committee title alone does not grant permissions; Director and Assistant Director approval seats are assigned separately.</p><label>Private notes (optional)<textarea name="notes" maxlength="3000" rows="3">${esc(original?.notes||'')}</textarea></label><p role="status"></p><button type="submit">Save member</button></form>`;
 document.body.append(d);const f=d.querySelector('form');f.elements.department.setAttribute('list','direct-departments');let busy=false,dirty=false;f.oninput=()=>dirty=true;
 const close=()=>{if(!busy&&(!dirty||confirm('Discard unsaved member details?')))d.close();};d.querySelector('[data-close]').onclick=close;d.oncancel=e=>{e.preventDefault();close();};d.onclose=()=>d.remove();d.showModal();
 f.onsubmit=async e=>{e.preventDefault();if(busy||!f.reportValidity())return;busy=true;f.inert=true;const out=f.querySelector('[role=status]');out.textContent='Saving member…';const v=Object.fromEntries(new FormData(f));try{
 let r=await data(sb.rpc('elan_save_direct_member',{p_id:original?.id||null,p_name:v.name,p_email:v.email,p_phone:v.phone,p_department:v.department,p_role:v.role,p_notes:v.notes,p_access:v.access,p_expected:original?.version||0}));if(Array.isArray(r))r=r[0];
 if(original)Object.assign(original,r);else rows.push(r);dirty=false;d.close();
 if(isCurrent()){q('[data-member-status]').textContent=v.access==='record_only'?'Member saved to the database. Login access is unchanged.':'Member saved and organiser access assigned. They can sign in at /organisers.';try{currentAccess=await allTable(sb,'elan_oc_access');}catch{q('[data-member-status]').textContent+=' Refresh to check the latest access listing.';}draw();}
 }catch(err){out.textContent=err.code==='23505'?'This email is already in the member register. Edit the existing member.':err.message;}finally{busy=false;f.inert=false;}};
 }
 q('[data-add-member]').onclick=()=>edit(null);q('[data-search]').oninput=draw;draw();
}
