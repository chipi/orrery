import { expect, test } from '@playwright/test';
import { clickNavLink, localeChip } from './_helpers/nav';

test.describe('/sr-Cyrl/ URL smoke', () => {
  test('locale chip and nav persistence work for Serbian Cyrillic', async ({ page }) => {
    const chip = localeChip(page);
    await page.goto('/sr-Cyrl/explore', { waitUntil: 'networkidle' });
    await expect(chip).toContainText('СР');

    await clickNavLink(page, '/missions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/sr-Cyrl\/missions$/);
    await expect(chip).toContainText('СР');
  });
});
