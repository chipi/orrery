import { chromium } from 'playwright';
// node docs/wip/2026-11-23-pass2-tools/return-shot.mjs <prefix> <mission[,mission…]> <t,t,…>
// The way-home scene (ReturnScene) at scene times t (s), desktop 1280x800 and phone 390x844
// (SHOT_VIEWPORT=WxH for one size). Files: <prefix>-<d|p>-<mission>-<t>.png in SHOT_DIR.
const [prefix, missions, ts] = process.argv.slice(2);
const OUT = (process.env.SHOT_DIR ?? 'test-results/shots').replace(/\/?$/, '/');
const SIZES = process.env.SHOT_VIEWPORT
  ? [['v', ...process.env.SHOT_VIEWPORT.split('x').map(Number)]]
  : [
      ['d', 1280, 800],
      ['p', 390, 844],
    ];
(await import('node:fs')).mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function shoot(mission, [tag, vw, vh]) {
  const page = await (await b.newContext({ viewport: { width: vw, height: vh } })).newPage();
  for (let i = 0; i < 3; i++) {
    await page
      .goto(`${process.env.DEV_URL ?? 'http://localhost:5199'}/fly?mission=${mission}&descent=1&wayhome=1&debug=1`)
      .catch(() => {});
    if (await page.waitForFunction(() => typeof window.__flyReturnT === 'function', null, { timeout: 90000 }).then(() => true, () => false)) break;
  }
  await page.waitForTimeout(4000);
  for (const t of ts.split(',')) {
    await page.evaluate((v) => window.__flyReturnT(Number(v)), t);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}${prefix}-${tag}-${mission}-${t}.png` });
  }
  console.log(mission, tag, 'done');
  await page.close();
}

// Software WebGL is CPU-bound: four pages at once is the most that stays responsive.
const jobs = missions.split(',').flatMap((m) => SIZES.map((s) => () => shoot(m, s)));
await Promise.all(
  Array.from({ length: Math.min(4, jobs.length) }, async () => {
    while (jobs.length) await jobs.shift()();
  }),
);
await b.close();
