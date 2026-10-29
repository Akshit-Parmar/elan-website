const localAssetBase = new URL('.',document.currentScript.src);
function loadLocalScript(name){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL(name,localAssetBase);s.onload=resolve;s.onerror=reject;document.head.append(s);});}
if(document.querySelector('[data-app],form[data-mode="stored-enquiry"]')){
 const notice=document.createElement('p');notice.className='app-status';notice.textContent='Local preview — forms are disabled. You can contact the team by email. See START-HERE.txt for connected mode.';
 const status=document.querySelector('#app-status');if(status){status.textContent=notice.textContent;}else{(document.querySelector('main')||document.body).prepend(notice);}
 document.querySelectorAll('form').forEach(f=>{f.addEventListener('submit',e=>e.preventDefault());f.querySelectorAll('button[type=submit],input[type=submit]').forEach(b=>b.disabled=true);});
}
(() => {
  loadLocalScript("enhancements.js");
loadLocalScript("story.js");
  if(document.querySelector(".elan-journal")) loadLocalScript("journal.js");
  if(document.querySelector(".flagship-editorial")) loadLocalScript("flagships.js");
  if (document.querySelector("#elan-world")) loadLocalScript("motion.js");
  const menu = document.querySelector('.menu-button');
  const mobile = document.querySelector('#mobile-navigation');
  function closeMenu() { if (!menu || !mobile) return; mobile.hidden = true; menu.setAttribute('aria-expanded', 'false'); menu.textContent = 'Menu +'; }
  menu?.addEventListener('click', () => { const opening = mobile.hidden; mobile.hidden = !opening; menu.setAttribute('aria-expanded', String(opening)); menu.textContent = opening ? 'Close −' : 'Menu +'; });
  mobile?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !mobile?.hidden) { closeMenu(); menu.focus(); } });
  window.matchMedia('(min-width: 1200px)').addEventListener('change', closeMenu);
  document.addEventListener('click', event => { if (mobile && !mobile.hidden && !event.target.closest('.ed-header')) closeMenu(); });
  document.querySelectorAll('.faq-question').forEach((button, i) => {
    const item = button.closest('.faq-item'); const answer = item.querySelector('.faq-answer');
    if (!answer) return; answer.id ||= 'faq-answer-' + i; button.setAttribute('aria-controls', answer.id);
    button.setAttribute('aria-expanded', String(item.classList.contains('open')));
    button.addEventListener('click', () => { const open = item.classList.toggle('open'); button.setAttribute('aria-expanded', String(open)); });
  });
  const search = document.querySelector('#faqSearch');
  if (search) {
    const empty = document.createElement('p'); empty.className = 'empty-search'; empty.hidden = true; empty.role = 'status'; empty.textContent = 'No matching questions. Try another keyword, or contact the team.'; search.closest('.search-wrap').after(empty);
    search.addEventListener('input', () => { const q = search.value.trim().toLowerCase(); let count = 0; document.querySelectorAll('.faq-item').forEach(item => { item.hidden = !item.textContent.toLowerCase().includes(q); if (!item.hidden) count++; }); document.querySelectorAll('.faq-category').forEach(category => { category.hidden = !Array.from(category.querySelectorAll('.faq-item')).some(item => !item.hidden); }); empty.hidden = count !== 0; });
  }
  document.querySelectorAll('[data-filter]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.classList.contains('active')));
    button.addEventListener('click', () => { const filter = button.dataset.filter; document.querySelectorAll('[data-filter]').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); }); document.querySelectorAll('[data-category]').forEach(card => { card.hidden = filter !== 'All' && card.dataset.category !== filter; }); document.querySelectorAll('.schedule-day-heading').forEach(heading => { let next = heading.nextElementSibling; let visible = false; while (next && !next.classList.contains('schedule-day-heading')) { if (next.classList.contains('schedule-card') && !next.hidden) visible = true; next = next.nextElementSibling; } heading.hidden = !visible; }); });
  });
  document.querySelectorAll('form[data-mode="email-draft"]').forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (form.querySelector('[name="elan_hp"]')?.value) return;
      if (!form.reportValidity()) return;
      const title = form.dataset.form === 'contact' ? 'Élan enquiry' : form.dataset.form === 'school' ? 'Élan school collaboration' : 'Élan volunteer enquiry';
      const lines = [];
      for (const field of form.querySelectorAll('input,select,textarea')) { if (field.type === 'hidden' || field.name === 'elan_hp' || field.disabled) continue; const label = field.id ? form.querySelector('label[for="' + CSS.escape(field.id) + '"]') : null; const value = field.type === 'checkbox' ? (field.checked ? 'Yes' : 'No') : field.value; if (value) lines.push((label?.textContent.trim() || field.name || field.id) + ': ' + value); }
      let draft = form.parentElement.querySelector('.mail-draft'); if (!draft) { draft = document.createElement('div'); draft.className = 'mail-draft'; draft.setAttribute('role', 'status'); form.after(draft); }
      draft.replaceChildren();
      const p = document.createElement('p'); p.textContent = 'Your draft is ready. Nothing has been sent or saved. Open it in your email app, or copy the text below and email the.elan.summit@gmail.com.';
      const a = document.createElement('a'); a.textContent = 'Open email draft ↗'; a.href = 'mailto:the.elan.summit@gmail.com?subject=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(lines.join('\n'));
      const textarea = document.createElement('textarea'); textarea.readOnly = true; textarea.setAttribute('aria-label', 'Email draft text'); textarea.value = title + '\n\n' + lines.join('\n');
      draft.append(p, a, textarea); draft.scrollIntoView({block:'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    });
  });
  document.querySelectorAll('.guest-more').forEach(button => { button.addEventListener('click', () => { const card = button.closest('.guest-card') || button.parentElement; let note = card.querySelector('.guest-preview-note'); if (!note) { note = document.createElement('p'); note.className = 'guest-preview-note'; note.setAttribute('role','status'); note.textContent = 'Confirmed names are not included in the supplied website. Contact the Élan team for guest announcements.'; button.after(note); } note.hidden = false; }); });
})();

// Native disclosure navigation, with keyboard and outside-click dismissal.
(()=>{const groups=[...document.querySelectorAll('.editorial-header .nav-group')];
for(const group of groups)group.addEventListener('toggle',()=>{if(group.open)for(const other of groups)if(other!==group)other.open=false;});
document.addEventListener('click',e=>{for(const group of groups)if(!group.contains(e.target))group.open=false;});
document.addEventListener('keydown',e=>{if(e.key==='Escape')for(const group of groups)if(group.open){group.open=false;group.querySelector('summary').focus();}});
})();