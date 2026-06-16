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
  const btn = page.locator('.hud-restore');
  if (!(await btn.count())) return;
  if ((await btn.evaluate((el) => getComputedStyle(el).display)) === 'none') return;
  await btn
    .first()
    .click({ timeout: 5_000 })
    .catch(() => {});
  await page.waitForTimeout(150);
}
