// Original files remain the fallback; only published, validated media can replace them.
(async()=>{
 if(document.querySelector('[data-app="admin"]'))return;
 try{
 const config=await fetch('/assets/public-config.json').then(r=>r.json());
 const response=await fetch(config.supabaseUrl+'/rest/v1/elan_media?select=credit,image_url,alt_text&published=eq.true&credit=like.site-image:*',{headers:{apikey:config.publishableKey},signal:AbortSignal.timeout(8000)});
 if(!response.ok)return;const rows=await response.json(),mapping=new Map();
 for(const row of rows){const url=new URL(row.image_url);if(url.origin!==new URL(config.supabaseUrl).origin||!url.pathname.startsWith('/storage/v1/object/public/elan-public-media/'))continue;mapping.set(row.credit.slice(11),row);}
 function apply(){for(const img of document.querySelectorAll('img')){const path=img.dataset.originalPhoto||new URL(img.getAttribute('src')||'',location.href).pathname,row=mapping.get(path);if(!row||img.src===row.image_url)continue;img.dataset.originalPhoto=path;const original=img.src,alt=img.alt;img.addEventListener('error',()=>{img.src=original;img.alt=alt;mapping.delete(path)},{once:true});img.removeAttribute('srcset');img.src=row.image_url;img.alt=row.alt_text;}}
 apply();let pending=false;new MutationObserver(()=>{if(!pending){pending=true;queueMicrotask(()=>{pending=false;apply()})}}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
 }catch{/* Retain original photos when the network is unavailable. */}
})();
