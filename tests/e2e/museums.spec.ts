import { test, expect } from '@playwright/test';

/**
 * Museums (PRD-027): the "You can see this in…" block on object pages, the
 * museum card on /earth, and the link between them.
 */

test.describe('museums', () => {
  test('a fleet object lists every museum showing it, in country/city order', async ({ page }) => {
    await page.goto('/fleet?id=apollo-csm-block-ii');
    const block = page.getByTestId('museums-for-object');
    await expect(block).toBeVisible({ timeout: 15_000 });
    const rows = block.getByTestId('museum-row');
    expect(await rows.count()).toBeGreaterThanOrEqual(2);
    // GB sorts before US: nothing favours the home country.
    await expect(rows.first()).toHaveAttribute('data-museum-id', 'science-museum-london');
    const site = rows.first().getByTestId('museum-website');
    await expect(site).toHaveAttribute('target', '_blank');
    await expect(site).toHaveAttribute('href', /^https:\/\//);
  });

  test('"On the map" opens that museum\'s card on /earth', async ({ page }) => {
    await page.goto('/fleet?id=sojourner');
    const block = page.getByTestId('museums-for-object');
    await expect(block).toBeVisible({ timeout: 15_000 });
    await block.getByTestId('museum-on-map').first().click();
    await expect(page).toHaveURL(/\/earth\?museum=nasm-washington/);
    const panel = page.getByTestId('museum-panel');
    await expect(panel).toBeVisible({ timeout: 20_000 });
    await expect(panel).toHaveAttribute('data-museum-id', 'nasm-washington');
    expect(await panel.getByTestId('museum-panel-object').count()).toBeGreaterThanOrEqual(1);
  });

  test('a history page shows the museum block', async ({ page }) => {
    await page.goto('/science/history/sputnik-1957');
    await expect(page.getByTestId('museums-for-object')).toBeVisible({ timeout: 15_000 });
  });

  test('an object with no museum shows no block', async ({ page }) => {
    await page.goto('/fleet?id=voyager-1');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('museums-for-object')).toHaveCount(0);
  });

  test('/earth has a MUSEUMS layer chip', async ({ page }) => {
    await page.goto('/earth');
    await expect(page.getByTestId('layer-museums').first()).toBeAttached({ timeout: 15_000 });
  });
});
