import {galleryGroups} from './gallery-groups.js';
import {focalPosition} from './photo-settings.js';
const galleryState=new WeakMap();
export function galleryExperience(grid,dialog,settings=new Map()){
 galleryState.set(grid,settings);
 let covers=document.querySelector('.gallery-albums');if(!covers){covers=document.createElement('section');covers.className='gallery-albums';covers.setAttribute('aria-label','Browse event photo groups');document.querySelector('.gallery-toolbar').before(covers);}
 covers.replaceChildren();
 for(const group of galleryGroups){const cards=[...grid.querySelectorAll('.photo-card')].filter(c=>c.dataset.photoCategory===group),cover=cards.find(c=>settings.get(c.querySelector('img')?.dataset.photoSlot)?.is_cover)||cards[0];const b=document.createElement('button');b.type='button';b.className='gallery-album';
 if(cover){const img=cover.querySelector('img').cloneNode();img.alt='';img.removeAttribute('data-photo-slot');img.style.objectPosition=focalPosition(settings.get(cover.querySelector('img').dataset.photoSlot));b.append(img);}else{const blank=document.createElement('span');blank.className='album-placeholder';blank.textContent='É';blank.setAttribute('aria-hidden','true');b.append(blank);}
 const title=document.createElement('strong');title.textContent=group;const count=document.createElement('span');count.textContent=cards.length?`${cards.length} photo${cards.length===1?'':'s'} · View collection ↗`:'Photos coming soon';b.append(title,count);b.onclick=()=>{[...document.querySelectorAll('[data-photo-filter]')].find(x=>x.dataset.photoFilter===group)?.click();document.querySelector('.gallery-toolbar').scrollIntoView({behavior:'auto',block:'start'});};covers.append(b);}
 for(const img of grid.querySelectorAll('img'))img.style.objectPosition=focalPosition(settings.get(img.dataset.photoSlot));
 if(dialog.dataset.galleryReady)return;dialog.dataset.galleryReady='true';new MutationObserver(()=>galleryExperience(grid,dialog,galleryState.get(grid))).observe(grid,{subtree:true,attributes:true,attributeFilter:['src']});dialog.classList.add('gallery-viewer');
 const nav=document.createElement('div');nav.className='viewer-nav';nav.innerHTML='<button type="button" aria-label="Previous photograph">←</button><span aria-live="polite"></span><button type="button" aria-label="Next photograph">→</button>';dialog.append(nav);
 let active=0,photos=[],trigger=null,start=null;
 const show=()=>{const card=photos[active];if(!card)return;const img=card.querySelector('img');dialog.querySelector('img').src=img.src;dialog.querySelector('img').alt=img.alt;dialog.querySelector('p').textContent=card.querySelector('.photo-credit')?.textContent||'';dialog.querySelector('p').hidden=!dialog.querySelector('p').textContent;nav.querySelector('span').textContent=`${active+1} / ${photos.length}`;nav.querySelectorAll('button').forEach(b=>b.disabled=photos.length<2);};
 const step=n=>{if(photos.length){active=(active+n+photos.length)%photos.length;show();}};
 grid.addEventListener('click',e=>{const button=e.target.closest('.photo-open');if(!button)return;trigger=button;photos=[...grid.querySelectorAll('.photo-card')].filter(c=>!c.hidden);active=photos.indexOf(button.closest('.photo-card'));show();dialog.showModal();});
 nav.firstElementChild.onclick=()=>step(-1);nav.lastElementChild.onclick=()=>step(1);
 dialog.querySelector('.photo-close').onclick=()=>dialog.close();dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();step(-1);}if(e.key==='ArrowRight'){e.preventDefault();step(1);}});
 dialog.addEventListener('touchstart',e=>{start={x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY};},{passive:true});dialog.addEventListener('touchend',e=>{if(!start)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)step(dx<0?1:-1);start=null;},{passive:true});
 dialog.addEventListener('close',()=>trigger?.focus());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
}
