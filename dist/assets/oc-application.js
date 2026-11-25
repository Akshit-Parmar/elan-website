export const questions={
 'HR (Human Resource)':'A team member has missed two meetings and their department head is frustrated. How would you understand the situation, agree next steps and handle their information responsibly?',
 Finance:'Several people are collecting payments and making purchases. How would you keep the records complete and easy to check?',
 'Social Media':'Suggest a post that would make a student interested in Élan. What would it say or show, and why?',
 Design:'Explain a piece of design work you have made, or describe an idea for Élan. What would you choose and why?',
 Sponsorship:'How would you approach a potential sponsor, and what could you offer them?',
 Outreach:'Write a short introduction to a school that has never heard of Élan.',
 Documentation:'How would you record decisions so the team knows what was agreed and who is responsible?',
 'Campus Ambassadors':'How would you reach interested students at your institution?',
 Logistics:'Transport is delayed just before a session. What would you do first?',
 'Crisis Command':'Suggest a short crisis scenario and explain what decisions participants would face.'
};
export function setupApplication(form){
 const steps=[...form.querySelectorAll('[data-step]')],back=form.querySelector('[data-back]'),next=form.querySelector('[data-next]'),submit=form.querySelector('[type=submit]'),indicators=[...document.querySelectorAll('[data-steps] li')];
 let current=0,dirty=false;
 const key='elan-oc-draft-2027-v1',age=7*24*60*60*1000;
 const banner=document.createElement('div');banner.className='application-draft';banner.innerHTML='<p role="status" data-draft-status>Your progress is saved on this device for 7 days. Avoid shared devices.</p><button type="button" data-clear-draft>Clear saved progress</button>';form.prepend(banner);
 const draftStatus=banner.querySelector('[data-draft-status]');
 let draft=null;try{draft=JSON.parse(window.localStorage.getItem(key));if(!draft||Date.now()-draft.at>age){window.localStorage.removeItem(key);draft=null;}}catch{}
 if(draft?.values){for(const [name,value] of Object.entries(draft.values)){const el=form.elements.namedItem(name);if(el&&el.type!=='hidden'&&el.type!=='checkbox'&&el.type!=='password'&&el.name!=='elan_hp'&&typeof value==='string')el.value=value;}form.dataset.submissionId=draft.id||'';draftStatus.textContent='Your saved progress has been restored. Check your answers before submitting.';}
 const save=()=>{if(form.dataset.completed==='true')return;const values={};for(const el of form.querySelectorAll('input,select,textarea'))if(el.name&&!['hidden','checkbox','password','file'].includes(el.type)&&!['elan_hp','cf-turnstile-response'].includes(el.name))values[el.name]=el.value;try{window.localStorage.setItem(key,JSON.stringify({at:Date.now(),values,id:form.dataset.submissionId||''}));draftStatus.textContent='Progress saved on this device. Your application has not been submitted.';}catch{draftStatus.textContent='This browser cannot save progress. Keep this page open until you submit.';}};
 form.saveDraft=save;
 form.addEventListener('input',save);form.addEventListener('change',save);
 banner.querySelector('button').onclick=()=>{if(!window.confirm('Clear your saved answers on this device?'))return;try{window.localStorage.removeItem(key);}catch{}for(const el of form.querySelectorAll('input,select,textarea'))if(el.type!=='hidden'){if(el.type==='checkbox')el.checked=false;else el.value='';}delete form.dataset.submissionId;dirty=false;conditional();show(0);draftStatus.textContent='Saved progress cleared. You can start again.';};
 form.addEventListener('reset',()=>{try{window.localStorage.removeItem(key);}catch{}banner.hidden=true;});
 form.addEventListener('input',()=>{dirty=true;});
 window.addEventListener('beforeunload',e=>{if(dirty&&form.dataset.completed!=='true'){e.preventDefault();e.returnValue='';}});
 function validateStep(i){const bad=[...steps[i].querySelectorAll('input,select,textarea')].find(e=>!e.disabled&&!e.checkValidity());if(bad){show(i);bad.reportValidity();return false;}return true;}
 function show(i){current=i;form.querySelector("[data-step-count]").textContent=String(i+1).padStart(2,"0")+" / 06";form.querySelector("[data-progress]").style.width=((i+1)/steps.length*100)+"%";steps.forEach((s,n)=>s.hidden=n!==i);indicators.forEach((el,n)=>{if(n===i)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});back.hidden=i===0;next.hidden=i===steps.length-1;submit.hidden=i!==steps.length-1;const legend=steps[i].querySelector('legend');legend.tabIndex=-1;legend.focus({preventScroll:true});}
 function conditional(){const f=form.elements,head=f.responsibility_level.value!=='Team member'&&!!f.responsibility_level.value;form.querySelector('[data-leadership]').hidden=!head;f.leadership_answer.disabled=!head;f.leadership_answer.required=head;const q=questions[f.department.value]||'Choose a department in the previous step.';form.querySelector('[data-question]').textContent=q;f.department_question.value=q;f.second_department.setCustomValidity(f.department.value&&f.second_department.value===f.department.value?'Choose a different second department.':'');}
 form.addEventListener('change',conditional);
 function review(){const box=form.querySelector('[data-review]');box.replaceChildren();steps.slice(0,-1).forEach((s,i)=>{const d=document.createElement('details');d.open=true;const title=document.createElement('summary');title.textContent=indicators[i].textContent;d.append(title);for(const input of s.querySelectorAll('input,select,textarea')){if(input.disabled||input.type==='hidden')continue;const p=document.createElement('p'),b=document.createElement('strong');b.textContent=(input.closest('label')?.childNodes[0]?.textContent||input.name)+': ';p.append(b,document.createTextNode(input.value||'Not provided'));d.append(p);}const edit=document.createElement('button');edit.type='button';edit.textContent='Edit '+indicators[i].textContent;edit.onclick=()=>show(i);d.append(edit);box.append(d);});}
 back.onclick=()=>show(Math.max(0,current-1));next.onclick=()=>{conditional();if(validateStep(current)){if(current===steps.length-2)review();show(current+1);}};
 form.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'&&current<steps.length-1){e.preventDefault();next.click();}});
 form.validateApplication=()=>{conditional();for(let i=0;i<steps.length;i++)if(!validateStep(i))return false;return true;};
 form.addEventListener('reset',()=>{form.querySelectorAll('fieldset,.oc-form-actions').forEach(x=>x.hidden=true);form.dataset.completed='true';form.querySelectorAll('.oc-form-top,.oc-progress-track,.oc-required-note').forEach(x=>x.hidden=true);});
 conditional();show(0);
}
