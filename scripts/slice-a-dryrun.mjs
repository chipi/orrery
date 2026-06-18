#!/usr/bin/env node
// Slice A generic dry-run — runs the v2 resolver against every Tier 3
// provenance entry whose agency matches the given --agency=<token>.
// READ-ONLY: no disk writes to images/sidecars, only a per-run JSON
// payload + stdout summary. Same shape as slice-a-1-nasa-dryrun.mjs
// (which it supersedes) but parameterised by agency.
//
// Usage:
//   node scripts/slice-a-dryrun.mjs --agency=NASA       # A-1
//   node scripts/slice-a-dryrun.mjs --agency=Roscosmos  # A-2
//   node scripts/slice-a-dryrun.mjs --agency=ESA        # A-3
//   node scripts/slice-a-dryrun.mjs --agency=JAXA       # A-4
//
// Optional:
//   --limit=<N>   — cap candidates (debug)
//   --throttle=600 — ms between API calls
//
// Agency matching is token-based: an entry with agency
// "ESA / NASA" matches --agency=ESA AND --agency=NASA — runs both
// sub-slices won't double-process because each run filters then
// resolves; you'd just dedup at apply time.

import { readFileSync, writeFileSync } from 'fs';
import { resolveAgencyImage } from './lib/agency-resolver.mjs';
import { judgeImage, isShippable } from './lib/vision-judge.mjs';

process.loadEnvFile?.();

// ── CLI parsing ────────────────────────────────────────────────────

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.+)$/);
    return m ? [m[1], m[2]] : [a.replace(/^-+/, ''), true];
  }),
);
const TARGET_AGENCY = args.agency;
if (!TARGET_AGENCY) {
  console.error('usage: slice-a-dryrun.mjs --agency=<token> [--limit=N] [--throttle=600]');
  process.exit(2);
}
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const THROTTLE = args.throttle ? parseInt(args.throttle, 10) : 600;
// Vision-judge layer (Claude Haiku) — runs per proposal, ~$0.0004 each.
// Skip with --no-vision for fast iteration on gate/resolver work.
const VISION_ENABLED = !args['no-vision'];
const VISION_THROTTLE = args.visionThrottle ? parseInt(args.visionThrottle, 10) : 150;

// ── Load data ──────────────────────────────────────────────────────

const PROV = JSON.parse(readFileSync('static/data/image-provenance.json', 'utf8'));
const MISSIONS = JSON.parse(readFileSync('static/data/missions/index.json', 'utf8'));
const FLEET = JSON.parse(readFileSync('static/data/fleet/index.json', 'utf8'));

const AGENCY_BY_ID = {};
const CATEGORY_BY_ID = {};
const NAME_BY_ID = {};
for (const m of MISSIONS) {
  if (!m.id) continue;
  AGENCY_BY_ID[m.id] = m.agency ?? '?';
  NAME_BY_ID[m.id] = m.name ?? m.title ?? null;
}
for (const f of FLEET) {
  if (!f.id) continue;
  if (!AGENCY_BY_ID[f.id]) AGENCY_BY_ID[f.id] = f.agency ?? '?';
  if (!NAME_BY_ID[f.id]) NAME_BY_ID[f.id] = f.name ?? f.title ?? null;
  CATEGORY_BY_ID[f.id] = f.category ?? null;
}

// Fix C — short cryptic IDs (a7l, aces, axemu, etc.) match nothing
// in NASA images-api or NASM. Expand the query with a category-based
// suffix so the gate has body tokens to match on.
const CATEGORY_QUERY_SUFFIX = {
  'space-suit': 'spacesuit',
  launcher: 'launch vehicle',
  'crewed-spacecraft': 'spacecraft',
  'cargo-spacecraft': 'cargo spacecraft',
  orbiter: 'spacecraft',
  lander: 'lander',
  rover: 'rover',
  'launch-site': 'launch complex',
  observatory: 'observatory',
};

function deriveQuery(missionId) {
  // Fix G — prefer the catalog's human-readable `name` over the ID slug.
  // Solves the UAESA `hope` case ("Hope Probe" is far better than "hope"
  // for matching NASA/Commons). Falls back to ID-derived query when the
  // catalog has no name (legacy entries / fleet/missions without name).
  const name = NAME_BY_ID[missionId];
  if (name && name.length > 2) {
    return name;
  }
  // Fix F — split letter↔digit boundaries so concatenated IDs like
  // `apollo10`, `mariner10`, `viking1` match "Apollo 10" / "Mariner 10".
  const base = missionId
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])(\d)/gi, '$1 $2')
    .replace(/(\d)([a-z])/gi, '$1 $2');
  // For short cryptic IDs (≤4 chars) tied to a fleet category, append
  // a category descriptor (e.g. "a7l" → "a7l spacesuit").
  const category = CATEGORY_BY_ID[missionId];
  const suffix = CATEGORY_QUERY_SUFFIX[category];
  if (base.length <= 4 && suffix) return `${base} ${suffix}`;
  return base;
}

function tierOf(sourceType) {
  if (!sourceType) return null;
  if (sourceType === 'nasa-image-library' || sourceType === 'nasa-images-api') return 1;
  if (sourceType === 'wikimedia-commons' || sourceType === 'direct-other') return 3;
  return 2;
}

function agencyMatches(agencyStr, target) {
  return (agencyStr || '')
    .split(/[/,·&]/)
    .map((s) => s.trim())
    .some((t) => t === target);
}

// ── Candidate filter ───────────────────────────────────────────────

const CANDIDATES = [];
for (const entry of PROV.entries) {
  const path = entry.path || '';
  if (!path.match(/\.jpg$/i) || path.match(/\.1x1\.jpg$/i)) continue;
  const m = path.match(/\/images\/(missions|fleet-galleries)\/([^/]+)\/(\d+)\.jpg$/i);
  if (!m) continue;
  const [, surface, missionId, slot] = m;
  const agency = AGENCY_BY_ID[missionId] ?? entry.agency ?? '?';
  if (!agencyMatches(agency, TARGET_AGENCY)) continue;
  if (tierOf(entry.source_type) !== 3) continue;
  CANDIDATES.push({ surface, missionId, slot, agency, currentSource: entry.source_type, path });
  if (CANDIDATES.length >= LIMIT) break;
}

console.log(`Slice A dry-run — agency=${TARGET_AGENCY}`);
console.log(`Candidates: ${CANDIDATES.length} Tier 3 entries matching agency=${TARGET_AGENCY}\n`);

// ── Resolver loop ──────────────────────────────────────────────────

const proposals = [];
const stats = {
  tier1_upgrade: 0,
  tier2_upgrade: 0,
  no_change: 0,
  miss: 0,
  vision_passed: 0,
  vision_flagged: 0,
  vision_unsure: 0,
};

// Per-mission Smithsonian `seenIds` so dedup applies across slots.
const seenIdsPerMission = new Map();

for (let i = 0; i < CANDIDATES.length; i++) {
  const c = CANDIDATES[i];
  const query = deriveQuery(c.missionId);
  let seenIds = seenIdsPerMission.get(c.missionId);
  if (!seenIds) {
    seenIds = new Set();
    seenIdsPerMission.set(c.missionId, seenIds);
  }
  let result;
  try {
    result = await resolveAgencyImage({
      mission: c.missionId,
      slot: c.slot,
      agency: c.agency,
      query,
      seenIds,
    });
  } catch (e) {
    proposals.push({ ...c, query, proposed: null, error: e.message });
    stats.miss++;
    continue;
  }
  // Vision-judge layer — verify the proposed candidate's content matches
  // the mission. Skip if --no-vision OR no proposal OR no image_url.
  let vision = null;
  if (VISION_ENABLED && result?.image_url) {
    vision = await judgeImage({
      imageUrl: result.image_url,
      missionId: c.missionId,
      agency: c.agency,
      subjectDescription: query,
    });
    await new Promise((r) => setTimeout(r, VISION_THROTTLE));
    if (vision.verdict === 'related') stats.vision_passed++;
    else if (vision.verdict === 'unrelated') stats.vision_flagged++;
    else stats.vision_unsure++;
  }

  proposals.push({
    ...c,
    query,
    proposed: result
      ? {
          tier: result.tier,
          source_type: result.source_type,
          image_url: result.image_url,
          credit: result.credit,
          license: result.license,
        }
      : null,
    vision, // {verdict, confidence, reason} or null when skipped
    // ship_at_apply: requires a proposal AND a confident 'related' verdict
    // when vision was consulted. 'unsure' / sub-0.9 'related' / 'unrelated'
    // all block apply — they may still surface to the human approval UI for
    // manual override. See scripts/lib/vision-judge.mjs:isShippable.
    ship_at_apply: !!(result && (!vision || isShippable(vision))),
  });
  if (!result) stats.miss++;
  else if (result.tier === 1) stats.tier1_upgrade++;
  else if (result.tier === 2) stats.tier2_upgrade++;
  else stats.no_change++;

  if (i % 25 === 24) {
    const visionPart = VISION_ENABLED
      ? ` | vision: ✓${stats.vision_passed} ✗${stats.vision_flagged} ?${stats.vision_unsure}`
      : '';
    console.log(
      `  …${i + 1}/${CANDIDATES.length} (T1 ${stats.tier1_upgrade}, T2 ${stats.tier2_upgrade}, T3 ${stats.no_change}, miss ${stats.miss})${visionPart}`,
    );
  }
  await new Promise((r) => setTimeout(r, THROTTLE));
}

// ── Output ─────────────────────────────────────────────────────────

const slug = TARGET_AGENCY.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const outPath = `static/data/slice-a-${slug}-dryrun.json`;
writeFileSync(
  outPath,
  JSON.stringify(
    {
      agency: TARGET_AGENCY,
      totals: stats,
      candidate_count: CANDIDATES.length,
      proposals,
    },
    null,
    2,
  ) + '\n',
);

console.log('\n── result ──');
console.log(`  Tier 1 upgrade:           ${stats.tier1_upgrade}`);
console.log(`  Tier 2 upgrade:           ${stats.tier2_upgrade}`);
console.log(`  No change (still T3):     ${stats.no_change}`);
console.log(`  Miss / error:             ${stats.miss}`);
if (VISION_ENABLED) {
  console.log(`\n  Vision passed (related):  ${stats.vision_passed}`);
  console.log(`  Vision flagged (unrelated): ${stats.vision_flagged}`);
  console.log(`  Vision unsure:            ${stats.vision_unsure}`);
  const shipCount = proposals.filter((p) => p.ship_at_apply).length;
  console.log(`\n  Will ship at apply:       ${shipCount}`);
  console.log(
    `  Held by vision flag:      ${stats.vision_flagged} (skipped at apply — stay on current Commons)`,
  );
}
console.log(`  Total evaluated:          ${CANDIDATES.length}`);
console.log(`\nFull payload: ${outPath}`);
