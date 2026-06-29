import { expect, test } from '@playwright/test';

/**
 * `/posters` — Orrery art-print gallery. 27 raster posters (ORRERY
 * originals generated via Higgsfield) in three style families:
 * vintage screen-print, modern comic, photoreal & future. Each card
 * links to its full-resolution JPG for download.
 */

const POSTER_COUNT = 27;

test.describe('/posters — Orrery gallery', () => {
  test(`renders gallery title, ${POSTER_COUNT} posters, footer; no console errors`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/posters', { waitUntil: 'networkidle' });
    await expect(page.locator('article.gallery[data-route-ready="true"]')).toBeVisible();

    await expect(page.locator('article.gallery h1')).toContainText('ORRERY GALLERY');

    const posters = page.locator('article.gallery .grid > figure.poster');
    await expect(posters).toHaveCount(POSTER_COUNT);

    // Each poster is a raster <img> wrapped in a download link.
    const imgs = page.locator('article.gallery .grid > figure.poster a[download] img');
    await expect(imgs).toHaveCount(POSTER_COUNT);

    await expect(page.locator('article.gallery footer.gallery-footer')).toBeVisible();

    expect(errors).toEqual([]);
  });
});
