import { expect, test } from '@playwright/test';

test.describe('?lang=ko smoke', () => {
  test('locale chip and nav persistence work for Korean', async ({ page }) => {
    await page.goto('/explore?lang=ko', { waitUntil: 'networkidle' });
    await expect(page.locator('button.chip').first()).toContainText('KO');

    await page.locator('nav a.link[href*="/missions"]').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/missions\?lang=ko$/);
    await expect(page.locator('button.chip').first()).toContainText('KO');
  });
});
