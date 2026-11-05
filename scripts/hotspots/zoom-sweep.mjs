#!/usr/bin/env node
/**
 * Zoom sweep for landing sites (read-only review tool, #641).
 *
 * Per site: open /<body>?site=<id>&debug=1 on a running dev server, wheel out to
 * the widest view, then wheel in one notch at a time to the closest zoom (or the
 * flat view). Saves a frame at fixed camera distances (camR 100 … 30.2, planet
 * radius 30) plus the flat view, a 3×3 contact sheet, and logs every HUD change
 * on the way down: nation legend, altitude readout, scale bar, imagery card,
 * flat view. Page errors are counted per site.
 *
 * What it caught in the 0.9.7 review: regional patch seams and colour jumps,
 * labels over the drive, white (evicted) Earth patches, giant pins near the
 * ground, stray selection-frame corners, "Sol undefined" stop pills.
 *
 * Needs the dev server (`npm run dev -- --port 5180`) and Playwright's Chromium.
 * The debug panel is hidden in the frames; its camR readout drives the stops.
 *
 *   node scripts/hotspots/zoom-sweep.mjs --body mars --out /tmp/sweep opportunity spirit
 *   node scripts/hotspots/zoom-sweep.mjs --body earth --base http://localhost:5180 --out … lc-39a
 *
 * Output: <out>/<site>-r<camR>.png, <out>/<site>-flat.png, <out>/sheet-<site>.jpg.
 * Stdout: "<site>: frames N errors M" and one indented line per HUD change.
 */
import { chromium } from 'playwright';
import sharp from 'sharp';

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return dflt;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const BODY = opt('body', 'mars');
const BASE = opt('base', 'http://localhost:5180');
const OUT = opt('out');
const SITES = args;
if (!OUT || !SITES.length) {
  console.error(
    'usage: zoom-sweep.mjs --body mars|moon|venus|earth --out <dir> [--base url] <site …>',
  );
  process.exit(2);
}
const STOPS = [100, 50, 40, 35, 32, 31, 30.5, 30.2];

const b = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
for (const site of SITES) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`${BASE}/${BODY}?site=${site}&debug=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await p.waitForTimeout(12000);
  await p.addStyleTag({ content: 'div[style*="z-index:9999"]{visibility:hidden!important}' });
  const probe = () =>
    p.evaluate(() => {
      const pre = [...document.querySelectorAll('pre')]
        .map((e) => e.textContent)
        .find((x) => x?.includes('camR'));
      const has = (s) => !!document.querySelector(s);
      return {
        camR: pre ? +(pre.match(/camR\s+([\d.]+)/)?.[1] ?? NaN) : NaN,
        legend: has('.legend-3d'),
        alt: has('.altitude-indicator'),
        scale: has('[data-testid=distance-scale]'),
        card: document.querySelector('.tier-context-card .tcc-site')?.textContent?.trim() ?? null,
        flat: has('[data-testid=exit-zoom]') || has('.hud-back'),
      };
    });
  await p.mouse.move(520, 450);
  for (let i = 0; i < 30; i++) {
    await p.mouse.wheel(0, 400);
    await p.waitForTimeout(50);
  }
  await p.waitForTimeout(2500);
  const frames = [];
  const log = [];
  let si = 0;
  let prev = null;
  for (let step = 0; step < 140; step++) {
    const s = await probe();
    const k = JSON.stringify({ ...s, camR: 0 });
    if (prev && k !== JSON.stringify({ ...prev, camR: 0 })) log.push(`r${s.camR} ${k}`);
    prev = s;
    if (s.flat) {
      await p.waitForTimeout(1500);
      const f = `${OUT}/${site}-flat.png`;
      await p.screenshot({ path: f });
      frames.push(f);
      break;
    }
    if (si < STOPS.length && s.camR <= STOPS[si]) {
      const f = `${OUT}/${site}-r${STOPS[si]}.png`;
      await p.screenshot({ path: f });
      frames.push(f);
      while (si < STOPS.length && s.camR <= STOPS[si]) si++;
    }
    await p.mouse.wheel(0, -60);
    await p.waitForTimeout(200);
  }
  const W = 720;
  const H = 450;
  const tiles = await Promise.all(frames.slice(0, 9).map((f) => sharp(f).resize(W, H).toBuffer()));
  await sharp({ create: { width: W * 3, height: H * 3, channels: 3, background: '#000' } })
    .composite(tiles.map((t, i) => ({ input: t, left: (i % 3) * W, top: Math.floor(i / 3) * H })))
    .jpeg({ quality: 80 })
    .toFile(`${OUT}/sheet-${site}.jpg`);
  console.log(
    `${site}: frames ${frames.length} errors ${errs.length} ${errs.slice(0, 2).join(' | ')}`,
  );
  for (const l of log) console.log('   ', l);
  await p.close();
}
await b.close();
