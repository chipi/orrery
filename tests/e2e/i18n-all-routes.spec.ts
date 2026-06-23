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

// `script` (for the non-Latin locales) lets us assert the rendered content is
// ACTUALLY in the language — not just that <html lang> is set. Even the
// canvas-heavy routes carry plenty of script via the nav + HUD labels.
const LOCALES = [
  { code: 'de', rtl: false, script: null }, // Latin — content checked by science + body-text specs
  { code: 'ja', rtl: false, script: /[぀-ヿ一-鿿]/g },
  { code: 'ar', rtl: true, script: /[؀-ۿ]/g },
  { code: 'sr-Cyrl', rtl: false, script: /[Ѐ-ӿ]/g },
];

for (const { code, rtl, script } of LOCALES) {
  test.describe(`i18n route sweep — ${code}`, () => {
    for (const route of ROUTES) {
      test(`${route} renders + is in ${code}`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));

        const url = route === '/' ? `/${code}/` : `/${code}${route}`;
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        await expect(page.locator('html')).toHaveAttribute('lang', code);
        await expect(page.locator('html')).toHaveAttribute('dir', rtl ? 'rtl' : 'ltr');
        // Nav is on every page; a heading or main region proves it rendered.
        await expect(page.locator('nav').first()).toBeVisible();
        await expect(page.locator('h1, main, [role="main"]').first()).toBeVisible();

        // Content-language check: the visible text must contain enough
        // characters from the locale's script that it cannot be English.
        if (script) {
          const text = await page.locator('body').innerText();
          const hits = (text.match(script) ?? []).length;
          expect(hits, `${url} should render ${code} script, got ${hits} script chars`).toBeGreaterThan(10);
        }

        expect(errors, `page errors on ${url}: ${errors.join(' | ')}`).toHaveLength(0);
      });
    }
  });
}
