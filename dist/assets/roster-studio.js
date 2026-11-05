import {preparePhoto} from './photo-crop.js';
import {groups,section} from './oc-sections.js';
import {esc} from './organiser-utils.js';
import {uploadPhoto,safeMediaURL,validatePhoto,photoID} from './media-rules.js';
const table='elan_oc_roster';
const byOrder=(a,b)=>a.sort_order-b.sort_order||a.name.localeCompare(b.name)||a.id.localeCompare(b.id);
const initials=s=>s.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('');
const field=(name,label,attrs='')=>'<label>'+label+'<input name="'+name+'" '+attrs+'></label>';
export async function rosterStudio({host,sb,api,config,isCurrent}){
 if(!document.querySelector('link[href="/assets/admin-visual.css"]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/admin-visual.css';document.head.append(css);}
 const rows=[];for(let offset=0;;offset+=100){const r=await sb.from(table).select('*').order('sort_order').order('name').order('id').range(offset,offset+99);if(r.error)throw r.error;rows.push(...r.data);if(r.data.length<100)break;}if(!isCurrent())return;
 host.innerHTML='<section class="roster-studio"><div class="studio-head"><div><small>FIRST EDITION &nbsp;/&nbsp; PEOPLE</small><h2>Committee directory</h2><p>The people behind Élan 2026, organised by department.</p></div><button class="studio-primary" data-add>+ Add member</button></div><div class="oc-cover-tools"><img data-cover alt="Committee group photograph" src="/assets/edition-2026/oc-group.webp"><label>Change group photo<input data-cover-file type="file" accept="image/jpeg,image/png,image/webp"></label><span data-cover-status role="status"></span></div><div class="studio-toolbar"><label>Find a member<input type="search" placeholder="Search name or role"></label><label>Department<select><option value="">All departments</option></select></label><a href="/oc-2026.html">View public directory ↗</a></div><p role="status" data-result></p><div class="studio-grid"></div></section>';
 const q=s=>host.querySelector(s);const filter=q('select'),search=q('[type=search]'),grid=q('.studio-grid'),message=q('[data-result]');function departments(){const previous=filter.value;filter.innerHTML='<option value="">All departments</option>'+[...new Set([...groups,...rows.map(section)])].map(v=>'<option>'+esc(v)+'</option>').join('');filter.value=[...filter.options].some(o=>o.value===previous)?previous:'';}
 function portrait(p){return safeMediaURL(p.portrait,config.supabaseUrl)?'<img src="'+esc(p.portrait)+'" alt="'+esc(p.name)+'" loading="lazy">':'<span class="studio-initial">'+esc(initials(p.name)||'É')+'</span>';}

 let changing=false;
 function team(p){return rows.filter(x=>section(x)===section(p)).sort(byOrder);}
 function draw(){
 rows.sort(byOrder);
 const term=search.value.toLowerCase().trim(),visible=rows.filter(p=>(!filter.value||section(p)===filter.value)&&[p.name,p.role].join(' ').toLowerCase().includes(term));
 grid.innerHTML=visible.map(p=>{const list=team(p),pos=list.indexOf(p);return '<article class="studio-person"><div class="studio-photo">'+portrait(p)+'<small>'+ (p.published?'Published':'Draft')+'</small></div><div class="studio-card-copy"><small>'+esc(section(p))+' · Position '+(pos+1)+' of '+list.length+'</small><h3>'+esc(p.name)+'</h3><p>'+esc(p.role)+'</p><button data-edit="'+esc(p.id)+'">Edit profile ↗</button><div class="studio-order"><button data-move="'+esc(p.id)+'" data-direction="-1" '+(pos===0?'disabled':'')+' aria-label="Move '+esc(p.name)+' earlier in team">↑ Earlier</button><button data-move="'+esc(p.id)+'" data-direction="1" '+(pos===list.length-1?'disabled':'')+' aria-label="Move '+esc(p.name)+' later in team">↓ Later</button></div><button class="studio-remove" data-remove="'+esc(p.id)+'">Remove member</button></div></article>';}).join('')||'<p>No members match this view.</p>';
 for(const b of grid.querySelectorAll('[data-edit]'))b.onclick=()=>{if(!changing)edit(rows.find(x=>x.id===b.dataset.edit),b);};
 for(const b of grid.querySelectorAll('[data-move]'))b.onclick=()=>move(rows.find(x=>x.id===b.dataset.move),Number(b.dataset.direction));
 for(const b of grid.querySelectorAll('[data-remove]'))b.onclick=()=>remove(rows.find(x=>x.id===b.dataset.remove));
 message.textContent=visible.length+' of '+rows.length+' members · Arrows save the order within each team. Drafts are skipped on the public page.';
 }
 async function reload(){
 const fresh=[];for(let offset=0;;offset+=100){const r=await sb.from(table).select('*').order('sort_order').order('name').order('id').range(offset,offset+99);if(r.error)throw r.error;fresh.push(...r.data);if(r.data.length<100)break;}
 rows.splice(0,rows.length,...fresh);departments();draw();
 }
 async function move(person,direction){
 if(changing)return;changing=true;host.inert=true;
 try{
 await reload();const current=rows.find(x=>x.id===person.id);if(!current)throw Error('This member was removed. The directory has been refreshed.');
 const list=team(current),from=list.indexOf(current),to=from+direction;if(to<0||to>=list.length)return;
 [list[from],list[to]]=[list[to],list[from]];message.textContent='Saving team order…';
 for(let i=0;i<list.length;i++){const order=(i+1)*10;if(list[i].sort_order===order)continue;
 const r=await sb.from(table).update({sort_order:order}).eq('id',list[i].id).select('id,sort_order').single();if(r.error)throw r.error;if(!r.data?.id)throw Error('The server did not confirm the order.');list[i].sort_order=r.data.sort_order;}
 filter.value=section(current);search.value='';draw();message.textContent='Order saved for '+section(current)+'. The public slideshow uses this order.';
 }catch(e){try{await reload();}catch{}message.textContent='Order could not be fully saved. Refresh and check the current order before retrying. '+e.message;}
 finally{changing=false;host.inert=false;}
 }
 async function remove(person){
 if(changing||!confirm('Remove '+person.name+' from the 2026 committee directory? This deletes their committee profile. Their uploaded photo and any organiser login remain unchanged.'))return;
 changing=true;host.inert=true;message.textContent='Removing member…';
 try{const r=await sb.from(table).delete().eq('id',person.id).select('id').single();if(r.error)throw r.error;if(r.data?.id!==person.id)throw Error('The server did not confirm removal.');
 rows.splice(rows.findIndex(x=>x.id===person.id),1);departments();draw();message.textContent=person.name+' removed from the 2026 committee directory.';
 }catch(e){message.textContent='Could not remove this member. '+e.message;}
 finally{changing=false;host.inert=false;}
 }
 function edit(original,opener){const dlg=document.createElement('dialog');dlg.className='studio-dialog';dlg.setAttribute('aria-label',original?'Edit committee profile':'New committee member');dlg.innerHTML='<form><div class="studio-head"><div><small>2026 / MEMBER PROFILE</small><h2>'+ (original?'Edit profile':'Add member')+'</h2></div><button type="button" data-close aria-label="Close editor">Close ×</button></div><div class="studio-edit-grid"><aside><div class="studio-photo" data-preview></div><h3 data-name></h3><p data-role></p><small>DIRECTORY PREVIEW</small></aside><div class="studio-fields">'+field('name','Full name','required maxlength="150"')+field('department','Department','required list="studio-departments" maxlength="90"')+'<datalist id="studio-departments">'+[...new Set([...groups,...rows.map(section)])].map(v=>'<option value="'+esc(v)+'">').join('')+'</datalist>'+field('role','Committee role','required maxlength="150"')+'<label>About this member<textarea name="bio" rows="4" maxlength="1500"></textarea></label>'+field('photo','Choose a portrait','type="file" accept="image/jpeg,image/webp,image/png"')+field('sort_order','Position within this team (lowest first)','type="number" required step="1"')+'<label class="studio-check"><input type="checkbox" name="published"> Published in the 2026 directory</label></div></div><div class="studio-save"><p role="status"></p><button type="submit" class="studio-primary">Save profile</button></div></form>';document.body.append(dlg);
 const f=dlg.querySelector('form'),get=k=>f.elements.namedItem(k);for(const k of ['name','role','department','bio','sort_order'])get(k).value=k==='department'?(original?section(original):filter.value):original?.[k]??(k==='sort_order'?50:'');get('published').checked=!!original?.published;let local=null,dirty=false,busy=false,uploaded=null,selectedFile=null;
 function preview(){const photo=dlg.querySelector('[data-preview]');if(local){const img=document.createElement('img');img.src=local;img.alt='New portrait preview';photo.replaceChildren(img);}else photo.innerHTML=portrait({name:get('name').value,portrait:original?.portrait||''});dlg.querySelector('[data-name]').textContent=get('name').value||'Member name';dlg.querySelector('[data-role]').textContent=[get('role').value,get('department').value].filter(Boolean).join(' · ')||'Committee role';}
 f.oninput=()=>{dirty=true;preview();};get('photo').onchange=async()=>{const file=get('photo').files[0];if(!file||busy)return;busy=true;f.inert=true;try{const prepared=await preparePhoto(file);if(prepared){if(local)URL.revokeObjectURL(local);local=URL.createObjectURL(prepared);selectedFile=prepared;uploaded=null;dirty=true;}else get('photo').value='';f.querySelector('[role=status]').textContent='';}catch(e){get('photo').value='';f.querySelector('[role=status]').textContent=e.message;}finally{busy=false;f.inert=false;preview();}};
 const close=()=>{if(!busy&&(!dirty||confirm('Discard unsaved profile changes?')))dlg.close();};dlg.querySelector('[data-close]').onclick=close;dlg.oncancel=e=>{e.preventDefault();close();};dlg.onclose=()=>{if(local)URL.revokeObjectURL(local);dlg.remove();(opener.isConnected?opener:q('[data-add]'))?.focus();};preview();dlg.showModal();
 f.onsubmit=async e=>{e.preventDefault();if(busy||!f.reportValidity())return;busy=true;f.inert=true;const out=f.querySelector('[role=status]');out.textContent='Saving profile…';try{const file=selectedFile;if(file&&!uploaded)uploaded=await uploadPhoto(file,sb,api);const values={name:get('name').value.trim(),department:get('department').value.trim(),role:get('role').value.trim(),bio:get('bio').value.trim(),published:get('published').checked,sort_order:Number(get('sort_order').value),portrait:uploaded||original?.portrait||''};const result=await (original?sb.from(table).update(values).eq('id',original.id):sb.from(table).insert(values)).select('*').single();if(result.error)throw result.error;if(!result.data?.id)throw Error('The server did not confirm the save.');if(original)Object.assign(original,result.data);else rows.push(result.data);rows.sort((a,b)=>a.sort_order-b.sort_order||a.name.localeCompare(b.name));departments();filter.value=section(result.data);search.value='';draw();message.textContent=result.data.name+' saved · '+(result.data.published?'Published':'Draft');dirty=false;dlg.close();}catch(err){out.textContent=err.message||'Save failed. Your changes are still here.';}finally{busy=false;f.inert=false;}};
 }

 const coverKey='f10531d78d9fdfd28f9047a0c29dec79',credit='site-slot:'+coverKey,cover=q('[data-cover]'),picker=q('[data-cover-file]'),note=q('[data-cover-status]');
 const initial=await sb.from('elan_media').select('image_url').eq('credit',credit).eq('published',true).maybeSingle();if(!isCurrent())return;if(safeMediaURL(initial.data?.image_url,config.supabaseUrl))cover.src=initial.data.image_url;
 picker.onchange=async()=>{const file=picker.files[0];if(!file)return;picker.disabled=true;try{const prepared=await preparePhoto(file);if(!prepared)return;note.textContent='Saving group photo…';const url=await uploadPhoto(prepared,sb,api);const r=await sb.from('elan_media').upsert({id:await photoID(coverKey),credit,image_url:url,title:'2026 organising committee',alt_text:'The 2026 Élan organising committee together',category:'People',published:true}).select('image_url').single();if(r.error)throw r.error;cover.src=r.data.image_url;note.textContent='Group photo saved.';}catch(e){note.textContent=e.message||'Could not save the group photo.';}finally{picker.disabled=false;picker.value='';}};
 departments();search.oninput=draw;filter.onchange=draw;q('[data-add]').onclick=e=>edit(null,e.currentTarget);draw();}
