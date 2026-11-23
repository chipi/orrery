import { chromium } from 'playwright';
// node docs/wip/2026-11-23-pass2-tools/desc-shot.mjs <prefix> <mission> [times comma-separated]
// A time is `f0.5` (a fraction of the descent), `-20` (seconds before the end) or `T327`
// (trajectory seconds from entry; set TB to the first non-entry beat, usually the chute, so the
// tool can undo the descent's time warp). SHOT_VIEWPORT=390x844 for a phone frame.
const [prefix, mission, fr = '-20,-6,0'] = process.argv.slice(2);
const OUT = (process.env.SHOT_DIR ?? 'test-results/shots').replace(/\/?$/, '/');
const [vw, vh] = (process.env.SHOT_VIEWPORT ?? '1280x800').split('x').map(Number);
(await import('node:fs')).mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: vw, height: vh } })).newPage();
for (let i = 0; i < 3; i++) {
  await page.goto(`${process.env.DEV_URL ?? 'http://localhost:5199'}/fly?mission=${mission}&descent=1&debug=1`).catch(() => {});
  if (await page.waitForFunction(() => typeof window.__descentSetT === 'function' && window.__descentDuration() > 0, null, { timeout: 90000 }).then(() => true, () => false)) break;
}
await page.waitForTimeout(8000);
const tB = Number(process.env.TB ?? 0);
const ENTRY_FRAC = 0.45; // descent-timewarp.ts ENTRY_TIMELINE_FRAC
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
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}${prefix}-${mission}-${f}.png` });
  console.log(mission, f);
}
await b.close();
