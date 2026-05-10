import { expect, test } from '@playwright/test';

/**
 * Issue #73 Gap 1: URL canonicalisation on first visit.
 *
 * When a user lands without a `?lang=` parameter and their browser
 * locale resolves to something other than en-US, the layout effect
 * should rewrite the URL via replaceState so the canonical link is
 * shareable.
 */

test.describe('locale canonicalisation', () => {
  test('German browser locale → URL gains ?lang=de on first visit', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'de-DE' });
    const page = await context.newPage();
    await page.goto('/explore', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/explore\?lang=de$/);
    await expect(page.locator('button.chip').first()).toContainText('DE');
    await context.close();
  });

  test('en-US browser locale → URL stays bare (no ?lang=)', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-US' });
    const page = await context.newPage();
    await page.goto('/explore', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/explore$/);
    await context.close();
  });

  test('explicit ?lang=en-US is preserved (sharing semantics override canonicalisation)', async ({
    browser,
  }) => {
    // A German user sharing ?lang=en-US with a friend expects the
    // friend to see English regardless of the friend's own browser
    // locale. Stripping it would silently revert to the recipient's
    // navigator.language — wrong for shared links.
    const context = await browser.newContext({ locale: 'de-DE' });
    const page = await context.newPage();
    await page.goto('/explore?lang=en-US', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/explore\?lang=en-US$/);
    await context.close();
  });

  test('explicit ?lang= overrides browser locale and is preserved', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'de-DE' });
    const page = await context.newPage();
    await page.goto('/explore?lang=fr', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/explore\?lang=fr$/);
    await context.close();
  });

  test('invalid ?lang=xx is corrected to the resolved browser locale', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'es-ES' });
    const page = await context.newPage();
    await page.goto('/explore?lang=xx', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/explore\?lang=es$/);
    await context.close();
  });
});
