import { expect, test } from '@playwright/test';
import { waitForHydration } from './_helpers/hydration';

/**
 * UXD-048: /missions and /fleet are one page pattern. Same parts in the same order from the same
 * components, the same toolbar controls, the same card size; only the data and the type-specific
 * filters differ. Runs on desktop-chromium and mobile-chromium.
 */

for (const route of ['/missions', '/fleet']) {
  test.describe(route, () => {
    test('the parts come in one order: search, strip, agency row, toolbar, grid', async ({
      page,
    }) => {
      await page.goto(route);
      await waitForHydration(page);
      await expect(page.locator('.entity-card-grid .card').first()).toBeVisible({
        timeout: 20_000,
      });
      const tops = await page.evaluate(() => {
        const y = (s: string) => document.querySelector(s)!.getBoundingClientRect().top;
        return [
          y('.search-row'),
          y('.filters-bar'),
          y('.era-tiles'),
          y('.agency-filter'),
          y('[data-testid="browse-toolbar"]'),
          y('.entity-card-grid'),
        ];
      });
      expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    });

    test('the toolbar has the total, "Showing", sort and Grid / List', async ({ page }) => {
      await page.goto(route);
      await waitForHydration(page);
      const bar = page.getByTestId('browse-toolbar');
      await expect(bar.getByTestId('browse-showing')).toContainText('Showing: All epochs');
      await expect(bar.locator('.sort-field select')).toBeVisible();
      await expect(bar.getByRole('radio', { name: 'Grid' })).toBeChecked();
      await expect(bar.getByRole('radio', { name: 'List' })).toBeVisible();
    });

    test('List view shows the rows and the URL keeps it', async ({ page }) => {
      await page.goto(route);
      await waitForHydration(page);
      await page.getByRole('radio', { name: 'List' }).click();
      await expect(page).toHaveURL(/view=list/);
      await expect(page.locator('[data-testid="entity-list"] .list-row').first()).toBeVisible();
      await page.reload();
      await expect(page.locator('[data-testid="entity-list"] .list-row').first()).toBeVisible();
    });

    test('CLEAR FILTERS shows whenever a filter is on, even with the filters closed', async ({
      page,
    }) => {
      await page.goto(`${route}?epoch=lunar-era`);
      await waitForHydration(page);
      await expect(page.locator('.filters-clear')).toBeVisible();
    });
  });
}

test('/fleet keeps its Line-up view in the toolbar and hides the strip there', async ({ page }) => {
  await page.goto('/fleet');
  await waitForHydration(page);
  await expect(
    page.getByTestId('browse-toolbar').getByRole('radio', { name: 'Line-up' }),
  ).toBeVisible();
  await page.goto('/fleet?category=launcher&view=lineup');
  await expect(page.locator('.era-tiles')).toHaveCount(0);
  await expect(page.getByRole('radio', { name: 'Line-up' })).toBeChecked();
});

test('/fleet sorts by category', async ({ page }) => {
  await page.goto('/fleet');
  await waitForHydration(page);
  await page.locator('.sort-field select').selectOption('category');
  await expect(page).toHaveURL(/sort=category/);
});
