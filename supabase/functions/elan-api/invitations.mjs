import {ApiError,uuid} from './validation.mjs';
export async function inviteOrganiser({db,scoped,uid,role,body,audit,rate,recoveryAuth}){
 if(role!=='admin')throw new ApiError('Administrator access required.',403);
 const id=uuid(body.id);
 const lookup=await scoped.rpc('elan_oc_invitation_target',{p_id:id});
 if(lookup.error||!lookup.data)throw new ApiError('Could not check this saved member. Refresh and try again.',409);
 const target=lookup.data;
 if(body.resend===true&&target.account_exists){
  const active=await Promise.all(['elan_oc_access','elan_oc_reviewers'].map(t=>scoped.from(t).select('user_id').eq('label',target.email).limit(1)));
  if(active.some(r=>r.error))throw new ApiError('Could not check workspace access.',409);
  if(!target.pending&&!active.some(r=>r.data.length))throw new ApiError('Assign workspace access before sending setup mail.',409);
  await rate('oc-setup:'+target.email,1,300);await audit(uid,'resend:oc-setup',id);
  const sent=await recoveryAuth.resetPasswordForEmail(target.email,{redirectTo:'https://elansummit.com/portal/set-password.html?next=organisers'});
  if(sent.error)throw new ApiError('Could not request a new setup email. Try again later.',502);
  return {status:'setup_requested'};
 }
 if(target.account_exists)return {status:target.verified?'existing_verified':target.invited?'already_invited':'existing_unverified'};
 if(!target.pending)return {status:'no_assignment'};
 // Shared per-member/email rate check also serializes repeated browser clicks.
 await rate('oc-invite:'+target.email,1,300);
 await audit(uid,'invite:oc-request',id);
 const r=await db.auth.admin.inviteUserByEmail(target.email,{redirectTo:'https://elansummit.com/portal/set-password.html?next=organisers',data:{full_name:target.name}});
 if(r.error)throw new ApiError('Member saved, but the invitation could not be sent. Check the Auth email settings, then use Check / send invitation again. If an account was created meanwhile, ask the member to sign in or reset their password.',502);
 let auditRecorded=true;try{await audit(uid,'invite:oc-sent',id);}catch{auditRecorded=false;}
 return {status:'sent',auditRecorded};
}
