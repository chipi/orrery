import { test, expect, type Page } from '@playwright/test';

/**
 * /missions — Mission Catalog (renamed from "Mission Library" under
 * ADR-051; the route id stays /missions and the nav still reads
 * "MISSIONS" — only the page title + heading changed).
 *
 * Covers:
 *   - 36 mission cards render
 *   - dest filter narrows to 14 (Mars or Moon)
 *   - status filter narrows correctly
 *   - URL params pre-apply on load
 *   - card click opens MissionPanel
 *   - FLY button on the panel navigates to /fly?mission=id
 *
 * J.1 collapsed the FILTERS strip by default — pages with no filter
 * URL params open with the strip closed. Tests that need to interact
 * with the filter radios or timeline must call expandFilters() first.
 * Tests that hit /missions with `?dest=` / `?from=` get the strip
 * auto-expanded by the page itself.
 */

async function expandFilters(page: Page) {
  const toggle = page.locator('button.filters-toggle');
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click();
  }
}

test.describe('/missions — catalog', () => {
  test('36 mission cards render', async ({ page }) => {
    await page.goto('/missions');
    const cards = page.locator('[data-testid^="mission-card-"]');
    await expect(cards).toHaveCount(36, { timeout: 10_000 });
  });

  test('MARS filter shows 16 cards', async ({ page }) => {
    await page.goto('/missions');
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(36, {
      timeout: 10_000,
    });
    await expandFilters(page);
    await page.getByRole('radio', { name: /^MARS$/i }).click();
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(16);
    await expect(page).toHaveURL(/dest=MARS/);
  });

  test('MOON filter shows 16 cards', async ({ page }) => {
    await page.goto('/missions');
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(36, {
      timeout: 10_000,
    });
    await expandFilters(page);
    await page.getByRole('radio', { name: /^MOON$/i }).click();
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(16);
    await expect(page).toHaveURL(/dest=MOON/);
  });

  test('?dest=MARS pre-applies the filter on load (URL sharing)', async ({ page }) => {
    await page.goto('/missions?dest=MARS');
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(16, {
      timeout: 10_000,
    });
    // The MARS pill should reflect the active state.
    await expect(page.getByRole('radio', { name: /^MARS$/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('JUPITER filter shows Galileo only (ADR-028 outer catalogue)', async ({ page }) => {
    await page.goto('/missions');
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(36, {
      timeout: 10_000,
    });
    await expandFilters(page);
    await page.getByRole('radio', { name: /^JUPITER$/i }).click();
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="mission-card-galileo"]')).toBeVisible();
    await expect(page).toHaveURL(/dest=JUPITER/);
  });

  test('?dest=JUPITER pre-applies the filter on load (URL sharing)', async ({ page }) => {
    await page.goto('/missions?dest=JUPITER');
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(1, {
      timeout: 10_000,
    });
    await expect(page.getByRole('radio', { name: /^JUPITER$/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('clicking a card opens the MissionPanel with mission data', async ({ page }) => {
    await page.goto('/missions');
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(36, {
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
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(36, {
      timeout: 10_000,
    });
    await page.locator('[data-testid="mission-card-curiosity"]').click();
    await page.locator('[data-testid="fly-mission-btn"]').click();
    await expect(page).toHaveURL(/\/fly\?mission=curiosity/);
  });

  test('?id=[id] deep-link opens a mission panel pre-selected', async ({ page }) => {
    await page.goto('/missions?id=curiosity');
    await page.waitForLoadState('networkidle');
    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await expect(panel).toContainText(/Curiosity/i);
  });

  test('Curiosity card shows ON THE SURFACE cross-link to /mars', async ({ page }) => {
    await page.goto('/missions?id=curiosity');
    await page.waitForLoadState('networkidle');
    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    const link = panel.getByTestId('surface-link');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', /\/mars\?site=curiosity/);
  });

  test('GALLERY tab renders thumbnails for a NASA mission (v0.1.8)', async ({ page }) => {
    await page.goto('/missions');
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(36, {
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
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(36, {
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
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(36, {
      timeout: 10_000,
    });
    await page.locator('[data-testid="mission-card-mars3"]').click();
    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible();
    await page.getByRole('tab', { name: /^FLIGHT$/ }).click();
    // mars3 is flight_data_quality: "sparse" → shows the caveat.
    await expect(panel).toContainText(/SPARSE PUBLIC RECORDS/i);
  });

  test('FLIGHT tab fires the unknown-data caveat for unresearched missions', async ({ page }) => {
    // After issue #31, only Starship Demo carries flight_data_quality:
    // "unknown" — MMX + Artemis 3 were promoted to "sparse" with
    // planned-mission caveats. This test guards the unknown-data path.
    await page.goto('/missions');
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(36, {
      timeout: 10_000,
    });
    await page.locator('[data-testid="mission-card-starship-demo"]').click();
    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible();
    await page.getByRole('tab', { name: /^FLIGHT$/ }).click();
    await expect(panel).toContainText(/FLIGHT DATA NOT YET RESEARCHED/i);
  });
});

test.describe('/missions — timeline navigator (v0.1.7 / ADR-027)', () => {
  test('timeline strip renders with mission dots', async ({ page }) => {
    await page.goto('/missions');
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(36, {
      timeout: 10_000,
    });
    // Timeline lives inside the FILTERS strip (collapsed by default
    // since J.1) — expand it before asserting the slider handles.
    const toggle = page.locator('button.filters-toggle');
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
      await toggle.click();
    }
    // Two range-handles render with role="slider".
    const fromHandle = page.getByRole('slider', { name: /FROM/i });
    const toHandle = page.getByRole('slider', { name: /TO/i });
    await expect(fromHandle).toBeVisible();
    await expect(toHandle).toBeVisible();
    await expect(fromHandle).toHaveAttribute('aria-valuenow', '1957');
    await expect(toHandle).toHaveAttribute('aria-valuenow', '2035');
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
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(36, {
      timeout: 10_000,
    });
    const fromHandle = page.getByRole('slider', { name: /FROM/i });
    const toHandle = page.getByRole('slider', { name: /TO/i });
    await expect(fromHandle).toHaveAttribute('aria-valuenow', '1957');
    await expect(toHandle).toHaveAttribute('aria-valuenow', '2035');
  });
});

test.describe('/missions — flight-data quality badge (v0.1.13)', () => {
  test('Curiosity card shows MEASURED badge', async ({ page }) => {
    await page.goto('/missions');
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(36, {
      timeout: 10_000,
    });
    const card = page.locator('[data-testid="mission-card-curiosity"]');
    await expect(card.locator('.card-quality.quality-measured')).toBeVisible();
  });

  test('Mars 3 card shows SPARSE badge', async ({ page }) => {
    await page.goto('/missions');
    const card = page.locator('[data-testid="mission-card-mars3"]');
    await expect(card.locator('.card-quality.quality-sparse')).toBeVisible({ timeout: 5_000 });
  });

  test('Starship Demo card shows UNKNOWN badge', async ({ page }) => {
    await page.goto('/missions');
    const card = page.locator('[data-testid="mission-card-starship-demo"]');
    await expect(card.locator('.card-quality.quality-unknown')).toBeVisible({ timeout: 5_000 });
  });
});
