export const galleryGroups = ["Venue", "Opening Ceremony", "Day 1 Committee Sessions", "DJ Night", "Day 2 Committee Sessions", "Closing Ceremony", "Felicitations", "Crisis Command", "Cent$ible", "Stage", "People"];

export function setGalleryGroups(rows){galleryGroups.splice(0,galleryGroups.length,...rows.map(r=>r.name));}
export async function loadGalleryGroups(sb){const r=await sb.from('elan_gallery_groups').select('name,sort_order').order('sort_order').order('name');if(r.error)throw Error('Gallery groups could not be loaded. Apply the gallery groups database update and retry.');setGalleryGroups(r.data);return galleryGroups;}
