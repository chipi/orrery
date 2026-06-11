import { expect, test } from '@playwright/test';
import { clickNavLink, localeChip } from './_helpers/nav';

test.describe('/pt-BR/ URL smoke', () => {
  test('locale chip and nav persistence work for Brazilian Portuguese', async ({ page }) => {
    await page.goto('/pt-BR/explore', { waitUntil: 'networkidle' });
    await expect(localeChip(page).first()).toContainText('PT');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');

    await clickNavLink(page, '/missions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/pt-BR\/missions$/);
    await expect(localeChip(page).first()).toContainText('PT');
  });
});
