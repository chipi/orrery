import { expect, test } from '@playwright/test';
import { clickNavLink, localeChip } from './_helpers/nav';

test.describe('/ar/ URL smoke', () => {
  test('locale chip, direction, and nav persistence work for Arabic', async ({ page }) => {
    await page.goto('/ar/explore', { waitUntil: 'networkidle' });
    await expect(localeChip(page).first()).toContainText('AR');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    await clickNavLink(page, '/missions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/ar\/missions$/);
    await expect(localeChip(page).first()).toContainText('AR');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
});
