import { chromium } from 'playwright';
// node docs/wip/2026-11-23-pass2-tools/desc-shot.mjs <prefix> <mission> [fractions comma-separated]
const [prefix, mission, fr = '-20,-6,0'] = process.argv.slice(2);
const OUT = (process.env.SHOT_DIR ?? 'test-results/shots').replace(/\/?$/, '/');
(await import('node:fs')).mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
for (let i = 0; i < 3; i++) {
  await page.goto(`${process.env.DEV_URL ?? 'http://localhost:5199'}/fly?mission=${mission}&descent=1&debug=1`).catch(() => {});
  if (await page.waitForFunction(() => typeof window.__descentSetT === 'function' && window.__descentDuration() > 0, null, { timeout: 90000 }).then(() => true, () => false)) break;
}
await page.waitForTimeout(8000);
for (const f of fr.split(',')) {
  await page.evaluate((v) => window.__descentSetT(v.startsWith('f') ? window.__descentDuration() * Number(v.slice(1)) : window.__descentDuration() + Number(v)), f);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}${prefix}-${mission}-${f}.png` });
  console.log(mission, f);
}
await b.close();
