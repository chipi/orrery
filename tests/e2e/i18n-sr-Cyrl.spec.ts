import { expect, test } from '@playwright/test';

test.describe('?lang=sr-Cyrl smoke', () => {
  test('locale chip and nav persistence work for Serbian Cyrillic', async ({ page }) => {
    const chip = page.locator('[data-locale-picker] button.chip');
    await page.goto('/explore?lang=sr-Cyrl', { waitUntil: 'networkidle' });
    await expect(chip).toHaveText('СР');

    await page.locator('nav a.link[href*="/missions"]').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/missions\?lang=sr-Cyrl$/);
    await expect(chip).toHaveText('СР');
  });
});
