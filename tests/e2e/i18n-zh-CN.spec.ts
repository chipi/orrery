import { expect, test } from '@playwright/test';

test.describe('?lang=zh-CN smoke', () => {
  test('locale chip and nav persistence work for Simplified Chinese', async ({ page }) => {
    await page.goto('/explore?lang=zh-CN', { waitUntil: 'networkidle' });
    await expect(page.locator('button.chip').first()).toHaveText('ZH');

    await page.locator('nav a.link[href*="/missions"]').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/missions\?lang=zh-CN$/);
    await expect(page.locator('button.chip').first()).toHaveText('ZH');
  });
});
