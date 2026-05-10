import { expect, test } from '@playwright/test';

/**
 * PRD-013 / Issue #74 — landing page at root /.
 *
 * Replaces the previous /-→/explore 307 redirect.
 */

test.describe('landing page (/)', () => {
  test('renders hero, all 11 cards, and footer block; no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // Hero
    await expect(page.locator('h1.wordmark')).toContainText('ORRERY');
    await expect(page.locator('p.tagline')).toContainText('solar system');

    // Cards: exactly 11
    const cards = page.locator('[data-testid="landing-cards"] > li');
    await expect(cards).toHaveCount(11);

    // Card slugs in canonical order
    const expectedSlugs = [
      '/explore',
      '/plan',
      '/fly',
      '/missions',
      '/earth',
      '/moon',
      '/mars',
      '/iss',
      '/tiangong',
      '/science',
      '/fleet',
    ];
    for (let i = 0; i < expectedSlugs.length; i++) {
      await expect(cards.nth(i).locator('.card-route')).toHaveText(expectedSlugs[i]);
    }

    // Footer block has the 6 link labels
    const footerLinks = page.locator('.about-links a');
    await expect(footerLinks).toHaveCount(6);

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
    await page.locator('[data-testid="landing-cards"] > li:nth-child(10) a').click(); // /science
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/science(\?|$)/);
  });

  test('German browser locale → URL gains ?lang=de + landing renders in German', async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: 'de-DE' });
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'networkidle' });

    // Canonicalisation (per #73 Gap 1)
    await expect(page).toHaveURL(/\/\?lang=de$/);

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
      .locator('[data-testid="landing-cards"] li')
      .first()
      .evaluate((el) => el.getBoundingClientRect().width);
    expect(firstCardWidth).toBeGreaterThan(300); // single-column ~ full width

    await context.close();
  });
});
