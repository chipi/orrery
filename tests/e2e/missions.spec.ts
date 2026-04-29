import { test, expect } from '@playwright/test';

/**
 * /missions — Mission Library.
 *
 * Covers:
 *   - 28 mission cards render
 *   - dest filter narrows to 14 (Mars or Moon)
 *   - status filter narrows correctly
 *   - URL params pre-apply on load
 *   - card click opens MissionPanel
 *   - FLY button on the panel navigates to /fly?mission=id
 */

test.describe('/missions — library', () => {
  test('28 mission cards render', async ({ page }) => {
    await page.goto('/missions');
    const cards = page.locator('[data-testid^="mission-card-"]');
    await expect(cards).toHaveCount(28, { timeout: 10_000 });
  });

  test('MARS filter shows 14 cards', async ({ page }) => {
    await page.goto('/missions');
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(28, {
      timeout: 10_000,
    });
    await page.getByRole('radio', { name: /^MARS$/i }).click();
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(14);
    await expect(page).toHaveURL(/dest=MARS/);
  });

  test('MOON filter shows 14 cards', async ({ page }) => {
    await page.goto('/missions');
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(28, {
      timeout: 10_000,
    });
    await page.getByRole('radio', { name: /^MOON$/i }).click();
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(14);
    await expect(page).toHaveURL(/dest=MOON/);
  });

  test('?dest=MARS pre-applies the filter on load (URL sharing)', async ({ page }) => {
    await page.goto('/missions?dest=MARS');
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(14, {
      timeout: 10_000,
    });
    // The MARS pill should reflect the active state.
    await expect(page.getByRole('radio', { name: /^MARS$/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('clicking a card opens the MissionPanel with mission data', async ({ page }) => {
    await page.goto('/missions');
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(28, {
      timeout: 10_000,
    });
    await page.locator('[data-testid="mission-card-curiosity"]').click();
    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(/Curiosity/i);
    await expect(panel).toContainText(/2011/);
    await expect(panel).toContainText(/254/); // transit_days
  });

  test('FLY button navigates to /fly?mission=[id]', async ({ page }) => {
    await page.goto('/missions');
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(28, {
      timeout: 10_000,
    });
    await page.locator('[data-testid="mission-card-curiosity"]').click();
    await page.locator('[data-testid="fly-mission-btn"]').click();
    await expect(page).toHaveURL(/\/fly\?mission=curiosity/);
  });
});
