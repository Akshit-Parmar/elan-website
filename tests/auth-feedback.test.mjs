import test from 'node:test';import assert from 'node:assert/strict';
import {authDestination,followVerifiedSignIn} from '../src/auth-feedback.js';
import {sendAcknowledgement,emailConfigured} from '../supabase/functions/elan-api/acknowledgement.mjs';
test('destinations preserve the intended workspace and reject external URLs',()=>{
 assert.equal(authDestination('?next=application'),'/application-status.html');assert.equal(authDestination('?next=admin'),'/admin.html');assert.equal(authDestination('?next=organisers'),'/organisers');assert.equal(authDestination('?next=https://evil.example'),'/portal/index.html');
});
test('only verified sign-in navigates and cleanup stops later events',async()=>{
 let callback,unsubscribed=false,n=0;const auth={onAuthStateChange:fn=>{callback=fn;return{data:{subscription:{unsubscribe:()=>unsubscribed=true}}};}};
 const stop=followVerifiedSignIn(auth,()=>n++);
 callback('SIGNED_OUT',null);callback('SIGNED_IN',{user:{}});await new Promise(r=>setTimeout(r,5));assert.equal(n,0);
 callback('SIGNED_IN',{user:{email_confirmed_at:'now'}});callback('SIGNED_IN',{user:{email_confirmed_at:'now'}});await new Promise(r=>setTimeout(r,5));assert.equal(n,1);stop();assert.equal(unsubscribed,true);
});
function fixture(){const updates=[];return {updates,db:{from:table=>({
 update:value=>{updates.push(value);return{eq:()=>({in:()=>({select:()=>({maybeSingle:async()=>({data:{enquiry_id:'id'}})})})})};},
 select:()=>({eq:()=>({single:async()=>({data:{id:'id',full_name:'Example',email:'sample@example.com',details:{application_version:2}}})})})
 })}};}
const env=k=>k==='GMAIL_APP_PASSWORD'?'test-secret':'';
test('Gmail acknowledgement uses server configuration and accepts only a confirmed SMTP recipient',async()=>{
 assert.ok(emailConfigured(env));const {db,updates}=fixture();let sent;
 const state=await sendAcknowledgement(db,'id',env,()=>{throw Error('HTTP provider must not run');},async message=>{sent=message;return{accepted:['sample@example.com'],messageId:'mail-id'};});
 assert.equal(state,'sent');assert.equal(sent.to,'sample@example.com');assert.match(sent.text,/application-status/);assert.equal(updates.at(-1).provider_id,'mail-id');
});
test('SMTP rejection is retryable but ambiguous failure is not blindly resent',async()=>{
 for(const [error,expected] of [[Object.assign(new Error('rejected'),{responseCode:535}),'failed'],[new Error('timeout'),'sending']]){
  const {db}=fixture();assert.equal(await sendAcknowledgement(db,'id',env,null,async()=>{throw error;}),expected);
 }
});
test('SMTP response without an accepted recipient never marks sent',async()=>{
 const {db}=fixture();assert.equal(await sendAcknowledgement(db,'id',env,null,async()=>({accepted:[],rejected:['sample@example.com']})),'failed');
});
