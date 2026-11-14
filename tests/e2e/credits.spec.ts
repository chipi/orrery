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

  // #658: every catalogue the data comes from is listed with the acknowledgement it asks for.
  test('the data section lists the catalogues with their acknowledgement and papers', async ({
    page,
  }) => {
    await page.goto('/credits', { waitUntil: 'networkidle' });
    const block = page.locator('#src-data-catalogues');
    await expect(block).toBeVisible({ timeout: 10_000 });
    // The list shows its first 10 entries; the catalogues named below sit further down.
    await block.locator('[data-testid="show-all"]').click();
    for (const name of [
      'SIMBAD and VizieR',
      'NASA/IPAC Extragalactic Database',
      'Gaia',
      'Hunt & Reffert 2023',
      'Baumgardt & Vasiliev 2021',
      'Cosmicflows-4',
      'McConnachie 2012',
    ]) {
      await expect(block.getByRole('link', { name: new RegExp(name) }).first()).toBeVisible();
    }
    await expect(
      block.getByText('operated at CDS, Strasbourg, France', { exact: false }),
    ).toBeVisible();
    await expect(
      block.getByText('NASA/IPAC Extragalactic Database (NED), which is operated by', {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      block.getByText('processed by the Gaia Data Processing and Analysis Consortium', {
        exact: false,
      }),
    ).toBeVisible();
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
    // Each list shows its first 10 rows: open the biggest block to see the crop families.
    await page.locator('[data-testid="show-all"][data-list="nasa:photos"]').click();
    await expect(page.locator('#src-nasa .photo-list > li')).not.toHaveCount(10);
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

  test('every list shows at most 10 rows until Show all (F1, UXD-038)', async ({ page }) => {
    await page.goto('/credits', { waitUntil: 'networkidle' });
    await expect(page.locator('article.source-block').first()).toBeVisible({ timeout: 10_000 });
    const longest = await page
      .locator('article.source-block ul')
      .evaluateAll((uls) => Math.max(...uls.map((u) => u.children.length)));
    expect(longest).toBeLessThanOrEqual(10);
    // The biggest sources carry a chip that names the full count.
    await expect(page.locator('[data-testid="show-all"][data-list="nasa:photos"]')).toBeVisible();
  });

  test('Show all opens the whole list under an open header', async ({ page }) => {
    await page.goto('/credits', { waitUntil: 'networkidle' });
    const list = page.locator('#src-nasa .photo-list > li');
    await expect(list).toHaveCount(10, { timeout: 10_000 });
    const chip = page.locator('[data-testid="show-all"][data-list="nasa:photos"]');
    const total = Number((await chip.textContent())!.replace(/\D/g, ''));
    expect(total).toBeGreaterThan(1000);
    await chip.scrollIntoViewIfNeeded();
    await chip.click();
    await expect(list).toHaveCount(total);
    await expect(chip).toHaveCount(0);
    // The rows grow below the chip, so the first new row opens where the chip was: still on
    // screen (the browser's scroll anchoring absorbs the off-screen blocks above settling to
    // their real height, so scrollY itself is not the thing to compare).
    await expect(list.nth(10)).toBeInViewport();
  });

  test('a contents link lands on its open source header with the first rows below it', async ({
    page,
  }) => {
    await page.goto('/credits', { waitUntil: 'networkidle' });
    await expect(page.locator('nav.toc')).toBeVisible({ timeout: 10_000 });
    // Phones list the first 10 sources until "Show all"; from 768 px the contents stay whole.
    const more = page.locator('nav.toc [data-testid="show-all"]');
    if (await more.isVisible()) await more.click();
    const link = page.locator('nav.toc li a').last();
    const id = (await link.getAttribute('href'))!.slice(1);
    await link.click();
    const block = page.locator(`#${id}`);
    await expect(block.locator('.src-head')).toBeInViewport();
    const rows = await block.locator('ul').evaluateAll((uls) => uls.map((u) => u.children.length));
    for (const n of rows) expect(n).toBeLessThanOrEqual(10);
  });

  test('linked from the site footer', async ({ page, isMobile }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // Desktop: the floating bottom-right footer strip. Touch: the strip is
    // hidden and its links live in the nav hamburger drawer (0.7.2).
    let creditsLink;
    if (isMobile) {
      await page.locator('button.menu-toggle').click();
      creditsLink = page.locator('#mobile-nav-drawer .drawer-footer a[href*="/credits"]').first();
    } else {
      creditsLink = page.locator('.site-footer a[href*="/credits"]').first();
    }
    await expect(creditsLink).toBeVisible();
    await creditsLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/credits(\?|$)/);
  });
});
