import { test, expect, type Page } from '@playwright/test';

/**
 * Launch & Ascent smoke (RFC-034 §§1–8) — the opening bookend of /fly ("Scene
 * 0"). Asserts the ascent act mounts via the `?launch=1` deep-link, renders its
 * canvas + telemetry HUD, and that scrubbing the unified master clock drives the
 * ascent (the pad→orbit half of the pad→arrival scrubber).
 *
 * Mirrors fly-descent.spec.ts: the launch HUD is display:none under the /fly
 * mobile declutter and touch pointers race the rAF commit, so the full-HUD
 * reference assertions are desktop-only. The ascent *physics + profiles* are
 * exhaustively unit-tested (ascent-physics.test.ts, launch-profile-registry.test.ts,
 * ascent-profiles.test.ts); this spec covers the wired UI.
 */

async function enterLaunch(page: Page, mission: string): Promise<void> {
  await page.goto(`/fly?mission=${mission}&launch=1`);
  // ?launch=1 loads the profile async then swaps in the launch overlay.
  await expect(page.locator('[data-testid="launch-scene"]')).toBeVisible({ timeout: 20_000 });
}

// Mobile coverage: the full HUD is decluttered on touch, so this asserts the
// ascent scene mounts + its canvas is attached. Runs on every project.
test('launch scene mounts with a live canvas', async ({ page }) => {
  await enterLaunch(page, 'curiosity');
  await expect(page.locator('.launch .stage canvas')).toBeAttached();
});

// The full-HUD reference assertions are desktop-only (HUD is display:none under
// the mobile declutter; touch pointers race the rAF commit).
test.describe('launch ascent HUD (desktop)', () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only ascent HUD reference');
  });

  test('Curiosity launch mounts with mission dossier + telemetry readouts', async ({ page }) => {
    await enterLaunch(page, 'curiosity');
    // The dossier names the mission (Atlas V flies Curiosity to Mars).
    await expect(page.locator('[data-testid="launch-mission"]')).toHaveText('Curiosity');
    // The two ascent readouts (speed + altitude) render with numeric values.
    const readouts = page.locator('.launch .readouts .ro');
    await expect(readouts).toHaveCount(2);
    await expect(page.locator('.launch .readouts')).toContainText(/\d/);
    // The MET clock is present.
    await expect(page.locator('.launch .clock .met')).toBeVisible();
  });

  test('the ascent timeline renders integrated flight beats', async ({ page }) => {
    await enterLaunch(page, 'curiosity');
    // buildShotSchedule/ascent integration produce labeled beats on the timeline
    // (liftoff → Max-Q → staging → SECO); at least a couple must render.
    const beats = page.locator('.launch .timeline .beat');
    await expect(beats.first()).toBeAttached();
    expect(await beats.count()).toBeGreaterThan(1);
  });

  test('scrubbing the master clock drives the ascent (MET advances)', async ({ page }) => {
    await enterLaunch(page, 'curiosity');
    const met = page.locator('.launch .clock .met');
    const before = (await met.textContent())?.trim() ?? '';
    // Drag the unified pad→arrival scrubber into the ascent band.
    const scrub = page.locator('input.scrub');
    await scrub.evaluate((el: HTMLInputElement) => {
      el.value = '0.06';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(async () => {
      const after = (await met.textContent())?.trim() ?? '';
      expect(after).not.toEqual(before);
    }).toPass({ timeout: 10_000 });
  });
});
