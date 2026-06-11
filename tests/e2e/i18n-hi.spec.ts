import { expect, test } from '@playwright/test';
import { clickNavLink, localeChip } from './_helpers/nav';

test.describe('/hi/ URL smoke', () => {
  test('locale chip and nav persistence work for Hindi', async ({ page }) => {
    await page.goto('/hi/explore', { waitUntil: 'networkidle' });
    await expect(localeChip(page).first()).toContainText('HI');

    await clickNavLink(page, '/missions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/hi\/missions$/);
    await expect(localeChip(page).first()).toContainText('HI');
  });
});
