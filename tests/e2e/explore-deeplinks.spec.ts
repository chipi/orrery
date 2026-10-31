import { test, expect, type Page } from '@playwright/test';

/**
 * /explore ?goto= and ?system=&planet= — the two deep-links with no other spec.
 * Each resolves on a cold load, and the matching URL mirror writes the param
 * back when the user opens (and clears it when they close) the panel.
 * The __exploreSelectStar / __exploreEnterSystem hooks are DEV-only, so the
 * in-session cases drive the star index like a user would.
 */

const params = (page: Page) => Object.fromEntries(new URL(page.url()).searchParams);
const panel = (page: Page, name: string) => page.locator(`aside.panel[aria-label="${name}"]`);

test.describe('/explore — ?goto and ?system deep-links', () => {
  test('cold ?goto opens the star panel; Escape closes it and clears the param', async ({
    page,
  }) => {
    await page.goto('/explore?goto=sirius');
    await expect(panel(page, 'Sirius')).toBeVisible({ timeout: 20_000 });
    expect(params(page).goto).toBe('sirius');
    await page.keyboard.press('Escape');
    await expect(panel(page, 'Sirius')).toHaveCount(0);
    await expect.poll(() => params(page).goto ?? null).toBeNull();
  });

  test('cold ?system&planet enters the system with that planet open', async ({ page }) => {
    await page.goto('/explore?system=proxima-centauri&planet=proxima-cen-b');
    await expect(panel(page, 'Proxima Cen b')).toBeVisible({ timeout: 20_000 });
    expect(params(page)).toMatchObject({ system: 'proxima-centauri', planet: 'proxima-cen-b' });
    await expect(page.getByTestId('explore-scale-back')).toHaveAttribute(
      'aria-label',
      'Stellar Neighborhood',
    );
  });

  test('selecting a star from the index mirrors it into ?goto', async ({ page }) => {
    await page.goto('/explore?context=neighborhood');
    await page.locator('.star-index-handle').click({ timeout: 20_000 });
    await page.locator('.si-row[data-index-id="canopus"]').click();
    await expect(panel(page, 'Canopus')).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => params(page).goto).toBe('canopus');
  });

  test('a cleared cold ?context is not written back by a later URL mirror', async ({ page }) => {
    await page.goto('/explore?context=neighborhood');
    await expect.poll(() => params(page).context ?? null, { timeout: 20_000 }).toBeNull();
    await page.locator('.star-index-handle').click();
    await page.locator('.si-row[data-index-id="canopus"]').click();
    await expect.poll(() => params(page).goto).toBe('canopus');
    expect(params(page).context ?? null).toBeNull();
  });

  test('leaving a system entered from its star panel clears ?system', async ({ page }) => {
    await page.goto('/explore?context=neighborhood');
    await page.locator('.star-index-handle').click({ timeout: 20_000 });
    await page.locator('.si-row[data-index-id="proxima-centauri"]').click();
    await page.locator('.enter-system').first().click({ timeout: 15_000 });
    await expect(page.getByTestId('explore-scale-back')).toHaveAttribute(
      'aria-label',
      'Stellar Neighborhood',
      { timeout: 15_000 },
    );
    await page.getByTestId('explore-scale-back').click();
    await expect(page.getByTestId('explore-scale-back')).toHaveAttribute(
      'aria-label',
      'Solar System',
    );
    await expect.poll(() => params(page).system ?? null).toBeNull();
  });

  test('entering a system from its star panel mirrors it into ?system', async ({ page }) => {
    await page.goto('/explore?context=neighborhood');
    await page.locator('.star-index-handle').click({ timeout: 20_000 });
    await page.locator('.si-row[data-index-id="proxima-centauri"]').click();
    await page.locator('.enter-system').first().click({ timeout: 15_000 });
    await expect.poll(() => params(page).system, { timeout: 15_000 }).toBe('proxima-centauri');
    await expect(page.getByTestId('explore-scale-back')).toHaveAttribute(
      'aria-label',
      'Stellar Neighborhood',
    );
  });
});
