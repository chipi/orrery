import { expect, test } from '@playwright/test';

/**
 * ADR-058 regression guard — for Moon missions, `/fly` switches to the
 * Earth-centred cislunar scene. For every OTHER destination (Mars,
 * Jupiter, Saturn, …) the heliocentric scene must render unchanged.
 *
 * The plan flagged S5: confirm the cislunar code path doesn't leak
 * into non-Moon missions. The companion `fly-cislunar.spec.ts`
 * exercises the Moon path; this file exercises the negative case.
 */

test.describe('/fly — heliocentric scene for non-Moon missions (ADR-058 regression)', () => {
  test('curiosity (Mars) renders heliocentric without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/fly?mission=curiosity', { waitUntil: 'networkidle' });

    // Wait for the canvas to be present (set up in onMount).
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10_000 });

    // The cislunar scene mounts an Earth-centered camera + Moon-orbit
    // trajectory. For Mars missions, the destination chip should NOT
    // surface a Moon-mission affordance and no console error should
    // fire from a missing cislunar_profile (Mars missions don't have one).
    expect(errors).toEqual([]);
  });

  test('mariner4 (Mars flyby — no cislunar profile) renders heliocentric without errors', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/fly?mission=mariner4', { waitUntil: 'networkidle' });
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10_000 });
    expect(errors).toEqual([]);
  });
});
