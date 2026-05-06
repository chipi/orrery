import { expect, test } from '@playwright/test';

test.describe('?lang=sr-Latn smoke', () => {
  test('locale chip and nav persistence work for Serbian Latin', async ({ page }) => {
    const chip = page.locator('[data-locale-picker] button.chip');
    await page.goto('/explore?lang=sr-Latn', { waitUntil: 'networkidle' });
    await expect(chip).toHaveText('SR');

    await page.locator('nav a.link[href*="/missions"]').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/missions\?lang=sr-Latn$/);
    await expect(chip).toHaveText('SR');
  });
});
