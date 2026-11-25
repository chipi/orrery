import { chromium } from 'playwright';
// node docs/wip/2026-11-23-pass2-tools/act-shot.mjs <prefix> <mission[,mission…]> <spec>
// The /fly launch and cruise acts for the W6 picture sheets. <spec> is a comma list of
// `L<s>` (all L, or all C, per run) (launch: ascent MET in seconds, via __flyLaunchT) and `C<d>` (cruise: mission elapsed
// days, via __flySetSimDay). Desktop 1280x800 and phone 390x844 (SHOT_VIEWPORT=WxH for one).
// Files: <prefix>-<d|p>-<mission>-<spec item>.png in SHOT_DIR.
const [prefix, missions, spec] = process.argv.slice(2);
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
    const launch = spec.startsWith('L') ? '&launch=1' : '';
    await page.goto(`${process.env.DEV_URL ?? 'http://localhost:5199'}/fly?mission=${mission}${launch}`).catch(() => {});
    const ok = await page
      .waitForFunction(
        (l) => typeof window.__flyLaunchT === 'function' && (!l || !!document.querySelector('[data-testid="launch-scene"]')),
        !!launch,
        { timeout: 90000 },
      )
      .then(() => true, () => false);
    if (ok) break;
  }
  await page.waitForTimeout(5000);
  // The mission card and the performance hint cover the scene: dismiss both.
  await page.keyboard.press('Escape').catch(() => {});
  await page.getByRole('button', { name: /not now/i }).click({ timeout: 1500 }).catch(() => {});
  for (const item of spec.split(',')) {
    const v = Number(item.slice(1));
    if (item[0] === 'L') await page.evaluate((x) => window.__flyLaunchT(x), v);
    else await page.evaluate((x) => window.__flySetSimDay(x), v);
    await page.waitForTimeout(item[0] === 'C' ? 2500 : 1500);
    await page.screenshot({ path: `${OUT}${prefix}-${tag}-${mission}-${item}.png` });
  }
  console.log(mission, tag, 'done');
  await page.close();
}

const jobs = missions.split(',').flatMap((m) => SIZES.map((s) => () => shoot(m, s)));
await Promise.all(
  Array.from({ length: Math.min(4, jobs.length) }, async () => {
    while (jobs.length) await jobs.shift()();
  }),
);
await b.close();
