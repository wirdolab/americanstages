/* =========================================================
   AMERICAN STAGES — Property Management lead funnel
   (pm-get-started.html only; page-specific so other pages
   don't pay for this JS). Posts to /api/lead (Cloudflare Pages
   Function) — see functions/api/lead.js for scoring + delivery.
   ========================================================= */
(function(){
  "use strict";

  var form = document.getElementById('pmForm');
  if (!form) return; // safety: only run on the funnel page

  var PHONE = '8058190911';
  var TOTAL_STEPS = 5;
  var currentStep = 1;
  var answers = {};
  var contactStartedFired = false;
  var submitting = false;

  /* ---------- tiny helpers ---------- */
  function lang(){ return localStorage.getItem('as_lang') === 'es' ? 'es' : 'en'; }
  function t(en, es){ return lang() === 'es' ? es : en; }
  function track(name, params){
    try { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); } catch(e){}
  }
  function trackPixel(name, isStandard){
    try {
      if (typeof window.fbq !== 'function') return;
      if (isStandard) window.fbq('track', name);
      else window.fbq('trackCustom', name);
    } catch(e){}
  }
  function isTestMode(){
    return new URLSearchParams(window.location.search).get('test') === '1';
  }

  /* ---------- session persistence (survive refresh / back) ---------- */
  function saveState(){
    try {
      sessionStorage.setItem('pm_funnel_answers', JSON.stringify(answers));
      sessionStorage.setItem('pm_funnel_step', String(currentStep));
      sessionStorage.setItem('pm_funnel_started', '1');
    } catch(e){}
  }
  function restoreState(){
    try {
      var saved = sessionStorage.getItem('pm_funnel_answers');
      var step = sessionStorage.getItem('pm_funnel_step');
      var started = sessionStorage.getItem('pm_funnel_started');
      if (saved) answers = JSON.parse(saved);
      if (started === '1') {
        showFunnel(false);
        if (step) goToStep(parseInt(step, 10) || 1);
        // repopulate any text fields already answered
        if (answers.propertyAddress) document.getElementById('pmAddress').value = answers.propertyAddress;
        if (answers.city) document.getElementById('pmCity').value = answers.city;
        if (answers.zip) document.getElementById('pmZip').value = answers.zip;
        ['propertyType','currentSituation','timeline'].forEach(function(group){
          if (answers[group]) markSelected(group, answers[group]);
        });
      }
    } catch(e){}
  }
  function clearState(){
    try {
      sessionStorage.removeItem('pm_funnel_answers');
      sessionStorage.removeItem('pm_funnel_step');
      sessionStorage.removeItem('pm_funnel_started');
    } catch(e){}
  }

  /* ---------- entry point ---------- */
  track('pm_funnel_view');
  var startBtn = document.getElementById('pmStartBtn');
  function showFunnel(fireStarted){
    var hero = document.getElementById('pmHero');
    if (hero) hero.style.display = 'none';
    if (startBtn) startBtn.style.display = 'none';
    form.style.display = '';
    if (fireStarted) {
      track('pm_funnel_started');
      trackPixel('PMFunnelStart');
    }
  }
  if (startBtn) {
    startBtn.addEventListener('click', function(){
      showFunnel(true);
      saveState();
    });
  }

  /* ---------- step navigation ---------- */
  function goToStep(n){
    currentStep = Math.max(1, Math.min(TOTAL_STEPS, n));
    document.querySelectorAll('.funnel-step').forEach(function(el){
      el.classList.toggle('active', parseInt(el.getAttribute('data-step'), 10) === currentStep);
    });
    var label = document.getElementById('pmProgressLabel');
    var fill = document.getElementById('pmProgressFill');
    if (label) label.textContent = t('Step ', 'Paso ') + currentStep + t(' of ', ' de ') + TOTAL_STEPS;
    if (fill) fill.style.width = ((currentStep / TOTAL_STEPS) * 100) + '%';
    if (currentStep === 5 && !contactStartedFired) {
      contactStartedFired = true;
      track('pm_contact_started');
    }
    saveState();
  }

  document.querySelectorAll('[data-back]').forEach(function(btn){
    btn.addEventListener('click', function(){ goToStep(currentStep - 1); });
  });

  function markSelected(group, value){
    var container = document.querySelector('.option-cards[data-group="' + group + '"]');
    if (!container) return;
    container.querySelectorAll('.option-card').forEach(function(card){
      card.classList.toggle('selected', card.getAttribute('data-value') === value);
    });
  }

  document.querySelectorAll('.option-card').forEach(function(card){
    card.addEventListener('click', function(){
      var group = card.closest('.option-cards').getAttribute('data-group');
      var value = card.getAttribute('data-value');
      answers[group] = value;
      markSelected(group, value);
      track('pm_step_' + currentStep + '_completed', { value: value });
      saveState();
      setTimeout(function(){ goToStep(currentStep + 1); }, 180); // brief visual feedback before advancing
    });
  });

  /* ---------- validation ---------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function showError(id, show){
    var el = document.getElementById(id);
    if (el) el.style.display = show ? '' : 'none';
  }

  function validateStep1(){
    var address = document.getElementById('pmAddress').value.trim();
    var city = document.getElementById('pmCity').value.trim();
    var zip = document.getElementById('pmZip').value.trim();
    if (!address || !city || !zip) { showError('pmError1', true); return false; }
    showError('pmError1', false);
    answers.propertyAddress = address;
    answers.city = city;
    answers.zip = zip;
    return true;
  }

  function validateStep5(){
    var firstName = document.getElementById('pmFirstName').value.trim();
    var lastName = document.getElementById('pmLastName').value.trim();
    var email = document.getElementById('pmEmail').value.trim();
    var phone = document.getElementById('pmPhone').value.trim();
    var consent = document.getElementById('pmConsent').checked;
    var phoneDigits = phone.replace(/\D/g, '');
    if (!firstName || !lastName || !EMAIL_RE.test(email) || phoneDigits.length < 10 || !consent) {
      showError('pmError5', true);
      return false;
    }
    showError('pmError5', false);
    answers.firstName = firstName;
    answers.lastName = lastName;
    answers.email = email;
    answers.phone = phone;
    answers.consent = consent;
    return true;
  }

  /* ---------- final submission ---------- */
  function showConfirm(temperature){
    form.style.display = 'none';
    var ids = { HOT: 'pmConfirmHot', WARM: 'pmConfirmWarm', NURTURE: 'pmConfirmNurture' };
    var el = document.getElementById(ids[temperature] || 'pmConfirmNurture');
    if (el) el.classList.add('active');
  }

  function wireBooking(temperature, bookingUrl){
    var idMap = { HOT: 'pmBookHot', WARM: 'pmBookWarm' };
    var linkId = idMap[temperature];
    if (!linkId) return;
    var link = document.getElementById(linkId);
    if (!link) return;
    if (bookingUrl) {
      link.href = bookingUrl;
      link.target = '_blank';
      link.rel = 'noopener';
    } else {
      link.href = 'tel:' + PHONE;
      link.textContent = t('Request a Call', 'Solicitar una Llamada');
    }
    link.addEventListener('click', function(){
      track('pm_booking_clicked');
    });
  }

  function submitLead(){
    if (submitting) return;
    submitting = true;
    var btn = form.querySelector('.funnel-step.active button[type="submit"]');
    if (btn) btn.disabled = true;

    var utm = (typeof window.asUTM === 'function') ? window.asUTM() : {};
    var payload = Object.assign({}, answers, utm, {
      landingPage: (utm && utm.landingPage) || window.location.pathname,
      testMode: isTestMode(),
      botcheck: (form.querySelector('[name="botcheck"]') || {}).value || ''
    });

    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timeoutId = controller ? setTimeout(function(){ controller.abort(); }, 10000) : null;

    fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined
    }).then(function(res){
      if (timeoutId) clearTimeout(timeoutId);
      if (!res.ok) throw new Error('Lead submission failed');
      return res.json();
    }).then(function(data){
      submitting = false;
      if (btn) btn.disabled = false;
      track('pm_lead_submitted', { temperature: data.leadTemperature });
      trackPixel('Lead', true); // only fires on a genuine successful submission
      if (data.leadTemperature === 'HOT') { track('pm_hot_lead'); }
      else if (data.leadTemperature === 'WARM') { track('pm_warm_lead'); }
      else { track('pm_nurture_lead'); }
      wireBooking(data.leadTemperature, data.bookingUrl);
      showConfirm(data.leadTemperature);
      clearState();
    }).catch(function(){
      if (timeoutId) clearTimeout(timeoutId);
      submitting = false;
      if (btn) btn.disabled = false;
      // keep the entered data intact so they can retry without redoing everything
      form.style.display = 'none';
      var errEl = document.getElementById('pmConfirmError');
      if (errEl) errEl.classList.add('active');
    });
  }

  /* ---------- form submit = "Continue" on steps 1 & the final submit on step 5 ---------- */
  form.addEventListener('submit', function(e){
    e.preventDefault();
    if (currentStep === 1) {
      if (validateStep1()) { track('pm_step_1_completed'); goToStep(2); }
    } else if (currentStep === 5) {
      if (validateStep5()) submitLead();
    }
  });

  restoreState();
})();
