import type { Page, Locator } from '@playwright/test';

/**
 * Click a top-nav link by href substring, viewport-aware.
 *
 * On desktop the link lives inline in `<nav .center>` and is clicked
 * directly. On mobile (≤640 px, mobile-chromium runner) the same link
 * is hidden behind the hamburger drawer (`a.drawer-link`) and the
 * `button.menu-toggle` has to be opened first. The two layouts were
 * introduced by the v0.6.0 mobile-nav overhaul; specs written before
 * the overhaul targeted only the desktop selector and silently
 * failed on the mobile runner.
 */
export async function clickNavLink(page: Page, hrefSubstring: string): Promise<void> {
  const desktopLink = page.locator(`nav .center a.link[href*="${hrefSubstring}"]`).first();
  if (await desktopLink.isVisible().catch(() => false)) {
    await desktopLink.click();
    return;
  }
  await page.locator('button.menu-toggle').click();
  // Wait for the drawer link to be visible before clicking — on slow
  // mobile-chromium under CI load, the drawer's CSS transition can
  // race the click, so the click lands on an element that's still
  // mid-animation and gets dropped. Was a v0.6.2 retry-pass on
  // i18n-pt-BR (issue #222). 3 s is generous; happy path is <100 ms.
  const drawerLink = page.locator(`a.drawer-link[href*="${hrefSubstring}"]`).first();
  await drawerLink.waitFor({ state: 'visible', timeout: 3_000 });
  await drawerLink.click();
}

/**
 * Locale-picker chip locator, scoped to the picker so it doesn't
 * collide with other `button.chip` elements on screens that have
 * filter / panel chips of their own (e.g. /fly HUD chips).
 */
export function localeChip(page: Page): Locator {
  return page.locator('[data-locale-picker] button.chip');
}

/**
 * Open the locale-picker menu, viewport-aware. On mobile (≤640 px) the picker
 * was moved out of the top bar into the hamburger drawer (2026-07-10 — keeps
 * the 44 px nav-bar touch targets within the 375 px SE viewport), so the
 * drawer has to be opened first. On desktop the bar chip is clicked directly.
 * Mirrors `clickNavLink`. The bar chip's textContent stays correct even when
 * `display:none` on mobile, so `localeChip(...).toContainText(...)` assertions
 * still pass without opening the drawer — only the click needs this helper.
 */
export async function openLocaleMenu(page: Page): Promise<void> {
  const barChip = page.locator('[data-locale-picker] button.chip').first();
  if (await barChip.isVisible().catch(() => false)) {
    await barChip.click();
    return;
  }
  // Mobile: the picker lives in the drawer.
  await page.locator('button.menu-toggle').click();
  const drawerChip = page.locator('.mobile-drawer [data-locale-picker] button.chip');
  await drawerChip.waitFor({ state: 'visible', timeout: 3_000 });
  await drawerChip.click();
}
