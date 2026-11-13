import { test, expect, type Page } from '@playwright/test';

/**
 * L45-T4 (UXD-025): the round photos on the prerendered entity pages. They are in the server HTML
 * (not added by hydration), lazy, decorative, and none is a broken image once scrolled to.
 */

async function thumbTags(page: Page, path: string): Promise<string[]> {
  const res = await page.request.get(path);
  expect(res.ok(), path).toBe(true);
  const html = await res.text();
  return html.match(/<img[^>]*class="entity-thumb[^"]*"[^>]*>/g) ?? [];
}

function expectLazyDecorative(tags: string[]): void {
  for (const t of tags) {
    expect(t).toContain('alt=""');
    expect(t).toContain('loading="lazy"');
    expect(t).toContain('width="28"');
    expect(t).toContain('height="28"');
    expect(t).toMatch(/src="[^"]*credit-thumbs\/images\/[^"]+\.1x1\.webp"/);
  }
}

async function allLoad(page: Page): Promise<void> {
  const imgs = page.locator('img.entity-thumb');
  const n = await imgs.count();
  for (let i = 0; i < n; i++) await imgs.nth(i).scrollIntoViewIfNeeded();
  await expect
    .poll(
      () =>
        imgs.evaluateAll(
          (els) => els.filter((el) => !(el as HTMLImageElement).naturalWidth).length,
        ),
      { timeout: 15_000 },
    )
    .toBe(0);
}

test.describe('entity pages carry round photos in the server HTML (L45-T4)', () => {
  test('/fleet/atlas-v: 15 mission rows, the alongside and kin lists', async ({ page }) => {
    const tags = await thumbTags(page, '/fleet/atlas-v');
    // 15 missions + the same-category rows; the page weight grows by one small tag each
    expect(tags.length).toBeGreaterThanOrEqual(21);
    expect(tags.length).toBeLessThanOrEqual(45);
    expectLazyDecorative(tags);
    expect(tags.some((t) => t.includes('/missions/new-horizons/'))).toBe(true);
  });

  test('/fleet/saturn-v: missions, engines and kin', async ({ page }) => {
    const tags = await thumbTags(page, '/fleet/saturn-v');
    expect(tags.length).toBeGreaterThanOrEqual(8);
    expectLazyDecorative(tags);
  });

  test('a launcher page lists its engines with a photo each, an engine page the launchers it flies on', async ({
    page,
  }) => {
    const tags = await thumbTags(page, '/fleet/f-1');
    expect(tags.some((t) => t.includes('/fleet-galleries/saturn-v/'))).toBe(true);
    expectLazyDecorative(tags);
  });

  test('/mars/curiosity: the hardware list leads each row with a photo (a Moon site has one only on Chandrayaan-1 and LRO)', async ({
    page,
  }) => {
    const tags = await thumbTags(page, '/mars/curiosity');
    expect(tags.length).toBeGreaterThanOrEqual(2);
    expectLazyDecorative(tags);
  });

  test('/programs/apollo: unpatched mission rows and the hardware list have a photo; a patched row keeps its patch', async ({
    page,
  }) => {
    const tags = await thumbTags(page, '/programs/apollo');
    expect(tags.length).toBeGreaterThanOrEqual(8);
    expectLazyDecorative(tags);
    await page.goto('/programs/apollo');
    const patched = page.locator('.timeline li:has(img.t-patch)');
    expect(await patched.count()).toBeGreaterThan(0);
    await expect(patched.locator('img.entity-thumb')).toHaveCount(0);
  });

  test('every photo on /fleet/atlas-v loads once scrolled to', async ({ page }) => {
    await page.goto('/fleet/atlas-v');
    await allLoad(page);
  });

  test('a long mission list does not scroll the page sideways at 390 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/fleet/atlas-v');
    const w = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(w[0]).toBeLessThanOrEqual(w[1]);
  });
});
