import { test, expect, type Page } from '@playwright/test';
import { waitForHydration } from './_helpers/hydration';

/**
 * /explore "what you are looking at" card (C8, E9, UXD-027): one card per scale level under the
 * level picker's row — the level's glyph and name, the home-grid text, the story, up to five
 * /science sections — folded on a touch screen, remembered, clear of a docked panel, gone in 2D
 * and in a takeover. The picker chip and the nav dropdown draw the same glyphs (E10).
 */

const LEVELS: Array<{ id: string; name: RegExp }> = [
  { id: 'solar-system', name: /^Solar System$/i },
  { id: 'neighborhood', name: /^Stellar Neighborhood$/i },
  { id: 'milky-way', name: /^Milky Way$/i },
  { id: 'local-group', name: /^Local Group$/i },
  { id: 'local-sheet', name: /^Local Sheet$/i },
  { id: 'virgo', name: /^Virgo Supercluster$/i },
  { id: 'laniakea', name: /^Laniakea$/i },
  { id: 'cosmic-web', name: /^Cosmic Web$/i },
];

const card = (p: Page) => p.getByTestId('explore-level-card');
const toggle = (p: Page) => p.getByTestId('explore-level-card-toggle');

async function gotoLevel(page: Page, id: string): Promise<void> {
  await page.goto(`/explore?context=${id}`);
  await waitForHydration(page);
  await expect(page.getByTestId(`explore-scale-rung-${id}`)).toHaveAttribute(
    'aria-current',
    'true',
    { timeout: 30_000 },
  );
  await expect(card(page)).toBeVisible({ timeout: 15_000 });
}

/** The card is open (a pointer device opens it; a touch one folds it, so open it for the content). */
async function open(page: Page): Promise<void> {
  if ((await toggle(page).getAttribute('aria-expanded')) !== 'true') await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
}

test.describe.configure({ timeout: 90_000 });

test.describe('/explore — level card (C8)', () => {
  for (const lv of LEVELS) {
    test(`${lv.id}: the card names the level, says what it is and links up to five /science sections`, async ({
      page,
    }) => {
      await gotoLevel(page, lv.id);
      await open(page);
      await expect(page.getByTestId('explore-level-card-name')).toHaveText(lv.name);
      await expect(page.getByTestId('explore-level-card-lead')).not.toBeEmpty();
      const links = page.getByTestId('explore-level-card-links').locator('a');
      const n = await links.count();
      expect(n).toBeGreaterThan(0);
      expect(n).toBeLessThanOrEqual(5);
      for (let i = 0; i < n; i++)
        await expect(links.nth(i)).toHaveAttribute('href', /\/science\/[a-z-]+\/[a-z0-9-]+$/);
      await expect(card(page).locator('svg.scale-glyph-icon')).toHaveCount(1);
    });
  }

  test('the links read as the sections’ titles, not their slugs', async ({ page }) => {
    await gotoLevel(page, 'milky-way');
    await open(page);
    await expect(page.getByTestId('explore-level-card-links').locator('a').first()).toContainText(
      /Our galaxy/i,
      { timeout: 20_000 },
    );
  });

  test('the fold toggles aria-expanded and survives a reload', async ({ page }) => {
    // Each test has a fresh browser context, so nothing is saved yet.
    await gotoLevel(page, 'virgo');
    await open(page);
    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('explore-level-card-lead')).toBeHidden();
    await gotoLevel(page, 'virgo');
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
    await toggle(page).click();
    await gotoLevel(page, 'laniakea');
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
  });

  test('the card follows the level: jumping out through the picker changes its name', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === 'mobile-landscape-chromium',
      'multi-scene walk starves the 2-CPU landscape shard',
    );
    await gotoLevel(page, 'solar-system');
    await page.getByTestId('explore-scale-toggle').click();
    await page.getByTestId('explore-scale-rung-neighborhood').click();
    await expect(page.getByTestId('explore-level-card-name')).toHaveText(/Stellar Neighborhood/i, {
      timeout: 40_000,
    });
  });

  test('hidden in 2D and in a black-hole takeover', async ({ page, isMobile }) => {
    await gotoLevel(page, 'solar-system');
    const viewToggle = isMobile
      ? page.getByTestId('explore-view-toggle-mobile')
      : page.getByTestId('explore-view-toggle');
    await viewToggle.click();
    await expect(card(page)).toBeHidden();
    await viewToggle.click();
    await expect(card(page)).toBeVisible();

    await page.goto('/explore?bh=sagittarius-a-star');
    await waitForHydration(page);
    await expect(page.getByTestId('explore-scale-picker')).toBeHidden({ timeout: 40_000 });
    await expect(card(page)).toHaveCount(0);
  });

  test('clear of a docked planet panel at 1280 x 720', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'the 1280 x 720 pointer window');
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/explore?id=jupiter');
    await waitForHydration(page);
    const panel = page.locator('aside.panel').first();
    await expect(panel).toBeVisible({ timeout: 40_000 });
    await expect(card(page)).toBeVisible();
    // The docked panel is laid out after the page settles; give the card its clearance pass.
    await expect
      .poll(
        async () => {
          const c = await card(page).boundingBox();
          const p = await panel.boundingBox();
          if (!c || !p) return false;
          return c.x + c.width <= p.x + 0.5 || c.y + c.height <= p.y + 0.5;
        },
        { timeout: 15_000 },
      )
      .toBe(true);
  });
});
