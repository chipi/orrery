import { expect, test } from '@playwright/test';

test.describe('?lang=ru smoke', () => {
  test('locale chip, direction, and nav persistence work for Russian', async ({ page }) => {
    await page.goto('/explore?lang=ru', { waitUntil: 'networkidle' });
    await expect(page.locator('button.chip').first()).toContainText('RU');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

    await page.locator('nav a.link[href*="/missions"]').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/missions\?lang=ru$/);
    await expect(page.locator('button.chip').first()).toContainText('RU');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  });
});
