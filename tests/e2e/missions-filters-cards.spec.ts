import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { MISSION_COUNT } from './_helpers/mission-index';
import { waitForHydration } from './_helpers/hydration';
import { epochForYear } from '../../src/lib/epoch-bands';

/**
 * UXD-048 (slice E3): the agency filter row (palette dot + count on every chip), the
 * "showing" line, the era tile photos and the redesigned mission card (name, year, agency bar
 * and names, status pill, story). Runs on desktop-chromium and mobile-chromium.
 */

const index = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'static/data/missions/index.json'), 'utf8'),
) as { agency: string; year: number }[];
const flown = (agency: string) =>
  index.filter((m) => m.agency.split(/\s*[/+&]\s*/).includes(agency)).length;

async function open(page: import('@playwright/test').Page, route = '/missions') {
  await page.goto(route);
  await waitForHydration(page);
  await expect(page.locator('[data-testid^="mission-card-"]').first()).toBeVisible({
    timeout: 20_000,
  });
}

test.describe('/missions agency filter, showing line, cards (UXD-048)', () => {
  test('agency chips show a palette dot and the mission count, without opening FILTERS', async ({
    page,
  }) => {
    await open(page);
    const nasa = page.getByRole('radio', { name: /^National Aeronautics|^NASA/ }).first();
    await expect(nasa).toBeVisible();
    await expect(nasa.locator('.ui-chip__count')).toHaveText(String(flown('NASA')));
    const dot = await nasa.locator('.ui-chip__dot--data').evaluate((e) => ({
      bg: getComputedStyle(e).backgroundColor,
      w: e.getBoundingClientRect().width,
      shadow: getComputedStyle(e).boxShadow,
    }));
    expect(dot.bg).toBe('rgb(46, 114, 250)');
    expect(dot.w).toBe(10);
    expect(dot.shadow).toBe('none');
  });

  test('every agency chip carries a dot and a count', async ({ page }) => {
    await open(page);
    const chips = page.locator('.agency-chip');
    const n = await chips.count();
    expect(n).toBeGreaterThanOrEqual(14);
    expect(await page.locator('.agency-chip .ui-chip__dot--data').count()).toBe(n);
    expect(await page.locator('.agency-chip .ui-chip__count').count()).toBe(n);
  });

  test('the showing line follows the era and the total stays', async ({ page }) => {
    await open(page);
    const line = page.getByTestId('missions-showing');
    await expect(line).toContainText(String(MISSION_COUNT));
    await expect(line).toContainText(`(${MISSION_COUNT})`);
    await page.goto('/missions?epoch=lunar-era');
    const lunar = index.filter((m) => epochForYear(m.year) === 'lunar-era').length;
    await expect(page.getByTestId('missions-showing')).toContainText(`Lunar Era (${lunar})`);
    await expect(page.getByTestId('missions-showing')).toContainText(String(MISSION_COUNT));
  });

  test('era tiles show a photo and agency dots, and the chosen tile has the #889fe7 edge', async ({
    page,
  }) => {
    await open(page);
    const tiles = page.locator('[data-audio-stage="missions-epoch-timeline"] [role="radio"]');
    await expect(tiles).toHaveCount(9);
    expect(await tiles.locator('img.era-photo').count()).toBe(9);
    expect(await tiles.locator('.era-dots').count()).toBeGreaterThanOrEqual(8);
    await tiles.nth(2).click();
    await expect(tiles.nth(2)).toHaveCSS('border-top-color', 'rgb(136, 159, 231)');
  });

  test('a mission card has the photo on top, name, year, agency bar and names, status, story', async ({
    page,
  }) => {
    await open(page);
    const card = page.getByTestId('mission-card-apollo-soyuz');
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator('figure.card-photo img')).toHaveCount(1);
    await expect(card.locator('.card-name')).not.toBeEmpty();
    await expect(card.locator('.card-year-vis')).toHaveText('1975');
    const agencies = card.locator('.card-agency');
    expect(await agencies.count()).toBeGreaterThanOrEqual(2);
    await expect(card.locator('.card-status')).toBeVisible();
    const order = await card.evaluate((el) => {
      const y = (s: string) => el.querySelector(s)!.getBoundingClientRect().top;
      return [y('figure'), y('.card-name'), y('.card-agencies'), y('.card-status')];
    });
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});
