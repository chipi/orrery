import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { MISSION_COUNT } from './_helpers/mission-index';
import { waitForHydration } from './_helpers/hydration';
import { epochForYear } from '../../src/lib/epoch-bands';

/**
 * UXD-048 (slice E3): the page pattern /missions and /fleet share. The agency filter row (dot,
 * name and count on every chip), the toolbar (total, "Showing", sort, Grid / List), the era tile
 * photos and the one card (fixed footprint, same size on both pages). Runs on desktop-chromium
 * and mobile-chromium.
 */

const index = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'static/data/missions/index.json'), 'utf8'),
) as { agency: string; year: number }[];
const flown = (agency: string) =>
  index.filter((m) => m.agency.split(/\s*[/+&]\s*/).includes(agency)).length;

async function open(page: Page, route = '/missions') {
  await page.goto(route);
  await waitForHydration(page);
  await expect(page.locator('.entity-card-grid .card').first()).toBeVisible({ timeout: 20_000 });
}

test.describe('catalogue pattern: agency row, toolbar, era photos (UXD-048)', () => {
  test('agency chips show a palette dot, the name and the mission count, without opening FILTERS', async ({
    page,
  }) => {
    await open(page);
    const nasa = page.locator('.agency-chip', {
      has: page.locator('.agency-name', { hasText: /^NASA$/ }),
    });
    await expect(nasa).toBeVisible();
    await expect(nasa.locator('.ui-chip__count')).toHaveText(String(flown('NASA')));
    await expect(nasa.locator('.agency-name')).toHaveText('NASA');
    const dot = await nasa.locator('.ui-chip__dot--data').evaluate((e) => ({
      bg: getComputedStyle(e).backgroundColor,
      w: e.getBoundingClientRect().width,
      shadow: getComputedStyle(e).boxShadow,
    }));
    expect(dot.bg).toBe('rgb(46, 114, 250)');
    expect(dot.w).toBe(10);
    expect(dot.shadow).toBe('none');
  });

  test('every agency chip carries a dot, a name and a count (no logo-only chip)', async ({
    page,
  }) => {
    await open(page);
    const chips = page.locator('.agency-chip');
    const n = await chips.count();
    expect(n).toBeGreaterThanOrEqual(14);
    expect(await page.locator('.agency-chip .ui-chip__dot--data').count()).toBe(n);
    expect(await page.locator('.agency-chip .ui-chip__count').count()).toBe(n);
    const names = await page.locator('.agency-chip .agency-name').allTextContents();
    expect(names.every((t) => t.trim().length > 0)).toBe(true);
  });

  test('the toolbar shows the total and "Showing: <era> (<n>)", and the total stays', async ({
    page,
  }) => {
    await open(page);
    const line = page.getByTestId('browse-showing');
    await expect(line).toContainText(String(MISSION_COUNT));
    await expect(line).toContainText(`(${MISSION_COUNT})`);
    await page.goto('/missions?epoch=lunar-era');
    const lunar = index.filter((m) => epochForYear(m.year) === 'lunar-era').length;
    await expect(page.getByTestId('browse-showing')).toContainText(`Lunar Era (${lunar})`);
    await expect(page.getByTestId('browse-showing')).toContainText(String(MISSION_COUNT));
  });

  test('era tiles show a photo and agency dots, and the chosen tile has the #889fe7 edge', async ({
    page,
  }) => {
    await open(page);
    const tiles = page.locator('[data-audio-stage="missions-epoch-timeline"] [role="radio"]');
    await expect(tiles).toHaveCount(9);
    expect(await tiles.locator('img.era-img').count()).toBe(9);
    expect(await tiles.locator('.era-dots').count()).toBeGreaterThanOrEqual(8);
    await tiles.nth(2).click();
    await expect(tiles.nth(2)).toHaveCSS('border-top-color', 'rgb(136, 159, 231)');
  });

  test('sort: oldest first, alphabetical, newest first; the choice is in the URL', async ({
    page,
  }) => {
    await open(page);
    const first = page.locator('.entity-card-grid .card .card-year-vis').first();
    const sort = page.getByLabel('Sort missions').or(page.locator('.sort-field select'));
    await sort.selectOption('chrono-asc');
    await expect(page).toHaveURL(/sort=chrono-asc/);
    await expect(first).toHaveText(String(Math.min(...index.map((m) => m.year))));
    await sort.selectOption('alpha');
    const names = await page.locator('.entity-card-grid .card .card-name').allTextContents();
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names.slice(0, 20)).toEqual(sorted.slice(0, 20));
    await sort.selectOption('chrono-desc');
    await expect(first).toHaveText(String(Math.max(...index.map((m) => m.year))));
  });

  test('Grid / List toggle: the list has one row per mission and opens the panel', async ({
    page,
  }) => {
    await open(page);
    await page.getByRole('radio', { name: 'List' }).click();
    await expect(page).toHaveURL(/view=list/);
    const rows = page.locator('[data-testid="entity-list"] .list-row');
    await expect(rows).toHaveCount(MISSION_COUNT);
    await expect(page.locator('.entity-card-grid')).toHaveCount(0);
    await rows.first().click();
    await expect(page.locator('aside.panel')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('radio', { name: 'Grid' }).click();
    await expect(page.locator('.entity-card-grid .card').first()).toBeVisible();
  });
});

test.describe('the one card (UXD-048)', () => {
  test('a mission card: photo, name, year, agency bars and names, status, story, in that order', async ({
    page,
  }) => {
    await open(page);
    const card = page.getByTestId('mission-card-apollo-soyuz');
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator('figure.card-photo img')).toHaveCount(1);
    await expect(card.locator('.card-name')).not.toBeEmpty();
    await expect(card.locator('.card-year-vis')).toHaveText('1975');
    expect(await card.locator('.card-agency').count()).toBeGreaterThanOrEqual(2);
    await expect(card.locator('.card-status')).toBeVisible();
    const order = await card.evaluate((el) => {
      const y = (s: string) => el.querySelector(s)!.getBoundingClientRect().top;
      return [y('figure'), y('.card-name'), y('.card-agencies'), y('.card-status')];
    });
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  for (const route of ['/missions', '/fleet']) {
    test(`${route}: every card has the same height, with no empty band at the bottom`, async ({
      page,
    }) => {
      await open(page, route);
      // Off-screen cards are skipped by content-visibility and report the 290 px hint, not their size.
      await page.addStyleTag({
        content: '.entity-card-grid > .card-li { content-visibility: visible !important; }',
      });
      const m = await page.evaluate(() => {
        const cards = [...document.querySelectorAll<HTMLElement>('.entity-card-grid .card')].slice(
          0,
          24,
        );
        const heights = cards.map((c) => Math.round(c.getBoundingClientRect().height));
        const width = cards[0].getBoundingClientRect().width;
        const bands = cards.map((c) => {
          const body = c.querySelector('.card-body')!;
          const last = [...body.children].filter(
            (e) => !e.classList.contains('sr-only') && e.getBoundingClientRect().height > 2,
          );
          // the story row may be empty (no story): the band under the last non-empty row
          const used = last.filter(
            (e) => (e.textContent ?? '').trim() !== '' || e.querySelector('*'),
          );
          const bottom = Math.max(...used.map((e) => e.getBoundingClientRect().bottom));
          return Math.round(c.getBoundingClientRect().bottom - bottom);
        });
        return { heights, width, bands };
      });
      expect(new Set(m.heights).size, `heights ${m.heights}`).toBe(1);
      // photo 16:9 + the fixed 142 px body + 1 px border: the footprint is a function of the width only
      expect(Math.abs(m.heights[0] - (m.width * 9) / 16 - 142 - 2)).toBeLessThanOrEqual(12);
      // a card whose story is missing still has the other three rows filled; nothing taller than the story row is empty
      expect(Math.max(...m.bands), `empty bands ${m.bands}`).toBeLessThanOrEqual(50);
    });
  }

  test('/missions and /fleet cards are the same size at one viewport', async ({ page }) => {
    // Measured on screen: an off-screen card is not laid out (content-visibility: auto) and reports
    // its 290 px placeholder, as the first /missions card did below the fold in landscape.
    const firstCard = async () => {
      const card = page.locator('.entity-card-grid .card').first();
      await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      return card.boundingBox();
    };
    await open(page, '/missions');
    const a = await firstCard();
    await open(page, '/fleet');
    const b = await firstCard();
    expect(Math.round(a!.height)).toBe(Math.round(b!.height));
    expect(Math.round(a!.width)).toBe(Math.round(b!.width));
  });
});
