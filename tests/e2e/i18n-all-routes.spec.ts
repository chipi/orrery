import { expect, test } from '@playwright/test';

/**
 * Broad "every page works in every language" guard. For each top-level route
 * and a representative spread of locales — German (Latin), Japanese (CJK),
 * Arabic (RTL), Serbian (Cyrillic) — it visits /<locale>/<route> and asserts:
 *   - <html lang> matches the locale
 *   - Arabic flips <html dir> to rtl
 *   - the page actually renders (nav + a heading/main region)
 *   - no uncaught page errors fire
 *
 * This is the automated form of "go to each page, swap languages" — it would
 * fail loudly if a route stopped prerendering per-locale or threw on a locale.
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

const LOCALES = [
  { code: 'de', rtl: false },
  { code: 'ja', rtl: false },
  { code: 'ar', rtl: true },
  { code: 'sr-Cyrl', rtl: false },
];

for (const { code, rtl } of LOCALES) {
  test.describe(`i18n route sweep — ${code}`, () => {
    for (const route of ROUTES) {
      test(`${route} renders in ${code}`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));

        const url = route === '/' ? `/${code}/` : `/${code}${route}`;
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        await expect(page.locator('html')).toHaveAttribute('lang', code);
        await expect(page.locator('html')).toHaveAttribute('dir', rtl ? 'rtl' : 'ltr');
        // Nav is on every page; a heading or main region proves it rendered.
        await expect(page.locator('nav').first()).toBeVisible();
        await expect(page.locator('h1, main, [role="main"]').first()).toBeVisible();

        expect(errors, `page errors on ${url}: ${errors.join(' | ')}`).toHaveLength(0);
      });
    }
  });
}
