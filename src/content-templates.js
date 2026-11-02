import {safeMediaURL} from './media-rules.js';
function el(doc,tag,cls,text){const node=doc.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
export function guestTemplate(row,base,doc=document){
 const section=el(doc,'section','container guest-profile judge-profile');section.id=row.slug;section.dataset.collectionTable='elan_guests';section.dataset.collectionRecord=row.slug;
 const hasPhoto=safeMediaURL(row.image_url,base);section.classList.toggle('guest-profile--text',!hasPhoto);
 const fig=el(doc,'figure','guest-portrait judge-portrait');if(hasPhoto){const image=el(doc,'img');image.src=row.image_url;image.alt=row.name;image.loading='lazy';image.dataset.photoSlot='guest-'+row.slug+'-portrait';fig.append(image);}
 fig.append(el(doc,'figcaption','',row.role+' / ÉLAN '+row.edition_slug));
 const bio=el(doc,'div','guest-biography'),h=el(doc,'h2','',row.name);h.id=row.slug+'-heading';section.setAttribute('aria-labelledby',h.id);bio.append(h,el(doc,'p','guest-position',row.position));
 (row.bio||'').split(/\n\s*\n/).filter(Boolean).forEach((p,i)=>bio.append(el(doc,'p',i===0?'guest-intro':'',p)));section.append(fig,bio);return section;
}
export function guestDirectoryEntry(row,base,doc=document){const a=el(doc,'a');a.href='#'+row.slug;const photo=el(doc,'span','people-photo');if(safeMediaURL(row.image_url,base)){const img=el(doc,'img');img.src=row.image_url;img.alt='';img.loading='lazy';img.dataset.photoSlot='guest-'+row.slug+'-directory';photo.append(img);}const text=el(doc,'span');text.append(el(doc,'small','',row.role),el(doc,'strong','',row.name));const arrow=el(doc,'b','','↗');arrow.setAttribute('aria-hidden','true');a.append(photo,text,arrow);return a;}
export function galleryTemplate(row,base,doc=document){
 if(!safeMediaURL(row.image_url,base))return null;
 const fig=el(doc,'figure','photo-card');fig.dataset.photoCategory=row.category;fig.dataset.collectionTable='elan_media';fig.dataset.collectionRecord=row.id;
 const button=el(doc,'button','photo-open');button.type='button';button.setAttribute('aria-label','View photo: '+(row.alt_text||row.category||'Élan Summit'));
 const img=el(doc,'img');img.src=row.image_url;img.alt=row.alt_text;img.loading='lazy';img.width=900;img.height=600;img.dataset.photoSlot='gallery-'+row.id;
 const arrow=el(doc,'span','','↗');arrow.setAttribute('aria-hidden','true');button.append(img,arrow);
 fig.append(button);if(row.credit){const credit=el(doc,'figcaption','photo-credit',row.credit);fig.append(credit);}return fig;
}
