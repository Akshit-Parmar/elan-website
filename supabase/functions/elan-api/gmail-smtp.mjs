// Server only. Gmail's app password must never enter public-config or browser JS.
export async function sendGmail({password,to,subject,text,id}){
 const {default:nodemailer}=await import('npm:nodemailer@10.3.1');
 const transport=nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,
  auth:{user:'the.elan.summit@gmail.com',pass:password},
  connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,
  disableFileAccess:true,disableUrlAccess:true});
 try{return await transport.sendMail({from:{name:'Élan Summit',address:'the.elan.summit@gmail.com'},to,
  replyTo:'the.elan.summit@gmail.com',subject,text,messageId:`<elan-enquiry-${id}@elansummit.com>`});}
 finally{transport.close();}
}
