import { expect, test, type Page } from '@playwright/test';
import { waitForHydration } from './_helpers/hydration';

/**
 * Select = focus (UXD-019) for every deep-sky object with text: a photo-less one (M3, no culture
 * door) opens its panel from a `?deepsky=` deep link and from its INDEX row, with the reviewed
 * overlay text in the reader's locale, and the URL follows the selection. Before 0.9.9 only an
 * object with a photo or a culture door opened anything; the other 96 were a highlighted dot.
 */

const toggle = (p: Page) => p.getByTestId('scale-index-toggle');
const NAME = /M3 · NGC 5272/;

test.describe('/explore — a photo-less deep-sky object opens its panel', () => {
  test.beforeEach(() => {
    test.skip(
      test.info().project.name === 'mobile-landscape-chromium',
      'heavy neighbourhood cold-load starves the 2-CPU landscape shard',
    );
  });

  test('?deepsky=M3 opens the panel with the overlay text and writes the selection back to the URL', async ({
    page,
  }) => {
    test.slow();
    await page.goto('/explore?deepsky=M3');
    await waitForHydration(page);
    const panel = page.getByRole('complementary', { name: NAME });
    await expect(panel).toBeVisible({ timeout: 20_000 });
    await expect(
      panel.getByText('One of the largest and brightest globular clusters known', {
        exact: false,
      }),
    ).toBeVisible();
    // The distance in the panel's own formatter (the page's too), the constellation spelled out.
    await expect(panel.getByText('~33,000 ly', { exact: false })).toBeVisible();
    await expect(panel.getByText('Canes Venatici', { exact: false })).toBeVisible();
    await expect(page).toHaveURL(/deepsky=M3/);
  });

  test('the same link in German opens the German overlay, not en-US', async ({ page }) => {
    test.slow();
    await page.goto('/de/explore?deepsky=M3');
    await waitForHydration(page);
    await expect(
      page.getByText('Einer der größten und hellsten bekannten Kugelsternhaufen', {
        exact: false,
      }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText('One of the largest and brightest globular clusters', { exact: false }),
    ).toHaveCount(0);
  });

  test('the INDEX row of M3 opens the same panel', async ({ page }) => {
    test.slow();
    await page.goto('/explore?context=neighborhood');
    await waitForHydration(page);
    await toggle(page).click();
    const row = page
      .locator('aside.scale-index[data-scale="neighborhood"]')
      .locator('button.si-row[data-index-id="m3"]');
    await expect(row).toBeVisible({ timeout: 45_000 });
    await row.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('complementary', { name: NAME })).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByText('One of the largest and brightest globular clusters known', {
        exact: false,
      }),
    ).toBeVisible();
  });
});
