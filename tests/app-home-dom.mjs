import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('../src/app-home.html',import.meta.url),'utf8');
const code=readFileSync(new URL('../src/app-home.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const portals={admin:{title:'Admin',url:'/admin.html'},organiser:{title:'Organiser',url:'/organisers'},applicant:{title:'Applicant',url:'/application-status.html'},participant:{title:'Participant',url:'/portal/index.html'}};
for(const role of Object.keys(portals)){
 const dom=new JSDOM(html,{url:'https://elansummit.com/app.html'}),session={user:{email:'test@example.test'}};
 const sb={auth:{getSession:async()=>({data:{session}})}};
 await new AsyncFunction('document','window','location','fetch','createClient','getPortal','portals',code)(dom.window.document,dom.window,{},async()=>({ok:true,json:async()=>({})}),()=>sb,async()=>role,portals);
 assert.equal(dom.window.document.querySelector('#open-workspace').getAttribute('href'),portals[role].url);assert.equal(dom.window.document.querySelector('#sign-in').hidden,true);dom.window.close();
}
{
 const dom=new JSDOM(html,{url:'https://elansummit.com/app.html'}),sb={auth:{getSession:async()=>({data:{session:{user:{email:'test@example.test'}}}})}};
 await new AsyncFunction('document','window','location','fetch','createClient','getPortal','portals',code)(dom.window.document,dom.window,{},async()=>({ok:true,json:async()=>({})}),()=>sb,async()=>{throw Error('Could not verify access');},portals);
 assert.equal(dom.window.document.querySelector('#open-workspace').hidden,true);assert.equal(dom.window.document.querySelector('#home-signout').hidden,false);assert.match(dom.window.document.querySelector('#signin-status').textContent,/Could not verify/);dom.window.close();
}
console.log('PASS: app home routes all four roles using server result; failed role verification does not grant access and permits signout.');
