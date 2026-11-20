import test from 'node:test';import assert from 'node:assert/strict';
import {dispatchWorkMail,workMailContent} from '../supabase/functions/elan-api/work-mail.mjs';
import {interviewCalendar} from '../src/work-calendar.js';
const row={recipient:'u',email:'test@example.invalid',portal:'/organisers',events:[{id:'e1',title:'Task: <script>unsafe</script>'}]};
function db(current=true){const states=[];return {states,rpc:async(name,args)=>name==='elan_claim_work_mail'?{data:[row]}:name==='elan_work_mail_current'?{data:current}:(states.push(args.p_status),{data:null})};}
const env=k=>k==='GMAIL_APP_PASSWORD'?'test-not-real':'';
test('notification content escapes titles and only links to an allowed portal',()=>{assert(!workMailContent(row).html.includes('<script>'));assert.throws(()=>workMailContent({...row,portal:'https://bad.invalid'}));});
test('accepted mail records sent once with stable compact message id',async()=>{const d=db();let id;const r=await dispatchWorkMail(d,env,null,async x=>(id=x.id,{accepted:[row.email]}));assert.equal(r.sent,1);assert.deepEqual(d.states,['sent']);assert.equal(id.length,74);});
test('revoked permission cancels without calling sender',async()=>{const d=db(false);await dispatchWorkMail(d,env,null,()=>{throw Error('Must not send')});assert.deepEqual(d.states,['cancelled']);});
test('timeout is uncertain and explicit rejection is retryable',async()=>{for(const [error,state] of [[new Error('timeout'),'uncertain'],[Object.assign(new Error('reject'),{responseCode:550}),'failed']]){const d=db();await dispatchWorkMail(d,env,null,async()=>{throw error});assert.deepEqual(d.states,[state]);}});
test('calendar duration and escaped text prevent injected event fields',()=>{const c=interviewCalendar({id:'abc',interview_at:'2030-01-01T10:00:00Z',duration_minutes:45,instructions:'Meet\nATTENDEE:bad;name'});assert(c.includes('DTEND:20300101T104500Z'));assert(!c.includes('\r\nATTENDEE'));assert(c.includes('Meet\\nATTENDEE:bad\\;name'));});
