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
  // Desktop, direct top-level link (Home / Fly / Plan stayed inline after
  // the 2026-07 nav regroup).
  const desktopLink = page.locator(`nav .center a.link[href*="${hrefSubstring}"]`).first();
  if (await desktopLink.isVisible().catch(() => false)) {
    await desktopLink.click();
    return;
  }

  // Desktop, dropdown child. The 2026-07 IA restructure moved most routes
  // behind Explore / Catalog / Learn dropdowns — the link only exists in the
  // DOM once its group is open. Open each group trigger until the target
  // `.group-menu-link` surfaces, then click it. Guarded to the desktop layout
  // (hamburger hidden) so the mobile drawer path below still owns ≤640 px.
  const menuToggle = page.locator('button.menu-toggle');
  const onDesktop = !(await menuToggle.isVisible().catch(() => false));
  if (onDesktop) {
    const menuLink = page
      .locator(`nav .group-menu a.group-menu-link[href*="${hrefSubstring}"]`)
      .first();
    const triggers = page.locator('nav .center button.group-trigger');
    const groupCount = await triggers.count();
    for (let i = 0; i < groupCount; i++) {
      await triggers.nth(i).click();
      if (await menuLink.isVisible().catch(() => false)) {
        await menuLink.click();
        return;
      }
      // Not in this group — opening the next trigger auto-closes this one
      // (the nav opens one group at a time), so no explicit close needed.
    }
    // Surface a clear failure if the href isn't in any group.
    await menuLink.click({ timeout: 3_000 });
    return;
  }

  // Mobile: the hamburger drawer lists every link inline (groups expand as
  // headings + indented children), so the href-substring match still works.
  await menuToggle.click();
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
 * Reveal a desktop nav link and return its locator WITHOUT navigating —
 * for visibility assertions (smoke, fleet). Direct top-level links (Fly /
 * Plan) resolve immediately; links moved behind the Explore / Catalog /
 * Learn dropdowns (2026-07 regroup) are surfaced by opening each group
 * trigger until the target `.group-menu-link` appears. Desktop-only; mobile
 * callers keep their own drawer-open path.
 */
export async function revealDesktopNavLink(page: Page, hrefSubstring: string): Promise<Locator> {
  const direct = page.locator(`nav .center a.link[href*="${hrefSubstring}"]`).first();
  if (await direct.isVisible().catch(() => false)) return direct;
  const menuLink = page
    .locator(`nav .group-menu a.group-menu-link[href*="${hrefSubstring}"]`)
    .first();
  // A prior reveal (this helper is called per-route in a loop by smoke) may
  // have left a group open. If the target is already showing, take it; else
  // close the open group first — the nav opens one at a time, so clicking an
  // already-open group's trigger would toggle it SHUT and hide its children.
  if (await menuLink.isVisible().catch(() => false)) return menuLink;
  const openTrigger = page.locator('nav .center button.group-trigger[aria-expanded="true"]');
  if (await openTrigger.count()) await openTrigger.first().click();
  const triggers = page.locator('nav .center button.group-trigger');
  const groupCount = await triggers.count();
  for (let i = 0; i < groupCount; i++) {
    await triggers.nth(i).click();
    if (await menuLink.isVisible().catch(() => false)) return menuLink;
  }
  // Return the (not-yet-visible) menu-link locator so the caller's
  // toBeVisible() fails with a clear selector rather than a generic timeout.
  return menuLink;
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
