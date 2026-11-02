Deno.serve((req:Request)=>{
 const origin=req.headers.get('origin')||'';
 const allowed=['https://elansummit.com','https://www.elansummit.com',...(Deno.env.get('ALLOWED_ORIGINS')||'').split(',').map(x=>x.trim())];
 const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
 if(allowed.includes(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 return new Response(JSON.stringify({error:'Cloud captions are disabled. Deploy the latest website update to generate captions on your device.'}),{status:410,headers});
});
