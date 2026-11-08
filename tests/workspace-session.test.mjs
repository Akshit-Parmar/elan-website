import test from 'node:test';import assert from 'node:assert/strict';
import {watchWorkspace} from '../src/portal-access.js';
test('session refresh keeps the workspace; sign-out or identity switch clears it immediately',async()=>{
 const oldWindow=globalThis.window,oldLocation=globalThis.location;
 try{
 for(const event of ['SIGNED_OUT','SIGNED_IN','pageshow']){
 let callback,clears=0,reloads=0;const hooks={};globalThis.window={addEventListener:(k,f)=>hooks[k]=f};globalThis.location={reload(){reloads++;}};
 watchWorkspace({auth:{onAuthStateChange:f=>{callback=f;return {data:{subscription:{unsubscribe(){}}}};}}},{user:{id:'original'}},{replaceChildren(){clears++;}});
 callback('TOKEN_REFRESHED',{user:{id:'original'}});assert.equal(clears,0);
 if(event==='pageshow')hooks.pageshow({persisted:true});else callback(event,event==='SIGNED_OUT'?null:{user:{id:'different'}});
 assert.equal(clears,1);await new Promise(r=>setTimeout(r,5));assert.equal(reloads,1);
 }
 }finally{globalThis.window=oldWindow;globalThis.location=oldLocation;}
});
