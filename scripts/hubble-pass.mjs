#!/usr/bin/env node
/**
 * hubble-pass — second-round body-imagery sweep biased toward Hubble.
 *
 * Targets slot 01 (the hero card) for every body we already have on
 * disk. Round-1 (bodies-salvage.mjs) skewed toward Voyager / Cassini /
 * JunoCam because Commons ranks those higher when "Hubble" is just
 * one of several queries. This pass searches Hubble first, with
 * explicit category-bias queries:
 *     "Hubble Space Telescope photograph <body>"
 *     "<body> Hubble image"
 *     plus a Commons category lookup if a body-specific
 *     "Photographs of <Body> by the Hubble Space Telescope" category
 *     exists.
 *
 * Output: appends proposals to bodies-salvage-result.json with
 * proposal_ids prefixed `hubble-…`. Marko reviews in the same
 * /dev/slice-a-review?dataset=bodies UI; approving a hubble-* proposal
 * for slot 01 overrides the round-1 pick when bodies-apply re-runs.
 *
 * MAX_BYTES bumped to 60MB (vs 25MB in round 1) so Hubble's big TIFF
 * originals aren't pre-filtered out. Combined with the apply running
 * under --max-old-space-size=4096 we have memory headroom.
 *
 * Run:
 *   ANTHROPIC_API_KEY=… node --max-old-space-size=4096 --env-file=.env scripts/hubble-pass.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { judgeBodyImage, preFilterBodyCandidate } from './lib/vision-judge.mjs';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

const CANDIDATES_PER_BODY = 30;
const KEEP_PER_BODY = 1; // hero slot only
const MIN_BYTES = 100_000;
const MAX_BYTES = 60_000_000; // bumped from 25MB → 60MB so big Hubble TIFFs fit
const VISION_THROTTLE_MS = 120;
const SCRAPE_THROTTLE_MS = 350;

// Per-body Hubble-biased queries. Each body gets:
//   - canonical Hubble-name query first (search ranking favours it)
//   - secondary "<body> HST" + observatory variations
//   - explicit Commons category if known to exist
// Surface 'sun' is special-cased: file lives at static/images/sun/01.jpg
// with no per-id subdir (matches getSunGallery's flat layout).
const BODIES = [
  // planets
  { surface: 'planets', id: 'mercury', subject: 'Mercury (the planet)', queries: [
    'Mercury Hubble Space Telescope', 'Mercury Hubble HST', 'Mercury planet from HST',
  ]},
  { surface: 'planets', id: 'venus', subject: 'Venus (the planet)', queries: [
    'Venus Hubble Space Telescope', 'Venus Hubble UV', 'Venus planet HST observation',
  ]},
  { surface: 'planets', id: 'earth', subject: 'Earth (the planet from space)', queries: [
    'Blue Marble Apollo 17', 'Earth from Apollo 17', 'Earth full disk satellite',
  ]},
  { surface: 'planets', id: 'mars', subject: 'Mars (the planet)', queries: [
    'Mars Hubble Space Telescope', 'Mars Hubble HST', 'Mars planet from HST',
  ]},
  { surface: 'planets', id: 'jupiter', subject: 'Jupiter (the planet)', queries: [
    'Jupiter Hubble Space Telescope', 'Jupiter Hubble HST', 'Jupiter Great Red Spot Hubble',
  ]},
  { surface: 'planets', id: 'saturn', subject: 'Saturn (the planet with rings)', queries: [
    'Saturn Hubble Space Telescope', 'Saturn Hubble HST', 'Saturn rings Hubble',
  ]},
  { surface: 'planets', id: 'uranus', subject: 'Uranus (the planet)', queries: [
    'Uranus Hubble Space Telescope', 'Uranus Hubble HST', 'Uranus rings Hubble',
  ]},
  { surface: 'planets', id: 'neptune', subject: 'Neptune (the planet)', queries: [
    'Neptune Hubble Space Telescope', 'Neptune Hubble HST', 'Neptune Great Dark Spot Hubble',
  ]},
  { surface: 'planets', id: 'pluto', subject: 'Pluto (the dwarf planet)', queries: [
    'Pluto Hubble Space Telescope', 'Pluto Hubble HST',
  ]},
  // small-bodies
  { surface: 'small-bodies', id: 'ceres', subject: 'Ceres (the dwarf planet)', queries: [
    'Ceres Hubble Space Telescope', 'Ceres Hubble HST',
  ]},
  { surface: 'small-bodies', id: 'eris', subject: 'Eris (the dwarf planet)', queries: [
    'Eris Hubble Space Telescope', 'Eris dwarf planet HST',
  ]},
  { surface: 'small-bodies', id: 'haumea', subject: 'Haumea (the dwarf planet)', queries: [
    'Haumea Hubble Space Telescope', 'Haumea dwarf planet',
  ]},
  { surface: 'small-bodies', id: 'makemake', subject: 'Makemake (the dwarf planet)', queries: [
    'Makemake Hubble Space Telescope', 'Makemake dwarf planet',
  ]},
  { surface: 'small-bodies', id: '67p', subject: "Comet 67P/Churyumov–Gerasimenko", queries: [
    '67P Churyumov Gerasimenko nucleus Rosetta',
  ]},
  { surface: 'small-bodies', id: 'halley', subject: "Halley's Comet", queries: [
    "Halley's Comet 1986", 'Halley comet nucleus',
  ]},
  { surface: 'small-bodies', id: 'oumuamua', subject: "ʻOumuamua (interstellar object)", queries: [
    'Oumuamua interstellar artist impression',
  ]},
  { surface: 'small-bodies', id: 'pluto', subject: 'Pluto (the dwarf planet)', queries: [
    'Pluto Hubble Space Telescope', 'Pluto New Horizons true color',
  ]},
  // satellites (moons)
  { surface: 'satellites', id: 'moon', subject: "Earth's Moon", queries: [
    'Moon Hubble Space Telescope', 'Moon full disc Apollo',
  ]},
  { surface: 'satellites', id: 'phobos', subject: 'Phobos (Mars moon)', queries: [
    'Phobos MRO HiRise', 'Phobos Mars moon close-up',
  ]},
  { surface: 'satellites', id: 'deimos', subject: 'Deimos (Mars moon)', queries: [
    'Deimos MRO HiRise', 'Deimos Mars moon',
  ]},
  { surface: 'satellites', id: 'io', subject: 'Io (Jupiter moon)', queries: [
    'Io Hubble Space Telescope', 'Io Galileo true color',
  ]},
  { surface: 'satellites', id: 'europa', subject: 'Europa (Jupiter moon)', queries: [
    'Europa Hubble Space Telescope', 'Europa Galileo true color',
  ]},
  { surface: 'satellites', id: 'ganymede', subject: 'Ganymede (Jupiter moon)', queries: [
    'Ganymede Hubble Space Telescope', 'Ganymede Juno true color',
  ]},
  { surface: 'satellites', id: 'callisto', subject: 'Callisto (Jupiter moon)', queries: [
    'Callisto Hubble Space Telescope', 'Callisto Galileo true color',
  ]},
  { surface: 'satellites', id: 'titan', subject: 'Titan (Saturn moon)', queries: [
    'Titan Hubble Space Telescope', 'Titan Cassini true color',
  ]},
  { surface: 'satellites', id: 'enceladus', subject: 'Enceladus (Saturn moon)', queries: [
    'Enceladus Cassini true color', 'Enceladus plumes',
  ]},
  { surface: 'satellites', id: 'triton', subject: 'Triton (Neptune moon)', queries: [
    'Triton Voyager 2 true color', 'Triton Neptune moon Hubble',
  ]},
  { surface: 'satellites', id: 'charon', subject: 'Charon (Pluto moon)', queries: [
    'Charon New Horizons true color', 'Charon Hubble',
  ]},
  { surface: 'satellites', id: 'miranda', subject: 'Miranda (Uranus moon)', queries: [
    'Miranda Voyager 2 mosaic', 'Miranda Uranus moon close-up',
  ]},
  { surface: 'satellites', id: 'ariel', subject: 'Ariel (Uranus moon)', queries: [
    'Ariel Voyager 2 Uranus moon',
  ]},
  { surface: 'satellites', id: 'titania', subject: 'Titania (Uranus moon)', queries: [
    'Titania Voyager 2 Uranus moon',
  ]},
  { surface: 'satellites', id: 'oberon', subject: 'Oberon (Uranus moon)', queries: [
    'Oberon Voyager 2 Uranus moon',
  ]},
  // sun (single-entity surface; bodies-apply special-cases the path)
  { surface: 'sun', id: 'sun', subject: 'the Sun', queries: [
    'Sun Solar Dynamics Observatory SDO', 'Sun corona NASA', 'Sun chromosphere',
    'Sun ultraviolet AIA',
  ]},
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function commonsSearch(query) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    list: 'search',
    srsearch: `${query} filetype:bitmap`,
    srnamespace: '6',
    srlimit: '50',
    origin: '*',
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${COMMONS_API}?${params}`, { headers: { 'User-Agent': UA } });
      if (res.status === 429 || res.status === 503) {
        await sleep(2000);
        continue;
      }
      if (!res.ok) return [];
      const json = await res.json();
      const hits = json?.query?.search ?? [];
      return hits
        .map((h) => h.title.replace(/^File:/, ''))
        .filter((f) => /\.(jpg|jpeg|png|tif|tiff)$/i.test(f));
    } catch {
      return [];
    }
  }
  return [];
}

async function commonsImageInfo(filename) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    titles: `File:${filename}`,
    prop: 'imageinfo',
    iiprop: 'size|mime|extmetadata|url',
    origin: '*',
  });
  try {
    const res = await fetch(`${COMMONS_API}?${params}`, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    const json = await res.json();
    const pages = json?.query?.pages ?? {};
    const page = Object.values(pages)[0];
    const info = page?.imageinfo?.[0];
    if (!info) return null;
    const meta = info.extmetadata ?? {};
    return {
      size: info.size,
      mime: info.mime,
      width: info.width,
      height: info.height,
      license: (meta.LicenseShortName?.value ?? '').toLowerCase(),
      credit: stripHtml(meta.Credit?.value ?? meta.Artist?.value ?? ''),
      title: stripHtml(meta.ObjectName?.value ?? meta.ImageDescription?.value ?? filename),
    };
  } catch {
    return null;
  }
}

function stripHtml(s) {
  return String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
}
const commonsImageUrl = (f) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}?width=1600`;
const commonsFilePageUrl = (f) =>
  `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(f)}`;

async function processBody(body, budget) {
  const proposals = [];
  const seen = new Set();
  const candidates = [];
  for (const q of body.queries) {
    const files = await commonsSearch(q);
    for (const f of files) {
      if (seen.has(f)) continue;
      seen.add(f);
      candidates.push({ file: f, query: q });
    }
    await sleep(SCRAPE_THROTTLE_MS);
    if (candidates.length >= CANDIDATES_PER_BODY) break;
  }
  console.log(`  [${body.surface}/${body.id}] ${candidates.length} candidates`);

  const preFiltered = candidates.filter((c) => !preFilterBodyCandidate({ url: c.file, title: c.file }).reject);
  console.log(`  [${body.surface}/${body.id}] pre-filter: ${preFiltered.length}/${candidates.length}`);

  const enriched = [];
  for (const c of preFiltered) {
    const info = await commonsImageInfo(c.file);
    await sleep(SCRAPE_THROTTLE_MS);
    if (!info || (info.size && (info.size < MIN_BYTES || info.size > MAX_BYTES))) continue;
    enriched.push({ ...c, info });
  }
  console.log(`  [${body.surface}/${body.id}] size-filter: ${enriched.length}`);

  const judged = [];
  for (const c of enriched) {
    if (budget.calls >= budget.cap) {
      console.log(`  [BUDGET] cap reached`);
      break;
    }
    const v = await judgeBodyImage({
      imageUrl: commonsImageUrl(c.file),
      bodyId: body.id,
      subjectDescription: body.subject,
    });
    budget.calls++;
    await sleep(VISION_THROTTLE_MS);
    judged.push({ ...c, vision: v });
  }
  const survivors = judged
    .filter((c) => c.vision.verdict === 'related' && (c.vision.confidence ?? 0) >= 0.9)
    .sort((a, b) => (b.vision.confidence ?? 0) - (a.vision.confidence ?? 0))
    .slice(0, KEEP_PER_BODY);
  console.log(`  [${body.surface}/${body.id}] vision-pass: ${survivors.length}`);

  survivors.forEach((c, i) => {
    proposals.push({
      proposal_id: `hubble-${body.surface}-${body.id}-01`,
      agency: 'commons-hubble',
      surface: body.surface,
      missionId: body.id,
      slot: '01',
      query: c.query,
      currentSource: 'on-disk-round-1',
      proposed: {
        tier: 1,
        source_type: 'wikimedia-commons',
        image_url: commonsImageUrl(c.file),
        source_url: commonsFilePageUrl(c.file),
        credit: c.info.credit,
        license: c.info.license,
        metadata: {
          commons_file: c.file,
          vision_confidence: c.vision.confidence,
          round: 'hubble-pass',
        },
      },
      size_bytes: c.info.size,
      vision_v3: c.vision,
      survivor: true,
      drop_reasons: [],
      notes: ['hubble-pass — slot-01 hero candidate'],
    });
  });
  return proposals;
}

async function main() {
  const cap = parseInt(process.env.VISION_BUDGET_CALLS || '500', 10);
  const budget = { calls: 0, cap };
  const t0 = Date.now();
  const newProposals = [];
  for (const body of BODIES) {
    console.log(`\n=== ${body.surface}/${body.id} (${body.subject}) ===`);
    const props = await processBody(body, budget);
    newProposals.push(...props);
  }
  // Merge into existing bodies-salvage-result.json so the review UI
  // shows hubble-* proposals alongside round-1 picks.
  const existing = JSON.parse(readFileSync('static/data/bodies-salvage-result.json', 'utf8'));
  const existingIds = new Set(existing.proposals.map((p) => p.proposal_id));
  const merged = [
    ...existing.proposals,
    ...newProposals.filter((p) => !existingIds.has(p.proposal_id)),
  ];
  const out = {
    ...existing,
    generated_at: new Date().toISOString(),
    pipeline: 'bodies-salvage + hubble-pass',
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
  console.log(`  appended ${newProposals.length} hubble proposals`);
  console.log(`  ${budget.calls}/${cap} vision calls (~$${(budget.calls * 0.0004).toFixed(3)})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
