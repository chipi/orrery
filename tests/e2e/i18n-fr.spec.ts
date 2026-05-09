import { expect, test } from '@playwright/test';

test.describe('?lang=fr smoke', () => {
  test('locale chip and nav persistence work for French', async ({ page }) => {
    await page.goto('/explore?lang=fr', { waitUntil: 'networkidle' });
    await expect(page.locator('button.chip').first()).toContainText('FR');
    await expect(page.getByText('NOTRE SYSTÈME SOLAIRE', { exact: false }).first()).toBeVisible();

    await page.locator('nav a.link[href*="/missions"]').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/missions\?lang=fr$/);
    await expect(page.locator('button.chip').first()).toContainText('FR');
  });
});
