/**
 * Locale picker — interactive switching (2026-06-19 regression coverage).
 *
 * The picker shipped a bug where clicking a non-active locale would
 * close the dropdown but not navigate: the implementation called
 * `setLocale(code, { reload: false })` on the assumption that
 * Paraglide would handle the URL navigation itself. The compiled
 * runtime's behaviour for `{ reload: false }` is to set the cookie
 * but skip navigation entirely — the user saw the picker dropdown
 * close and nothing else happened.
 *
 * These tests pin the picker's runtime behaviour so the regression
 * can't return without going red.
 *
 * The picker chip is hidden on the very narrow mobile-chromium
 * viewport (≤500 px the right-rail tightens to 2 px gap); the picker
 * itself is still rendered and clickable. All assertions here use the
 * desktop-chromium runner where the chip is fully visible.
 */
import { expect, test } from '@playwright/test';
import { localeChip, openLocaleMenu } from './_helpers/nav';

test.describe('locale picker — switching', () => {
  test('clicking a non-active locale navigates to the localized URL', async ({ page }) => {
    await page.goto('/missions', { waitUntil: 'networkidle' });
    // Sanity — we're on the base locale (en-US has no URL prefix).
    await expect(page).toHaveURL(/\/missions$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
    await expect(localeChip(page).first()).toContainText('EN');

    // Open the picker.
    await openLocaleMenu(page);
    const menu = page.locator('[data-locale-picker] ul.menu');
    await expect(menu).toBeVisible();

    // Click the German option.
    await menu.locator('button.option', { hasText: /Deutsch/i }).click();

    // URL rewrites to /de/missions and the picker reflects the change.
    await page.waitForURL(/\/de\/missions/, { timeout: 5_000 });
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await expect(localeChip(page).first()).toContainText('DE');
  });

  test('clicking the already-active locale is a no-op (no URL change)', async ({ page }) => {
    await page.goto('/de/missions', { waitUntil: 'networkidle' });
    await expect(localeChip(page).first()).toContainText('DE');

    await openLocaleMenu(page);
    const menu = page.locator('[data-locale-picker] ul.menu');
    await expect(menu).toBeVisible();

    // Click the German option again (it's the active one).
    await menu.locator('button.option.active', { hasText: /Deutsch/i }).click();

    // The dropdown closes; the URL stays on /de/missions.
    await expect(menu).not.toBeVisible();
    await expect(page).toHaveURL(/\/de\/missions$/);
    await expect(localeChip(page).first()).toContainText('DE');
  });

  test('navigating from /de back to en-US strips the /de/ URL prefix', async ({ page }) => {
    await page.goto('/de/missions', { waitUntil: 'networkidle' });
    await expect(localeChip(page).first()).toContainText('DE');

    await openLocaleMenu(page);
    const menu = page.locator('[data-locale-picker] ul.menu');
    await expect(menu).toBeVisible();

    // Click the English option.
    await menu.locator('button.option', { hasText: /English/i }).click();

    // The base locale (en-US) has no URL prefix — the path collapses
    // back to /missions and <html lang> follows.
    await page.waitForURL(/(?<!\/de)\/missions$/, { timeout: 5_000 });
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
    await expect(localeChip(page).first()).toContainText('EN');
  });
});
