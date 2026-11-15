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

async function enterLaunch(page: Page, mission: string, extra = ''): Promise<void> {
  await page.goto(`/fly?mission=${mission}&launch=1${extra}`);
  // ?launch=1 loads the profile async then swaps in the launch overlay.
  await expect(page.locator('[data-testid="launch-scene"]')).toBeVisible({ timeout: 20_000 });
}

// Mobile coverage: the full HUD is decluttered on touch, so this asserts the
// ascent scene mounts + its canvas is attached. Runs on every project.
test('launch scene mounts with a live canvas', async ({ page }) => {
  await enterLaunch(page, 'curiosity');
  await expect(page.locator('.launch .stage canvas')).toBeAttached();
});

// A Shuttle flight (dest EARTH) continues after the climb into the Earth-orbit coast from its
// mission record (STS-1: 307 km, 40.3 degrees, 37 revolutions), never a Moon-style cislunar arc.
test('STS-1 after the climb: the Earth-orbit coast, not a cislunar transfer', async ({
  page,
}, testInfo) => {
  test.setTimeout(260_000);
  await enterLaunch(page, 'sts-1');
  await page.evaluate(() =>
    (window as unknown as { __flyLaunchT: (t: number) => void }).__flyLaunchT(600),
  );
  await page
    .getByRole('button', { name: /^play$/i })
    .first()
    .click();
  await expect(page.locator('[data-testid="coast-scene"]')).toBeVisible({ timeout: 220_000 });
  await expect(page.locator('[data-testid="launch-scene"]')).toHaveCount(0);
  if (testInfo.project.name === 'desktop-chromium') {
    // the coast HUD (hidden on touch): the orbit from the mission record
    await expect(page.locator('body')).toContainText('307×307 km');
    await expect(page.locator('body')).toContainText('/ 37');
  }
});

// The X-37B flights (dest EARTH, Atlas V) coast in the orbit tracked for them, not a cislunar arc.
test('OTV-5 after the climb: the Earth-orbit coast (54.5 degrees from its record)', async ({
  page,
}, testInfo) => {
  test.setTimeout(260_000);
  await enterLaunch(page, 'otv-5');
  await page.evaluate(() =>
    (window as unknown as { __flyLaunchT: (t: number) => void }).__flyLaunchT(3000),
  );
  await page
    .getByRole('button', { name: /^play$/i })
    .first()
    .click();
  await expect(page.locator('[data-testid="coast-scene"]')).toBeVisible({ timeout: 220_000 });
  await expect(page.locator('[data-testid="launch-scene"]')).toHaveCount(0);
  if (testInfo.project.name === 'desktop-chromium') {
    await expect(page.locator('body')).toContainText('54.5°');
    await expect(page.locator('body')).toContainText('/ 12275');
  }
});

// G3: the launch camera director is the default camera; ?cam=classic keeps today's for one release.
test('the launch runs the camera director by default (data-director-shot names the shot)', async ({
  page,
}) => {
  await enterLaunch(page, 'curiosity');
  const scene = page.locator('[data-testid="launch-scene"]');
  await expect(scene).toHaveAttribute('data-camera-mode', 'director');
  await expect(async () => {
    const shot = await scene.getAttribute('data-director-shot');
    expect(shot && shot.length > 0).toBe(true);
  }).toPass({ timeout: 15_000 });
});

test('?cam=classic runs the old camera: no director shot', async ({ page }) => {
  await enterLaunch(page, 'curiosity', '&cam=classic');
  const scene = page.locator('[data-testid="launch-scene"]');
  await expect(scene).toHaveAttribute('data-camera-mode', 'classic');
  await expect(scene).toHaveAttribute('data-director-shot', '');
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

  test('a Shuttle launch (Galileo) keeps the payload in the bay: no parking-orbit or separation beat', async ({
    page,
  }) => {
    await enterLaunch(page, 'galileo');
    const plan = page.locator('.launch .plan .lbl');
    await expect(plan.first()).toBeAttached();
    const labels = (await plan.allTextContents()).map((s) => s.trim().toUpperCase());
    expect(labels.length).toBeGreaterThan(2);
    expect(labels.some((l) => l.includes('SEPARATION') || l.includes('SPACECRAFT SEP'))).toBe(
      false,
    );
    expect(labels.some((l) => l.includes('PARKING'))).toBe(false);
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

// A mission record with no flight block and no flight_data_quality (STS-51-L) has no Fly chip in
// the mission panel; a typed URL must not play a launch to orbit for it either.
test('a mission record with no flight (STS-51-L) offers no launch, and ?launch=1 plays none', async ({
  page,
}) => {
  await page.goto('/fly?mission=sts-51-l&launch=1');
  await expect(page.locator('.opening-name')).toContainText(/51-L/i, { timeout: 30_000 });
  await expect(page.locator('[data-testid="fly-opening-launch"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="launch-scene"]')).toHaveCount(0);
});

test('STS-1 (reconstructed flight data) still offers its launch', async ({ page }) => {
  await page.goto('/fly?mission=sts-1');
  await expect(page.locator('[data-testid="fly-opening-launch"]')).toBeVisible({ timeout: 30_000 });
});
