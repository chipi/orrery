import { expect, test } from '@playwright/test';
import { clickNavLink, localeChip } from './_helpers/nav';

test.describe('?lang=zh-CN smoke', () => {
  test('locale chip and nav persistence work for Simplified Chinese', async ({ page }) => {
    await page.goto('/explore?lang=zh-CN', { waitUntil: 'networkidle' });
    await expect(localeChip(page).first()).toContainText('ZH');

    await clickNavLink(page, '/missions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/missions\?lang=zh-CN$/);
    await expect(localeChip(page).first()).toContainText('ZH');
  });
});
