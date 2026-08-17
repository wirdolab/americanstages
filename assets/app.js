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

  /* ---------- primary nav: simplified per the Aug 2026 UX feedback brief.
     Suggested IA — Rentals / Buy / Sell / Property Management / About /
     Contact — six items so it reads clearly at a glance on mobile and fits
     as a true horizontal bar (no scrolling needed) on desktop. "All
     Listings" / "Featured Listings" are reachable from the Rentals/Buy
     pages instead of cluttering primary nav. Active tab is set by
     <body data-page="..."> on each file. ---------- */
  var NAV_ITEMS = [
    { key: 'rent',    href: 'rent.html',    label: 'Rentals',             es: 'Rentas' },
    { key: 'buy',     href: 'buy.html',     label: 'Buy',                 es: 'Comprar' },
    { key: 'sell',    href: 'sell.html',    label: 'Sell',                es: 'Vender' },
    { key: 'pm',      href: 'pm.html',      label: 'Property Management', es: 'Administración' },
    { key: 'about',   href: 'about.html',   label: 'About',               es: 'Nosotros' },
    { key: 'contact', href: 'contact.html', label: 'Contact',             es: 'Contacto' }
  ];
  var wrap = document.querySelector('.wrap');
  if (wrap) {
    var currentPage = document.body.getAttribute('data-page') || '';

    var navWrap = document.createElement('div');
    navWrap.className = 'nav-wrap';

    var nav = document.createElement('nav');
    nav.className = 'nav-pill';
    nav.innerHTML = NAV_ITEMS.map(function(item){
      return '<a href="' + item.href + '" data-es="' + item.es + '"' + (item.key === currentPage ? ' class="active"' : '') + '>' + item.label + '</a>';
    }).join('');

    /* Directional swipe cues: left/right arrow buttons that appear only
       when there's more nav to scroll to in that direction, plus a
       one-time "swipe to explore" hint on first mobile visit (both
       reviewer notes — Gary and Cynthia — flagged the swipe behavior as
       unclear without a cue). */
    var arrowL = document.createElement('button');
    arrowL.type = 'button';
    arrowL.className = 'nav-arrow nav-arrow-l';
    arrowL.setAttribute('aria-label', 'Scroll navigation left');
    arrowL.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>';
    var arrowR = document.createElement('button');
    arrowR.type = 'button';
    arrowR.className = 'nav-arrow nav-arrow-r';
    arrowR.setAttribute('aria-label', 'Scroll navigation right');
    arrowR.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';

    navWrap.appendChild(arrowL);
    navWrap.appendChild(nav);
    navWrap.appendChild(arrowR);
    wrap.prepend(navWrap);

    function updateArrows(){
      var max = nav.scrollWidth - nav.clientWidth;
      var overflowing = max > 4;
      navWrap.classList.toggle('no-scroll', !overflowing);
      arrowL.classList.toggle('hidden', !overflowing || nav.scrollLeft <= 4);
      arrowR.classList.toggle('hidden', !overflowing || nav.scrollLeft >= max - 4);
    }
    arrowL.addEventListener('click', function(){ nav.scrollBy({ left: -140, behavior: 'smooth' }); });
    arrowR.addEventListener('click', function(){ nav.scrollBy({ left: 140, behavior: 'smooth' }); });
    nav.addEventListener('scroll', updateArrows);
    window.addEventListener('resize', updateArrows);
    updateArrows();

    if (!localStorage.getItem('as_nav_hint_seen')) {
      var hint = document.createElement('span');
      hint.className = 'nav-hint';
      hint.setAttribute('data-es', 'Desliza para explorar →');
      hint.textContent = 'Swipe to explore →';
      navWrap.appendChild(hint);
      var dismissHint = function(){
        hint.classList.add('fade');
        localStorage.setItem('as_nav_hint_seen', '1');
        setTimeout(function(){ hint.remove(); }, 500);
        nav.removeEventListener('scroll', dismissHint);
      };
      nav.addEventListener('scroll', dismissHint, { once: true });
      setTimeout(dismissHint, 4500);
    }
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

  /* ---------- Google reviews: interactive carousel, deliberately placed
     OUTSIDE the glass-sheet card (as its own bar below it) so it reads as
     a distinct, prominent strip rather than a buried footer item. Rebuilt
     per the Aug 2026 UX feedback brief — reviewers said the old auto-
     scrolling ticker felt "too hidden." Now: bigger cards, clear Google
     branding, reliable prev/next controls + dot indicators (not just
     hover-to-pause), gentle autoplay that pauses on any interaction, and
     click-to-expand so the full quote can be read without leaving the
     page. Quotes are real, verbatim (typo-corrected only) reviews pulled
     from this business's public Google listing — first names only shown
     per privacy preference, no relative post date, star count reflects
     each reviewer's actual rating. No numeric aggregate rating/count is
     hard-coded here since we don't have a live, verified figure to show;
     wire this up to the real Google Business Profile rating/count before
     launch instead of guessing at a number. Place ID:
     ChIJ8xwbWaMe7IARbpbhs-F2V5E (American Stages Realty & Management,
     3875 Constellation Rd, Lompoc). ---------- */
  var GOOGLE_ICON = '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>';
  var GOOGLE_PLACE_ID = 'ChIJ8xwbWaMe7IARbpbhs-F2V5E';
  var STAR_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="#f2b84b"><path d="M12 2l2.9 6.9 7.4.6-5.6 4.9 1.7 7.3L12 17.9 5.6 21.7l1.7-7.3-5.6-4.9 7.4-.6z"/></svg>';
  var STAR_ICON_EMPTY = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="rgba(244,234,217,.35)" stroke-width="1.6"><path d="M12 2l2.9 6.9 7.4.6-5.6 4.9 1.7 7.3L12 17.9 5.6 21.7l1.7-7.3-5.6-4.9 7.4-.6z"/></svg>';
  function starsHtml(n){
    var full = Math.max(0, Math.min(5, n || 5));
    var html = '';
    for (var s = 0; s < 5; s++) html += (s < full ? STAR_ICON : STAR_ICON_EMPTY);
    return '<span class="stars" aria-label="' + full + ' out of 5 stars">' + html + '</span>';
  }
  /* Real, verbatim (typo-corrected only) Google reviews for American
     Stages Realty & Management, transcribed from screenshots of the
     business's public Google Business Profile (Aug 2026). Per the site
     owner's instruction: first names only (last names/initials stripped
     for privacy), no relative post date shown, and each card reflects
     the reviewer's actual star rating rather than an assumed 5. */
  var TESTIMONIALS = [
    { stars: 5, quote: 'Ian Wilkerson came to repair our sink, he’s a very professional gentleman who’s knowledgeable and polite, we are very pleased with his work and recommend American Stages to all our friends and family. Thank you!', name: 'Richard' },
    { stars: 5, quote: 'I had a great experience working with the leasing and maintenance team. Fafi was professional, responsive, and easy to communicate with throughout the process. Whenever I had a question or needed assistance, I received a prompt response and felt like my concerns were taken seriously. I really appreciated the friendly customer service and would recommend them to others.', name: 'Alonzo' },
    { stars: 5, quote: 'American Stages walked us through our new home purchase in Vandenberg Village (Lompoc). They were impeccable each step of the way. Brie did video tours of the home at least 3, maybe 4 times. I would love to pay high compliments for Brie, Fafi, Anthony and Ian for helping us buy this beautiful home we are finally living in.', name: 'Steven' },
    { stars: 5, quote: 'Fantastic property management company. I work with this company a lot as a contractor. Great people to work with. They are honest and professional. A pleasant experience every time. I highly recommend American Stages whether you are buying, selling, or leasing.', name: 'Stephen' },
    { stars: 5, quote: 'Really appreciate this company stepping up for our local baseball team and sponsoring them. It means a lot when support is coming from all corners of town!', name: 'Cierra' },
    { stars: 5, quote: 'Thank you for sponsoring the LLL cap baseball team, the Astros! Looking forward to a great season with Coach Ian, and will absolutely be recommending your business to my friends and family.', name: 'Sarah' },
    { stars: 5, quote: 'I wanted to share that American Stages Realty and Management is a professional and experienced team. They are knowledgeable and able to explain and answer any questions that you may have at any given time. Their professionalism and quick response are appreciated with any realty or management process. I highly recommend them for your realty needs.', name: 'Stephanie' },
    { stars: 5, quote: 'Kevin was super nice and helpful, showed me a bunch of available units at different properties! He was very knowledgeable and informative, especially as a first time renter — I really appreciated him and all his help!', name: 'Grace' },
    { stars: 5, quote: 'Amy was very helpful and kind to us. Every time we had a question, Amy answered it and explained it to us with good detail. We appreciated the help she gave us.', name: 'Romario' },
    { stars: 5, quote: 'Brianne and Amy were fantastic to work with. They helped me purchase a great investment property and now manage it for me. If you want a go-getter that won’t leave you guessing, choose this office!', name: 'Christina' },
    { stars: 4, quote: 'Thank you American Stages, especially the Maintenance Department, for always being so professional and taking care of any issues I have encountered in a timely manner.', name: 'Carmen' },
    { stars: 5, quote: 'Kevin is very kind and helpful. He answered all the questions I had and got back to me super quick — definitely helped as a first time renter! Definitely recommend!', name: 'Daniela' },
    { stars: 5, quote: 'I have had multiple interactions with Mr. Kevin and both were a pleasure. I highly recommend requesting/working with him. He is punctual, respectful and honest. Kevin is eager to earn your business and will go the extra mile to obtain it.', name: 'Austin' },
    { stars: 5, quote: 'This was my very first time applying for a rental — I’ve only ever rented through private parties or family before. Gavin and I couldn’t be happier to have been paired with Kevin Sanchez! He was incredibly professional, friendly, and always had answers to our questions. Kevin made the whole process feel easy and stress-free.', name: 'Ashley' },
    { stars: 5, quote: 'This is an excellent property management company. They are real people who treat us with respect. Their maintenance team is friendly, responsive and efficient whenever we report an issue.', name: 'Brandy' },
    { stars: 5, quote: 'I loved how they treat me, how they make each part of the process special, and also answered all my questions.', name: 'Sofía' },
    { stars: 5, quote: 'Good customer service, management trained properly and they’re nice.', name: 'Nancy' },
    { stars: 5, quote: 'Super helpful with my home. Love the customer service and how fast they responded.', name: 'Ralph' },
    { stars: 5, quote: 'Great company, very reliable and hard working individuals. Always looking out for customers.', name: 'Jacob' },
    { stars: 5, quote: 'Very great people, didn’t have trouble with no communication, very respectful — definitely recommend to others that are looking for future homes. Very impressive with their team, got a lot of patience — definitely 5 stars in my book!', name: 'Jaciel' },
    { stars: 5, quote: 'I had an awesome experience with American Stages. This team has been extremely helpful answering multiple questions I’ve had; consistently has been one of their fortes in customer service!', name: 'Cesar' },
    { stars: 5, quote: 'Working with American Stages has been a genuinely positive experience. Their team is not only professional but also impressively responsive, always quick to tackle any issues or questions that come up. If you’re looking for a dependable and attentive property management company, I wouldn’t hesitate to recommend American Stages.', name: 'Keegan' },
    { stars: 5, quote: 'I had a great experience working with American Stages Realty. The team was professional, responsive, and truly cared about finding the right fit for me. They made the entire process smooth and stress-free. Highly recommend if you’re looking for a team that’s reliable and easy to work with.', name: 'Bryce' },
    { stars: 5, quote: 'American Stages have been amazing — the team has been very helpful and patient with answering all my questions of realty and providing me with the best customer service!', name: 'Brainard' },
    { stars: 5, quote: 'Love this company, they never fail to help me out when I need!', name: 'Chris' },
    { stars: 5, quote: 'Excellent service and the staff is very knowledgeable. I definitely recommend.', name: 'Austin' },
    { stars: 5, quote: 'I can’t recommend American Stages enough! Their team is professional, responsive, and truly dedicated to providing outstanding service. From day one, they made renting out my property easy and stress-free. They’re great at communicating, handle maintenance issues quickly, and always go above and beyond.', name: 'Natalia' },
    { stars: 5, quote: 'I’ve had amazing experiences with American Stages property management. They’re incredibly organized, proactive, and always keep me informed about what’s going on with my property. Highly recommend their services to anyone looking for reliable management!', name: 'Paulina' },
    { stars: 5, quote: 'The staff at American Stages Realty and Management is hands down the best in the 805. Their professionalism, responsiveness, and dedication to their clients are unmatched. If you’re looking for top-tier service, they’re the ones to call!', name: 'Fernando' },
    { stars: 5, quote: 'American Stages helped me get in a home with their extremely fast service while keeping me educated on the process of purchasing a house. I would recommend this company to people who are not too sure where to get started because they will help you every step of the way.', name: 'Jon' }
  ];
  var REVIEW_WRITE_URL = 'https://search.google.com/local/writereview?placeid=' + GOOGLE_PLACE_ID;
  var REVIEW_SEE_ALL_URL = 'https://www.google.com/maps/place/?q=place_id:' + GOOGLE_PLACE_ID;

  document.querySelectorAll('.wrap').forEach(function(wrapEl){
    var section = document.createElement('div');
    section.className = 'review-ticker';

    var slides = TESTIMONIALS.map(function(t, i){
      return '<div class="rt-slide' + (i === 0 ? ' active' : '') + '" data-i="' + i + '">' +
        starsHtml(t.stars) +
        '<button type="button" class="quote">“' + t.quote + '”</button>' +
        '<span class="name">— ' + t.name + '</span>' +
      '</div>';
    }).join('');

    // With 30 slides, individual dots get cluttered — switch to a
    // simple "3 / 30" counter once the list is longer than a handful.
    var useCounter = TESTIMONIALS.length > 8;
    var dotsHtml = useCounter
      ? '<span class="rt-counter"><span class="rt-counter-cur">1</span> / ' + TESTIMONIALS.length + '</span>'
      : TESTIMONIALS.map(function(_, i){
          return '<button type="button" class="rt-dot' + (i === 0 ? ' on' : '') + '" data-i="' + i + '" aria-label="Show review ' + (i + 1) + '"></button>';
        }).join('');

    section.innerHTML =
      '<div class="rt-head">' +
        '<span class="rt-brand">' + GOOGLE_ICON + '<span data-es="Reseñas de Google">Google Reviews</span></span>' +
        '<a class="rt-seeall" href="' + REVIEW_SEE_ALL_URL + '" target="_blank" rel="noopener" data-es="Ver todas ↗">See all ↗</a>' +
      '</div>' +
      '<div class="rt-stage">' +
        '<button type="button" class="rt-nav rt-prev" aria-label="Previous review"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg></button>' +
        '<div class="rt-slides">' + slides + '</div>' +
        '<button type="button" class="rt-nav rt-next" aria-label="Next review"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>' +
      '</div>' +
      '<div class="rt-dots">' + dotsHtml + '</div>' +
      '<a class="rt-write" href="' + REVIEW_WRITE_URL + '" target="_blank" rel="noopener" data-es="Escribe una reseña en Google →">Write a Google review →</a>';

    wrapEl.appendChild(section);

    var slideEls = section.querySelectorAll('.rt-slide');
    var dotEls = section.querySelectorAll('.rt-dot');
    var counterEl = section.querySelector('.rt-counter-cur');
    var idx = 0, timer = null;

    function show(n){
      idx = (n + TESTIMONIALS.length) % TESTIMONIALS.length;
      slideEls.forEach(function(el, i){ el.classList.toggle('active', i === idx); });
      dotEls.forEach(function(el, i){ el.classList.toggle('on', i === idx); });
      if (counterEl) counterEl.textContent = idx + 1;
    }
    function stopAuto(){ if (timer) { clearInterval(timer); timer = null; } }
    function startAuto(){
      if (reducedMotion || TESTIMONIALS.length < 2) return;
      stopAuto();
      timer = setInterval(function(){ show(idx + 1); }, 4000);
    }
    function userAction(fn){ return function(){ stopAuto(); fn(); startAuto(); }; }

    section.querySelector('.rt-prev').addEventListener('click', userAction(function(){ show(idx - 1); }));
    section.querySelector('.rt-next').addEventListener('click', userAction(function(){ show(idx + 1); }));
    dotEls.forEach(function(dot){
      dot.addEventListener('click', userAction(function(){ show(parseInt(dot.getAttribute('data-i'), 10)); }));
    });
    /* click a quote to expand the full text in place (removes clamp) */
    section.querySelectorAll('.quote').forEach(function(q){
      q.addEventListener('click', function(){ q.classList.toggle('expanded'); });
    });
    /* basic touch swipe on mobile */
    var touchX = null;
    var stage = section.querySelector('.rt-stage');
    stage.addEventListener('touchstart', function(e){ touchX = e.touches[0].clientX; stopAuto(); }, { passive: true });
    stage.addEventListener('touchend', function(e){
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) show(dx < 0 ? idx + 1 : idx - 1);
      touchX = null;
      startAuto();
    });

    startAuto();
  });

  /* ---------- about / disclosure accordion: full brokerage description
     carried over from the previous site's footer. Collapsed by default
     (click "About American Stages" to expand) so it stays out of the way
     on every page without cluttering the footer. ---------- */
  var ABOUT_EN =
    "<p>American Stages Realty &amp; Property Management is the Central Coast partner for buying, selling, leasing, and managing homes across Lompoc, Santa Barbara, Goleta, Santa Maria, San Luis Obispo (SLO), and all of California. Our full-service brokerage and property management team delivers local market expertise, compliant leasing, smart resident screening, high-impact marketing, and transparent owner reporting—so your transaction or rental performs. Whether you're relocating near Vandenberg Space Force Base, listing a home, investing in a rental, or need day-to-day management and maintenance, we combine data-driven pricing with responsive communication to protect value and reduce vacancy. Ready to move with confidence on California's Central Coast? Contact American Stages for a tailored plan that keeps your property—and your goals—on track.</p>" +
    "<p>Whether you're buying your first home, upgrading to your dream property, or selling to begin your next chapter, our brokerage is here to guide you every step of the way. We combine deep local expertise with a personalized approach to make your experience seamless, stress-free, and rewarding. Buyers can count on us to uncover the best opportunities to match their lifestyle and goals, while sellers benefit from our strategic marketing, skilled negotiations, and proven track record of maximizing value. With integrity, dedication, and a true commitment to success, we ensure your real estate journey is handled with care from start to finish.</p>";
  var ABOUT_ES =
    "<p>American Stages Realty &amp; Property Management es el socio de la Costa Central para comprar, vender, arrendar y administrar propiedades en Lompoc, Santa Bárbara, Goleta, Santa María, San Luis Obispo (SLO) y en toda California. Nuestro equipo de bienes raíces y administración de propiedades de servicio completo ofrece experiencia en el mercado local, arrendamiento conforme a la ley, selección inteligente de residentes, marketing de alto impacto y reportes transparentes para el propietario, para que tu transacción o renta rinda resultados. Ya sea que te estés mudando cerca de la Base de la Fuerza Espacial Vandenberg, listando una casa, invirtiendo en una renta, o necesites administración y mantenimiento del día a día, combinamos precios basados en datos con comunicación receptiva para proteger el valor y reducir la vacancia. ¿Listo para avanzar con confianza en la Costa Central de California? Contacta a American Stages para un plan personalizado que mantenga tu propiedad — y tus metas — en curso.</p>" +
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

  /* ---------- animated stat counters (About page "Our Story" numbers).
     Counts up from 0 to data-target once the stats bar scrolls into
     view; data-suffix (e.g. "+", "d") is appended after counting
     finishes. Respects prefers-reduced-motion by jumping straight to
     the final value. ---------- */
  var statEls = document.querySelectorAll('.stats-bar .num[data-target]');
  if (statEls.length) {
    var animateStat = function(el){
      var target = parseInt(el.getAttribute('data-target'), 10) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      if (reducedMotion) { el.textContent = target + suffix; return; }
      var start = null, duration = 1400;
      function step(ts){
        if (!start) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(eased * target) + (p >= 1 ? suffix : '');
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window) {
      var statIo = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (entry.isIntersecting) { animateStat(entry.target); statIo.unobserve(entry.target); }
        });
      }, { threshold: 0.4 });
      statEls.forEach(function(el){ statIo.observe(el); });
    } else {
      statEls.forEach(animateStat);
    }
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
