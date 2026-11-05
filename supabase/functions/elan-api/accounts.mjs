import {ApiError,uuid,email} from './validation.mjs';
export async function deleteAccount({db,scoped,uid,role,body,audit}){
 if(role!=='admin')throw new ApiError('Administrator access required.',403);
 const id=uuid(body.id);if(id===uid)throw new ApiError('You cannot delete your own account here.',409);
 const check=await scoped.rpc('elan_account_removal_check',{p_id:id});
 if(check.error)throw new ApiError('Account could not be checked. Refresh and try again.',409);
 if(check.data.blockers.length)throw new ApiError('This account has protected roles or linked event records. Review them before deletion.',409);
 if(email(body.confirm_email)!==String(check.data.email).toLowerCase())throw new ApiError('Type the account email exactly to confirm.',400);
 await audit(uid,'delete-account-request',id);
 const deleted=await db.auth.admin.deleteUser(id,false);
 if(deleted.error)throw new ApiError('Account was not deleted. It may have linked records or owned uploads. Refresh and review before retrying.',409);
 // The request audit is durable before deletion. A logging failure must not invite
 // another deletion attempt after Auth has already completed the removal.
 let auditRecorded=true;try{await audit(uid,'delete-account-complete',id);}catch{auditRecorded=false;}
 return {ok:true,auditRecorded};
}
