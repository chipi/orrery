import { test, expect } from '@playwright/test';

/**
 * Mars Tier 3 panorama — mobile-chromium smoke (PRD-022 / ADR-074,
 * #286 Phase 3D-light).
 *
 * Verifies the new HUD components mount + respect the mobile
 * viewport layout when entering panorama mode on a touch device.
 *
 * NOT exercising:
 *   - Pinch-zoom (Playwright's touch primitives are flaky;
 *     yaw/pitch drag is mouse-only in the SurfaceScene right now).
 *   - Auto-tour camera pan (camera tween needs a frame loop that's
 *     unreliable to assert against in headless).
 *
 * Asserts:
 *   - Panorama mounts on mobile from /mars?site=perseverance.
 *   - Caption overlay, compass rose, fullscreen toggle visible.
 *   - sr-only annotations list (Phase 3E) is in DOM + has the
 *     expected button count for Perseverance's seed metadata (3
 *     annotations: Ingenuity, sample tubes, Jezero rim).
 *   - Esc exits cleanly back to orbit.
 *
 * Runs under the mobile-chromium Playwright project, which sets a
 * narrow viewport + touch=true. Standard config (no extra setup).
 */

test.describe('Mars Tier 3 panorama HUD — mobile smoke', () => {
  test('Panorama HUD mounts + sr-only annotations list renders on mobile', async ({ page }) => {
    await page.goto('/mars?site=perseverance');

    const stand = page.getByTestId('stand-at-site');
    await expect(stand).toBeVisible({ timeout: 20_000 });
    await stand.click();

    // Sr-only overlay confirms panorama active.
    await expect(page.getByTestId('panorama-overlay')).toBeVisible({ timeout: 5_000 });

    // Caption defaults to collapsed — open via the ⓘ pill so the
    // panorama-caption-overlay asserts below have something to match.
    await page.getByRole('button', { name: /show panorama caption/i }).click();

    // Visible HUD components.
    await expect(page.getByTestId('panorama-caption-overlay')).toBeVisible();
    await expect(page.getByTestId('panorama-compass-rose')).toBeVisible();
    await expect(page.getByTestId('panorama-fullscreen-toggle')).toBeVisible();

    // Phase 3E sr-only annotation buttons. Each gets a stable testid;
    // we count by selector. Perseverance has 3 annotations in seed.
    const annButtons = page.getByTestId('panorama-annotation-sr-button');
    await expect(annButtons).toHaveCount(3);

    // Activate one annotation via keyboard (sr-only path).
    await annButtons.first().click();
    await expect(page.getByTestId('panorama-annotation-card')).toBeVisible();

    // Esc dismisses card.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('panorama-annotation-card')).toHaveCount(0);

    // Esc again exits panorama.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('panorama-overlay')).toHaveCount(0);
  });

  test('Auto-tour chip visible on multi-annotation site', async ({ page }) => {
    await page.goto('/mars?site=perseverance');
    await page.getByTestId('stand-at-site').click();
    await expect(page.getByTestId('panorama-overlay')).toBeVisible({ timeout: 5_000 });
    // Phase 3C — auto-tour chip mounts when ≥ 2 annotations.
    await expect(page.getByTestId('panorama-auto-tour')).toBeVisible();
  });
});
