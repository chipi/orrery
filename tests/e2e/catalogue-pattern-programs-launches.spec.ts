import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { waitForHydration } from './_helpers/hydration';

/**
 * UXD-048: /programs and /missions/launches on the page pattern of /missions and /fleet. Same
 * parts in the same order from the same components, the same toolbar controls, one card of one
 * size; /missions/launches opens as the month-grouped list; every filter and URL parameter the
 * two pages had still works. Runs on desktop-chromium and mobile-chromium.
 */

const root = process.cwd();
const rj = <T>(rel: string): T => JSON.parse(readFileSync(path.resolve(root, rel), 'utf8')) as T;

type Program = {
  id: string;
  name: string;
  kind: string;
  agency: string;
  agencies?: string[];
  start_year: number;
};
const programs = rj<Program[]>('static/data/programs/index.json');
const agenciesOf = (p: Program) => p.agencies ?? [p.agency];

type Launch = {
  id: string;
  net: string;
  agency_name: string;
  tier: string;
  status: { code: string };
};
// The served file, not the checkout's: the launch manifest is refreshed by its own job, so a
// deployed site can carry newer launches than this tree (prod 2026-11-17: 462 against 349).
const launches = async (page: Page, file: string): Promise<Launch[]> => {
  const res = await page.request.get(`/data/${file}`);
  expect(res.ok(), file).toBe(true);
  return Object.values(((await res.json()) as { entries: Record<string, Launch> }).entries);
};

async function openPrograms(page: Page, query = '') {
  await page.goto(`/programs${query}`);
  await waitForHydration(page);
  await expect(page.locator('.era-tiles')).toBeVisible();
}

async function openLaunches(page: Page, query = '') {
  await page.goto(`/missions/launches${query}`);
  await waitForHydration(page);
  await page.waitForSelector('div.launches[data-route-ready="true"]', { timeout: 30_000 });
}

const tops = (page: Page, content: string) =>
  page.evaluate((c) => {
    const y = (s: string) => document.querySelector(s)!.getBoundingClientRect().top;
    return [
      y('.search-row'),
      y('.filters-bar'),
      y('.era-tiles'),
      y('.agency-filter'),
      y('[data-testid="browse-toolbar"]'),
      y(c),
    ];
  }, content);

test.describe('/programs', () => {
  test('the parts come in one order: search, strip, agency row, toolbar, grid', async ({
    page,
  }) => {
    await openPrograms(page);
    await expect(page.locator('.entity-card-grid .card').first()).toBeVisible();
    const t = await tops(page, '.entity-card-grid');
    expect([...t].sort((a, b) => a - b)).toEqual(t);
  });

  test('the toolbar has the total, "Showing", sort and Grid / List; Grid is on', async ({
    page,
  }) => {
    await openPrograms(page);
    const bar = page.getByTestId('browse-toolbar');
    await expect(bar.locator('.showing-total')).toHaveText(String(programs.length));
    await expect(bar.getByTestId('browse-showing')).toContainText('Showing: All epochs');
    await expect(bar.locator('.sort-field select')).toBeVisible();
    await expect(bar.getByRole('radio', { name: 'Grid' })).toBeChecked();
    await expect(bar.getByRole('radio', { name: 'List' })).toBeVisible();
  });

  test('one card per program, every card the same size, each a link to its program page', async ({
    page,
  }) => {
    await openPrograms(page);
    const cards = page.locator('.entity-card-grid a.card');
    await expect(cards).toHaveCount(programs.length);
    await page.addStyleTag({ content: '.card-li { content-visibility: visible !important; }' });
    const sizes = await cards.evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        return `${Math.round(r.width)}x${Math.round(r.height)}`;
      }),
    );
    expect(new Set(sizes).size, `card sizes: ${[...new Set(sizes)].join(', ')}`).toBe(1);
    await expect(page.getByTestId('program-card-apollo')).toHaveAttribute(
      'href',
      /\/programs\/apollo$/,
    );
  });

  test('a card names its agencies and kind; the status is read out, not a pill', async ({
    page,
  }) => {
    await openPrograms(page);
    const card = page.getByTestId('program-card-apollo');
    await expect(card.locator('.card-agency')).toHaveText(['NASA']);
    await expect(card.locator('.card-status')).toHaveCount(0);
    await expect(card.locator('.card-kind')).toHaveCount(1);
    // the kind pill is whole, never cut with an ellipsis
    const kind = card.locator('.card-kind');
    expect(await kind.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  });

  test('the era strip counts every program once, by its start year', async ({ page }) => {
    await openPrograms(page);
    const counts = await page.locator('.era-count').allTextContents();
    expect(counts.length).toBe(9);
    expect(counts.reduce((a, b) => a + Number(b), 0)).toBe(programs.length);
  });

  test('?epoch= keeps the programs that started in that era', async ({ page }) => {
    await openPrograms(page, '?epoch=first-steps');
    await expect(page.getByTestId('browse-showing')).toContainText('First Steps');
    const years = await page.locator('.entity-card-grid .card-year-vis').allTextContents();
    expect(years.length).toBeGreaterThan(0);
    for (const y of years) {
      const start = Number(y.slice(0, 4));
      expect(start).toBeGreaterThanOrEqual(1957);
      expect(start).toBeLessThanOrEqual(1961);
    }
    await expect(page.locator('.filters-clear')).toBeVisible();
  });

  test('?agency= keeps the programs of one agency, the chip is on', async ({ page }) => {
    await openPrograms(page, '?agency=ESA');
    await expect(page.locator('.entity-card-grid .card')).toHaveCount(
      programs.filter((p) => agenciesOf(p).includes('ESA')).length,
    );
    await expect(page.locator('.agency-chip[aria-checked="true"] .agency-name')).toHaveText('ESA');
  });

  test('the kind pill shows whole on every card (no ellipsis)', async ({ page }) => {
    await openPrograms(page);
    await page.addStyleTag({ content: '.card-li { content-visibility: visible !important; }' });
    const cut = await page
      .locator('.entity-card-grid .card-kind')
      .evaluateAll((els) =>
        els.filter((e) => e.scrollWidth > e.clientWidth).map((e) => e.textContent?.trim() ?? ''),
      );
    expect(cut).toEqual([]);
  });

  test('?kind= is a filter in FILTERS and keeps the programs of one kind', async ({ page }) => {
    await openPrograms(page, '?kind=station');
    await expect(page.locator('.entity-card-grid .card')).toHaveCount(
      programs.filter((p) => p.kind === 'station').length,
    );
    await expect(page.locator('nav.filters')).toBeVisible();
    await expect(page.locator('.filters-strip')).toHaveAttribute('aria-expanded', 'true');
  });

  test('?q= searches the name, tagline and agencies', async ({ page }) => {
    await openPrograms(page, '?q=apollo');
    await expect(page.getByTestId('program-card-apollo')).toBeVisible();
    const n = await page.locator('.entity-card-grid .card').count();
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(programs.length);
  });

  test('?sort= orders the cards: newest, oldest, A to Z', async ({ page }) => {
    const first = async () =>
      (await page.locator('.entity-card-grid .card').first().getAttribute('data-testid'))!;
    await openPrograms(page);
    const newest = Math.max(...programs.map((p) => p.start_year));
    const newestIds = programs
      .filter((p) => p.start_year === newest)
      .map((p) => `program-card-${p.id}`);
    expect(newestIds).toContain(await first());
    await openPrograms(page, '?sort=chrono-asc');
    expect(await first()).toBe('program-card-sputnik');
    await openPrograms(page, '?sort=alpha');
    const names = await page.locator('.entity-card-grid .card-name').allTextContents();
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  test('the sort select writes ?sort= and List writes ?view=list', async ({ page }) => {
    await openPrograms(page);
    await page.locator('.sort-field select').selectOption('alpha');
    await expect(page).toHaveURL(/sort=alpha/);
    await page.getByRole('radio', { name: 'List' }).click();
    await expect(page).toHaveURL(/view=list/);
    await expect(page.locator('[data-testid="entity-list"] .list-row')).toHaveCount(
      programs.length,
    );
    await page.reload();
    await waitForHydration(page);
    await expect(page.locator('[data-testid="entity-list"] .list-row').first()).toBeVisible();
  });

  test('the title, the lead and the patch wall stay above the tools', async ({ page }) => {
    await openPrograms(page);
    const t = await page.evaluate(() => [
      document.querySelector('h1.page-title')!.getBoundingClientRect().top,
      document.querySelector('.page-lead')!.getBoundingClientRect().top,
      document.querySelector('.search-row')!.getBoundingClientRect().top,
    ]);
    expect([...t].sort((a, b) => a - b)).toEqual(t);
  });

  test('keyboard: Enter on a card opens the program', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard focus on a touch profile');
    await openPrograms(page);
    await page.getByTestId('program-card-apollo').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/programs\/apollo$/);
  });
});

test.describe('/missions/launches', () => {
  test('opens as the month-grouped list, Grid is one click away and the URL keeps it', async ({
    page,
  }) => {
    await openLaunches(page);
    await expect(page.locator('article.launch-row').first()).toBeVisible();
    await expect(page.locator('.entity-card-grid')).toHaveCount(0);
    const bar = page.getByTestId('browse-toolbar');
    await expect(bar.getByRole('radio', { name: 'List' })).toBeChecked();
    await bar.getByRole('radio', { name: 'Grid' }).click();
    await expect(page).toHaveURL(/view=grid/);
    await expect(page.locator('.entity-card-grid .card-li').first()).toBeVisible();
    await expect(page.locator('article.launch-row')).toHaveCount(0);
    await page.reload();
    await waitForHydration(page);
    await expect(page.locator('.entity-card-grid .card-li').first()).toBeVisible();
    await bar.getByRole('radio', { name: 'List' }).click();
    await expect(page).not.toHaveURL(/view=/);
  });

  test('the parts come in one order: search, strip, agency row, toolbar, list', async ({
    page,
  }) => {
    await openLaunches(page);
    const t = await tops(page, '.timeline');
    expect([...t].sort((a, b) => a - b)).toEqual(t);
  });

  test('the toolbar has the total, "Showing", sort and List / Grid', async ({ page }) => {
    await openLaunches(page);
    const bar = page.getByTestId('browse-toolbar');
    await expect(bar.locator('.showing-total')).toHaveText(
      String((await launches(page, 'launches.json')).length),
    );
    await expect(bar.getByTestId('browse-showing')).toContainText('Showing: All epochs');
    await expect(bar.locator('.sort-field select')).toBeVisible();
    await expect(bar.getByRole('radio', { name: 'List' })).toBeVisible();
    await expect(bar.getByRole('radio', { name: 'Grid' })).toBeVisible();
  });

  test('the era tiles count launches per era from the whole catalogue, not the manifest in view', async ({
    page,
  }) => {
    await openLaunches(page);
    const counts = (await page.locator('.era-count').allTextContents()).map(Number);
    expect(counts.length).toBe(9);
    const files = [
      'launches.json',
      ...[
        '1957-1969',
        '1970-1979',
        '1980-1989',
        '1990-1999',
        '2000-2009',
        '2010-2019',
        '2020-2026',
      ].map((d) => `launches-historic/${d}.json`),
    ];
    const all = (await Promise.all(files.map((f) => launches(page, f))))
      .map((l) => l.length)
      .reduce((a, b) => a + b, 0);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(all);
  });

  test('?epoch= loads the decades of the era and keeps the launches of its years', async ({
    page,
  }) => {
    await openLaunches(page, '?epoch=first-steps');
    const want = (await launches(page, 'launches-historic/1957-1969.json')).filter(
      (l) => Number(l.net.slice(0, 4)) <= 1961,
    ).length;
    await expect(page.locator('article.launch-row')).toHaveCount(want);
    await expect(page.getByTestId('browse-showing')).toContainText(`(${want})`);
    await expect(page.locator('.filters-clear')).toBeVisible();
  });

  test('choosing an era tile writes ?epoch= and CLEAR FILTERS brings the manifest back', async ({
    page,
  }) => {
    await openLaunches(page);
    await page.locator('.era-tiles').getByRole('radio').nth(2).click();
    await expect(page).toHaveURL(/epoch=lunar-era/);
    await page.waitForSelector('div.launches[data-route-ready="true"]');
    await expect(page.getByTestId('browse-showing')).toContainText('Lunar Era');
    await page.locator('.filters-clear').click();
    await expect(page).not.toHaveURL(/epoch=/);
    await expect(page.getByTestId('browse-showing')).toContainText('All epochs');
  });

  test('the strip tile count is the number of launches that era shows', async ({ page }) => {
    await openLaunches(page);
    const tile = page.locator('.era-tiles').getByRole('radio').nth(2); // Lunar Era
    const n = Number(await tile.locator('.era-count').textContent());
    await tile.click();
    await page.waitForSelector('div.launches[data-route-ready="true"]');
    await expect(page.locator('article.launch-row')).toHaveCount(n);
  });

  test('the provider chips show a dot, a short name and a count; ?agency= keeps both spellings', async ({
    page,
  }) => {
    await openLaunches(page);
    const chips = page.locator('.agency-chip');
    expect(await chips.count()).toBeGreaterThanOrEqual(10);
    const nasaLike = (await launches(page, 'launches.json')).filter(
      (l) =>
        l.agency_name === 'National Aeronautics and Space Administration' ||
        l.agency_name === 'NASA',
    ).length;
    for (const value of ['NASA', 'National Aeronautics and Space Administration']) {
      await openLaunches(page, `?agency=${encodeURIComponent(value)}`);
      await expect(page.locator('article.launch-row')).toHaveCount(nasaLike);
      await expect(page.locator('.agency-chip[aria-checked="true"] .agency-name')).toHaveText(
        'NASA',
      );
    }
  });

  test('?tier=FEATURED keeps the featured launches and opens FILTERS', async ({ page }) => {
    await openLaunches(page, '?tier=FEATURED');
    await expect(page.locator('nav.filters')).toBeVisible();
    const want = (await launches(page, 'launches.json')).filter((l) => l.tier === 'T1').length;
    await expect(page.locator('article.launch-row')).toHaveCount(want);
    await expect(page.locator('article.launch-row:not([data-tier="T1"])')).toHaveCount(0);
  });

  test('?mode=historic&decade=&outcome=&year= keep every filter of the historic list', async ({
    page,
  }) => {
    await openLaunches(page, '?mode=historic&decade=1957-1969&outcome=FAILURE&year=1958');
    const want = (await launches(page, 'launches-historic/1957-1969.json')).filter(
      (l) => l.status.code === 'FAILURE' && l.net.startsWith('1958'),
    ).length;
    expect(want).toBeGreaterThan(0);
    await expect(page.locator('article.launch-row')).toHaveCount(want);
    await expect(page.locator('div.launches')).toHaveAttribute('data-mode', 'historic');
    const decade = page.locator('.filter-group').filter({ hasText: /DECADE/i });
    await expect(decade.getByRole('radio', { checked: true })).toHaveText('1957-69');
  });

  test('?year= on the upcoming list keeps the launches of that year', async ({ page }) => {
    await openLaunches(page, '?year=2027');
    const want = (await launches(page, 'launches.json')).filter((l) =>
      l.net.startsWith('2027'),
    ).length;
    await expect(page.locator('article.launch-row')).toHaveCount(want);
  });

  test('?q= searches the vehicle, mission, provider and pad', async ({ page }) => {
    await openLaunches(page, '?q=starship');
    const n = await page.locator('article.launch-row').count();
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan((await launches(page, 'launches.json')).length);
    await expect(page.getByTestId('launches-search')).toHaveValue('starship');
  });

  test('?sort= orders the list: oldest first by default, newest first, A to Z', async ({
    page,
  }) => {
    const nets = () =>
      page
        .locator('article.launch-row time')
        .evaluateAll((els) => els.map((e) => e.getAttribute('datetime')!));
    await openLaunches(page);
    const asc = await nets();
    expect([...asc].sort()).toEqual(asc);
    await openLaunches(page, '?sort=chrono-desc');
    const desc = await nets();
    expect([...desc].sort().reverse()).toEqual(desc);
    await openLaunches(page, '?sort=alpha');
    await expect(page.locator('.month-header')).toHaveCount(0);
    const names = await page
      .locator('article.launch-row .title')
      .evaluateAll((els) => els.map((e) => (e.firstChild?.textContent ?? '').trim()));
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  test('Grid: one card per launch, every card the same size, linked ones are links', async ({
    page,
  }) => {
    await openLaunches(page, '?view=grid');
    const cards = page.locator('.entity-card-grid .card');
    await expect(cards).toHaveCount((await launches(page, 'launches.json')).length);
    await page.addStyleTag({ content: '.card-li { content-visibility: visible !important; }' });
    const sizes = await cards.evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        return `${Math.round(r.width)}x${Math.round(r.height)}`;
      }),
    );
    expect(new Set(sizes).size, `card sizes: ${[...new Set(sizes)].join(', ')}`).toBe(1);
    expect(await page.locator('.entity-card-grid a.card').count()).toBeGreaterThan(0);
    expect(await page.locator('.entity-card-grid div.card').count()).toBeGreaterThan(0);
    await expect(page.locator('.entity-card-grid button.card')).toHaveCount(0);
  });

  test('FILTERS still holds view, tier, decade, outcome and year; CLEAR sits in the bar', async ({
    page,
  }) => {
    await openLaunches(page, '?mode=historic');
    const labels = await page.locator('nav.filters .filter-label').allTextContents();
    expect(labels.map((l) => l.trim().toUpperCase())).toEqual([
      'VIEW',
      'TIER',
      'DECADE',
      'OUTCOME',
      'YEAR',
    ]);
    await page.locator('nav.filters').getByRole('radio', { name: 'FEATURED' }).click();
    await expect(page.locator('.filters-bar .filters-clear')).toBeVisible();
    await page.locator('.filters-bar .filters-clear').click();
    await expect(page).not.toHaveURL(/tier=/);
  });

  test('with an era chosen the view and decade chips step aside', async ({ page }) => {
    await openLaunches(page, '?mode=historic&epoch=lunar-era');
    await expect(page.locator('nav.filters')).toBeVisible();
    await expect(page.locator('.filter-group').filter({ hasText: /DECADE/i })).toHaveCount(0);
    await expect(
      page.locator('.filter-group').filter({ hasText: /VIEW/i }).getByRole('radio').first(),
    ).toBeDisabled();
  });
});
