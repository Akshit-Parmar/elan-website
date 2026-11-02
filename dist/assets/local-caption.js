let worker=null,serial=Promise.resolve(),nextID=0;
export function copyFromCaption(value){
 let description=String(value||'').replace(/\s+/g,' ').trim();
 if(!description||description.length>600)throw Error('The model could not describe this photo. Please enter the text yourself.');
 description=description[0].toUpperCase()+description.slice(1);if(!/[.!?]$/.test(description))description+='.';
 description=description.slice(0,400);let caption=description;
 if(caption.length>160){caption=caption.slice(0,156).replace(/\s+\S*$/,'')+'…';}
 return {caption,description};
}
export function localCaption(image,signal,onProgress=()=>{}){
 const run=()=>new Promise((resolve,reject)=>{
  if(signal?.aborted)return reject(new DOMException('Caption cancelled.','AbortError'));
  if(typeof Worker==='undefined'||typeof WebAssembly==='undefined')return reject(Error('This browser cannot run captions locally. Try a recent Chrome or Edge, or enter the text yourself.'));
  const id=++nextID;let timer;
  const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);if(worker){worker.onmessage=null;worker.onerror=null;}};
  const stop=()=>{worker?.terminate();worker=null;};
  const fail=error=>{cleanup();stop();reject(error);};
  const abort=()=>fail(new DOMException('Caption cancelled.','AbortError'));
  try{
   worker??=new Worker(new URL('./local-caption-worker.js',import.meta.url),{type:'module'});
   worker.onmessage=({data})=>{if(data.id!==id)return;if(data.progress){onProgress(data.progress);return;}if(data.error){fail(Error(data.error));return;}try{const result=copyFromCaption(data.text);cleanup();resolve({data:result});}catch(e){fail(e);}};
   worker.onerror=()=>fail(Error('Local captions could not start. Check your internet connection for the model download, or enter text manually.'));
   signal?.addEventListener('abort',abort,{once:true});
   timer=setTimeout(()=>fail(Error('The model took too long to load. Try again on a faster connection, or enter text manually.')),300000);
   onProgress('Loading the local model. First use downloads about 250 MB; your photo stays on this device.');
   worker.postMessage({id,image});
  }catch(e){fail(e);}
 });
 const result=serial.then(run,run);serial=result.catch(()=>{});return result;
}
