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

// /fleet has more agencies than the row shows (/missions has fewer, so it has no "Show all").
test('/fleet: the long agency row opens with "Show all" and closes with "Show fewer"', async ({
  page,
}) => {
  await page.goto('/fleet');
  await waitForHydration(page);
  const row = page.locator('.agency-filter');
  const chips = row.locator('.agency-chip');
  const showAll = row.getByRole('button', { name: /^Show all \d+$/ });
  await expect(showAll).toBeVisible();
  const before = await chips.count();
  await showAll.click();
  await expect(row.getByRole('button', { name: 'Show fewer' })).toBeVisible();
  expect(await chips.count()).toBeGreaterThan(before);
  await row.getByRole('button', { name: 'Show fewer' }).click();
  await expect(chips).toHaveCount(before);
  await expect(showAll).toBeVisible();
});

test('/fleet keeps its Line-up view in the toolbar and hides the strip there', async ({ page }) => {
  await page.goto('/fleet');
  await waitForHydration(page);
  await expect(
    page.getByTestId('browse-toolbar').getByRole('radio', { name: 'Line-up' }),
  ).toBeVisible();
  await page.goto('/fleet?category=launcher&view=lineup');
  await waitForHydration(page);
  await expect(page.locator('.era-tiles')).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByRole('radio', { name: 'Line-up' })).toBeChecked({ timeout: 15_000 });
});

test('/fleet sorts by category', async ({ page }) => {
  await page.goto('/fleet');
  await waitForHydration(page);
  await page.locator('.sort-field select').selectOption('category');
  await expect(page).toHaveURL(/sort=category/);
});

/**
 * /patches, /essays and /posters take the catalogue's card and grid (EntityCard in an
 * `entity-card-grid`): the same columns and gap as /missions, one card size per grid, no empty band.
 * Only the card's content differs (an insignia shown whole, an essay's title and dek, a print).
 */
const GRID_PAGES = [
  { route: '/patches', cards: 110 },
  { route: '/essays', cards: 13 },
  { route: '/posters', cards: 27 },
];

type GridFacts = {
  grids: { n: number; heights: number[]; gap: string; columns: number; bands: number[] }[];
};

async function gridFacts(page: import('@playwright/test').Page): Promise<GridFacts> {
  await page.addStyleTag({ content: '*{content-visibility:visible!important}' });
  return page.evaluate(() => {
    const grids = [...document.querySelectorAll<HTMLElement>('ul.entity-card-grid')].map((ul) => {
      const cards = [...ul.querySelectorAll<HTMLElement>(':scope > li > .card')];
      const cs = getComputedStyle(ul);
      return {
        n: cards.length,
        heights: [...new Set(cards.map((c) => Math.round(c.getBoundingClientRect().height)))],
        gap: cs.columnGap,
        columns: cs.gridTemplateColumns.split(' ').length,
        // The empty band under the content of each card: card bottom minus its lowest content.
        bands: cards.map((c) => {
          const bottom = c.getBoundingClientRect().bottom;
          const low = Math.max(
            ...[...c.querySelectorAll<HTMLElement>('.card-photo, .card-body > *')].map(
              (e) => e.getBoundingClientRect().bottom,
            ),
          );
          return Math.round(bottom - low);
        }),
      };
    });
    return { grids };
  });
}

for (const { route, cards } of GRID_PAGES) {
  test(`${route} uses the shared card grid: one card size per grid, no empty band`, async ({
    page,
  }) => {
    await page.goto(route);
    await waitForHydration(page);
    await expect(page.locator('ul.entity-card-grid > li > .card').first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator('ul.entity-card-grid > li > .card')).toHaveCount(cards);
    const { grids } = await gridFacts(page);
    expect(grids.length).toBeGreaterThan(0);
    for (const g of grids) {
      expect(g.heights, `${route}: every card of a grid has one height`).toHaveLength(1);
      expect(Math.max(...g.bands), `${route}: no empty band over 50 px`).toBeLessThanOrEqual(50);
    }
    // The same grid rule as /missions (same gap, auto-fill from the same floor), in the reading
    // pages' 1080 px frame: so never more columns than /missions' wide frame, and /essays is one
    // column on a phone (a long title fits).
    const width = page.viewportSize()!.width;
    await page.goto('/missions');
    await waitForHydration(page);
    await expect(page.locator('ul.entity-card-grid > li > .card').first()).toBeVisible({
      timeout: 20_000,
    });
    const ref = (await gridFacts(page)).grids[0];
    for (const g of grids) {
      expect(g.gap).toBe(ref.gap);
      expect(g.columns).toBeLessThanOrEqual(ref.columns);
      if (route === '/essays' && width <= 600) expect(g.columns).toBe(1);
      if (route !== '/essays' && width >= 1100) expect(g.columns).toBe(3);
    }
  });
}

test('/essays and /missions cards have the catalogue footprint (a photo and a 142 px body)', async ({
  page,
}) => {
  await page.goto('/essays');
  await waitForHydration(page);
  await expect(page.locator('ul.entity-card-grid > li > .card').first()).toBeVisible({
    timeout: 20_000,
  });
  const essay = await page.evaluate(() => {
    const body = document.querySelector('ul.entity-card-grid .card-body')!;
    const dek = body.querySelector('.card-first')!;
    const cs = getComputedStyle(dek);
    return {
      body: Math.round(body.getBoundingClientRect().height),
      font: cs.fontFamily,
      clamp: cs.webkitLineClamp,
      size: cs.fontSize,
      margin: getComputedStyle(body).marginBottom,
    };
  });
  expect(essay.body).toBe(142);
  expect(essay.font).toContain('Crimson Pro');
  expect(essay.clamp).toBe('3');
  expect(essay.size).toBe('15.5px');
  expect(essay.margin, 'no stray margin (a global .editorial rule once added 14 px)').toBe('0px');
});

test('/posters keeps each poster a download link and /patches keeps each credit a link', async ({
  page,
}) => {
  await page.goto('/posters');
  await waitForHydration(page);
  await expect(page.locator('ul.entity-card-grid > li > a.card[download]')).toHaveCount(27);
  await page.goto('/patches');
  await waitForHydration(page);
  const credits = page.locator('ul.entity-card-grid .card-extra a[target="_blank"]');
  expect(await credits.count()).toBeGreaterThan(50);
  await expect(page.locator('ul.entity-card-grid > li > .card').first()).not.toHaveAttribute(
    'href',
    /.*/,
  );
});
