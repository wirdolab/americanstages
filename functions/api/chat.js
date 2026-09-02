/**
 * ============================================================
 * American Stages — AI chat backend (Cloudflare Pages Function)
 * ============================================================
 * Route: POST /api/chat
 * File-based routing: Cloudflare Pages auto-wires this file to
 * that route because it lives at /functions/api/chat.js — no
 * extra config needed when this whole folder is deployed as a
 * Cloudflare Pages project (the .html files + assets/ as the
 * static site, this functions/ folder as the API).
 *
 * WHY GEMINI INSTEAD OF CLAUDE/CHATGPT: every hosted LLM API
 * (Anthropic, OpenAI, etc.) bills per token — there's no
 * permanently-free tier for those. Google's Gemini API is the
 * one major provider with a genuinely free tier (generous daily
 * request limit, no billing account required) that's realistic
 * for a small local-business site's traffic. If this site ever
 * outgrows the free limit, swapping back to Claude just means
 * changing this one file — the widget on the front end doesn't
 * change at all.
 *
 * SETUP (one-time, all free):
 *   1. Go to aistudio.google.com → "Get API key" → create a free
 *      key (no credit card required for the free tier).
 *   2. Cloudflare dashboard → Pages project → Settings →
 *      Environment variables → add GEMINI_API_KEY (Production +
 *      Preview). Never put the key in front-end code — this file
 *      is the only place it should exist.
 *   3. Deploy: `wrangler pages deploy .` from this folder, or
 *      connect the repo in the Cloudflare dashboard for git-based
 *      deploys (both free on Cloudflare's standard Pages plan).
 *
 * NOT included yet, worth adding before high-traffic launch:
 *   - Rate limiting (Cloudflare Turnstile on the widget, or a KV-
 *     backed per-IP counter here) so the free daily quota can't be
 *     drained by a script.
 *   - Real IDX listing data piped into the system prompt so the
 *     assistant can answer "what's available right now" instead
 *     of pointing people to the Rentals/Buy pages.
 * ============================================================
 */

const GEMINI_MODEL = 'gemini-3.6-flash'; // free-tier eligible model (2.0 Flash shut down 2026-06-01; 2.5 Flash retired for new users as of Sept 2026 — Google's own 404 response pointed to this replacement. Check aistudio.google.com for the current free-tier lineup if this ever needs to change again)
const MAX_TOKENS = 600;
const MAX_HISTORY = 12; // trim long conversations before they hit the API

// Everything the assistant is allowed to state as fact. Keep this in
// sync with the actual site content — if it's not true here, don't
// let the model imply it's true in a reply.
const SYSTEM_PROMPT = `You are the AI assistant embedded on the American Stages Realty & Management website (americanstages.com), serving California's Central Coast.

Company facts (only source of truth — do not invent anything beyond this):
- American Stages Realty & Management, Inc. — CA DRE #02094901. Full-service real estate brokerage and property management.
- Slogan: "With you, through every stage."
- Service area: Lompoc, Santa Maria, Santa Barbara/Goleta, San Luis Obispo (SLO), Buellton, and the wider California Central Coast, including near Vandenberg Space Force Base.
- Office: 3875 Constellation Rd, Suite C, Lompoc, CA 93436. Phone (805) 819-0911 ext. 19. Email leasing@americanstages.com. Hours Monday–Friday 9 AM–3 PM, closed weekends.
- Team: Brie Camacho, President/Broker, DRE #01948359, (805) 345-0677. Raquel Keele, Leasing & Real Estate Agent, DRE #02094901, (805) 736-7879. Luis Castañeda, Realtor, DRE #02230919, (805) 757-0031. Kevin Sánchez Castillo, Leasing & Real Estate Agent, DRE #02433718, (805) 951-1107. Cynthia I Baltazar, Full Service Real Estate Agent, DRE #01527641, (805) 757-7105.
- Property management services: marketing to reduce vacancy, financial reporting, eviction protection/compliant leasing, move-in/move-out + semi-annual inspections, online rent collection via e-check, tenant retention and proactive maintenance. A Property Management Agreement can be signed online (link on the Hire a Property Manager page).
- Selling: free market analysis / CMA available via a form on the Sell My House page. A Seller's Guide is available with the full step-by-step process.
- Renting: online rental application (Apply Now, linked from the homepage and Rentals page) and a Rental Qualifications page with published, transparent criteria.
- Buying: buyer representation from the team; a Buyer's Guide is available with the full step-by-step process. For-sale listings are managed through an IDX provider and may not always be visible on the site yet.
- Mortgage pre-qualification is available via an external partner link on the homepage.
- BankFree is a separate, independent partner site backed by American Stages that helps sellers spread capital gains over years using seller-financing (IRC §453) instead of paying it all at once — no bank involved.
- American Stages Verified is a small, upcoming trust/verification program for participating homes.
- Owner Portal and Resident Portal (login required) are linked from the homepage.
- Testimonials page has real, verified Google reviews. The site is bilingual (English/Spanish, toggle at the top of every page).
- We are an Equal Housing Opportunity brokerage and a REALTOR(R)/MLS member.

Rules:
- Never invent specific rental prices, specific property addresses/availability, commission rates, or legal/tax advice. If asked, say that's best answered by the team directly or once live listings are available, and offer the phone/email.
- Keep answers short (2-4 sentences), warm, and concrete. Point people to the right page or action (e.g. "you can start that on our Sell My House page" or "the fastest way is to call/email us directly").
- If a question is entirely unrelated to real estate/property management/this company, politely redirect to what you can help with.
- Do not use emojis.`;

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Assistant not configured — missing GEMINI_API_KEY.' }),
      { status: 500, headers: corsHeaders() }
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400,
      headers: corsHeaders(),
    });
  }

  const incoming = Array.isArray(payload.messages) ? payload.messages : [];
  const messages = incoming
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) })); // guard against giant payloads

  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: 'No message provided.' }), {
      status: 400,
      headers: corsHeaders(),
    });
  }

  // Gemini uses "user" / "model" instead of "user" / "assistant".
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { maxOutputTokens: MAX_TOKENS },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API error:', geminiRes.status, errText);
      return new Response(JSON.stringify({ error: 'Assistant is temporarily unavailable.' }), {
        status: 502,
        headers: corsHeaders(),
      });
    }

    const data = await geminiRes.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ||
      "Sorry, I couldn't generate a reply just now.";

    return new Response(JSON.stringify({ reply }), { status: 200, headers: corsHeaders() });
  } catch (err) {
    console.error('Chat function error:', err);
    return new Response(JSON.stringify({ error: 'Unexpected server error.' }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}
