import { expect, test } from '@playwright/test';

test.describe('?lang=pt-BR smoke', () => {
  test('locale chip and nav persistence work for Brazilian Portuguese', async ({ page }) => {
    await page.goto('/explore?lang=pt-BR', { waitUntil: 'networkidle' });
    await expect(page.locator('button.chip').first()).toContainText('PT');
    await expect(page.getByText('NOSSO SISTEMA SOLAR', { exact: false }).first()).toBeVisible();

    await page.locator('nav a.link[href*="/missions"]').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/missions\?lang=pt-BR$/);
    await expect(page.locator('button.chip').first()).toContainText('PT');
  });
});
