import test from 'node:test';
import assert from 'node:assert/strict';
import {dueLabel} from '../src/workspace-summary.js';
test('deadline labels distinguish completed, overdue, today and unscheduled work',()=>{
assert.equal(dueLabel({status:'Open',due_on:'2026-11-04'},'2026-11-05'),'Overdue · 2026-11-04');
assert.equal(dueLabel({status:'Done',due_on:'2026-11-04'},'2026-11-05'),'Completed · deadline 2026-11-04');
assert.equal(dueLabel({status:'Open',due_on:'2026-11-05'},'2026-11-05'),'Due today · 2026-11-05');
assert.equal(dueLabel({status:'Open'},'2026-11-05'),'No deadline set');
});
