import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { MISSION_COUNT } from './_helpers/mission-index';
import { waitForHydration } from './_helpers/hydration';
import { epochForYear } from '../../src/lib/epoch-bands';

/**
 * UXD-048 (slice E3): the era strip of /missions is nine equal tiles in a radiogroup of
 * <Chip kind="choice">: selection (click, click again), arrow keys (reversed in Arabic), no
 * clipped label, one scroll row on a phone, the tile order mirrored in Arabic and the year
 * ranges isolated (bdi dir=ltr). Runs on desktop-chromium and mobile-chromium.
 */

const years: number[] = (
  JSON.parse(
    readFileSync(path.resolve(process.cwd(), 'static/data/missions/index.json'), 'utf8'),
  ) as { year: number }[]
).map((m) => m.year);
const inEpoch = (id: string) => years.filter((y) => epochForYear(y) === id).length;

const IDS = [
  'first-steps',
  'space-race',
  'lunar-era',
  'first-stations',
  'shuttle-and-mir',
  'iss-assembly',
  'commercial-era',
  'lunar-return',
  'mars-era',
];

async function open(page: Page, route = '/missions') {
  await page.goto(route);
  await waitForHydration(page);
  if (!route.includes('?')) {
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(MISSION_COUNT, {
      timeout: 20_000,
    });
  }
  const toggle = page.locator('button.filters-strip');
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  const tiles = page.locator('[data-audio-stage="missions-epoch-timeline"] [role="radio"]');
  await expect(tiles).toHaveCount(9);
  return tiles;
}

test.describe('/missions era strip (UXD-048)', () => {
  test('nine tiles; the counts add up to the catalogue', async ({ page }) => {
    const tiles = await open(page);
    const counts = await tiles.locator('.era-count').allTextContents();
    expect(counts.map(Number)).toEqual(IDS.map(inEpoch));
    expect(counts.map(Number).reduce((a, b) => a + b, 0)).toBe(MISSION_COUNT);
  });

  test('a click selects an era, a second click clears it', async ({ page }) => {
    const tiles = await open(page);
    await tiles.nth(2).click();
    await expect(tiles.nth(2)).toHaveAttribute('aria-checked', 'true');
    await expect(page).toHaveURL(/[?&]epoch=lunar-era/);
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(inEpoch('lunar-era'));
    await tiles.nth(2).click();
    await expect(tiles.nth(2)).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(MISSION_COUNT);
  });

  test('arrow keys, Home and End move and select', async ({ page }) => {
    const tiles = await open(page);
    await tiles.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(tiles.nth(1)).toHaveAttribute('aria-checked', 'true');
    await expect(page).toHaveURL(/[?&]epoch=space-race/);
    await page.keyboard.press('End');
    await expect(tiles.nth(8)).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('Home');
    await expect(tiles.nth(0)).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(tiles.nth(8)).toHaveAttribute('aria-checked', 'true');
  });

  test('one tab stop: the chosen tile, roving focus', async ({ page }) => {
    const tiles = await open(page, '/missions?epoch=iss-assembly');
    const stops = await tiles.evaluateAll(
      (els) => els.map((e) => (e as HTMLElement).tabIndex).filter((t) => t === 0).length,
    );
    expect(stops).toBe(1);
    await expect(tiles.nth(5)).toHaveAttribute('tabindex', '0');
  });

  test('no label is clipped or leaves its tile (en)', async ({ page }) => {
    const tiles = await open(page);
    const bad = await tiles.evaluateAll((els) =>
      els.flatMap((tile) => {
        const t = tile.getBoundingClientRect();
        return [...tile.querySelectorAll('.era-name, .era-years')]
          .filter((n) => {
            const r = n.getBoundingClientRect();
            return r.left < t.left - 0.5 || r.right > t.right + 0.5 || r.bottom > t.bottom + 0.5;
          })
          .map((n) => n.textContent);
      }),
    );
    expect(bad).toEqual([]);
  });

  test('phone width: one scroll row, no wrapping to a second row', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const tiles = await open(page);
    const row = page.locator('.era-tiles');
    const m = await row.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
    expect(m.sw).toBeGreaterThan(m.cw);
    const tops = await tiles.evaluateAll((els) =>
      els.map((e) => Math.round(e.getBoundingClientRect().top)),
    );
    expect(new Set(tops).size).toBe(1);
  });

  test('desktop width: nine columns in one row', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const tiles = await open(page);
    const tops = await tiles.evaluateAll((els) =>
      els.map((e) => Math.round(e.getBoundingClientRect().top)),
    );
    expect(new Set(tops).size).toBe(1);
  });

  test('ar: the era order mirrors, the arrow keys reverse, the years stay left-to-right', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const tiles = await open(page, '/ar/missions');
    const first = await tiles.nth(0).boundingBox();
    const last = await tiles.nth(8).boundingBox();
    expect(first!.x).toBeGreaterThan(last!.x);
    await expect(tiles.nth(0).locator('.era-years bdi')).toHaveAttribute('dir', 'ltr');
    await tiles.first().focus();
    await page.keyboard.press('ArrowLeft');
    await expect(tiles.nth(1)).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(tiles.nth(0)).toHaveAttribute('aria-checked', 'true');
  });

  test('de: long era names wrap inside their tiles at 1280 and 390', async ({ page }) => {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const tiles = await open(page, '/de/missions');
      const bad = await tiles.evaluateAll((els) =>
        els.flatMap((tile) => {
          const t = tile.getBoundingClientRect();
          return [...tile.querySelectorAll('.era-name')]
            .filter((n) => {
              const r = n.getBoundingClientRect();
              return r.left < t.left - 0.5 || r.right > t.right + 0.5;
            })
            .map((n) => n.textContent);
        }),
      );
      expect(bad, `width ${width}`).toEqual([]);
    }
  });
});
