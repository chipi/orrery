/**
 * LauncherFlightsWidget on /fleet detail panel (PRD-020 M10 / US-5).
 *
 * Verifies that the launches widget renders inline within a
 * launcher-category fleet entry's OVERVIEW tab, showing the NEXT
 * FLIGHT + RECENT FLIGHTS sections wired against the launches
 * manifests.
 */
import { test, expect } from '@playwright/test';

test.describe('LauncherFlightsWidget on /fleet', () => {
  test('falcon-9 detail panel surfaces the launches widget', async ({ page }) => {
    await page.goto('/fleet?id=falcon-9');
    // Detail panel renders inside FleetEntryPanel; the widget mounts
    // inside the OVERVIEW tab body which is the default tab on open.
    const widget = page.locator('section.launcher-flights');
    await expect(widget).toBeVisible({ timeout: 30_000 });
    // At least one of: NEXT FLIGHT or RECENT FLIGHTS section visible
    await expect(widget).toContainText(/Next flight|Recent flights/i);
  });

  test('non-launcher entries do NOT mount the widget', async ({ page }) => {
    // Pick a non-launcher entry — e.g. Curiosity rover.
    await page.goto('/fleet?id=curiosity');
    // Panel renders but no launcher-flights widget.
    await expect(page.locator('section.launcher-flights')).toHaveCount(0);
  });

  test('widget "See all" link routes to the calendar pre-filtered', async ({ page }) => {
    await page.goto('/fleet?id=falcon-9');
    const widget = page.locator('section.launcher-flights');
    await expect(widget).toBeVisible({ timeout: 30_000 });
    const seeAll = widget.locator('a.see-all');
    // Only present when there ARE recent flights — guard.
    if (await seeAll.isVisible().catch(() => false)) {
      const href = await seeAll.getAttribute('href');
      expect(href).toContain('/missions/launches');
      expect(href).toContain('vehicle=falcon-9');
    }
  });
});
