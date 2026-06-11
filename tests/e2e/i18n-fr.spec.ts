import { expect, test } from '@playwright/test';
import { clickNavLink, localeChip } from './_helpers/nav';

test.describe('/fr/ URL smoke', () => {
  test('locale chip and nav persistence work for French', async ({ page }) => {
    await page.goto('/fr/explore', { waitUntil: 'networkidle' });
    await expect(localeChip(page).first()).toContainText('FR');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');

    await clickNavLink(page, '/missions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/fr\/missions$/);
    await expect(localeChip(page).first()).toContainText('FR');
  });
});
