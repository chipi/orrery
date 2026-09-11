import { expect, test, type BrowserContext } from '@playwright/test';

/**
 * ADR-092 (analytics opt-out + /privacy) and the ADR-057 amendment (locale
 * cookie rename + migration).
 *
 * Both are cookie-level behaviour that unit tests can only model. These run it
 * in a real browser: the toggle has to actually write the cookie and survive
 * the reload, and a visitor arriving with a pre-rename `PARAGLIDE_LOCALE` has
 * to keep their language instead of silently losing it.
 */

const OPTOUT = 'orrery_analytics_optout';
const LEGACY_LOCALE = 'PARAGLIDE_LOCALE';
const LOCALE = 'orrery_locale';

async function cookie(ctx: BrowserContext, name: string): Promise<string | undefined> {
  const all = await ctx.cookies();
  return all.find((c) => c.name === name)?.value;
}

test.describe('/privacy — disclosure page + analytics opt-out (ADR-092)', () => {
  test('renders every disclosure section, on desktop and at phone width', async ({ page }) => {
    await page.goto('/privacy', { waitUntil: 'networkidle' });

    await expect(page.locator('h1')).toHaveText(/privacy/i);
    // The sections a GDPR Art. 13 page has to actually carry.
    const headings = page.locator('article.card h2');
    await expect(headings).toHaveCount(8);
    await expect(page.locator('#privacy-controls-title')).toBeVisible();
    await expect(page.locator('#privacy-logs-title')).toBeVisible();
    await expect(page.locator('#privacy-collect-title')).toBeVisible();

    // Mobile-first: no horizontal overflow at the narrow end of the range.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, 'page must not scroll horizontally').toBeLessThanOrEqual(1);
  });

  test('the toggle writes the opt-out cookie, survives the reload, and reverses', async ({
    page,
    context,
  }) => {
    await page.goto('/privacy', { waitUntil: 'networkidle' });

    const toggle = page.locator('.toggle input[type="checkbox"]');
    // Hydration resolves the real state; before that it is disabled.
    await expect(toggle).toBeEnabled();
    await expect(toggle).toBeChecked(); // default: analytics on, no cookie
    expect(await cookie(context, OPTOUT)).toBeUndefined();

    // Opting out reloads the page (Umami's autotrack cannot be unbound).
    await Promise.all([page.waitForLoadState('networkidle'), toggle.uncheck()]);

    expect(await cookie(context, OPTOUT)).toBe('1');
    await expect(page.locator('.toggle input[type="checkbox"]')).not.toBeChecked();

    // And back: opting in DELETES the cookie rather than writing '0'.
    await Promise.all([
      page.waitForLoadState('networkidle'),
      page.locator('.toggle input[type="checkbox"]').check(),
    ]);
    expect(await cookie(context, OPTOUT)).toBeUndefined();
  });

  test('an opted-out visitor never gets the Umami script injected', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: OPTOUT, value: '1', url: baseURL! }]);
    await page.goto('/', { waitUntil: 'networkidle' });

    // Suppression happens BEFORE injection — that is the whole point, since
    // Umami's autotrack binds history listeners at load that cannot be unbound.
    await expect(page.locator('script[data-umami-installed]')).toHaveCount(0);
  });

  test('/privacy is reachable from the footer without typing the URL', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // Desktop footer ABOUT menu, or the mobile drawer's About group — either
    // way a link to /privacy must exist in the document.
    const links = page.locator('a[href$="/privacy"]');
    expect(await links.count()).toBeGreaterThan(0);
  });
});

test.describe('locale cookie rename — PARAGLIDE_LOCALE → orrery_locale (ADR-057)', () => {
  test('a pre-rename language pick is carried across, not lost', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: LEGACY_LOCALE, value: 'de', url: baseURL! }]);

    await page.goto('/', { waitUntil: 'networkidle' });
    // Migration runs on mount; give hydration a beat.
    await expect.poll(async () => await cookie(context, LOCALE), { timeout: 5000 }).toBe('de');

    // …and the stale cookie is gone, so DevTools matches the disclosure.
    expect(await cookie(context, LEGACY_LOCALE)).toBeUndefined();
  });

  test('an unsupported legacy value is discarded, never fed to locale resolution', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: LEGACY_LOCALE, value: 'klingon', url: baseURL! }]);

    await page.goto('/', { waitUntil: 'networkidle' });
    await expect
      .poll(async () => await cookie(context, LEGACY_LOCALE), { timeout: 5000 })
      .toBeUndefined();

    // Paraglide auto-persists its resolved locale on first getLocale(), so
    // orrery_locale exists regardless — what matters is that the junk value
    // was never written into it.
    expect(await cookie(context, LOCALE)).not.toBe('klingon');
  });
});
