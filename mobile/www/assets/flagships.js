(()=>{
 const root=document.querySelector('.flagship-editorial');if(!root)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),art=root.querySelector('.flagship-art'),links=[...root.querySelectorAll('.flagship-subnav a')];let queued=false;
 function draw(){queued=false;const r=art.getBoundingClientRect(),p=Math.max(-1,Math.min(1,(innerHeight*.4-r.top)/innerHeight));art.style.setProperty('--art-turn',reduced.matches?'0deg':(p*7)+'deg');art.style.setProperty('--art-rise',reduced.matches?'0px':(-p*22)+'px');let active=links[0];for(const a of links){const section=document.querySelector(a.hash);if(section&&section.getBoundingClientRect().top<innerHeight*.4)active=a}links.forEach(a=>a===active?a.setAttribute('aria-current','location'):a.removeAttribute('aria-current'))}
 addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(draw)}},{passive:true});addEventListener('resize',draw);reduced.addEventListener('change',draw);draw();
})();
// Keep the briefing document in step with the visible phase; no scroll interception.
(()=>{
 const root=document.querySelector('.crisis-briefing');if(!root)return;
 const stage=root.querySelector('.flow-stage'),cards=[...root.querySelectorAll('[data-dispatch]')],nav=[...root.querySelectorAll('.dispatch-nav a')];
 const titles=['Read the room.','The facts have changed.','Stand behind your choices.'],stamps=['BRIEF RECEIVED','NEW INTELLIGENCE','FINAL RESPONSE'];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let queued=false,last=-1;
 function update(){queued=false;let index=0;for(const [i,card]of cards.entries()){if(card.getBoundingClientRect().top<innerHeight*.6)index=i}if(index===last)return;last=index;stage.querySelector('.dispatch-number').textContent=String(index+1).padStart(2,'0');stage.querySelector('.dispatch-title').textContent=titles[index];stage.querySelector('.dispatch-stamp').textContent=stamps[index];stage.style.setProperty('--dispatch-progress',(index+1)/3);stage.style.setProperty('--dispatch-turn',reduced.matches?'0deg':[-8,7,-3][index]+'deg');nav.forEach((a,i)=>i===index?a.setAttribute('aria-current','step'):a.removeAttribute('aria-current'));}
 addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(update)}},{passive:true});addEventListener('resize',update);reduced.addEventListener('change',()=>{last=-1;update()});update();
})();
