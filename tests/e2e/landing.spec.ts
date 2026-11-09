import { expect, test } from '@playwright/test';
import { footerLinkCount, landingGridCounts } from './_helpers/source-counts';

/**
 * PRD-013 / Issue #74 — landing page at root /.
 *
 * Replaces the previous /-→/explore 307 redirect.
 */

test.describe('landing page (/)', () => {
  test('renders hero, every card in its sections, and footer block; no console errors', async ({
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
    // 22 leaf cards (Explore's 8 scale shells + Worlds 4 + Plan&Fly 2 + Catalog 6
    // + Learn 2) under 5 section headers that mirror the nav groups.
    const cards = page.locator('[data-testid="landing-cards"] a.card');
    await expect(cards).toHaveCount(landingGridCounts().cards);

    const headings = page.locator('[data-testid="landing-cards"] .grid-section-heading');
    await expect(headings).toHaveCount(landingGridCounts().headings);
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

    // Persistent site-footer: the count is read from +layout.svelte. It holds the four hub links,
    // Gallery, Credits, Colophon, Library, Glossary, Privacy (in the ABOUT menu),
    // License (external), README (external), and the v{version} · {date}
    // pill (which links to CHANGELOG). (Mobile drops the 3 'extra'
    // external links: License, README, version.) Colophon link added
    // 2026-06-22 alongside the credits work; Privacy added 2026-09-10
    // with the analytics opt-out (ADR-092) — it is the disclosure surface
    // the opt-out toggle lives on, so it has to be reachable from every
    // screen. Glossary (/science/glossary, PRD-038) added 2026-10-31.
    const persistentLinks = page.locator('.site-footer .footer-link');
    await expect(persistentLinks).toHaveCount(footerLinkCount());

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

  test('footer ABOUT menu stays open while the pointer moves up to its items', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'the footer is hidden on touch devices');
    await page.goto('/', { waitUntil: 'networkidle' });
    const label = page.locator('.footer-about-label');
    const menu = page.locator('.footer-about-menu');
    const privacy = menu.locator('a[href$="/privacy"]');
    const lb = (await label.boundingBox())!;
    const x = lb.x + lb.width / 2;
    await page.mouse.move(x, lb.y + lb.height / 2);
    await expect(menu).toHaveCSS('pointer-events', 'auto');
    // 1 px steps from the label to Privacy: the gap between them used to hit <main>,
    // which dropped :hover and closed the menu before it could be reached.
    const pb = (await privacy.boundingBox())!;
    const target = pb.y + pb.height / 2;
    for (let y = lb.y; y >= target; y -= 1) {
      await page.mouse.move(x, y);
      expect(await menu.evaluate((el) => getComputedStyle(el).pointerEvents), `y=${y}`).toBe(
        'auto',
      );
    }
    await page.mouse.click(x, target);
    await expect(page).toHaveURL(/\/privacy$/);
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
