import { expect, test } from '@playwright/test';

test.describe('?lang=ja smoke', () => {
  test('locale chip and nav persistence work for Japanese', async ({ page }) => {
    await page.goto('/explore?lang=ja', { waitUntil: 'networkidle' });
    await expect(page.locator('button.chip').first()).toContainText('JA');

    await page.locator('nav a.link[href*="/missions"]').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/missions\?lang=ja$/);
    await expect(page.locator('button.chip').first()).toContainText('JA');
  });
});
