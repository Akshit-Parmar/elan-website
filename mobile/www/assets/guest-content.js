import {guestTemplate,guestDirectoryEntry} from './content-templates.js';
try{
 const config=await fetch('/assets/public-config.json').then(r=>r.json());
 const response=await fetch(config.supabaseUrl+'/rest/v1/elan_guests?select=*&edition_slug=eq.2026&published=eq.true&order=sort_order.asc,slug.asc',{headers:{apikey:config.publishableKey},signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('Content unavailable');const rows=await response.json(),journal=document.querySelector('.guest-journal');
 if(journal&&Array.isArray(rows)){
 const live=new Set(rows.map(r=>r.slug));for(const section of journal.querySelectorAll('.guest-profile'))section.hidden=!live.has(section.id);
 for(const row of rows){const section=guestTemplate(row,config.supabaseUrl),old=document.getElementById(row.slug);if(old)old.replaceWith(section);else journal.insertBefore(section,journal.querySelector('.guest-continuation'));}
 const directory=journal.querySelector('.people-directory');if(directory)directory.replaceChildren(...rows.map(r=>guestDirectoryEntry(r,config.supabaseUrl)));
 }
}catch{/* Bundled profiles remain available during an outage. */}
