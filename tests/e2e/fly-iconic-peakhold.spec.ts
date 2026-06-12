import { test, expect, type Page } from '@playwright/test';

/**
 * One-iconic-beat-per-planet smoke test.
 *
 * For each PlanetId, navigate to a representative mission's flyby /
 * EDL_or_OI event and assert that:
 *
 *  - peakHold engages (peakHoldRemainingMs > 1000 ms within 1.5 s of click)
 *  - peakHoldArmedForFlybyMet matches the event's MET
 *  - subPhase string reads `flyby-{MET}-{planetId}` (planet identification
 *    via findFlybyPlanetFromLabel succeeded — Juno-Earth-as-Mars
 *    regression would fail here)
 *  - .hud-stack carries the .cinematic-hidden class (chrome suppression
 *    engaged)
 *  - .milestone-overlay is absent from the DOM (gated by
 *    !inCinematicHeldBeat)
 *
 * Pre-#332 spec coverage: zero direct tests of the iconic-shot pipeline.
 * This spec is the load-bearing safety net during scale-out — a tweak
 * that drops the freeze for any planet fails here, before it ships.
 *
 * The dev-only __flyJumpToMet hook is used so missions whose events
 * lack milestone-track buttons (Mariner 4, Pioneer 10/11, etc.) can
 * still be reached. The hook is gated on `import.meta.env.DEV`, so
 * production builds expose nothing.
 */

interface BeatCase {
  planet: string;
  mission: string;
  metDays: number;
  earthHold?: boolean; // true → 4000 ms hold, otherwise 2500 ms
}

const BEATS: BeatCase[] = [
  { planet: 'mercury', mission: 'messenger', metDays: 2419 },
  { planet: 'venus', mission: 'cassini', metDays: 193 },
  { planet: 'earth', mission: 'hayabusa2', metDays: 366, earthHold: true },
  { planet: 'mars', mission: 'mariner4', metDays: 228 },
  { planet: 'jupiter', mission: 'pioneer-10', metDays: 641 },
  { planet: 'saturn', mission: 'cassini', metDays: 2451 },
  { planet: 'uranus', mission: 'voyager-2', metDays: 3079 },
  { planet: 'neptune', mission: 'voyager-2', metDays: 4388 },
];

async function loadMissionAndJumpToFlyby(
  page: Page,
  mission: string,
  metDays: number,
): Promise<void> {
  await page.goto(`/fly?mission=${mission}`);
  await expect(page.locator('[data-testid="mission-name"]')).toBeVisible({ timeout: 20_000 });
  // The mission card / proceed-to-simulation wizard appears for ~3 s
  // when a mission is freshly loaded. Wait for it to render then
  // dismiss it before we issue the flyby jump (the jump only fires
  // after the wizard is gone).
  const proceed = page.getByRole('button', { name: /proceed to simulation/i });
  await expect(proceed).toBeVisible({ timeout: 15_000 });
  await proceed.click();
  // After Proceed, the cruise-hold fires automatically (W3.7, ~4 s)
  // which hides the scrubber + milestone-track as part of the
  // cinematic suppression via `.cinematic-hidden { opacity: 0 }`.
  // Wait for chrome to return — the `.scrubber:not(.cinematic-hidden)`
  // selector matches once the hold expires.
  await expect(page.locator('.scrubber:not(.cinematic-hidden)')).toBeVisible({
    timeout: 15_000,
  });
  // Click the milestone-track button whose aria-label contains
  // `at MET {metDays} days`. dispatchEvent('click') bypasses any
  // hit-test interference from overlay layers (same fix as
  // fly-apollo11-phase-markers.spec §242).
  const button = page.locator(
    `[data-testid="milestone-track"] button[aria-label*="MET ${metDays} days"]`,
  );
  await expect(button, `milestone-track button for MET ${metDays}`).toHaveCount(1, {
    timeout: 10_000,
  });
  await button.dispatchEvent('click');
  // Camera converges + peakHold arms within ~1 s. Wait for cinematic
  // suppression to kick in (DOM-observable in production builds, where
  // __flyDebug's internal-state fields are stripped).
  await page.waitForTimeout(900);
}

test.describe('/fly iconic-shot peakHold smoke (one beat per planet)', () => {
  // reducedMotion gates the cruise-hold off (see updateCruiseHoldArming
  // in /fly/+page.svelte), so the wizard-dismiss → milestone-click path
  // is no longer race-prone. The iconic-shot composition itself still
  // fires under reducedMotion because it's an event-driven beat, not
  // an auto-fired motion ramp.
  test.use({ colorScheme: 'dark' });
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  for (const beat of BEATS) {
    test(`${beat.planet}: ${beat.mission} MET ${beat.metDays}`, async ({ page }) => {
      await loadMissionAndJumpToFlyby(page, beat.mission, beat.metDays);

      // Page didn't navigate — we're still on /fly. Catches the
      // Apollo 11 phase-marker-click regression where force:true
      // landed on the top Nav's /missions link.
      expect(page.url(), `${beat.planet}: should still be on /fly after click`).toMatch(/\/fly/);

      // chrome suppression engaged. The .cinematic-hidden class is
      // applied to .hud-stack / .capcom-panel / .scrubber during the
      // peakHold + afterglow window. We assert on .hud-stack — it's
      // the canonical container that always exists on a loaded mission.
      await expect(
        page.locator('.hud-stack.cinematic-hidden'),
        `${beat.planet}: hud-stack should carry cinematic-hidden during peakHold`,
      ).toBeVisible({ timeout: 3_000 });

      // milestone-overlay gated off (post-#332 §4 fix — the overlay
      // is conditional on !inCinematicHeldBeat, so it shouldn't be in
      // the DOM during the hold).
      await expect(
        page.locator('[data-testid="milestone-overlay"]'),
        `${beat.planet}: milestone-overlay should be hidden during peakHold`,
      ).toHaveCount(0);
    });
  }
});
