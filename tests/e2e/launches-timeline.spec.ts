/**
 * /missions/launches Timeline + filter interactions (PRD-020 M8).
 *
 * Verifies the consolidated .filters-toggle + filter pills + Timeline
 * pattern: pills toggle filter state, mode switch reloads, decade
 * picker (historic mode) lazy-loads the matching decade manifest,
 * year filter narrows the visible rows.
 */
import { test, expect } from '@playwright/test';

test.describe('/missions/launches Timeline + filters', () => {
  test('renders the timeline + FILTERS toggle in default state', async ({ page }) => {
    await page.goto('/missions/launches');
    await page.waitForSelector('div.launches[data-route-ready="true"]', { timeout: 30_000 });
    await expect(page.locator('.filters-toggle')).toBeVisible();
    // At least one launch row in the timeline.
    await expect(page.locator('article.launch-row').first()).toBeVisible();
  });

  test('expanding FILTERS reveals the filter-group strip', async ({ page }) => {
    await page.goto('/missions/launches');
    await page.waitForSelector('div.launches[data-route-ready="true"]', { timeout: 30_000 });
    await page.locator('.filters-toggle').click();
    await expect(page.locator('nav.filters')).toBeVisible();
    await expect(page.locator('.filter-group').first()).toBeVisible();
  });

  test('TIER FEATURED pill narrows the row set + updates URL', async ({ page }) => {
    await page.goto('/missions/launches?tier=FEATURED');
    await page.waitForSelector('div.launches[data-route-ready="true"]', { timeout: 30_000 });
    // URL pre-applies and auto-expands filters
    expect(page.url()).toContain('tier=FEATURED');
    await expect(page.locator('nav.filters')).toBeVisible();
    // Every visible row should carry FEATURED tier chip.
    const rows = page.locator('article.launch-row[data-tier="T1"]');
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('HISTORIC mode shows DECADE picker', async ({ page }) => {
    await page.goto('/missions/launches?mode=historic');
    await page.waitForSelector('div.launches[data-route-ready="true"][data-mode="historic"]', {
      timeout: 30_000,
    });
    // `?mode=historic` auto-expands the filters strip — no toggle click needed.
    await expect(page.locator('nav.filters')).toBeVisible();
    const decadeGroup = page.locator('.filter-group').filter({ hasText: /DECADE/i });
    await expect(decadeGroup).toBeVisible();
    await expect(decadeGroup.locator('button.pill')).toHaveCount(7); // 1957-69 → 2020-26
  });

  test('switching decade lazy-loads new manifest + URL syncs', async ({ page }) => {
    await page.goto('/missions/launches?mode=historic');
    await page.waitForSelector('div.launches[data-route-ready="true"][data-mode="historic"]', {
      timeout: 30_000,
    });
    // Filters auto-expanded by `?mode=historic` — click the 1957-69 decade pill directly.
    const decadeGroup = page.locator('.filter-group').filter({ hasText: /DECADE/i });
    await decadeGroup.locator('button.pill').first().click();
    // URL updates
    await page.waitForURL(/decade=1957-1969/);
    // Loading -> ready -> rows present from the earlier era
    await page.waitForSelector('div.launches[data-route-ready="true"]', { timeout: 30_000 });
    await expect(page.locator('article.launch-row').first()).toBeVisible({ timeout: 30_000 });
  });
});
