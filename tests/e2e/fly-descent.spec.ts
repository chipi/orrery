import { test, expect, type Page } from '@playwright/test';

/**
 * Descent & Landing smoke (RFC-034 §12) — the closing bookend of /fly. Asserts
 * the EDL act mounts via the `?descent=1` deep-link, shows honest telemetry, and
 * (the "close the circle" proof) hands off to the destination body's
 * SurfaceScene at touchdown.
 *
 * Desktop-only: the descent HUD is display:none under the /fly mobile declutter
 * (same as the launch HUD), and touch-emulated pointers race the rAF commit —
 * the phase-marker suites make the same call. The descent *physics + registry*
 * are exhaustively unit-tested (descent-physics.test.ts, descent-profiles.test.ts
 * = all 37 land per their honest outcome); this spec covers the wired UI.
 */

async function enterDescent(page: Page, mission: string): Promise<void> {
  await page.goto(`/fly?mission=${mission}&descent=1`);
  await expect(page.locator('[data-testid="descent-scene"]')).toBeVisible({ timeout: 20_000 });
}

// Mobile coverage: the full HUD is decluttered on touch (like launch), so this
// asserts the scene mounts + the compact mobile telemetry strip carries the key
// readouts. Runs on every project (desktop + mobile).
test('descent mounts + the mobile telemetry strip carries phase/alt/velocity', async ({
  page,
}, testInfo) => {
  await enterDescent(page, 'apollo11');
  await expect(page.locator('.descent .stage canvas')).toBeAttached();
  const strip = page.locator('[data-testid="descent-mstrip"]');
  await expect(strip).toBeAttached();
  await expect(strip).toContainText(/M|KM/); // altitude unit
  // The strip is display:flex only on touch viewports.
  if (testInfo.project.name.startsWith('mobile')) {
    await expect(strip).toBeVisible();
  }
});

// The full-HUD reference assertions are desktop-only (the HUD is display:none
// under the mobile declutter; touch pointers race the rAF commit).
test.describe('descent EDL HUD (desktop)', () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only EDL HUD reference');
  });

  test('Apollo 11 descent mounts with honest EDL telemetry', async ({ page }) => {
    await enterDescent(page, 'apollo11');
    await expect(page.locator('[data-testid="descent-mission"]')).toHaveText('Apollo 11');
    // The status is one of the EDL phase labels (ENTRY / POWERED DESCENT / TOUCHDOWN…).
    const status = page.locator('[data-testid="descent-status"]');
    await expect(status).toBeVisible();
    await expect(status).not.toBeEmpty();
    // The three EDL readouts render with numeric values.
    const readouts = page.locator('.descent .readouts .ro');
    await expect(readouts).toHaveCount(3);
    await expect(page.locator('.descent .readouts')).toContainText(/ALTITUDE/);
    await expect(page.locator('.descent .readouts')).toContainText(/VELOCITY/);
    await expect(page.locator('.descent .readouts')).toContainText(/DECEL/);
  });

  test('Curiosity descent dossier names the sky-crane EDL system', async ({ page }) => {
    await enterDescent(page, 'curiosity');
    await expect(page.locator('[data-testid="descent-mission"]')).toHaveText('Curiosity');
    const dossier = page.locator('.descent .dossier');
    await expect(dossier).toContainText('Mars');
    await expect(dossier).toContainText('Sky-crane');
    await expect(dossier).toContainText('km/s'); // entry velocity
  });

  test('touchdown hands off to the destination body SurfaceScene', async ({ page }) => {
    // Beresheet is the shortest descent (~19 s → a few wall-seconds at 3×), so the
    // full pad→surface handoff completes fast + deterministically. It closes the
    // circle onto /moon with the landing site pre-focused.
    // This is the single heaviest end-to-end flow in the suite: it plays the full
    // DescentScene EDL then mounts the destination SurfaceScene — two 3D scenes
    // back to back. On the GPU-less CI runner (SwiftShader, per-frame IBL + a
    // 3-pass composer) it measured ~47 s; the handoff DOES complete, the runner
    // is just slow. Budget generously so it fits (was 30 s → 40 s, both too
    // tight). The deeper /fly IBL/composer perf is a tracked cinematic-vs-perf
    // decision (docs/wip/2026-07-21-latent-bug-class-sweep.md).
    test.setTimeout(75_000);
    await enterDescent(page, 'beresheet');
    await page.waitForURL(/\/moon\?.*site=beresheet/, { timeout: 65_000 });
    expect(page.url()).toContain('from=descent');
  });
});
