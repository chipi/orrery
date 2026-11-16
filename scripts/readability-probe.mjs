/**
 * /explore readability probe (UXD-020, E2): measures the rendered look of each level in a real
 * browser and prints a table, so "too dark, hard to see in daylight" is a number, not a guess.
 *
 * For each level (solar system, neighbourhood, Milky Way, Local Group, Local Sheet, Virgo,
 * Laniakea, Cosmic web) at its default pose, plus the solar system flown in to Jupiter (the
 * moons' orbit lines only show near a planet), it
 *   1. screenshots the 3D canvas and prints the frame's luma percentiles (0..255, sRGB) — HUD
 *      overlays on the canvas are in the frame;
 *   2. asks the app where each element is on screen (window.__exploreLinePoints for the
 *      orbits, the two belts and the light-year rings; window.__scenePins for the anchor ring)
 *      and measures the WCAG contrast of those pixels against the pixels around them, raw and
 *      after a 12 % white veil (a daylight-glare stand-in): lib/readability-contrast.mjs. Points
 *      under an open side panel are dropped;
 *   3. measures the same points moved 8 px off the element (the negative control) and judges the
 *      element by its contrast MINUS what the control shows, so a bright starfield or glow cannot
 *      fake a pass;
 *   4. for the pin levels, reads the label text height and the ring diameter the scene drew.
 * Targets (operator 2026-11-12): 3:1 on the rendered pixels, 2:1 after the veil. The verdict is
 * PASS only when the median (p50) of the element-minus-control clears both; p10 is printed too
 * so a long dim tail is visible, but it does not decide.
 *
 *   Run (a dev server or a preview build must be up; this script does not start one). Run it at
 *   BOTH device pixel ratios: a WebGL line and a point are device pixels wide, so the rendered
 *   contrast at DPR 1 and at DPR 2 are separate measurements (hi-DPI laptops are common).
 *     node scripts/readability-probe.mjs --base=http://127.0.0.1:5173 --dpr=1
 *     node scripts/readability-probe.mjs --base=http://127.0.0.1:5173 --dpr=2
 *     node scripts/readability-probe.mjs --base=http://127.0.0.1:5173 --dpr=2 --viewport=390x844 \
 *       --contexts=solar-system,neighborhood --out=readability-after.json --shots=shots/
 *
 *   Flags: --base (default $PLAYWRIGHT_BASE_URL or http://127.0.0.1:5173), --viewport WxH
 *   (default 1440x900), --dpr 1|2 (default 1; deviceScaleFactor), --contexts a,b,c (default all
 *   nine: the eight levels and solar-system-jupiter), --out <file.json>, --shots <dir> (saves each
 *   canvas screenshot as <context>.png), --locale <code>.
 *
 * BEFORE and AFTER. The slice's hooks (`__exploreLinePoints`, `__scenePins`) exist only at and
 * after the slice, so the "before" numbers cannot come from the pre-slice tree. They come from a
 * temporary worktree at HEAD with the four pre-slice opacities put back — everything else is the
 * same code, so the difference is the lift and nothing else:
 *     bash scripts/readability-before.sh /work/orrery/worktrees/probe-before
 *   (it creates the worktree detached at HEAD and rewrites src/lib/three/explore-solar-scene.ts:
 *   asteroid belt 0.65 -> 0.5, Kuiper belt 0.55 -> 0.4, planet orbit lines 0.4 -> 0.25,
 *   small-body orbit lines 0.35 -> 0.22; it fails if any of the four is not found exactly once).
 *   Start a server from THAT worktree on another port and run this script against it with the same
 *   flags, then against HEAD's server; compare the two tables. Only the solar-system rows have a
 *   "before": the light-year rings and the anchor rings were redesigned in the slice, not lifted,
 *   and the moon-orbit lines were not changed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { CONTROL_SHIFT, lumaPercentiles, measureElement } from './lib/readability-contrast.mjs';

const LEVELS = [
  ['solar-system', ''],
  ['solar-system-jupiter', '?id=jupiter'],
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
  'solar-system': ['planet-orbits', 'small-orbits', 'asteroid-belt', 'kuiper-belt'],
  'solar-system-jupiter': ['moon-orbits'],
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
const DPR = Number(arg('dpr', '1'));
const WANT = arg('contexts', LEVELS.map(([id]) => id).join(',')).split(',');
const OUT = arg('out', '');
const SHOTS = arg('shots', '');
const LOCALE = arg('locale', '');
if (!(DPR >= 1)) throw new Error(`--dpr must be 1 or more, got ${arg('dpr', '1')}`);

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
  const lines = LINES[id];
  // Cold-loading an outer shell builds up to seven scenes in turn; a flight to Jupiter takes a few seconds.
  await page.waitForFunction(
    ({ outer, probeKind }) =>
      outer
        ? window.__scenePins?.() != null
        : typeof window.__exploreLinePoints === 'function' &&
          window.__exploreLinePoints(probeKind).length > 0,
    {
      outer: !lines || id === 'neighborhood',
      probeKind: id === 'solar-system-jupiter' ? 'moon-orbits' : 'planet-orbits',
    },
    { timeout: 60_000 },
  );
  await page.waitForTimeout(2500); // the entry fly settles
  const { box, panels } = await page.evaluate(() => {
    const c = [...document.querySelectorAll('canvas')]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0)
      .sort((a, b) => b.width * b.height - a.width * a.height)[0];
    const panels = [...document.querySelectorAll('aside.panel')].map((el) => {
      const r = el.getBoundingClientRect();
      return { l: r.left - c.left, r: r.right - c.left, t: r.top - c.top, b: r.bottom - c.top };
    });
    return { box: { x: c.left, y: c.top, w: c.width, h: c.height }, panels };
  });
  const png = await page.screenshot({
    clip: { x: box.x, y: box.y, width: box.w, height: box.h },
  });
  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    fs.writeFileSync(path.join(SHOTS, `${id}.png`), png);
  }
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Points are CSS px in the canvas box; the screenshot is DPR times larger. The block, the
  // background ring and the control shift are 3 x 3, 4 px and 8 px at DPR 1 and scale with it.
  const scale = info.width / box.w;
  const opts = {
    radius: Math.round(4 * scale),
    half: Math.ceil(scale),
    shift: CONTROL_SHIFT * scale,
  };
  const covered = (p) => panels.some((r) => p.x >= r.l && p.x <= r.r && p.y >= r.t && p.y <= r.b);
  const toPx = (pts) =>
    pts.filter((p) => !covered(p)).map((p) => ({ x: p.x * scale, y: p.y * scale }));
  const result = { level: id, dpr: DPR, frame: lumaPercentiles(data), elements: {}, pins: null };

  for (const kind of lines ?? []) {
    const pts = toPx(await page.evaluate((k) => window.__exploreLinePoints(k), kind));
    result.elements[kind] = pts.length
      ? measureElement(data, info.width, info.height, pts, opts)
      : null;
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
        toPx(anchors.flatMap((r) => circlePoints(r))),
        opts,
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
      deviceScaleFactor: DPR,
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
console.log(
  `readability probe  ${BASE}  ${VW}x${VH}  DPR ${DPR}  veil 12 %  targets 3:1 raw, 2:1 veiled, on p50 minus the 8 px control\n`,
);
console.log(
  '| level | frame p5 / p50 / p95 (luma 0-255) | element | points | raw p50 (p10) | control p50 | raw excess | veiled p50 (p10) | veiled excess | verdict |',
);
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const r of results) {
  if (r.error) {
    console.log(`| ${r.level} | ERROR: ${r.error} | | | | | | | | |`);
    continue;
  }
  const fr = `${r.frame.p5} / ${r.frame.p50} / ${r.frame.p95}`;
  const rows = Object.entries(r.elements);
  if (!rows.length) console.log(`| ${r.level} | ${fr} | (no line element) | | | | | | | |`);
  rows.forEach(([kind, m], i) => {
    const cells = m
      ? `${m.raw.n} | ${f(m.raw.p50)} (${f(m.raw.p10)}) | ${f(m.control.raw.p50)} | ${f(m.excess.raw)} | ${f(m.veiled.p50)} (${f(m.veiled.p10)}) | ${f(m.excess.veiled)} | ${m.pass ? 'PASS' : 'FAIL'}`
      : '0 | n/a | n/a | n/a | n/a | n/a | NOT MEASURED (no points on screen)';
    console.log(`| ${i === 0 ? r.level : ''} | ${i === 0 ? fr : ''} | ${kind} | ${cells} |`);
  });
  if (r.pins) {
    console.log(
      `|  | pins | labels shown ${r.pins.labelsShown}, text px ${r.pins.labelTextPx.join(', ')}, ring px ${r.pins.ringDiametersPx.join(', ')} | | | | | | | |`,
    );
  }
}
if (OUT)
  fs.writeFileSync(
    OUT,
    JSON.stringify({ base: BASE, viewport: [VW, VH], dpr: DPR, results }, null, 2),
  );
process.exitCode = results.some((r) => r.error) ? 1 : 0;
