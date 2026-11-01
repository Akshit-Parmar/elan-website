export function safeContentLink(value){
 if(typeof value!=='string'||value.length>2000||/[\s\\\u0000-\u001f]/.test(value))return false;
 if(value.startsWith('/')&&!value.startsWith('//'))return true;
 if(/^#[a-zA-Z][\w:.-]*$/.test(value))return true;
 if(/^mailto:[^@]+@[^@]+\.[^@]+$/.test(value)||/^tel:\+?[\d()-]+$/.test(value))return true;
 try{return new URL(value).protocol==='https:'}catch{return false}
}
export function validContentText(value){return typeof value==='string'&&value.trim().length>0&&value.length<=6000;}
