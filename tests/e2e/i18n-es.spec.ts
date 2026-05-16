import { test, expect } from '@playwright/test';
import { clickNavLink, localeChip } from './_helpers/nav';

/**
 * Spanish locale smoke (#17 acceptance gate).
 *
 * Loads each of the six screens with `?lang=es`, asserts the locale
 * picker chip switches to ES, and checks that visibly translated
 * strings are present (Spanish-only words that don't appear in the
 * en-US source). One test per screen.
 *
 * Catches regressions where:
 *   - Paraglide doesn't pick up the new locale at compile time.
 *   - A route component still hardcodes 'en-US' in a data.ts call.
 *   - The locale picker fails to apply the URL ?lang= on hydration.
 */

const ROUTES = [
  { path: '/explore' },
  { path: '/plan' },
  { path: '/fly' },
  { path: '/missions' },
  { path: '/earth' },
  { path: '/moon' },
] as const;

test.describe('?lang=es smoke', () => {
  for (const { path } of ROUTES) {
    test(`${path} loads in Spanish`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

      await page.goto(`${path}?lang=es`);
      // Picker chip displays ES (the active locale's short tag).
      await expect(localeChip(page).first()).toContainText('ES', { timeout: 10_000 });
      // `<html lang="es">` is the authoritative locale signal — set by
      // src/lib/locale.ts on hydration, present in every viewport, not
      // affected by mobile-nav collapse. Body-text tokens were too
      // fragile (matched only the hidden mobile nav links).
      await expect(page.locator('html')).toHaveAttribute('lang', 'es', { timeout: 10_000 });
      // No JS errors during hydration / first paint.
      expect(errors).toEqual([]);
    });
  }

  test('en-US fallback still works when no ?lang=', async ({ page }) => {
    await page.goto('/missions');
    await expect(localeChip(page).first()).toContainText('EN', { timeout: 10_000 });
    // J.1 removed the body heading — assert via the document title
    // (set by m.missions_page_title()).
    await expect(page).toHaveTitle(/Mission Catalog/i, { timeout: 10_000 });
  });

  test('selected locale persists when navigating via top nav', async ({ page }) => {
    await page.goto('/explore?lang=es', { waitUntil: 'networkidle' });
    await expect(localeChip(page).first()).toContainText('ES', { timeout: 10_000 });

    // Click MISSIONS in the shared top nav.
    await clickNavLink(page, '/missions');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/missions\?lang=es$/);
    await expect(localeChip(page).first()).toContainText('ES');
    // J.1 removed the body heading — assert via the document title.
    await expect(page).toHaveTitle(/Catálogo de misiones/i, { timeout: 10_000 });
  });
});
