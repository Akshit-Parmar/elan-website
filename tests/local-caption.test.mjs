import test from 'node:test';import assert from 'node:assert/strict';
import {copyFromCaption,localCaption} from '../src/local-caption.js';
test('local text stays grounded in model output and fits both fields',()=>{assert.deepEqual(copyFromCaption('  people   at a table '),{caption:'People at a table.',description:'People at a table.'});const r=copyFromCaption('a person '.repeat(35));assert.ok(r.caption.length<=160);assert.ok(r.description.length<=400);assert.throws(()=>copyFromCaption(''));});
test('cancelled requests do not create a worker',async()=>{const c=new AbortController();c.abort();await assert.rejects(localCaption('data:image/jpeg;base64,x',c.signal),{name:'AbortError'});});
