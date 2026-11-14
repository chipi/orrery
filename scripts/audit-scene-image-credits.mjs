#!/usr/bin/env node
/**
 * audit-scene-image-credits — are the images the /moon, /mars and /earth scenes really request
 * credited? Loads each scene, then its first N sites (`?site=` / `?object=`), records every
 * image the page asks for (each site's panel tabs are opened), and matches each to a row of
 * static/data/image-provenance.json (what /credits lists), by stem as credits-grouping.ts does;
 * Orrery's own art (anatomy, landing sequences, site illustrations …) is checked against
 * static/data/original-work.json instead (what /colophon lists). The permanent folder check is
 * src/lib/credits-coverage.test.ts; this one sees what a browser fetches, including anything
 * from outside the repo.
 *
 * Read-only. Needs a running dev or preview server and ONE headless Chromium (never run it beside
 * another browser job). Exits 1 when a requested repo image is in neither manifest.
 *
 * Usage: node scripts/audit-scene-image-credits.mjs [--base=http://[::1]:5180] [--sites=3]
 */
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const arg = (k, d) =>
  process.argv
    .find((a) => a.startsWith(`--${k}=`))
    ?.split('=')
    .slice(1)
    .join('=') ?? d;
const BASE = arg('base', 'http://[::1]:5180');
const SITES = Number(arg('sites', '3'));

const STEM_RE = /(?:\.(?:16x9|1x1|4x3))?\.[a-z0-9]+$/i;
const ladder = JSON.parse(readFileSync('static/data/image-ladder.json', 'utf8'));
const credited = new Set(
  JSON.parse(readFileSync('static/data/image-provenance.json', 'utf8')).entries.map((e) =>
    e.path.replace(STEM_RE, ''),
  ),
);
// Orrery's own art is not third-party: /colophon lists it (original-work.json), /credits does not.
const own = new Set();
const collect = (v) => {
  if (Array.isArray(v)) v.forEach(collect);
  else if (v && typeof v === 'object') {
    for (const k of ['file', 'thumb'])
      if (typeof v[k] === 'string') own.add(v[k].replace(STEM_RE, ''));
    Object.values(v).forEach(collect);
  }
};
collect(JSON.parse(readFileSync('static/data/original-work.json', 'utf8')));
const isRung = (p) => {
  const m = /^(.*)-(\d{3,4})\.webp$/.exec(p);
  return !!m && (ladder[m[1]] ?? []).includes(Number(m[2]));
};
const baseOf = (p) => {
  const m = /^(.*)-(\d{3,4})\.webp$/.exec(p);
  return m && isRung(p) ? `${m[1]}.webp` : p;
};

const ids = (file) => {
  const j = JSON.parse(readFileSync(file, 'utf8'));
  return (Array.isArray(j) ? j : (j.sites ?? j.objects ?? [])).map((e) => e.id);
};
const SCENES = [
  { name: 'moon', path: '/moon', param: 'site', ids: ids('static/data/moon-sites.json') },
  { name: 'mars', path: '/mars', param: 'site', ids: ids('static/data/mars-sites.json') },
  { name: 'earth', path: '/earth', param: 'object', ids: ids('static/data/earth-objects.json') },
];

const IMG_EXT = /\.(jpe?g|png|webp|svg|ktx2|avif)$/i;
const browser = await chromium.launch();
let bad = 0;
for (const scene of SCENES) {
  const seen = new Map();
  const visits = [
    scene.path,
    ...scene.ids.slice(0, SITES).map((id) => `${scene.path}?${scene.param}=${id}`),
  ];
  for (const url of visits) {
    const ctx = await browser.newContext({
      serviceWorkers: 'block',
      viewport: { width: 1280, height: 800 },
    });
    const page = await ctx.newPage();
    page.on('response', (r) => {
      const u = new URL(r.url());
      if (r.request().resourceType() !== 'image' && !IMG_EXT.test(u.pathname)) return;
      seen.set(r.url(), { status: r.status(), from: url });
    });
    await page.goto(BASE + url, { waitUntil: 'load' });
    await page.waitForLoadState('networkidle', { timeout: 45_000 }).catch(() => {});
    await page.waitForTimeout(3000);
    // A site's panel loads the photos of a tab only when it opens (STORY, GALLERY, DETAIL …).
    const tabs = page.locator('[role="tab"]');
    for (let i = 0; i < Math.min(await tabs.count(), 8); i++) {
      await tabs
        .nth(i)
        .click({ timeout: 2000 })
        .catch(() => {});
      await page.waitForTimeout(1200);
    }
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await ctx.close();
  }
  const requested = [];
  const external = [];
  const stems = new Set();
  for (const [full, info] of seen) {
    const u = new URL(full);
    if (u.origin !== new URL(BASE).origin) {
      external.push(`${u.origin}${u.pathname}`);
      continue;
    }
    if (!/^\/(images|textures|models)\//.test(u.pathname)) continue;
    const path = decodeURIComponent(u.pathname);
    const stem = baseOf(path).replace(STEM_RE, '');
    stems.add(stem);
    requested.push({ path, stem, status: info.status, from: info.from });
  }
  const onColophon = requested.filter((o) => !credited.has(o.stem) && own.has(o.stem));
  const missing = [
    ...new Set(
      requested.filter((o) => !credited.has(o.stem) && !own.has(o.stem)).map((o) => o.path),
    ),
  ];
  const failed = requested.filter((o) => o.status >= 400).map((o) => `${o.status} ${o.path}`);
  console.log(
    `${scene.name}: ${visits.length} visits, ${requested.length} repo image requests, ${stems.size} distinct stems, ` +
      `${requested.length - onColophon.length - missing.length} credited on /credits, ${onColophon.length} Orrery's own art (listed on /colophon), ` +
      `${missing.length} with no credit, ${external.length} external, ${failed.length} failed`,
  );
  for (const p of missing) console.log(`  NO CREDIT  ${p}`);
  for (const p of new Set(external)) console.log(`  EXTERNAL  ${p}`);
  for (const p of failed) console.log(`  FAILED  ${p}`);
  bad += missing.length;
}
await browser.close();
console.log(bad ? `AUDIT FAIL: ${bad} requested images without a credit` : 'AUDIT PASS');
process.exit(bad ? 1 : 0);
