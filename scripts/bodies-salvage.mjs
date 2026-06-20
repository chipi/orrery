#!/usr/bin/env node
/**
 * bodies-salvage — source pure-body imagery for planets / small-bodies /
 * satellites surfaces and emit proposals in the slice-a-review schema.
 *
 * Why a separate script from slice-a-salvage:
 *   - Different vision prompt (judgeBodyImage — rejects spacecraft, logos,
 *     text, people even when body is dominant in frame).
 *   - Different source mix (Commons searches biased toward observatory /
 *     probe output: Hubble, Voyager, Cassini, JunoCam, Mariner, NH).
 *   - Output goes to bodies-salvage-result.json + bodies-approvals.json,
 *     not slice-a-salvage-result.json — so the two review surfaces don't
 *     collide.
 *
 * Pipeline:
 *   for each body:
 *     fetch ≤50 Commons-search candidates from body-specific queries
 *     dedup by file URL + filter junk extensions / tiny sizes
 *     preFilterBodyCandidate() — drop mission/spacecraft/logo keywords
 *     judgeBodyImage() — strict prompt on survivors
 *     keep top 5 by vision confidence → slots 01–05 (top = hero)
 *     build proposal records
 *
 * Output schema matches slice-a-salvage-result.json so /dev/slice-a-review
 * can render bodies proposals without UI changes.
 *
 * Run:  ANTHROPIC_API_KEY=… node scripts/bodies-salvage.mjs
 * Cost: ~$0.20–0.40 for a full 33-body sweep (Haiku 4.5 vision).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { judgeBodyImage, preFilterBodyCandidate } from './lib/vision-judge.mjs';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

const CANDIDATES_PER_BODY = 40; // Commons-search-top-N before any filter
const KEEP_PER_BODY = 5; // slots 01–05
const MIN_BYTES = 100_000; // junk-image floor (real planet photos ≥ 100KB)
const MAX_BYTES = 25_000_000; // skip giant Hubble/TIFF originals — base64 inflates 1.4× and OOM-killed the first run on Earth's 80MB Blue Marble TIFF
const VISION_THROTTLE_MS = 120; // ~8 req/sec to Anthropic
const SCRAPE_THROTTLE_MS = 300; // ~3 req/sec to Commons (was 50 — got silently rate-limited around request #25)

// Per-body source queries. Each entry runs a separate Commons search
// and the results are merged + deduped. Queries are tuned to bias
// toward observatory / probe output (Hubble, Voyager, Cassini, etc.)
// where pure-body imagery dominates over mission-hardware shots.
const BODIES = [
  // ─── planets ────────────────────────────────────────────────────
  { surface: 'planets', id: 'mercury', subject: 'Mercury (the planet)', queries: [
    'Mercury planet MESSENGER', 'Mercury Mariner 10', 'Mercury surface crater',
  ]},
  { surface: 'planets', id: 'venus', subject: 'Venus (the planet)', queries: [
    'Venus planet Mariner 10', 'Venus Magellan radar', 'Venus atmosphere',
    'Venus surface Venera',
  ]},
  { surface: 'planets', id: 'earth', subject: 'Earth (the planet from space)', queries: [
    'Earth from space Blue Marble', 'Earth Apollo 17', 'Earth ISS view',
    'Earth full disc satellite',
  ]},
  { surface: 'planets', id: 'mars', subject: 'Mars (the planet)', queries: [
    'Mars planet Hubble', 'Mars Viking orbiter view', 'Mars from space',
    'Mars Olympus Mons HiRise', 'Mars Valles Marineris',
  ]},
  { surface: 'planets', id: 'jupiter', subject: 'Jupiter (the planet)', queries: [
    'Jupiter Hubble Space Telescope', 'Jupiter Voyager 1', 'Jupiter Cassini',
    'Jupiter JunoCam', 'Jupiter Great Red Spot',
  ]},
  { surface: 'planets', id: 'saturn', subject: 'Saturn (the planet with rings)', queries: [
    'Saturn Hubble', 'Saturn Cassini', 'Saturn rings',
    'Saturn Voyager', 'Saturn aurora',
  ]},
  { surface: 'planets', id: 'uranus', subject: 'Uranus (the planet)', queries: [
    'Uranus Voyager 2', 'Uranus Hubble', 'Uranus rings',
  ]},
  { surface: 'planets', id: 'neptune', subject: 'Neptune (the planet)', queries: [
    'Neptune Voyager 2', 'Neptune Hubble', 'Neptune Great Dark Spot',
  ]},
  { surface: 'planets', id: 'pluto', subject: 'Pluto (the dwarf planet)', queries: [
    'Pluto New Horizons', 'Pluto surface heart Tombaugh',
  ]},
  // ─── small-bodies (dwarfs / comets / interstellar) ─────────────
  { surface: 'small-bodies', id: 'ceres', subject: 'Ceres (the dwarf planet)', queries: [
    'Ceres Dawn spacecraft', 'Ceres surface bright spots',
  ]},
  { surface: 'small-bodies', id: 'eris', subject: 'Eris (the dwarf planet)', queries: [
    'Eris dwarf planet', 'Eris Dysnomia',
  ]},
  { surface: 'small-bodies', id: 'haumea', subject: 'Haumea (the dwarf planet)', queries: [
    'Haumea dwarf planet', 'Haumea rings',
  ]},
  { surface: 'small-bodies', id: 'makemake', subject: 'Makemake (the dwarf planet)', queries: [
    'Makemake dwarf planet', 'Makemake Hubble',
  ]},
  { surface: 'small-bodies', id: '67p', subject: "Comet 67P/Churyumov–Gerasimenko", queries: [
    '67P Churyumov Gerasimenko Rosetta', 'Comet 67P nucleus',
  ]},
  { surface: 'small-bodies', id: 'halley', subject: "Halley's Comet", queries: [
    "Halley's Comet Giotto nucleus", 'Halley comet 1986',
  ]},
  { surface: 'small-bodies', id: 'oumuamua', subject: "ʻOumuamua (interstellar object)", queries: [
    'Oumuamua interstellar object', 'Oumuamua artist impression',
  ]},
  { surface: 'small-bodies', id: 'pluto', subject: 'Pluto (the dwarf planet)', queries: [
    'Pluto New Horizons', 'Pluto surface heart Tombaugh',
  ]},
  // ─── satellites (moons) ────────────────────────────────────────
  { surface: 'satellites', id: 'moon', subject: "Earth's Moon", queries: [
    'Moon from space Apollo', 'Moon full disc', 'Moon surface craters',
    'Moon farside LRO',
  ]},
  { surface: 'satellites', id: 'phobos', subject: 'Phobos (Mars moon)', queries: [
    'Phobos Mars moon MRO', 'Phobos Viking', 'Phobos Stickney crater',
  ]},
  { surface: 'satellites', id: 'deimos', subject: 'Deimos (Mars moon)', queries: [
    'Deimos Mars moon MRO', 'Deimos Viking',
  ]},
  { surface: 'satellites', id: 'io', subject: 'Io (Jupiter moon)', queries: [
    'Io Galileo spacecraft', 'Io volcanic surface', 'Io Voyager',
  ]},
  { surface: 'satellites', id: 'europa', subject: 'Europa (Jupiter moon)', queries: [
    'Europa Galileo spacecraft', 'Europa surface ice', 'Europa Voyager',
  ]},
  { surface: 'satellites', id: 'ganymede', subject: 'Ganymede (Jupiter moon)', queries: [
    'Ganymede Galileo spacecraft', 'Ganymede surface', 'Ganymede Voyager',
  ]},
  { surface: 'satellites', id: 'callisto', subject: 'Callisto (Jupiter moon)', queries: [
    'Callisto Galileo spacecraft', 'Callisto surface', 'Callisto Voyager',
  ]},
  { surface: 'satellites', id: 'titan', subject: 'Titan (Saturn moon)', queries: [
    'Titan Cassini Saturn moon', 'Titan haze atmosphere', 'Titan Huygens surface',
  ]},
  { surface: 'satellites', id: 'enceladus', subject: 'Enceladus (Saturn moon)', queries: [
    'Enceladus Cassini Saturn moon', 'Enceladus tiger stripes', 'Enceladus plumes',
  ]},
  { surface: 'satellites', id: 'triton', subject: 'Triton (Neptune moon)', queries: [
    'Triton Voyager 2 Neptune moon', 'Triton surface',
  ]},
  { surface: 'satellites', id: 'charon', subject: 'Charon (Pluto moon)', queries: [
    'Charon New Horizons Pluto moon', 'Charon surface',
  ]},
  { surface: 'satellites', id: 'miranda', subject: 'Miranda (Uranus moon)', queries: [
    'Miranda Voyager 2 Uranus moon', 'Miranda surface cliffs',
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
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Search Commons for files matching a query — returns up to 50.
 *  Retries once on 429 / 503 with a 2s backoff. Logs non-2xx so silent
 *  rate-limits don't masquerade as "no results" (which they did during
 *  the first smoke test). */
async function commonsSearch(query) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    list: 'search',
    srsearch: `${query} filetype:bitmap`,
    srnamespace: '6', // File namespace
    srlimit: '50',
    origin: '*',
  });
  const url = `${COMMONS_API}?${params}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.status === 429 || res.status === 503) {
        console.log(`    [commons] ${res.status} on "${query}" — backing off 2s`);
        await sleep(2000);
        continue;
      }
      if (!res.ok) {
        console.log(`    [commons] HTTP ${res.status} on "${query}"`);
        return [];
      }
      const json = await res.json();
      const hits = json?.query?.search ?? [];
      return hits
        .map((h) => h.title.replace(/^File:/, ''))
        .filter((f) => /\.(jpg|jpeg|png|tif|tiff)$/i.test(f));
    } catch (e) {
      console.log(`    [commons] error on "${query}": ${e.message}`);
      return [];
    }
  }
  return [];
}

/** Fetch a single Commons file's imageinfo (size, mime, license). */
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
  return String(s)
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

function commonsImageUrl(filename) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=1600`;
}

function commonsFilePageUrl(filename) {
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename)}`;
}

async function processBody(body, budget) {
  const proposals = [];
  const seen = new Set();
  // 1. Gather Commons-search candidates from each query.
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
  console.log(`  [${body.surface}/${body.id}] ${candidates.length} candidates from ${body.queries.length} queries`);

  // 2. Pre-filter by URL/title keywords (cheap, no API).
  const preFiltered = [];
  for (const c of candidates) {
    const pre = preFilterBodyCandidate({ url: c.file, title: c.file });
    if (pre.reject) {
      proposals.push({
        proposal_id: `${body.surface}-${body.id}-DROP-${preFiltered.length}-${proposals.length}`,
        agency: 'commons',
        surface: body.surface,
        missionId: body.id,
        slot: 'unassigned',
        query: c.query,
        currentSource: 'on-disk',
        proposed: {
          tier: 1,
          source_type: 'wikimedia-commons',
          image_url: commonsImageUrl(c.file),
          source_url: commonsFilePageUrl(c.file),
          credit: '',
          license: '',
          metadata: { commons_file: c.file },
        },
        size_bytes: null,
        vision_v3: null,
        survivor: false,
        drop_reasons: [`pre-filter: ${pre.reason}`],
        notes: [],
      });
      continue;
    }
    preFiltered.push(c);
  }
  console.log(`  [${body.surface}/${body.id}] pre-filter: ${preFiltered.length}/${candidates.length} survived`);

  // 3. Pull imageinfo (size/license/credit) — cheap, no vision yet.
  //    Drop tiny images (< MIN_BYTES) here so we don't waste vision spend.
  const enriched = [];
  for (const c of preFiltered) {
    const info = await commonsImageInfo(c.file);
    await sleep(SCRAPE_THROTTLE_MS);
    if (!info) continue;
    if (info.size && (info.size < MIN_BYTES || info.size > MAX_BYTES)) {
      const reason =
        info.size < MIN_BYTES
          ? `size: ${(info.size / 1024).toFixed(1)}KB < min ${MIN_BYTES / 1024}KB`
          : `size: ${(info.size / 1_048_576).toFixed(1)}MB > max ${MAX_BYTES / 1_048_576}MB (would OOM on base64)`;
      proposals.push({
        proposal_id: `${body.surface}-${body.id}-SIZE-${proposals.length}`,
        agency: 'commons',
        surface: body.surface,
        missionId: body.id,
        slot: 'unassigned',
        query: c.query,
        currentSource: 'on-disk',
        proposed: {
          tier: 1,
          source_type: 'wikimedia-commons',
          image_url: commonsImageUrl(c.file),
          source_url: commonsFilePageUrl(c.file),
          credit: info.credit,
          license: info.license,
          metadata: { commons_file: c.file },
        },
        size_bytes: info.size,
        vision_v3: null,
        survivor: false,
        drop_reasons: [reason],
        notes: [],
      });
      continue;
    }
    enriched.push({ ...c, info });
  }
  console.log(`  [${body.surface}/${body.id}] size-filter: ${enriched.length} enriched`);

  // 4. Vision-judge — most expensive step. Stop early if budget exhausted.
  const judged = [];
  for (const c of enriched) {
    if (budget.calls >= budget.cap) {
      console.log(`  [BUDGET] cap reached at ${budget.calls} vision calls — skipping rest`);
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
    if (v.verdict !== 'related' || (v.confidence ?? 0) < 0.9) {
      proposals.push({
        proposal_id: `${body.surface}-${body.id}-REJECT-${proposals.length}`,
        agency: 'commons',
        surface: body.surface,
        missionId: body.id,
        slot: 'unassigned',
        query: c.query,
        currentSource: 'on-disk',
        proposed: {
          tier: 1,
          source_type: 'wikimedia-commons',
          image_url: commonsImageUrl(c.file),
          source_url: commonsFilePageUrl(c.file),
          credit: c.info.credit,
          license: c.info.license,
          metadata: { commons_file: c.file },
        },
        size_bytes: c.info.size,
        vision_v3: v,
        survivor: false,
        drop_reasons: [`vision: v=${v.verdict} c=${(v.confidence ?? 0).toFixed(2)} — ${(v.reason ?? '').slice(0, 110)}`],
        notes: [],
      });
    }
  }
  // 5. Pick top KEEP_PER_BODY by vision confidence (already filtered to
  //    'related' ≥ 0.9). Assign to slots 01..05.
  const survivors = judged
    .filter((c) => c.vision.verdict === 'related' && (c.vision.confidence ?? 0) >= 0.9)
    .sort((a, b) => (b.vision.confidence ?? 0) - (a.vision.confidence ?? 0))
    .slice(0, KEEP_PER_BODY);
  console.log(`  [${body.surface}/${body.id}] vision-pass: ${survivors.length} survivors`);

  survivors.forEach((c, i) => {
    const slot = String(i + 1).padStart(2, '0');
    proposals.push({
      proposal_id: `${body.surface}-${body.id}-${slot}`,
      agency: 'commons',
      surface: body.surface,
      missionId: body.id,
      slot,
      query: c.query,
      currentSource: 'on-disk',
      proposed: {
        tier: 1,
        source_type: 'wikimedia-commons',
        image_url: commonsImageUrl(c.file),
        source_url: commonsFilePageUrl(c.file),
        credit: c.info.credit,
        license: c.info.license,
        metadata: { commons_file: c.file, vision_confidence: c.vision.confidence },
      },
      size_bytes: c.info.size,
      vision_v3: c.vision,
      survivor: true,
      drop_reasons: [],
      notes: [],
    });
  });
  return proposals;
}

async function main() {
  const cap = parseInt(process.env.VISION_BUDGET_CALLS || '600', 10);
  const budget = { calls: 0, cap };
  const t0 = Date.now();
  const allProposals = [];
  for (const body of BODIES) {
    console.log(`\n=== ${body.surface}/${body.id} (${body.subject}) ===`);
    const props = await processBody(body, budget);
    allProposals.push(...props);
  }
  const out = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    pipeline: 'bodies-salvage',
    stats: {
      bodies_processed: BODIES.length,
      vision_calls: budget.calls,
      vision_cap: cap,
      proposals_total: allProposals.length,
      survivors: allProposals.filter((p) => p.survivor).length,
      duration_sec: ((Date.now() - t0) / 1000).toFixed(1),
    },
    proposals: allProposals,
  };
  writeFileSync('static/data/bodies-salvage-result.json', JSON.stringify(out, null, 2));
  console.log(`\n✓ wrote static/data/bodies-salvage-result.json`);
  console.log(`  ${out.stats.proposals_total} proposals (${out.stats.survivors} survivors)`);
  console.log(`  ${out.stats.vision_calls}/${cap} vision calls`);
  console.log(`  ~$${(budget.calls * 0.0004).toFixed(3)} estimated cost`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
