/**
 * GET /api/youtube-shorts
 *
 * Returns the 3 most recent YouTube Shorts from the American Stages
 * channel (@AmericanStagesPM, channel ID UCH4UKzqEKzGLROEZkCtIJPw) as
 * JSON, so the "Our Story" page can render a live-updating grid
 * without any manual editing whenever a new short goes up.
 *
 * How it stays "live": YouTube publishes a free, no-API-key RSS feed
 * per channel (https://www.youtube.com/feeds/videos.xml?channel_id=...)
 * that always reflects the channel's latest uploads. This function
 * fetches that feed at request time, filters it down to entries that
 * link to /shorts/ (the feed also includes regular videos, e.g. full
 * podcast episodes, which we don't want in this grid), and returns
 * the newest 3. No API key to manage, no manual re-embedding needed.
 *
 * Edge-cached for 30 minutes (Cloudflare's Cache API) so we're not
 * hitting YouTube on every single page load — new shorts show up
 * here within that window automatically.
 */

const CHANNEL_ID = 'UCH4UKzqEKzGLROEZkCtIJPw';
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const CACHE_SECONDS = 1800; // 30 min

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign(
      { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=' + CACHE_SECONDS },
      corsHeaders()
    ),
  });
}

function decodeEntities(str) {
  return String(str || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// Lightweight regex-based extraction — the Workers runtime has no DOM
// XML parser, and the feed's structure is stable enough that a full
// parser would be overkill for three fields per <entry>.
function parseShorts(xml, limit) {
  const entries = xml.split('<entry>').slice(1);
  const shorts = [];
  for (let i = 0; i < entries.length && shorts.length < limit; i++) {
    const block = entries[i];
    const linkMatch = block.match(/<link rel="alternate" href="([^"]+)"/);
    const href = linkMatch ? decodeEntities(linkMatch[1]) : '';
    if (!href.includes('/shorts/')) continue; // skip full videos/podcast episodes

    const idMatch = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = block.match(/<title>([^<]*)<\/title>/);
    const thumbMatch = block.match(/<media:thumbnail url="([^"]+)"/);
    const publishedMatch = block.match(/<published>([^<]+)<\/published>/);

    if (!idMatch) continue;
    shorts.push({
      id: idMatch[1],
      title: decodeEntities(titleMatch ? titleMatch[1] : ''),
      thumbnail: thumbMatch ? decodeEntities(thumbMatch[1]) : `https://i.ytimg.com/vi/${idMatch[1]}/hqdefault.jpg`,
      url: href,
      publishedAt: publishedMatch ? publishedMatch[1] : null,
    });
  }
  return shorts;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestGet(context) {
  const cache = caches.default;
  const cacheKey = new Request(new URL(context.request.url).origin + '/api/youtube-shorts', { method: 'GET' });

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const feedRes = await fetch(FEED_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AmericanStagesSite/1.0)' },
      cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true },
    });
    if (!feedRes.ok) {
      return jsonResponse({ ok: false, shorts: [] }, 200);
    }
    const xml = await feedRes.text();
    const shorts = parseShorts(xml, 3);
    const response = jsonResponse({ ok: true, shorts: shorts });
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (err) {
    return jsonResponse({ ok: false, shorts: [], error: 'fetch_failed' }, 200);
  }
}
