const EVENT_TARGET = "2026-09-05T09:00:00+05:30";
const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function showToast(message){
  const toast = qs('.toast');
  if(!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2800);
}

function initMobileMenu(){
  const toggle = qs('.menu-toggle');
  const panel = qs('.nav-panel');
  if(!toggle || !panel) return;

  toggle.addEventListener('click', () => {
    const open = panel.classList.toggle('open');
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });

  qsa('.nav-link, .nav-cta').forEach(link => {
    link.addEventListener('click', () => {
      panel.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

function initCountdown(){
  const countdownGroups = [
    ['days', 'hours', 'minutes', 'seconds'],
    ['navDays', 'navHours', 'navMinutes', 'navSeconds']
  ]
    .map(group => group.map(id => qs('#' + id)))
    .filter(group => group.every(Boolean));

  if(!countdownGroups.length) return;

  const update = () => {
    const target = new Date(EVENT_TARGET).getTime();
    const now = Date.now();
    const distance = Math.max(0, target - now);

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    countdownGroups.forEach(group => {
      [days, hours, minutes, seconds].forEach((value, i) => {
        group[i].textContent = String(value).padStart(2, '0');
      });
    });
  };

  update();
  window.setInterval(update, 1000);
}

function initStickyNav(){
  const nav = qs('.site-nav');
  if(!nav) return;

  const update = () => {
    nav.classList.toggle('scrolled', window.scrollY > 70);
  };

  update();
  window.addEventListener('scroll', update, {passive:true});
}

function initReveal(){
  const items = qsa('.reveal');
  if(!items.length) return;

  const revealAllFallback = window.setTimeout(() => {
    items.forEach(el => el.classList.add('visible'));
  }, 1600);

  if(!('IntersectionObserver' in window)){
    window.clearTimeout(revealAllFallback);
    items.forEach(el => el.classList.add('visible'));
    return;
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, {threshold: 0.08, rootMargin: '0px 0px -40px'});

  items.forEach(el => io.observe(el));
}

function initFaqs(){
  qsa('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      if(!item) return;
      item.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(item.classList.contains('open')));
    });
  });
}

function initScheduleFilters(){
  const filterButtons = qsa('[data-filter]');
  const cards = qsa('[data-category]');
  if(!filterButtons.length || !cards.length) return;

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      cards.forEach(card => {
        const show = filter === 'All' || card.dataset.category === filter;
        card.style.display = show ? '' : 'none';
      });

      qsa('.schedule-day-heading').forEach(heading => {
        let sibling = heading.nextElementSibling;
        let hasVisibleCard = false;
        while(sibling && !sibling.classList.contains('schedule-day-heading')){
          if(sibling.classList && sibling.classList.contains('schedule-card') && sibling.style.display !== 'none'){
            hasVisibleCard = true;
            break;
          }
          sibling = sibling.nextElementSibling;
        }
        heading.style.display = hasVisibleCard ? '' : 'none';
      });
    });
  });
}

function initPlanButtons(){
  qsa('[data-plan]').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.textContent = 'Added';
      btn.classList.add('btn-teal');
      showToast('Added to your plan for this browser session.');
    });
  });
}

function getFieldLabel(field){
  const wrapper = field.closest('.field');
  const label = wrapper ? wrapper.querySelector('label') : null;
  return label ? label.textContent.trim() : 'This field';
}

function setFieldError(field, message){
  const wrapper = field.closest('.field');
  if(!wrapper) return;
  wrapper.classList.add('has-error');
  field.setAttribute('aria-invalid', 'true');
  let error = wrapper.querySelector('.field-error');
  if(!error){
    error = document.createElement('div');
    error.className = 'field-error';
    wrapper.appendChild(error);
  }
  error.textContent = message;
}

function clearFieldError(field){
  const wrapper = field.closest('.field');
  if(!wrapper) return;
  wrapper.classList.remove('has-error');
  field.removeAttribute('aria-invalid');
  const error = wrapper.querySelector('.field-error');
  if(error) error.textContent = '';
}

function validateField(field){
  clearFieldError(field);
  const label = getFieldLabel(field);
  const value = (field.value || '').trim();
  const validator = field.dataset.validate || field.type || field.tagName.toLowerCase();
  const required = field.required;

  if(field.type === 'checkbox'){
    if(required && !field.checked){
      setFieldError(field, 'Please confirm this before submitting.');
      return false;
    }
    return true;
  }

  if(required && !value){
    setFieldError(field, `${label} is required.`);
    return false;
  }

  if(!required && !value) return true;

  if(validator === 'name'){
    const namePattern = /^[A-Za-zÀ-ž .'-]{2,80}$/;
    if(!namePattern.test(value) || value.split(/\s+/).length < 2){
      setFieldError(field, `${label} must be a valid full name with letters and spaces.`);
      return false;
    }
  }

  if(validator === 'email' || field.type === 'email'){
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if(!emailPattern.test(value)){
      setFieldError(field, 'Enter a valid email address.');
      return false;
    }
  }

  if(validator === 'phone' || field.type === 'tel'){
    const digits = value.replace(/\D/g, '');
    if(digits.length < 10 || digits.length > 15){
      setFieldError(field, 'Enter a valid phone number with 10 to 15 digits.');
      return false;
    }
  }

  if(validator === 'integer' || field.type === 'number'){
    const num = Number(value);
    const min = field.min !== '' ? Number(field.min) : null;
    const max = field.max !== '' ? Number(field.max) : null;
    if(!Number.isInteger(num)){
      setFieldError(field, `${label} must be a whole number.`);
      return false;
    }
    if(min !== null && num < min){
      setFieldError(field, `${label} must be at least ${min}.`);
      return false;
    }
    if(max !== null && num > max){
      setFieldError(field, `${label} must be ${max} or less.`);
      return false;
    }
  }

  if(validator === 'select'){
    if(!value){
      setFieldError(field, `Please select ${label.toLowerCase()}.`);
      return false;
    }
  }

  if(validator === 'text'){
    const min = field.minLength > 0 ? field.minLength : 2;
    if(value.length < min){
      setFieldError(field, `${label} must be at least ${min} characters.`);
      return false;
    }
  }

  if(validator === 'textarea'){
    const min = field.minLength > 0 ? field.minLength : 10;
    if(value.length < min){
      setFieldError(field, `${label} must be at least ${min} characters.`);
      return false;
    }
  }

  if(value.length > 0 && field.maxLength > 0 && value.length > field.maxLength){
    setFieldError(field, `${label} must be ${field.maxLength} characters or less.`);
    return false;
  }

  return true;
}

function validateForm(form){
  const fields = qsa('input, select, textarea', form).filter(field => !field.disabled && field.type !== 'hidden');
  let firstInvalid = null;

  fields.forEach(field => {
    const valid = validateField(field);
    if(!valid && !firstInvalid) firstInvalid = field;
  });

  if(firstInvalid){
    firstInvalid.focus({preventScroll:false});
    return false;
  }
  return true;
}

/* ------------------------------------------------------------------ *
 *  Ticket availability — MANUAL CONTROL.
 *
 *  Set a tier to true to open it, false to close it, then redeploy.
 *  No dates are involved: tickets open and close only when changed here.
 * ------------------------------------------------------------------ */
const TICKET_OPEN = {
  early:    false,   // Early Bird        — ₹3,699 (CLOSED, window has passed)
  standard: true,    // Standard          — ₹4,199 (includes stay + transport)
  late:     false,   // Late Registration — ₹4,899 (includes stay + transport)
  day:      true     // Day Delegate      — ₹2,800 (no stay, no transport)
};

// Tiers listed here read "Sold out" instead of "Currently closed" when shut:
// their window has passed and will not reopen.
const TICKET_SOLD_OUT = ['early'];

function isTierOpen(tier){ return TICKET_OPEN[tier] === true; }
function tierClosedLabel(tier){ return TICKET_SOLD_OUT.indexOf(tier) !== -1 ? 'Sold out' : 'Currently closed'; }

function initTicketAvailability(){
  const cards = qsa('.price-card[data-tier]');
  if(!cards.length) return;
  const ticketSelect = qs('#ticketType');
  let anyOpen = false;

  cards.forEach(card => {
    const open = isTierOpen(card.dataset.tier);
    if(open) anyOpen = true;
    card.classList.toggle('tier-closed', !open);
    card.classList.toggle('tier-soldout', !open && TICKET_SOLD_OUT.indexOf(card.dataset.tier) !== -1);

    const btn = qs('.btn[data-ticket]', card);
    if(btn){
      if(open){
        btn.classList.remove('is-disabled');
        btn.removeAttribute('aria-disabled');
        btn.dataset.locked = 'false';
        btn.textContent = 'Select';
      } else {
        btn.classList.add('is-disabled');
        btn.setAttribute('aria-disabled', 'true');
        btn.dataset.locked = 'true';
        btn.textContent = tierClosedLabel(card.dataset.tier);
      }
    }
  });

  // Match the dropdown options to the same settings.
  if(ticketSelect){
    Array.from(ticketSelect.options).forEach(opt => {
      if(!opt.dataset.tier) return;
      opt.disabled = !isTierOpen(opt.dataset.tier);
    });
    const sel = ticketSelect.selectedOptions[0];
    if(sel && sel.disabled) ticketSelect.value = '';
  }

  // If no tier is open, close the form and explain why.
  const form = qs('form[data-form="registration"]');
  const closedNote = qs('#regClosedNote');
  if(!anyOpen){
    if(ticketSelect) ticketSelect.disabled = true;
    if(form){ const s = qs('button[type="submit"]', form); if(s) s.disabled = true; }
    if(closedNote){ closedNote.textContent = 'Registration is currently closed.'; closedNote.hidden = false; }
  } else if(closedNote){
    closedNote.hidden = true;
  }
}

function initTicketSelectors(){
  const ticketSelect = qs('#ticketType');
  const registration = qs('#registration');
  if(!ticketSelect) return;

  qsa('[data-ticket]').forEach(button => {
    button.addEventListener('click', event => {
      if(button.dataset.locked === 'true' || button.classList.contains('is-disabled')){
        event.preventDefault();
        showToast('This pass is not open for registration right now.');
        return;
      }
      const ticket = button.dataset.ticket;
      const option = Array.from(ticketSelect.options).find(opt => opt.textContent.trim() === ticket || opt.value.trim() === ticket);
      if(option){
        ticketSelect.value = option.value;
        clearFieldError(ticketSelect);
        showToast(`${ticket.split(' · ')[0]} selected in the registration form.`);
      }
      if(registration){
        window.setTimeout(() => registration.scrollIntoView({behavior:'smooth', block:'start'}), 40);
      }
    });
  });
}

/* ------------------------------------------------------------------ *
 *  Supabase persistence
 *  Loaded only on pages that include supabase-js + config.js (the four
 *  form pages). On every other page these helpers stay dormant.
 * ------------------------------------------------------------------ */
let _elanClient = null;
function elanClient(){
  if(_elanClient) return _elanClient;
  const cfg = window.ELAN_CONFIG;
  const sb = window.supabase;
  if(!cfg || !sb || !cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes('YOUR-')) return null;
  _elanClient = sb.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  return _elanClient;
}

// Read a field by id. Checkboxes return a boolean; everything else a trimmed string.
const fieldVal = id => {
  const el = qs('#' + id);
  if(!el) return null;
  return el.type === 'checkbox' ? el.checked : (el.value || '').trim();
};
const fieldInt = id => {
  const n = Number(fieldVal(id));
  return Number.isFinite(n) ? n : null;
};
// "Student Early Bird · ₹1,999" -> 1999
function parseTicketAmount(label){
  if(!label) return null;
  const m = String(label).replace(/[,\s]/g, '').match(/₹(\d+)/);
  return m ? Number(m[1]) : null;
}

// Maps each data-form to its target table + row payload.
const FORM_BUILDERS = {
  registration(){
    const unit = parseTicketAmount(fieldVal('ticketType'));
    const qty = fieldInt('quantity') || 1;
    const _flag = fieldVal('flagshipChoice');
    const _theme = fieldVal('centsibleTheme');
    const _tag = _flag ? ('[Flagship: ' + _flag + (_flag === 'Cent$ible' && _theme ? ' — ' + _theme : '') + '] ') : '';
    const _userNotes = fieldVal('notes') || '';
    return { table: 'registrations', row: {
      full_name: fieldVal('fullName'),
      email: fieldVal('email'),
      phone: fieldVal('phone'),
      school: fieldVal('school'),
      ticket_type: fieldVal('ticketType'),
      quantity: qty,
      unit_amount: unit,
      amount: unit != null ? unit * qty : null,
      notes: (_tag + _userNotes).trim() || null,
      consent: fieldVal('consent') === true
    }};
  },
  contact(){
    return { table: 'contact_messages', row: {
      full_name: fieldVal('contactName'),
      email: fieldVal('contactEmail'),
      phone: fieldVal('contactPhone'),
      inquiry_type: fieldVal('inquiryType'),
      message: fieldVal('message')
    }};
  },
  school(){
    return { table: 'school_inquiries', row: {
      school_name: fieldVal('schoolName'),
      coordinator_name: fieldVal('coordinatorName'),
      coordinator_email: fieldVal('coordinatorEmail'),
      coordinator_phone: fieldVal('coordinatorPhone'),
      estimated_students: fieldInt('estimatedStudents'),
      interest: fieldVal('interest'),
      notes: fieldVal('schoolNotes') || null
    }};
  },
  volunteer(){
    return { table: 'volunteer_applications', row: {
      full_name: fieldVal('volName'),
      email: fieldVal('volEmail'),
      phone: fieldVal('volPhone'),
      school: fieldVal('volSchool'),
      role: fieldVal('volRole'),
      commitment: fieldVal('commitment'),
      motivation: fieldVal('whyVolunteer')
    }};
  }
};

// UPI payment page — receives the registrant's details so the QR pre-fills
// their exact amount. (Previously: Easebuzz school form.)
function selectedTicketPayUrl(){
  const unit = parseTicketAmount(fieldVal('ticketType'));
  const qty = fieldInt('quantity') || 1;
  const amt = unit != null ? unit * qty : 0;
  const p = new URLSearchParams({
    amt: String(amt || ''),
    t: fieldVal('ticketType') || '',
    q: String(qty),
    n: fieldVal('fullName') || '',
    p: fieldVal('phone') || '',
    e: fieldVal('email') || ''
  });
  return 'pay.html?' + p.toString();
}

async function submitForm(form){
  // Honeypot: bots fill hidden fields humans never see -> silently accept + drop.
  const hp = qs('input[name="elan_hp"]', form);
  if(hp && hp.value.trim() !== '') return { ok: true, dropped: true };

  const builder = FORM_BUILDERS[form.dataset.form];
  if(!builder) return { ok: false, reason: 'unknown-form' };

  const client = elanClient();
  if(!client) return { ok: false, reason: 'no-config' };

  const { table, row } = builder();
  const { error } = await client.from(table).insert(row);
  return error ? { ok: false, reason: error.message } : { ok: true };
}

function initFlagshipChoice(){
  const flag = document.getElementById('flagshipChoice');
  const field = document.getElementById('centsibleThemeField');
  const theme = document.getElementById('centsibleTheme');
  if(!flag || !field || !theme) return;
  const sync = () => {
    const isCent = flag.value === 'Cent$ible';
    field.style.display = isCent ? '' : 'none';
    if(isCent){ theme.setAttribute('data-validate','select'); theme.setAttribute('required',''); }
    else { theme.removeAttribute('data-validate'); theme.removeAttribute('required'); theme.value = ''; }
  };
  flag.addEventListener('change', sync);
  sync();
}

function initForms(){
  qsa('form[data-form]').forEach(form => {
    qsa('input, select, textarea', form).forEach(field => {
      field.addEventListener('input', () => validateField(field));
      field.addEventListener('change', () => validateField(field));
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();

      if(!validateForm(form)){
        showToast('Please correct the highlighted fields before submitting.');
        return;
      }

      const submitBtn = qs('button[type="submit"]', form);
      const originalLabel = submitBtn ? submitBtn.textContent : '';
      if(submitBtn){ submitBtn.disabled = true; submitBtn.textContent = 'Submitting…'; }

      let result;
      try {
        result = await submitForm(form);
      } catch (err) {
        result = { ok: false, reason: (err && err.message) || 'network' };
      }

      if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = originalLabel; }

      if(!result.ok){
        showToast(result.reason === 'no-config'
          ? 'Form not connected yet. Add your Supabase keys in assets/js/config.js.'
          : 'Something went wrong. Please try again in a moment.');
        return;
      }

      // Registration: saved as 'pending' above — now route to Easebuzz payment.
      // The row is confirmed ('paid') only by the server-side webhook, never here.
      if(form.dataset.form === 'registration'){
        const payUrl = selectedTicketPayUrl();
        const regSuccess = form.parentElement.querySelector('.form-success') || form.querySelector('.form-success');
        if(regSuccess) regSuccess.classList.add('show');
        if(payUrl){
          showToast('Registration saved. Redirecting to secure payment…');
          window.setTimeout(() => { window.location.href = payUrl; }, 1000);
        } else {
          showToast('Registration saved. Please complete payment to confirm your spot.');
        }
        return; // do not reset/clear — leave details intact while we redirect
      }

      const success = form.parentElement.querySelector('.form-success') || form.querySelector('.form-success');
      if(success) success.classList.add('show');
      form.reset();
      qsa('.has-error', form).forEach(wrapper => wrapper.classList.remove('has-error'));
      qsa('[aria-invalid="true"]', form).forEach(field => field.removeAttribute('aria-invalid'));
      showToast('Submitted. The Élan team will follow up with next steps.');
    });
  });
}

function initFaqSearch(){
  const search = qs('#faqSearch');
  if(!search) return;
  const items = qsa('.faq-item');

  search.addEventListener('input', () => {
    const term = search.value.trim().toLowerCase();
    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(term) ? '' : 'none';
    });
  });
}

function initActionButtons(){
  qsa('[data-toast]').forEach(el => {
    el.addEventListener('click', e => {
      if(el.getAttribute('href') === '#') e.preventDefault();
      showToast(el.dataset.toast || 'Action received.');
    });
  });
}

function initPageTransitions(){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  qsa('a[href$=".html"]').forEach(link => {
    link.addEventListener('click', e => {
      if(link.target || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const url = link.getAttribute('href');
      if(!url || url.startsWith('http') || url.startsWith('mailto') || url.startsWith('tel')) return;

      e.preventDefault();
      document.body.style.opacity = '.55';
      document.body.style.transform = 'translateY(4px)';
      window.setTimeout(() => { window.location.href = url; }, 120);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('js-enabled');
  initMobileMenu();
  initStickyNav();
  initFlagshipChoice();
  initCountdown();
  initReveal();
  initFaqs();
  initScheduleFilters();
  initPlanButtons();
  initTicketSelectors();
  initTicketAvailability();
  initForms();
  initFaqSearch();
  initActionButtons();
  initPageTransitions();
});
