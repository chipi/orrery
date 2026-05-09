import { test, expect } from '@playwright/test';

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
  { path: '/explore', token: 'NUESTRO SISTEMA SOLAR' },
  { path: '/plan', token: 'DESTINO' },
  { path: '/fly', token: 'VEHÍCULO' },
  // J.1 collapsed the /missions filters and removed the visible body
  // heading — only the document title is reliably translated. token=null
  // means "only assert chip + URL, skip body-text check".
  { path: '/missions', token: null as string | null },
  { path: '/earth', token: 'TIERRA' },
  { path: '/moon', token: 'LUNA' },
] as const;

test.describe('?lang=es smoke', () => {
  for (const { path, token } of ROUTES) {
    test(`${path} loads in Spanish`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

      await page.goto(`${path}?lang=es`);
      // Picker chip displays ES (the active locale's short tag).
      await expect(page.locator('button.chip').first()).toContainText('ES', { timeout: 10_000 });
      // A Spanish-only token is visible somewhere on the page —
      // confirms Paraglide loaded the es bundle and the route picked
      // up the URL locale. Some routes (notably /missions after J.1
      // collapsed its filters) no longer expose translated body text,
      // so a null token means "skip body check, the chip + URL prove
      // the locale loaded".
      if (token) {
        await expect(page.getByText(token, { exact: false }).first()).toBeVisible({
          timeout: 10_000,
        });
      }
      // No JS errors during hydration / first paint.
      expect(errors).toEqual([]);
    });
  }

  test('en-US fallback still works when no ?lang=', async ({ page }) => {
    await page.goto('/missions');
    await expect(page.locator('button.chip').first()).toContainText('EN', { timeout: 10_000 });
    // J.1 removed the body heading — assert via the document title
    // (set by m.missions_page_title()).
    await expect(page).toHaveTitle(/Mission Catalog/i, { timeout: 10_000 });
  });

  test('selected locale persists when navigating via top nav', async ({ page }) => {
    await page.goto('/explore?lang=es', { waitUntil: 'networkidle' });
    await expect(page.locator('button.chip').first()).toContainText('ES', { timeout: 10_000 });

    // Click MISSIONS in the shared top nav.
    await page.locator('nav a.link[href*="/missions"]').first().click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/missions\?lang=es$/);
    await expect(page.locator('button.chip').first()).toContainText('ES');
    // J.1 removed the body heading — assert via the document title.
    await expect(page).toHaveTitle(/Catálogo de misiones/i, { timeout: 10_000 });
  });
});
