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
    const rows = page.locator(ROW);
    const firstId = await rows.first().getAttribute('data-testid');

    await rows.first().click(); // commit: marks .is-selected
    await expect(rows.first()).toHaveClass(/is-selected/);

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');

    const selected = page.locator(`${ROW}.is-selected`);
    await expect(selected).toHaveCount(1);
    expect(await selected.getAttribute('data-testid')).toBe(firstId);
    // Focus moved off the selected row.
    expect(await focusedRowTestId(page)).not.toBe(firstId);
  });

  test('legend nav works immediately after the first click (no focus steal)', async ({ page }) => {
    const rows = page.locator(ROW);
    await rows.first().click(); // opens MissionPanel (debounced) — must not steal focus
    await page.keyboard.press('ArrowDown');

    expect(await focusedRowTestId(page)).toBe(await rows.nth(1).getAttribute('data-testid'));
  });

  test('Enter on a focused row opens the mission panel', async ({ page }) => {
    const rows = page.locator(ROW);
    await rows.nth(1).focus();
    await page.keyboard.press('Enter');

    await expect(rows.nth(1)).toHaveClass(/is-selected/);
    await expect(page.locator('aside.panel')).toBeVisible({ timeout: 5_000 });
  });

  test('Escape clears the selection', async ({ page }) => {
    const rows = page.locator(ROW);
    await rows.first().click();
    await expect(rows.first()).toHaveClass(/is-selected/);

    await page.keyboard.press('Escape');
    await expect(rows.first()).not.toHaveClass(/is-selected/);
  });
});
