import { expect, test } from '@playwright/test';
import { clickNavLink, localeChip } from './_helpers/nav';

test.describe('?lang=pt-BR smoke', () => {
  test('locale chip and nav persistence work for Brazilian Portuguese', async ({ page }) => {
    await page.goto('/explore?lang=pt-BR', { waitUntil: 'networkidle' });
    await expect(localeChip(page).first()).toContainText('PT');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');

    await clickNavLink(page, '/missions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/missions\?lang=pt-BR$/);
    await expect(localeChip(page).first()).toContainText('PT');
  });
});
