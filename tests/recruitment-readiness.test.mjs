import test from 'node:test';
import {JSDOM} from 'jsdom';
import assert from 'node:assert/strict';
import {attention,onboardingView} from '../src/recruitment-readiness.js';
test('attention queues distinguish unanswered, reschedule and past interviews',()=>{
 const now=Date.parse('2026-11-16T10:00:00Z'),r={stage:'interview',interview_published:true,interview_at:'2026-11-17T10:00:00Z'};
 assert.equal(attention({},false,now).review,true);
 assert.equal(attention({...r,interview_reply:''},false,now).unanswered,true);
 assert.equal(attention({...r,interview_reply:'confirmed'},false,now).unanswered,false);
 assert.equal(attention({...r,interview_reply:'reschedule'},false,now).reschedule,true);
 assert.equal(attention({...r,stage:'selected'},false,now).interviews,false);
 assert.equal(attention({...r,interview_at:'2026-11-15T10:00:00Z'},false,now).interviews,false);
 assert.equal(attention(r,true,now).email,true);
});
test('onboarding escapes personal instructions and handles unpublished briefs',async()=>{
 const dom=new JSDOM('<main></main>');globalThis.document=dom.window.document;const host=document.querySelector('main');await onboardingView(host,{auth:{getUser:async()=>({error:true})},rpc:async()=>({data:[{reporting_person:'<img src=x>',responsibilities:'Plan posts',first_tasks:'Prepare drafts',documents:''}]})});assert.match(host.innerHTML,/&lt;img/);assert.doesNotMatch(host.innerHTML,/<img/);assert.match(host.innerHTML,/Plan posts/);
 await onboardingView(host,{auth:{getUser:async()=>({error:true})},rpc:async()=>({data:[]})});assert.match(host.innerHTML,/has not been published/);
 await onboardingView(host,{auth:{getUser:async()=>({error:true})},rpc:async()=>({error:true})});assert.match(host.innerHTML,/could not load/);
});
