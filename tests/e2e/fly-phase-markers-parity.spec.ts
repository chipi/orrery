import { test, expect, type Page } from '@playwright/test';
import { isExpectedNoise } from './_helpers/console-errors';

/**
 * Phase-marker parity smoke spec — #107 Step 6i.
 *
 * The Apollo 11 spec (fly-apollo11-phase-markers.spec.ts) carries the
 * full 13-test depth. This spec runs lightweight per-mission smokes
 * across the entire corpus to catch breakage in the "phase markers
 * render on every mission with events + a trajectory" invariant
 * established by Step 6 (a/b/c/d/e/h).
 *
 * Per mission asserts:
 *   1. mission-name visible → page hydrated
 *   2. phase-markers-overlay attached → /fly built phase markers
 *   3. data-marker-count > 0 → at least one event projected
 *   4. HUD phase-pill carries a science chip (Step 6a/d/e science map)
 *   5. No console errors during load
 *
 * Total: 5 assertions × 35 missions × 2 projects = ~350 checks.
 * Light enough to run on every push; surfaces "did the parity gate
 * regress?" within seconds per mission.
 *
 * Speculative / event-less missions explicitly excluded:
 *  - inspiration-mars, starship-demo, starship-mars-crew (Mars,
 *    speculative — 0 events).
 */

const MOON_MISSIONS = [
  'apollo11',
  'apollo13',
  'apollo17',
  'artemis2',
  'artemis3',
  'beresheet',
  'blue-moon-mk1',
  'chandrayaan1',
  'chandrayaan3',
  'change3',
  'change4',
  'change5',
  'change6',
  'clementine',
  'lro',
  'luna16',
  'luna17',
  'luna21',
  'luna24',
  'luna9',
  'slim',
] as const;

const MARS_MISSIONS = [
  'curiosity',
  'hope-probe',
  'insight',
  'mangalyaan',
  'mariner4',
  'mars-express',
  'mars-pathfinder',
  'mars3',
  'maven',
  'mmx',
  'perseverance',
  'schiaparelli',
  'tianwen1',
  'viking1',
] as const;

const OUTER_SYSTEM_MISSIONS = ['dawn', 'galileo', 'voyager-2', 'new-horizons'] as const;

const ALL_MISSIONS = [...MOON_MISSIONS, ...MARS_MISSIONS, ...OUTER_SYSTEM_MISSIONS];

async function loadMission(page: Page, mission: string): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    // Drop favicon / webgl / hot-module noise and overlay-probe 404s;
    // real asset 404s (patch, portrait, gallery) still surface.
    if (isExpectedNoise(msg)) return;
    errors.push(msg.text());
  });
  await page.goto(`/fly?mission=${mission}`);
  await expect(page.locator('[data-testid="mission-name"]')).toBeVisible({ timeout: 15_000 });
  return errors;
}

test.describe('/fly phase-marker parity smoke (#107 Step 6i)', () => {
  for (const mission of ALL_MISSIONS) {
    test(`${mission} — overlay renders + count > 0 + HUD chip + clean console`, async ({
      page,
    }) => {
      const errors = await loadMission(page, mission);
      // Allow a brief beat for the animate loop to write phaseMarkerScreens.
      await page.waitForTimeout(800);

      // 1. Overlay is mounted.
      const overlay = page.locator('[data-testid="phase-markers-overlay"]');
      await expect(overlay).toBeVisible({ timeout: 10_000 });

      // 2. data-marker-count > 0.
      const count = await overlay.getAttribute('data-marker-count');
      expect(Number(count)).toBeGreaterThan(0);

      // 3. HUD phase pill carries a science chip (set in Step 6a/d/e science map).
      const pill = page.locator('[data-testid="hud-phase-pill"]');
      await expect(pill).toBeVisible();
      await expect(pill.locator('[data-science-chip]')).toBeVisible();

      // 4. No console errors during load. `errors` is already narrowed
      // via isExpectedNoise at capture time (see top-of-file handler).
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }
});
