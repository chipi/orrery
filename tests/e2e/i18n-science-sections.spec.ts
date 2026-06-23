import { expect, test } from '@playwright/test';

/**
 * Guards /science section + landing localization (PRD-024 follow-up).
 *
 * The section pages load their overlay in a `load()` that must resolve the
 * locale from the URL via getLocale() — a regression where it hard-coded
 * 'en-US' made every /<locale>/science/... page render English even though
 * the per-locale overlays existed. The existing i18n-*.spec.ts files assert
 * `html lang` + the locale chip but never the localized section CONTENT, so
 * that regression slipped through.
 *
 * Strategy: capture the en-US title, then assert each localized page (a)
 * carries the right `lang` and (b) does NOT show the en-US title. Comparing
 * against the en-US baseline keeps the test robust if the translated copy is
 * later reworded — it only fails if a page falls back to English.
 */
const SECTIONS = [
  'planets/magnetic-fields',
  'planets/tides',
  'orbits/eccentricity',
  'propulsion/tsiolkovsky',
];
const LOCALES = ['de', 'fr', 'ja', 'ar'];

test.describe('/science localization', () => {
  for (const section of SECTIONS) {
    test(`${section} is localized in every locale`, async ({ page }) => {
      await page.goto(`/science/${section}`, { waitUntil: 'networkidle' });
      const enTitle = (await page.locator('h1').first().textContent())?.trim() ?? '';
      expect(enTitle.length, `en-US title for ${section}`).toBeGreaterThan(0);

      for (const locale of LOCALES) {
        await page.goto(`/${locale}/science/${section}`, { waitUntil: 'networkidle' });
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        const localized = (await page.locator('h1').first().textContent())?.trim() ?? '';
        expect(localized.length, `${locale}/${section} title present`).toBeGreaterThan(0);
        expect(localized, `${locale}/${section} must not fall back to the en-US title`).not.toBe(
          enTitle,
        );
      }
    });
  }

  test('the /science landing is localized', async ({ page }) => {
    await page.goto('/science', { waitUntil: 'networkidle' });
    const enLede = (await page.locator('main').first().innerText()).slice(0, 400);

    for (const locale of LOCALES) {
      await page.goto(`/${locale}/science`, { waitUntil: 'networkidle' });
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      const localized = (await page.locator('main').first().innerText()).slice(0, 400);
      expect(localized, `/${locale}/science must not fall back to the en-US landing copy`).not.toBe(
        enLede,
      );
    }
  });
});
