import { expect, test } from '@playwright/test';

/**
 * Illustration register + lab report (G · #536). The zero-asset era ended
 * 2026-09-09 (FB1b: 25 operator-approved goal illustrations) — the assertion
 * set is now the POPULATED state: goal notebooks carry exactly one
 * illustration (caption-free since 2026-09-11), and a restored/custom
 * notebook still never shows art.
 */
test.describe('/lab — illustration register + report', () => {
  test('goal art renders without an on-image AI note; report buttons present', async ({ page }) => {
    await page.goto('/lab', { waitUntil: 'networkidle' });
    // The default goal carries its approved illustration. The on-image AI
    // badge + credit caption were REMOVED 2026-09-11 (operator: no other
    // generated-art surface carries an in-UI note; provenance stays in
    // /colophon + the share-card badge line).
    await expect(page.locator('.illus')).toHaveCount(1);
    await expect(page.locator('.illus img')).toBeVisible();
    await expect(page.locator('.illus__badge')).toHaveCount(0);
    // The report affordances are icon-only buttons (V3) — locate by their
    // accessible name (aria-label), not on-screen text.
    await expect(page.getByRole('button', { name: /lab report/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /image card/i })).toBeVisible();
  });

  test('the share card composes and downloads a PNG from kernel numbers', async ({ page }) => {
    await page.goto('/lab', { waitUntil: 'networkidle' });
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: /image card/i }).click();
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
