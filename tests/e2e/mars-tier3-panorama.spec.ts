import { test, expect } from '@playwright/test';
import { clickViaEvaluate } from './_helpers/click-via-evaluate';

/**
 * Mars Tier 3 panorama e2e (PRD-014 §S7, v0.7.x #PD-mars).
 *
 * Verifies the "Stand at site" → equirectangular skybox → exit flow
 * for the 10 panorama-equipped Mars sites. The renderer + button
 * machinery already had Apollo 11/17 e2e coverage on /moon since
 * v0.6; this spec adds Mars-side coverage for the shared-slot
 * enter/exit toggle pattern that landed in commit 38656a242.
 *
 * Why only one site under full coverage + one mobile smoke test:
 *   The renderer is the same THREE.js skybox instance per site —
 *   what differs across sites is the texture URL and the per-site
 *   elevation range (frontend doesn't see the latter; the tilt
 *   clamp is uniform ±20°). Curiosity gives us a flagship case
 *   (Mt Mercou panorama, public-domain NASA imagery) and represents
 *   the modal "rover with traverse" UX. The other 9 sites are
 *   covered by the hotspots.spec.ts deep-link smoke test — a
 *   per-site panorama enter/exit test would 10× a slow run for
 *   minimal additional signal.
 */

test.describe('Mars Tier 3 panorama — Curiosity full lifecycle', () => {
  test('Stand at site → panorama active → Esc exits → back to orbit', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

    await page.goto('/mars?site=curiosity');
    // Stand-at-site button is in the detail panel slot. It only
    // renders when selected.hotspot_tier3_panorama is set, so its
    // presence confirms the sidecar wiring + button conditional.
    // Waiting on this is enough readiness — it requires the canvas
    // to mount, sites JSON to load, and the panel to render.
    const stand = page.getByTestId('stand-at-site');
    await expect(stand).toBeVisible({ timeout: 20_000 });
    await expect(stand).toContainText(/stand at site/i);

    // Enter the panorama.
    await stand.click();

    // Panorama overlay's sr-only live region tells assistive tech
    // the camera moved; in the DOM it's the announcer we can poll
    // for "panorama active" state.
    const overlay = page.getByTestId('panorama-overlay');
    await expect(overlay).toBeVisible({ timeout: 5_000 });

    // The shared button slot now reads "Exit panorama view"; the
    // enter variant is gone. data-testid switches in lockstep.
    const exit = page.getByTestId('exit-panorama');
    await expect(exit).toBeVisible();
    await expect(stand).toHaveCount(0);

    // Press Esc to exit. The button handler is also wired and would
    // work — Esc covers the keyboard path that doesn't rely on the
    // button being discoverable.
    await page.keyboard.press('Escape');

    // Back to orbital — Stand-at-site returns, Exit goes away,
    // overlay closes.
    await expect(stand).toBeVisible({ timeout: 5_000 });
    await expect(exit).toHaveCount(0);
    await expect(overlay).toHaveCount(0);

    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('Exit button click (not Esc) also exits the panorama', async ({ page }) => {
    await page.goto('/mars?site=perseverance');
    const stand = page.getByTestId('stand-at-site');
    await expect(stand).toBeVisible({ timeout: 15_000 });
    await stand.click();

    const exit = page.getByTestId('exit-panorama');
    await expect(exit).toBeVisible({ timeout: 5_000 });
    // Mobile-widths put the detail-panel chrome on top of exit-panorama;
    // dispatch the click directly so the handler fires regardless.
    await clickViaEvaluate(exit);

    // After the click, the slot toggles back to the enter variant.
    await expect(stand).toBeVisible({ timeout: 5_000 });
    await expect(exit).toHaveCount(0);
  });
});

test.describe('Mars Tier 3 panorama — omitted sites have no Stand-at-site button', () => {
  // 3 sites intentionally skip Tier 3 because no usable surface
  // panorama exists (#PD-mars plan, decision §1). Verify the button
  // is absent on each so a future sidecar regression that
  // accidentally adds a tier3 field would fail this gate.
  for (const siteId of ['mars3', 'beagle2', 'schiaparelli']) {
    test(`/mars?site=${siteId} renders without the Stand-at-site button`, async ({ page }) => {
      await page.goto(`/mars?site=${siteId}`);
      // Wait for a known-present detail-panel element so we're sure
      // the page has loaded the site (otherwise toHaveCount(0)
      // could pass simply because the panel hasn't mounted yet).
      // The OVERVIEW tab is present on every detail panel regardless
      // of tier coverage.
      await expect(page.getByRole('tab', { name: 'OVERVIEW' })).toBeVisible({ timeout: 20_000 });
      // Stand-at-site rendering is gated on selected.hotspot_tier3_panorama;
      // for omitted sites that field stays undefined, so the button
      // never appears.
      const stand = page.getByTestId('stand-at-site');
      await expect(stand).toHaveCount(0);
    });
  }
});
