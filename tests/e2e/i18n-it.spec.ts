import { expect, test } from '@playwright/test';

test.describe('?lang=it smoke', () => {
  test('locale chip and nav persistence work for Italian', async ({ page }) => {
    await page.goto('/explore?lang=it', { waitUntil: 'networkidle' });
    await expect(page.locator('button.chip').first()).toContainText('IT');
    await expect(
      page.getByText('IL NOSTRO SISTEMA SOLARE', { exact: false }).first(),
    ).toBeVisible();

    await page.locator('nav a.link[href*="/missions"]').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/missions\?lang=it$/);
    await expect(page.locator('button.chip').first()).toContainText('IT');
  });
});
