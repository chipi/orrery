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

const SYSTEM_PROMPT = `You are reviewing space-mission images for an open-source educational project. For each image you see, you'll answer ONE question: does this image substantively depict the named mission's spacecraft, mission hardware, mission target body, science instrument, or mission-defining moment?

Answer 'related' for: spacecraft hardware, planetary/lunar/celestial body surfaces, science instrument shots, launches, in-flight imagery, sample-return capsules, mission-defining science returns.

Answer 'unrelated' for: crew portraits or press conference photos (people-only), mission patches/logos/decals, mockups/replicas in museums (UNLESS the mission has no other photographic record), educational graphics/posters/animations, award ceremonies, anything that's keyword-related-only.

Answer 'unsure' if you genuinely can't tell from the image.

Respond ONLY in this JSON shape: {"verdict": "related|unrelated|unsure", "confidence": 0.0-1.0, "reason": "one short sentence"}`;

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

  // Anthropic API requires HTTPS. NASA images-api returns http:// —
  // upgrade transparently (the same NASA CDN works fine over https).
  const httpsUrl = imageUrl.replace(/^http:\/\//i, 'https://');

  const body = {
    model: MODEL,
    max_tokens: 200,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: httpsUrl } },
          { type: 'text', text: userPrompt },
        ],
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
