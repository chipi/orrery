import { expect, test } from '@playwright/test';
import { clickNavLink, localeChip } from './_helpers/nav';

test.describe('?lang=ko smoke', () => {
  test('locale chip and nav persistence work for Korean', async ({ page }) => {
    await page.goto('/explore?lang=ko', { waitUntil: 'networkidle' });
    await expect(localeChip(page).first()).toContainText('KO');

    await clickNavLink(page, '/missions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/missions\?lang=ko$/);
    await expect(localeChip(page).first()).toContainText('KO');
  });
});
