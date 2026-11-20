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
    // The cold load passes through the solar system: wait until the tab names the neighbourhood.
    await expect(toggle(page)).toHaveAttribute('aria-label', /^Stellar Neighborhood index/, {
      timeout: 45_000,
    });
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

/**
 * L42 (UXD-049): a deep-sky object's panel has an IN THE SKY tab — the constellation figure with the
 * object ringed and rows computed from its own RA / Dec / magnitude. The reader's time zone is
 * pinned (Berlin, 52.5 N) so the latitude row is deterministic.
 */
test.describe('/explore — the IN THE SKY tab of a deep-sky panel', () => {
  test.use({ timezoneId: 'Europe/Berlin' });
  test.beforeEach(() => {
    test.skip(
      test.info().project.name === 'mobile-landscape-chromium',
      'heavy neighbourhood cold-load starves the 2-CPU landscape shard',
    );
  });

  async function openSky(page: Page, id: string) {
    await page.goto(`/explore?deepsky=${id}`);
    await waitForHydration(page);
    const tab = page.getByRole('tab', { name: /in the sky/i });
    await expect(tab).toBeVisible({ timeout: 30_000 });
    await tab.click();
    await expect(page.locator('canvas.finder')).toBeVisible({ timeout: 20_000 });
    return (label: RegExp) => page.locator('.cell').filter({ hasText: label });
  }

  test('M42 shows OVERVIEW and IN THE SKY, the figure, and the computed rows', async ({ page }) => {
    test.slow();
    const cell = await openSky(page, 'M42');
    await expect(page.getByRole('tab')).toHaveText([/overview/i, /in the sky/i]);
    await expect(page.locator('canvas.finder')).toHaveCount(1);
    await expect(cell(/constellation/i)).toContainText('Orion');
    await expect(cell(/position/i)).toContainText('5h 35m');
    await expect(cell(/nearest bright star/i)).toContainText('Alnitak');
    await expect(cell(/best months/i)).toContainText('Nov to Jan');
    await expect(cell(/seen with/i)).toContainText('Naked eye');
    // Orion is not a zodiac constellation; M42 at dec -5 from 52 N sits mid-sky (no latitude row).
    await expect(page.getByText(/zodiac constellation/i)).toHaveCount(0);
    await expect(cell(/from your latitude/i)).toHaveCount(0);
  });

  test('M31 hops to Alpheratz and is high in the sky from 52 N', async ({ page }) => {
    test.slow();
    const cell = await openSky(page, 'M31');
    await expect(cell(/constellation/i)).toContainText('Andromeda');
    await expect(cell(/nearest bright star/i)).toContainText('Alpheratz');
    await expect(cell(/best months/i)).toContainText('Sep to Nov');
    await expect(cell(/best months/i).getByRole('link', { name: 'JPL Horizons' })).toHaveAttribute(
      'href',
      'https://ssd.jpl.nasa.gov/horizons/',
    );
    await expect(cell(/from your latitude/i)).toContainText('High in the sky');
    await expect(cell(/seen with/i)).toContainText('Naked eye');
  });

  test('M44 in Cancer carries the zodiac note and the lines action', async ({ page }) => {
    test.slow();
    await openSky(page, 'M44');
    await expect(page.getByText(/zodiac constellation/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /show constellation lines/i })).toBeVisible();
  });

  test('Cassiopeia A has no magnitude, so no SEEN WITH row; the figure and the other rows stay', async ({
    page,
  }) => {
    test.slow();
    const cell = await openSky(page, 'cas-a');
    await expect(cell(/seen with/i)).toHaveCount(0);
    await expect(cell(/constellation/i)).toContainText('Cassiopeia');
    await expect(cell(/best months/i)).toBeVisible();
  });

  test('a Serpens object (M5) draws its figure', async ({ page }) => {
    test.slow();
    const cell = await openSky(page, 'M5');
    await expect(cell(/constellation/i)).toContainText('Serpens');
  });

  test('the sheet does not scroll sideways', async ({ page }) => {
    test.slow();
    await openSky(page, 'M42');
    const wide = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(wide).toBe(false);
  });
});

test.describe('/explore — the IN THE SKY tab with an unknown time zone', () => {
  test.use({ timezoneId: 'Etc/GMT+3' });
  test.beforeEach(() => {
    test.skip(
      test.info().project.name === 'mobile-landscape-chromium',
      'heavy neighbourhood cold-load starves the 2-CPU landscape shard',
    );
  });

  test('30 Doradus leaves the latitude and nearest-star rows out and shows no error', async ({
    page,
  }) => {
    test.slow();
    await page.goto('/explore?deepsky=30-doradus');
    await waitForHydration(page);
    const tab = page.getByRole('tab', { name: /in the sky/i });
    await expect(tab).toBeVisible({ timeout: 30_000 });
    await tab.click();
    await expect(page.locator('canvas.finder')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('.cell').filter({ hasText: /from your latitude/i })).toHaveCount(0);
    await expect(page.locator('.cell').filter({ hasText: /best months/i })).toHaveCount(0);
    await expect(page.locator('.cell').filter({ hasText: /nearest bright star/i })).toHaveCount(0);
    await expect(page.locator('.cell').filter({ hasText: /constellation/i })).toContainText(
      'Dorado',
    );
  });
});
