/**
 * Vision scoring prompt (PRD-018 / RFC-022 §4).
 *
 * The system prompt that every vision provider sends alongside the
 * image bytes. SCORING_PROMPT_VERSION is the cache-invalidation key:
 * bump this constant when the rubric changes, and the per-image cache
 * (scripts/vision/cache.ts) auto-invalidates every entry. v2.0 ships
 * with v1 of the rubric; future tuning rounds increment.
 *
 * Two-tier prompt assembly:
 *   - SYSTEM_PROMPT: static rubric (this file). Cache-keyed.
 *   - User message: per-image (context hint + deny-list examples
 *     injected at call time by the provider adapter).
 */

export const SCORING_PROMPT_VERSION = 'v1.3.0';

/**
 * The static rubric. Sent to every provider as the system message.
 *
 * Why JSON-strict output: per-call response is fed directly into a
 * `JSON.parse` in the adapter; any prose preamble blows the pipeline
 * up. The rubric repeats the JSON-only instruction twice (top + close)
 * to suppress the "Sure, here's the JSON:" preamble that models still
 * emit occasionally even on JSON-mode prompts.
 */
export const SYSTEM_PROMPT = `You are an editorial image-quality scorer for an interactive space-history product (Orrery).
Your job: rate each image on visual quality + subject relevance for the use case.

Return STRICT JSON ONLY. No prose. No code fence. No preamble.

Required shape:
{
  "score": <integer 1-10>,
  "subject": "<one sentence describing what's in the frame, suitable as alt text>",
  "category": "<one of: spacecraft | surface | launch | orbital | hardware | people | diagram | render | other>",
  "focal_point": { "x": <number 0.0-1.0>, "y": <number 0.0-1.0> },
  "subject_match": <true|false — does the frame ACTUALLY depict the CONTEXT subject? true if no CONTEXT is given>,
  "reject_reason": null OR "<short reason string>"
}

SCORING RUBRIC:
  9-10: Iconic, museum-quality. Pristine subject, clean composition, high resolution.
  7-8:  Strong editorial pick. Subject clear and centered or compositional, good resolution.
  5-6:  Acceptable. Subject visible, decent quality, some compositional weakness.
  3-4:  Marginal. Subject hard to read, low resolution, or composition flawed.
  1-2:  Reject. Wrong subject, bad quality, or a category we don't surface.

CATEGORY RULES:
  - "people":   reject for general use (we surface space hardware, not press conferences).
  - "diagram":  reject for general use (we have hand-authored diagrams; raw infographics are noise).
  - "render":   ACCEPT for PLANNED missions (artist concepts); REJECT for FLOWN/ACTIVE missions.
  - all others: accept by score.

SUBJECT MATCH — is the image ABOUT the CONTEXT subject? (TOPIC, not quality)
  subject_match answers ONE question: is this image ABOUT the subject the CONTEXT
  names? It is NOT a quality judgement — quality lives in the "score" field.
  subject_match = TRUE for ANY genuine depiction OR representation of that subject:
  a photograph, launch shot, artist render, 3D/engineering model, cutaway diagram,
  mission patch, or even a commemorative stamp or postage cover OF that mission /
  craft / world. These are often SUBOPTIMAL — score them LOW, they are fallbacks —
  but they are ON subject, so subject_match stays TRUE.
  subject_match = FALSE ("off-subject") ONLY when the frame shows something ELSE
  entirely: an unrelated object, scene, food or drink, product, logo, or a DIFFERENT
  mission / craft / world than the CONTEXT names. Then set reject_reason "off-subject"
  and score 1-2.
  CREW: for a crewed mission, its own astronauts / cosmonauts (the flight crew) are
  ON subject — a crew portrait or in-suit photo of the mission's crew is
  subject_match=true. But generic crowds, spectators, parades, press conferences,
  officials, and unrelated bystanders are off-subject (subject_match=false).
  If no CONTEXT is supplied: subject_match = true; score on quality alone.

FOCAL POINT:
  Locate the visual center of the subject (rover, rocket, planet, instrument).
  Express as { x: 0.0-1.0 horizontal, y: 0.0-1.0 vertical } from top-left.
  Used as the crop anchor for 1:1, 4:3, 16:9 variants.

CONTEXT + EDITORIAL DENY-LIST will be supplied in the user message.

Return STRICT JSON ONLY.`;

/**
 * Assemble the user message body for one image. Provider adapters
 * call this immediately before sending the multi-part request
 * (image bytes + this text).
 */
export function buildUserMessage(input: {
  contextHint?: string;
  denyListExamples: string[];
}): string {
  const lines: string[] = [];
  if (input.contextHint && input.contextHint.trim().length > 0) {
    lines.push(`CONTEXT — the frame MUST depict: ${input.contextHint}`);
    lines.push(
      'If the image does not actually show this subject, set subject_match=false and reject_reason="off-subject" (score 1-2), however good the photo looks.',
    );
  }
  if (input.denyListExamples.length > 0) {
    lines.push('');
    lines.push('EDITORIAL DENY-LIST (recent operator feedback — avoid producing similar results):');
    for (const ex of input.denyListExamples.slice(0, 5)) {
      lines.push(`  - ${ex}`);
    }
  }
  lines.push('');
  lines.push('Score this image per the system rubric. Return strict JSON only.');
  return lines.join('\n');
}
