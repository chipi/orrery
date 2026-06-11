import { expect, test } from '@playwright/test';
import { clickNavLink, localeChip } from './_helpers/nav';

test.describe('/it/ URL smoke', () => {
  test('locale chip and nav persistence work for Italian', async ({ page }) => {
    await page.goto('/it/explore', { waitUntil: 'networkidle' });
    await expect(localeChip(page).first()).toContainText('IT');
    await expect(page.locator('html')).toHaveAttribute('lang', 'it');

    await clickNavLink(page, '/missions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/it\/missions$/);
    await expect(localeChip(page).first()).toContainText('IT');
  });
});
