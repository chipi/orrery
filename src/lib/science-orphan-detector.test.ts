/**
 * Drift-catcher: every /science article either has at least one
 * inbound code reference (deeplink, WhyPopover, lens learn:, hardcoded
 * link), OR is in the explicit `ORPHAN_ALLOWLIST` below. Issue #303.
 *
 * The audit that motivated this test surfaced 44 orphan articles
 * (43% of the encyclopedia) with zero inbound references — readers
 * could only reach them by typing the URL. This test is the floor
 * that prevents that drift from regrowing.
 *
 * # How "inbound reference" is detected
 *   1. Pattern A — `tab="X" ... section="Y"` within a 300-char window
 *      in any .svelte/.ts file (WhyPopover, ScienceArticleLink, etc).
 *   2. Pattern B — `tab: 'X' ... section: 'Y'` object literal
 *      (ScienceLayersPanel.metaFor `learn:` field).
 *   3. Pattern C — direct path literal `/science/X/Y` anywhere in
 *      src/ (markdown body, anchor href, navigation map).
 *
 * Conservative on purpose: false positives (a reference that doesn't
 * actually render as a click target) are acceptable. False negatives
 * (a real link the regexes miss) get added to the allowlist with a
 * note pointing at the actual reference, and that's fine.
 *
 * # ORPHAN_ALLOWLIST
 * Each entry is `{ id: 'tab/section', reason: '...' }`. Use sparingly:
 *   • PERMANENT — editorial-only article with no current home (e.g.
 *     a future surface-route topic that doesn't have a route yet).
 *     Reason should reference the future PRD or "no current home".
 *   • IN-PROGRESS — orphan being closed by an active issue. Reason
 *     should name the issue + the planned anchor. Remove from the
 *     allowlist as soon as the inbound reference lands.
 *
 * Once issue #303 is fully resolved, only PERMANENT entries remain.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SCIENCE_ROOT = 'static/data/science';
const SRC_ROOT = 'src';

interface AllowlistEntry {
  id: string;
  reason: string;
}

const ORPHAN_ALLOWLIST: AllowlistEntry[] = [
  // ── PERMANENT — future-route editorial-only (life-in-space surface) ──
  // No /lunar-surface or /mars-surface crewed route yet; these articles
  // are the editorial foundation for the future routes. Promote out of
  // the allowlist when the corresponding route lands and starts linking
  // to them.
  {
    id: 'life-in-space/food-production-off-world',
    reason: 'PERMANENT — future surface route (no /lunar-surface or /mars-surface yet)',
  },
  {
    id: 'life-in-space/isru-resource-utilization',
    reason: 'PERMANENT — future surface route',
  },
  {
    id: 'life-in-space/lunar-habitat-design',
    reason: 'PERMANENT — future Artemis surface route',
  },
  {
    id: 'life-in-space/lunar-surface-ops',
    reason: 'PERMANENT — future Artemis surface route',
  },
  {
    id: 'life-in-space/mars-habitat-design',
    reason: 'PERMANENT — future crewed-Mars route',
  },
  {
    id: 'life-in-space/mars-human-architecture',
    reason: 'PERMANENT — future crewed-Mars route',
  },
  {
    id: 'life-in-space/surface-dust-mitigation',
    reason: 'PERMANENT — future surface route',
  },
  {
    id: 'life-in-space/surface-mobility-rovers',
    reason: 'PERMANENT — future surface route',
  },

  // ── PERMANENT-INDIRECT — referenced via data-driven runtime navigation ──
  // The Local Group billboard sprites in /explore are driven by the
  // `science_section` field in `static/data/local-group-galaxies.json`.
  // Clicking a sprite navigates to /science/observation/<section>. The
  // orphan-detector regex walks src/ for literal references only; it
  // misses the JSON data-driven path. These 5 articles are reachable
  // and intentional — allowlisted with a pointer to the data file.
  {
    id: 'observation/andromeda-galaxy',
    reason: 'PERMANENT-INDIRECT — local-group-galaxies.json science_section',
  },
  {
    id: 'observation/dwarf-spheroidals',
    reason: 'PERMANENT-INDIRECT — local-group-galaxies.json science_section',
  },
  {
    id: 'observation/galaxy-types',
    reason: 'PERMANENT-INDIRECT — local-group-galaxies.json science_section',
  },
  {
    id: 'observation/local-group',
    reason: 'PERMANENT-INDIRECT — local-group-galaxies.json science_section',
  },
  {
    id: 'observation/magellanic-clouds',
    reason: 'PERMANENT-INDIRECT — local-group-galaxies.json science_section',
  },

  // ── IN-PROGRESS — issue #303 backlog. Remove as inbound refs land. ──
  // orbits (5)
  { id: 'orbits/cislunar-orbits', reason: 'IN-PROGRESS #303 — /moon + /fly cislunar' },
  { id: 'orbits/disposal-end-of-life', reason: 'IN-PROGRESS #303 — /earth ISS decommissioning' },
  { id: 'orbits/space-debris', reason: 'IN-PROGRESS #303 — /earth + /fleet retired-satellites' },
  { id: 'orbits/special-orbits', reason: 'IN-PROGRESS #303 — /earth + /moon orbit-regime chip' },
  { id: 'orbits/sun-synchronous', reason: 'IN-PROGRESS #303 — /earth observation-sat category' },
  // history (6 — entire tab orphan)
  { id: 'history/apollo-11-1969', reason: 'IN-PROGRESS #303 — /moon Apollo 11 mission panel' },
  { id: 'history/goddard-liquid-rocket-1926', reason: 'IN-PROGRESS #303 — /history or /fleet' },
  { id: 'history/keplers-laws-1609', reason: 'IN-PROGRESS #303 — /explore Foundation lens footer' },
  { id: 'history/newton-principia-1687', reason: 'IN-PROGRESS #303 — /explore lens-story footer' },
  { id: 'history/sputnik-1957', reason: 'IN-PROGRESS #303 — /earth ISS where-it-began' },
  // space-stations (4 — entire tab orphan)
  {
    id: 'space-stations/expedition-cadence',
    reason: 'IN-PROGRESS #303 — /iss + /tiangong expedition',
  },
  { id: 'space-stations/node-module', reason: 'IN-PROGRESS #303 — /iss module architecture' },
  {
    id: 'space-stations/pressurized-volume',
    reason: 'IN-PROGRESS #303 — /iss + /tiangong volume stat',
  },
  {
    id: 'space-stations/solar-power-budget',
    reason: 'IN-PROGRESS #303 — /iss + /tiangong power stat',
  },
  // life-in-space (8 needs-anchor)
  {
    id: 'life-in-space/crew-dynamics-psychology',
    reason: 'IN-PROGRESS #303 — /iss + /tiangong crew',
  },
  { id: 'life-in-space/crew-selection', reason: 'IN-PROGRESS #303 — /iss crew panel' },
  { id: 'life-in-space/crewed-station-design', reason: 'IN-PROGRESS #303 — /iss + /tiangong arch' },
  {
    id: 'life-in-space/eclss-life-support',
    reason: 'IN-PROGRESS #303 — /iss + /tiangong life-support',
  },
  {
    id: 'life-in-space/pre-flight-training',
    reason: 'IN-PROGRESS #303 — /iss + /tiangong crew panel',
  },
  {
    id: 'life-in-space/sleep-nutrition-circadian',
    reason: 'IN-PROGRESS #303 — /iss + /tiangong life-support',
  },
  { id: 'life-in-space/suit-lineage', reason: 'IN-PROGRESS #303 — /iss + /tiangong EVA panel' },
];

const NON_CONTENT_TABS = new Set(['reading-list', 'watch-list']);

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  function walk(d: string) {
    if (!existsSync(d)) return;
    for (const entry of readdirSync(d)) {
      const p = join(d, entry);
      const stat = statSync(p);
      if (stat.isDirectory()) walk(p);
      else if (/\.(svelte|ts)$/.test(p) && !p.endsWith('.test.ts')) out.push(p);
    }
  }
  walk(dir);
  return out;
}

function gatherInboundRefs(): Set<string> {
  const refs = new Set<string>();
  const files = listSourceFiles(SRC_ROOT);
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    // Pattern A — Svelte prop pair
    const propRe =
      /tab="([a-z][a-z0-9-]*)"[\s\S]{0,300}?section="([a-z][a-z0-9-]*)"|section="([a-z][a-z0-9-]*)"[\s\S]{0,300}?tab="([a-z][a-z0-9-]*)"/g;
    let m: RegExpExecArray | null;
    while ((m = propRe.exec(text)) !== null) {
      if (m[1] && m[2]) refs.add(`${m[1]}/${m[2]}`);
      else if (m[3] && m[4]) refs.add(`${m[4]}/${m[3]}`);
    }
    // Pattern B — object literal `tab: 'X', section: 'Y'`
    const objRe =
      /tab:\s*['"]([a-z][a-z0-9-]*)['"][\s\S]{0,200}?section:\s*['"]([a-z][a-z0-9-]*)['"]/g;
    while ((m = objRe.exec(text)) !== null) refs.add(`${m[1]}/${m[2]}`);
    // Pattern C — direct path literal `/science/X/Y`
    const pathRe = /\/science\/([a-z][a-z0-9-]*)\/([a-z][a-z0-9-]*)/g;
    while ((m = pathRe.exec(text)) !== null) refs.add(`${m[1]}/${m[2]}`);
  }
  return refs;
}

function gatherArticles(): string[] {
  const out: string[] = [];
  for (const tab of readdirSync(SCIENCE_ROOT)) {
    if (NON_CONTENT_TABS.has(tab)) continue;
    const tabDir = join(SCIENCE_ROOT, tab);
    if (!statSync(tabDir).isDirectory()) continue;
    const indexPath = join(tabDir, '_index.json');
    if (!existsSync(indexPath)) continue;
    const index = JSON.parse(readFileSync(indexPath, 'utf8')) as { ids: string[] };
    for (const id of index.ids) out.push(`${tab}/${id}`);
  }
  return out;
}

describe('PRD-024 audit — /science orphan detector', () => {
  const inbound = gatherInboundRefs();
  const articles = gatherArticles();
  const allowlistIds = new Set(ORPHAN_ALLOWLIST.map((e) => e.id));

  it('every article either has an inbound code reference or is allowlisted', () => {
    const unaccounted: string[] = [];
    for (const article of articles) {
      if (inbound.has(article)) continue;
      if (allowlistIds.has(article)) continue;
      unaccounted.push(article);
    }
    expect(
      unaccounted,
      `Orphan article(s) without inbound code reference or allowlist entry:\n  ${unaccounted.join('\n  ')}\n\nFix: add a WhyPopover/ScienceArticleLink/lens-learn-deeplink/href reference, OR add to ORPHAN_ALLOWLIST with a documented reason.`,
    ).toEqual([]);
  });

  it('every allowlist entry refers to a real article (no stale entries)', () => {
    const stale: string[] = [];
    const articleSet = new Set(articles);
    for (const entry of ORPHAN_ALLOWLIST) {
      if (!articleSet.has(entry.id)) stale.push(entry.id);
    }
    expect(
      stale,
      `Stale allowlist entries (article no longer exists):\n  ${stale.join('\n  ')}`,
    ).toEqual([]);
  });

  it('IN-PROGRESS allowlist entries get cleaned up as orphans are closed', () => {
    // Reports the number of in-progress orphans remaining so the
    // shrinking allowlist becomes a visible work-in-progress signal in
    // test output. Not a hard failure — the cap is informational.
    const inProgress = ORPHAN_ALLOWLIST.filter((e) => e.reason.startsWith('IN-PROGRESS'));
    const count = inProgress.length;
    // Soft ratchet: refuse to let the in-progress count grow past the
    // initial 35 #303 batch. New IN-PROGRESS entries beyond that need
    // a fresh issue + their own tracking. (Started at 38; planets-tab
    // 3 closed via PlanetPanel science-sections list.)
    expect(count, `IN-PROGRESS allowlist size: ${count}`).toBeLessThanOrEqual(21);
  });
});
