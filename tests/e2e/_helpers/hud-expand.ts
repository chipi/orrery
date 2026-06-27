import type { Page } from '@playwright/test';

/**
 * #342 Phase 25 + Phase 31 — default-collapse helpers.
 *
 * On touch-emulating viewports (Playwright's mobile-chromium project
 * exposes `matchMedia('(hover: none)').matches === true`) both /fly and
 * /explore render with their HUD cluster collapsed by default so the
 * canvas reads cinematically. Existing e2e specs that probe HUD-
 * resident affordances (mission name, 2D toggle, phase pill, layer
 * chips, …) need to expand the cluster first or every locator resolves
 * to `display: none`.
 *
 * Both helpers are no-ops on desktop: the expand affordance only
 * exists under `@media (hover: none)`, so the locator returns 0
 * matches and we early-return.
 */

/**
 * Expand the /fly HUD cluster on mobile. Clicks `.hud-collapse` (the
 * top-left ◐ button) if present; otherwise returns immediately.
 */
export async function expandFlyHud(page: Page): Promise<void> {
  const btn = page.locator('.hud-collapse');
  if (!(await btn.count())) return;
  if ((await btn.evaluate((el) => getComputedStyle(el).display)) === 'none') return;
  await btn
    .first()
    .click({ timeout: 5_000 })
    .catch(() => {});
  await page.waitForTimeout(150);
}

/**
 * Expand the /explore HUD cluster on mobile. Clicks `.hud-restore`
 * (the top-left ◐ button) if present; otherwise returns immediately.
 */
export async function expandExploreHud(page: Page): Promise<void> {
  // Wait for hydration first. On mobile the HUD collapses at component
  // init (during Svelte mount), so right after `goto` (fired on `load`,
  // before mount completes) `.hud-restore` isn't in the DOM yet — a bare
  // `count()` check would early-return as if already expanded, then the
  // HUD collapses a beat later and every HUD-resident locator is hidden.
  // `.hud-controls` is in the DOM on both desktop and mobile once mounted,
  // so waiting for it is a fast, reliable hydration signal on either.
  await page
    .locator('.hud-controls')
    .first()
    .waitFor({ state: 'attached', timeout: 15_000 })
    .catch(() => {});
  const btn = page.locator('.hud-restore');
  // Retry until the cluster is expanded. A single click can be swallowed
  // (momentary interception while the scene paints) and `.catch()` hides
  // it. Each pass: if the restore button is gone (expanded) or hidden
  // (desktop / no-op), we're done; otherwise click again.
  for (let i = 0; i < 8; i++) {
    if (!(await btn.count())) return; // {#if hudCollapsed} removed it → expanded
    if ((await btn.evaluate((el) => getComputedStyle(el).display)) === 'none') return;
    await btn
      .first()
      .click({ timeout: 5_000 })
      .catch(() => {});
    await page.waitForTimeout(200);
  }
}
