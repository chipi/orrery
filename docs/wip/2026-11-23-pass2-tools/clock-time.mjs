import { chromium } from 'playwright';
// node docs/wip/2026-11-23-pass2-tools/clock-time.mjs <mission[,mission…]>
// Plays each mission's descent from its start in the browser and prints the real seconds it took
// (the F8 activity clock), sampling the descent clock every second.
const [missions] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const mission of missions.split(',')) {
  const page = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await page.goto(`${process.env.DEV_URL ?? 'http://localhost:5173'}/fly?mission=${mission}&descent=1&debug=1`);
  await page.waitForFunction(() => typeof window.__descentT === 'function' && window.__descentDuration() > 0, null, { timeout: 120000 });
  await page.waitForTimeout(3000);
  const dur = await page.evaluate(() => window.__descentDuration());
  await page.evaluate(() => {
    window.__descentSetT(0);
    window.__flyPlay();
  });
  const t0 = Date.now();
  const marks = [];
  for (let s = 0; s < 600; s++) {
    await page.waitForTimeout(1000);
    const t = await page.evaluate(() => window.__descentT());
    marks.push(t.toFixed(0));
    if (t >= dur - 0.5) break;
  }
  console.log(mission, 'duration', dur.toFixed(0), 's of mission; played in', ((Date.now() - t0) / 1000).toFixed(0), 's;', marks.join(' '));
  await page.close();
}
await b.close();
