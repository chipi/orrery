import { expect, test } from '@playwright/test';
import { clickNavLink, localeChip } from './_helpers/nav';

test.describe('/nl/ URL smoke', () => {
  test('locale chip and nav persistence work for Dutch', async ({ page }) => {
    await page.goto('/nl/explore', { waitUntil: 'networkidle' });
    await expect(localeChip(page).first()).toContainText('NL');
    await expect(page.locator('html')).toHaveAttribute('lang', 'nl');

    await clickNavLink(page, '/missions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/nl\/missions$/);
    await expect(localeChip(page).first()).toContainText('NL');
  });
});
