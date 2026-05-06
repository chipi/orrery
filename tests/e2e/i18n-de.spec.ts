import { expect, test } from '@playwright/test';

test.describe('?lang=de smoke', () => {
  test('locale chip and nav persistence work for German', async ({ page }) => {
    await page.goto('/explore?lang=de', { waitUntil: 'networkidle' });
    await expect(page.locator('button.chip').first()).toHaveText('DE');
    await expect(page.getByText('OUR SOLAR SYSTEM', { exact: false }).first()).toBeVisible();

    await page.locator('nav a.link[href*="/missions"]').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/missions\?lang=de$/);
    await expect(page.locator('button.chip').first()).toHaveText('DE');
  });
});
