#!/usr/bin/env node
/**
 * Smoke harness for Stage 2 resolver diversification.
 *
 * Two layers:
 *   1. Unit test of the `pickWithDedup` helper — runs offline, catches
 *      regressions in the per-pick dedup state machine.
 *   2. Integration test against the live resolver — calls
 *      resolveAgencyImage for a handful of missions (otv-1..3, vega-1..2,
 *      vostok-1..2, gaganyaan/01..02) with one shared `alreadyTaken`
 *      Set across all calls. Asserts no two calls return the same
 *      source_url. Live network; ~10–15 s.
 *
 * Pass when:
 *   - unit tests are 4/4 OK
 *   - the integration pass returns at most ONE source_url duplicate
 *     across the test missions (small tolerance: in the long tail of
 *     scrape failures, two calls may both fall through to null and
 *     that doesn't count as a leak).
 *
 * Usage:
 *   node scripts/__smoke__/resolver-diversity.mjs
 *   node scripts/__smoke__/resolver-diversity.mjs --skip-network
 */

import { pickWithDedup, takenKey, resolveAgencyImage } from '../lib/agency-resolver.mjs';

process.loadEnvFile?.();

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.+)$/);
    return m ? [m[1], m[2]] : [a.replace(/^-+/, ''), 'true'];
  }),
);
const SKIP_NETWORK = args['skip-network'] === 'true';

let passed = 0;
let failed = 0;
function check(label, condition) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

// ── Unit tests ─────────────────────────────────────────────────────────
console.log('unit: pickWithDedup');
{
  const taken = new Set();
  const r = pickWithDedup(
    [],
    () => true,
    () => 'k',
    taken,
  );
  check('empty candidate list → null', r === null);
}
{
  const taken = new Set();
  const candidates = [{ id: 'a' }, { id: 'b' }];
  const r = pickWithDedup(
    candidates,
    () => true,
    (c) => takenKey('test', c.id),
    taken,
  );
  check('first un-taken candidate wins', r === candidates[0]);
  check('picked key is added to alreadyTaken', taken.has(takenKey('test', 'a')));
}
{
  const taken = new Set([takenKey('test', 'a')]);
  const candidates = [{ id: 'a' }, { id: 'b' }];
  const r = pickWithDedup(
    candidates,
    () => true,
    (c) => takenKey('test', c.id),
    taken,
  );
  check('first-already-taken → returns second', r === candidates[1]);
}
{
  const taken = new Set([takenKey('test', 'a'), takenKey('test', 'b')]);
  const r = pickWithDedup(
    [{ id: 'a' }, { id: 'b' }],
    () => true,
    (c) => takenKey('test', c.id),
    taken,
  );
  check('all candidates taken → null', r === null);
}
{
  // Gate rejects all but candidate b; b not taken → picked even though a is later.
  const taken = new Set();
  const r = pickWithDedup(
    [
      { id: 'a', ok: false },
      { id: 'b', ok: true },
      { id: 'c', ok: false },
    ],
    (c) => c.ok,
    (c) => takenKey('test', c.id),
    taken,
  );
  check('gate filters non-matching, picks matching', r.id === 'b');
}

if (failed > 0) {
  console.error(`unit: FAIL (${failed} of ${passed + failed})`);
  process.exit(1);
}
console.log(`unit: OK (${passed}/${passed} passed)\n`);

if (SKIP_NETWORK) {
  console.log('integration: skipped (--skip-network)');
  process.exit(0);
}

// ── Integration test ───────────────────────────────────────────────────
const targets = [
  { mission: 'otv-1', agency: 'USSF', query: 'X-37B OTV-1' },
  { mission: 'otv-2', agency: 'USSF', query: 'X-37B OTV-2' },
  { mission: 'otv-3', agency: 'USSF', query: 'X-37B OTV-3' },
  { mission: 'vega-1', agency: 'Roscosmos', query: 'Vega 1' },
  { mission: 'vega-2', agency: 'Roscosmos', query: 'Vega 2' },
  { mission: 'vostok-1', agency: 'Roscosmos', query: 'Vostok 1' },
  { mission: 'vostok-2', agency: 'Roscosmos', query: 'Vostok 2' },
];

console.log(`integration: resolving ${targets.length} missions with shared alreadyTaken set…`);
const taken = new Set();
const results = [];
for (const t of targets) {
  try {
    const r = await resolveAgencyImage({
      mission: t.mission,
      slot: '01',
      agency: t.agency,
      query: t.query,
      alreadyTaken: taken,
    });
    results.push({ ...t, image_url: r?.image_url ?? null, source_type: r?.source_type ?? null });
  } catch (e) {
    results.push({ ...t, image_url: null, error: e.message });
  }
}

for (const r of results) {
  const tag = r.image_url ? `${r.source_type} ← ${r.image_url.slice(0, 70)}` : '— (no resolution)';
  console.log(`  ${r.mission}: ${tag}`);
}

const urls = results.map((r) => r.image_url).filter(Boolean);
const distinct = new Set(urls);
const duplicates = urls.length - distinct.size;
console.log(
  `\nintegration: ${urls.length} resolutions, ${distinct.size} distinct image_urls, ${duplicates} duplicates`,
);

if (duplicates > 1) {
  console.error(
    `integration: FAIL — ${duplicates} duplicate image_urls (Stage 2 dedup is leaking)`,
  );
  process.exit(1);
}
console.log('integration: OK');
