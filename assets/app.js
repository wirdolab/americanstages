/* =========================================================
   AMERICAN STAGES — shared front-end behavior
   Ambient background, scroll reveal, cursor glow,
   hero video loader, footer year, AI chat widget.
   ========================================================= */
(function(){
  "use strict";

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pointerFine = window.matchMedia('(pointer: fine)').matches;

  /* ---------- footer year ---------- */
  document.querySelectorAll('#yr').forEach(function(el){ el.textContent = new Date().getFullYear(); });

  /* ---------- primary nav pill (mirrors the iHomeFinder IDX nav: Home / All
     Listings / Featured Listings / Markets / Contact). Active tab is set by
     <body data-page="..."> on each file. ---------- */
  var NAV_ITEMS = [
    { key: 'home',     href: 'index.html',             label: 'Home',              es: 'Inicio' },
    { key: 'listings', href: 'listings.html',          label: 'All Listings',      es: 'Todas las Propiedades' },
    { key: 'featured', href: 'featured-listings.html', label: 'Featured Listings', es: 'Propiedades Destacadas' },
    { key: 'markets',  href: 'markets.html',           label: 'Markets',           es: 'Mercados' },
    { key: 'contact',  href: 'contact.html',           label: 'Contact',           es: 'Contacto' }
  ];
  var wrap = document.querySelector('.wrap');
  if (wrap) {
    var currentPage = document.body.getAttribute('data-page') || '';
    var nav = document.createElement('nav');
    nav.className = 'nav-pill';
    nav.innerHTML = NAV_ITEMS.map(function(item){
      return '<a href="' + item.href + '" data-es="' + item.es + '"' + (item.key === currentPage ? ' class="active"' : '') + '>' + item.label + '</a>';
    }).join('');
    wrap.prepend(nav);
  }

  /* ---------- compliance badges: Equal Housing Opportunity + REALTOR/MLS.
     Required on every page. Sourced fresh here (not hand-copied per file)
     so it can't drift or get dropped when pages are edited. The Equal
     Housing symbol below is the standard public-domain HUD pictogram; the
     REALTOR(R)/MLS mark is rendered as text — swap in your local MLS
     association's official artwork file if you have one, since that logo
     is trademarked and association-issued. REALTOR(R) itself is
     intentionally left untranslated in the Spanish copy, matching NAR's
     own usage. ---------- */
  var EHO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/><path d="M9 14h6M9 17h6"/></svg>';
  document.querySelectorAll('.foot').forEach(function(foot){
    var badges = document.createElement('div');
    badges.className = 'compliance';
    var ehoBadge = document.createElement('span');
    ehoBadge.className = 'badge';
    ehoBadge.innerHTML = EHO_ICON + '<span>Equal Housing Opportunity</span>';
    ehoBadge.querySelector('span').setAttribute('data-es', 'Igualdad de Oportunidad de Vivienda');
    badges.appendChild(ehoBadge);
    badges.insertAdjacentHTML('beforeend',
      '<span class="badge"><span class="mls">REALTOR&reg;</span></span>' +
      '<span class="badge"><span class="mls">MLS</span></span>');
    foot.appendChild(badges);
  });

  /* ---------- about / disclosure accordion: full brokerage description
     carried over from the previous site's footer. Collapsed by default
     (click "About American Stages" to expand) so it stays out of the way
     on every page without cluttering the footer. ---------- */
  var ABOUT_EN =
    "<p>American Stages Realty &amp; Property Management is the Central Coast partner for buying, selling, leasing, and managing homes across Lompoc, Santa Barbara/Goleta, Santa Maria, San Luis Obispo (SLO), and all of California. Our full-service brokerage and property management team delivers local market expertise, compliant leasing, smart resident screening, high-impact marketing, and transparent owner reporting—so your transaction or rental performs. Whether you're relocating near Vandenberg Space Force Base, listing a home, investing in a rental, or need day-to-day management and maintenance, we combine data-driven pricing with responsive communication to protect value and reduce vacancy. Ready to move with confidence on California's Central Coast? Contact American Stages for a tailored plan that keeps your property—and your goals—on track.</p>" +
    "<p>Whether you're buying your first home, upgrading to your dream property, or selling to begin your next chapter, our brokerage is here to guide you every step of the way. We combine deep local expertise with a personalized approach to make your experience seamless, stress-free, and rewarding. Buyers can count on us to uncover the best opportunities to match their lifestyle and goals, while sellers benefit from our strategic marketing, skilled negotiations, and proven track record of maximizing value. With integrity, dedication, and a true commitment to success, we ensure your real estate journey is handled with care from start to finish.</p>";
  var ABOUT_ES =
    "<p>American Stages Realty &amp; Property Management es el socio de la Costa Central para comprar, vender, arrendar y administrar propiedades en Lompoc, Santa Bárbara/Goleta, Santa María, San Luis Obispo (SLO) y en toda California. Nuestro equipo de bienes raíces y administración de propiedades de servicio completo ofrece experiencia en el mercado local, arrendamiento conforme a la ley, selección inteligente de residentes, marketing de alto impacto y reportes transparentes para el propietario, para que tu transacción o renta rinda resultados. Ya sea que te estés mudando cerca de la Base de la Fuerza Espacial Vandenberg, listando una casa, invirtiendo en una renta, o necesites administración y mantenimiento del día a día, combinamos precios basados en datos con comunicación receptiva para proteger el valor y reducir la vacancia. ¿Listo para avanzar con confianza en la Costa Central de California? Contacta a American Stages para un plan personalizado que mantenga tu propiedad — y tus metas — en curso.</p>" +
    "<p>Ya sea que estés comprando tu primera casa, mejorando a la propiedad de tus sueños, o vendiendo para comenzar tu siguiente capítulo, nuestro equipo está aquí para guiarte en cada paso del camino. Combinamos experiencia local profunda con un enfoque personalizado para que tu experiencia sea fluida, sin estrés y gratificante. Los compradores pueden confiar en que descubriremos las mejores oportunidades para su estilo de vida y metas, mientras que los vendedores se benefician de nuestro marketing estratégico, negociaciones expertas y un historial comprobado de maximizar el valor. Con integridad, dedicación y un compromiso genuino con el éxito, garantizamos que tu experiencia inmobiliaria se maneje con cuidado de principio a fin.</p>";

  document.querySelectorAll('.foot').forEach(function(foot){
    var details = document.createElement('details');
    details.className = 'about-disclosure';
    details.innerHTML =
      '<summary data-es="Sobre American Stages <span class=&quot;chev&quot;>⌄</span>">About American Stages <span class="chev">⌄</span></summary>' +
      '<div class="about-body" data-es="' + ABOUT_ES.replace(/"/g, '&quot;') + '">' + ABOUT_EN + '</div>';
    foot.appendChild(details);
  });

  /* ---------- background: full-page video (home) or light ambient blobs (other pages) ---------- */
  if (document.body.classList.contains('video-page')) {
    var videoBg = document.createElement('div');
    videoBg.className = 'video-bg';
    videoBg.innerHTML =
      '<video id="hero-video" autoplay muted loop playsinline poster="assets/hero-poster.jpg">' +
        '<source src="assets/hero-bg.mp4" type="video/mp4" />' +
      '</video>' +
      '<div class="wash"></div>';
    document.body.prepend(videoBg);

    var heroVideo = document.getElementById('hero-video');
    heroVideo.addEventListener('loadeddata', function(){ heroVideo.classList.add('loaded'); });
    heroVideo.addEventListener('error', function(){ heroVideo.classList.remove('loaded'); });
    // If assets/hero-bg.mp4 is missing or 404s, the gradient in .video-bg stays visible instead.
  } else {
    var ambient = document.createElement('div');
    ambient.className = 'ambient';
    ambient.innerHTML = '<div class="blob b1"></div><div class="blob b2"></div>';
    document.body.prepend(ambient);
  }

  /* ---------- cursor glow (desktop only, motion allowed) ---------- */
  if (pointerFine && !reducedMotion) {
    var glow = document.createElement('div');
    glow.className = 'cursor-glow';
    document.body.appendChild(glow);
    var raf = null, tx = 0, ty = 0;
    window.addEventListener('mousemove', function(e){
      tx = e.clientX; ty = e.clientY;
      glow.classList.add('on');
      if (!raf) raf = requestAnimationFrame(function(){
        glow.style.transform = 'translate(' + tx + 'px,' + ty + 'px) translate(-50%,-50%)';
        raf = null;
      });
    });
    document.addEventListener('mouseleave', function(){ glow.classList.remove('on'); });
  }

  /* ---------- subtle cursor tilt on the glass sheet ---------- */
  var sheet = document.querySelector('.glass-sheet');
  if (sheet && pointerFine && !reducedMotion) {
    var tiltRaf = null, mx = 0, my = 0;
    sheet.addEventListener('mousemove', function(e){
      var r = sheet.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 2;   // -1..1
      my = ((e.clientY - r.top) / r.height - 0.5) * 2;   // -1..1
      if (!tiltRaf) tiltRaf = requestAnimationFrame(function(){
        sheet.style.transform = 'perspective(1200px) rotateX(' + (-my * 1.6) + 'deg) rotateY(' + (mx * 1.6) + 'deg)';
        tiltRaf = null;
      });
    });
    sheet.addEventListener('mouseleave', function(){
      sheet.style.transform = 'perspective(1200px) rotateX(0) rotateY(0)';
    });
  }

  /* ---------- scroll reveal ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reducedMotion) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('in'); });
  }

  /* ================= AI CHAT WIDGET ================= */
  var ICON_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z"/></svg>';
  var ICON_CLOSE = '✕';

  var QUICK = [
    { en: 'What areas do you serve?', es: '¿Qué áreas cubren?' },
    { en: 'How do I apply for a rental?', es: '¿Cómo solicito una renta?' },
    { en: 'What does property management cost?', es: '¿Cuánto cuesta la administración de propiedades?' },
    { en: 'How do I list my home for sale?', es: '¿Cómo pongo mi casa a la venta?' }
  ];
  var STR = {
    fab: { en: 'Ask American Stages', es: 'Pregúntale a American Stages' },
    title: { en: 'American Stages Assistant', es: 'Asistente de American Stages' },
    subtitle: { en: 'grounded in our listings &amp; docs', es: 'basado en nuestras propiedades y documentos' },
    placeholder: { en: 'Ask about renting, buying, or management…', es: 'Pregunta sobre rentar, comprar o administración…' },
    greeting: {
      en: "Hi, I'm the American Stages assistant. Ask me about renting, buying, selling, or property management on the Central Coast — I'll answer from our site and docs.",
      es: 'Hola, soy el asistente de American Stages. Pregúntame sobre rentar, comprar, vender o administración de propiedades en la Costa Central — responderé según nuestro sitio y documentos.'
    },
    notConnected: {
      en: "The assistant isn't connected yet. In the meantime, call (805) 819-0911 ext. 19 or email leasing@americanstages.com and we'll help directly.",
      es: 'El asistente aún no está conectado. Mientras tanto, llama al (805) 819-0911 ext. 19 o escribe a leasing@americanstages.com y te ayudaremos directamente.'
    },
    noReply: {
      en: "Sorry, I didn't catch that — could you rephrase?",
      es: 'Disculpa, no entendí bien — ¿puedes reformular tu pregunta?'
    }
  };
  function chatLang(){ return localStorage.getItem('as_lang') === 'es' ? 'es' : 'en'; }
  function t(key){ return STR[key][chatLang()]; }

  var widget = document.createElement('div');
  widget.innerHTML =
    '<button class="chat-fab" id="chatFab" aria-label="Open assistant">' +
      '<span class="ring">' + ICON_CHAT + '</span><span data-es="' + STR.fab.es + '">' + STR.fab.en + '</span>' +
    '</button>' +
    '<div class="chat-panel" id="chatPanel">' +
      '<div class="chat-head">' +
        '<span class="dot"></span>' +
        '<div class="t"><div class="n" data-es="' + STR.title.es + '">' + STR.title.en + '</div><div class="s" data-es="' + STR.subtitle.es + '">' + STR.subtitle.en + '</div></div>' +
        '<button class="chat-close" id="chatClose" aria-label="Close">' + ICON_CLOSE + '</button>' +
      '</div>' +
      '<div class="chat-body" id="chatBody"></div>' +
      '<div class="chat-quick" id="chatQuick"></div>' +
      '<div class="chat-input">' +
        '<input id="chatInput" type="text" placeholder="' + STR.placeholder.en + '" data-es-placeholder="' + STR.placeholder.es + '" />' +
        '<button id="chatSend" aria-label="Send">' + ICON_SEND + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(widget);

  var fab = document.getElementById('chatFab');
  var panel = document.getElementById('chatPanel');
  var closeBtn = document.getElementById('chatClose');
  var body = document.getElementById('chatBody');
  var quick = document.getElementById('chatQuick');
  var input = document.getElementById('chatInput');
  var sendBtn = document.getElementById('chatSend');

  var history = []; // [{role:'user'|'assistant', content:'...'}]
  var opened = false;

  function addBubble(role, text){
    var b = document.createElement('div');
    b.className = 'bubble ' + role;
    b.textContent = text;
    body.appendChild(b);
    body.scrollTop = body.scrollHeight;
    return b;
  }

  function addTyping(){
    var b = document.createElement('div');
    b.className = 'bubble ai';
    b.id = 'typingBubble';
    b.innerHTML = '<span class="typing"><span></span><span></span><span></span></span>';
    body.appendChild(b);
    body.scrollTop = body.scrollHeight;
  }
  function removeTyping(){
    var t = document.getElementById('typingBubble');
    if (t) t.remove();
  }

  function renderQuick(){
    quick.innerHTML = '';
    var l = chatLang();
    QUICK.forEach(function(q){
      var btn = document.createElement('button');
      btn.textContent = q[l];
      btn.onclick = function(){ sendMessage(q[l]); };
      quick.appendChild(btn);
    });
  }

  function openPanel(){
    panel.classList.add('open');
    opened = true;
    if (history.length === 0) {
      addBubble('ai', t('greeting'));
      renderQuick();
    }
    input.focus();
  }
  function closePanel(){ panel.classList.remove('open'); }

  fab.addEventListener('click', function(){ opened ? closePanel() : openPanel(); });
  closeBtn.addEventListener('click', closePanel);

  async function sendMessage(text){
    text = (text || input.value || '').trim();
    if (!text) return;
    input.value = '';
    quick.innerHTML = '';
    addBubble('user', text);
    history.push({ role: 'user', content: text });
    addTyping();

    try {
      var res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      });
      removeTyping();

      if (!res.ok) {
        addBubble('err', t('notConnected'));
        return;
      }
      var data = await res.json();
      var reply = data && data.reply ? data.reply : t('noReply');
      addBubble('ai', reply);
      history.push({ role: 'assistant', content: reply });
    } catch (err) {
      removeTyping();
      addBubble('err', t('notConnected'));
    }
  }

  sendBtn.addEventListener('click', function(){ sendMessage(); });
  input.addEventListener('keydown', function(e){ if (e.key === 'Enter') sendMessage(); });

  /* ---------- language toggle (real bilingual content, not decorative) ----------
     Runs LAST, after every element above (nav, compliance badges, chat
     widget, page content) already exists in the DOM. Elements carry
     data-es="<spanish HTML>"; the original (English) markup is cached the
     first time so toggling back needs no duplicate English copy anywhere.
     Inputs/textareas use data-es-placeholder instead. Choice persists
     across pages via localStorage (read by chatLang() above too, so the
     assistant's UI switches with everything else). ---------- */
  (function initI18n(){
    var LANG_KEY = 'as_lang';
    var stored = localStorage.getItem(LANG_KEY);
    var lang = stored || ((navigator.language || '').toLowerCase().indexOf('es') === 0 ? 'es' : 'en');

    var htmlEls = document.querySelectorAll('[data-es]');
    htmlEls.forEach(function(el){ if (!el.hasAttribute('data-en-cache')) el.setAttribute('data-en-cache', el.innerHTML); });

    var phEls = document.querySelectorAll('[data-es-placeholder]');
    phEls.forEach(function(el){ if (!el.hasAttribute('data-en-placeholder')) el.setAttribute('data-en-placeholder', el.getAttribute('placeholder') || ''); });

    var valEls = document.querySelectorAll('[data-es-value]');
    valEls.forEach(function(el){ if (!el.hasAttribute('data-en-value')) el.setAttribute('data-en-value', el.getAttribute('value') || ''); });

    function apply(l){
      document.documentElement.lang = l;
      htmlEls.forEach(function(el){ el.innerHTML = l === 'es' ? el.getAttribute('data-es') : el.getAttribute('data-en-cache'); });
      phEls.forEach(function(el){ el.setAttribute('placeholder', l === 'es' ? el.getAttribute('data-es-placeholder') : el.getAttribute('data-en-placeholder')); });
      valEls.forEach(function(el){ el.setAttribute('value', l === 'es' ? el.getAttribute('data-es-value') : el.getAttribute('data-en-value')); });
      // translated chunks may contain a fresh #yr span (year copyright) — refill it
      document.querySelectorAll('#yr').forEach(function(el){ el.textContent = new Date().getFullYear(); });
      document.querySelectorAll('.lang-btn').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-lang') === l); });
      localStorage.setItem(LANG_KEY, l);
    }

    document.querySelectorAll('.lang-btn').forEach(function(b){
      b.addEventListener('click', function(){ apply(b.getAttribute('data-lang')); });
    });

    apply(lang);
  })();

})();
