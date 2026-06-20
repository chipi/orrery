// Vision-judge — Claude Haiku 4.5 verification of image content vs
// intended subject. Used as the final-layer QA on Slice A proposals
// before milestone commit. Catches what keyword/category gates miss:
// people-photos, mission patches, ceremonies, mockups, animations,
// or simply wrong-subject images that share keyword tokens.
//
// Cost ~$0.0004 per image (Haiku 4.5 vision, ~1500 image tokens +
// ~100 prompt tokens). For the full Slice A (~2,275 entries) about
// $0.91 total.
//
// Public API:
//   judgeImage({ imageUrl, missionId, agency, subjectDescription })
//     → { verdict: 'related' | 'unrelated' | 'unsure',
//         confidence: 0..1,
//         reason: '<one-line>' }
//
// Throttle ~10 req/sec to stay under Anthropic API rate caps.
// Network errors / model uncertainty return verdict='unsure' so the
// caller can decide whether to ship anyway (fail-open).

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

// Minimum confidence required for a 'related' verdict to be shipped at apply.
// Below this, callers should treat the result as 'unsure' (block apply, defer
// to human review via the Slice A approval UI).
export const MIN_SHIP_CONFIDENCE = 0.9;

const SYSTEM_PROMPT = `You are reviewing candidate hero images for a public-facing space-mission gallery. For each image, answer ONE question: is this a STRONG hero candidate for the named mission's gallery on a public space-mission website?

A strong hero shows the mission's spacecraft, target body, science instrument, or a mission-defining moment as the primary subject of the frame — not incidentally, not tangentially.

Answer 'related' ONLY when ALL of these hold:
- The mission's spacecraft / target body / instrument / defining moment is the PRIMARY subject of the frame (not a distant dot, not background, not incidental).
- The image is suitable for a public hero gallery (sharp, on-subject, not a chart or diagram).
- The connection is direct — same mission, same hardware, same target body — not just a keyword match.

Answer 'unrelated' for ALL of:
- Distant / incidental frames where the target appears as a tiny dot or in the background of a different subject.
- Crew portraits, team photos, press conferences, award ceremonies (UNLESS the image is unambiguously a launch-day or mission-defining moment — and even then, only if the spacecraft / mission hardware is clearly visible).
- Mockups, replicas, museum displays, full-scale models, training mockups.
- Infographics, diagrams, charts, technical illustrations, animations, posters, logos, mission patches.
- Screen captures / UI dashboards / data-display panels / map-tile composites / app overlays — anything that's a captured frame from a viewer or visualisation rather than a photographic image (round-3 lesson 2026-06-18: sentinel-copernicus screenshot slipped through at 0.92 confidence).
- Satellite DATA PRODUCTS where the spacecraft itself is not visible in the frame: before/after pairs, time-lapse sequences, false-colour land-use composites, radar swaths, atmospheric measurement displays, multi-panel science-result figures. These ARE legitimate mission output but they are NOT hero images. The hero for an Earth-observation satellite (Landsat, Sentinel, GOES, Aqua, Terra, MODIS) is a photograph or render of the spacecraft itself, not what the spacecraft sees. (Round-4 lesson 2026-06-18: a Landsat scene-comparison composite passed v3 at 0.92 confidence; rejected manually as a screenshot.) EXCEPTION: planetary observatory missions where the data product IS the icon — Hubble deep-field galaxies, Cassini Saturn rings — those remain acceptable when the imagery is a single coherent photograph of the celestial subject.
- Team / staff portraits, press conferences, award ceremonies, briefings, meetings, photo opportunities, presentation rooms — people-in-an-office context without mission hardware visible. (NOTE: a clear assembly-hall / production-line / clean-room shot of the spacecraft itself IS acceptable — that's hardware-in-context, not a people portrait.)
- Tangential thematic matches — e.g. "Hubble Space Telescope" satisfying an "OTV" query because both are spacecraft; ISRO crew portrait satisfying a "Gaganyaan" query because both involve crewed flight; GRAIL photo where LRO is a dot satisfying an "LRO" query.
- Generic agency imagery (rocket assembly buildings, launch pads with no spacecraft visible, hardware integration shots without context).

Answer 'unsure' if you genuinely can't determine the subject from the image alone, OR if you would normally answer 'related' but with confidence below 0.9 — be honest about confidence; the caller treats sub-0.9 'related' as 'unsure' anyway.

Respond ONLY in this JSON shape: {"verdict": "related|unrelated|unsure", "confidence": 0.0-1.0, "reason": "one short sentence — name what's actually in the frame and whether it's the mission's primary subject"}`;

/**
 * Fetch image bytes and prepare a base64 payload for Anthropic's vision API.
 *
 * Anthropic's vision API can't fetch from upload.wikimedia.org / Commons
 * Special:FilePath URLs (HTTP 400 "Unable to download the file"). Downloading
 * locally and uploading as base64 works for every source we use.
 *
 * @param {string} url  HTTPS image URL
 * @returns {Promise<{ mediaType: string, base64: string }>}
 * @throws on non-2xx fetch
 */
async function fetchImageAsBase64(url) {
  // Wikimedia Special:FilePath ?width=… sometimes returns the resize page
  // instead of the bytes; strip the query string so we get the original.
  const cleaned = url.includes('commons.wikimedia.org/wiki/Special:FilePath/')
    ? url.replace(/\?.*$/, '')
    : url;
  const res = await fetch(cleaned, {
    headers: { 'User-Agent': UA, Accept: 'image/*' },
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(`fetch ${cleaned} → HTTP ${res.status}`);
  }
  const contentType = res.headers.get('content-type') ?? 'image/jpeg';
  const mediaType = /^image\/(jpeg|png|gif|webp)/.test(contentType)
    ? contentType.split(';')[0].trim()
    : 'image/jpeg';
  const buf = Buffer.from(await res.arrayBuffer());
  return { mediaType, base64: buf.toString('base64') };
}

/**
 * Judge whether an image is substantively about the named mission.
 *
 * @param {object} opts
 * @param {string} opts.imageUrl    direct URL to the image
 * @param {string} opts.missionId   mission slug (e.g. 'opportunity', 'akatsuki')
 * @param {string} [opts.agency]    agency token (e.g. 'NASA', 'JAXA')
 * @param {string} [opts.subjectDescription]  human-readable subject (e.g. 'Opportunity Mars rover')
 * @returns {Promise<{verdict, confidence, reason}>}
 */
export async function judgeImage({ imageUrl, missionId, agency, subjectDescription }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { verdict: 'unsure', confidence: 0, reason: 'no ANTHROPIC_API_KEY in env' };
  }

  // Build the user prompt
  const subjectLabel = subjectDescription
    ? `${subjectDescription} (mission slug: ${missionId}${agency ? `, agency: ${agency}` : ''})`
    : `${missionId}${agency ? ` (agency: ${agency})` : ''}`;
  const userPrompt = `Is this image substantively about ${subjectLabel}?`;

  // Anthropic's vision API can't fetch upload.wikimedia.org / Commons
  // Special:FilePath URLs (HTTP 400). Download bytes ourselves and upload
  // as base64 — works for every source uniformly. http:// → https:// flip
  // first since some NASA images-api URLs come through unencrypted.
  const httpsUrl = imageUrl.replace(/^http:\/\//i, 'https://');
  let imagePayload;
  try {
    const { mediaType, base64 } = await fetchImageAsBase64(httpsUrl);
    imagePayload = {
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data: base64 },
    };
  } catch (e) {
    return { verdict: 'unsure', confidence: 0, reason: `image-fetch: ${e.message}` };
  }

  const body = {
    model: MODEL,
    max_tokens: 200,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [imagePayload, { type: 'text', text: userPrompt }],
      },
    ],
  };

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'anthropic-version': '2023-06-01',
        'User-Agent': UA,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        verdict: 'unsure',
        confidence: 0,
        reason: `HTTP ${res.status}: ${text.slice(0, 100)}`,
      };
    }
    const json = await res.json();
    const reply = json?.content?.[0]?.text ?? '';
    // Parse JSON out of the reply (Claude may wrap it in prose)
    const match = reply.match(/\{[\s\S]*?\}/);
    if (!match) {
      return { verdict: 'unsure', confidence: 0, reason: `unparseable: ${reply.slice(0, 80)}` };
    }
    const parsed = JSON.parse(match[0]);
    const verdict = ['related', 'unrelated', 'unsure'].includes(parsed.verdict)
      ? parsed.verdict
      : 'unsure';
    const confidence =
      typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0;
    return {
      verdict,
      confidence,
      reason: (parsed.reason || '').slice(0, 200),
    };
  } catch (e) {
    return { verdict: 'unsure', confidence: 0, reason: `error: ${e.message}` };
  }
}

/**
 * Convenience gate used by the apply pipeline. A vision result is shippable
 * ONLY when the verdict is 'related' AND confidence ≥ MIN_SHIP_CONFIDENCE.
 *
 * Falsy / 'unsure' / 'unrelated' / sub-threshold all block apply. Callers
 * may still surface those to the human approval UI for manual override.
 *
 * @param {{verdict?: string, confidence?: number} | null | undefined} vision
 * @returns {boolean}
 */
export function isShippable(vision) {
  if (!vision) return false;
  return vision.verdict === 'related' && (vision.confidence ?? 0) >= MIN_SHIP_CONFIDENCE;
}
