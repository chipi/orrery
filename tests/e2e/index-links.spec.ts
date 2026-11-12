import { expect, test } from '@playwright/test';
import { collectCanonicalRoutes } from '../../scripts/site-routes.mjs';
import { expectLinkTargets, expectOneTabStop } from './_helpers/index-panel';
import { waitForHydration } from './_helpers/hydration';

/**
 * UX slice A5 (UXD-015, ADR-096 item 11): the A–Z is absorbed into the INDEX. On the scene
 * routes (/moon /mars /venus /explore) there is no separate A–Z tab; each INDEX row whose
 * object has an entity page also carries a real link to it, and the prerendered HTML links
 * every entity page of the hub even while the INDEX panel is closed (crawlers do not click).
 * /missions and /fleet keep the A–Z at the page foot. The stars (ADR-096 item 13) are typed apart
 * under /explore/stars/<id> and the black holes (item 16) under /explore/black-holes/<id>; both
 * are rows of the INDEX of the scale they belong to (UXD-017), and /explore renders every scale's
 * INDEX, hidden unless it is on screen, so the prerendered /explore HTML links every one of them.
 * The /explore INDEX in the browser (all eight scales) is scale-index.spec.ts.
 */

const SCENE_HUBS = ['moon', 'mars', 'venus', 'explore'] as const;

function entityIds(hub: string): string[] {
  const prefix = `/${hub}/`;
  return (collectCanonicalRoutes() as string[])
    .filter((r) => r.startsWith(prefix) && !r.slice(prefix.length).includes('/'))
    .map((r) => r.slice(prefix.length))
    .filter((id) => !(hub === 'explore' && id === 'hub'));
}

/** Every /explore/stars/<id> page (named stars + exoplanet hosts). */
function starPageIds(): string[] {
  return (collectCanonicalRoutes() as string[])
    .filter((r) => r.startsWith('/explore/stars/'))
    .map((r) => r.slice('/explore/stars/'.length));
}

/** Every /explore/black-holes/<id> page (the three real holes and Gargantua). */
function blackHolePageIds(): string[] {
  return (collectCanonicalRoutes() as string[])
    .filter((r) => r.startsWith('/explore/black-holes/'))
    .map((r) => r.slice('/explore/black-holes/'.length));
}

test.describe('the prerendered hub HTML links every entity page', () => {
  // Playwright requires a destructuring pattern as the first argument (see mobile-invariants.spec.ts).
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(({}, testInfo) => {
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

  for (const locale of ['', '/de']) {
    test(`${locale}/explore: the INDEX links every star and black-hole page in the HTML`, async ({
      request,
    }) => {
      const res = await request.get(`${locale}/explore`);
      expect(res.ok()).toBe(true);
      const hrefs = [...(await res.text()).matchAll(/href="([^"#?]+)"/g)].map((m) => m[1]);
      const stars = starPageIds();
      expect(stars.length).toBe(66);
      const holes = blackHolePageIds();
      expect(holes.length).toBe(4);
      const missing = [
        ...stars.map((id) => `${locale}/explore/stars/${id}`),
        ...holes.map((id) => `${locale}/explore/black-holes/${id}`),
      ].filter((href) => !hrefs.includes(href));
      expect(missing, `star / black-hole pages not linked from ${locale}/explore`).toEqual([]);
    });
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
    expect(rows.length).toBeGreaterThanOrEqual(ids.size);
    const linked = await list
      .locator('a.sidx-page')
      .evaluateAll((els) =>
        els.map((e) => [e.getAttribute('data-index-id'), e.getAttribute('href')]),
      );
    const withPage = rows.filter((id) => id && ids.has(id));
    expect(withPage.length).toBeGreaterThan(0);
    expect(linked.map(([id]) => id).sort()).toEqual([...withPage].sort());
    // Every entity page of the hub is linked from inside the INDEX panel, not just somewhere on the page.
    for (const id of ids)
      expect(
        linked.map(([lid]) => lid),
        `${id} has no INDEX link`,
      ).toContain(id);
    await expectOneTabStop(list.locator('button.sidx-row, a.sidx-page'));
    await expectLinkTargets(list.locator('a.sidx-page'));
    for (const [id, href] of linked) expect(href).toMatch(new RegExp(`/${hub}/${id}$`));
  });
}
