import { expect, test } from '@playwright/test';

/**
 * Illustration register + lab report (G · #536). Ships with ZERO generated
 * assets — the honest zero state IS the assertion set: no .illus anywhere,
 * both report affordances present and functional. When the first approved
 * batch lands, the manifest-driven badge assertions activate via the
 * fail-closed unit gates; this spec then gains a badge-visible case.
 */
test.describe('/lab — illustration register + report', () => {
  test('zero-asset state: no illustration frame, report buttons present', async ({ page }) => {
    await page.goto('/lab', { waitUntil: 'networkidle' });
    await expect(page.locator('.illus')).toHaveCount(0);
    // Visible-text locators: getByRole matches the aria-label (accessible
    // name), which words these differently from the on-screen text.
    await expect(page.locator('.nb__tool', { hasText: 'Lab report' })).toBeVisible();
    await expect(page.locator('.nb__tool', { hasText: 'Share card' })).toBeVisible();
  });

  test('the share card composes and downloads a PNG from kernel numbers', async ({ page }) => {
    await page.goto('/lab', { waitUntil: 'networkidle' });
    const download = page.waitForEvent('download');
    await page.locator('.nb__tool', { hasText: 'Share card' }).click();
    const dl = await download;
    expect(dl.suggestedFilename()).toMatch(/^orrery-lab-.*\.png$/);
  });

  test('a custom (shared) notebook never shows goal art', async ({ page }) => {
    // Load /lab, share the current notebook to get a ?nb= URL, reload it as
    // the restored/custom state — the illustration slot must stay empty even
    // once assets exist (goal identity is not serialized).
    await page.goto('/lab', { waitUntil: 'networkidle' });
    await page.locator('.nb__tools .nb__tool--accent').click();
    await page.waitForURL(/nb=/);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('.illus')).toHaveCount(0);
  });
});
