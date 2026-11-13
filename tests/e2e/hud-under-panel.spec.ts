import { expect, test, type Page } from '@playwright/test';
import { waitForHydration } from './_helpers/hydration';

/**
 * UXD-017 C6-F / UXD-027: an open detail panel is the top layer over the HUD. On a window up to
 * 600 px with a mouse the panel (Panel.svelte, z 30) is full-width, and any HUD piece stacked
 * above z 30 drew over its eyebrow, title and stats (the chip row at z 45, the time dock at z 40,
 * the INDEX handle at z 44). On touch the portrait sheet is z 80 and covers the HUD already; a
 * landscape phone's side drawer sits on the right, away from the left-hand HUD.
 *
 * One probe for all of them: a grid of points over the open panel, and whatever is on top at each
 * point must be the panel (or its backdrop), never a HUD element. The report names the offender.
 * Run on all three projects: desktop-chromium is narrowed to 390 px, the phone projects are
 * their own viewport.
 */

const COLS = 14;
const ROWS = 24;

/** The elements on top of the panel's rect that are not the panel, as "tag.class[testid]". */
async function coverersOfPanel(page: Page): Promise<string[]> {
  return page.evaluate(
    ([cols, rows]) => {
      const panel = document.querySelector('aside.panel');
      if (!panel) return ['no aside.panel'];
      const r = panel.getBoundingClientRect();
      const found = new Set<string>();
      for (let i = 0; i < cols; i += 1) {
        for (let j = 0; j < rows; j += 1) {
          const x = r.left + ((i + 0.5) / cols) * r.width;
          const y = r.top + ((j + 0.5) / rows) * r.height;
          if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
          const hit = document.elementFromPoint(x, y);
          // The site footer is layout chrome with its own spec (footer-dock), not a HUD piece.
          if (!hit || hit.closest('aside.panel, .panel-backdrop, .footer-menu')) continue;
          const own = hit.closest('[data-testid]') ?? hit;
          found.add(
            `${own.tagName.toLowerCase()}.${[...own.classList].join('.')}[${own.getAttribute('data-testid') ?? ''}]`,
          );
        }
      }
      return [...found];
    },
    [COLS, ROWS],
  );
}

async function narrowForMouse(page: Page, project: string): Promise<void> {
  if (project === 'desktop-chromium') await page.setViewportSize({ width: 390, height: 844 });
}

test.describe.configure({ timeout: 90_000 });

test.describe('an open full-width panel is over every HUD piece', () => {
  // A landscape phone's panel is a side drawer, not full-width; its drawer tab row (MobileDrawerGroup)
  // spans the whole bottom edge and is a separate layering question.
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-landscape-chromium', 'side drawer');
  });

  test('/explore, the Mars panel: nothing but the panel is at any point of it', async ({
    page,
  }, testInfo) => {
    await narrowForMouse(page, testInfo.project.name);
    await page.goto('/explore?id=mars');
    await waitForHydration(page);
    await expect(page.locator('aside.panel')).toBeVisible({ timeout: 45_000 });
    expect(await coverersOfPanel(page)).toEqual([]);
  });

  for (const site of ['/mars?site=perseverance', '/moon?site=apollo11']) {
    test(`${site}, a site panel: nothing but the panel is at any point of it`, async ({
      page,
    }, testInfo) => {
      await narrowForMouse(page, testInfo.project.name);
      await page.goto(site);
      await waitForHydration(page);
      await expect(page.locator('aside.panel')).toBeVisible({ timeout: 45_000 });
      expect(await coverersOfPanel(page)).toEqual([]);
    });
  }
});
