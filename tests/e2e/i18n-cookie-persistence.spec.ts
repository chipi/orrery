import { expect, test } from '@playwright/test';

/**
 * Issue #73 Gap 2 / ADR-057: cookie persistence for explicit-user-set
 * locale overrides.
 *
 * Verifies that:
 *  - LocalePicker.pick() writes the orrery_locale cookie.
 *  - Auto-detection paths (URL canonicalisation) do NOT write the cookie.
 *  - On a fresh URL, the cookie's locale is honoured over navigator.language.
 *  - Sharing semantics: explicit picks of en-US persist on non-English browsers.
 */

test.describe('locale cookie persistence (ADR-057)', () => {
  test('LocalePicker.pick() writes orrery_locale cookie', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'de-DE' });
    const page = await context.newPage();
    await page.goto('/explore', { waitUntil: 'networkidle' });

    // Pick Italian via the picker chip.
    await page.locator('button.chip').first().click();
    await page.locator('button.option', { hasText: 'Italiano' }).click();
    await page.waitForLoadState('networkidle');

    // Cookie should now exist with value 'it'.
    const cookies = await context.cookies();
    const orreryLocale = cookies.find((c) => c.name === 'orrery_locale');
    expect(orreryLocale?.value).toBe('it');
    expect(orreryLocale?.sameSite).toBe('Lax');

    await context.close();
  });

  test('auto-detect (canonicalisation) does NOT write the cookie', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'de-DE' });
    const page = await context.newPage();
    // Bare URL → canonicalises to ?lang=de via auto-detect, but no cookie write.
    await page.goto('/explore', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/explore\?lang=de$/);

    const cookies = await context.cookies();
    const orreryLocale = cookies.find((c) => c.name === 'orrery_locale');
    expect(orreryLocale).toBeUndefined();

    await context.close();
  });

  test('cookie honoured on fresh URL over navigator.language', async ({ browser }) => {
    // Pre-seed the cookie before navigation, to simulate "user came back later".
    const context = await browser.newContext({ locale: 'de-DE' });
    await context.addCookies([
      {
        name: 'orrery_locale',
        value: 'it',
        url: 'http://127.0.0.1:4173/',
        sameSite: 'Lax',
      },
    ]);
    const page = await context.newPage();
    await page.goto('/explore', { waitUntil: 'networkidle' });

    // Cookie says 'it', browser says 'de', no URL ?lang= → expect Italian.
    await expect(page).toHaveURL(/\/explore\?lang=it$/);
    await expect(page.locator('button.chip').first()).toContainText('IT');

    await context.close();
  });

  test('explicit en-US pick on German browser persists across fresh visits', async ({
    browser,
  }) => {
    // Pre-seed with en-US — explicit user choice scenario.
    const context = await browser.newContext({ locale: 'de-DE' });
    await context.addCookies([
      {
        name: 'orrery_locale',
        value: 'en-US',
        url: 'http://127.0.0.1:4173/',
        sameSite: 'Lax',
      },
    ]);
    const page = await context.newPage();
    await page.goto('/explore', { waitUntil: 'networkidle' });

    // en-US is the default, so the canonical URL is bare.
    await expect(page).toHaveURL(/\/explore$/);
    await expect(page.locator('button.chip').first()).toContainText('EN');

    await context.close();
  });

  test('URL ?lang= still wins over cookie', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'de-DE' });
    await context.addCookies([
      {
        name: 'orrery_locale',
        value: 'it',
        url: 'http://127.0.0.1:4173/',
        sameSite: 'Lax',
      },
    ]);
    const page = await context.newPage();
    await page.goto('/explore?lang=fr', { waitUntil: 'networkidle' });

    // URL says fr; cookie says it; browser says de → fr wins.
    await expect(page).toHaveURL(/\/explore\?lang=fr$/);
    await expect(page.locator('button.chip').first()).toContainText('FR');

    await context.close();
  });
});
