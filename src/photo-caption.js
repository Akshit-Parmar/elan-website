import {localCaption} from './local-caption.js';
import {validatePhoto} from './media-rules.js';
export async function captionImage(file){
 validatePhoto(file);const url=URL.createObjectURL(file);
 try{const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas'),scale=Math.min(1,1024/Math.max(image.naturalWidth,image.naturalHeight));canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);for(const quality of [.8,.6,.4]){const data=canvas.toDataURL('image/jpeg',quality);if(data.length<=400000)return data;}throw Error('This photo is too detailed to describe automatically. Enter the text yourself.');}finally{URL.revokeObjectURL(url);}
}
// One controller per photo. Stale replies and human edits never get overwritten.
export function captionAssistant({sb,container,caption,description,onChange=()=>{},request,encode=captionImage}){
 let file=null,generation=0,controller=null,working=false;const touched=new Set(),generated=new Map();
 const note=document.createElement('p');note.className='form-note';note.textContent='Captions run on your device. First use downloads about 250 MB from Hugging Face and jsDelivr; your photo is not sent to an AI service. Suggestions are simple and may be wrong. Review before saving.';
 const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent='Generate caption & description';button.disabled=true;
 const status=document.createElement('p');status.className='form-note';status.setAttribute('role','status');container.append(note,button,status);const stop=document.createElement('button');stop.type='button';stop.className='secondary';stop.textContent='Stop generating';stop.hidden=true;container.append(stop);stop.onclick=()=>controller?.abort();
 for(const field of [caption,description])field.addEventListener('input',()=>touched.add(field));
 async function run(){
  if(!file||working)return;const n=++generation,chosen=file;controller?.abort();controller=new AbortController();working=true;button.disabled=true;stop.hidden=false;status.textContent='Looking at your photo…';const starting=[caption.value,description.value];
  try{
   const image=await encode(chosen);if(n!==generation)return;
   const response=request?await request(image,controller.signal):await localCaption(image,controller.signal,message=>{if(n===generation&&container.isConnected)status.textContent=message;});
   if(n!==generation||!container.isConnected)return;
   if(response.error){let msg=response.error.message;try{msg=(await response.error.context.json()).error||msg;}catch{}throw Error(msg||'Automatic captions are unavailable. You can enter text manually.');}
   const data=response.data;if(typeof data?.caption!=='string'||!data.caption.trim()||data.caption.length>160||typeof data?.description!=='string'||!data.description.trim()||data.description.length>400)throw Error('No usable description was returned. Please retry.');
   let changed=false;for(const [i,field,value] of [[0,caption,data.caption],[1,description,data.description]]){if(!touched.has(field)&&field.value===starting[i]){field.value=value;generated.set(field,value);changed=true;}}
   if(changed)onChange();status.textContent=changed?'Suggestions added. Check them before saving. Any text you typed has been kept.':'Your text was kept. Clear a field and choose Generate to fill it again.';
  }catch(e){if(n===generation&&container.isConnected)status.textContent=e.message||'Could not describe the photo. You can type the text yourself.';}
  finally{if(n===generation){working=false;button.disabled=!file;stop.hidden=true;}}
 }
 button.onclick=()=>{for(const field of [caption,description])if(!field.value.trim())touched.delete(field);void run();};
 return {setFile(next){generation++;controller?.abort();working=false;file=next;button.disabled=!file;for(const field of [caption,description]){if(!touched.has(field)&&generated.get(field)===field.value)field.value='';if(!field.value.trim())touched.delete(field);else touched.add(field);}return run();},dispose(){generation++;controller?.abort();working=false;file=null;button.disabled=true;stop.hidden=true;},isWorking:()=>working};
}
