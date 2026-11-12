// B2-CHECK (UXD-022, science links) — run from anywhere in the repo: node scripts/check-science-links.mjs
// Prints each violation as "KIND  where  detail", then "B2-CHECK violations: N"; exits 1 on any.
// Allow marker: `b2-keep: <why>` on the line itself or the line directly above it.
// Read-only. Pure node (no TypeScript import): the ranking, the cap over every panel and the family
// share are proven by src/lib/science-links.test.ts; this proves the old patterns (a push-chain, a
// per-type default list, a hand-written link list in a panel) are gone and the data obeys the rule.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = execSync('git rev-parse --show-toplevel').toString().trim();
process.chdir(root);
const viol = [];
const v = (kind, where, detail = '') => viol.push({ kind, where, detail });
const rj = (p) => JSON.parse(readFileSync(p, 'utf8'));
const lines = (p) => readFileSync(p, 'utf8').split('\n');
const kept = (ls, i) => /b2-keep:/.test(ls[i]) || (i > 0 && /b2-keep:/.test(ls[i - 1]));
const MAX = 5;

// A. the helper and its test exist
for (const f of ['src/lib/science-links.ts', 'src/lib/science-links.test.ts']) {
  if (!existsSync(f)) v('NO-HELPER-FILE', f, 'missing');
}

// B. every panel that builds a science-link list goes through the helper
const PANELS = [
  'src/lib/components/PlanetPanel.svelte',
  'src/lib/components/SunPanel.svelte',
  'src/lib/components/SmallBodyPanel.svelte',
  'src/lib/components/SatellitePanel.svelte',
  'src/lib/components/BeltPanel.svelte',
  'src/lib/components/MissionPanel.svelte',
  'src/lib/components/FleetEntryPanel.svelte',
  'src/lib/components/StationModulePanel.svelte',
  'src/lib/surface-scene/EarthObjectPanel.svelte',
  'src/lib/data/body-entity.ts',
];
for (const f of PANELS) {
  if (!readFileSync(f, 'utf8').includes('pickScienceLinks('))
    v('PANEL-NOT-USING-HELPER', f, 'no pickScienceLinks( call');
}

// C. the MissionPanel push-chain
{
  const f = 'src/lib/components/MissionPanel.svelte';
  lines(f).forEach((l, i) => {
    if (/list\.push\(\{\s*tab:/.test(l) && !kept(lines(f), i))
      v('OLD-PUSHCHAIN', `${f}:${i + 1}`, l.trim().slice(0, 70));
  });
}

// D. generic per-type defaults
for (const f of execSync('git ls-files src', { maxBuffer: 1 << 26 })
  .toString()
  .split('\n')
  .filter((x) => /\.(svelte|ts)$/.test(x))) {
  const ls = lines(f);
  ls.forEach((l, i) => {
    if (/\b(PLANET|SUN|SMALL_BODY)_SCIENCE_SECTIONS\b/.test(l) && !kept(ls, i))
      v('GENERIC-DEFAULT', `${f}:${i + 1}`, l.trim().slice(0, 70));
  });
}

// E. hard-coded /science link lists inside panels and banners
for (const f of [
  'src/lib/components/StationModulePanel.svelte',
  'src/lib/surface-scene/EarthObjectPanel.svelte',
  'src/lib/components/StationOrbitBanner.svelte',
]) {
  const ls = lines(f);
  ls.forEach((l, i) => {
    if (/localHref\(`\/science\//.test(l) && !kept(ls, i))
      v('HARDCODED-LINK', `${f}:${i + 1}`, l.trim().slice(0, 70));
  });
}

// F. data: no body overlay or fleet entry names more than MAX sections
const locales = readdirSync('i18n-src');
const bodyDirs = ['planets', 'satellites', 'small-bodies', 'belts'];
const overlayFiles = [];
for (const loc of locales) {
  for (const d of bodyDirs) {
    const dir = join('i18n-src', loc, d);
    if (existsSync(dir))
      for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')))
        overlayFiles.push([loc, d, f, join(dir, f)]);
  }
  const sun = join('i18n-src', loc, 'sun.json');
  if (existsSync(sun)) overlayFiles.push([loc, '.', 'sun.json', sun]);
}
for (const [, , , p] of overlayFiles) {
  const n = (rj(p).science_sections ?? []).length;
  if (n > MAX) v('DATA-OVER-5', p, `${n} sections`);
}
function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (n.endsWith('.json')) out.push(p);
  }
  return out;
}
for (const p of walk('static/data/fleet')) {
  const s = rj(p).science;
  if (Array.isArray(s) && s.length > MAX) v('DATA-OVER-5', p, `${s.length} slugs`);
}

// G. the section reference (tab/section) is language-neutral: every locale equals en-US
const refs = (o) => (o.science_sections ?? []).map((e) => `${e.tab}/${e.section}`).join(',');
for (const [loc, d, f, p] of overlayFiles) {
  if (loc === 'en-US') continue;
  const en = join('i18n-src', 'en-US', d, f);
  if (!existsSync(en)) continue;
  if (refs(rj(p)) !== refs(rj(en))) v('LOCALE-REF-DRIFT', p, 'tab/section list differs from en-US');
}

// H. orbit-ruler regimes: within one ruler every pane has its own best card
for (const d of [
  'orbit-regimes',
  'orbit-regimes-explore',
  'orbit-regimes-mars',
  'orbit-regimes-moon',
]) {
  const seen = new Map();
  for (const f of readdirSync(join('i18n-src/en-US', d))
    .filter((x) => x.endsWith('.json'))
    .sort()) {
    const l = rj(join('i18n-src/en-US', d, f)).science_link;
    const k = l ? `${l.tab}/${l.section}` : null;
    if (!k) {
      v('REGIME-NO-LINK', `${d}/${f}`, 'no science_link');
      continue;
    }
    if (seen.has(k)) v('REGIME-REPEAT', `${d}/${f}`, `${k} also on ${seen.get(k)}`);
    else seen.set(k, f);
  }
}

// I. body-type panels: no two with the same list (en-US overlays)
for (const d of ['planets', 'satellites', 'small-bodies', 'belts']) {
  const seen = new Map();
  const planetIds = new Set(
    rj('static/data/planets.json')
      .planets.map((p) => p.name.toLowerCase())
      .filter((n) => n !== 'pluto'),
  ); // Pluto renders in SmallBodyPanel
  for (const f of readdirSync(join('i18n-src/en-US', d))
    .filter((x) => x.endsWith('.json'))
    .sort()) {
    if (d === 'planets' && !planetIds.has(f.replace('.json', ''))) continue; // leftover small-body files in planets/
    const k = (rj(join('i18n-src/en-US', d, f)).science_sections ?? [])
      .map((e) => `${e.tab}/${e.section}`)
      .sort()
      .join(',');
    if (seen.has(k)) v('SAME-LIST', `${d}/${f}`, `same list as ${seen.get(k)}`);
    else seen.set(k, f);
  }
}

// J. variety inside a body type: one section on more than half of the panels of that type
for (const d of ['planets', 'satellites', 'small-bodies']) {
  const planetIds = new Set(
    rj('static/data/planets.json')
      .planets.map((p) => p.name.toLowerCase())
      .filter((n) => n !== 'pluto'),
  ); // Pluto renders in SmallBodyPanel
  const files = readdirSync(join('i18n-src/en-US', d)).filter(
    (x) => x.endsWith('.json') && (d !== 'planets' || planetIds.has(x.replace('.json', ''))),
  );
  const count = {};
  for (const f of files)
    for (const e of new Set(
      (rj(join('i18n-src/en-US', d, f)).science_sections ?? []).map((e) => `${e.tab}/${e.section}`),
    ))
      count[e] = (count[e] ?? 0) + 1;
  for (const [s, n] of Object.entries(count))
    if (n > files.length / 2) v('SECTION-SHARE', `${d}`, `${s} on ${n} of ${files.length}`);
}

for (const x of viol) console.log(`${x.kind.padEnd(24)} ${x.where}  ${x.detail}`);
const by = {};
for (const x of viol) by[x.kind] = (by[x.kind] ?? 0) + 1;
console.log('by kind:', JSON.stringify(by));
console.log(`B2-CHECK violations: ${viol.length}`);
if (viol.length > 0) process.exit(1);
