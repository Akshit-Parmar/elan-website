import {App} from '@capacitor/app';
import {Browser} from '@capacitor/browser';
import {Share} from '@capacitor/share';
import {Filesystem,Directory} from '@capacitor/filesystem';
import {localPath,opensInBrowser} from './navigation.mjs';
function message(text){let note=document.querySelector('#elan-native-status');if(!note){note=document.createElement('div');note.id='elan-native-status';note.setAttribute('role','status');document.body.append(note);}note.textContent=text;setTimeout(()=>note.remove(),9000);}
const nav=document.createElement('nav');nav.id='elan-native-nav';nav.setAttribute('aria-label','App navigation');nav.innerHTML='<button type="button" data-back>Back</button><a href="/app.html">My Élan</a><a href="/next-edition.html">Event</a><button type="button" data-share>Share</button>';document.body.append(nav);
const back=()=>{if(history.length>1)history.back();else location.assign('/app.html');};nav.querySelector('[data-back]').onclick=back;
nav.querySelector('[data-share]').onclick=async()=>{try{await Share.share({title:'Élan Summit',text:'Explore Élan Summit.',url:'https://elansummit.com/'});}catch{/* Cancelled. */}};
App.addListener('backButton',({canGoBack})=>{if(canGoBack)history.back();else if(location.pathname!='/app.html')location.assign('/app.html');else App.minimizeApp();});
let exporting=false;
async function exportBlob(link){
 if(exporting)return;exporting=true;const path='elan-export-'+Date.now()+'-'+(link.download||'file').replace(/[^a-zA-Z0-9._-]/g,'_');let written=false;
 try{const blob=await (await fetch(link.href)).blob();if(blob.size>25*1024*1024)throw Error('This export is too large for mobile sharing. Download it from the website.');const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob);});const file=await Filesystem.writeFile({path,data,directory:Directory.Cache});written=true;await Share.share({files:[file.uri],title:'Élan export'});}catch(e){message(e.message||'Could not share the export. Try downloading it from the website.');}finally{if(written)await Filesystem.deleteFile({path,directory:Directory.Cache}).catch(()=>{});exporting=false;}
}
document.addEventListener('click',e=>{const link=e.target.closest?.('a[href]');if(!link)return;const url=new URL(link.href,location.href);if(url.protocol==='blob:'&&link.hasAttribute('download')){e.preventDefault();e.stopImmediatePropagation();void exportBlob(link);return;}
 const local=localPath(link.href,location.href);
 if(local&&!opensInBrowser(url.pathname)){if(link.target==='_blank'||url.origin!==location.origin||url.pathname!==local.split(/[?#]/)[0]){e.preventDefault();location.assign(local);}return;}
 if(url.protocol==='https:'){e.preventDefault();void Browser.open({url:local?'https://elansummit.com'+url.pathname+url.search:url.href}).catch(()=>message('Could not open the browser.'));}
},true);
window.addEventListener('offline',()=>message('You’re offline. Reconnect before saving changes.'));
