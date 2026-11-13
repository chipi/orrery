import { expect, test, type Page } from '@playwright/test';
import { waitForHydration } from './_helpers/hydration';

/**
 * Nothing draws over an open detail panel (UXD-017 C6-F note, Design System §5.15). On a window up
 * to 600 px with a mouse the panel (Panel.svelte, z 30) is full-width, so every HUD piece and the
 * site footer sit under it (the chip row was z 45, the time dock z 40, the INDEX handle z 44, the
 * footer z 35). On touch the portrait sheet is z 80 and covers the HUD, and the footer is hidden.
 * On a landscape phone the panel is a side drawer: the drawer tab row (MobileDrawerGroup) and the
 * card it opens end at the drawer's edge instead of crossing its actions.
 *
 * One probe for all of them: a grid of points over the open panel, and whatever is on top at each
 * point must be the panel (or its backdrop), never a HUD element or the footer. The report names
 * the offender. Run on all three projects: desktop-chromium is narrowed to 390 px, the phone
 * projects are their own viewport.
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
          if (!hit || hit.closest('aside.panel, .panel-backdrop')) continue;
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

const ROUTES = [
  '/explore?id=mars',
  '/mars?site=perseverance',
  '/moon?site=apollo11',
  '/venus?site=venera-13',
  '/earth?site=lc-39a',
  '/iss?module=zarya',
  '/tiangong?module=wentian',
  '/fleet?id=perseverance',
  '/missions?id=apollo11',
];

test.describe.configure({ timeout: 90_000 });

test.describe('an open detail panel is over every HUD piece and the footer', () => {
  for (const route of ROUTES) {
    test(`${route}: nothing but the panel is at any point of it`, async ({ page }, testInfo) => {
      await narrowForMouse(page, testInfo.project.name);
      await page.goto(route);
      await waitForHydration(page);
      await expect(page.locator('aside.panel')).toBeVisible({ timeout: 45_000 });
      await page.waitForTimeout(500);
      expect(await coverersOfPanel(page)).toEqual([]);
    });
  }
});

test.describe('the INDEX tab and BACK TO EXPLORE on a phone: disjoint, both on top', () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop-chromium', 'touch rows only');
  });

  // The site state is the one that moves the tab: the imagery card pushes it up to the chip row.
  for (const route of [
    '/moon',
    '/mars',
    '/venus',
    '/earth',
    '/moon?site=apollo11',
    '/mars?site=perseverance',
    '/venus?site=venera-13',
    '/earth?site=lc-39a',
  ]) {
    test(`${route}: neither covers the other`, async ({ page }, testInfo) => {
      // A portrait phone's open site panel is a full-height sheet over both: the closed state is the test.
      test.skip(
        route.includes('site=') && testInfo.project.name === 'mobile-chromium',
        'the sheet covers both',
      );
      await page.goto(route);
      await waitForHydration(page);
      const handle = page.locator('.surface-index-handle');
      const back = page.locator('.hud-top-mobile > *').first();
      await expect(handle).toBeVisible({ timeout: 45_000 });
      await expect(back).toBeVisible();
      await page.waitForTimeout(1500);
      const a = (await handle.boundingBox())!;
      const b = (await back.boundingBox())!;
      const disjoint =
        a.x + a.width <= b.x ||
        b.x + b.width <= a.x ||
        a.y + a.height <= b.y ||
        b.y + b.height <= a.y;
      expect(disjoint, `tab ${JSON.stringify(a)} vs back ${JSON.stringify(b)}`).toBe(true);
      for (const loc of [handle, back]) {
        const onTop = await loc.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return !!hit && el.contains(hit);
        });
        expect(onTop, 'on top at its centre').toBe(true);
      }
    });
  }
});

test.describe('a landscape phone: the drawer tabs stay usable beside the side drawer', () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-landscape-chromium', 'landscape-only');
  });

  // /explore is the other case: its inline tab row shares the bottom line with the time dock, the
  // scale strip and the level card, so it sits under the open drawer (the probe above holds it).
  for (const route of ['/mars?site=perseverance', '/moon?site=apollo11']) {
    test(`${route}: every tab is visible, left of the drawer, and takes the tap`, async ({
      page,
    }) => {
      await page.goto(route);
      await waitForHydration(page);
      const panel = page.locator('aside.panel');
      await expect(panel).toBeVisible({ timeout: 45_000 });
      await page.waitForTimeout(500);
      const drawerLeft = (await panel.boundingBox())!.x;
      const tabs = page.locator('.mdg-tab');
      const n = await tabs.count();
      expect(n).toBeGreaterThanOrEqual(3);
      for (let i = 0; i < n; i += 1) {
        const tab = tabs.nth(i);
        await expect(tab).toBeVisible();
        const b = (await tab.boundingBox())!;
        expect(b.x + b.width, `tab ${i} ends before the drawer`).toBeLessThanOrEqual(drawerLeft);
        const hit = await tab.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return !!top && el.contains(top);
        });
        expect(hit, `tab ${i} is on top at its centre`).toBe(true);
      }
    });
  }

  test('the card a tab opens stays left of the drawer', async ({ page }) => {
    await page.goto('/mars?site=perseverance');
    await waitForHydration(page);
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(500);
    const drawerLeft = (await panel.boundingBox())!.x;
    await page.locator('.mdg-tab').last().click();
    const card = page.locator('.mdg-body');
    await expect(card).toBeVisible();
    const b = (await card.boundingBox())!;
    expect(b.x + b.width).toBeLessThanOrEqual(drawerLeft + 1);
  });
});
