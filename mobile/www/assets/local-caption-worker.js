import {pipeline,env} from './vendor/transformers.min.js';
env.allowLocalModels=false;
env.useBrowserCache=typeof caches!=='undefined';
env.backends.onnx.wasm.numThreads=1;
env.backends.onnx.wasm.wasmPaths='https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/';
let model;
self.onmessage=async({data:{id,image}})=>{
 try{
  model??=pipeline('image-to-text','Xenova/vit-gpt2-image-captioning',{
   revision:'077550ae0729f9af280c9d885ea9b0380fc8e815',quantized:true,
   progress_callback:p=>{if(p.status==='progress')self.postMessage({id,progress:`Downloading caption model: ${p.file} · ${Math.round(p.progress||0)}%`});else if(p.status==='initiate')self.postMessage({id,progress:'Loading the caption model. The first download may take a few minutes…'});}
  });
  const captioner=await model;self.postMessage({id,progress:'Describing your photo on this device…'});
  const result=await captioner(image,{max_new_tokens:45,num_beams:1,do_sample:false});
  self.postMessage({id,text:result?.[0]?.generated_text||''});
 }catch(error){console.error('Local caption runtime:',error?.message);model=null;self.postMessage({id,error:'The browser could not load or run the caption model. Check your connection and available memory, or enter the text yourself.'});}
};
