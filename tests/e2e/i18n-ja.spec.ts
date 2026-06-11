import { expect, test } from '@playwright/test';
import { clickNavLink, localeChip } from './_helpers/nav';

test.describe('/ja/ URL smoke', () => {
  test('locale chip and nav persistence work for Japanese', async ({ page }) => {
    await page.goto('/ja/explore', { waitUntil: 'networkidle' });
    await expect(localeChip(page).first()).toContainText('JA');

    await clickNavLink(page, '/missions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/ja\/missions$/);
    await expect(localeChip(page).first()).toContainText('JA');
  });
});
