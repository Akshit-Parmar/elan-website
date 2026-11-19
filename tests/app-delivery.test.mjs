import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {localPath,opensInBrowser} from '../mobile/navigation.mjs';
test('native routing resolves clean URLs without allowing unrelated origins',()=>{
 assert.equal(localPath('/organisers','https://elansummit.com'),'/organisers.html');
 assert.equal(localPath('/portal/','https://elansummit.com'),'/portal/index.html');
 assert.equal(localPath('/application-status.html?view=interview','https://elansummit.com'),'/application-status.html?view=interview');
 assert.equal(localPath('https://elansummit.com.evil.test/admin','https://elansummit.com'),null);
 assert.equal(localPath('javascript:alert(1)','https://elansummit.com'),null);
 assert.equal(localPath('http://elansummit.com/admin','https://elansummit.com'),null);
 assert.ok(opensInBrowser('/join-oc-2027.html'));assert.ok(opensInBrowser('/portal/login.html'));
 assert.equal(opensInBrowser('/organisers.html'),false);
});
test('offline worker only precaches generic page; authenticated/API responses never cached',async()=>{
 const handlers={},added=[],deleted=[];let networkDown=false,cacheWrites=0;
 const caches={open:async()=>({add:async p=>added.push(p),put:()=>cacheWrites++}),keys:async()=>['elan-offline-old','unrelated-cache'],delete:async k=>deleted.push(k),match:async()=>new Response('generic offline')};
 const self={location:{origin:'https://elansummit.com'},addEventListener:(n,f)=>handlers[n]=f,clients:{claim:async()=>{}}};
 vm.runInNewContext(readFileSync(new URL('../src/service-worker.js',import.meta.url),'utf8'),{self,caches,URL,Response,fetch:async()=>{if(networkDown)throw Error('offline');return new Response('private data');}});
 await new Promise((resolve,reject)=>handlers.install({waitUntil:p=>p.then(resolve,reject)}));assert.deepEqual(added,['/offline.html']);
 await new Promise((resolve,reject)=>handlers.activate({waitUntil:p=>p.then(resolve,reject)}));assert.deepEqual(deleted,['elan-offline-old']);
 for(const request of [{method:'POST',mode:'navigate',url:'https://elansummit.com/admin.html'},{method:'GET',mode:'cors',url:'https://db.supabase.co/rest/v1/elan_enquiries'},{method:'GET',mode:'cors',url:'https://elansummit.com/assets/public-config.json'}])handlers.fetch({request,respondWith:()=>assert.fail('must not intercept data')});
 let result;const event={request:{method:'GET',mode:'navigate',url:'https://elansummit.com/admin.html'},respondWith:p=>result=p};
 handlers.fetch(event);assert.equal(await (await result).text(),'private data');networkDown=true;handlers.fetch(event);assert.equal(await (await result).text(),'generic offline');assert.equal(cacheWrites,0);
});
test('PWA starts at app hub and has actual icons; native ships bundled code, no remote server',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../dist/site.webmanifest',import.meta.url)));assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'/app.html');assert.equal(manifest.scope,'/');for(const icon of manifest.icons)assert.ok(readFileSync(new URL('../dist'+icon.src,import.meta.url)).length);
 const config=JSON.parse(readFileSync(new URL('../capacitor.config.json',import.meta.url)));assert.equal(config.server.url,undefined);assert.equal(config.server.hostname,'elansummit.com');assert.equal(config.android.allowMixedContent,false);
});
