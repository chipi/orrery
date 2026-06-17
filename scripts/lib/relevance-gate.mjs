// Relevance gate — universal scorer for image-source candidates.
//
// Used by agency-resolver.mjs across every tier (NASA images-api,
// Smithsonian, NARA, Wikimedia Commons) to filter out keyword-matched
// but tangential records. Returns a score 0..1 plus per-signal flags
// so downstream callers can record reasons.
//
// v1: 3 signals. Tunable threshold per source. Future iterations
// add per-mission date windows, subject taxonomy, unit alignment.

const GENERIC_TOKENS = new Set([
  'spacecraft', 'mission', 'image', 'photo', 'hardware', 'launch',
  'final', 'before', 'after', 'photo', 'view', 'shot', 'panorama',
  'orbiter', 'lander', 'rover', 'satellite', 'planet', 'space',
  'flight', 'crew', 'system', 'module', 'concept', 'illustration',
]);

// Planetary / body / mission-name vocabulary — broad enough to
// cover the queries the catalog will run.
const BODY_TOKENS = new Set([
  'mars', 'venus', 'mercury', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
  'moon', 'lunar', 'sun', 'solar', 'asteroid', 'comet', 'kuiper',
  'titan', 'europa', 'io', 'enceladus', 'phobos', 'deimos', 'callisto',
  'bennu', 'ryugu', 'itokawa', 'didymos', 'dimorphos',
  'apollo', 'gemini', 'mercury', 'skylab', 'shuttle', 'hayabusa', 'akatsuki',
  'magellan', 'cassini', 'voyager', 'galileo', 'pioneer', 'mariner',
  'dart', 'opportunity', 'spirit', 'curiosity', 'perseverance',
  'phoenix', 'viking', 'mariner', 'osiris',
]);

/**
 * Extract strong query tokens (4+ chars, not generic). Drops
 * filler words so that title-token matching catches the meaningful
 * anchors.
 */
function strongTokens(query) {
  return (query || '')
    .toLowerCase()
    .split(/[\s\-_/]+/)
    .filter((t) => t.length >= 4)
    .filter((t) => !GENERIC_TOKENS.has(t));
}

/**
 * Body tokens (planet, moon, mission name) present in query.
 * These are the highest-signal tokens — if the query says
 * "Magellan Venus" and the title doesn't mention either, reject.
 */
function bodyTokens(query) {
  return (query || '')
    .toLowerCase()
    .split(/[\s\-_/]+/)
    .filter((t) => BODY_TOKENS.has(t));
}

function tokenMatchesTitle(token, title) {
  return (title || '').toLowerCase().includes(token);
}

/**
 * Score a candidate record against a query.
 *
 * @param {object} record  - { title, id, year, unit, subject } (any may be undefined)
 * @param {string} query   - the search query
 * @param {object} [ctx]   - { mission_year, agency, body } — currently unused but reserved
 * @returns {{ score: number, signals: object, accepted: boolean, threshold: number }}
 */
export function scoreRelevance(record, query, ctx = {}) {
  const title = record?.title ?? '';
  const titleLower = title.toLowerCase();
  const strong = strongTokens(query);
  const bodies = bodyTokens(query);

  // Each signal returns true/false/null. `null` = vacuous (query had
  // nothing for this signal to test against) and is EXCLUDED from the
  // score. This stops the "no body token in query → bodyAlignment
  // vacuously true → counted as a positive signal" loophole that
  // accepts Cyrillic titles for single-token English queries.

  // ── Signal 1: title contains ≥1 strong (non-generic) query token ──
  const titleTokenMatch =
    strong.length === 0
      ? null
      : strong.some((t) => tokenMatchesTitle(t, title));

  // ── Signal 2: title contains ≥1 query body/mission-name token ──
  const bodyAlignment =
    bodies.length === 0
      ? null
      : bodies.some((t) => tokenMatchesTitle(t, title));

  // ── Signal 3: title isn't clearly unrelated (museum-collectibles). ──
  // Always applicable (we always have a title to check). Never vacuous.
  // Word-boundary regex — substring matches were producing false
  // positives (`cap` ~ Cape Canaveral, `pin` ~ pinnacle, etc.).
  const antiTokens = [
    'patch', 'pin', 'card', 'badge', 'sticker', 'toy', 'model kit',
    'lunchbox', 'figurine', 'puzzle', 'mug', 'cap', 't-shirt',
    'pennant', 'invitation', 'menu',
  ];
  const notClearlyUnrelated = !antiTokens.some((t) => {
    const safe = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${safe}\\b`, 'i').test(title);
  });

  const signals = {
    title_token_match: titleTokenMatch,
    body_alignment: bodyAlignment,
    not_clearly_unrelated: notClearlyUnrelated,
  };
  // Score = positive_signals / non_vacuous_signals.
  const nonVacuous = Object.values(signals).filter((v) => v !== null);
  const positives = nonVacuous.filter(Boolean).length;
  const score = nonVacuous.length === 0 ? 0 : positives / nonVacuous.length;

  // v1 threshold: 2/3 signals must pass (0.66). Configurable per source.
  const threshold = ctx.threshold ?? 0.66;
  return { score, signals, threshold, accepted: score >= threshold };
}

/**
 * Convenience: format a one-line audit reason from a score result.
 */
export function formatRelevance(result) {
  const flags = Object.entries(result.signals)
    .map(([k, v]) => `${v ? '✓' : '✗'}${k.split('_')[0]}`)
    .join(' ');
  return `score=${result.score.toFixed(2)} [${flags}] ${result.accepted ? 'PASS' : 'REJECT'}`;
}
