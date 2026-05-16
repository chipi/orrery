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
  await page.locator(`a.drawer-link[href*="${hrefSubstring}"]`).first().click();
}

/**
 * Locale-picker chip locator, scoped to the picker so it doesn't
 * collide with other `button.chip` elements on screens that have
 * filter / panel chips of their own (e.g. /fly HUD chips).
 */
export function localeChip(page: Page): Locator {
  return page.locator('[data-locale-picker] button.chip');
}
