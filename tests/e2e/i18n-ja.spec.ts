import { expect, test } from '@playwright/test';
import { clickNavLink, localeChip } from './_helpers/nav';

test.describe('?lang=ja smoke', () => {
  test('locale chip and nav persistence work for Japanese', async ({ page }) => {
    await page.goto('/explore?lang=ja', { waitUntil: 'networkidle' });
    await expect(localeChip(page).first()).toContainText('JA');

    await clickNavLink(page, '/missions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/missions\?lang=ja$/);
    await expect(localeChip(page).first()).toContainText('JA');
  });
});
