/**
 * ============================================================
 * American Stages — AI chat backend (Cloudflare Pages Function)
 * ============================================================
 * Route: POST /api/chat
 * File-based routing: Cloudflare Pages auto-wires this file to
 * that route because it lives at /functions/api/chat.js — no
 * extra config needed if you deploy this whole folder as a
 * Cloudflare Pages project (the six .html files + assets/ as the
 * static site, this functions/ folder as the API).
 *
 * SETUP (one-time):
 *   1. Cloudflare dashboard → Pages project → Settings →
 *      Environment variables → add ANTHROPIC_API_KEY (Production
 *      + Preview). Get the key from console.anthropic.com.
 *      Never put the key in front-end code — this file is the
 *      only place it should exist, and it never reaches the browser.
 *   2. (Optional) tune ANTHROPIC_MODEL below if you want a
 *      different model than the default.
 *   3. Deploy: `wrangler pages deploy .` from this folder, or
 *      connect the repo in the Cloudflare dashboard for git-based
 *      deploys.
 *
 * NOT included yet, worth adding before high-traffic launch:
 *   - Rate limiting (Cloudflare Turnstile on the widget, or a KV-
 *     backed per-IP counter here) so the API key can't be drained
 *     by a script.
 *   - Real IDX listing data piped into the system prompt so the
 *     assistant can answer "what's available right now" instead
 *     of pointing people to the Rentals/Buy pages.
 * ============================================================
 */

const ANTHROPIC_MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 600;
const MAX_HISTORY = 12; // trim long conversations before they hit the API

// Everything the assistant is allowed to state as fact. Keep this in
// sync with the actual site content — if it's not true here, don't
// let the model imply it's true in a reply.
const SYSTEM_PROMPT = `You are the AI assistant embedded on the American Stages Realty & Management website (americanstages.com), serving California's Central Coast.

Company facts (only source of truth — do not invent anything beyond this):
- American Stages Realty & Management, Inc. — CA DRE #02094901. Full-service real estate brokerage and property management.
- Slogan: "With you, through every stage."
- Service area: Lompoc, Santa Maria, Santa Barbara/Goleta, San Luis Obispo (SLO), and the wider California Central Coast, including near Vandenberg Space Force Base.
- Office: 3875 Constellation Rd, Suite C, Lompoc, CA 93436. Phone (805) 819-0911 ext. 19. Email leasing@americanstages.com. Hours Monday–Friday 9 AM–3 PM, closed weekends.
- Team: Brie Camacho, President/Broker, DRE #01948359, (805) 345-0677. Raquel Keele, Realtor, DRE #02094901, (805) 819-0911. Luis Castañeda, Realtor, DRE #02230919, (805) 757-0031.
- Property management services: marketing to reduce vacancy, financial reporting, eviction protection/compliant leasing, move-in/move-out + semi-annual inspections, online rent collection via e-check, tenant retention and proactive maintenance. A Property Management Agreement can be signed online (link on the Hire a Property Manager page).
- Selling: free market analysis / CMA available via a form on the Sell My House page.
- Renting: online rental application (Apply Now, linked from the homepage and Rentals page) and a Rental Qualifications page. Rental listings are managed through an IDX provider and may not always be visible on the site yet.
- Buying: buyer representation from the team; for-sale listings are managed through an IDX provider and may not always be visible on the site yet.
- Mortgage pre-qualification is available via an external partner link on the homepage.
- Owner Portal and Resident Portal (login required) are linked from the homepage.
- Site pages: Home, All Listings, Featured Listings, Markets, Hire a Property Manager, Sell My House, View Available Rentals, Buy Real Estate, Contact. A Blog exists on the previous site and is being migrated.
- All Listings / Featured Listings / Markets show for-sale MLS listings via our IDX provider (iHomeFinder). Rental availability is separate — it comes from our property management system, not the MLS.
- Social: Instagram, Facebook, YouTube, TikTok — all @americanstagespm.
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

  if (!env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Assistant not configured — missing ANTHROPIC_API_KEY.' }),
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

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic API error:', anthropicRes.status, errText);
      return new Response(JSON.stringify({ error: 'Assistant is temporarily unavailable.' }), {
        status: 502,
        headers: corsHeaders(),
      });
    }

    const data = await anthropicRes.json();
    const reply = data?.content?.[0]?.text || "Sorry, I couldn't generate a reply just now.";

    return new Response(JSON.stringify({ reply }), { status: 200, headers: corsHeaders() });
  } catch (err) {
    console.error('Chat function error:', err);
    return new Response(JSON.stringify({ error: 'Unexpected server error.' }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}
