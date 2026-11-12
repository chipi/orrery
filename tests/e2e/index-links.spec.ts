import { expect, test } from '@playwright/test';
import { collectCanonicalRoutes } from '../../scripts/site-routes.mjs';
import { waitForHydration } from './_helpers/hydration';

/**
 * UX slice A5 (UXD-015, ADR-096 item 11): the A–Z is absorbed into the INDEX. On the scene
 * routes (/moon /mars /venus /explore) there is no separate A–Z tab; each INDEX row whose
 * object has an entity page also carries a real link to it, and the prerendered HTML links
 * every entity page of the hub even while the INDEX panel is closed (crawlers do not click).
 * /missions and /fleet keep the A–Z at the page foot.
 */

const SCENE_HUBS = ['moon', 'mars', 'venus', 'explore'] as const;

function entityIds(hub: string): string[] {
  const prefix = `/${hub}/`;
  return (collectCanonicalRoutes() as string[])
    .filter((r) => r.startsWith(prefix) && !r.slice(prefix.length).includes('/'))
    .map((r) => r.slice(prefix.length))
    .filter((id) => !(hub === 'explore' && id === 'hub'));
}

test.describe('the prerendered hub HTML links every entity page', () => {
  test.beforeEach((_fixtures, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'static HTML: one project is enough');
  });

  for (const hub of SCENE_HUBS) {
    for (const locale of ['', '/de']) {
      test(`${locale}/${hub}: a link per entity page, no A–Z tab`, async ({ request }) => {
        const res = await request.get(`${locale}/${hub}`);
        expect(res.ok()).toBe(true);
        const html = await res.text();
        const hrefs = [...html.matchAll(/href="([^"#?]+)"/g)].map((m) => m[1]);
        const ids = entityIds(hub);
        expect(ids.length).toBeGreaterThan(0);
        const missing = ids.filter((id) => !hrefs.includes(`${locale}/${hub}/${id}`));
        expect(missing, `entity pages not linked from ${locale}/${hub}`).toEqual([]);
        expect(html).not.toContain(`data-testid="entity-index-${hub}"`);
      });
    }
  }

  for (const hub of ['missions', 'fleet']) {
    test(`/${hub} keeps the A–Z at the page foot`, async ({ request }) => {
      const html = await (await request.get(`/${hub}`)).text();
      expect(html).toContain(`data-testid="entity-index-${hub}"`);
    });
  }
});

for (const hub of ['moon', 'mars', 'venus']) {
  test(`/${hub}: every INDEX row with an entity page has a link to it; no floating A–Z`, async ({
    page,
  }) => {
    test.slow();
    await page.goto(`/${hub}`, { waitUntil: 'networkidle' });
    await waitForHydration(page);
    await expect(page.locator('.entity-index')).toHaveCount(0);
    await expect(page.locator('.surface-index-desktop')).toBeHidden();
    await page.getByTestId('surface-index-toggle').click();
    const list = page.getByTestId('surface-index-list');
    await expect(list).toBeVisible();
    const ids = new Set(entityIds(hub));
    const rows = await list
      .locator('.sidx-row')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-index-id')));
    expect(rows.length).toBeGreaterThan(3);
    const linked = await list
      .locator('a.sidx-page')
      .evaluateAll((els) =>
        els.map((e) => [e.getAttribute('data-index-id'), e.getAttribute('href')]),
      );
    const withPage = rows.filter((id) => id && ids.has(id));
    expect(withPage.length).toBeGreaterThan(0);
    expect(linked.map(([id]) => id).sort()).toEqual([...withPage].sort());
    for (const [id, href] of linked) expect(href).toMatch(new RegExp(`/${hub}/${id}$`));
  });
}

test('/explore: INDEX rows with an entity page link to it; moons follow as link rows; no floating A–Z', async ({
  page,
}) => {
  test.slow();
  await page.goto('/explore', { waitUntil: 'networkidle' });
  await waitForHydration(page);
  await expect(page.locator('.entity-index')).toHaveCount(0);
  await expect(page.locator('.body-index')).toBeHidden();
  await page.getByTestId('explore-body-index-toggle').click();
  await expect(page.locator('.body-index')).toBeVisible();
  const ids = new Set(entityIds('explore'));
  const linked = await page
    .locator('.body-index a.bidx-page')
    .evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  expect(linked.length).toBeGreaterThanOrEqual(ids.size);
  const rowLinks = await page
    .locator('.body-index a.bidx-page[data-index-id]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-index-id')));
  expect(rowLinks.length).toBeGreaterThan(5);
  for (const id of rowLinks) expect(ids.has(id!), `${id} has no entity page`).toBe(true);
});
