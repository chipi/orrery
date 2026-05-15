import { expect, test } from '@playwright/test';

/**
 * ADR-047 — public image-provenance disclosure page at `/credits`.
 *
 * The page renders `static/data/image-provenance.json` grouped by
 * source (NASA, ESA, Wikimedia Commons, etc.). The plan's S5
 * "missing-route e2e" — `/credits` was untested before this slice
 * even though the manifest must always render honestly per ADR-047.
 */

test.describe('/credits — image provenance disclosure', () => {
  test('renders title, intro, table of contents, source blocks; no console errors', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/credits', { waitUntil: 'networkidle' });
    await expect(page.locator('section.credits[data-route-ready="true"]')).toBeVisible();

    // Section landmark + ARIA contract
    const section = page.locator('section.credits');
    await expect(section).toBeVisible();
    await expect(section).toHaveAttribute('aria-labelledby', 'credits-title');

    // Title + intro
    await expect(page.locator('h1#credits-title')).toBeVisible();

    // ToC + at least one source block render after manifest hydration
    await expect(page.locator('nav.toc')).toBeVisible();
    const sourceBlocks = page.locator('article.source-block');
    await expect(sourceBlocks.first()).toBeVisible({ timeout: 10_000 });
    const count = await sourceBlocks.count();
    expect(count).toBeGreaterThan(0);

    expect(errors).toEqual([]);
  });

  test('every source block carries a license summary (ADR-047 honesty surface)', async ({
    page,
  }) => {
    await page.goto('/credits', { waitUntil: 'networkidle' });
    await expect(page.locator('section.credits[data-route-ready="true"]')).toBeVisible();
    const sourceBlocks = page.locator('article.source-block');
    await expect(sourceBlocks.first()).toBeVisible({ timeout: 10_000 });
    const count = await sourceBlocks.count();
    // Every source block must carry the license-summary line per ADR-047 §B.
    const licenseLines = page.locator('article.source-block p.src-license');
    await expect(licenseLines).toHaveCount(count);
  });

  test('linked from the persistent site footer', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const creditsLink = page.locator('.site-footer a[href*="/credits"]').first();
    await expect(creditsLink).toBeVisible();
    await creditsLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/credits(\?|$)/);
  });
});
