import {safeMediaURL} from './media-rules.js';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
export function winnerCard(row,base){
 const card=el('article',null,'winner-card');
 if(safeMediaURL(row.image_url,base)){const img=el('img');img.src=row.image_url;img.alt=row.members?row.name+' team':row.name;img.loading='lazy';img.width=720;img.height=900;card.append(img);}else card.classList.add('without-photo');
 const body=el('div',null,'winner-copy');body.append(el('p',row.award,'winner-award'),el('h3',row.name));
 if(row.members)body.append(el('p',row.members,'winner-members'));
 if(row.school)body.append(el('p',row.school,'winner-school'));
 if(row.introduction)body.append(el('p',row.introduction,'winner-intro'));
 if(row.reflection){body.append(el('p','IN THEIR WORDS','winner-label'),el('blockquote',row.reflection));}
 card.append(body);return card;
}
export async function loadWinners(){const host=document.querySelector('[data-winners]');if(!host)return;
 try{const c=await fetch('/assets/public-config.json').then(r=>r.json());let rows=[];
 for(let offset=0;;offset+=100){const r=await fetch(c.supabaseUrl+'/rest/v1/elan_winners?select=competition,award,name,members,school,introduction,reflection,image_url&edition_slug=eq.2026&published=eq.true&approved=eq.true&order=sort_order.asc,id.asc&limit=100&offset='+offset,{headers:{apikey:c.publishableKey},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Unavailable');const part=await r.json();rows.push(...part);if(part.length<100)break;}
 host.replaceChildren();if(!rows.length){host.append(el('p','The 2026 winners and their memories will appear here as their profiles are added.','winners-empty'));return;}
 for(const competition of ['Crisis Command','Cent$ible','Other honours']){const members=rows.filter(r=>r.competition===competition);if(!members.length)continue;const section=el('section',null,'winner-section');section.append(el('p','ÉLAN 2026','winner-label'),el('h2',competition));members.forEach(row=>section.append(winnerCard(row,c.supabaseUrl)));host.append(section);}
 }catch{host.replaceChildren(el('p','The winners could not be loaded. Please refresh the page to try again.','winners-empty'));}}
if(typeof document!=='undefined')loadWinners();
