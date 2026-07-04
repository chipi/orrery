import { expect, test } from '@playwright/test';
import { openDrawerTab } from './_helpers/hud-expand';

/**
 * MobileDrawerGroup (`.mdg`) — the mobile bottom accordion that /explore and
 * the surface routes fold their controls into. Tab row is always visible; a
 * content tab's body (`.mdg-body`) renders only once that tab is opened.
 */
test.describe('MobileDrawerGroup', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(!isMobile, 'Mobile-only');
  });

  test('/explore — tab row visible, collapsed by default', async ({ page }) => {
    await page.goto('/explore', { waitUntil: 'networkidle' });
    await expect(page.locator('.mdg-tab').first()).toBeVisible({ timeout: 10_000 });
    // Collapsed by default: no content tab expanded, no body rendered.
    await expect(page.locator('.mdg-tab[aria-expanded="true"]')).toHaveCount(0);
    await expect(page.locator('.mdg-body')).toHaveCount(0);
  });

  test('/explore — opening a tab reveals its body', async ({ page }) => {
    await page.goto('/explore', { waitUntil: 'networkidle' });
    await openDrawerTab(page, /controls/i);
    await expect(page.locator('.mdg-body')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.mdg-tab[aria-expanded="true"]')).toHaveCount(1);
  });

  test('/moon — drawer is functional', async ({ page }) => {
    await page.goto('/moon', { waitUntil: 'networkidle' });
    await expect(page.locator('.mdg-tab').first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('MobileDrawerGroup — desktop', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, 'Desktop-only');
  });

  test('/explore — drawer hidden on desktop', async ({ page }) => {
    await page.goto('/explore', { waitUntil: 'networkidle' });
    // The `.mdg` markup renders but is display:none on hover / ≥768px.
    const tab = page.locator('.mdg-tab').first();
    if (await tab.count()) await expect(tab).toBeHidden();
  });
});
