import { test, expect } from '@playwright/test';

/**
 * Mars Tier 3 panorama — HUD smoke (PRD-022 / ADR-074, #286 Phase 3D-light).
 *
 * Verifies the new HUD components mount when the panorama enters
 * for a marquee site that has full panorama_metadata +
 * panorama_annotations:
 *
 *   - PanoramaCaptionOverlay (sol / date / instrument / caption)
 *   - PanoramaCompassRose (yaw-driven N-arrow)
 *   - PanoramaCrossLink (mission / traverse-stop chip)
 *   - PanoramaFullscreenToggle (F key + button)
 *
 * Doesn't exercise:
 *   - Annotation click → caption card (raycaster math is hard to
 *     drive in e2e; covered by hotspot-tier3-skybox unit tests
 *     if/when we add them)
 *   - Cycler (no multi-pano sites authored yet — gated on Phase 4
 *     follow-up curation)
 *   - Fullscreen state change (browser fullscreen requires direct
 *     user gesture; flaky in headless)
 *
 * Selected site: Perseverance — has sol/date/instrument/caption +
 * 3 annotations + traverse_stop_link in surface-hotspots.json.
 */

test.describe('Mars Tier 3 panorama HUD — Perseverance', () => {
  test('Caption + compass + cross-link + fullscreen mount when panorama active', async ({
    page,
  }) => {
    await page.goto('/mars?site=perseverance');

    // Wait for the canvas + panel to be ready (existing mars-tier3
    // pattern: stand-at-site button is the readiness signal).
    const stand = page.getByTestId('stand-at-site');
    await expect(stand).toBeVisible({ timeout: 20_000 });
    await stand.click();

    // Existing sr-only overlay (PanoramaOverlay) must be up first —
    // confirms panorama is active.
    await expect(page.getByTestId('panorama-overlay')).toBeVisible({ timeout: 5_000 });

    // Caption now defaults to dismissed (collapsed ⓘ pill) so the
    // panorama imagery isn't obscured on entry. Click the ⓘ to open
    // it before asserting on the caption content.
    await page.getByRole('button', { name: /show panorama caption/i }).click();

    // New HUD components — all should mount on panorama entry.
    const caption = page.getByTestId('panorama-caption-overlay');
    await expect(caption).toBeVisible({ timeout: 3_000 });
    // The seeded perseverance metadata says "SOL 46 · 2021-04-06 · Mastcam-Z".
    await expect(caption).toContainText(/SOL 46/);
    await expect(caption).toContainText(/2021-04-06/);
    await expect(caption).toContainText(/Mastcam-Z/);
    // Caption body mentions Ingenuity (from the seed copy).
    await expect(caption).toContainText(/Ingenuity/);
    // Credit footer.
    await expect(caption).toContainText(/NASA\/JPL-Caltech\/ASU/);

    // Compass rose mounted (yaw-driven N-arrow).
    await expect(page.getByTestId('panorama-compass-rose')).toBeVisible();

    // Cross-link footer — Perseverance has traverse_stop_link +
    // fleetEntryId resolves to its own id, so at least 2 chips
    // should render.
    const crossLink = page.getByTestId('panorama-cross-link');
    await expect(crossLink).toBeVisible();
    await expect(crossLink).toContainText(/Traverse stop/i);
    await expect(crossLink).toContainText(/Mission/i);

    // Fullscreen toggle button rendered (state may be inactive in
    // headless, but the button is present + accessible).
    await expect(page.getByTestId('panorama-fullscreen-toggle')).toBeVisible();

    // Esc closes the panorama; the HUD components disappear.
    await page.keyboard.press('Escape');
    await expect(caption).toHaveCount(0);
    await expect(page.getByTestId('panorama-compass-rose')).toHaveCount(0);
    await expect(crossLink).toHaveCount(0);
    await expect(page.getByTestId('panorama-fullscreen-toggle')).toHaveCount(0);
  });

  test('Caption dismiss + reopen flow', async ({ page }) => {
    await page.goto('/mars?site=perseverance');
    await page.getByTestId('stand-at-site').click();

    // Caption defaults to collapsed — open it first via the ⓘ pill.
    const reopen = page.getByRole('button', { name: /show panorama caption/i });
    await expect(reopen).toBeVisible({ timeout: 5_000 });
    await reopen.click();

    const caption = page.getByTestId('panorama-caption-overlay');
    await expect(caption).toBeVisible({ timeout: 3_000 });

    // The × button inside the caption overlay should dismiss it.
    await caption.getByRole('button', { name: /dismiss caption/i }).click();
    await expect(caption).toHaveCount(0);

    // After dismissal, the ⓘ re-open affordance takes its place again.
    await expect(reopen).toBeVisible();
    await reopen.click();
    await expect(caption).toBeVisible();
  });
});

test.describe('Mars Tier 3 panorama HUD — site without metadata', () => {
  // Phoenix has hotspot_tier3_panorama but NO panorama_metadata —
  // the caption overlay should still render with the fallback text.
  // Honest disclosure: no SOL header, no annotations.
  test('Phoenix renders caption with fallback copy (no metadata)', async ({ page }) => {
    await page.goto('/mars?site=phoenix');
    const stand = page.getByTestId('stand-at-site');
    await expect(stand).toBeVisible({ timeout: 20_000 });
    await stand.click();

    // Caption defaults dismissed — open via the ⓘ pill.
    await page.getByRole('button', { name: /show panorama caption/i }).click();

    const caption = page.getByTestId('panorama-caption-overlay');
    await expect(caption).toBeVisible({ timeout: 5_000 });
    // Fallback caption is the site-name-based string.
    await expect(caption).toContainText(/Surface panorama at/i);
    // SOL header is empty when metadata is missing, so no SOL string.
    await expect(caption).not.toContainText(/^SOL \d/);
  });
});
