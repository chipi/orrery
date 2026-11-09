import { expect, test } from '@playwright/test';

/**
 * The floating site footer and /explore's bottom time dock must never share
 * pixels on a non-touch window, however narrow or short. Touch hides the
 * footer, so these run with touch off.
 */
const SIZES = [
  { name: '375x812', width: 375, height: 812 },
  { name: '800x375', width: 800, height: 375 },
  { name: '1100x700', width: 1100, height: 700 },
];

for (const size of SIZES) {
  test.describe(`footer vs dock — ${size.name} non-touch`, () => {
    test.use({
      viewport: { width: size.width, height: size.height },
      hasTouch: false,
      isMobile: false,
    });

    test('/explore: footer box does not intersect the time dock box', async ({ page }) => {
      await page.goto('/explore', { waitUntil: 'networkidle' });
      const dock = page.locator('.time-controls');
      await expect(dock).toBeVisible();
      const footer = page.locator('.footer-menu');
      await expect(footer).toBeVisible();
      const d = (await dock.boundingBox())!;
      const f = (await footer.boundingBox())!;
      const intersects =
        f.x < d.x + d.width && f.x + f.width > d.x && f.y < d.y + d.height && f.y + f.height > d.y;
      expect(intersects, `footer ${JSON.stringify(f)} vs dock ${JSON.stringify(d)}`).toBe(false);
    });

    test('/: footer is visible inside the viewport', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      const f = (await page.locator('.footer-menu').boundingBox())!;
      expect(f.x).toBeGreaterThanOrEqual(0);
      expect(f.x + f.width).toBeLessThanOrEqual(size.width);
      expect(f.y + f.height).toBeLessThanOrEqual(size.height);
    });
  });
}
