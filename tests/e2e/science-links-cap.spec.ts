import { expect, test, type Page } from '@playwright/test';

/**
 * Slice B2 (UXD-022): no panel offers more than five /science cards, the lists differ from panel to
 * panel, and each ruler pane carries its own card. The data rules are in `src/lib/science-links.test.ts`;
 * this opens one panel of each shape in a real browser.
 */

const CARD = '[data-science-card]';

type Shape = { label: string; path: string; tab?: string; min: number };
const SHAPES: Shape[] = [
  {
    label: 'mission, 21 cards before (mars-express)',
    path: '/missions?id=mars-express',
    tab: '#mp-tab-science',
    min: 3,
  },
  {
    label: 'mission, 20 cards before (apollo11)',
    path: '/missions?id=apollo11',
    tab: '#mp-tab-science',
    min: 3,
  },
  { label: 'planet', path: '/explore?id=mars', min: 3 },
  { label: 'Sun', path: '/explore?id=sun', min: 3 },
  { label: 'moon', path: '/explore?id=jupiter:io', min: 2 },
  { label: 'small body', path: '/explore?id=vesta', min: 2 },
  { label: 'belt', path: '/explore?id=asteroid-belt', min: 2 },
  {
    label: 'ISS module, 11 links before (destiny)',
    path: '/iss?module=destiny',
    tab: '#station-tab-learn',
    min: 2,
  },
  {
    label: 'Tiangong module (wentian)',
    path: '/tiangong?module=wentian',
    tab: '#station-tab-learn',
    min: 2,
  },
  { label: 'Earth object, 5 links before (gps)', path: '/earth?object=gps', min: 3 },
];

async function openPanel(page: Page, path: string, tab?: string) {
  await page.goto(path);
  const panel = page.locator('aside.panel').last();
  await expect(panel).toBeVisible({ timeout: 20_000 });
  if (tab) await panel.locator(tab).click();
  await expect(panel.locator(CARD).first()).toBeVisible({ timeout: 15_000 });
  return panel;
}

const hrefs = (panel: ReturnType<Page['locator']>) =>
  panel
    .locator(CARD)
    .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href')));

test.describe('science links: the cap of five (B2)', () => {
  for (const { label, path, tab, min } of SHAPES) {
    test(`${label}: between ${min} and 5 cards, no card twice`, async ({ page }) => {
      const panel = await openPanel(page, path, tab);
      const list = await hrefs(panel);
      expect(list.length).toBeGreaterThanOrEqual(min);
      expect(list.length).toBeLessThanOrEqual(5);
      expect(new Set(list).size).toBe(list.length);
    });
  }

  test('a lunar crewed mission and a Mars lander do not share a list', async ({ page }) => {
    test.setTimeout(120_000);
    const a = await hrefs(await openPanel(page, '/missions?id=apollo11', '#mp-tab-science'));
    const b = await hrefs(await openPanel(page, '/missions?id=curiosity', '#mp-tab-science'));
    expect(a.join('|')).not.toBe(b.join('|'));
  });

  test('two modules of one station show different lists', async ({ page }) => {
    test.setTimeout(120_000);
    const a = await hrefs(await openPanel(page, '/iss?module=destiny', '#station-tab-learn'));
    const b = await hrefs(await openPanel(page, '/iss?module=quest', '#station-tab-learn'));
    expect(a.join('|')).not.toBe(b.join('|'));
  });

  test('Mars and Jupiter do not share a list', async ({ page }) => {
    test.setTimeout(120_000);
    const a = await hrefs(await openPanel(page, '/explore?id=mars'));
    const b = await hrefs(await openPanel(page, '/explore?id=jupiter'));
    expect(a.join('|')).not.toBe(b.join('|'));
  });
});

test.describe('orbit ruler: each pane its own card (B2, UXD-010)', () => {
  const PANES = [
    'TERRESTRIAL',
    'GIANTS',
    'BELT',
    'KUIPER',
    'SCATTERED',
    'HELIOPAUSE',
    'OORT',
    'SUN',
  ];

  test('one card per pane and no card repeats across the Explore ruler', async ({ page }) => {
    test.setTimeout(360_000);
    const seen = new Map<string, string>();
    for (const id of PANES) {
      const panel = await openPanel(page, `/explore?regime=${id}`);
      const list = await hrefs(panel);
      expect(list, id).toHaveLength(1);
      const dup = seen.get(list[0]!);
      expect(dup, `${id} repeats ${list[0]} of ${dup}`).toBeUndefined();
      seen.set(list[0]!, id);
    }
  });
});
