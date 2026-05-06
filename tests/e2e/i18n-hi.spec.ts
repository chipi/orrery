import { expect, test } from '@playwright/test';

test.describe('?lang=hi smoke', () => {
  test('locale chip and nav persistence work for Hindi', async ({ page }) => {
    await page.goto('/explore?lang=hi', { waitUntil: 'networkidle' });
    await expect(page.locator('button.chip').first()).toHaveText('HI');

    await page.locator('nav a.link[href*="/missions"]').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/missions\?lang=hi$/);
    await expect(page.locator('button.chip').first()).toHaveText('HI');
  });
});
