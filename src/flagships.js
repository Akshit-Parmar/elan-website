(()=>{
 const root=document.querySelector('.flagship-editorial');if(!root)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),art=root.querySelector('.flagship-art'),links=[...root.querySelectorAll('.flagship-subnav a')];let queued=false;
 function draw(){queued=false;const r=art.getBoundingClientRect(),p=Math.max(-1,Math.min(1,(innerHeight*.4-r.top)/innerHeight));art.style.setProperty('--art-turn',reduced.matches?'0deg':(p*7)+'deg');art.style.setProperty('--art-rise',reduced.matches?'0px':(-p*22)+'px');let active=links[0];for(const a of links){const section=document.querySelector(a.hash);if(section&&section.getBoundingClientRect().top<innerHeight*.4)active=a}links.forEach(a=>a===active?a.setAttribute('aria-current','location'):a.removeAttribute('aria-current'))}
 addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(draw)}},{passive:true});addEventListener('resize',draw);reduced.addEventListener('change',draw);draw();
})();
