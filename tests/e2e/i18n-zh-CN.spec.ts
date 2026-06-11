import { expect, test } from '@playwright/test';
import { clickNavLink, localeChip } from './_helpers/nav';

test.describe('/zh-CN/ URL smoke', () => {
  test('locale chip and nav persistence work for Simplified Chinese', async ({ page }) => {
    await page.goto('/zh-CN/explore', { waitUntil: 'networkidle' });
    await expect(localeChip(page).first()).toContainText('ZH');

    await clickNavLink(page, '/missions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/zh-CN\/missions$/);
    await expect(localeChip(page).first()).toContainText('ZH');
  });
});
