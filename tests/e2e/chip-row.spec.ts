import { expect, test, type Page } from '@playwright/test';
import { openControlsDrawer } from './_helpers/hud-expand';
import { waitForHydration } from './_helpers/hydration';

/**
 * UX slice A5 (C2, W7, UXD-015): the layer chips are ONE flat horizontal row on /explore and
 * every world, from one component (LayerChipRow): no group captions, no master switches, no
 * greyed chip, no vertical column at any pointer. Earth's row is SURFACE, LAUNCHPADS, MUSEUMS,
 * OBSERVATORIES, ORBITERS; ORBITERS switches every orbiter at once.
 */

const ROWS: Record<string, string[]> = {
  '/earth': [
    'layer-surface',
    'layer-launchpads',
    'layer-museums',
    'layer-telescopes',
    'layer-orbiters',
  ],
  '/moon': ['layer-surface', 'layer-orbiters', 'layer-orbits', 'layer-traverses'],
  '/mars': ['layer-surface', 'layer-orbiters', 'layer-orbits', 'layer-traverses'],
  '/venus': ['layer-surface', 'layer-orbiters', 'layer-orbits'],
  '/explore': [
    'layer-paths',
    'layer-planets',
    'layer-dwarfs',
    'layer-comets',
    'layer-interstellar',
  ],
};

/** Open states: the row meets the open detail panel (site, orbiter, museum, observatory). */
const PANEL_STATES: [string, string][] = [
  ['/earth site', '/earth?site=lc-39a'],
  ['/earth orbiter', '/earth?object=iss'],
  ['/earth museum', '/earth?museum=nasm-washington'],
  ['/earth observatory', '/earth?observatory=vla'],
  ['/moon site', '/moon?site=apollo11'],
  ['/mars site', '/mars?site=perseverance'],
];

/** Where the layer chips are: the HUD on a fine pointer, the Layers / Controls drawer on touch. */
async function chipRow(page: Page, isMobile: boolean) {
  if (isMobile) {
    await openControlsDrawer(page);
    return page.locator('.mdg-body .ctrl-row.chips');
  }
  return page.locator('.hud-controls .ctrl-row.chips');
}

async function layerIds(row: ReturnType<Page['locator']>) {
  return row
    .locator('[data-testid^="layer-"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
}

for (const [route, ids] of Object.entries(ROWS)) {
  test.describe(`${route} layer chips`, () => {
    test('one flat row: the decided chips in order, no group, nothing disabled', async ({
      page,
      isMobile,
    }) => {
      test.slow();
      await page.goto(route, { waitUntil: 'networkidle' });
      await waitForHydration(page);
      const row = await chipRow(page, isMobile);
      await expect(row).toBeVisible();
      // ICONIC MISSIONS is first (C7 IM7). The phone Controls drawer leaves it to its Iconic Missions tab.
      const expected = isMobile && route === '/explore' ? ids.slice(1) : ids;
      expect(await layerIds(row)).toEqual(expected);

      await expect(page.locator('.chip-group')).toHaveCount(0);
      expect(await row.locator('button:disabled, [aria-disabled="true"]').count()).toBe(0);
      const text = (await row.innerText()).toUpperCase();
      for (const caption of ['ON EARTH', 'IN SPACE', 'ON GROUND'])
        expect(text, `group caption ${caption}`).not.toContain(caption);
    });

    test('never a vertical column; on a fine pointer the view actions and the layer chips share one band', async ({
      page,
      isMobile,
    }) => {
      test.slow();
      await page.goto(route, { waitUntil: 'networkidle' });
      await waitForHydration(page);
      const row = await chipRow(page, isMobile);
      await expect(row).toBeVisible();
      expect(await row.evaluate((el) => getComputedStyle(el).flexDirection)).toBe('row');
      if (isMobile) return;
      // One HUD row (operator 2026-11-12): the view actions first, a 12 px gap, then the layers.
      const hud = page.locator('.hud-controls');
      const boxes = await hud.locator('.ctrl-row .ui-chip').evaluateAll((els) =>
        els.map((e) => {
          const r = e.getBoundingClientRect();
          return { top: r.top, left: r.left, right: r.right, layer: !!e.closest('.chips') };
        }),
      );
      const actions = boxes.filter((b) => !b.layer);
      const layers = boxes.filter((b) => b.layer);
      expect(layers.length).toBe(ids.length);
      expect(actions.length, 'view action chips in the row').toBeGreaterThan(0);
      const tops = boxes.map((b) => b.top);
      expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(8);
      const lastAction = Math.max(...actions.map((b) => b.right));
      const firstLayer = Math.min(...layers.map((b) => b.left));
      expect(
        firstLayer - lastAction,
        'gap between the actions and the layers',
      ).toBeGreaterThanOrEqual(11);
      expect(firstLayer - lastAction).toBeLessThanOrEqual(13);
    });
  });
}

test.describe('/earth row content', () => {
  test('OBSERVATORIES is the ground telescopes chip; no TELESCOPES chip, no space-telescope chip', async ({
    page,
    isMobile,
  }) => {
    test.slow();
    await page.goto('/earth', { waitUntil: 'networkidle' });
    await waitForHydration(page);
    const row = await chipRow(page, isMobile);
    await expect(row.getByTestId('layer-telescopes')).toHaveText(/observatories/i);
    await expect(row.getByTestId('layer-orbiters')).toHaveText(/orbiters/i);
    expect((await row.innerText()).toUpperCase()).not.toContain('TELESCOPES');
    for (const id of [
      'layer-stations',
      'layer-observatories',
      'layer-constellations',
      'layer-comsats',
    ])
      await expect(page.getByTestId(id)).toHaveCount(0);
  });

  test('the chips are independent toggles', async ({ page, isMobile }) => {
    test.slow();
    await page.goto('/earth', { waitUntil: 'networkidle' });
    await waitForHydration(page);
    const row = await chipRow(page, isMobile);
    const pads = row.getByTestId('layer-launchpads');
    const museums = row.getByTestId('layer-museums');
    const orbiters = row.getByTestId('layer-orbiters');
    await pads.click();
    await expect(pads).toHaveAttribute('aria-pressed', 'false');
    await expect(museums).toHaveAttribute('aria-pressed', 'true');
    await expect(orbiters).toHaveAttribute('aria-pressed', 'true');
    await orbiters.click();
    await expect(orbiters).toHaveAttribute('aria-pressed', 'false');
    await expect(museums).toHaveAttribute('aria-pressed', 'true');
    await expect(pads).toHaveAttribute('aria-pressed', 'false');
  });
});

for (const [route, url] of PANEL_STATES) {
  test.describe(`${route} with a detail panel open`, () => {
    test.use({ viewport: { width: 820, height: 700 } });
    test('the row stays a row and stops before the open detail panel', async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, 'fine pointer: touch has no HUD row');
      test.slow();
      await page.goto(url, { waitUntil: 'networkidle' });
      await waitForHydration(page);
      const panel = page.locator('aside.panel, .detail-panel').first();
      await expect(panel).toBeVisible({ timeout: 25_000 });
      const row = page.locator('.hud-controls .ctrl-row.chips');
      await expect(row).toBeVisible();
      expect(await row.evaluate((el) => getComputedStyle(el).flexDirection)).toBe('row');
      const r = (await row.boundingBox())!;
      const p = (await panel.boundingBox())!;
      expect(r.x + r.width, 'row right edge vs panel left edge').toBeLessThanOrEqual(p.x);
    });
  });
}

test.describe('touch: the Layers drawer shows the row without bands', () => {
  for (const route of ['/earth', '/moon', '/mars', '/venus']) {
    test(`${route}: a wrapped run of 44 px chips, no horizontal scroll`, async ({
      page,
      isMobile,
    }) => {
      test.skip(!isMobile, 'touch only');
      test.slow();
      await page.goto(route, { waitUntil: 'networkidle' });
      await waitForHydration(page);
      const row = await chipRow(page, true);
      await expect(row).toBeVisible();
      expect(await row.locator('.chip-group').count()).toBe(0);
      const heights = await row
        .locator('.ui-chip')
        .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
      for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
      const body = page.locator('.mdg-body').first();
      expect(await body.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    });
  }
});

/** Left edge of every HUD chip, keyed by test id (or label), so a shift is visible by name. */
async function hudChipLefts(page: Page) {
  return page
    .locator('.hud-controls .ui-chip')
    .evaluateAll((els) =>
      Object.fromEntries(
        els.map((e, i) => [
          e.getAttribute('data-testid') ?? `${i}:${(e.textContent ?? '').trim()}`,
          Math.round(e.getBoundingClientRect().left),
        ]),
      ),
    );
}

test.describe('no HUD chip shifts as the view changes (fine pointer)', () => {
  test('/explore: selecting a body and resetting leave every chip where it was; RESET VIEW is always there', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'fine pointer: touch has no HUD row');
    test.slow();
    await page.goto('/explore', { waitUntil: 'networkidle' });
    await waitForHydration(page);
    const reset = page.getByTestId('explore-reset-view');
    await expect(reset).toBeVisible();
    await expect(reset).toBeDisabled();
    const before = await hudChipLefts(page);

    await page.getByTestId('scale-index-toggle').click();
    await page
      .locator('aside.scale-index[data-scale="solar-system"] button.si-row')
      .first()
      .click();
    await expect(reset).toBeEnabled({ timeout: 20_000 });
    expect(await hudChipLefts(page), 'after selecting a body').toEqual(before);

    await reset.click();
    await expect(reset).toBeDisabled({ timeout: 20_000 });
    expect(await hudChipLefts(page), 'after reset').toEqual(before);
  });

  for (const route of ['/mars', '/moon']) {
    test(`${route}: selecting a site and resetting leave every chip where it was`, async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, 'fine pointer: touch has no HUD row');
      test.slow();
      await page.goto(route, { waitUntil: 'networkidle' });
      await waitForHydration(page);
      const reset = page.getByTestId('reset-camera');
      await expect(reset).toBeVisible();
      await expect(reset).toBeEnabled();
      const before = await hudChipLefts(page);

      await page.getByTestId('surface-index-toggle').click();
      await page.locator('.sidx-row').first().click();
      await expect(page.locator('aside.panel, .detail-panel').first()).toBeVisible({
        timeout: 25_000,
      });
      expect(await hudChipLefts(page), 'after selecting a site').toEqual(before);

      await reset.click();
      expect(await hudChipLefts(page), 'after reset').toEqual(before);
    });
  }
});
