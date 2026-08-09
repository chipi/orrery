import { expect, test } from '@playwright/test';

/**
 * PRD-013 / Issue #74 — landing page at root /.
 *
 * Replaces the previous /-→/explore 307 redirect.
 */

test.describe('landing page (/)', () => {
  test('renders hero, all 18 cards in 5 sections, and footer block; no console errors', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // Hero
    await expect(page.locator('h1.wordmark')).toContainText('ORRERY');
    await expect(page.locator('p.tagline')).toContainText('solar system');

    // The landing is the whole nav tree, sectioned (RFC-038 / IA.md §home-cards):
    // 18 leaf cards under 5 section headers that mirror the nav groups.
    const cards = page.locator('[data-testid="landing-cards"] a.card');
    await expect(cards).toHaveCount(18);

    const headings = page.locator('[data-testid="landing-cards"] .grid-section-heading');
    await expect(headings).toHaveCount(5);
    await expect(headings.nth(0)).toHaveText(/EXPLORE/i);
    await expect(headings.nth(1)).toHaveText(/WORLDS/i);
    await expect(headings.nth(3)).toHaveText(/CATALOG/i);
    await expect(headings.nth(4)).toHaveText(/LEARN/i);

    // A sample of destinations across every section is reachable as a card.
    for (const href of [
      'context=solar-system',
      'context=milky-way',
      '/venus',
      '/plan',
      '/programs',
      '/live',
      '/essays',
      '/science',
    ]) {
      await expect(page.locator(`[data-testid="landing-cards"] a[href*="${href}"]`)).toHaveCount(1);
    }

    // About-this-project section has prose only (link list moved to
    // persistent site-footer in +layout.svelte).
    await expect(page.locator('.about-body')).toBeVisible();
    await expect(page.locator('.about-links')).toHaveCount(0);

    // Persistent site-footer has 7 entries on desktop:
    // Gallery, Credits, Colophon, Library, License (external),
    // README (external), and the v{version} · {date} pill (which
    // links to CHANGELOG). (Mobile drops the 3 'extra' external
    // links: License, README, version.) Colophon link added 2026-06-22
    // alongside the credits work.
    const persistentLinks = page.locator('.site-footer .footer-link');
    await expect(persistentLinks).toHaveCount(7);

    // External README link opens in new tab.
    await expect(
      page.locator('.site-footer a[href*="github.com"][href*="readme"]'),
    ).toHaveAttribute('target', '_blank');

    expect(errors).toEqual([]);
  });

  test('primary CTA navigates to /explore', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('[data-testid="landing-cta-primary"]').click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/explore$/);
  });

  test('cards navigate to their canonical routes', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // Science is the last card, under the LEARN section.
    await page.locator('[data-testid="landing-cards"] a[href*="/science"]').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/science(\?|$)/);
  });

  test('German browser locale → landing renders in German under /de/', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'de-DE' });
    const page = await context.newPage();
    // Paraglide's URL strategy resolves locale per request — bare `/`
    // with a German `Accept-Language` header serves de content but the
    // URL stays at `/`. To assert German content we navigate explicitly
    // to /de/ (the canonical share-link shape).
    await page.goto('/de/', { waitUntil: 'networkidle' });

    // <html lang> is the authoritative locale signal (set by
    // hooks.server.ts via paraglideMiddleware's transformPageChunk).
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');

    // Tagline is German
    await expect(page.locator('p.tagline')).toContainText('Sonnensystem');

    await context.close();
  });

  test('mobile (375 px) renders single-column cards without horizontal scroll', async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'networkidle' });

    // No horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);

    // Cards stack: each card occupies roughly the full width (within 16px-padding tolerance)
    const firstCardWidth = await page
      .locator('[data-testid="landing-cards"] a.card')
      .first()
      .evaluate((el) => el.getBoundingClientRect().width);
    expect(firstCardWidth).toBeGreaterThan(300); // single-column ~ full width

    await context.close();
  });
});
