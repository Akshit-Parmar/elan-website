export function localPath(raw,base){
 const url=new URL(raw,base);
 if(url.hostname!=='elansummit.com'||!['https:','capacitor:'].includes(url.protocol))return null;
 let path=url.pathname;
 // Cloudflare's clean URL redirects do not exist inside a bundled native app.
 if(path==='/')path='/index.html';else if(path.endsWith('/'))path+='index.html';else if(!path.split('/').pop().includes('.'))path+='.html';
 return path+url.search+url.hash;
}
export function opensInBrowser(path){return /^\/(join-oc-2027|contact|schools|school-collaboration|volunteers|register|pay)(\.html)?$/.test(path)||path==='/portal/login.html'||path==='/portal/set-password.html';}
