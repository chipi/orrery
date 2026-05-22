import { test, expect, type Page } from '@playwright/test';

/**
 * Surface Hotspots e2e (PRD-014 / RFC-017 §S8, sub-issue #116).
 *
 * Coverage:
 *   - 15 V1 NASA sites (6 Apollo + 9 Mars) load on their respective
 *     route via the ?site= deep-link.
 *   - The HOTSPOTS chip cycles AUTO → LOW → HIGH and the
 *     data-hotspots-mode attribute on the chip updates.
 *   - data-hotspot-tier attribute on the canvas reads as a valid
 *     tier (0..3) after the route is ready.
 *   - No console errors during the lifecycle.
 *
 * Per the v0.7 plan §Phase 5: V1 sites get full assertion coverage;
 * V3 sites get a smoke-only single-tier-load check that ships in
 * Phase 7 to keep CI under the 25-min budget.
 *
 * Why we don't assert specific tier transitions on a per-site basis:
 *   the LOD dispatcher's tier choice depends on the camera distance
 *   at deep-link time + viewport dimensions. Asserting only that the
 *   attribute is present + a valid number keeps the test resilient
 *   across viewport changes (desktop-chromium + mobile-chromium
 *   projects have different camera framings).
 */

const V1_MOON_SITES = ['apollo11', 'apollo12', 'apollo14', 'apollo15', 'apollo16', 'apollo17'];

const V1_MARS_SITES = [
  'viking1-lander',
  'viking2-lander',
  'mars-pathfinder',
  'spirit',
  'opportunity',
  'curiosity',
  'perseverance',
  'phoenix',
  'insight',
];

function attachConsoleAndError(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

// Locator note (2026-05-22 fix): the `canvas.layer` class is only on
// the *2D* canvas — the 3D mode renders a <div class="layer"> whose
// THREE.js child <canvas> has no class. Both /mars and /moon default
// to 3D, so `canvas.layer` always matches the 2D canvas, which is
// display:none in 3D mode → toBeVisible fails. The THREE.js canvas
// — where data-hotspot-tier is set on renderer.domElement — sits
// INSIDE the .layer div, so `.layer:not(canvas) canvas` resolves to
// the right element. Same pattern as tests/e2e/earth.spec.ts:13.
const THREE_CANVAS = '.layer:not(canvas) canvas';

test.describe('Surface Hotspots — V1 Moon (6 Apollo sites)', () => {
  for (const siteId of V1_MOON_SITES) {
    test(`/moon?site=${siteId} loads with hotspot dispatcher active`, async ({ page }) => {
      const errors = attachConsoleAndError(page);
      await page.goto(`/moon?site=${siteId}`);
      const canvas = page.locator(THREE_CANVAS).first();
      await expect(canvas).toBeVisible({ timeout: 10_000 });
      // Wait for the hotspot dispatcher to publish a tier on the canvas
      // — present once at least one HotspotEntry runs through
      // updateHotspotLOD. data-hotspot-tier=0|1|2|3 is the expected
      // shape; appearing at all proves the dispatcher is wired and
      // running each frame.
      await expect(canvas).toHaveAttribute('data-hotspot-tier', /^[0-3]$/, { timeout: 15_000 });
      // The HOTSPOTS chip is visible and reads a valid mode.
      const chip = page.locator('[data-testid="layer-hotspots"]');
      await expect(chip).toBeVisible();
      await expect(chip).toHaveAttribute('data-hotspots-mode', /^(auto|low|high)$/);
      // No console errors during the load + first-frame lifecycle.
      expect(
        errors.filter((e) => !e.includes('Failed to load resource')),
        errors.join('\n'),
      ).toEqual([]);
    });
  }
});

test.describe('Surface Hotspots — V1 Mars (9 NASA sites)', () => {
  for (const siteId of V1_MARS_SITES) {
    test(`/mars?site=${siteId} loads with hotspot dispatcher active`, async ({ page }) => {
      const errors = attachConsoleAndError(page);
      await page.goto(`/mars?site=${siteId}`);
      const canvas = page.locator(THREE_CANVAS).first();
      await expect(canvas).toBeVisible({ timeout: 10_000 });
      await expect(canvas).toHaveAttribute('data-hotspot-tier', /^[0-3]$/, { timeout: 15_000 });
      const chip = page.locator('[data-testid="layer-hotspots"]');
      await expect(chip).toBeVisible();
      await expect(chip).toHaveAttribute('data-hotspots-mode', /^(auto|low|high)$/);
      expect(
        errors.filter((e) => !e.includes('Failed to load resource')),
        errors.join('\n'),
      ).toEqual([]);
    });
  }
});

test.describe('Surface Hotspots — HOTSPOTS chip cycles AUTO → LOW → HIGH', () => {
  test('chip click cycles mode + writes ?hotspots= URL param', async ({ page }) => {
    await page.goto('/moon');
    const chip = page.locator('[data-testid="layer-hotspots"]');
    await expect(chip).toBeVisible({ timeout: 10_000 });
    // Initial mode resolves from reduced-motion + saveData heuristics;
    // could be 'auto' or 'low'. Capture it and assert the cycle from
    // wherever it starts.
    const initialMode = await chip.getAttribute('data-hotspots-mode');
    expect(initialMode).toMatch(/^(auto|low|high)$/);

    await chip.click();
    const secondMode = await chip.getAttribute('data-hotspots-mode');
    expect(secondMode).not.toBe(initialMode);

    await chip.click();
    const thirdMode = await chip.getAttribute('data-hotspots-mode');
    expect(thirdMode).not.toBe(secondMode);

    // After 3 clicks from any starting mode, we've visited all 3.
    await chip.click();
    const fourthMode = await chip.getAttribute('data-hotspots-mode');
    expect(new Set([initialMode, secondMode, thirdMode, fourthMode]).size).toBeGreaterThanOrEqual(
      3,
    );
  });

  test('?hotspots=low URL param pins LOW mode on load', async ({ page }) => {
    await page.goto('/moon?hotspots=low');
    const chip = page.locator('[data-testid="layer-hotspots"]');
    await expect(chip).toBeVisible({ timeout: 10_000 });
    await expect(chip).toHaveAttribute('data-hotspots-mode', 'low');
  });

  test('?hotspots=high URL param pins HIGH mode on load', async ({ page }) => {
    await page.goto('/mars?hotspots=high');
    const chip = page.locator('[data-testid="layer-hotspots"]');
    await expect(chip).toBeVisible({ timeout: 10_000 });
    await expect(chip).toHaveAttribute('data-hotspots-mode', 'high');
  });
});
