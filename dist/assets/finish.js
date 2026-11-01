(()=>{
 const links=[...document.querySelectorAll('.story-chapters a')];
 if(links.length&&'IntersectionObserver' in window){const sections=links.map(a=>document.querySelector(a.getAttribute('href'))).filter(Boolean);const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)links.forEach(a=>a.setAttribute('aria-current',String(a.hash==='#'+entry.target.id)))},{rootMargin:'-20% 0px -55% 0px',threshold:0});sections.forEach(s=>observer.observe(s));}
 // Reserve space for natural-size images and avoid animating text offscreen on mobile.
 document.querySelectorAll('img[loading=lazy]').forEach(img=>img.decoding='async');
})();
