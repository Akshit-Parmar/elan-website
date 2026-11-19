export function isSiteOverride(row){return /^site-(image|slot):/.test(row.credit||'');}
export function safeMediaURL(value,base){
 if(typeof value!=='string'||/[\\\s]/.test(value))return false;
 if(value.startsWith('/assets/')&&!value.includes('..'))return true;
 try{const u=new URL(value);return u.origin===new URL(base).origin&&u.pathname.startsWith('/storage/v1/object/public/elan-public-media/')}catch{return false}
}
export function selectPhotoOverride(rows,slot,src){return rows.find(r=>r.published!==false&&r.credit==='site-slot:'+slot)||rows.find(r=>r.published!==false&&r.credit==='site-image:'+src);}
export function validatePhoto(file){if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8388608)throw Error('Choose a JPEG, PNG or WebP smaller than 8 MB.');}
// Deterministic placement identifiers, including on local HTTP previews.
// These are content identifiers, never authentication tokens.
export async function photoID(slot){let hex=slot;if(!/^[a-f0-9]{32}$/.test(hex)){hex=[0x811c9dc5,0x9e3779b9,0x85ebca6b,0xc2b2ae35].map(seed=>{let h=seed;for(const byte of new TextEncoder().encode('elan-site-slot:'+slot))h=Math.imul(h^byte,16777619);return (h>>>0).toString(16).padStart(8,'0')}).join('');}const a=Uint8Array.from(hex.match(/../g),x=>parseInt(x,16));a[6]=(a[6]&15)|80;a[8]=(a[8]&63)|128;const h=[...a].map(x=>x.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
export function newRecordID(){const a=crypto.getRandomValues(new Uint8Array(16));a[6]=(a[6]&15)|64;a[8]=(a[8]&63)|128;const h=[...a].map(x=>x.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
export async function uploadPhoto(file,sb,api){validatePhoto(file);const u=await api('media-upload',{mime:file.type});const r=await sb.storage.from('elan-public-media').uploadToSignedUrl(u.path,u.token,file,{contentType:file.type});if(r.error)throw r.error;return u.url;}
