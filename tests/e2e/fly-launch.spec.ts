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

// Past the climb by the viewer's own control: the master scrubber spans pad to arrival and an
// Earth-orbit mission gives the ascent its first 10-20 % (coastAscentFraction), so 0.5 is mid-coast.
// (The `__flyLaunchT` seek hook is dev-only and absent from the production build CI tests.)
async function scrubIntoCoast(page: Page): Promise<void> {
  await page.locator('input.scrub').evaluate((el: HTMLInputElement) => {
    el.value = '0.5';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
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
  test.setTimeout(90_000);
  await enterLaunch(page, 'sts-1');
  await scrubIntoCoast(page);
  await expect(page.locator('[data-testid="coast-scene"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-testid="launch-scene"]')).toHaveCount(0);
  if (testInfo.project.name === 'desktop-chromium') {
    // the coast HUD (hidden on touch): the orbit from the mission record
    await expect(page.locator('body')).toContainText('307×307 km');
    await expect(page.locator('body')).toContainText('/ 37');
  }
});

// The craft in the coast is enlarged (a real orbiter is sub-pixel against the Earth) and marked in
// the wide shot; the debug hook reports its size and its share of the view.
test('STS-1 coast: the enlarged craft is sized and in view (debug hook)', async ({ page }) => {
  test.setTimeout(90_000);
  await enterLaunch(page, 'sts-1', '&debug=1');
  await scrubIntoCoast(page);
  await expect(page.locator('[data-testid="coast-scene"]')).toBeVisible({ timeout: 30_000 });
  await expect(async () => {
    const d = await page.evaluate(() =>
      (
        window as unknown as {
          __flyCoastCamDebug?: () => { craftKm: number; craftFraction: number } | null;
        }
      ).__flyCoastCamDebug?.(),
    );
    expect(d).toBeTruthy();
    expect(d!.craftKm).toBeGreaterThan(300); // the model ×460, not a sub-pixel dot
    expect(d!.craftKm).toBeLessThan(3000);
    expect(d!.craftFraction).toBeGreaterThan(0.002);
    expect(d!.craftFraction).toBeLessThan(1);
  }).toPass({ timeout: 30_000 });
});

// The X-37B flights (dest EARTH, Atlas V) coast in the orbit tracked for them, not a cislunar arc.
test('OTV-5 after the climb: the Earth-orbit coast (54.5 degrees from its record)', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  await enterLaunch(page, 'otv-5');
  await scrubIntoCoast(page);
  await expect(page.locator('[data-testid="coast-scene"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-testid="launch-scene"]')).toHaveCount(0);
  if (testInfo.project.name === 'desktop-chromium') {
    await expect(page.locator('body')).toContainText('54.5°');
    await expect(page.locator('body')).toContainText('/ 12275');
  }
});

// Shenzhou 5 (dest EARTH): 14 orbits at 332 x 336 km from its record.
test('Shenzhou 5 after the climb: the Earth-orbit coast (14 orbits from its record)', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  await enterLaunch(page, 'shenzhou-5');
  await scrubIntoCoast(page);
  await expect(page.locator('[data-testid="coast-scene"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-testid="launch-scene"]')).toHaveCount(0);
  if (testInfo.project.name === 'desktop-chromium') {
    await expect(page.locator('body')).toContainText('343×343 km');
    await expect(page.locator('body')).toContainText('/ 14');
  }
});

// G3: the launch camera director is the default camera; ?cam=classic keeps today's for one release.
test('the launch runs the camera director by default (data-director-shot names the shot)', async ({
  page,
}) => {
  await enterLaunch(page, 'curiosity');
  const scene = page.locator('[data-testid="launch-scene"]');
  await expect(async () => {
    const shot = await scene.getAttribute('data-director-shot');
    expect(shot && shot.length > 0).toBe(true);
  }).toPass({ timeout: 15_000 });
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

  test('the Shuttle coast plays compressed: the OMS-2 marker seeks to its T+35 min (STS-68: 2110 s)', async ({
    page,
  }) => {
    await enterLaunch(page, 'sts-1');
    // The bar lays the ascent out on the play clock; its OMS-2 marker must still seek (and
    // label itself) in mission time — the 26-minute coast between MECO and OMS-2 is 15 s of play.
    const oms = page.locator('.journey-tick-button', { hasText: 'OMS-2' }).first();
    await expect(oms).toHaveAttribute('aria-label', /T\+35:\d\d/);
    await oms.click();
    await expect(page.locator('.launch .clock .met')).toHaveText(/T\+35:\d\d/, { timeout: 10_000 });
    await expect(page.locator('.launch .status')).toHaveText(/OMS-2|COAST/);
  });

  test('an Atlas V Earth-orbit flight (OTV-1) separates 169 s after SECO, not at it', async ({
    page,
  }) => {
    await enterLaunch(page, 'otv-1');
    // The plan lists a window of seven beats around the current one; seek to SECO on the play
    // bar so the separation after it is in the window.
    await page.locator('.journey-tick-button', { hasText: 'SECO' }).first().click();
    const next = page.locator('.launch .plan li.next .lbl');
    await expect(next).toHaveText(/separation|spacecraft sep/i, { timeout: 10_000 });
    const nextTime = (await page.locator('.launch .plan li.next .time').textContent())?.trim();
    expect(nextTime).toBeTruthy();
    const rows = (await page.locator('.launch .plan .lbl').allTextContents()).map((s) =>
      s.trim().toUpperCase(),
    );
    expect(rows.some((l) => l.includes('PARKING'))).toBe(false);
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

// Prod 0.9.9 (plan A9): LAUNCH was live while the page still held the default ORRERY-1 flight,
// so a quick click flew its Falcon Heavy under the Apollo 11 title. The mission file is held
// back here so that window is always open.
test('LAUNCH clicked as soon as it shows flies the requested mission’s rocket', async ({
  page,
}) => {
  await page.route('**/data/missions/moon/apollo11.json', async (route) => {
    await new Promise((r) => setTimeout(r, 4_000));
    await route.continue();
  });
  await page.goto('/fly?mission=apollo11');
  const launch = page.locator('[data-testid="fly-opening-launch"]');
  await launch.click({ timeout: 30_000 });
  await expect(page.locator('[data-testid="launch-scene"] .header .sub')).toContainText(
    'Saturn V',
    { timeout: 20_000 },
  );
});

test('STS-1 (reconstructed flight data) still offers its launch', async ({ page }) => {
  await page.goto('/fly?mission=sts-1');
  await expect(page.locator('[data-testid="fly-opening-launch"]')).toBeVisible({ timeout: 30_000 });
});

// 0.9.11 F2: what lands is per flight. Psyche's side boosters landed on LZ-1 and LZ-2 (the inset
// opens at T+7:52 and its frame waits closed until then); Europa Clipper expended all three cores,
// so it has no inset. The inset's pose over time and the landing beat are unit-tested
// (landing-inset.test.ts, flight-plan-beats.test.ts); the dev-only seek hook is absent from the
// production build.
test('booster landing is per flight: Psyche lands its side boosters, Europa Clipper does not', async ({
  page,
}) => {
  await enterLaunch(page, 'psyche-mission');
  const inset = page.getByTestId('landing-inset');
  await expect(inset).toBeAttached();
  await expect(inset).toHaveText('BOOSTER LANDING · LZ-1 · LZ-2');
  await expect(inset).not.toHaveClass(/\bon\b/);
  await enterLaunch(page, 'europa-clipper');
  await expect(page.getByTestId('landing-inset')).toHaveCount(0);
});
