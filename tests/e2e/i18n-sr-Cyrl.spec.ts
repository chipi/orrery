import { expect, test } from '@playwright/test';
import { clickNavLink, localeChip } from './_helpers/nav';

test.describe('?lang=sr-Cyrl smoke', () => {
  test('locale chip and nav persistence work for Serbian Cyrillic', async ({ page }) => {
    const chip = localeChip(page);
    await page.goto('/explore?lang=sr-Cyrl', { waitUntil: 'networkidle' });
    await expect(chip).toContainText('СР');

    await clickNavLink(page, '/missions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/missions\?lang=sr-Cyrl$/);
    await expect(chip).toContainText('СР');
  });
});
