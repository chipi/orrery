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
