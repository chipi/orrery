import { test, expect, type Page } from '@playwright/test';

/**
 * Every detail-panel type opens the shared gallery viewer (PanelLightbox)
 * from its hero and steps through the whole gallery: the counter advances,
 * each image loads (decoded, non-zero width), and the last image wraps to
 * the first. One entity per panel type. Credits are checked in the data
 * (image-provenance), not here.
 */
const PANELS: Array<{ type: string; url: string }> = [
  { type: 'mission', url: '/missions?id=cassini' },
  { type: 'fleet', url: '/fleet?id=saturn-v' },
  { type: 'planet', url: '/explore?id=mars' },
  { type: 'moon (satellite)', url: '/explore?id=earth:moon' },
  { type: 'small body', url: '/explore?id=ceres' },
  { type: 'sun', url: '/explore?id=sun' },
  { type: 'belt', url: '/explore?id=asteroid-belt' },
  { type: 'ISS module', url: '/iss?module=cupola' },
  { type: 'earth object', url: '/earth?object=iss' },
  { type: 'moon site', url: '/moon?site=apollo11' },
  { type: 'mars site', url: '/mars?site=curiosity' },
  { type: 'launch site', url: '/earth?site=lc-39a' },
];

async function openFromHero(page: Page) {
  const hero = page.locator('.panel-hero-btn').first();
  await expect(hero).toBeVisible({ timeout: 30_000 });
  // Some panels ignore a hero click in their first 400 ms (open-gesture guard).
  await expect(async () => {
    await hero.click();
    await expect(page.locator('.lightbox-root')).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
}

async function expectImageLoaded(page: Page) {
  await expect
    .poll(
      () =>
        page
          .locator('.lightbox-img')
          .evaluate(
            (el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0,
          ),
      { timeout: 15_000 },
    )
    .toBe(true);
}

test.describe('gallery viewer on every panel type', () => {
  for (const { type, url } of PANELS) {
    test(`${type}: steps through the whole gallery`, async ({ page }) => {
      await page.goto(url);
      await openFromHero(page);

      const counter = page.locator('.lightbox-count [aria-hidden]');
      await expect(counter).toHaveText(/^1 \/ \d+$/, { timeout: 3_000 });
      const total = Number((await counter.textContent())!.split('/')[1]);
      expect(total, `${url} gallery size`).toBeGreaterThan(1);

      const seen = new Set<string>();
      for (let i = 1; i <= total; i++) {
        await expect(counter).toHaveText(`${i} / ${total}`);
        await expectImageLoaded(page);
        seen.add((await page.locator('.lightbox-img').getAttribute('src')) ?? '');
        await page.locator('.lightbox-next').click();
      }
      // Wrapped back to the first image; every step showed a different image.
      await expect(counter).toHaveText(`1 / ${total}`);
      expect(seen.size, `${url} distinct images`).toBe(total);

      await page.keyboard.press('Escape');
      await expect(page.locator('.lightbox-root')).toHaveCount(0);
    });
  }
});
