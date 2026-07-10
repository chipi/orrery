import { expect, test } from '@playwright/test';

/**
 * Keyboard / TV-remote accessibility regression guards (RFC-031).
 *
 * A TV D-pad emits the same events as a keyboard, so these desktop-keyboard
 * assertions double as the Google-TV navigability guard. They lock the roving
 * nav, the command palette, and the canvas body index — the pieces that made
 * every scene reachable without a pointer (closing ADR-025's Tier-2 gap).
 *
 * Static axe scanning lives in a11y.spec.ts (11 routes, 0-critical gate); this
 * file is purely the *interaction* guard those static scans can't express.
 */
test.describe('keyboard a11y (RFC-031)', () => {
  // Keyboard/D-pad navigation is a desktop + TV interaction. On the mobile
  // projects the inline nav strip is display:none (hamburger drawer instead),
  // so these desktop-nav assertions don't apply — matches the convention in
  // the other *-keyboard-nav specs.
  test.beforeEach(() => {
    test.skip(
      test.info().project.name !== 'desktop-chromium',
      'keyboard navigation is a desktop interaction',
    );
  });

  test('nav is a roving toolbar — arrows move focus, one Tab stop', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // The footer link-list is also a labelled <nav>; the roving toolbar is
    // the primary header nav, so exclude the footer menu.
    const nav = page.locator('nav[aria-label]:not(.footer-menu)');
    await nav.locator('a[href], button').first().focus();
    const before = await page.evaluate(() => document.activeElement?.textContent);
    await page.keyboard.press('ArrowRight');
    const after = await page.evaluate(() => document.activeElement?.textContent);
    expect(after).not.toBe(before); // arrow moved focus within the nav

    const tabStops = await nav.evaluate(
      (n) =>
        [...n.querySelectorAll<HTMLElement>('a[href], button')].filter(
          (el) =>
            !(el as HTMLButtonElement).disabled &&
            el.offsetParent !== null &&
            el.getAttribute('aria-disabled') !== 'true' &&
            el.tabIndex === 0,
        ).length,
    );
    expect(tabStops).toBe(1); // roving: exactly one item is tabbable
  });

  test('command palette — Cmd/Ctrl-K opens, type + Enter navigates', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.keyboard.press('Control+k');
    await expect(page.locator('.cmdk-overlay')).toBeVisible();
    await page.locator('.cmdk-input').fill('mars');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/mars$/);
    await expect(page.locator('.cmdk-overlay')).toHaveCount(0);
  });

  test('/explore body index — keyboard path to a canvas body', async ({ page }) => {
    await page.goto('/explore', { waitUntil: 'networkidle' });
    await page.locator('.body-index-toggle').click();
    const list = page.locator('.bidx-list');
    await expect(list).toBeVisible();
    const rows = list.locator('button.bidx-row');
    expect(await rows.count()).toBeGreaterThan(8); // Sun + planets + small bodies
    await rows.first().focus();
    await page.keyboard.press('ArrowDown');
    const tabStops = await list.evaluate(
      (l) =>
        [...l.querySelectorAll('button.bidx-row')].filter((b) => (b as HTMLElement).tabIndex === 0)
          .length,
    );
    expect(tabStops).toBe(1);
  });
});
