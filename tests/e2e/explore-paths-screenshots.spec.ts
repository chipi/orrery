import { test } from '@playwright/test';

/**
 * Visual smoke for /explore PATHS layer + Saturn-focused Cassini tour.
 * Captures three screenshots so the rendering can be inspected without
 * spinning up a manual dev server:
 *
 *   /tmp/explore-default.png   — base /explore (PATHS off, default zoom)
 *   /tmp/explore-paths-on.png  — PATHS chip activated, default zoom
 *   /tmp/explore-saturn.png    — ?paths=1&focus=saturn (Cassini orbital tour visible)
 *
 * Not run in CI — `.only` would block production. Run locally with:
 *   npx playwright test tests/e2e/explore-paths-screenshots.spec.ts
 */

test.describe('/explore — visual smoke (manual)', () => {
  test('capture three reference screenshots', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: '/tmp/explore-default.png', fullPage: false });

    const chip = page.locator('[data-testid="layer-paths"]');
    await chip.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: '/tmp/explore-paths-on.png', fullPage: false });

    await page.goto('/explore?paths=1&focus=saturn');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/explore-saturn.png', fullPage: false });
  });
});
