import test from 'node:test';import assert from 'node:assert/strict';import {sendMailAlerts} from '../supabase/functions/elan-api/mail-alerts.mjs';
const env=k=>k==='GMAIL_APP_PASSWORD'?'test':'';
const db={rpc:async()=>({data:[{id:'admin',email:'admin@example.invalid',count:2,day:'2026-11-17'}]})};
test('daily alert contains no applicant details and uses admin recipient',async()=>{let sent;assert.deepEqual(await sendMailAlerts(db,env,null,async args=>{sent=args;return {accepted:[args.to]}}),{sent:1,failed:0});assert.equal(sent.to,'admin@example.invalid');assert.match(sent.text,/2 applicant email records/);assert.match(sent.text,/uncertain/);});
test('alert errors do not falsely report success or retry during same claim',async()=>{let n=0;assert.deepEqual(await sendMailAlerts(db,env,null,async()=>{n++;throw Error('timeout')}),{sent:0,failed:1});assert.equal(n,1);});
test('unconfigured sender does not consume daily alert claim',async()=>{let n=0;await sendMailAlerts({rpc:async()=>{n++}},()=> '');assert.equal(n,0);});
