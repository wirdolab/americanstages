/**
 * ============================================================
 * American Stages — Property Management lead funnel backend
 * (Cloudflare Pages Function)
 * ============================================================
 * Route: POST /api/lead
 * File-based routing: same mechanism as /functions/api/chat.js —
 * Cloudflare Pages auto-wires this file to that route.
 *
 * WHAT THIS DOES
 *   1. Validates + sanitizes the multi-step funnel submission
 *      (pm-get-started.html).
 *   2. Scores the lead server-side (HOT / WARM / NURTURE) so the
 *      score can't be tampered with by editing client-side JS —
 *      the browser never sees the numeric score, only the label.
 *   3. Forwards a structured JSON payload to LEAD_WEBHOOK_URL, if
 *      one has been configured (Zapier / Make / a CRM / etc).
 *   4. ALWAYS also emails a structured copy to leasing@american
 *      stages.com via Web3Forms — the same service already used
 *      by contact.html/buy.html/sell.html. Web3Forms' access_key
 *      is public by design (see web3forms.com/faq — it's "an
 *      alias to your email," not a secret), so this is safe to
 *      keep in this file even before any real webhook exists.
 *      This means real leads reach a human inbox from day one,
 *      even with zero additional setup on Cloudflare's side.
 *
 * SETUP (all optional — the funnel works with zero config, see
 * above):
 *   Cloudflare dashboard → Pages project → Settings → Environment
 *   variables →
 *     - LEAD_WEBHOOK_URL              (Zapier/Make/CRM endpoint)
 *     - PROPERTY_MANAGEMENT_BOOKING_URL  (Calendly/etc — if unset,
 *       the front end shows "Request a Call" instead of a booking
 *       link and just relies on this submission)
 *   Both are read fresh on every request — no redeploy needed
 *   after adding them, unlike GEMINI_API_KEY (Functions read env
 *   vars at request time, not build time).
 *
 * NOT included yet, worth adding before high-traffic paid-ads
 * launch (matches the same gap already flagged in chat.js):
 *   - Real rate limiting (would need a Cloudflare KV binding —
 *     none configured on this project yet).
 * ============================================================
 */

const WEB3FORMS_ACCESS_KEY = 'a2f42fab-dfb3-463a-9c6b-71c304213034'; // same public key used sitewide — see note above
const NOTIFY_EMAIL = 'leasing@americanstages.com';

// ---------- Lead scoring: centralized + easy to re-tune later ----------
const SCORING = {
  timeline: {
    asap: 40,
    '30days': 30,
    '1-3months': 20,
    '3-6months': 10,
    researching: 0,
  },
  currentSituation: {
    self_managing: 20,
    another_pm: 20,
    vacant: 15,
    preparing_to_rent: 15,
    recently_purchased: 15,
    considering_purchase: 5,
    other: 0,
  },
  propertyType: {
    '5plus_units': 20,
    '3-4_units': 15,
    duplex: 10,
    single_family: 10,
    condo_townhome: 10,
    other: 0,
  },
};

const THRESHOLDS = { hot: 60, warm: 30 }; // >=hot -> HOT, >=warm -> WARM, else NURTURE

function scoreLead(answers) {
  const score =
    (SCORING.timeline[answers.timeline] || 0) +
    (SCORING.currentSituation[answers.currentSituation] || 0) +
    (SCORING.propertyType[answers.propertyType] || 0);
  let temperature = 'NURTURE';
  if (score >= THRESHOLDS.hot) temperature = 'HOT';
  else if (score >= THRESHOLDS.warm) temperature = 'WARM';
  return { score, temperature };
}

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders() });
}

function clean(str, max = 200) {
  return typeof str === 'string' ? str.trim().slice(0, max) : '';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid request.' }, 400);
  }

  // Honeypot: bots fill every field including hidden ones. Silently
  // pretend success so we don't tip them off, but never forward/email it.
  if (clean(payload.botcheck)) {
    return jsonResponse({ ok: true, leadTemperature: 'NURTURE', bookingUrl: null });
  }

  const lead = {
    firstName: clean(payload.firstName, 60),
    lastName: clean(payload.lastName, 60),
    email: clean(payload.email, 120),
    phone: clean(payload.phone, 30),
    propertyAddress: clean(payload.propertyAddress, 150),
    city: clean(payload.city, 80),
    zip: clean(payload.zip, 12),
    propertyType: clean(payload.propertyType, 40),
    currentSituation: clean(payload.currentSituation, 40),
    timeline: clean(payload.timeline, 40),
  };

  // ---------- Validation (mirrors the client-side checks so a
  // request that skips the UI — or a bug in it — still can't get
  // through with garbage data) ----------
  const errors = [];
  if (!lead.firstName) errors.push('firstName');
  if (!lead.lastName) errors.push('lastName');
  if (!EMAIL_RE.test(lead.email)) errors.push('email');
  if (lead.phone.replace(/\D/g, '').length < 10) errors.push('phone');
  if (!lead.propertyAddress) errors.push('propertyAddress');
  if (!lead.city) errors.push('city');
  if (!lead.zip) errors.push('zip');
  if (!lead.propertyType) errors.push('propertyType');
  if (!lead.currentSituation) errors.push('currentSituation');
  if (!lead.timeline) errors.push('timeline');
  if (payload.consent !== true) errors.push('consent');

  if (errors.length) {
    return jsonResponse({ error: 'Please check the form and try again.', fields: errors }, 400);
  }

  const { score, temperature } = scoreLead(lead);
  const testMode = payload.testMode === true;

  const leadRecord = {
    source: 'americanstages.com',
    funnel: 'property_management',
    ...lead,
    leadScore: score,
    leadTemperature: temperature,
    utmSource: clean(payload.utmSource, 100),
    utmMedium: clean(payload.utmMedium, 100),
    utmCampaign: clean(payload.utmCampaign, 100),
    utmContent: clean(payload.utmContent, 100),
    utmTerm: clean(payload.utmTerm, 100),
    gclid: clean(payload.gclid, 150),
    landingPage: clean(payload.landingPage, 300),
    submittedAt: new Date().toISOString(),
    testMode,
    status: 'NEW', // matches the CRM status set this is meant to map into later
  };

  // ---------- 1. Configurable webhook (Zapier / Make / CRM) ----------
  if (env.LEAD_WEBHOOK_URL) {
    try {
      await fetch(env.LEAD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadRecord),
      });
    } catch (err) {
      // Don't fail the visitor's submission just because the webhook is
      // down — they already gave us their info, the fallback email below
      // still gets it to a human either way.
      console.error('Lead webhook delivery failed:', err);
    }
  } else {
    console.warn('LEAD_WEBHOOK_URL not configured — skipping webhook delivery. Set it in Cloudflare Pages → Settings → Environment variables when ready.');
  }

  // ---------- 2. Always-on baseline notification via Web3Forms ----------
  try {
    const subjectPrefix = testMode ? '[TEST] ' : '';
    await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: `${subjectPrefix}New Property Management Lead (${temperature}) — American Stages website`,
        from_name: 'American Stages Website — PM Funnel',
        replyto: lead.email,
        Name: `${lead.firstName} ${lead.lastName}`,
        Email: lead.email,
        Phone: lead.phone,
        'Property Address': `${lead.propertyAddress}, ${lead.city} ${lead.zip}`,
        'Property Type': lead.propertyType,
        'Current Situation': lead.currentSituation,
        Timeline: lead.timeline,
        'Lead Score (internal)': `${score} (${temperature})`,
        'UTM Source': lead.utmSource || '(none — direct/organic)',
        'UTM Campaign': lead.utmCampaign || '(none)',
        'Test Submission': testMode ? 'YES — ignore, this is a test' : 'No',
      }),
    });
  } catch (err) {
    console.error('Fallback notification email failed:', err);
    // Still return success to the visitor below — their data made it to
    // this server and, if configured, to the webhook. We don't want a
    // notification hiccup to make a real prospect think their request
    // was lost, or to expose a backend error to them.
  }

  return jsonResponse({
    ok: true,
    leadTemperature: temperature,
    bookingUrl: env.PROPERTY_MANAGEMENT_BOOKING_URL || null,
  });
}
