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

  test('bundles surface aspect-ratio crops as chips on at least one row', async ({ page }) => {
    // The bundler (src/lib/credits-grouping.ts) collapses
    // `<slot>.16x9.jpg / .1x1.jpg / .4x3.jpg / .jpg` variants of one
    // source image into a single row with chips for the ratios present.
    // On the production manifest at least one bundle MUST have >1
    // variant chip (the asset pipeline emits crop families for every
    // panel image); this assertion fails loudly if a regression flips
    // the bundler off or breaks the chip render path.
    await page.goto('/credits', { waitUntil: 'networkidle' });
    await expect(page.locator('section.credits[data-route-ready="true"]')).toBeVisible();
    const chips = page.locator('.photo-list .variant-chip');
    await expect(chips.first()).toBeVisible({ timeout: 10_000 });
    expect(await chips.count()).toBeGreaterThan(100);
  });

  test('cross-route reuse renders as one row with multiple stem paths', async ({ page }) => {
    // Per the reliable-id collapse: when the same upstream image_url
    // (or nasa_id / pageid / revid) is emitted under multiple distinct
    // path stems (hero ↔ panel, or cross-route like missions ∪
    // moon-sites), the row shows >1 <code class="path"> entries under
    // its .ph-row.stems. On the production manifest there are 159 such
    // multi-stem bundles; at least one must render correctly.
    await page.goto('/credits', { waitUntil: 'networkidle' });
    await expect(page.locator('section.credits[data-route-ready="true"]')).toBeVisible();
    await expect(page.locator('article.source-block').first()).toBeVisible({ timeout: 10_000 });
    // Match a .ph-row.stems whose 2nd <code class="path"> child is
    // present — i.e. a multi-stem bundle. `:nth-of-type(2)` selects
    // the second <code> sibling regardless of intervening <span> sep.
    const multiStemRow = page
      .locator('.photo .ph-row.stems')
      .filter({ has: page.locator('code.path:nth-of-type(2)') })
      .first();
    await expect(multiStemRow).toBeVisible({ timeout: 10_000 });
    const codeCount = await multiStemRow.locator('code.path').count();
    expect(codeCount).toBeGreaterThanOrEqual(2);
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
