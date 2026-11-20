import test from 'node:test';
import assert from 'node:assert/strict';
import {interviewClashes} from '../src/workspace-summary.js';
test('only future published interviews with identical start times are flagged',()=>{
 const now=Date.parse('2026-11-20T00:00:00Z');
 const row=(id,time,more={})=>({enquiry_id:id,stage:'interview',interview_published:true,interview_at:time,...more});
 const rows=[row('a','2026-11-21T10:00:00Z'),row('b','2026-11-21T15:30:00+05:30'),row('c','2026-11-21T10:15:00Z'),row('d','2026-11-21T10:00:00Z',{interview_published:false}),row('e','2026-11-21T10:00:00Z',{stage:'under_review'}),row('f','invalid'),row('g','2026-11-19T10:00:00Z')];
 assert.deepEqual([...interviewClashes(rows,now)],['a','b']);
});
