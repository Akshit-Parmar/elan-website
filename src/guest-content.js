// Keep bundled profiles as an offline fallback; published CMS content hydrates them.
try{
 const config=await fetch('/assets/public-config.json').then(r=>r.json());
 const response=await fetch(config.supabaseUrl+'/rest/v1/elan_guests?select=*&edition_slug=eq.2026&published=eq.true&order=sort_order.asc',{headers:{apikey:config.publishableKey}});
 if(!response.ok)throw new Error('Content unavailable');const rows=await response.json();
 const journal=document.querySelector('.guest-journal');if(journal&&Array.isArray(rows)){
 const live=new Set(rows.map(r=>r.slug));for(const section of journal.querySelectorAll('.guest-profile')){section.hidden=!live.has(section.id);}
 for(const row of rows){let section=document.getElementById(row.slug);if(!section){section=document.createElement('section');section.id=row.slug;section.className='container guest-profile judge-profile';journal.insertBefore(section,journal.querySelector('.guest-continuation'));}section.replaceChildren();
 section.classList.toggle('guest-profile--text',!row.image_url);
 const fig=document.createElement('figure');fig.className='guest-portrait judge-portrait';
 const image=document.createElement('img');image.alt=row.name;image.loading='lazy';
 if(row.image_url.startsWith('/assets/')||row.image_url.startsWith(config.supabaseUrl+'/storage/v1/object/public/elan-public-media/')){image.src=row.image_url;fig.append(image);}
 const caption=document.createElement('figcaption');caption.textContent=row.role+' / ÉLAN 2026';fig.append(caption);
 const bio=document.createElement('div');bio.className='guest-biography';const h=document.createElement('h2');h.textContent=row.name;h.id=row.slug+'-heading';section.setAttribute('aria-labelledby',h.id);bio.append(h);const pos=document.createElement('p');pos.className='guest-position';pos.textContent=row.position;bio.append(pos);
 row.bio.split(/\n\n+/).filter(Boolean).forEach((text,i)=>{const p=document.createElement('p');p.textContent=text;if(i===0)p.className='guest-intro';bio.append(p);});section.append(fig,bio);
 }
 }
}catch{ /* The complete local profiles remain available during an outage. */ }
