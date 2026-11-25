import { chromium } from 'playwright';
// node docs/wip/2026-11-23-pass2-tools/desc-shot.mjs <prefix> <mission[,mission…]> [times comma-separated]
// A time is `f0.5` (a fraction of the descent), `-20` (seconds before the end) or `T327`
// (trajectory seconds from entry; set TB to the first non-entry beat, usually the chute, so the
// tool can undo the descent's time warp). One run shoots every mission at desktop (1280x800) and
// phone (390x844) in parallel pages; SHOT_VIEWPORT=WxH limits it to that one size.
// Files: <prefix>-<d|p>-<mission>-<time>.png.
const [prefix, missions, fr = '-20,-6,0'] = process.argv.slice(2);
const OUT = (process.env.SHOT_DIR ?? 'test-results/shots').replace(/\/?$/, '/');
const SIZES = process.env.SHOT_VIEWPORT
  ? [['v', ...process.env.SHOT_VIEWPORT.split('x').map(Number)]]
  : [
      ['d', 1280, 800],
      ['p', 390, 844],
    ];
(await import('node:fs')).mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const tB = Number(process.env.TB ?? 0);
const ENTRY_FRAC = 0.45; // descent-timewarp.ts ENTRY_TIMELINE_FRAC

// `apollo12@apollo12-splashdown`: open the mission, then swap in that descent profile file (a
// splashdown is otherwise reached only through the way home).
async function shoot(spec, [tag, vw, vh]) {
  const [mission, profile] = spec.split('@');
  const page = await (await b.newContext({ viewport: { width: vw, height: vh } })).newPage();
  for (let i = 0; i < 3; i++) {
    await page.goto(`${process.env.DEV_URL ?? 'http://localhost:5199'}/fly?mission=${mission}&descent=1&debug=1`).catch(() => {});
    if (await page.waitForFunction(() => typeof window.__descentSetT === 'function' && window.__descentDuration() > 0, null, { timeout: 90000 }).then(() => true, () => false)) break;
  }
  if (profile) {
    const before = await page.evaluate(() => window.__descentDuration());
    await page.evaluate((f) => window.__descentLoadProfile(f), profile);
    await page.waitForFunction((d) => window.__descentDuration() !== d, before, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(8000); // the scene rebuilds after the HUD; slow with four pages at once
  }
  await page.waitForTimeout(3000);
  for (const f of fr.split(',')) {
    await page.evaluate(
      ([v, tb, ef]) => {
        const dur = window.__descentDuration();
        let raw;
        if (v.startsWith('f')) raw = dur * Number(v.slice(1));
        else if (v.startsWith('T')) {
          const t = Number(v.slice(1));
          const warps = tb > ef * dur;
          raw = !warps ? t : t <= tb ? (t / tb) * ef * dur : (ef + ((t - tb) / (dur - tb)) * (1 - ef)) * dur;
        } else raw = dur + Number(v);
        window.__descentSetT(raw);
      },
      [f, tB, ENTRY_FRAC],
    );
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${OUT}${prefix}-${tag}-${profile ?? mission}-${f}.png` });
  }
  console.log(mission, tag, 'done');
  await page.close();
}

// Software WebGL is CPU-bound: four pages at once is the most that stays responsive.
const jobs = missions.split(',').flatMap((m) => SIZES.map((s) => () => shoot(m, s)));
await Promise.all(Array.from({ length: Math.min(4, jobs.length) }, async () => {
  while (jobs.length) await jobs.shift()();
}));
await b.close();
