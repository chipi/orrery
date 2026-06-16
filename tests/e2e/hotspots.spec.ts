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
    test(`/moon?site=${siteId} loads with hotspot dispatcher active`, async ({
      page,
      isMobile,
    }) => {
      const errors = attachConsoleAndError(page);
      await page.goto(`/moon?site=${siteId}`);
      const canvas = page.locator(THREE_CANVAS).first();
      await expect(canvas).toBeVisible({ timeout: 10_000 });
      // Wait for the hotspot dispatcher to publish a tier on the canvas
      // — present once at least one HotspotEntry runs through
      // updateHotspotLOD. data-hotspot-tier=0|1|2|3 is the expected
      // shape; appearing at all proves the dispatcher is wired and
      // running each frame.
      await expect(canvas).toHaveAttribute('data-hotspot-tier', /^[0-3]$/, {
        timeout: isMobile ? 30_000 : 15_000,
      });
      // Post-rebase #342 chip merger (commit 0bf1fc96a, 2026-06-15):
      // the standalone HOTSPOTS chip was folded into the unified SURFACE
      // chip whose cycling label encodes the mode (AUTO / HIGH / LOW /
      // OFF). Verify the SURFACE chip is present; the canvas-side
      // data-hotspot-tier check above is the authoritative dispatcher
      // contract.
      const chip = page.locator('[data-testid="layer-surface"]');
      await expect(chip).toBeVisible();
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
    test(`/mars?site=${siteId} loads with hotspot dispatcher active`, async ({
      page,
      isMobile,
    }) => {
      const errors = attachConsoleAndError(page);
      await page.goto(`/mars?site=${siteId}`);
      const canvas = page.locator(THREE_CANVAS).first();
      await expect(canvas).toBeVisible({ timeout: 10_000 });
      await expect(canvas).toHaveAttribute('data-hotspot-tier', /^[0-3]$/, {
        timeout: isMobile ? 30_000 : 15_000,
      });
      // SURFACE chip merger (commit 0bf1fc96a, 2026-06-15) — see the
      // Moon describe block above for context.
      const chip = page.locator('[data-testid="layer-surface"]');
      await expect(chip).toBeVisible();
      expect(
        errors.filter((e) => !e.includes('Failed to load resource')),
        errors.join('\n'),
      ).toEqual([]);
    });
  }
});

test.describe('Surface Hotspots — SURFACE chip cycles AUTO / HIGH / LOW / OFF', () => {
  // Post-merger (#342 chip merger, commit 0bf1fc96a — 2026-06-15) the
  // standalone HOTSPOTS chip was folded into the unified SURFACE chip;
  // mode cycle order is AUTO → HIGH → LOW → OFF. The chip label encodes
  // the mode (e.g. "SURFACE · AUTO") instead of carrying a separate
  // data-hotspots-mode attribute, and the canvas-side
  // data-hotspot-tier attribute is the authoritative dispatcher
  // signal these tests verify.
  test('chip click cycles surface label without console errors', async ({ page }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/moon');
    const chip = page.locator('[data-testid="layer-surface"]');
    await expect(chip).toBeVisible({ timeout: 10_000 });
    const initialLabel = (await chip.textContent())?.trim();
    expect(initialLabel).toMatch(/SURFACE/i);

    await chip.click();
    await page.waitForTimeout(150);
    const secondLabel = (await chip.textContent())?.trim();
    expect(secondLabel).not.toBe(initialLabel);

    expect(errors.filter((e) => !e.includes('Failed to load resource'))).toEqual([]);
  });

  test('?hotspots=low URL param surfaces a valid canvas tier', async ({ page }) => {
    await page.goto('/moon?hotspots=low');
    const canvas = page.locator(THREE_CANVAS).first();
    await expect(canvas).toHaveAttribute('data-hotspot-tier', /^[0-3]$/, { timeout: 15_000 });
  });

  test('?hotspots=high URL param surfaces a valid canvas tier', async ({ page }) => {
    await page.goto('/mars?hotspots=high');
    const canvas = page.locator(THREE_CANVAS).first();
    await expect(canvas).toHaveAttribute('data-hotspot-tier', /^[0-3]$/, { timeout: 15_000 });
  });
});
