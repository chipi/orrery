/**
 * Capture the launcher line-up — every launch-vehicle model side by side, side-on, at one
 * scale — from the /dev/launchers sheet into docs/screenshots/launcher-lineup.png.
 *
 * /dev/* only exists in the dev server (the production build 404s it), so unlike
 * capture-screenshots.ts this runs against a dev server you already have up:
 *
 *   npm run dev -- --port 5197            # in another shell
 *   npm run screenshots:launchers         # ORIGIN=http://localhost:5197 by default
 *
 * Re-run it whenever a launcher model is added or changed. Options (env):
 *   ORIGIN   dev-server origin           (default http://localhost:5197)
 *   CELL     column width per rocket, px (default 140)
 *   HEIGHT   sheet height, px            (default 1100)
 */
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const ORIGIN = process.env.ORIGIN ?? 'http://localhost:5197';
const CELL = Number(process.env.CELL ?? 140);
const HEIGHT = Number(process.env.HEIGHT ?? 1100);
const OUT = resolve(import.meta.dirname, '..', 'docs', 'screenshots', 'launcher-lineup.png');

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: HEIGHT + 60 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const url = `${ORIGIN}/dev/launchers?cell=${CELL}`;
  const load = async () => {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 180_000 });
    await page.waitForSelector('[data-ready="true"]', { timeout: 120_000 });
  };
  // The sheet is one column per model: widen the window to fit them all, then redraw.
  await load();
  const width = await page.$eval('.sheet canvas', (c) => c.width);
  await page.setViewportSize({ width: width + 20, height: HEIGHT + 60 });
  await load();
  await page.locator('.sheet').screenshot({ path: OUT });
  if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`);
  console.log(`wrote ${OUT}`);
} finally {
  await browser.close();
}
