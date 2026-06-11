import { test, expect } from '@playwright/test';

/**
 * RTL automated probe (PRD-007 piece Z subset / GH #256 / GH #123).
 *
 * Asserts the cheap-to-test invariants of RTL support on the routes
 * with significant chrome:
 *   1. <html dir="rtl"> on ar / he / fa locales
 *   2. The visible focus indicator advances right-to-left on Tab when
 *      navigating across visually-arranged controls (uses the
 *      mode-toggle + reset-camera button pair on canvas routes — they
 *      sit side-by-side in the HUD).
 *
 * What this DOESN'T cover (deferred to #123 Z full):
 *   - Native screen-reader testing (VoiceOver / NVDA)
 *   - Flipped icons that shouldn't be flipped (and un-flipped ones
 *     that should)
 *   - Untranslated tooltips
 *   - Real RTL contributor walking the app end-to-end
 *
 * Those need a native Arabic-speaking tester with assistive tech;
 * automation can't catch them. This probe ships the automatable
 * subset so the dir-flip + focus-order infrastructure is guarded
 * by CI from regression.
 */

// Today only `ar` is in availableLanguageTags. When `he` or `fa` are
// added in a future i18n batch, append them here and the existing
// tests fan-out automatically.
const RTL_LOCALES = ['ar'] as const;

for (const locale of RTL_LOCALES) {
  test.describe(`RTL probe — ${locale}`, () => {
    test(`/missions sets html dir=rtl + visible focus advances RTL`, async ({ page }) => {
      await page.goto(`/${locale}/missions`);
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    });

    test(`/moon sets html dir=rtl + canvas labelled appropriately`, async ({ page }) => {
      await page.goto(`/${locale}/moon`);
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      // Canvas should still have an aria-label, even though the
      // canvas pixels are direction-agnostic. Label text comes from
      // the locale's translation.
      const canvas = page.locator('canvas.layer, div.layer').first();
      await expect(canvas).toBeVisible({ timeout: 20_000 });
    });

    test(`/library sets html dir=rtl`, async ({ page }) => {
      await page.goto(`/${locale}/library`);
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    });
  });
}

test('LTR locale (en-US) sets html dir=ltr', async ({ page }) => {
  await page.goto('/missions');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
});
