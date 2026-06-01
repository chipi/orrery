import { test, expect } from '@playwright/test';

/**
 * /earth surface mode — launchpad markers (#285 Phase 2 B5 → #290 Slice 7).
 *
 * Pre-#290 the route was a mode-router (orbital ↔ surface). After #290
 * Slice 7 the route always mounts SurfaceScene with launchpads composed
 * alongside the orbital satellite layer — the mode toggle is gone, the
 * `?mode=surface` URL param is a no-op, and surface markers render
 * unconditionally on first load.
 */

test.describe('/earth surface mode', () => {
  test('launch-site markers render (data-sites-count ≥ 12)', async ({ page }) => {
    await page.goto('/earth');
    await page.waitForLoadState('networkidle');
    // SurfaceScene canvas exposes the loaded site count as a data-attr
    // (the same e2e contract /moon and /mars use). Phase 1 shipped 14
    // launch-sites; assert ≥ 12 to leave headroom for one or two
    // future entries with missing lat/lon that the adapter filters.
    const canvas = page.locator('[data-sites-count]');
    await expect(canvas.first()).toBeAttached({ timeout: 10_000 });
    const count = await canvas.first().getAttribute('data-sites-count');
    expect(Number(count)).toBeGreaterThanOrEqual(12);
  });
});
