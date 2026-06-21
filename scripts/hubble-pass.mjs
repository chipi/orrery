#!/usr/bin/env node
/**
 * hubble-pass — second-round body-imagery sweep, sourced DIRECTLY from
 * esahubble.org (the official ESA/Hubble image archive), NOT Wikimedia
 * Commons.
 *
 * v1 (deprecated) queried Commons for "<body> Hubble" — but Commons
 * search ranks by query relevance, so JunoCam / Cassini / MESSENGER
 * shots tagged with "Hubble" outranked actual Hubble photos. v2 hits
 * esahubble.org so every returned image is provenance-guaranteed
 * Hubble Space Telescope output, credited ESA/Hubble per their
 * attribution policy.
 *
 * Reuses the same scraping pattern as agency-resolver.mjs:esahubbleScrape:
 *   search URL:  https://esahubble.org/images/?search=<query>
 *   id regex:    /\/images\/(heic\d{4}[a-z]?)\//
 *   detail page: https://esahubble.org/images/<id>/  (for title)
 *   image URL:   https://cdn.esahubble.org/archives/images/large/<id>.jpg
 *
 * Output: appends proposals to bodies-salvage-result.json with
 * proposal_ids prefixed `hubble-…`. Same dataset-bodies review UI.
 *
 * Run:
 *   ANTHROPIC_API_KEY=… node --max-old-space-size=4096 --env-file=.env scripts/hubble-pass.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { judgeBodyImage } from './lib/vision-judge.mjs';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';

const CANDIDATES_PER_BODY = 8; // esahubble search rarely returns more than ~10 per body
const KEEP_PER_BODY = 1; // hero slot only
const VISION_THROTTLE_MS = 120;
const SCRAPE_THROTTLE_MS = 250;

// Per-body esahubble.org search queries. Just the body name — the
// archive only contains Hubble shots, so no need to add "Hubble" to
// the query. Multiple queries per body when the canonical name has
// variants (e.g. "Pluto" vs "dwarf planet Pluto" vs "Kuiper Belt").
const BODIES = [
  { surface: 'planets', id: 'mercury', subject: 'Mercury (the planet)', queries: ['Mercury'] },
  { surface: 'planets', id: 'venus', subject: 'Venus (the planet)', queries: ['Venus'] },
  { surface: 'planets', id: 'earth', subject: 'Earth (the planet from space)', queries: ['Earth'] },
  { surface: 'planets', id: 'mars', subject: 'Mars (the planet)', queries: ['Mars'] },
  { surface: 'planets', id: 'jupiter', subject: 'Jupiter (the planet)', queries: ['Jupiter'] },
  { surface: 'planets', id: 'saturn', subject: 'Saturn (the planet with rings)', queries: ['Saturn'] },
  { surface: 'planets', id: 'uranus', subject: 'Uranus (the planet)', queries: ['Uranus'] },
  { surface: 'planets', id: 'neptune', subject: 'Neptune (the planet)', queries: ['Neptune'] },
  { surface: 'planets', id: 'pluto', subject: 'Pluto (the dwarf planet)', queries: ['Pluto'] },
  { surface: 'small-bodies', id: 'ceres', subject: 'Ceres (the dwarf planet)', queries: ['Ceres'] },
  { surface: 'small-bodies', id: 'eris', subject: 'Eris (the dwarf planet)', queries: ['Eris'] },
  { surface: 'small-bodies', id: 'haumea', subject: 'Haumea (the dwarf planet)', queries: ['Haumea'] },
  { surface: 'small-bodies', id: 'makemake', subject: 'Makemake (the dwarf planet)', queries: ['Makemake'] },
  { surface: 'small-bodies', id: '67p', subject: "Comet 67P/Churyumov–Gerasimenko", queries: ['67P', 'Churyumov'] },
  { surface: 'small-bodies', id: 'halley', subject: "Halley's Comet", queries: ['Halley'] },
  { surface: 'small-bodies', id: 'oumuamua', subject: "ʻOumuamua (interstellar object)", queries: ['Oumuamua', 'interstellar'] },
  { surface: 'small-bodies', id: 'pluto', subject: 'Pluto (the dwarf planet)', queries: ['Pluto'] },
  { surface: 'satellites', id: 'moon', subject: "Earth's Moon", queries: ['Moon'] },
  { surface: 'satellites', id: 'phobos', subject: 'Phobos (Mars moon)', queries: ['Phobos'] },
  { surface: 'satellites', id: 'deimos', subject: 'Deimos (Mars moon)', queries: ['Deimos'] },
  { surface: 'satellites', id: 'io', subject: 'Io (Jupiter moon)', queries: ['Io'] },
  { surface: 'satellites', id: 'europa', subject: 'Europa (Jupiter moon)', queries: ['Europa'] },
  { surface: 'satellites', id: 'ganymede', subject: 'Ganymede (Jupiter moon)', queries: ['Ganymede'] },
  { surface: 'satellites', id: 'callisto', subject: 'Callisto (Jupiter moon)', queries: ['Callisto'] },
  { surface: 'satellites', id: 'titan', subject: 'Titan (Saturn moon)', queries: ['Titan'] },
  { surface: 'satellites', id: 'enceladus', subject: 'Enceladus (Saturn moon)', queries: ['Enceladus'] },
  { surface: 'satellites', id: 'triton', subject: 'Triton (Neptune moon)', queries: ['Triton'] },
  { surface: 'satellites', id: 'charon', subject: 'Charon (Pluto moon)', queries: ['Charon'] },
  { surface: 'satellites', id: 'miranda', subject: 'Miranda (Uranus moon)', queries: ['Miranda'] },
  { surface: 'satellites', id: 'ariel', subject: 'Ariel (Uranus moon)', queries: ['Ariel'] },
  { surface: 'satellites', id: 'titania', subject: 'Titania (Uranus moon)', queries: ['Titania'] },
  { surface: 'satellites', id: 'oberon', subject: 'Oberon (Uranus moon)', queries: ['Oberon'] },
  // Note: 'sun' is NOT here — Hubble doesn't observe the Sun (too bright,
  // would damage the optics). Sun's hero needs a different source like
  // SDO / SOHO. Out of scope for the Hubble pass.
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HEIC_ID_RE = /\/images\/(heic\d{4}[a-z]?)\//g;

/** Search esahubble.org for image IDs matching a query. Returns up to 10. */
async function esahubbleSearch(query) {
  const url = `https://esahubble.org/images/?search=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) {
      console.log(`    [esahubble] HTTP ${res.status} on "${query}"`);
      return [];
    }
    const html = await res.text();
    const seen = new Set();
    const ids = [];
    for (const m of html.matchAll(HEIC_ID_RE)) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      ids.push(m[1]);
      if (ids.length >= 10) break;
    }
    return ids;
  } catch (e) {
    console.log(`    [esahubble] error on "${query}": ${e.message}`);
    return [];
  }
}

/** Fetch a single esahubble detail page; returns { id, title } or null. */
async function esahubbleDetail(id) {
  try {
    const res = await fetch(`https://esahubble.org/images/${id}/`, {
      headers: { 'User-Agent': UA },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const titleMatch = html.match(/<title>([^<|]+?)(?:\s*\|\s*ESA\/Hubble)?<\/title>/);
    const title = titleMatch
      ? titleMatch[1].replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim()
      : null;
    return { id, title };
  } catch {
    return null;
  }
}

function imageUrlFor(id) {
  // /screen/ is ~1280px wide JPEG (~300-800KB) vs /large/ which is
  // 1-5MB. Using /screen/ keeps the vision pipeline OOM-safe — first
  // v2 attempt crashed at Neptune after accumulating base64 buffers
  // from /large/ images (1.4× inflation × 59 calls ≈ 4GB).
  // 1280px is plenty for our 1600px sharp-resize target on apply.
  return `https://cdn.esahubble.org/archives/images/screen/${id}.jpg`;
}
function sourceUrlFor(id) {
  return `https://esahubble.org/images/${id}/`;
}

async function processBody(body, budget) {
  const proposals = [];
  // 1. Gather candidate IDs from each query.
  const seen = new Set();
  const ids = [];
  for (const q of body.queries) {
    const found = await esahubbleSearch(q);
    for (const id of found) {
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push({ id, query: q });
    }
    await sleep(SCRAPE_THROTTLE_MS);
    if (ids.length >= CANDIDATES_PER_BODY) break;
  }
  console.log(`  [${body.surface}/${body.id}] ${ids.length} esahubble candidates`);
  if (ids.length === 0) return proposals;

  // 2. Pull detail pages for titles (small, fast).
  const details = [];
  for (const item of ids.slice(0, CANDIDATES_PER_BODY)) {
    const d = await esahubbleDetail(item.id);
    if (d) details.push({ ...item, title: d.title });
    await sleep(SCRAPE_THROTTLE_MS);
  }

  // 3. Vision-judge each (every result is provenance-guaranteed Hubble,
  //    but vision still confirms it's pure-body imagery — Hubble shoots
  //    deep-sky too, so we want to filter galaxies/nebulae out when the
  //    query happens to overlap a non-body category).
  const judged = [];
  for (const d of details) {
    if (budget.calls >= budget.cap) {
      console.log(`  [BUDGET] cap reached`);
      break;
    }
    const v = await judgeBodyImage({
      imageUrl: imageUrlFor(d.id),
      bodyId: body.id,
      subjectDescription: body.subject,
    });
    budget.calls++;
    await sleep(VISION_THROTTLE_MS);
    judged.push({ ...d, vision: v });
  }
  const survivors = judged
    .filter((c) => c.vision.verdict === 'related' && (c.vision.confidence ?? 0) >= 0.9)
    .sort((a, b) => (b.vision.confidence ?? 0) - (a.vision.confidence ?? 0))
    .slice(0, KEEP_PER_BODY);
  console.log(`  [${body.surface}/${body.id}] vision-pass: ${survivors.length}`);

  survivors.forEach((c) => {
    proposals.push({
      proposal_id: `hubble-${body.surface}-${body.id}-01`,
      agency: 'esahubble',
      surface: body.surface,
      missionId: body.id,
      slot: '01',
      query: c.query,
      currentSource: 'on-disk-round-1',
      proposed: {
        tier: 1,
        source_type: 'esahubble',
        image_url: imageUrlFor(c.id),
        source_url: sourceUrlFor(c.id),
        credit: 'ESA/Hubble',
        license: 'cc-by-4.0',
        metadata: {
          hubble_id: c.id,
          hubble_title: c.title,
          vision_confidence: c.vision.confidence,
          round: 'hubble-pass-v2',
        },
      },
      size_bytes: null,
      vision_v3: c.vision,
      survivor: true,
      drop_reasons: [],
      notes: ['hubble-pass v2 — sourced direct from esahubble.org, ESA/Hubble credited'],
    });
  });
  return proposals;
}

async function main() {
  const cap = parseInt(process.env.VISION_BUDGET_CALLS || '300', 10);
  const budget = { calls: 0, cap };
  const t0 = Date.now();
  const newProposals = [];
  for (const body of BODIES) {
    console.log(`\n=== ${body.surface}/${body.id} (${body.subject}) ===`);
    const props = await processBody(body, budget);
    newProposals.push(...props);
  }
  const existing = JSON.parse(readFileSync('static/data/bodies-salvage-result.json', 'utf8'));
  const existingIds = new Set(existing.proposals.map((p) => p.proposal_id));
  const merged = [
    ...existing.proposals,
    ...newProposals.filter((p) => !existingIds.has(p.proposal_id)),
  ];
  const out = {
    ...existing,
    generated_at: new Date().toISOString(),
    pipeline: 'bodies-salvage + hubble-pass-v2 (esahubble.org)',
    stats: {
      ...existing.stats,
      hubble_pass_calls: budget.calls,
      hubble_pass_proposals: newProposals.length,
      hubble_pass_survivors: newProposals.filter((p) => p.survivor).length,
      hubble_pass_duration_sec: ((Date.now() - t0) / 1000).toFixed(1),
    },
    proposals: merged,
  };
  writeFileSync('static/data/bodies-salvage-result.json', JSON.stringify(out, null, 2));
  console.log(`\n✓ wrote bodies-salvage-result.json`);
  console.log(`  appended ${newProposals.length} hubble proposals (all ESA/Hubble provenance)`);
  console.log(`  ${budget.calls}/${cap} vision calls (~$${(budget.calls * 0.0004).toFixed(3)})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
