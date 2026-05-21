/**
 * German locale smoke test for /missions/launches (PRD-020 M15).
 *
 * Verifies the Paraglide-compiled de bundle renders the route + that
 * launches_* messages either render in German (post wave23) or fall
 * back to en-US (default behaviour when a locale lacks a key). Either
 * outcome is correct — broken keys / Paraglide errors would not be.
 */
import { test, expect } from '@playwright/test';

test.describe('/missions/launches — de locale', () => {
  test('route renders cleanly under ?lang=de', async ({ page }) => {
    await page.goto('/missions/launches?lang=de');
    await page.waitForSelector('main[data-route-ready="true"]', { timeout: 30_000 });
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    // Filters toggle still mounts + has a visible label.
    const toggle = page.locator('.filters-toggle');
    await expect(toggle).toBeVisible();
    const text = await toggle.textContent();
    // Either German "FILTER" (post-wave23) or English "FILTERS" (en-US fallback).
    expect(text?.toUpperCase()).toMatch(/FILTER/);
  });

  test('citation footer + McDowell link still present in de', async ({ page }) => {
    await page.goto('/missions/launches?lang=de');
    await page.waitForSelector('main[data-route-ready="true"]', { timeout: 30_000 });
    const gcatLink = page.locator('footer.footer-note a[href*="planet4589.org/space/gcat"]');
    await expect(gcatLink).toBeVisible();
    // The citation surface is the CC-BY ship-gate — must work in
    // every locale or we're shipping non-compliant.
    await expect(gcatLink).toHaveAttribute('rel', /noopener.*noreferrer.*external/);
  });
});
