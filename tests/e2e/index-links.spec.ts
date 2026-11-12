import { expect, test, type Locator } from '@playwright/test';
import { collectCanonicalRoutes } from '../../scripts/site-routes.mjs';
import { waitForHydration } from './_helpers/hydration';

/**
 * UX slice A5 (UXD-015, ADR-096 item 11): the A–Z is absorbed into the INDEX. On the scene
 * routes (/moon /mars /venus /explore) there is no separate A–Z tab; each INDEX row whose
 * object has an entity page also carries a real link to it, and the prerendered HTML links
 * every entity page of the hub even while the INDEX panel is closed (crawlers do not click).
 * /missions and /fleet keep the A–Z at the page foot. The stars (ADR-096 item 13) are typed apart
 * under /explore/stars/<id> and the black holes (item 16) under /explore/black-holes/<id>; both
 * are rows of the neighbourhood star INDEX, which /explore renders at every scale (hidden outside
 * the neighbourhood), so the prerendered /explore HTML links every one of them.
 */

const SCENE_HUBS = ['moon', 'mars', 'venus', 'explore'] as const;

/** The ↗ page links are a 30 px target on a fine pointer, 44 px on a coarse one (A4). */
async function expectLinkTargets(links: Locator) {
  const fine = await links
    .page()
    .evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches);
  const sizes = await links.evaluateAll((els) =>
    els.slice(0, 5).map((e) => [e.getBoundingClientRect().width, e.getBoundingClientRect().height]),
  );
  expect(sizes.length).toBeGreaterThan(0);
  for (const [w, h] of sizes) {
    expect(w).toBeGreaterThanOrEqual(fine ? 29 : 43);
    if (!fine) expect(h).toBeGreaterThanOrEqual(43);
  }
}

/** An opened INDEX is one roving Tab stop, not one per row. */
async function expectOneTabStop(items: Locator) {
  await expect
    .poll(() =>
      items.evaluateAll((els) => els.filter((e) => (e as HTMLElement).tabIndex === 0).length),
    )
    .toBe(1);
}

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
    test(`${locale}/explore: the star INDEX links every star and black-hole page in the HTML`, async ({
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
  const panelHrefs = await page
    .locator('.body-index a.bidx-page')
    .evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  for (const id of ids)
    expect(
      panelHrefs.some((h) => h?.endsWith(`/explore/${id}`)),
      `${id} has no INDEX link`,
    ).toBe(true);
  await expectOneTabStop(page.locator('.body-index button.bidx-row, .body-index a.bidx-page'));
  await expectLinkTargets(page.locator('.body-index a.bidx-page[data-index-id]'));
  for (const id of rowLinks) expect(ids.has(id!), `${id} has no entity page`).toBe(true);
});

test('/explore neighbourhood: every star INDEX row links its star page; closed, the links are still in the DOM', async ({
  page,
}) => {
  test.slow();
  await page.goto('/explore?context=neighborhood', { waitUntil: 'networkidle' });
  await waitForHydration(page);
  const index = page.locator('.star-index');
  await expect(index).toBeHidden();
  const links = index.locator('a.si-page[data-testid="star-index-page-link"]');
  // 62 named stars + the planet hosts that are not named stars (trappist-1, 51-pegasi, toi-700, kepler-16).
  await expect(links).toHaveCount(starPageIds().length);
  const hrefs = await links.evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  const rowIds = await links.evaluateAll((els) => els.map((e) => e.getAttribute('data-index-id')));
  expect(hrefs).toEqual(rowIds.map((id) => `/explore/stars/${id}`));
  for (const id of rowIds) expect(starPageIds()).toContain(id);

  // The four black holes at the foot of the index carry the same link to their page.
  const bhLinks = index.locator('a.si-page[data-testid="black-hole-index-page-link"]');
  await expect(bhLinks).toHaveCount(blackHolePageIds().length);
  const bhIds = await bhLinks.evaluateAll((els) => els.map((e) => e.getAttribute('data-index-id')));
  expect(await bhLinks.evaluateAll((els) => els.map((e) => e.getAttribute('href')))).toEqual(
    bhIds.map((id) => `/explore/black-holes/${id}`),
  );
  for (const id of bhIds) expect(blackHolePageIds()).toContain(id);

  await page.locator('.star-index-handle').click();
  await expect(index).toBeVisible();
  await expect(index.locator('button.si-row').first()).toBeVisible();
  await expectOneTabStop(index.locator('button.si-row, a.si-page'));
  await expectLinkTargets(index.locator('a.si-page'));
});
