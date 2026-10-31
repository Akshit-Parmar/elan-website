import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {ApiError,text,uuid,integer,oneOf,email,slug,safeImage,attendees,validSignature,capturedPayment} from './validation.mjs';
const env=(k:string)=>Deno.env.get(k)||'';
const url=env('SUPABASE_URL');
const db=createClient(url,env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
const origins=[...new Set(['https://elansummit.com','https://www.elansummit.com',...(env('ALLOWED_ORIGINS')||'https://elan-next-chapter.akshit-parmar.chatgpt.site,http://localhost:8000,http://127.0.0.1:8000,http://terminal.local:4173').split(',').map(x=>x.trim()).filter(Boolean)])];
function checked(r:any){if(r.error)throw new ApiError('The request could not be saved. Check the details and try again.',409);return r.data;}
async function rate(key:string,limit=30,seconds=60){const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key)))).map(x=>x.toString(16).padStart(2,'0')).join('');if(!checked(await db.rpc('elan_rate_check',{p_key:hash,p_limit:limit,p_seconds:seconds})))throw new ApiError('Too many requests. Please try again later.',429);}
async function audit(actor:string,action:string,target:string){checked(await db.from('elan_audit').insert({actor_id:actor,action,target}));}
async function ownRegistration(id:string,uid:string){const r=checked(await db.from('elan_registrations').select('*').eq('id',uuid(id)).eq('owner_id',uid).maybeSingle());if(!r)throw new ApiError('Registration not found.',404);return r;}
async function gateway(path:string,body?:unknown){const key=env('RAZORPAY_KEY_ID'),secret=env('RAZORPAY_KEY_SECRET');if(!key||!secret)throw new ApiError('Online payments are not configured yet. Contact the team.',503);const r=await fetch('https://api.razorpay.com/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:'Basic '+btoa(key+':'+secret),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(!r.ok)throw new ApiError('The payment provider could not complete the request. Please contact support.',502);return r.json();}
async function capture(order:string,payment:string){const stored=checked(await db.from('elan_payments').select('*').eq('order_id',order).maybeSingle());if(!stored)throw new ApiError('Order not found.',404);const p=await gateway('payments/'+encodeURIComponent(payment));if(!capturedPayment(p,stored))throw new ApiError('Payment is not captured or does not match this order.',409);const ok=checked(await db.rpc('elan_capture_payment',{p_order:order,p_payment:payment,p_amount:p.amount,p_currency:p.currency}));if(!ok)throw new ApiError('Payment requires support review.',409);return {verified:true};}
function date(v:any){if(v===''||v===null||v===undefined)return null;if(!Number.isFinite(Date.parse(v)))throw new ApiError('Invalid date.');return new Date(v).toISOString();}
async function adminSave(b:any,uid:string){const t=b.table,r=b.record||{};let record:any;let key='id';
 switch(t){
 case 'elan_editions': key='slug';record={slug:slug(r.slug),title:text(r.title,'Title',160),summary:text(r.summary||'','Summary',5000,0),starts_on:date(r.starts_on)?.slice(0,10)||null,ends_on:date(r.ends_on)?.slice(0,10)||null,venue:text(r.venue||'','Venue',200,0),status:oneOf(r.status,['archive','upcoming']),published:r.published===true};break;
 case 'elan_registration_settings': key='edition_slug';record={edition_slug:slug(r.edition_slug),registration_open:r.registration_open===true,price_paise:integer(r.price_paise,'Price',0,10000000),capacity:integer(r.capacity,'Capacity',1,100000),min_age:integer(r.min_age,'Minimum age',1,100),max_age:integer(r.max_age,'Maximum age',1,100),registration_closes_at:date(r.registration_closes_at),terms_version:text(r.terms_version||'','Terms version',100,0),terms_text:text(r.terms_text||'','Participation terms',20000,0)};if(record.registration_open){const ed=checked(await db.from('elan_editions').select('*').eq('slug',record.edition_slug).single());if(!ed.published||ed.status!=='upcoming'||!ed.starts_on||!ed.venue||!record.registration_closes_at||!record.terms_version||record.terms_text.length<20)throw new ApiError('Set dates, venue, deadline and participation terms before opening registration.');if(record.price_paise>0&&(!env('RAZORPAY_KEY_ID')||!env('RAZORPAY_KEY_SECRET')||!env('RAZORPAY_WEBHOOK_SECRET')))throw new ApiError('Configure and test payment credentials before opening paid registration.');}break;
 case 'elan_announcements':record={edition_slug:slug(r.edition_slug),title:text(r.title,'Title',160,2),body:text(r.body,'Announcement',10000,2),published:r.published===true};break;
 case 'elan_schedule':record={edition_slug:slug(r.edition_slug),title:text(r.title,'Title',160,2),starts_at:date(r.starts_at),ends_at:date(r.ends_at),location:text(r.location||'','Location',200,0),details:text(r.details||'','Details',3000,0),published:r.published===true};if(!record.starts_at)throw new ApiError('A start time is required.');break;
 case 'elan_guests':key='slug';record={slug:slug(r.slug),edition_slug:slug(r.edition_slug),name:text(r.name,'Name',150,2),role:text(r.role,'Role',120,2),position:text(r.position||'','Position',300,0),bio:text(r.bio,'Biography',12000,10),image_url:safeImage(r.image_url,url),sort_order:integer(r.sort_order||0,'Order',0,10000),published:r.published===true};break;
 case 'elan_media':record={edition_slug:slug(r.edition_slug),title:text(r.title,'Title',160),alt_text:text(r.alt_text,'Image description',400),image_url:safeImage(r.image_url,url),category:oneOf(r.category,['Venue','Crisis Command','Cent$ible','Stage','People']),credit:text(r.credit||'','Credit',300,0),sort_order:integer(r.sort_order||0,'Order',0,10000),published:r.published===true};if(!record.image_url)throw new ApiError('An image is required.');break;
 default:throw new ApiError('Unsupported content type.');
 }
 if(key==='id'&&r.id)record.id=uuid(r.id);
 const result=checked(await db.from(t).upsert(record,{onConflict:key}).select().single());await audit(uid,'save:'+t,String(result[key]));return result;
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const headers:any={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
 if(origins.includes(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'});
 const respond=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(origin&&!origins.includes(origin))return respond({error:'Origin not allowed.'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return respond({error:'Use POST.'},405);
 try{
  const raw=await req.text();if(raw.length>70000)throw new ApiError('Request too large.',413);
  if(new URL(req.url).pathname.endsWith('/webhook')){
   if(!await validSignature(raw,req.headers.get('x-razorpay-signature'),env('RAZORPAY_WEBHOOK_SECRET')))throw new ApiError('Invalid webhook signature.',401);
   const event=JSON.parse(raw);if(event.event==='payment.captured'){const p=event.payload?.payment?.entity;await capture(text(p?.order_id,'Order',100),text(p?.id,'Payment',100));}
   return respond({received:true});
  }
  const b=JSON.parse(raw),action=b.action;
  if(action==='health')return respond({ok:true,paymentsConfigured:!!(env('RAZORPAY_KEY_ID')&&env('RAZORPAY_KEY_SECRET')&&env('RAZORPAY_WEBHOOK_SECRET'))});
  if(action==='enquiry'){
   if(b.honeypot)throw new ApiError('Unable to accept this submission.');
   const name=text(b.full_name,'Name',120,2),em=email(b.email),kind=oneOf(b.kind,['contact','school','volunteer']);
   if(!b.consent)throw new ApiError('Please consent to being contacted about your enquiry.');
   const details=b.details;if(!details||Array.isArray(details)||typeof details!=='object'||JSON.stringify(details).length>12000)throw new ApiError('Invalid enquiry details.');
   await rate('enquiry:'+em,3,3600);await rate('ip:'+(req.headers.get('x-forwarded-for')||'unknown').split(',')[0],10,3600);
   if(env('TURNSTILE_SECRET_KEY')){const v=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env('TURNSTILE_SECRET_KEY'),response:String(b.captchaToken||'')})});const result=await v.json();if(!result.success)throw new ApiError('Please complete the verification.');}
   const row=checked(await db.from('elan_enquiries').insert({kind,full_name:name,email:em,details}).select('id').single());return respond(row);
  }
  const jwt=(req.headers.get('Authorization')||'').replace(/^Bearer /i,'');if(!jwt)throw new ApiError('Please sign in.',401);
  const {data:auth,error}=await db.auth.getUser(jwt);if(error||!auth.user||!auth.user.email_confirmed_at)throw new ApiError('Please sign in with a verified email address.',401);
  const uid=auth.user.id;await rate('user:'+uid,90,60);
  const role=checked(await db.from('elan_staff').select('role').eq('user_id',uid).maybeSingle())?.role;
  if(action==='me')return respond({user:{id:uid,email:auth.user.email},role:role||'participant',profile:checked(await db.from('elan_profiles').select('*').eq('user_id',uid).maybeSingle())});
  if(action==='profile')return respond(checked(await db.from('elan_profiles').upsert({user_id:uid,full_name:text(b.full_name,'Name',120,2),phone:text(b.phone||'','Phone',30,0),school:text(b.school||'','School',180,0)}).select().single()));
  if(action==='register'){
   await rate('registration:'+uid,6,3600);const rows=attendees(b.attendees);
   const {data,error}=await db.rpc('elan_create_registration',{p_user:uid,p_request:uuid(b.request_key),p_edition:slug(b.edition_slug),p_kind:oneOf(b.kind,['individual','school']),p_school:text(b.school,'School',180,2),p_name:text(b.coordinator_name,'Coordinator name',120,2),p_phone:text(b.phone,'Phone',30,6),p_attendees:rows,p_terms:text(b.terms_version,'Terms version',100),p_consent:b.consent===true});
   if(error)throw new ApiError(['Registration is closed','Not enough places remain','Participant outside edition age range','Please review the current participation terms','Edition unavailable','Invalid delegation size'].find(x=>error.message.includes(x))||'Registration could not be saved. Please check the details.',409);return respond({id:data});
  }
  if(action==='dashboard'){
   const registrations=checked(await db.from('elan_registrations').select('*,elan_attendees(*),elan_payments(*)').eq('owner_id',uid).order('created_at',{ascending:false}));
   return respond({registrations,support:checked(await db.from('elan_support').select('*').eq('user_id',uid).order('created_at',{ascending:false})),submissions:checked(await db.from('elan_submissions').select('*').eq('user_id',uid).order('created_at',{ascending:false}))});
  }
  if(action==='support'){await rate('support:'+uid,10,3600);return respond(checked(await db.from('elan_support').insert({user_id:uid,subject:text(b.subject,'Subject',160,3),message:text(b.message,'Message',5000,10)}).select('id').single()));}
  if(action==='submission-upload'){
   const r=await ownRegistration(b.registration_id,uid);if(r.status==='cancelled')throw new ApiError('Registration cancelled.');
   await rate('upload:'+uid,20,3600);const path=uid+'/'+r.id+'/'+crypto.randomUUID()+'.pdf';
   const upload=checked(await db.storage.from('elan-submissions').createSignedUploadUrl(path));return respond({path,token:upload.token});
  }
  if(action==='submission-save'){
   const r=await ownRegistration(b.registration_id,uid);const path=text(b.path,'File path',300);if(!path.startsWith(uid+'/'+r.id+'/')||!/^[-a-z0-9/]+\.pdf$/.test(path))throw new ApiError('Invalid file path.');
   const {data:files}=await db.storage.from('elan-submissions').list(uid+'/'+r.id,{search:path.split('/').pop()});if(!files?.some((f:any)=>f.name===path.split('/').pop()))throw new ApiError('Upload the file first.');
   return respond(checked(await db.from('elan_submissions').insert({user_id:uid,registration_id:r.id,title:text(b.title,'Title',160,2),object_path:path}).select('id').single()));
  }
  if(action==='submission-download'){
   let q=db.from('elan_submissions').select('*').eq('id',uuid(b.id));if(!role)q=q.eq('user_id',uid);const s=checked(await q.maybeSingle());if(!s)throw new ApiError('Submission not found.',404);return respond(checked(await db.storage.from('elan-submissions').createSignedUrl(s.object_path,120)));
  }
  if(action==='payment-order'){
   const r=await ownRegistration(b.registration_id,uid);if(r.status!=='pending'||r.amount_paise<=0)throw new ApiError('This registration does not require checkout.');
   if(!env('RAZORPAY_KEY_ID')||!env('RAZORPAY_KEY_SECRET')||!env('RAZORPAY_WEBHOOK_SECRET'))throw new ApiError('Online payments are not configured yet.',503);
   const claimed=checked(await db.rpc('elan_claim_order',{p_user:uid,p_registration:r.id}));const p=Array.isArray(claimed)?claimed[0]:claimed;
   if(p.order_id&&p.status==='created')return respond({order_id:p.order_id,amount:p.amount_paise,key:env('RAZORPAY_KEY_ID')});
   if(!checked(await db.rpc('elan_lock_order',{p_id:p.id,p_token:crypto.randomUUID()})))throw new ApiError('An order is processing or needs support review. Do not pay twice.',409);
   // Claim row before provider call; do not retry ambiguous network outcomes automatically.
   const order=await gateway('orders',{amount:r.amount_paise,currency:'INR',receipt:p.id,notes:{registration_id:r.id}});
   if(order.amount!==r.amount_paise||order.currency!=='INR')throw new ApiError('Provider order mismatch.',502);
   checked(await db.from('elan_payments').update({order_id:order.id,status:'created',updated_at:new Date().toISOString()}).eq('id',p.id));return respond({order_id:order.id,amount:r.amount_paise,key:env('RAZORPAY_KEY_ID')});
  }
  if(action==='payment-verify'){
   const r=await ownRegistration(b.registration_id,uid);const p=checked(await db.from('elan_payments').select('*').eq('registration_id',r.id).single());
   if(!await validSignature(p.order_id+'|'+b.payment_id,b.signature,env('RAZORPAY_KEY_SECRET')))throw new ApiError('Invalid payment signature.',401);
   return respond(await capture(p.order_id,text(b.payment_id,'Payment ID',100)));
  }
  if(!role)throw new ApiError('Organiser access is required.',403);
  if(action==='admin-list'){
   const allowed=['elan_registrations','elan_enquiries','elan_support','elan_submissions','elan_announcements','elan_schedule','elan_guests','elan_media','elan_editions','elan_registration_settings','elan_audit'];oneOf(b.table,allowed);
   if(b.table==='elan_audit'&&role!=='admin')throw new ApiError('Administrator access required.',403);
   const offset=integer(b.offset||0,'Offset',0,1000000);let q=db.from(b.table).select(b.table==='elan_registrations'?'*,elan_attendees(*),elan_payments(*)':'*',{count:'exact'});
   const sort=['elan_editions','elan_guests'].includes(b.table)?'slug':b.table==='elan_registration_settings'?'edition_slug':b.table==='elan_media'?'sort_order':b.table==='elan_schedule'?'starts_at':'created_at';
   const result=await q.order(sort,{ascending:false}).range(offset,offset+49);checked(result);return respond({rows:result.data,total:result.count,offset});
  }
  if(action==='check-in'){const a=checked(await db.from('elan_attendees').select('*,elan_registrations(status)').eq('id',uuid(b.id)).single());if(a.elan_registrations.status!=='confirmed')throw new ApiError('Only confirmed participants can check in.');checked(await db.from('elan_attendees').update({checked_in_at:b.checked?new Date().toISOString():null}).eq('id',a.id));await audit(uid,'check-in',a.id);return respond({ok:true});}
  if(action==='support-reply'){checked(await db.from('elan_support').update({reply:text(b.reply,'Reply',5000),status:oneOf(b.status,['answered','closed'])}).eq('id',uuid(b.id)));await audit(uid,'support-reply',b.id);return respond({ok:true});}
  if(action==='enquiry-status'){checked(await db.from('elan_enquiries').update({status:oneOf(b.status,['new','in_progress','resolved'])}).eq('id',uuid(b.id)));await audit(uid,'enquiry-status',b.id);return respond({ok:true});}
  if(role!=='admin')throw new ApiError('Administrator access is required.',403);
  if(action==='admin-save')return respond(await adminSave(b,uid));
  if(action==='allocation'){checked(await db.from('elan_attendees').update({allocation:text(b.allocation||'','Allocation',300,0)}).eq('id',uuid(b.id)));await audit(uid,'allocation',b.id);return respond({ok:true});}
  if(action==='registration-status'){
   const r=checked(await db.from('elan_registrations').select('*,elan_payments(*)').eq('id',uuid(b.id)).single());const status=oneOf(b.status,['confirmed','cancelled']);
   if(status==='confirmed'&&(r.status==='cancelled'||(r.amount_paise>0&&!r.elan_payments.some((p:any)=>p.status==='captured'))))throw new ApiError('Confirmation requires a captured payment, or a free registration. Cancelled registrations cannot be restored.');
   if(status==='cancelled'&&r.elan_payments.length)throw new ApiError('A payment order exists. Review it with the provider before cancellation.');
   checked(await db.rpc('elan_set_registration_status',{p_id:r.id,p_status:status}));await audit(uid,'registration:'+status,r.id);return respond({ok:true});
  }
  if(action==='media-upload'){
   const mime=oneOf(b.mime,['image/jpeg','image/png','image/webp']),ext=mime==='image/jpeg'?'jpg':mime.split('/')[1],path=crypto.randomUUID()+'.'+ext;
   const upload=checked(await db.storage.from('elan-public-media').createSignedUploadUrl(path));return respond({path,token:upload.token,url:url+'/storage/v1/object/public/elan-public-media/'+path});
  }
  throw new ApiError('Unknown action.',404);
 }catch(e){if(e instanceof SyntaxError)return respond({error:'Invalid JSON.'},400);if(e instanceof ApiError)return respond({error:e.message},e.status);console.error('elan-api request failed',e?.name);return respond({error:'Something went wrong. Please try again or contact the team.'},500);}
});
