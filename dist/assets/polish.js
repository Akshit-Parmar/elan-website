// Progressive enhancement only: pages and links remain usable without JavaScript.
(()=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const photos=[...document.querySelectorAll('.visitor-hero img,.home-contact-sheet img')];
 const active=new Set();let pending=false;
 const draw=()=>{pending=false;for(const photo of active){const r=photo.getBoundingClientRect();const progress=Math.max(-1,Math.min(1,(r.top+r.height/2-innerHeight/2)/innerHeight));photo.style.setProperty('--depth-shift',reduced.matches||innerWidth<681?'0px':`${progress*-8}px`);}};
 const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(draw);}};
 if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting)active.add(entry.target);else active.delete(entry.target);}schedule();},{rootMargin:'60px'});
  photos.forEach(photo=>{photo.classList.add('photo-depth');observer.observe(photo);});
  const entrance=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){if(!reduced.matches)entry.target.classList.add('polish-enter');entrance.unobserve(entry.target);}},{threshold:.12});
  document.querySelectorAll('.visitor-ledger article,.participation-ledger>a,.app-heading,.judges-heading,.home-people-note').forEach(el=>entrance.observe(el));
 }
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);reduced.addEventListener('change',schedule);
})();

// The documentary photographs respond to scroll without hiding any content.
(()=>{
 const media=matchMedia('(prefers-reduced-motion: reduce)');
 const targets=[...document.querySelectorAll('.lived-photo,.origin-portrait')];
 if(!targets.length||!('IntersectionObserver' in window))return;
 const visible=new Set();let frame=0;
 const draw=()=>{frame=0;const still=media.matches||innerWidth<=800||document.body.classList.contains('motion-paused');for(const el of visible){const r=el.getBoundingClientRect();const p=Math.max(-1,Math.min(1,(r.top+r.height/2-innerHeight/2)/innerHeight));el.style.setProperty('--image-turn',still?'0deg':`${p*3}deg`);el.style.setProperty('--image-rise',still?'0px':`${p*-14}px`);}};
 const queue=()=>{if(!frame)frame=requestAnimationFrame(draw);};
 const observer=new IntersectionObserver(entries=>{for(const e of entries)e.isIntersecting?visible.add(e.target):visible.delete(e.target);queue();},{rootMargin:'100px'});
 targets.forEach(el=>observer.observe(el));addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue);media.addEventListener('change',queue);document.querySelector('.motion-toggle')?.addEventListener('click',queue);
})();

// Keep sticky offsets and story sections in sync with text zoom and font loading.
(()=>{
 const header=document.querySelector('.ed-header');
 const frames=[...document.querySelectorAll('.act-frame')];
 if(!('ResizeObserver' in window))return;
 const observer=new ResizeObserver(entries=>{for(const e of entries){const height=Math.ceil(e.target.getBoundingClientRect().height);if(e.target===header)document.documentElement.style.setProperty('--header-height',`${height}px`);else e.target.closest('.journey-act')?.style.setProperty('--frame-height',`${height}px`);}});
 if(header)observer.observe(header);frames.forEach(frame=>observer.observe(frame));
})();
