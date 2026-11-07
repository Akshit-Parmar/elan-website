// Only named destinations are accepted; never redirect to an arbitrary query URL.
export function authDestination(search=''){
 const next=new URLSearchParams(search).get('next');
 return ({application:'/application-status.html',admin:'/admin.html',organisers:'/organisers'})[next]||'/portal/index.html';
}
export function followVerifiedSignIn(auth,navigate){
 let stopped=false,queued=false;
 const {data:{subscription}}=auth.onAuthStateChange((event,session)=>{
  if(!stopped&&!queued&&event==='SIGNED_IN'&&session?.user?.email_confirmed_at){
   queued=true;setTimeout(()=>{if(!stopped)navigate();},0);
  }
 });
 return ()=>{stopped=true;subscription.unsubscribe();};
}
export function bindAuthForm(form,busyText,action){
 const note=form.ownerDocument.createElement('p');note.className='auth-feedback';note.hidden=true;note.setAttribute('role','status');note.setAttribute('aria-live','polite');note.tabIndex=-1;form.append(note);
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(form.dataset.sending==='true'||!form.reportValidity())return;
  form.dataset.sending='true';form.setAttribute('aria-busy','true');
  const buttons=[...form.querySelectorAll('button[type=submit]')],labels=buttons.map(b=>b.textContent);
  buttons.forEach(b=>{b.disabled=true;b.textContent=busyText;});note.hidden=false;note.dataset.state='busy';note.textContent=busyText;
  try{const message=await action(Object.fromEntries(new FormData(form)));note.dataset.state='success';note.textContent=message||'Signed in. Opening your account…';}
  catch(err){note.dataset.state='error';note.textContent=err?.message||'We could not complete this request. Please try again.';}
  finally{buttons.forEach((b,i)=>{b.disabled=false;b.textContent=labels[i];});delete form.dataset.sending;form.removeAttribute('aria-busy');note.focus({preventScroll:true});}
 });
}

// Admin-issued invitations carry a session fragment, unlike PKCE signup and recovery links.
export function inviteCallback(mode,hash){
 if(mode!=='password')return null;
 const p=new URLSearchParams((hash||'').replace(/^#/,''));
 if(p.get('type')!=='invite'&&!p.has('access_token')&&!p.has('error'))return null;
 return {valid:p.get('type')==='invite'&&!p.has('error'),access_token:p.get('access_token'),refresh_token:p.get('refresh_token')};
}
export async function acceptInviteSession(auth,incoming){
 if(!incoming.valid||!incoming.access_token||!incoming.refresh_token)throw Error('Invalid invitation');
 const {access_token,refresh_token}=incoming;
 const verified=await auth.getUser(access_token);
 if(verified.error||!verified.data.user?.email_confirmed_at)throw Error('Invalid invitation');
 const session=await auth.setSession({access_token,refresh_token});
 if(session.error||session.data.session?.user?.id!==verified.data.user.id)throw Error('Invalid invitation');
}
