import {pageDrafts} from './page-drafts.js';
import {preparePhoto} from './photo-crop.js';
import {mountEditableRuns} from './content-targets.js';
import {safeContentLink,validContentText} from './content-rules.js';
import {uploadPhoto,validatePhoto,photoID} from './media-rules.js';
export function editorStyles(){if(!document.querySelector('[data-admin-visual-css]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/assets/admin-visual.css';link.dataset.adminVisualCss='';document.head.append(link);}}
const label=p=>p.replace('.html','').replaceAll('-',' ').replace(/^index$/,'Home').replace(/\b\w/g,c=>c.toUpperCase());
export async function openVisualEditor({sb,api,host,editor,status,isCurrent,onCollection}){
 editorStyles();editor.replaceChildren();
 const [texts,photos]=await Promise.all(['content-inventory','photo-slots'].map(n=>fetch('/assets/'+n+'.json').then(r=>{if(!r.ok)throw Error('The page editor could not load.');return r.json()})));
 if(!isCurrent())return;
 const textMap=new Map(texts.map(x=>[x.key,x])),photoMap=new Map(photos.map(x=>[x.key,x]));
 const pages=[...new Set(texts.map(x=>x.page))].sort((a,b)=>a==='index.html'?-1:b==='index.html'?1:a.localeCompare(b));
 host.innerHTML=`<section class="visual-admin"><div class="visual-heading"><div><p class="app-badge">YOUR WEBSITE, EDITABLE</p><h2>Edit where you see it.</h2><p>Click words to type. Click a photo to replace just that placement.</p></div><div class="app-actions"><button data-manage="elan_guests" class="secondary">Add or edit people</button><button data-manage="elan_media" class="secondary">Add gallery photos</button></div></div><div class="visual-tools"><label>Page<select id="visual-page"></select></label><label>View<select id="visual-width"><option value="1440">Desktop</option><option value="390">Mobile</option></select></label><button id="visual-mode" class="secondary" aria-pressed="true">Editing on</button><span id="visual-count" role="status">All changes saved</span><button id="visual-discard" class="secondary" disabled>Discard draft</button><button id="visual-draft">Save draft</button><button id="visual-history" class="secondary">History</button><button id="visual-save" disabled>Publish</button></div><div class="visual-workspace"><div class="visual-stage"><iframe title="Editable website preview" data-elan-editor="true" id="visual-frame"></iframe></div><aside class="visual-inspector" id="visual-inspector"><h3>Choose something on the page</h3><p>The page keeps its real design. Save a draft, preview it, then publish when ready.</p></aside></div></section>`;
 const q=s=>host.querySelector(s),frame=q('#visual-frame'),picker=q('#visual-page'),inspector=q('#visual-inspector');
 for(const page of pages){const o=document.createElement('option');o.value=page;o.textContent=label(page);picker.append(o);}
 let drafts;let pending=new Map(),selected=null,editing=true,busy=false,page=picker.value,urls=new Set(),disposed=false;
 function count(){q('#visual-count').textContent=pending.size?`${pending.size} ${drafts?.isSaved()?'draft':'unsaved'} change${pending.size===1?'':'s'}`:'All changes saved';q('#visual-save').disabled=!pending.size||busy;q('#visual-discard').disabled=!pending.size||busy;picker.disabled=busy;q('#visual-draft').disabled=busy;q('#visual-history').disabled=busy;}
 function release(){for(const url of urls)URL.revokeObjectURL(url);urls.clear();}
 function leave(e){if(busy||(pending.size&&!drafts?.isSaved()&&!confirm('Discard your unsaved page changes?'))){e.preventDefault();return;}dispose();}
 function before(e){if(pending.size&&!drafts?.isSaved()){e.preventDefault();e.returnValue='';}}
 function dispose(){disposed=true;drafts?.dispose();resize.disconnect();release();window.removeEventListener('beforeunload',before);document.removeEventListener('elan:admin-leave',leave);}
 document.addEventListener('elan:admin-leave',leave);window.addEventListener('beforeunload',before);
 function setText(node,value){for(const el of frame.contentDocument.querySelectorAll('[data-content-key="'+node.dataset.contentKey+'"]'))el.textContent=value;}
 function updateText(node,restore=false){const original=textMap.get(node.dataset.contentKey);if(!original)return;const link=node.closest('a'),text=node.textContent.trim(),href=restore?original.href:(pending.get('text:'+original.key)?.href??link?.getAttribute('href')??original.href);
 pending.set('text:'+original.key,{type:'text',original,text,href,restore});node.dataset.editorLocked='true';count();}
 function inspectText(node){const original=textMap.get(node.dataset.contentKey);selected=node;
 inspector.innerHTML='<p class="app-badge">TEXT</p><h3>Edit this text</h3><label>Words<textarea id="visual-text" rows="7"></textarea></label><div id="visual-link"></div><button id="visual-restore" class="secondary">Restore original text</button><p class="form-note">You can also type directly on the page.</p>';
 const input=q('#visual-text');input.value=node.textContent.trim();input.oninput=()=>{setText(node,input.value);updateText(node);};
 const link=node.closest('a');if(link){const l=document.createElement('label');l.textContent='Link destination';const a=document.createElement('input');a.value=link.getAttribute('href')||'';l.append(a);q('#visual-link').append(l);a.oninput=()=>{updateText(node);pending.get('text:'+original.key).href=a.value;if(safeContentLink(a.value))link.setAttribute('href',a.value);};}
 q('#visual-restore').onclick=()=>{setText(node,original.text);if(link&&original.href)link.setAttribute('href',original.href);updateText(node,true);inspectText(node);};
 }
 function inspectImage(node){selected=node;const key=node.dataset.photoSlot;let original=photoMap.get(key);if(!original){original={key,page,src:node.dataset.originalPhotoSource||node.dataset.originalPhoto||node.getAttribute('src'),alt:node.dataset.originalAlt??node.alt};photoMap.set(key,original);}
 inspector.innerHTML='<p class="app-badge">THIS PHOTO ONLY</p><h3>Change this placement</h3><img class="visual-photo-preview" alt="Selected placement"><label>Choose a photo<input id="visual-photo" type="file" accept="image/jpeg,image/png,image/webp"></label><button type="button" id="visual-reuse" class="secondary">Use an existing photo</button><label>Describe the photo<input id="visual-alt" maxlength="400"></label><button id="visual-restore" class="secondary">Restore original photo</button><p class="form-note">Other uses of this photo stay as they are. JPEG, PNG or WebP, up to 8 MB.</p>';
 q('.visual-photo-preview').src=node.src;q('#visual-alt').value=node.alt;
 function change(fields){node.dataset.editorLocked='true';const old=pending.get('image:'+key)||{type:'image',original,url:node.getAttribute('src'),alt:node.alt};pending.set('image:'+key,{...old,...fields});count();}
 q('#visual-photo').onchange=async e=>{let file=e.target.files[0];if(!file)return;try{file=await preparePhoto(file);if(!file){e.target.value='';return;}const url=URL.createObjectURL(file);urls.add(url);change({file,url:null,uploaded:null});node.removeAttribute('srcset');node.src=url;q('.visual-photo-preview').src=url;status('Photo ready. Save a draft or publish when ready.');}catch(err){status(err.message,true);e.target.value='';}};
 q('#visual-reuse').onclick=async()=>{try{const {chooseMedia}=await import('./media-library.js');const config=await fetch('/assets/public-config.json').then(r=>r.json());const chosen=await chooseMedia({api,config});if(!chosen||disposed)return;change({file:null,url:chosen.url,uploaded:null,alt:chosen.alt||chosen.title});node.removeAttribute('srcset');node.src=chosen.url;node.alt=chosen.alt||chosen.title;q('.visual-photo-preview').src=chosen.url;q('#visual-alt').value=node.alt;}catch(err){status(err.message,true);}};
 q('#visual-alt').oninput=e=>{change({alt:e.target.value});node.alt=e.target.value;};
 q('#visual-restore').onclick=()=>{change({file:null,url:original.src,alt:original.alt||'Élan Summit photo',uploaded:null});node.src=original.src;node.alt=original.alt;inspectImage(node);};
 }
 frame.onload=()=>{if(disposed||!isCurrent())return;const doc=frame.contentDocument;if(!doc)return;mountEditableRuns(doc);
 // Delegated selection also works for profiles and gallery cards loaded after the frame.
 const style=doc.createElement('style');style.textContent=`html[data-visual-editing="true"] [data-content-key]:hover,html[data-visual-editing="true"] img[data-photo-slot]:hover{outline:2px dashed #c86c3b!important;outline-offset:4px;cursor:pointer}html[data-visual-editing="true"] [contenteditable]:focus{outline:2px solid #a34d28!important;outline-offset:4px}html[data-visual-editing="true"] img[data-photo-slot]{cursor:pointer}html{scroll-behavior:auto!important}`;doc.head.append(style);doc.documentElement.dataset.visualEditing=String(editing);
 doc.addEventListener('click',e=>{if(!editing){const link=e.target.closest('a');if(link&&!link.getAttribute('href')?.startsWith('#')){e.preventDefault();status('Choose a page above to navigate the preview.');}return;}
 e.preventDefault();e.stopImmediatePropagation();if(busy)return;const image=e.target.closest('img[data-photo-slot]');if(image){inspectImage(image);return;}
 const card=e.target.closest('[data-collection-record]');if(card){onCollection(card.dataset.collectionTable,card.dataset.collectionRecord);return;}
 const node=e.target.closest('[data-content-key]');if(node&&textMap.has(node.dataset.contentKey)){selected?.removeAttribute('contenteditable');node.closest('details')?.setAttribute('open','');node.setAttribute('contenteditable','plaintext-only');if(node.tagName==='ELAN-COPY')node.style.display='inline';node.dataset.editorLocked='true';inspectText(node);node.focus();}
 },true);
 doc.addEventListener('input',e=>{const node=e.target.closest('[data-content-key]');if(node){updateText(node);if(selected===node&&q('#visual-text'))q('#visual-text').value=node.textContent.trim();}});
 doc.addEventListener('submit',e=>{e.preventDefault();e.stopImmediatePropagation();status('Forms are disabled inside the editor preview.');},true);
 drafts.load().catch(e=>status(e.message,true));
 doc.addEventListener('keydown',e=>{if(editing&&e.target.closest('[contenteditable]')&&e.key==='Enter'){e.preventDefault();e.target.blur();}});
 };
 function reload(){selected=null;inspector.innerHTML='<h3>Choose text or a photo</h3><p>Scroll through the real page and click what you want to change. Guest biographies and gallery captions open their collection editor.</p>';frame.src='/'+page+'?editor-preview=1';}
 picker.onchange=()=>{if(pending.size&&!drafts?.isSaved()&&!confirm('Discard your unsaved changes before changing page?')){picker.value=page;return;}pending.clear();release();page=picker.value;count();reload();};
 function fitPreview(){const width=Number(q('#visual-width').value),scale=Math.min(1,Math.max(1,q('.visual-stage').clientWidth-24)/width);frame.style.width=width+'px';frame.style.zoom=String(scale);frame.style.height=Math.max(600,innerHeight*.76/scale)+'px';}
 const resize=new ResizeObserver(fitPreview);resize.observe(q('.visual-stage'));q('#visual-width').onchange=fitPreview;fitPreview();
 q('#visual-mode').onclick=()=>{editing=!editing;selected?.removeAttribute('contenteditable');frame.contentDocument.documentElement.dataset.visualEditing=String(editing);q('#visual-mode').textContent=editing?'Editing on':'Preview mode';q('#visual-mode').setAttribute('aria-pressed',String(editing));};
 q('#visual-discard').onclick=()=>{if(confirm('Discard this page draft and its unsaved changes? The published page will stay unchanged.'))drafts.discard();};
 drafts=pageDrafts({sb,api,pending:()=>pending,textMap,photoMap,page:()=>page,doc:()=>frame.contentDocument,status,count,reload,inspector:()=>inspector,lock:value=>{busy=value;inspector.inert=value;frame.style.pointerEvents=value?'none':'';count();}});
 q('#visual-save').onclick=()=>drafts.save(true);q('#visual-draft').onclick=()=>drafts.save();q('#visual-history').onclick=()=>drafts.history();
 for(const b of host.querySelectorAll('[data-manage]'))b.onclick=()=>onCollection(b.dataset.manage);
 reload();count();status('Choose a page, then click its text or photos.');
}
