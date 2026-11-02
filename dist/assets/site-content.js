import {safeContentLink,validContentText} from './content-rules.js';
(async()=>{
 const targets=[...document.querySelectorAll('[data-content-key]')];if(!targets.length)return;
 try{
 const config=await fetch('/assets/public-config.json').then(r=>r.json());
 const path=location.pathname.split('/').pop()||'index';const page=path.endsWith('.html')?path:path+'.html';
 const response=await fetch(config.supabaseUrl+'/rest/v1/elan_page_content?select=key,text,href&page=eq.'+encodeURIComponent(page)+'&published=eq.true',{headers:{apikey:config.publishableKey},signal:AbortSignal.timeout(8000)});
 if(!response.ok)return;
 const rows=new Map((await response.json()).map(r=>[r.key,r]));
 for(const node of targets){const row=rows.get(node.dataset.contentKey);if(node.dataset.editorLocked||!row||!validContentText(row.text))continue;node.textContent=row.text;node.dataset.cmsApplied='true';const link=node.closest('a');if(link&&row.href&&safeContentLink(row.href))link.setAttribute('href',row.href);}
 }catch{/* Static copy remains readable when offline. */}
})();
