import {safeMediaURL,selectPhotoOverride} from './media-rules.js';
(async()=>{
 if(document.querySelector('[data-app="admin"]'))return;
 try{
 const config=await fetch('/assets/public-config.json').then(r=>r.json());
 const response=await fetch(config.supabaseUrl+'/rest/v1/elan_media?select=credit,image_url,alt_text&published=eq.true&or=(credit.like.site-image:*,credit.like.site-slot:*)',{headers:{apikey:config.publishableKey},signal:AbortSignal.timeout(8000)});
 if(!response.ok)return;const rows=(await response.json()).filter(r=>safeMediaURL(r.image_url,config.supabaseUrl));
 function apply(){for(const img of document.querySelectorAll('img')){
 if(img.dataset.editorLocked)continue;
 const path=img.dataset.originalPhoto||new URL(img.getAttribute('src')||'',location.href).pathname,row=selectPhotoOverride(rows,img.dataset.photoSlot,path);
 if(!row||img.getAttribute('src')===row.image_url)continue;
 img.dataset.originalPhotoSource??=img.getAttribute('src');img.dataset.originalPhoto=path;img.dataset.originalAlt??=img.alt;
 const original=img.src,alt=img.alt;img.addEventListener('error',()=>{rows.splice(rows.indexOf(row),1);img.src=original;img.alt=alt},{once:true});img.removeAttribute('srcset');img.src=row.image_url;img.alt=row.alt_text||'';
 }}
 apply();let pending=false;new MutationObserver(()=>{if(!pending){pending=true;queueMicrotask(()=>{pending=false;apply()})}}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
 }catch{/* Keep bundled photographs available offline. */}
})();
