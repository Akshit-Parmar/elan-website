// Cache only a generic offline page. Never store accounts, API replies, receipts,
// applications, uploads, tokens or authenticated HTML in Cache Storage.
const CACHE='elan-offline-add6b1a59c5ad986';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.add('/offline.html'))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('elan-offline-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||request.mode!=='navigate'||url.origin!==self.location.origin)return;
 event.respondWith(fetch(request).catch(async()=>await caches.match('/offline.html',{cacheName:CACHE})||new Response('You are offline. Reconnect to use Élan.',{status:503,headers:{'Content-Type':'text/plain'}})));
});
// No skipWaiting: an update must never replace code underneath an open form.
