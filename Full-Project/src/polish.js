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
