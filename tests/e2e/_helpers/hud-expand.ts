import type { Page } from '@playwright/test';

/**
 * Mobile drawer helpers.
 *
 * Touch routes (≤767px) fold their secondary controls into a bottom
 * MobileDrawerGroup (`.mdg`) — a 3-tab accordion where each tab's content
 * renders in `.mdg-body` ONLY once that tab is opened (tapped). Content tabs
 * expose `aria-expanded`; action tabs (e.g. /iss LIST, ASSEMBLY) just fire a
 * callback. (/fly still declares the older single MobileControlsDrawer
 * `.mcd-handle`, but it is display:none on phones.)
 *
 * Desktop renders `.mdg` (and `.mcd`) as display:none → every helper below is
 * a no-op there.
 */

/** True only when a MobileDrawerGroup is actually on-screen (mobile viewport). */
async function drawerLive(page: Page): Promise<boolean> {
  const mdg = page.locator('.mdg').first();
  if (!(await mdg.count())) return false;
  return (await mdg.evaluate((el) => getComputedStyle(el).display)) !== 'none';
}

/**
 * Open a MobileDrawerGroup CONTENT tab by its (case-insensitive) label so its
 * body — layer chips, nation legend, paths roster — lays out and is visible.
 * No-op on desktop or when the route/tab isn't present. Retries because a
 * single tap can be swallowed while the 3D scene paints.
 */
export async function openDrawerTab(page: Page, label: RegExp): Promise<void> {
  if (!(await drawerLive(page))) return;
  const tab = page.locator('.mdg-tab').filter({ hasText: label }).first();
  await tab.waitFor({ state: 'attached', timeout: 3_000 }).catch(() => {});
  if (!(await tab.count())) return;
  for (let i = 0; i < 6; i++) {
    if ((await tab.getAttribute('aria-expanded')) === 'true') return;
    await tab.click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(200);
  }
}

/** Close whatever MobileDrawerGroup tab is open (so it stops intercepting the
 *  canvas). No-op on desktop / when nothing is open. */
export async function closeDrawer(page: Page): Promise<void> {
  if (!(await drawerLive(page))) return;
  const close = page.locator('.mdg-close').first();
  if ((await close.count()) && (await close.isVisible().catch(() => false))) {
    await close.click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(150);
  }
}

/**
 * Reveal the "controls" surface on mobile. On the new `.mdg` routes that means
 * opening the controls-bearing tab (Controls on /explore, Layers on the surface
 * routes). Falls back to the legacy single `.mcd-handle` drawer (/fly), which
 * is a harmless no-op when hidden.
 */
export async function openControlsDrawer(page: Page): Promise<void> {
  if (await drawerLive(page)) {
    await openDrawerTab(page, /controls|layers/i);
    return;
  }
  const handle = page.locator('.mcd-handle');
  await handle
    .first()
    .waitFor({ state: 'attached', timeout: 3_000 })
    .catch(() => {});
  if (!(await handle.count())) return;
  // Not actually interactable — desktop, or nested in a display:none wrapper
  // (e.g. /fly's dormant MobileControlsDrawer). isVisible() accounts for
  // ancestor visibility, unlike a computed-display check on the handle alone;
  // without this the click loop below spins 6×5 s and blows the test budget.
  if (
    !(await handle
      .first()
      .isVisible()
      .catch(() => false))
  )
    return;
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
 * Expand the /fly HUD on mobile. The identity hud-stack still collapses behind
 * `.hud-collapse` (◐) where that button is live; the secondary toggle rows live
 * in the controls drawer. Surface both so HUD-resident affordances lay out.
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
  // Mobile: the identity hud-stack is collapsed by default; the MISSION tab in
  // the bottom `.fly-mtabs` bar reveals it. Tapping toggles, so only open when
  // the HUD isn't already showing. `.fly-mtabs` is display:none on desktop, so
  // this is a no-op there.
  const missionTab = page
    .locator('.fly-mtab')
    .filter({ hasText: /mission/i })
    .first();
  if ((await missionTab.count()) && (await missionTab.isVisible().catch(() => false))) {
    const hudShown = await page
      .locator('[data-testid="mission-name"]')
      .isVisible()
      .catch(() => false);
    if (!hudShown) {
      await missionTab.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(250);
    }
  }
  await openControlsDrawer(page);
}

/**
 * Expand the /explore (and surface-route) controls on mobile — the layer chips
 * and view controls now live in the MobileDrawerGroup Controls/Layers tab.
 */
export async function expandExploreHud(page: Page): Promise<void> {
  await openControlsDrawer(page);
}
