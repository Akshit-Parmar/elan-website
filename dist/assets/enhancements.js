import {galleryExperience} from './gallery-experience.js';
import {fetchPhotoSettings,orderGallery} from './photo-settings.js';
import {galleryGroups} from './gallery-groups.js';
import {galleryTemplate} from './content-templates.js';
(()=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),path=location.pathname;
 if(!document.querySelector('#elan-world')){
  const hero=document.querySelector('.page-hero');
  const legal=/\/(terms|privacy|refund|code-of-conduct)\.html$/.test(path),symbol=/centsible/.test(path)?'$':/flagship/.test(path)?'Ⅰ':/schedule/.test(path)?'Ⅱ':'É';
  document.body.dataset.design=/centsible/.test(path)?'enterprise':/(volunteers|school|contact)/.test(path)?'people':'general';
  if(hero&&!legal){hero.classList.add('has-sculpture');const art=document.createElement('div');art.className='page-sculpture';art.setAttribute('aria-hidden','true');for(let i=0;i<6;i++){const face=document.createElement('i');face.style.setProperty('--depth',i);art.append(face)}const label=document.createElement('span');label.textContent=symbol;art.append(label);hero.append(art);}
  const bar=document.createElement('div');bar.className='page-read-progress';bar.setAttribute('aria-hidden','true');document.body.append(bar);
  let queued=false;function draw(){queued=false;bar.style.setProperty('--read-progress',Math.max(0,Math.min(1,scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight))));if(hero&&!reduced.matches){const p=Math.max(-1,Math.min(1,hero.getBoundingClientRect().top/innerHeight));hero.style.setProperty('--hero-y',(-14+p*12)+'deg');hero.style.setProperty('--hero-x',(5+p*5)+'deg')}}
  window.addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(draw)}},{passive:true});draw();
  if(!reduced.matches){const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}}),{threshold:.08});document.querySelectorAll('main .section-head,main .info-grid,main .feature-grid,main .status-panel,main .directory-grid,main .section-photo,main .gallery-toolbar').forEach(el=>{if(el.getBoundingClientRect().top>innerHeight){el.classList.add('motion-reveal');io.observe(el)}});}
 }
 const grid=document.querySelector('#photo-grid'),dialog=document.querySelector('.photo-dialog');let selected='All';
 function filter(){if(!grid)return;let visible=0;grid.querySelectorAll('.photo-card').forEach(card=>{card.hidden=selected!=='All'&&selected!==card.dataset.photoCategory;if(!card.hidden)visible++});const empty=document.querySelector('.gallery-empty');empty.hidden=visible>0;empty.textContent=selected==='All'?'Photos will be added soon.':'Photos from '+selected+' will be added soon.';}
 function syncFilters(){if(!grid)return;const toolbar=document.querySelector('.photo-filters');const categories=['All',...new Set([...galleryGroups,...[...grid.querySelectorAll('.photo-card')].map(card=>card.dataset.photoCategory)])];if(!categories.includes(selected))selected='All';toolbar.replaceChildren(...categories.map(category=>{const b=document.createElement('button');b.type='button';b.dataset.photoFilter=category;b.textContent=category;b.setAttribute('aria-pressed',String(category===selected));b.addEventListener('click',()=>{selected=category;toolbar.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));filter()});return b}));}
 syncFilters();
 if(grid&&dialog)galleryExperience(grid,dialog);
 async function hydrate(){if(!grid&&!document.querySelector('.edition-note'))return;
  try{const config=await fetch('/assets/public-config.json').then(r=>{if(!r.ok)throw Error('config');return r.json()});const request=async route=>{const r=await fetch(config.supabaseUrl+'/rest/v1/'+route,{headers:{apikey:config.publishableKey},signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('content');return r.json()};
   if(grid){let rows=[],offset=0;while(true){const batch=await request('elan_media?select=id,title,alt_text,image_url,category,credit,edition_slug&published=eq.true&edition_slug=eq.2026&and=(credit.not.like.site-image:*,credit.not.like.site-slot:*)&order=sort_order.asc,id.asc&limit=200&offset='+offset);rows.push(...batch);if(batch.length<200)break;offset+=200;}const settings=await fetchPhotoSettings(config).catch(()=>new Map());const cards=orderGallery(rows,settings).map(row=>galleryTemplate(row,config.supabaseUrl)).filter(Boolean);grid.replaceChildren(...cards);grid.dataset.source='supabase';syncFilters();filter();galleryExperience(grid,dialog,settings);}

   const note=document.querySelector('.edition-note');if(note){const rows=await request('elan_editions?slug=eq.next&select=summary&limit=1');if(rows[0]?.summary&&!note.dataset.cmsApplied&&!note.dataset.editorLocked)note.textContent=rows[0].summary;note.dataset.source='supabase';}
  }catch{if(grid){grid.dataset.source='local-fallback';document.querySelector('.gallery-state').textContent='Showing the saved collection. New photographs could not be loaded right now.';}}
 }
 hydrate();
})();
