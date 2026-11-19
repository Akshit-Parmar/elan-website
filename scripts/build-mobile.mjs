import {readFile,writeFile,rm,mkdir,cp,readdir,stat} from 'node:fs/promises';
import {build} from 'esbuild';
import {localPath} from '../mobile/navigation.mjs';
const root=new URL('../',import.meta.url),www=new URL('mobile/www/',root);
await rm(www,{recursive:true,force:true});await mkdir(www,{recursive:true});await cp(new URL('dist/',root),www,{recursive:true});
await build({entryPoints:[new URL('mobile/native.js',root).pathname],bundle:true,format:'esm',outfile:new URL('assets/native.js',www).pathname,minify:true});
await cp(new URL('mobile/native.css',root),new URL('assets/native.css',www));
async function walk(dir){for(const name of await readdir(dir)){const file=new URL(name,dir),info=await stat(file);if(info.isDirectory()){await walk(new URL(name+'/',dir));continue;}if(!name.endsWith('.html')&&!name.endsWith('.js'))continue;
 let text=await readFile(file,'utf8');
 if(name.endsWith('.html')){text=text.replace('initial-scale=1','initial-scale=1,viewport-fit=cover');text=text.replace('</body>','<link rel="stylesheet" href="/assets/native.css"><script type="module" src="/assets/native.js"></script></body>');text=text.replace(/href="(\/[^"?#]*)([?#][^"]*)?"/g,(m,path,tail='')=>path.startsWith('/assets/')?m:'href="'+localPath(path,'https://elansummit.com')+tail+'"');}
 if(name==='app.js'){text=text.replaceAll('a.click();','document.body.append(a);a.click();a.remove();').replaceAll("flowType:'pkce'","flowType:'implicit'").replaceAll('location.origin+',"'https://elansummit.com'+");}
 // Existing programmatic destinations also need clean paths resolved locally.
 text=text.replace(/(['"])\/organisers\1/g,"'/organisers.html'");
 await writeFile(file,text);
 }}
await walk(www);
// The packaged app starts at its workspace hub. The event home is retained.
await cp(new URL('index.html',www),new URL('event-home.html',www));
await cp(new URL('app.html',www),new URL('index.html',www));
for(const name of ['_headers','_redirects','service-worker.js'])await rm(new URL(name,www),{force:true});
console.log('Bundled website and native navigation into mobile/www.');
