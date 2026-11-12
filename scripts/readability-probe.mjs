/**
 * /explore readability probe (UXD-020, E2): measures the rendered look of each level in a real
 * browser and prints a table, so "too dark, hard to see in daylight" is a number, not a guess.
 *
 * For each level (solar system, neighbourhood, Milky Way, Local Group, Local Sheet, Virgo,
 * Laniakea, Cosmic web) at its default pose it
 *   1. screenshots the 3D canvas (device pixel ratio 1) and prints the frame's luma
 *      percentiles (0..255, sRGB) — HUD overlays on the canvas are in the frame;
 *   2. asks the app where each element is on screen (window.__exploreLinePoints for the
 *      orbits, the belts and the light-year rings; window.__scenePins for the anchor ring) and
 *      measures the WCAG contrast of those pixels against the pixels around them, raw and
 *      after a 12 % white veil (a daylight-glare stand-in): lib/readability-contrast.mjs;
 *   3. for the pin levels, reads the label text height and the ring diameter the scene drew.
 * Targets (operator 2026-11-12): 3:1 on the rendered pixels, 2:1 after the veil; the verdict
 * column is PASS only when the median point clears both.
 *
 *   Run (a dev server or a preview build must be up; this script does not start one):
 *     node scripts/readability-probe.mjs --base=http://127.0.0.1:5173
 *     node scripts/readability-probe.mjs --base=http://127.0.0.1:5173 --viewport=390x844 \
 *       --contexts=solar-system,neighborhood --out=readability-before.json --shots=shots/
 *
 *   Flags: --base (default $PLAYWRIGHT_BASE_URL or http://127.0.0.1:5173), --viewport WxH
 *   (default 1440x900), --contexts a,b,c (default all eight), --out <file.json>,
 *   --shots <dir> (saves each canvas screenshot as <context>.png), --locale <code>.
 *
 * Run it on HEAD before the slice and after, with the same flags, and compare the two tables.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { lumaPercentiles, measureElement } from './lib/readability-contrast.mjs';

const LEVELS = [
  ['solar-system', ''],
  ['neighborhood', '?context=neighborhood'],
  ['milky-way', '?context=milky-way'],
  ['local-group', '?context=local-group'],
  ['local-sheet', '?context=local-sheet'],
  ['virgo', '?context=virgo'],
  ['laniakea', '?context=laniakea'],
  ['cosmic-web', '?context=cosmic-web'],
];
/** The element kinds the app can place on screen, per level. */
const LINES = {
  'solar-system': ['planet-orbits', 'moon-orbits', 'small-orbits', 'belts'],
  neighborhood: ['ly-rings'],
};

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const BASE = arg('base', process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173').replace(
  /\/$/,
  '',
);
const [VW, VH] = arg('viewport', '1440x900').split('x').map(Number);
const WANT = arg('contexts', LEVELS.map(([id]) => id).join(',')).split(',');
const OUT = arg('out', '');
const SHOTS = arg('shots', '');
const LOCALE = arg('locale', '');

/** Points on a ring seen from the front: the ring sprite reports its centre and diameter. */
function circlePoints(ring, n = 48) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push({ x: ring.cx + (Math.cos(a) * ring.d) / 2, y: ring.cy + (Math.sin(a) * ring.d) / 2 });
  }
  return pts;
}

async function probe(page, id, query) {
  await page.goto(`${BASE}${LOCALE ? `/${LOCALE}` : ''}/explore${query}`, {
    waitUntil: 'domcontentloaded',
  });
  const outer = !LINES[id];
  // Cold-loading an outer shell builds up to seven scenes in turn.
  await page.waitForFunction(
    (isOuter) =>
      isOuter
        ? window.__scenePins?.() != null
        : typeof window.__exploreLinePoints === 'function' &&
          window.__exploreLinePoints('planet-orbits').length > 0,
    outer || id === 'neighborhood',
    { timeout: 60_000 },
  );
  await page.waitForTimeout(2500); // the entry fly settles
  const box = await page.evaluate(() => {
    const c = [...document.querySelectorAll('canvas')]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0)
      .sort((a, b) => b.width * b.height - a.width * a.height)[0];
    return { x: c.left, y: c.top, w: c.width, h: c.height };
  });
  const png = await page.screenshot({
    clip: { x: box.x, y: box.y, width: box.w, height: box.h },
  });
  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    fs.writeFileSync(path.join(SHOTS, `${id}.png`), png);
  }
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const result = { level: id, frame: lumaPercentiles(data), elements: {}, pins: null };

  for (const kind of LINES[id] ?? []) {
    const pts = await page.evaluate((k) => window.__exploreLinePoints(k), kind);
    result.elements[kind] = pts.length ? measureElement(data, info.width, info.height, pts) : null;
  }
  const snap = await page.evaluate(() => window.__scenePins?.() ?? null);
  if (snap) {
    const shown = snap.labels.filter((l) => l.shown);
    result.pins = {
      labelsShown: shown.length,
      labelTextPx: [...new Set(shown.map((l) => Number(l.textPx.toFixed(1))))],
      ringDiametersPx: [...new Set(snap.rings.map((r) => Number(r.d.toFixed(1))))],
    };
    const anchors = snap.rings.filter((r) => r.opacity > 0);
    if (anchors.length) {
      result.elements['anchor-ring'] = measureElement(
        data,
        info.width,
        info.height,
        anchors.flatMap((r) => circlePoints(r)),
      );
    }
  }
  return result;
}

const browser = await chromium.launch();
const results = [];
try {
  for (const [id, query] of LEVELS) {
    if (!WANT.includes(id)) continue;
    const ctx = await browser.newContext({
      viewport: { width: VW, height: VH },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    try {
      results.push(await probe(page, id, query));
    } catch (e) {
      results.push({ level: id, error: String(e).split('\n')[0] });
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}

const f = (n) => (Number.isFinite(n) ? n.toFixed(2) : 'n/a');
console.log(`readability probe  ${BASE}  ${VW}x${VH}  veil 12 %  targets 3:1 raw, 2:1 veiled\n`);
console.log(
  '| level | frame p5 / p50 / p95 (luma 0-255) | element | points | raw p50 (p10) | veiled p50 | verdict |',
);
console.log('|---|---|---|---|---|---|---|');
for (const r of results) {
  if (r.error) {
    console.log(`| ${r.level} | ERROR: ${r.error} | | | | | |`);
    continue;
  }
  const fr = `${r.frame.p5} / ${r.frame.p50} / ${r.frame.p95}`;
  const rows = Object.entries(r.elements);
  if (!rows.length) console.log(`| ${r.level} | ${fr} | (no line element) | | | | |`);
  rows.forEach(([kind, m], i) => {
    const cells = m
      ? `${m.raw.n} | ${f(m.raw.p50)} (${f(m.raw.p10)}) | ${f(m.veiled.p50)} | ${m.pass ? 'PASS' : 'FAIL'}`
      : '0 | n/a | n/a | NOT MEASURED (no points on screen)';
    console.log(`| ${i === 0 ? r.level : ''} | ${i === 0 ? fr : ''} | ${kind} | ${cells} |`);
  });
  if (r.pins) {
    console.log(
      `|  | pins | labels shown ${r.pins.labelsShown}, text px ${r.pins.labelTextPx.join(', ')}, ring px ${r.pins.ringDiametersPx.join(', ')} | | | | |`,
    );
  }
}
if (OUT)
  fs.writeFileSync(OUT, JSON.stringify({ base: BASE, viewport: [VW, VH], results }, null, 2));
process.exitCode = results.some((r) => r.error) ? 1 : 0;
