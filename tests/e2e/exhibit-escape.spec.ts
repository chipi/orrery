import { expect, test } from '@playwright/test';
import { waitForHydration } from './_helpers/hydration';

/**
 * ExhibitOverlay listens for Escape on the window of every page. Until 2026-11-12 it acted on
 * every Escape, exhibit mode or not: it called goto() on the current URL, and SvelteKit's
 * navigation blurred the element any other Escape handler had just returned focus to (found by
 * the A6 More-menu spec: focus ended on <body>). Outside exhibit mode Escape must leave focus and
 * URL alone; inside it, Escape still exits.
 */
test.describe('Escape and exhibit mode', () => {
  test('outside exhibit mode Escape keeps focus and the URL', async ({ page }) => {
    await page.goto('/missions', { waitUntil: 'networkidle' });
    await waitForHydration(page);
    const brand = page.locator('nav[aria-label]:not(.footer-menu) .brand');
    await brand.focus();
    await expect(brand).toBeFocused();
    const before = page.url();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(brand).toBeFocused();
    expect(page.url()).toBe(before);
  });

  test('in exhibit mode Escape exits to the same page without the mode', async ({ page }) => {
    await page.goto('/explore?mode=exhibit', { waitUntil: 'networkidle' });
    await waitForHydration(page);
    await expect(page.locator('body.exhibit-mode')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.locator('body.exhibit-mode')).toHaveCount(0);
    await expect(page).not.toHaveURL(/mode=exhibit/);
  });
});
