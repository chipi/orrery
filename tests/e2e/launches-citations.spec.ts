/**
 * CC-BY citation ship-gate (PRD-020 M14 / success criterion #4).
 *
 * Verifies the Jonathan McDowell / GCAT citation surfaces on:
 *   - /missions/launches  (page footer)
 *   - /credits            (via existing source-logos + text-sources flow)
 *   - /library            (TODO v0.2 — link-provenance integration)
 *
 * Per AGENTS.md, runs on both desktop-chromium and mobile-chromium.
 */
import { test, expect } from '@playwright/test';

test.describe('Launches calendar citation visibility (CC-BY ship-gate)', () => {
  test('/missions/launches surfaces the McDowell GCAT citation in the page footer', async ({
    page,
  }) => {
    await page.goto('/missions/launches');
    await page.waitForSelector('div.launches[data-route-ready="true"]', { timeout: 30_000 });
    const citations = page.locator('footer.footer-note');
    await expect(citations).toBeVisible();
    await expect(citations).toContainText(/Jonathan McDowell|GCAT|General Catalog/i);
    // Link to GCAT homepage exists with required rel + hreflang attrs.
    const gcatLink = citations.locator('a[href*="planet4589.org/space/gcat"]');
    await expect(gcatLink).toHaveAttribute('rel', /noopener.*noreferrer.*external/);
    await expect(gcatLink).toHaveAttribute('hreflang', 'en');
  });

  test('/credits page surfaces GCAT McDowell entry under launch data sources', async ({ page }) => {
    await page.goto('/credits');
    await page.waitForLoadState('networkidle');
    // The credits page auto-includes any source-logos entry that has
    // matching text-sources rows — gcat-mcdowell qualifies.
    await expect(page.locator('body')).toContainText(/GCAT|Jonathan/i);
  });

  test('/library page lists GCAT + LL2 in the Launches data sources aside', async ({ page }) => {
    await page.goto('/library');
    await page.waitForSelector('section.library[data-route-ready="true"]', { timeout: 30_000 });
    const aside = page.locator('aside.data-sources');
    await expect(aside).toBeVisible();
    await expect(aside).toContainText(/Jonathan McDowell|GCAT|General Catalog/i);
    await expect(aside).toContainText(/Launch Library 2|LL2|Space Devs/i);
    // Both outbound links carry the required rel attrs (ADR-051).
    const gcatLink = aside.locator('a[href*="planet4589.org/space/gcat"]');
    await expect(gcatLink).toHaveAttribute('rel', /noopener.*noreferrer.*external/);
    const ll2Link = aside.locator('a[href*="thespacedevs.com"]');
    await expect(ll2Link).toHaveAttribute('rel', /noopener.*noreferrer.*external/);
  });
});
