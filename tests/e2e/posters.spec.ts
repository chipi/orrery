import { expect, test } from '@playwright/test';

/**
 * `/posters` — Orrery art-print gallery. 11 hand-authored SVG posters
 * in three style families (JPL travel-poster, era-matched, indie-pop).
 *
 * Route was missing from AGENTS.md / TA.md until v0.6.0 — S5 ships the
 * smoke spec and flags the docs gap as a follow-up.
 */

test.describe('/posters — Orrery gallery', () => {
  test('renders gallery title, 11 posters, footer; no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/posters', { waitUntil: 'networkidle' });
    await expect(page.locator('article.gallery[data-route-ready="true"]')).toBeVisible();

    await expect(page.locator('article.gallery h1')).toContainText('ORRERY GALLERY');

    // 11 art-print posters per the inline doc comment in +page.svelte
    const posters = page.locator('article.gallery .grid > figure.poster');
    await expect(posters).toHaveCount(11);

    // Each poster contains an inline <svg> (no broken-image risk;
    // posters are SVG-only by design — right-click Save renders the
    // scalable file).
    const svgs = page.locator('article.gallery .grid > figure.poster svg');
    await expect(svgs).toHaveCount(11);

    await expect(page.locator('article.gallery footer.gallery-footer')).toBeVisible();

    expect(errors).toEqual([]);
  });
});
