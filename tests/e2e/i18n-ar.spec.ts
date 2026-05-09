import { expect, test } from '@playwright/test';

test.describe('?lang=ar smoke', () => {
  test('locale chip, direction, and nav persistence work for Arabic', async ({ page }) => {
    await page.goto('/explore?lang=ar', { waitUntil: 'networkidle' });
    await expect(page.locator('button.chip').first()).toContainText('AR');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    await page.locator('nav a.link[href*="/missions"]').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/missions\?lang=ar$/);
    await expect(page.locator('button.chip').first()).toContainText('AR');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
});
