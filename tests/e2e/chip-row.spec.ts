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
    'layer-planets',
    'layer-dwarfs',
    'layer-comets',
    'layer-interstellar',
    'layer-paths',
  ],
};

/** Open states: the row meets the open detail panel. */
const PANEL_STATES: Record<string, string> = {
  '/earth': '/earth?site=lc-39a',
  '/moon': '/moon?site=apollo11',
  '/mars': '/mars?site=perseverance',
};

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
      // The phone Controls drawer on /explore leaves PATHS to its Iconic Missions tab.
      const expected = isMobile && route === '/explore' ? ids.slice(0, -1) : ids;
      expect(await layerIds(row)).toEqual(expected);

      await expect(page.locator('.chip-group')).toHaveCount(0);
      expect(await row.locator('button:disabled, [aria-disabled="true"]').count()).toBe(0);
      const text = (await row.innerText()).toUpperCase();
      for (const caption of ['ON EARTH', 'IN SPACE', 'ON GROUND'])
        expect(text, `group caption ${caption}`).not.toContain(caption);
    });

    test('never a vertical column; on a fine pointer every chip shares one band', async ({
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
      const tops = await row
        .locator('.ui-chip')
        .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top));
      expect(tops.length).toBe(ids.length);
      expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(8);
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

for (const [route, url] of Object.entries(PANEL_STATES)) {
  test.describe(`${route} with a site selected`, () => {
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
