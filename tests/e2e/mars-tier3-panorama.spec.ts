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
  test('Stand at site → panorama active → Esc exits → back to orbit', async ({
    page,
    isMobile,
  }) => {
    test.slow(isMobile, 'mobile Mars sites-load chain (N+2 sequential fetches) > 30 s budget');
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

    await page.goto('/mars?site=curiosity', { waitUntil: 'networkidle' });
    // Stand-at-site button is in the detail panel slot. It only
    // renders when selected.hotspot_tier3_panorama is set, so its
    // presence confirms the sidecar wiring + button conditional.
    // Waiting on this is enough readiness — it requires the canvas
    // to mount, sites JSON to load, and the panel to render.
    const stand = page.getByTestId('stand-at-site');
    await expect(stand).toBeVisible({ timeout: 30_000 });
    await expect(stand).toContainText(/stand at site/i);

    // Enter the panorama. Dispatch the click directly — on mobile widths the
    // bottom drawer / detail-panel chrome can overlap the button's hit area.
    await clickViaEvaluate(stand);

    // Panorama overlay's sr-only live region tells assistive tech
    // the camera moved; in the DOM it's the announcer we can poll
    // for "panorama active" state.
    const overlay = page.getByTestId('panorama-overlay');
    await expect(overlay).toBeVisible({ timeout: 5_000 });

    // The exit affordance differs by viewport: desktop reuses the panel slot
    // (exit-panorama, the enter variant gone); mobile hides the detail panel in
    // fullscreen panorama and shows a floating exit instead.
    const exit = page.getByTestId(isMobile ? 'panorama-floating-exit' : 'exit-panorama');
    await expect(exit).toBeVisible();
    await expect(stand).toHaveCount(0);

    // Exit. Desktop: Esc (the keyboard path). Mobile has no physical Esc, so
    // use the floating exit button (the real mobile exit affordance).
    if (isMobile) {
      await clickViaEvaluate(exit);
    } else {
      await page.keyboard.press('Escape');
    }

    // Panorama closes. On desktop the detail panel persists, so Stand-at-site
    // returns; on mobile the fullscreen panorama exits back to the bare scene
    // (the site panel does not reopen), so we assert only that the panorama
    // has closed.
    await expect(overlay).toHaveCount(0, { timeout: 5_000 });
    await expect(exit).toHaveCount(0);
    if (!isMobile) {
      await expect(stand).toBeVisible({ timeout: 5_000 });
    }

    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('Exit button click (not Esc) also exits the panorama', async ({ page, isMobile }) => {
    test.slow(isMobile, 'mobile Mars sites-load chain > 30 s budget');
    await page.goto('/mars?site=perseverance', { waitUntil: 'networkidle' });
    const stand = page.getByTestId('stand-at-site');
    await expect(stand).toBeVisible({ timeout: 30_000 });
    await clickViaEvaluate(stand);

    // Desktop reuses the panel slot (exit-panorama); mobile shows a floating
    // exit over the fullscreen panorama (the detail panel is hidden).
    const exit = page.getByTestId(isMobile ? 'panorama-floating-exit' : 'exit-panorama');
    await expect(exit).toBeVisible({ timeout: 5_000 });
    // Dispatch the click directly so the handler fires regardless of any
    // overlapping chrome.
    await clickViaEvaluate(exit);

    // Panorama closes. Desktop restores the panel (Stand-at-site returns);
    // mobile exits to the bare scene, so assert only that the exit affordance
    // (and the panorama) is gone.
    await expect(exit).toHaveCount(0, { timeout: 5_000 });
    if (!isMobile) {
      await expect(stand).toBeVisible({ timeout: 5_000 });
    }
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
