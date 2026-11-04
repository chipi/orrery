#!/usr/bin/env node
/**
 * Screenshot one showcase model's review sheet (/dev/showcase?id=<id>) from a running dev server.
 * Usage: node scripts/showcase-shot.mjs <fleet-id> <out.png> [base-url=http://localhost:5198]
 * Prints the drawn size line; exits 1 if the page reports no such model.
 */
import { chromium } from 'playwright';

const [id, out, base = 'http://localhost:5198'] = process.argv.slice(2);
if (!id || !out) {
  console.error('usage: node scripts/showcase-shot.mjs <fleet-id> <out.png> [base-url]');
  process.exit(2);
}
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 960 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${base}/dev/showcase?id=${encodeURIComponent(id)}`, { waitUntil: 'networkidle' });
await page.waitForSelector('.sheet[data-ready="true"]', { timeout: 60_000 });
const line = await page.locator('.sheet p').first().textContent();
await page.screenshot({ path: out });
await browser.close();
console.log(line);
if (errors.length) console.log('errors:', errors.join(' | '));
process.exit(line?.startsWith('?id=') ? 1 : 0);
