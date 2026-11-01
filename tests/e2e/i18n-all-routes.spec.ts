import { expect, test } from '@playwright/test';

/**
 * Broad "every page works in every language" guard. For each top-level route
 * and every non-base locale (13; script checks for the non-Latin ones: ja, zh-CN,
 * ko, hi, ar (RTL), ru, sr-Cyrl) it visits /<locale>/<route> and asserts:
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
// All 13 non-base locales. Latin-script ones (script: null) get the lang/dir/render
// checks; their content language is checked by the science + body-text specs.
const LOCALES = [
  { code: 'de', rtl: false, script: null },
  { code: 'es', rtl: false, script: null },
  { code: 'fr', rtl: false, script: null },
  { code: 'it', rtl: false, script: null },
  { code: 'nl', rtl: false, script: null },
  { code: 'pt-BR', rtl: false, script: null },
  { code: 'ja', rtl: false, script: /[぀-ヿ一-鿿]/g },
  { code: 'zh-CN', rtl: false, script: /[一-鿿]/g },
  { code: 'ko', rtl: false, script: /[가-힣]/g },
  { code: 'hi', rtl: false, script: /[ऀ-ॿ]/g },
  { code: 'ar', rtl: true, script: /[؀-ۿ]/g },
  { code: 'ru', rtl: false, script: /[Ѐ-ӿ]/g },
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

        // Content-language check: the page must carry enough characters from
        // the locale's script that it cannot be English. We count BOTH visible
        // text and accessible names (aria-label/title/placeholder/alt).
        // Canvas-heavy routes (/explore, /fly, /fleet) are icon-driven — their
        // visible text is sparse, and the footer's translated links are hidden
        // on touch (they move into the nav drawer per the 0.7.2 mobile layout).
        // Every control still carries a translated accessible name, so counting
        // a11y text makes this a stable "is the page in-locale?" assertion
        // instead of one that swings with how much chrome a route happens to
        // paint. A genuine en-US fallback still fails: its labels are English.
        if (script) {
          const text = await page.evaluate(() => {
            const body = document.body;
            const labelled = ['aria-label', 'title', 'placeholder', 'alt']
              .flatMap((a) =>
                Array.from(body.querySelectorAll(`[${a}]`)).map((el) => el.getAttribute(a) ?? ''),
              )
              .join(' ');
            return `${body.innerText} ${labelled}`;
          });
          const hits = (text.match(script) ?? []).length;
          expect(
            hits,
            `${url} should render ${code} script, got ${hits} script chars`,
          ).toBeGreaterThan(10);
        }

        expect(errors, `page errors on ${url}: ${errors.join(' | ')}`).toHaveLength(0);
      });
    }
  });
}
