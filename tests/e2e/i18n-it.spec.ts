import { expect, test } from '@playwright/test';
import { clickNavLink, localeChip } from './_helpers/nav';

test.describe('?lang=it smoke', () => {
  test('locale chip and nav persistence work for Italian', async ({ page }) => {
    await page.goto('/explore?lang=it', { waitUntil: 'networkidle' });
    await expect(localeChip(page).first()).toContainText('IT');
    await expect(
      page.getByText('IL NOSTRO SISTEMA SOLARE', { exact: false }).first(),
    ).toBeVisible();

    await clickNavLink(page, '/missions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/missions\?lang=it$/);
    await expect(localeChip(page).first()).toContainText('IT');
  });
});
