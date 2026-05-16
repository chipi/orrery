import { expect, test } from '@playwright/test';
import { clickNavLink, localeChip } from './_helpers/nav';

test.describe('?lang=ru smoke', () => {
  test('locale chip, direction, and nav persistence work for Russian', async ({ page }) => {
    await page.goto('/explore?lang=ru', { waitUntil: 'networkidle' });
    await expect(localeChip(page).first()).toContainText('RU');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

    await clickNavLink(page, '/missions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/missions\?lang=ru$/);
    await expect(localeChip(page).first()).toContainText('RU');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  });
});
