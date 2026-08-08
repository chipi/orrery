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
    await page.getByRole('button', { name: /science lens/i }).click();
    await expect(page.getByRole('button', { name: /rotation curve/i })).toBeVisible({
      timeout: 6_000,
    });
    await expect(page.getByRole('button', { name: /dark-matter halo/i })).toBeVisible();
  });
});
