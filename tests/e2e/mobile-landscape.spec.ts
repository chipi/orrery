import { test, expect } from '@playwright/test';

/**
 * Landscape responsive contract (0.7.2 — capability + orientation, not width).
 *
 * A landscape phone is wide but short + touch. Before 0.7.2 it took the DESKTOP
 * branch (width > 767) and clipped its tall HUD columns. Now layout is keyed on
 * capability + orientation via the viewport model, so a landscape phone gets the
 * TOUCH chrome (bottom drawers / a right side-drawer Panel), not the desktop HUD.
 *
 * These assertions only make sense on the landscape project.
 */
test.describe('landscape responsive (0.7.2)', () => {
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-landscape-chromium', 'landscape-only');
  });

  test('<html> carries the touch + landscape capability attributes', async ({ page }) => {
    await page.goto('/explore', { waitUntil: 'networkidle' });
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-touch', '');
    await expect(html).toHaveAttribute('data-orientation', 'landscape');
    await expect(html).toHaveAttribute('data-form', 'phone');
  });

  test('/fly uses the touch chrome (fly-mtabs), not the desktop toggle rows', async ({ page }) => {
    await page.goto('/fly', { waitUntil: 'networkidle' });
    // The mobile tab bar is the touch chrome — visible on a landscape phone.
    await expect(page.locator('.fly-mtabs')).toBeVisible({ timeout: 10_000 });
    // The desktop-only toggle rows must NOT be laid out.
    const desktopRows = page.locator('.fly-toggle-rows-desktop');
    if (await desktopRows.count()) await expect(desktopRows.first()).toBeHidden();
  });

  test('detail Panel is a right side-drawer in landscape (not a full-bleed sheet)', async ({
    page,
  }) => {
    await page.goto('/explore?id=earth', { waitUntil: 'networkidle' });
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 15_000 });
    const box = await panel.boundingBox();
    const vw = page.viewportSize()!.width;
    expect(box).not.toBeNull();
    if (!box) return;
    // Side drawer: right-anchored, well under full width (scene stays visible).
    expect(box.width).toBeLessThan(vw * 0.6);
    expect(box.x + box.width).toBeGreaterThan(vw - 8);
  });

  test('surface route shows the mobile drawer (touch chrome) in landscape', async ({ page }) => {
    await page.goto('/moon', { waitUntil: 'networkidle' });
    // The MobileDrawerGroup tab row is the touch chrome; it must be present +
    // visible in landscape (was display:none at width > 767 before 0.7.2).
    await expect(page.locator('.mdg-tab').first()).toBeVisible({ timeout: 10_000 });
  });
});
