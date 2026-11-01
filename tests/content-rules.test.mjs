import test from 'node:test';import assert from 'node:assert/strict';
import {safeContentLink,validContentText} from '../src/content-rules.js';
test('CMS rejects executable, protocol-relative and control-character links',()=>{
 for(const bad of ['javascript:alert(1)','data:text/html,hi','//evil.example','/\\evil.example','https://example.com\n','http://example.com',''])assert.equal(safeContentLink(bad),false,bad);
 for(const good of ['/','/contact.html#enquire','#opening','https://elansummit.com','mailto:the.elan.summit@gmail.com','tel:+918160215010'])assert.equal(safeContentLink(good),true,good);
});
test('CMS text bounds reject blanks and oversized content',()=>{assert.equal(validContentText('   '),false);assert.equal(validContentText('x'.repeat(6001)),false);assert.equal(validContentText('Élan Summit'),true)});
