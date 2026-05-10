import { expect, test } from '@playwright/test';

test.describe('?lang=nl smoke', () => {
  test('locale chip and nav persistence work for Dutch', async ({ page }) => {
    await page.goto('/explore?lang=nl', { waitUntil: 'networkidle' });
    await expect(page.locator('button.chip').first()).toContainText('NL');
    await expect(page.getByText('ONS ZONNESTELSEL', { exact: false }).first()).toBeVisible();

    await page.locator('nav a.link[href*="/missions"]').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/missions\?lang=nl$/);
    await expect(page.locator('button.chip').first()).toContainText('NL');
  });
});
