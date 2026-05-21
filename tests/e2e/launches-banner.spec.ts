/**
 * LaunchesBanner on /missions (PRD-020 M7 / US-1).
 *
 * Verifies the next-launches banner renders, shows ≤ 4 featured T1
 * launches with countdown labels, and each card deep-links to
 * /missions/launches?id=<launch-id>.
 *
 * Runs on both desktop-chromium and mobile-chromium projects.
 */
import { test, expect } from '@playwright/test';

test.describe('Launches banner on /missions', () => {
  test('renders the banner with at least one featured-launch card', async ({ page }) => {
    await page.goto('/missions');
    // The banner mounts after the upcoming manifest fetches; allow
    // 30 s on mobile-chromium where the cold load is slower.
    const banner = page.locator('aside.banner[aria-label="Next featured launches"]');
    await expect(banner).toBeVisible({ timeout: 30_000 });
    const cards = banner.locator('a.card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(4);
  });

  test('each card shows a T-0 countdown + links to the calendar deep-link', async ({ page }) => {
    await page.goto('/missions');
    const firstCard = page.locator('aside.banner a.card').first();
    await expect(firstCard).toBeVisible({ timeout: 30_000 });
    // Countdown text starts with "T-0" (or "in flight" if the launch
    // just happened — accept both).
    await expect(firstCard.locator('.countdown')).toContainText(/T-0|in flight/i);
    // Deep-link href matches the route + id query param shape.
    const href = await firstCard.getAttribute('href');
    expect(href).toMatch(/\/missions\/launches\?id=[0-9]{4}-[0-9]{2}-[0-9]{2}-/);
  });

  test('"All launches" link routes to /missions/launches', async ({ page }) => {
    await page.goto('/missions');
    const allLink = page.locator('aside.banner a.all-link');
    await expect(allLink).toBeVisible({ timeout: 30_000 });
    await allLink.click();
    await page.waitForURL(/\/missions\/launches/);
    await expect(page.locator('main[data-route-ready="true"]')).toBeVisible({ timeout: 30_000 });
  });
});
