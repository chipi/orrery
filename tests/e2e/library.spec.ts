import { expect, test } from '@playwright/test';

/**
 * ADR-051 — public outbound-link bill-of-links at `/library`.
 *
 * Renders `static/data/link-provenance.json` grouped by source. Same
 * shape as `/credits` per ADR-047, applied to outbound LEARN links.
 * S5 plan: confirm the page renders + honours the ADR-051 contract
 * (every link gets source + language + last-verified + rel="noopener
 * noreferrer external" + target="_blank").
 */

test.describe('/library — outbound LEARN-link bill of links', () => {
  test('renders title, ToC, source blocks; no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/library', { waitUntil: 'networkidle' });
    await expect(page.locator('section.library[data-route-ready="true"]')).toBeVisible();

    const section = page.locator('section.library');
    await expect(section).toBeVisible();
    await expect(section).toHaveAttribute('aria-labelledby', 'library-title');

    await expect(page.locator('h1#library-title')).toBeVisible();

    await expect(page.locator('nav.toc')).toBeVisible();
    const sourceBlocks = page.locator('article.source-block');
    await expect(sourceBlocks.first()).toBeVisible({ timeout: 10_000 });
    const count = await sourceBlocks.count();
    expect(count).toBeGreaterThan(0);

    expect(errors).toEqual([]);
  });

  test('every outbound link opens in a new tab with rel="noopener noreferrer external" (ADR-051)', async ({
    page,
  }) => {
    await page.goto('/library', { waitUntil: 'networkidle' });
    await expect(page.locator('section.library[data-route-ready="true"]')).toBeVisible();
    await expect(page.locator('article.source-block').first()).toBeVisible({ timeout: 10_000 });

    // Sample the first N outbound links and confirm the ADR-051 rendering
    // rules. Checking every link would be slow; the first 20 cover the
    // contract surface across the visible source blocks.
    const links = page.locator('article.source-block a[href^="http"]');
    const totalCount = await links.count();
    expect(totalCount).toBeGreaterThan(0);
    const sampleSize = Math.min(20, totalCount);

    for (let i = 0; i < sampleSize; i++) {
      const link = links.nth(i);
      await expect(link).toHaveAttribute('target', '_blank');
      const rel = await link.getAttribute('rel');
      // ADR-051 mandates noopener + noreferrer + external on every outbound.
      expect(rel).toMatch(/\bnoopener\b/);
      expect(rel).toMatch(/\bnoreferrer\b/);
      expect(rel).toMatch(/\bexternal\b/);
    }
  });

  test('the Astrophysics data block lists the catalogues behind the star, deep-sky and black-hole values (#658)', async ({
    request,
  }) => {
    const html = await (await request.get('/library')).text();
    const block = html.match(/data-testid="library-astro-sources"[\s\S]*?<\/aside>/)?.[0] ?? '';
    expect(block).toContain('href="/credits"');
    const links = [...block.matchAll(/<a href="(https:[^"]+)"([^>]*)>/g)];
    expect(links.length).toBe(12); // the catalogues; JPL has its own block below
    for (const [, , attrs] of links) {
      expect(attrs).toContain('target="_blank"');
      expect(attrs).toContain('rel="noopener noreferrer external"');
    }
    expect(block).toContain('Cosmicflows-4');
    expect(block).toContain('NASA Exoplanet Archive');
  });

  test('the Planetary models block lists the three NASA JPL sources, each with its link and what Orrery does with it (LI2)', async ({
    page,
  }) => {
    await page.goto('/library', { waitUntil: 'networkidle' });
    const block = page.getByTestId('library-planetary-sources');
    await expect(block.getByRole('heading', { level: 3 })).toHaveText(
      'Planetary models (NASA JPL)',
    );
    const rows = block.locator('li[data-source-id]');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0).locator('p')).toContainText('within 0.6°');
    for (const [i, id, path] of [
      [0, 'jpl-keplerian-elements', '/planets/approx_pos.html'],
      [1, 'jpl-planetary-parameters', '/planets/phys_par.html'],
      [2, 'jpl-satellite-parameters', '/sats/'],
    ] as const) {
      const row = rows.nth(i);
      await expect(row).toHaveAttribute('data-source-id', id);
      const link = row.locator('a');
      await expect(link).toHaveAttribute('href', `https://ssd.jpl.nasa.gov${path}`);
      await expect(link).toHaveAttribute('target', '_blank');
      expect(await link.getAttribute('rel')).toBe('noopener noreferrer external');
      await expect(row.locator('p')).not.toBeEmpty();
    }
  });

  test('the Moon and Mars surface data block lists the landing and rover-track sources the routes cite (LI3)', async ({
    page,
  }) => {
    await page.goto('/library', { waitUntil: 'networkidle' });
    const block = page.getByTestId('library-surface-sources');
    await expect(block.getByRole('heading', { level: 3 })).toHaveText('Moon and Mars surface data');
    const rows = block.locator('li[data-source-id]');
    await expect(rows).toHaveCount(5);
    const hosts = await rows
      .locator('a')
      .evaluateAll((as) => as.map((a) => new URL((a as HTMLAnchorElement).href).hostname));
    expect(hosts).toEqual([
      'www.lroc.asu.edu',
      'doi.org',
      'mars.nasa.gov',
      'an.rsl.wustl.edu',
      'www.uahirise.org',
    ]);
    await expect(rows.nth(0).locator('p')).toContainText('Narrow Angle Camera');
    await expect(rows.nth(4).locator('p')).toContainText('Zhurong');
  });

  test('linked from the site footer', async ({ page, isMobile }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // Desktop: the floating bottom-right footer strip. Touch: the strip is
    // hidden and its links live in the nav hamburger drawer (0.7.2).
    let libraryLink;
    if (isMobile) {
      await page.locator('button.menu-toggle').click();
      libraryLink = page.locator('#mobile-nav-drawer .drawer-footer a[href*="/library"]').first();
    } else {
      libraryLink = page.locator('.site-footer a[href*="/library"]').first();
    }
    await expect(libraryLink).toBeVisible();
    await libraryLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/library(\?|$)/);
  });
});
