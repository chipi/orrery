import { expect, test } from '@playwright/test';
import { clickNavLink, localeChip } from './_helpers/nav';

test.describe('?lang=hi smoke', () => {
  test('locale chip and nav persistence work for Hindi', async ({ page }) => {
    await page.goto('/explore?lang=hi', { waitUntil: 'networkidle' });
    await expect(localeChip(page).first()).toContainText('HI');

    await clickNavLink(page, '/missions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/missions\?lang=hi$/);
    await expect(localeChip(page).first()).toContainText('HI');
  });
});
