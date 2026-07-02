import type { Page } from '@playwright/test';

/**
 * Mobile HUD-expand helpers.
 *
 * On touch viewports the routes fold their secondary controls into the
 * shared MobileControlsDrawer — a bottom "◫ CONTROLS" tab (`.mcd-handle`),
 * peek by default. Specs that probe HUD-resident controls (2D toggle, layer
 * chips, paths roster, view controls) must EXPAND that drawer first, or the
 * peeked body (capped + overflow-hidden) clips everything past the first row.
 * Desktop renders the drawer as `display:none` → these are no-ops there.
 */

/**
 * Expand the mobile controls drawer (◫ CONTROLS) if present + collapsed.
 * Robust: waits for hydration, then retries the click until aria-expanded
 * flips to true (a single click can be swallowed while the scene paints).
 */
export async function openControlsDrawer(page: Page): Promise<void> {
  const handle = page.locator('.mcd-handle');
  await handle
    .first()
    .waitFor({ state: 'attached', timeout: 15_000 })
    .catch(() => {});
  if (!(await handle.count())) return; // not rendered
  if ((await handle.first().evaluate((el) => getComputedStyle(el).display)) === 'none') return; // desktop
  for (let i = 0; i < 6; i++) {
    if ((await handle.first().getAttribute('aria-expanded')) === 'true') return;
    await handle
      .first()
      .click({ timeout: 5_000 })
      .catch(() => {});
    await page.waitForTimeout(200);
  }
}

/**
 * Expand the /fly HUD on mobile. The identity hud-stack still collapses
 * behind `.hud-collapse` (◐); the secondary toggle rows now live in the
 * controls drawer. Surface both so HUD-resident affordances are laid out.
 */
export async function expandFlyHud(page: Page): Promise<void> {
  const btn = page.locator('.hud-collapse');
  if (await btn.count()) {
    const shown = (await btn.first().evaluate((el) => getComputedStyle(el).display)) !== 'none';
    if (shown) {
      await btn
        .first()
        .click({ timeout: 5_000 })
        .catch(() => {});
      await page.waitForTimeout(150);
    }
  }
  await openControlsDrawer(page);
}

/**
 * Expand the /explore (and surface-route) controls on mobile — the layer
 * chips, view controls and paths roster now live in the MobileControlsDrawer.
 */
export async function expandExploreHud(page: Page): Promise<void> {
  await openControlsDrawer(page);
}
