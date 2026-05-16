import { expect, test } from '@playwright/test';
import { clickNavLink, localeChip } from './_helpers/nav';

test.describe('?lang=de smoke', () => {
  test('locale chip and nav persistence work for German', async ({ page }) => {
    await page.goto('/explore?lang=de', { waitUntil: 'networkidle' });
    await expect(localeChip(page).first()).toContainText('DE');
    await expect(page.getByText('UNSER SONNENSYSTEM', { exact: false }).first()).toBeVisible();

    await clickNavLink(page, '/missions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/missions\?lang=de$/);
    await expect(localeChip(page).first()).toContainText('DE');
  });
});
