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
    const hero = panel.getByTestId('place-hero').locator('img');
    await expect(hero).toHaveAttribute('src', /\/images\/museums\/nasm-washington\/01\.webp$/);
    await expect(hero).toHaveAttribute('alt', /.+/);
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

/**
 * Observatories on Earth (PRD-028): the card on /earth, the "Where this is
 * done" block on science articles, and the link between them.
 */
test.describe('observatories', () => {
  test('?observatory= opens the card with highlights and science links', async ({ page }) => {
    await page.goto('/earth?observatory=vla');
    const panel = page.getByTestId('observatory-panel');
    await expect(panel).toBeVisible({ timeout: 20_000 });
    await expect(panel).toHaveAttribute('data-observatory-id', 'vla');
    expect(await panel.getByTestId('observatory-article').count()).toBeGreaterThanOrEqual(1);
    await expect(panel.getByTestId('observatory-website')).toHaveAttribute('target', '_blank');
    await expect(panel.getByTestId('place-hero').locator('img')).toHaveAttribute(
      'src',
      /\/images\/observatories\/vla\/01\.webp$/,
    );
  });

  test('a place with no photo shows no hero', async ({ page }) => {
    await page.goto('/earth?observatory=lmt');
    const panel = page.getByTestId('observatory-panel');
    await expect(panel).toBeVisible({ timeout: 20_000 });
    await page.waitForLoadState('networkidle');
    await expect(panel.getByTestId('place-hero')).toHaveCount(0);
  });

  test('an article lists its observatories and links to their cards', async ({ page }) => {
    await page.goto('/science/exoplanets/detecting-extraterrestrial-life');
    const block = page.getByTestId('observatories-for-article');
    await expect(block).toBeVisible({ timeout: 15_000 });
    expect(await block.getByTestId('observatory-row').count()).toBeGreaterThanOrEqual(3);
    await block
      .locator('[data-observatory-id="big-ear"]')
      .getByTestId('observatory-on-map')
      .click();
    await expect(page).toHaveURL(/\/earth\?observatory=big-ear/);
    await expect(page.getByTestId('observatory-panel')).toBeVisible({ timeout: 20_000 });
  });

  test('/earth has a TELESCOPES layer chip', async ({ page }) => {
    await page.goto('/earth');
    await expect(page.getByTestId('layer-telescopes').first()).toBeAttached({ timeout: 15_000 });
  });
});
