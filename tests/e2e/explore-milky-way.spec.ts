import { test, expect } from '@playwright/test';

/**
 * /explore Milky Way shell — WS-2 leveling (#451). The shell went from 2 clickable
 * objects to a globular-cluster halo, the Magellanic Clouds, clickable arms, a
 * distance reference, and the first per-shell science lens.
 *
 * Selection uses the build-safe `?galaxy=<pinId>` cold-load deep-link (crosses
 * into the MW + selects the pin) — the __exploreSelectMilkyWay window hook is
 * DEV-only, so it isn't present in the preview build the e2e runs against.
 */

test.describe('/explore — Milky Way leveling (#451)', () => {
  test('a globular cluster opens a panel with its kind + distance', async ({ page }) => {
    await page.goto('/explore?galaxy=omega-centauri');
    await expect(page.getByText('Globular cluster', { exact: false }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('16,000 ly', { exact: false }).first()).toBeVisible();
  });

  test('an arm opens a panel', async ({ page }) => {
    await page.goto('/explore?galaxy=perseus');
    await expect(page.getByText('Spiral arm', { exact: false }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('a Magellanic Cloud opens a panel with its distance', async ({ page }) => {
    await page.goto('/explore?galaxy=lmc');
    await expect(page.getByText('Satellite galaxy', { exact: false }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('163,000 ly', { exact: false }).first()).toBeVisible();
  });

  test('the MW shell shows a distance reference + the science lens chips', async ({ page }) => {
    await page.goto('/explore?context=milky-way');
    await expect(page.getByText('across', { exact: false }).first()).toBeVisible({
      timeout: 12_000,
    });
    // The lens ships COLLAPSED to its strip on first paint (all viewports) — turn
    // it on (same attribute the Nav toggle writes) and expand before the chips show.
    await page.evaluate(() => document.documentElement.setAttribute('data-science-lens', 'on'));
    const head = page.locator('[data-testid="science-lens-panel"] .panel-head');
    await expect(head).toBeVisible({ timeout: 15_000 });
    if ((await head.getAttribute('aria-expanded')) !== 'true') await head.click();
    const panel = page.locator('[data-testid="science-lens-panel"]');
    await expect(panel).toContainText(/Rotation curve/i);
    await expect(panel).toContainText(/Dark-matter halo/i);
  });
});
