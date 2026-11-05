import {esc} from './organiser-utils.js';
export const dueLabel=(task,today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()))=>task.due_on?(task.status==='Done'?'Completed · deadline ':task.due_on<today?'Overdue · ':task.due_on===today?'Due today · ':'Due ')+task.due_on:'No deadline set';
export async function leadershipSummary(host,sb){
 const {data,error}=await sb.rpc('elan_oc_summary');if(error){host.textContent='Team summary could not load: '+error.message;return;}
 const depts=[...new Set([...data.tasks,...data.reviews].map(r=>r.department))].sort();
 host.innerHTML='<h2>Across the departments</h2><p>Outstanding tasks and submissions that need a decision.</p><div class="team-summary-grid">'+depts.map(d=>{const t=data.tasks.find(r=>r.department===d)||{},r=data.reviews.find(r=>r.department===d)||{};return '<article class="team-card"><h3>'+esc(d)+'</h3><p>'+Number(t.open||0)+' open tasks · '+Number(t.overdue||0)+' overdue</p><p>'+Number(r.pending||0)+' awaiting approval · '+Number(r.later||0)+' kept for later</p></article>';}).join('')+'</div>'+(depts.length?'':'<p>No department work has been assigned yet.</p>');
}
