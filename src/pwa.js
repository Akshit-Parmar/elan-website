const native=globalThis.Capacitor?.isNativePlatform?.();
if(!native&&'serviceWorker' in navigator&&location.protocol==='https:'){
 navigator.serviceWorker.register('/service-worker.js',{updateViaCache:'none'}).then(reg=>{
  const announce=()=>{if(!reg.waiting)return;let note=document.querySelector('#elan-update');if(note)return;note=document.createElement('aside');note.id='elan-update';note.setAttribute('role','status');note.textContent='An Élan update is ready. Finish your work, then close all Élan windows and reopen the app.';Object.assign(note.style,{position:'fixed',bottom:'12px',left:'12px',right:'12px',padding:'14px 20px',background:'#213347',color:'#fff',zIndex:9999,borderRadius:'8px',font:'14px/1.5 system-ui'});const close=document.createElement('button');close.type='button';close.textContent='Dismiss';close.style.marginLeft='16px';close.onclick=()=>note.remove();note.append(close);document.body.append(note);};
  announce();reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)announce();});});
 }).catch(()=>{/* Ordinary website access remains available. */});
}
let installEvent;
const button=document.querySelector('#install-app'),help=document.querySelector('#install-help');
const installed=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
if(native){document.querySelector('#install')?.remove();}
else if(installed&&help){help.textContent='You’re using the installed Élan app.';}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;if(button&&!installed)button.hidden=false;});
if(button)button.onclick=async()=>{if(!installEvent)return;button.disabled=true;try{await installEvent.prompt();await installEvent.userChoice;}finally{installEvent=null;button.hidden=true;button.disabled=false;}};
window.addEventListener('appinstalled',()=>{if(button)button.hidden=true;if(help)help.textContent='Élan has been added to your home screen.';});
