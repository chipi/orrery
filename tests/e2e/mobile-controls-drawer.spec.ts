import { expect, test } from '@playwright/test';

test.describe('MobileControlsDrawer', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(!isMobile, 'Mobile-only');
  });

  test('/explore — drawer visible, collapsed by default', async ({ page }) => {
    await page.goto('/explore', { waitUntil: 'networkidle' });
    const handle = page.locator('.mcd-handle');
    await expect(handle).toBeVisible({ timeout: 10_000 });
    const expanded = await handle.getAttribute('aria-expanded');
    expect(expanded).toBe('false');
  });

  test('/explore — clicking handle expands it', async ({ page }) => {
    await page.goto('/explore', { waitUntil: 'networkidle' });
    const handle = page.locator('.mcd-handle');
    await expect(handle).toBeVisible({ timeout: 10_000 });
    await handle.click();
    await page.waitForTimeout(200);
    const expanded = await handle.getAttribute('aria-expanded');
    expect(expanded).toBe('true');
  });

  test('/moon — drawer is functional', async ({ page }) => {
    await page.goto('/moon', { waitUntil: 'networkidle' });
    const handle = page.locator('.mcd-handle');
    await expect(handle).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('MobileControlsDrawer — desktop', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, 'Desktop-only');
  });

  test('/explore — handle not on desktop', async ({ page }) => {
    await page.goto('/explore', { waitUntil: 'networkidle' });
    const handle = page.locator('.mcd-handle');
    await expect(handle).toHaveCount(0);
  });
});
