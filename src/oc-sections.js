import {esc} from './organiser-utils.js';
import {safeMediaURL} from './media-rules.js';
export const groups=['Director','Assistant Director','Chief Advisor','Heads of All Departments','Finance','Social Media','Cent$ible','Design','Sponsorship','Outreach','Documentation','Campus Ambassadors','Logistics'];
const intros=['','','','Two heads coordinated the work across departments.','The team behind the summit accounts.','The people who brought Élan to students’ feeds.','The team behind the first edition’s business challenge.','Meet the people behind the look of Élan.','The team that worked with event partners.','The people who connected with schools and delegates.','The team that kept a record of the summit.','The students who represented Élan on campus.','The team behind the practical details on event days.'];
const norm=s=>String(s||'').toLowerCase().replace(/\$/g,'s').replace(/[^a-z0-9]/g,'').replace(/team$/,'');
export function section(p){const d=norm(p.department),r=norm(p.role);if(/alldepartment/.test(r+d))return groups[3];if(['director','assistantdirector','chiefadvisor','chiefadviser'].includes(r))return r==='director'?groups[0]:r==='assistantdirector'?groups[1]:groups[2];if(d.startsWith('campusambassador'))return groups[11];return groups.find(x=>norm(x)===d)||p.department;}
const archiveNotes={
 'akshit parmar':'A conversation with Jacinth on the walk back from lunch was the start of Élan. Akshit built that idea into the summit’s first edition alongside Sakshi, Prachi and Jacinth.',
 'sakshi baldawa':'Sakshi helped found Élan. She is drawn to finance, business and economics, and outside the committee room she finds another outlet for her creativity in dance.',
 'prachi belagali':'A co-founder of Élan, Prachi brought her interest in law, history and the way people think to the first edition. Some of her favourite moments were the conversations that continued after the sessions ended.'
};
export function renderBook(host,rows,base){
 host.replaceChildren();
 const names=[...new Set([...groups,...rows.map(section)])];
 for(const g of names){
 const list=rows.filter(x=>section(x)===g),n=groups.indexOf(g),solo=n>=0&&n<3;
 if(!list.length)continue;
 const el=document.createElement('section');
 el.className='oc-folio '+(solo?'oc-leader':'oc-team')+(n===0?' oc-opening':'');
 el.innerHTML=(solo?'':'<header class="oc-team-head"><h2>'+esc(g)+'</h2>'+(intros[n]?'<p>'+esc(intros[n])+'</p>':'')+'</header>')+'<div class="oc-slide" aria-live="polite"></div><div class="oc-pager"></div>';
 host.append(el);
 const slide=el.querySelector('.oc-slide'),nav=el.querySelector('.oc-pager');let i=0;
 function paint(){
 const p=list[i],photo=safeMediaURL(p.portrait,base),bio=p.bio?.trim()||archiveNotes[p.name.trim().toLowerCase()]||'';
 const label=solo?g:(norm(p.role)===norm(g)||n===3&&section(p)===g&&/alldepartment/.test(norm(p.role))?'':p.role);
 const heading=solo?'h2':'h3';
 slide.className='oc-slide'+(photo?'':' oc-no-portrait');
 slide.innerHTML=(photo?'<img loading="lazy" src="'+esc(p.portrait)+'" alt="'+esc(p.name)+'">':'')+
 '<div class="oc-signature">'+(label?'<small>'+esc(label)+'</small>':'')+'<'+heading+'>'+esc(p.name)+'</'+heading+'>'+(bio?'<p>'+esc(bio)+'</p>':'')+'</div>';
 if(nav.firstChild)nav.querySelector('output').textContent=(i+1)+' / '+list.length;
 }
if(list.length>1){nav.innerHTML='<button aria-label="Previous member">←</button><output></output><button aria-label="Next member">→</button>';const move=k=>{i=(i+k+list.length)%list.length;paint()};nav.firstChild.onclick=()=>move(-1);nav.lastChild.onclick=()=>move(1);let start;slide.ontouchstart=e=>{start=e.touches.length===1?e.touches[0]:null};slide.ontouchend=e=>{if(!start)return;const t=e.changedTouches[0],dx=t.clientX-start.clientX;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(t.clientY-start.clientY)*1.5)move(dx<0?1:-1);start=null};}paint();}if(!host.children.length)host.textContent='Member profiles will appear here as they are published.';}
