import { expect, test } from '@playwright/test';
import { localeChip } from './_helpers/nav';

/**
 * Interactive "swap the language from every page" guard. locale-picker.spec
 * only exercises the picker on /missions; this drives the picker chip on EVERY
 * top-level route, switches en-US → German, and asserts the URL rewrites to
 * /de/<route>, <html lang> flips to de, and the chip reads DE. A second test
 * round-trips de → ja → en-US to confirm multi-switch + prefix stripping.
 */
const ROUTES = [
  '/',
  '/explore',
  '/missions',
  '/fleet',
  '/plan',
  '/fly',
  '/earth',
  '/moon',
  '/mars',
  '/iss',
  '/tiangong',
  '/science',
  '/credits',
  '/library',
];

async function pick(page: import('@playwright/test').Page, native: RegExp) {
  await localeChip(page).first().click();
  const menu = page.locator('[data-locale-picker] ul.menu');
  await expect(menu).toBeVisible();
  await menu.locator('button.option', { hasText: native }).click();
}

test.describe('locale picker — switches from every page', () => {
  for (const route of ROUTES) {
    test(`picker switches en→de on ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'networkidle' });
      await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');

      await pick(page, /Deutsch/i);

      const expected = route === '/' ? /\/de\/?$/ : new RegExp(`/de${route}/?$`);
      await expect(page).toHaveURL(expected);
      await expect(page.locator('html')).toHaveAttribute('lang', 'de');
      await expect(localeChip(page).first()).toContainText('DE');
    });
  }

  test('round-trips de → ja → en-US on /science', async ({ page }) => {
    await page.goto('/de/science', { waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');

    await pick(page, /日本語/);
    await expect(page).toHaveURL(/\/ja\/science\/?$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja');

    await pick(page, /English/i);
    await expect(page).toHaveURL(/\/science\/?$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  });
});
