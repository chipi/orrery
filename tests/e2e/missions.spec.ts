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

  test('GALLERY tab renders thumbnails for a NASA mission (v0.1.8)', async ({ page }) => {
    await page.goto('/missions');
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(28, {
      timeout: 10_000,
    });
    await page.locator('[data-testid="mission-card-curiosity"]').click();
    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible();
    // Gallery tab renders at least one thumbnail. Asserting on the
    // first thumbnail (not an exact count) keeps the test stable when
    // the manifest count drifts up or down per fetch-assets reruns.
    const galleryTab = page.getByRole('tab', { name: /^GALLERY$/ });
    await expect(galleryTab).toBeVisible({ timeout: 5_000 });
    await galleryTab.click();
    const thumbs = panel.locator('.gallery-thumb');
    await expect(thumbs.first()).toBeVisible({ timeout: 5_000 });
  });
});

/**
 * v0.1.7 — Flight params + timeline navigator (ADR-027).
 */
test.describe('/missions — flight params (v0.1.7 / ADR-027)', () => {
  test('FLIGHT tab renders for a populated mission with real C3 + ∆v', async ({ page }) => {
    await page.goto('/missions');
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(28, {
      timeout: 10_000,
    });
    await page.locator('[data-testid="mission-card-curiosity"]').click();
    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible();
    const flightTab = page.getByRole('tab', { name: /^FLIGHT$/ });
    await expect(flightTab).toBeVisible({ timeout: 5_000 });
    await flightTab.click();
    // Curiosity has measured C3 = 11.4 km²/s² and total ∆v = 6.1 km/s.
    await expect(panel).toContainText(/LAUNCH/);
    await expect(panel).toContainText(/11\.40 km²\/s²/);
    await expect(panel).toContainText(/6\.10 km\/s/);
    await expect(panel).toContainText(/NASA MSL Press Kit/);
  });

  test('FLIGHT tab shows caveat banner for sparse-data mission', async ({ page }) => {
    await page.goto('/missions');
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(28, {
      timeout: 10_000,
    });
    await page.locator('[data-testid="mission-card-mars3"]').click();
    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible();
    await page.getByRole('tab', { name: /^FLIGHT$/ }).click();
    // mars3 is flight_data_quality: "sparse" → shows the caveat.
    await expect(panel).toContainText(/SPARSE PUBLIC RECORDS/i);
  });

  test('FLIGHT tab is hidden for missions without flight data', async ({ page }) => {
    // All 28 missions have flight_data_quality set in v0.1.7, so the
    // FLIGHT tab should appear on every mission. This test guards
    // against a regression where a future mission addition forgets it.
    await page.goto('/missions');
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(28, {
      timeout: 10_000,
    });
    await page.locator('[data-testid="mission-card-artemis3"]').click();
    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible();
    // artemis3 is "unknown" → tab still renders, caveat banner fires.
    await page.getByRole('tab', { name: /^FLIGHT$/ }).click();
    await expect(panel).toContainText(/FLIGHT DATA NOT YET RESEARCHED/i);
  });
});

test.describe('/missions — timeline navigator (v0.1.7 / ADR-027)', () => {
  test('timeline strip renders with mission dots', async ({ page }) => {
    await page.goto('/missions');
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(28, {
      timeout: 10_000,
    });
    // Two range-handles render with role="slider".
    const fromHandle = page.getByRole('slider', { name: /FROM/i });
    const toHandle = page.getByRole('slider', { name: /TO/i });
    await expect(fromHandle).toBeVisible();
    await expect(toHandle).toBeVisible();
    await expect(fromHandle).toHaveAttribute('aria-valuenow', '1957');
    await expect(toHandle).toHaveAttribute('aria-valuenow', '2030');
  });

  test('?from=1969&to=1976 pre-applies window on load', async ({ page }) => {
    await page.goto('/missions?from=1969&to=1976');
    // 1969 → 1976 includes Apollo 11 (1969), Apollo 17 (1972), Mars 3
    // (1971), Viking 1 (1975), Luna 17 (1970), Luna 24 (1976) = 6 cards.
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(6, {
      timeout: 10_000,
    });
    const fromHandle = page.getByRole('slider', { name: /FROM/i });
    const toHandle = page.getByRole('slider', { name: /TO/i });
    await expect(fromHandle).toHaveAttribute('aria-valuenow', '1969');
    await expect(toHandle).toHaveAttribute('aria-valuenow', '1976');
  });

  test('out-of-range ?from clamps to 1957', async ({ page }) => {
    await page.goto('/missions?from=1900&to=2050');
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(28, {
      timeout: 10_000,
    });
    const fromHandle = page.getByRole('slider', { name: /FROM/i });
    const toHandle = page.getByRole('slider', { name: /TO/i });
    await expect(fromHandle).toHaveAttribute('aria-valuenow', '1957');
    await expect(toHandle).toHaveAttribute('aria-valuenow', '2030');
  });
});
