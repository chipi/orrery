import { chromium } from 'playwright';
import fs from 'node:fs';
// node docs/wip/2026-11-23-pass2-tools/hero-shot.mjs <id> <prefix> az,el;az,el...
const [id, prefix, views = '30,10;-40,18;180,15;90,40'] = process.argv.slice(2);
const OUT = (process.env.SHOT_DIR ?? 'test-results/shots').replace(/\/?$/, '/');
(await import('node:fs')).mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 300)));
for (const v of views.split(';')) {
  const [az, el] = v.split(',');
  await page.goto(`${process.env.DEV_URL ?? 'http://localhost:5199'}/dev/showcase?id=${id}&hero=1&az=${az}&el=${el}`);
  await page.waitForSelector('[data-ready="true"]', { timeout: 60000 });
  await page.waitForTimeout(500);
  const data = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
  fs.writeFileSync(`${OUT}${prefix}-${id}-${az}_${el}.png`, Buffer.from(data.split(',')[1], 'base64'));
  console.log(prefix, az, el);
}
await b.close();
