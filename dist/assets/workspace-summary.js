import {esc} from './organiser-utils.js';
export const dueLabel=(task,today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()))=>task.due_on?(task.status==='Done'?'Completed · deadline ':task.due_on<today?'Overdue · ':task.due_on===today?'Due today · ':'Due ')+task.due_on:'No deadline set';
export async function leadershipSummary(host,sb){
 const {data,error}=await sb.rpc('elan_oc_summary');if(error){host.textContent='Team summary could not load: '+error.message;return;}
 const depts=[...new Set([...data.tasks,...data.reviews].map(r=>r.department))].sort();
 host.innerHTML='<h2>Across the departments</h2><p>Outstanding tasks and submissions that need a decision.</p><div class="team-summary-grid">'+depts.map(d=>{const t=data.tasks.find(r=>r.department===d)||{},r=data.reviews.find(r=>r.department===d)||{};return '<article class="team-card"><h3>'+esc(d)+'</h3><p>'+Number(t.open||0)+' open tasks · '+Number(t.overdue||0)+' overdue</p><p>'+Number(r.pending||0)+' awaiting approval · '+Number(r.later||0)+' kept for later</p></article>';}).join('')+'</div>'+(depts.length?'':'<p>No department work has been assigned yet.</p>');
}

export function interviewClashes(reviews,now=Date.now()){
 const active=reviews.filter(r=>r.stage==='interview'&&r.interview_published&&Date.parse(r.interview_at)>now),clashes=new Set();
 for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
  const a=active[i],b=active[j],at=Date.parse(a.interview_at),bt=Date.parse(b.interview_at);
  const assigned=a.interviewer_ids?.length&&b.interviewer_ids?.length;
  const shared=assigned?a.interviewer_ids.some(id=>b.interviewer_ids.includes(id)):at===bt;
  if(shared&&at<bt+(b.duration_minutes||30)*60000&&bt<at+(a.duration_minutes||30)*60000){clashes.add(a.enquiry_id);clashes.add(b.enquiry_id);}
 }
 return clashes;
}
export async function recruitmentPriorities(host,sb,applications,isCurrent=()=>true){
 host.innerHTML='<p role="status">Loading recruitment priorities…</p>';
 try{
  const {allTable}=await import('./organiser-utils.js');
  const [reviews,mail,assignments,acknowledgements]=await Promise.all(['elan_oc_recruitment','elan_application_mail','elan_review_assignments','elan_acknowledgements'].map(t=>allTable(sb,t)));
  if(!isCurrent())return;
  const saved=new Map(reviews.map(r=>[r.enquiry_id,r])),ids=new Set(applications.map(a=>a.id));
  const clashes=interviewClashes(reviews.filter(r=>ids.has(r.enquiry_id)));
  const review=applications.filter(a=>['new','under_review'].includes(saved.get(a.id)?.stage||'new')).length;
  const failed=new Set([...mail.filter(m=>['failed','uncertain'].includes(m.status)||(m.status==='pending'&&Date.parse(m.created_at)<Date.now()-1800000)),...acknowledgements.filter(m=>['failed','unconfigured'].includes(m.status))].filter(m=>ids.has(m.enquiry_id)).map(m=>m.enquiry_id)).size;
  const {overdue}=await import('./recruitment-team.js');
  const late=assignments.filter(a=>ids.has(a.enquiry_id)&&overdue(a,saved.get(a.enquiry_id)?.stage||'new')).length;
  if(!isCurrent())return;
  host.innerHTML='<div class="priority-grid">'+[[review,'Awaiting review'],[failed,'Email needs attention'],[clashes.size,'Interviews at the same time'],[late,'Overdue reviews']].map(([n,label])=>'<button class="secondary" data-priority><strong>'+n+'</strong><span>'+label+'</span></button>').join('')+'</div><p class="priority-help">Interview checks flag identical start times; confirm interviewer availability in OC applications.</p>';
  for(const b of host.querySelectorAll('[data-priority]'))b.onclick=()=>host.closest('section').querySelector('[data-go="oc_applications"]').click();
 }catch{if(isCurrent())host.innerHTML='<p role="status">Recruitment priorities could not load. Open OC applications to retry; other admin tools remain available.</p>';}
}
