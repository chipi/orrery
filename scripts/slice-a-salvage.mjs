#!/usr/bin/env node
/**
 * Slice A v3 — salvage pass (DRY-RUN only, NEVER touches image bytes).
 *
 * Reads the 14 dry-run JSONs already in repo and re-evaluates every
 * proposal against the stricter v3 filter chain:
 *
 *   --filter=vision           re-judge with the new vision-judge prompt
 *                             (Stage 1.2); drop unless isShippable
 *                             (verdict='related' AND confidence≥0.9)
 *   --filter=intra-mission    drop later occurrences when two slots of
 *                             the same mission share an image_url
 *   --filter=cross-mission    drop later occurrences when two different
 *                             missions share an image_url
 *   --filter=size             HEAD the image_url, drop if content-length
 *                             is below the minimum byte threshold
 *   --filter=token-match      drop unless the mission slug (or a
 *                             derived token) appears in the image title
 *                             / nasa_title / commons filename
 *
 * Writes `static/data/slice-a-salvage-result.json` (and a per-agency
 * `static/data/slice-a-{agency}-salvage.json` debug fork) recording
 * SURVIVORS plus a `drop_reasons[]` array for every dropped proposal.
 *
 * This script DOES NOT apply image changes. It is exclusively the input
 * to the Stage 4 approval UI; only after Marko picks survivors via that
 * UI does slice-a-apply.mjs run.
 *
 * Cost: ~$0.30 in Anthropic Haiku vision when --filter=vision is
 * included against the full ~700 ship_at_apply proposals.
 *
 * Usage:
 *   node scripts/slice-a-salvage.mjs                              # all filters
 *   node scripts/slice-a-salvage.mjs --filter=intra-mission,cross-mission
 *   node scripts/slice-a-salvage.mjs --filter=vision --limit=20   # quick re-judge sample
 *   node scripts/slice-a-salvage.mjs --skip-network               # no HEAD checks (size filter degrades)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';
import { judgeImage, isShippable, MIN_SHIP_CONFIDENCE } from './lib/vision-judge.mjs';

process.loadEnvFile?.();

// ── CLI ────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.+)$/);
    return m ? [m[1], m[2]] : [a.replace(/^-+/, ''), 'true'];
  }),
);

const ALL_FILTERS = ['vision', 'intra-mission', 'cross-mission', 'cross-mission-basename', 'size', 'token-match'];
const ENABLED_FILTERS = new Set(
  typeof args.filter === 'string'
    ? args.filter.split(',').map((s) => s.trim()).filter(Boolean)
    : ALL_FILTERS,
);
const LIMIT = typeof args.limit === 'string' ? parseInt(args.limit, 10) : Infinity;
const VISION_THROTTLE_MS = parseInt(args['vision-throttle'] ?? '200', 10);
// Per-source min-bytes table (round 3 lesson — round 2 used a single
// 100 KB floor but 3 of 4 `low-resolution` rejects came from
// wikimedia-commons and were just over 100 KB. Round-3 tightens
// per-source: Commons needs more bytes because its hero candidates
// run JPEG q80 at 1600px and legitimately hit 150 KB+. esahubble
// stays at 100 KB (its archive is already higher quality).
// CLI --min-bytes=N overrides the default for ALL sources.
const MIN_BYTES_OVERRIDE = typeof args['min-bytes'] === 'string' ? parseInt(args['min-bytes'], 10) : null;
const MIN_BYTES_BY_SOURCE = {
  'wikimedia-commons': 150_000,
  esahubble: 100_000,
  jaxa: 100_000,
  'nasa-image-library': 100_000,
  'smithsonian-openaccess': 100_000,
  'esa-multimedia': 100_000,
  default: 100_000,
};
function minBytesFor(sourceType) {
  if (MIN_BYTES_OVERRIDE != null) return MIN_BYTES_OVERRIDE;
  return MIN_BYTES_BY_SOURCE[sourceType] ?? MIN_BYTES_BY_SOURCE.default;
}
const SKIP_NETWORK = args['skip-network'] === 'true';
const OUTPUT_PATH = typeof args.output === 'string' ? args.output : 'static/data/slice-a-salvage-result.json';

console.log(`slice-a-salvage: filters=${[...ENABLED_FILTERS].join(',')} limit=${LIMIT === Infinity ? '∞' : LIMIT}`);
console.log(`slice-a-salvage: vision gate = related + confidence ≥ ${MIN_SHIP_CONFIDENCE}; min-bytes per-source (override=${MIN_BYTES_OVERRIDE ?? 'none'})`);

// ── Load all dry-run JSONs ─────────────────────────────────────────────
const dryrunPaths = [];
for await (const p of glob('static/data/slice-a-*-dryrun.json')) dryrunPaths.push(p);
for await (const p of glob('static/data/slice-explore-dryrun.json')) dryrunPaths.push(p);
dryrunPaths.sort();
console.log(`slice-a-salvage: loaded ${dryrunPaths.length} dry-run files`);

const allProposals = [];
for (const path of dryrunPaths) {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const agency = data.agency || path.match(/slice-(?:a-)?([^/-]+)/)?.[1] || '?';
  for (const p of data.proposals ?? []) {
    if (!p.proposed) continue; // skip "no resolution" rows
    const surface = p.surface ?? 'missions';
    const missionId = p.missionId ?? p.bodyId ?? '?';
    const slot = p.slot ?? '01';
    allProposals.push({
      proposal_id: `${agency.toLowerCase()}-${surface}-${missionId}-${slot}`,
      source_dryrun: path,
      agency,
      surface,
      missionId,
      slot,
      query: p.query,
      currentSource: p.currentSource ?? null,
      proposed: p.proposed,
      vision_v2: p.vision ?? null, // Original v2 verdict (kept for diff)
    });
  }
}
console.log(`slice-a-salvage: ${allProposals.length} proposals across all dry-runs`);

// ── Filter chain ───────────────────────────────────────────────────────
// verdicts: Map<proposal_id, {
//   survivor: boolean,
//   drop_reasons: string[],   // hard-drop attributions (counted in stats)
//   notes: string[],          // informational (deferred decisions etc.)
//   vision_v3?: object|null,
//   size?: number|null
// }>
const verdicts = new Map();

function addDrop(proposalId, reason) {
  const v = ensureVerdict(proposalId);
  v.drop_reasons.push(reason);
  v.survivor = false;
}
function addNote(proposalId, note) {
  const v = ensureVerdict(proposalId);
  v.notes.push(note);
}
function ensureVerdict(proposalId) {
  let v = verdicts.get(proposalId);
  if (!v) {
    v = { survivor: true, drop_reasons: [], notes: [] };
    verdicts.set(proposalId, v);
  }
  return v;
}

// Filter 1: token-match (cheap, no network)
if (ENABLED_FILTERS.has('token-match')) {
  console.log('\nfilter: token-match');
  let dropped = 0;
  for (const p of allProposals) {
    const haystack = [
      p.proposed.metadata?.commons_file,
      p.proposed.metadata?.nasa_title,
      p.proposed.metadata?.hubble_title,
      p.proposed.metadata?.flickr_title,
      p.proposed.metadata?.esa_slug,
      p.proposed.metadata?.smithsonian_title,
      p.proposed.metadata?.nara_title,
      p.proposed.image_url,
      p.proposed.source_url,
    ].filter(Boolean).join(' ').toLowerCase();
    const missionTokens = p.missionId.split(/[\s\-_]+/).filter((t) => t.length >= 3);
    const queryTokens = (p.query ?? '').toLowerCase().split(/\s+/).filter((t) => t.length >= 3);
    const tokens = [...new Set([...missionTokens, ...queryTokens])].map((t) => t.toLowerCase());
    if (tokens.length === 0) continue; // can't gate on empty
    const hit = tokens.some((t) => haystack.includes(t));
    if (!hit) {
      addDrop(p.proposal_id, `token-match: none of [${tokens.join(',')}] in title/url`);
      dropped++;
    }
  }
  console.log(`  dropped ${dropped} / ${allProposals.length}`);
}

// Filter 2: intra-mission-dupe — keep first occurrence per (mission, image_url), drop rest
if (ENABLED_FILTERS.has('intra-mission')) {
  console.log('\nfilter: intra-mission');
  const seen = new Map(); // `${missionId}|${image_url}` → first proposal_id
  let dropped = 0;
  // Sort by slot so slot 01 is the "first" winner.
  const sorted = [...allProposals].sort((a, b) => a.slot.localeCompare(b.slot));
  for (const p of sorted) {
    const key = `${p.missionId}|${p.proposed.image_url}`;
    const existing = seen.get(key);
    if (existing && existing !== p.proposal_id) {
      addDrop(p.proposal_id, `intra-mission-dupe: same image_url as ${existing}`);
      dropped++;
    } else if (!existing) {
      seen.set(key, p.proposal_id);
    }
  }
  console.log(`  dropped ${dropped} / ${allProposals.length}`);
}

// Load the cross-mission share-ok whitelist (rule 6 — legitimate
// cross-mission appearances Marko has explicitly approved). Used by
// the cross-mission and cross-mission-basename filters to skip dedup
// for whitelisted image_urls.
const SHARE_OK = (() => {
  try {
    const raw = JSON.parse(readFileSync('static/data/cross-mission-share-ok.json', 'utf8'));
    return new Set((raw.shared ?? []).map((e) => e.image_url));
  } catch {
    return new Set();
  }
})();

// Filter 3: cross-mission-dupe — keep first occurrence per image_url across missions
if (ENABLED_FILTERS.has('cross-mission')) {
  console.log('\nfilter: cross-mission');
  const seen = new Map(); // image_url → first proposal_id
  let dropped = 0;
  let whitelisted = 0;
  for (const p of allProposals) {
    const key = p.proposed.image_url;
    if (!key) continue;
    if (SHARE_OK.has(key)) {
      whitelisted++;
      continue; // legitimate cross-mission appearance — don't dedup
    }
    const existing = seen.get(key);
    if (existing && existing !== p.proposal_id) {
      addDrop(p.proposal_id, `cross-mission-dupe: same image_url as ${existing}`);
      dropped++;
    } else if (!existing) {
      seen.set(key, p.proposal_id);
    }
  }
  console.log(`  dropped ${dropped} / ${allProposals.length}${whitelisted ? `  (share-ok whitelisted: ${whitelisted})` : ''}`);
}

// Filter 3b: cross-mission-basename — same filename across missions with
// DIFFERENT URL params (e.g. ?width=1600 vs ?width=1024, or different
// CDN paths). URL-level dedup misses these; Marko tagged 3 such cases
// `duplicate` in round 1.
if (ENABLED_FILTERS.has('cross-mission-basename')) {
  console.log('\nfilter: cross-mission-basename');
  // For most URLs, basename is the path-tail without query. But some
  // CDN endpoints use a generic path-tail (Smithsonian IDS: `download`,
  // `deliveryService`) with the real identity in the `?id=` query
  // parameter. Round-2 mis-collapsed 54 of 56 Smithsonian URLs because
  // every one's path tail was `download`. Now we detect those endpoints
  // and use the id parameter instead.
  const basenameOf = (url) => {
    if (!url) return null;
    try {
      const u = new URL(url);
      const tail = u.pathname.split('/').pop() ?? '';
      if (/^(download|deliveryService|render|view)$/i.test(tail)) {
        const id = u.searchParams.get('id') ?? u.searchParams.get('Id');
        if (id) return id.toLowerCase().replace(/[\s_-]+/g, ' ').trim();
      }
      const noQuery = url.split('?')[0];
      const slash = noQuery.lastIndexOf('/');
      const base = slash >= 0 ? noQuery.slice(slash + 1) : noQuery;
      return decodeURIComponent(base).toLowerCase().replace(/[\s_-]+/g, ' ').trim();
    } catch {
      return null;
    }
  };
  const seen = new Map(); // basename → first proposal_id
  let dropped = 0;
  for (const p of allProposals) {
    if (SHARE_OK.has(p.proposed.image_url)) continue; // share-ok whitelist
    const b = basenameOf(p.proposed.image_url);
    if (!b || b.length < 6) continue; // too generic
    const existing = seen.get(b);
    if (existing && existing !== p.proposal_id) {
      addDrop(p.proposal_id, `cross-mission-basename: same filename "${b}" as ${existing}`);
      dropped++;
    } else if (!existing) {
      seen.set(b, p.proposal_id);
    }
  }
  console.log(`  dropped ${dropped} / ${allProposals.length}`);
}

// Filter 4: size — HEAD the image_url
if (ENABLED_FILTERS.has('size') && !SKIP_NETWORK) {
  console.log('\nfilter: size (HEAD content-length)');
  let dropped = 0;
  let checked = 0;
  let deferred = 0;
  for (const p of allProposals) {
    if (LIMIT !== Infinity && checked >= LIMIT) break;
    const v = ensureVerdict(p.proposal_id);
    if (!v.survivor) continue; // already dropped
    try {
      const httpsUrl = (p.proposed.image_url ?? '').replace(/^http:\/\//i, 'https://');
      const cleaned = httpsUrl.includes('Special:FilePath/')
        ? httpsUrl.replace(/\?.*$/, '')
        : httpsUrl;
      // Per-host throttle: NASA CDN aggressively 429s; 500ms between calls
      // keeps it happy. Commons / ESA / JAXA are fine at 100ms.
      const throttle = cleaned.includes('images-assets.nasa.gov') ? 500 : 100;
      let res = await fetch(cleaned, { method: 'HEAD', redirect: 'follow' });
      // One retry with longer wait on 429 (transient rate limit).
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 2000));
        res = await fetch(cleaned, { method: 'HEAD', redirect: 'follow' });
      }
      checked++;
      // 429 still after retry → "deferred", NOT dropped. Let the human
      // approval UI surface these so a CDN hiccup doesn't lose real wins.
      if (res.status === 429) {
        v.size = null;
        addNote(p.proposal_id, `size-deferred: HTTP 429 after retry (CDN rate-limited; let human reviewer decide)`);
        deferred++;
        await new Promise((r) => setTimeout(r, throttle));
        continue;
      }
      const cl = parseInt(res.headers.get('content-length') ?? '0', 10);
      v.size = cl;
      const minBytes = minBytesFor(p.proposed?.source_type);
      if (!res.ok || cl < minBytes) {
        addDrop(p.proposal_id, `size: HTTP ${res.status} content-length=${cl} (< ${minBytes} for ${p.proposed?.source_type})`);
        dropped++;
      }
      await new Promise((r) => setTimeout(r, throttle));
    } catch (e) {
      addDrop(p.proposal_id, `size: error ${e.message}`);
      dropped++;
    }
  }
  console.log(`  checked ${checked}, dropped ${dropped}, deferred ${deferred} (429 — sent to human review)`);
} else if (ENABLED_FILTERS.has('size') && SKIP_NETWORK) {
  console.log('\nfilter: size — skipped (--skip-network)');
}

// Filter 5: vision (expensive, last)
if (ENABLED_FILTERS.has('vision') && !SKIP_NETWORK) {
  console.log('\nfilter: vision (v3 prompt re-judge)');
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('  skipped: ANTHROPIC_API_KEY not set in env');
  } else {
    let dropped = 0;
    let judged = 0;
    for (const p of allProposals) {
      if (judged >= LIMIT) break;
      const v = ensureVerdict(p.proposal_id);
      if (!v.survivor) continue; // already dropped — skip the API call
      try {
        const vision = await judgeImage({
          imageUrl: p.proposed.image_url,
          missionId: p.missionId,
          agency: p.agency,
          subjectDescription: p.query ?? p.missionId,
        });
        v.vision_v3 = vision;
        judged++;
        if (!isShippable(vision)) {
          addDrop(p.proposal_id, `vision: v=${vision.verdict} c=${vision.confidence?.toFixed(2)} — ${(vision.reason ?? '').slice(0, 100)}`);
          dropped++;
        }
        if (judged % 25 === 0) {
          process.stderr.write(`  …${judged} judged, ${dropped} dropped\n`);
        }
      } catch (e) {
        addDrop(p.proposal_id, `vision: error ${e.message}`);
        dropped++;
      }
      await new Promise((r) => setTimeout(r, VISION_THROTTLE_MS));
    }
    console.log(`  judged ${judged}, dropped ${dropped}`);
  }
} else if (ENABLED_FILTERS.has('vision') && SKIP_NETWORK) {
  console.log('\nfilter: vision — skipped (--skip-network)');
}

// ── Emit result ────────────────────────────────────────────────────────
const results = allProposals.map((p) => {
  const v = ensureVerdict(p.proposal_id);
  return {
    proposal_id: p.proposal_id,
    agency: p.agency,
    surface: p.surface,
    missionId: p.missionId,
    slot: p.slot,
    query: p.query,
    currentSource: p.currentSource,
    proposed: p.proposed,
    vision_v2: p.vision_v2,
    vision_v3: v.vision_v3 ?? null,
    size_bytes: v.size ?? null,
    survivor: v.survivor,
    drop_reasons: v.drop_reasons,
    notes: v.notes,
  };
});

const survivors = results.filter((r) => r.survivor);
const dropped = results.filter((r) => !r.survivor);

writeFileSync(
  OUTPUT_PATH,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      filters_run: [...ENABLED_FILTERS],
      min_ship_confidence: MIN_SHIP_CONFIDENCE,
      min_bytes_override: MIN_BYTES_OVERRIDE,
      min_bytes_by_source: MIN_BYTES_BY_SOURCE,
      source_dryrun_files: dryrunPaths,
      totals: {
        proposals: results.length,
        survivors: survivors.length,
        dropped: dropped.length,
      },
      drop_attribution: ALL_FILTERS.reduce((acc, f) => {
        acc[f] = dropped.filter((r) => r.drop_reasons.some((reason) => reason.startsWith(f))).length;
        return acc;
      }, {}),
      proposals: results,
    },
    null,
    2,
  ) + '\n',
);

console.log(`\nslice-a-salvage: wrote ${OUTPUT_PATH}`);
console.log(`  proposals:  ${results.length}`);
console.log(`  survivors:  ${survivors.length}`);
console.log(`  dropped:    ${dropped.length}`);
console.log('  drop attribution:');
for (const f of ALL_FILTERS) {
  const n = dropped.filter((r) => r.drop_reasons.some((reason) => reason.startsWith(f))).length;
  console.log(`    ${f.padEnd(16)} ${n}`);
}
console.log('\nThis is the DRY-RUN salvage result. No image bytes have been changed.');
console.log('Next step (Stage 4): scripts/slice-a-review.mjs reads this file and writes an approval UI.');
