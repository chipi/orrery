import { expect, test } from '@playwright/test';
import { clickNavLink, localeChip } from './_helpers/nav';

test.describe('?lang=nl smoke', () => {
  test('locale chip and nav persistence work for Dutch', async ({ page }) => {
    await page.goto('/explore?lang=nl', { waitUntil: 'networkidle' });
    await expect(localeChip(page).first()).toContainText('NL');
    await expect(page.getByText('ONS ZONNESTELSEL', { exact: false }).first()).toBeVisible();

    await clickNavLink(page, '/missions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/missions\?lang=nl$/);
    await expect(localeChip(page).first()).toContainText('NL');
  });
});
