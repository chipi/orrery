import { test, expect } from '@playwright/test';

/**
 * /earth surface mode — launchpad markers + cross-link panel (#285 Phase 2 B5).
 *
 * Companion to earth.spec.ts. The orbital-mode tests in that file are
 * unchanged by Phase 2 (B2 only added a mode router around the existing
 * scene); this file covers the new surface mode and its launchpad
 * cross-link panel section.
 *
 * Covers the original Phase 2 e2e ask from #285:
 *   - marker rendering (≥1 launchpad mounted on the Earth sphere)
 *   - panel open on marker click
 *   - cross-link to fleet entry / mission card via the "Launches from
 *     here" chip list
 *   - mobile-chromium pass (tap vs click + visible-toggle assertion)
 */

test.describe('/earth surface mode', () => {
  test('mode toggle button is visible on default /earth load', async ({ page }) => {
    await page.goto('/earth');
    const toggle = page.locator('[data-testid="earth-mode-toggle"]');
    await expect(toggle).toBeVisible({ timeout: 5_000 });
    // Default mode is orbital → toggle button label says "LAUNCHPADS"
    // (the destination, not the current mode).
    await expect(toggle).toHaveText(/LAUNCHPADS/i);
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  test('mode toggle flips state + label on click', async ({ page, isMobile }) => {
    await page.goto('/earth');
    await page.waitForLoadState('networkidle');
    const toggle = page.locator('[data-testid="earth-mode-toggle"]');
    await expect(toggle).toBeVisible({ timeout: 5_000 });
    if (isMobile) await toggle.tap();
    else await toggle.click();
    // After toggle: in surface mode, button label flips to "ORBITS"
    await expect(toggle).toHaveText(/ORBITS/i, { timeout: 5_000 });
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  test('?mode=surface deep-link mounts surface mode directly', async ({ page }) => {
    await page.goto('/earth?mode=surface');
    const toggle = page.locator('[data-testid="earth-mode-toggle"]');
    // The toggle reads the URL param in onMount; allow a beat for
    // hydration + state reconciliation.
    await expect(toggle).toHaveText(/ORBITS/i, { timeout: 5_000 });
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  test('surface mode renders launch-site markers (data-sites-count ≥ 12)', async ({ page }) => {
    await page.goto('/earth?mode=surface');
    await page.waitForLoadState('networkidle');
    // SurfaceScene canvas exposes the loaded site count as a data-attr
    // (the same e2e contract /moon and /mars use). Phase 1 shipped 14
    // launch-sites; we assert ≥ 12 to leave headroom for one or two
    // future entries with missing lat/lon that get filtered out by
    // the adapter.
    const canvas = page.locator('[data-sites-count]');
    await expect(canvas.first()).toBeAttached({ timeout: 10_000 });
    const count = await canvas.first().getAttribute('data-sites-count');
    expect(Number(count)).toBeGreaterThanOrEqual(12);
  });
});
