import { test, expect, type Page } from '@playwright/test';

/**
 * Roving arrow-key navigation for the /explore iconic-mission (PATHS)
 * legend. Mirrors the station-route list nav: arrows move focus only
 * (the committed `.is-selected` row stays put), Enter/click commits via
 * selectMission(), Esc clears. The MissionPanel opts out of the focus-
 * grab (grabFocus={false}) so legend nav works from the first click.
 *
 * Keyboard navigation is a desktop interaction → scoped to
 * desktop-chromium.
 */

const ROW = '[data-testid^="paths-legend-row-"]';

// #410 seats the 5 interstellar craft (voyager/pioneer/new-horizons) at the head
// of the legend; a craft row opens the MessagePanel — its own model (grabFocus
// stays on the row, but there is no `.is-selected` mission commit). These tests
// exercise the MISSION selection contract (is-selected / MissionPanel / Esc-clear),
// so they target a stable *mission* row — venera-13 is the first non-interstellar
// legend entry — instead of rows.first(), which is now a craft. (The craft
// focus-preservation is guarded separately by the "no focus steal" test below.)
const missionRow = (page: Page) => page.getByTestId('paths-legend-row-venera-13');

const focusedRowTestId = (page: Page) =>
  page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? null);

test.describe('/explore — iconic-legend keyboard navigation', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      test.info().project.name !== 'desktop-chromium',
      'keyboard navigation is a desktop interaction',
    );
    // ?paths=1 deep-link auto-activates the PATHS layer, which renders
    // the iconic-trajectory legend (see explore-paths-layer.spec).
    await page.goto('/explore?paths=1', { waitUntil: 'networkidle' });
    await page.waitForSelector(ROW, { timeout: 8_000 });
  });

  test('ArrowDown moves focus to the next legend row', async ({ page }) => {
    const rows = page.locator(ROW);
    await rows.first().focus();
    await page.keyboard.press('ArrowDown');

    expect(await focusedRowTestId(page)).toBe(await rows.nth(1).getAttribute('data-testid'));
  });

  test('arrowing moves focus only — the selected row stays put', async ({ page }) => {
    const row = missionRow(page);
    const rowId = await row.getAttribute('data-testid');

    await row.click(); // commit: marks .is-selected
    await expect(row).toHaveClass(/is-selected/);

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');

    const selected = page.locator(`${ROW}.is-selected`);
    await expect(selected).toHaveCount(1);
    expect(await selected.getAttribute('data-testid')).toBe(rowId);
    // Focus moved off the selected row.
    expect(await focusedRowTestId(page)).not.toBe(rowId);
  });

  test('legend nav works immediately after the first click (no focus steal)', async ({ page }) => {
    const rows = page.locator(ROW);
    await rows.first().click(); // opens MissionPanel (debounced) — must not steal focus
    await page.keyboard.press('ArrowDown');

    expect(await focusedRowTestId(page)).toBe(await rows.nth(1).getAttribute('data-testid'));
  });

  test('Enter on a focused row opens the mission panel', async ({ page }) => {
    const row = missionRow(page);
    await row.focus();
    await page.keyboard.press('Enter');

    await expect(row).toHaveClass(/is-selected/);
    await expect(page.locator('aside.panel')).toBeVisible({ timeout: 5_000 });
  });

  test('Escape clears the selection', async ({ page }) => {
    const row = missionRow(page);
    await row.click();
    await expect(row).toHaveClass(/is-selected/);

    await page.keyboard.press('Escape');
    await expect(row).not.toHaveClass(/is-selected/);
  });
});
