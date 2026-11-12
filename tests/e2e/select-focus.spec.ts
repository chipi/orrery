import { expect, test, type Locator, type Page } from '@playwright/test';
import { openControlsDrawer, openDrawerTab } from './_helpers/hud-expand';
import { waitForHydration } from './_helpers/hydration';

/**
 * UXD-019, select = focus (slice C1). Whatever way a body is picked, it is selected AND
 * focused: its panel opens, its ring is up (a belt has none: its particles brighten), and the
 * camera is on it. A chip turned off clears a selection of its kind; selecting a body whose chip
 * is off turns the chip on. Ids with no scene object are not links. A body panel's mission link
 * opens the mission in place, newest first. A member of an outer scale takes the camera and the
 * scale's Reset gives it back. Runs on all three projects (the INDEX handle, the chips and the
 * drawers change shape on touch).
 *
 * Reduced motion freezes the sim clock, so a moon (5 orbits a second at the default speed) holds
 * still while the camera position is compared with the body's; the 600 ms fly still runs.
 */

test.use({ reducedMotion: 'reduce' });
test.describe.configure({ timeout: 90_000 });

type Cam = NonNullable<ReturnType<NonNullable<Window['__exploreCameraState']>>>;

const cam = (page: Page): Promise<Cam> =>
  page.evaluate(() => window.__exploreCameraState!() as Cam);
const bodyAt = (page: Page, key: string): Promise<number[] | null> =>
  page.evaluate((k) => window.__exploreBodyPosition!(k), key);
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const panels = (page: Page) => page.locator('aside.panel');

async function openExplore(page: Page, query = '') {
  await page.goto(`/explore${query}`);
  await waitForHydration(page);
  await page.waitForFunction(() => typeof window.__exploreCameraState === 'function', null, {
    timeout: 45_000,
  });
}

/** The 600 ms fly, plus a frame: wait until the camera stopped moving. */
async function settled(page: Page) {
  await page.waitForTimeout(800);
  await expect.poll(async () => (await cam(page)).flying, { timeout: 10_000 }).toBe(false);
}

async function openIndex(page: Page, scale = 'solar-system') {
  const panel = page.locator(`aside.scale-index[data-scale="${scale}"]`);
  if (!(await panel.isVisible())) await page.getByTestId('scale-index-toggle').click();
  await expect(panel).toBeVisible();
  return panel;
}

const indexRow = (panel: Locator, id: string) =>
  panel.locator(`button.si-row[data-index-id="${id}"]`);

/** The layer chip: in the HUD on a fine pointer, in the Controls drawer on touch. */
async function chip(page: Page, isMobile: boolean, key: string): Promise<Locator> {
  if (isMobile) {
    await openControlsDrawer(page);
    return page.locator(`.mdg-body [data-testid="layer-${key}"]`);
  }
  return page.locator(`.hud-controls [data-testid="layer-${key}"]`);
}

const SELECTIONS = [
  { id: 'jupiter', key: 'planet:jupiter', ring: true, name: 'Jupiter' },
  { id: 'ceres', key: 'small:ceres', ring: true, name: 'Ceres' },
  { id: 'halley', key: 'small:halley', ring: true, name: 'Halley' },
  { id: 'io', key: 'moon:jupiter:io', ring: true, name: 'Io' },
  { id: 'asteroid', key: 'belt:asteroid', ring: false, name: 'Asteroid' },
];

test.describe('/explore select = focus', () => {
  for (const s of SELECTIONS) {
    test(`an INDEX row for ${s.id} opens the panel, rings the body and centres the camera on it`, async ({
      page,
    }) => {
      await openExplore(page);
      const panel = await openIndex(page);
      await indexRow(panel, s.id).click();
      await expect(
        panels(page)
          .filter({ hasText: new RegExp(s.name, 'i') })
          .first(),
      ).toBeVisible({
        timeout: 20_000,
      });
      await settled(page);
      const c = await cam(page);
      expect(c.ringVisible, `${s.id} ring`).toBe(s.ring);
      if (s.ring) {
        const at = (await bodyAt(page, s.key))!;
        expect(dist(c.origin, at), `${s.id} camera target to body`).toBeLessThan(1);
        expect(dist(c.ringAt, at), `${s.id} ring to body`).toBeLessThan(1);
      } else {
        expect(
          dist(c.origin, [0, 0, 0]),
          'belt: the camera frames the ring from the Sun',
        ).toBeLessThan(1);
        expect(c.camR).toBeGreaterThan(400);
      }
    });
  }

  test('?id= selects and focuses like a row: a moon and a small body', async ({ page }) => {
    await openExplore(page, '?id=halley');
    await settled(page);
    const c = await cam(page);
    expect(c.ringVisible).toBe(true);
    expect(dist(c.origin, (await bodyAt(page, 'small:halley'))!)).toBeLessThan(1);
  });

  test('Pluto is one body with one panel: INDEX row, ?id= and the Kuiper resident agree', async ({
    page,
  }) => {
    const at = async () => (await bodyAt(page, 'planet:pluto'))!;
    // 1. ?id=
    await openExplore(page, '?id=pluto');
    await settled(page);
    await expect(panels(page).filter({ hasText: /Pluto/ })).toHaveCount(1);
    let c = await cam(page);
    expect(c.ringVisible).toBe(true);
    expect(dist(c.origin, await at())).toBeLessThan(1);
    // 2. the INDEX row of a fresh page
    await openExplore(page);
    const panel = await openIndex(page);
    await indexRow(panel, 'pluto').click();
    await settled(page);
    await expect(panels(page).filter({ hasText: /Pluto/ })).toHaveCount(1);
    c = await cam(page);
    expect(c.ringVisible).toBe(true);
    expect(dist(c.origin, await at())).toBeLessThan(1);
    // 3. the Kuiper ruler pane resident
    await openExplore(page, '?regime=KUIPER');
    await page.locator('button.resident-link', { hasText: /Pluto/ }).click();
    await settled(page);
    c = await cam(page);
    expect(c.ringVisible).toBe(true);
    expect(dist(c.origin, await at())).toBeLessThan(1);
  });

  test('a resident with no scene object is plain text, one with an object is a link', async ({
    page,
  }) => {
    await openExplore(page, '?regime=BELT');
    const pane = panels(page).filter({ hasText: /Pallas/ });
    await expect(pane).toBeVisible();
    await expect(pane.locator('button.resident-link', { hasText: /Ceres/ })).toHaveCount(1);
    await expect(pane.locator('button.resident-link', { hasText: /Vesta/ })).toHaveCount(1);
    await expect(pane.locator('button.resident-link', { hasText: /Pallas/ })).toHaveCount(0);
    await expect(pane.locator('button.resident-link', { hasText: /Hygiea/ })).toHaveCount(0);
    await expect(pane.locator('.resident-label', { hasText: /Pallas/ })).toHaveCount(1);
    await openExplore(page, '?regime=KUIPER');
    const kuiper = panels(page).filter({ hasText: /Quaoar/ });
    await expect(kuiper.locator('button.resident-link', { hasText: /Quaoar/ })).toHaveCount(0);
    await openExplore(page, '?regime=SCATTERED');
    const scattered = panels(page).filter({ hasText: /Sedna/ });
    await expect(scattered.locator('button.resident-link', { hasText: /Sedna/ })).toHaveCount(0);
  });

  test('a belt member in the Belt pane selects in place: a body with an object is a link, the rest are text', async ({
    page,
  }) => {
    await openExplore(page, '?id=asteroid-belt');
    const pane = panels(page).filter({ hasText: /Asteroid Belt/i });
    await expect(pane.first()).toBeVisible();
    await pane
      .first()
      .getByRole('tab', { name: /members/i })
      .click();
    const links = pane.first().locator('a.member-link');
    await expect(links.filter({ hasText: /Vesta/ })).toHaveCount(1);
    await expect(links.filter({ hasText: /Pallas/ })).toHaveCount(0);
    const url = page.url();
    await links.filter({ hasText: /Ceres/ }).click();
    await settled(page);
    expect(page.url().split('?')[0]).toBe(url.split('?')[0]);
    const c = await cam(page);
    expect(c.ringVisible).toBe(true);
    expect(dist(c.origin, (await bodyAt(page, 'small:ceres'))!)).toBeLessThan(1);
  });

  const CHIP_OFF = [
    { id: 'mars', query: '?id=mars', chip: 'planets', name: 'Mars' },
    { id: 'io', query: '?id=jupiter:io', chip: 'planets', name: 'Io' },
    { id: 'ceres', query: '?id=ceres', chip: 'dwarfs', name: 'Ceres' },
    { id: 'vesta (an asteroid rides DWARFS)', query: '?id=vesta', chip: 'dwarfs', name: 'Vesta' },
    { id: 'halley', query: '?id=halley', chip: 'comets', name: 'Halley' },
    { id: 'oumuamua', query: '?id=oumuamua', chip: 'interstellar', name: 'Oumuamua' },
  ];
  for (const s of CHIP_OFF) {
    test(`turning ${s.chip.toUpperCase()} off clears the selected ${s.id}: panel, ring and focus`, async ({
      page,
      isMobile,
    }) => {
      await openExplore(page, s.query);
      await expect(
        panels(page)
          .filter({ hasText: new RegExp(s.name, 'i') })
          .first(),
      ).toBeVisible({
        timeout: 20_000,
      });
      await settled(page);
      expect((await cam(page)).ringVisible).toBe(true);
      await (await chip(page, isMobile, s.chip)).click();
      await expect(panels(page)).toHaveCount(0);
      await settled(page);
      const c = await cam(page);
      expect(c.ringVisible).toBe(false);
      expect(dist(c.origin, [0, 0, 0]), 'the camera is back on the heliocentric view').toBeLessThan(
        1,
      );
    });
  }

  test('turning a chip off leaves a selection of another kind alone', async ({
    page,
    isMobile,
  }) => {
    await openExplore(page, '?id=mars');
    await expect(panels(page).filter({ hasText: /Mars/ }).first()).toBeVisible({ timeout: 20_000 });
    await (await chip(page, isMobile, 'dwarfs')).click();
    await expect(panels(page).filter({ hasText: /Mars/ }).first()).toBeVisible();
    await settled(page);
    expect((await cam(page)).ringVisible).toBe(true);
  });

  test('selecting a row of a hidden kind turns its chip on', async ({ page, isMobile }) => {
    await openExplore(page);
    const dwarfs = await chip(page, isMobile, 'dwarfs');
    await dwarfs.click();
    await expect(dwarfs).not.toHaveAttribute('aria-pressed', 'true');
    const panel = await openIndex(page);
    await indexRow(panel, 'ceres').click();
    await expect(panels(page).filter({ hasText: /Ceres/ }).first()).toBeVisible({
      timeout: 20_000,
    });
    await settled(page);
    const again = await chip(page, isMobile, 'dwarfs');
    await expect(again).toHaveAttribute('aria-pressed', 'true');
    expect((await cam(page)).ringVisible).toBe(true);
  });

  test('PATHS off closes a mission that was opened from a path', async ({ page, isMobile }) => {
    await openExplore(page, '?paths=1');
    if (isMobile) await openDrawerTab(page, /missions/i);
    await page.locator('[data-testid="paths-legend-row-voyager-2"]:visible').click();
    await expect(
      panels(page)
        .filter({ hasText: /Voyager 2/ })
        .first(),
    ).toBeVisible({
      timeout: 15_000,
    });
    await (await chip(page, isMobile, 'paths')).click();
    await expect(panels(page)).toHaveCount(0);
  });
});

test.describe('/explore mission links and iconic rows', () => {
  test('a mission in a body panel opens in place, newest first; the body stays selected', async ({
    page,
  }) => {
    await openExplore(page, '?id=mars');
    const planet = panels(page).filter({ hasText: /Mars/ }).first();
    await expect(planet).toBeVisible({ timeout: 20_000 });
    await planet.getByRole('tab', { name: /missions/i }).click();
    const items = planet.locator('.mission-list li');
    await expect(items.first()).toBeVisible();
    const years = await items.evaluateAll((els) =>
      els.map((e) => Number(/(1[89]\d\d|20\d\d)/.exec(e.textContent ?? '')?.[1] ?? 0)),
    );
    expect(years.length).toBeGreaterThan(1);
    expect(years, 'newest first').toEqual([...years].sort((a, b) => b - a));
    const link = planet.locator('a.mission-link[href*="/missions?id="]').first();
    const before = page.url().split('?')[0];
    await link.click();
    await expect(
      page.getByTestId('fly-mission-btn').or(page.locator('.panel-hero')).first(),
    ).toBeVisible({
      timeout: 20_000,
    });
    expect(page.url().split('?')[0], 'no navigation away from /explore').toBe(before);
    await expect(panels(page)).toHaveCount(2);
    expect((await cam(page)).ringVisible, 'Mars stays selected').toBe(true);
  });

  const CRAFT = ['voyager-1', 'voyager-2', 'pioneer-10', 'pioneer-11', 'new-horizons'];
  for (const id of CRAFT) {
    test(`the ${id} legend row opens the mission panel, with the message as a section`, async ({
      page,
      isMobile,
    }) => {
      await openExplore(page, '?paths=1');
      if (isMobile) await openDrawerTab(page, /missions/i);
      await page.locator(`[data-testid="paths-legend-row-${id}"]:visible`).click();
      const section = page.getByTestId('mission-message-section');
      await expect(section).toHaveAttribute('data-craft', id, { timeout: 15_000 });
      await expect(page.getByTestId('explore-message-panel')).toHaveCount(0);
      if (id === 'new-horizons')
        await expect(section.getByText('no formal message', { exact: false })).toBeVisible();
      else await expect(section.getByText(/Golden Record|Pioneer Plaque/).first()).toBeVisible();
    });
  }
});

const OUTER = [
  { scale: 'local-group', row: 'andromeda' },
  { scale: 'local-sheet', row: 'm81-group' },
  { scale: 'virgo', row: 'virgo-cluster' },
  { scale: 'laniakea', row: 'great-attractor' },
  { scale: 'cosmic-web', row: 'shapley-concentration' },
];

test.describe('/explore outer scales: a member takes the camera, Reset gives it back', () => {
  test.beforeEach(() => {
    test.skip(
      test.info().project.name === 'mobile-landscape-chromium',
      'heavy sequential multi-scene cold-load starves the 2-CPU landscape shard',
    );
  });

  for (const s of OUTER) {
    test(`${s.scale}: the ${s.row} row moves the camera; the scale's Reset restores it`, async ({
      page,
    }) => {
      test.slow();
      await openExplore(page, `?context=${s.scale}`);
      await expect(page.getByTestId('scale-index-toggle')).toHaveAttribute('aria-label', /index/i, {
        timeout: 45_000,
      });
      await expect.poll(async () => (await cam(page)).flying, { timeout: 45_000 }).toBe(false);
      await page.waitForTimeout(2_500); // the cross-out dolly
      const entry = await cam(page);
      const panel = await openIndex(page, s.scale);
      await indexRow(panel, s.row).click();
      await settled(page);
      const focused = await cam(page);
      expect(dist(focused.origin, [0, 0, 0]), 'the camera panned to the member').toBeGreaterThan(1);
      expect(focused.camR, 'and eased in').toBeLessThanOrEqual(entry.camR);
      await page.getByTestId('explore-scale-reset').click();
      await settled(page);
      const back = await cam(page);
      expect(dist(back.origin, [0, 0, 0])).toBeLessThan(0.01);
      expect(back.camR).toBeCloseTo(entry.camR, 0);
    });
  }

  test('the member is a link: ?context=<scale>&pick=<id> selects it, and selecting writes the pair', async ({
    page,
  }) => {
    test.slow();
    await openExplore(page, '?context=local-group&pick=andromeda');
    await expect(
      panels(page)
        .filter({ hasText: /Andromeda/i })
        .first(),
    ).toBeVisible({
      timeout: 60_000,
    });
    await expect.poll(() => new URL(page.url()).searchParams.get('pick')).toBe('andromeda');
    expect(new URL(page.url()).searchParams.get('context')).toBe('local-group');
    await page.getByTestId('explore-scale-reset').click();
    await expect.poll(() => new URL(page.url()).searchParams.get('pick')).toBeNull();
  });
});

test.describe('/earth ORBITERS', () => {
  test('turning ORBITERS off closes the selected orbiter', async ({ page, isMobile }) => {
    await page.goto('/earth?object=iss', { waitUntil: 'networkidle' });
    await waitForHydration(page);
    const panel = panels(page)
      .filter({ hasText: /International Space Station/i })
      .first();
    await expect(panel).toBeVisible({ timeout: 30_000 });
    let orbiters: Locator;
    if (isMobile) {
      await openControlsDrawer(page);
      orbiters = page.locator('.mdg-body [data-testid="layer-orbiters"]');
    } else {
      orbiters = page.locator('.hud-controls [data-testid="layer-orbiters"]');
    }
    await orbiters.click();
    await expect(panels(page).filter({ hasText: /International Space Station/i })).toHaveCount(0);
  });
});
