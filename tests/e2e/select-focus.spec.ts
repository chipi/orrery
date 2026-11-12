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
const screenOf = (page: Page, key: string): Promise<{ x: number; y: number } | null> =>
  page.evaluate((k) => window.__exploreBodyScreen!(k), key);

/** A point a click can use: on the 3D canvas itself, not under the HUD, a panel or the edge. */
async function clickablePoint(page: Page, key: string): Promise<{ x: number; y: number }> {
  let found: { x: number; y: number } | null = null;
  await expect
    .poll(
      async () => {
        const p = await screenOf(page, key);
        if (!p) return false;
        const onCanvas = await page.evaluate(
          ({ x, y }) => document.elementFromPoint(x, y)?.tagName === 'CANVAS',
          p,
        );
        if (onCanvas) found = p;
        return onCanvas;
      },
      { timeout: 30_000, message: `${key} has a point on the canvas to click` },
    )
    .toBe(true);
  return found!;
}

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
      if (isMobile) {
        // On a phone (portrait) a body panel is a full-height sheet: it covers the
        // drawer, so its layer chips cannot be reached while the panel is open.
        const tabCovered = await page.evaluate(() => {
          const tab = [...document.querySelectorAll<HTMLElement>('.mdg-tab')].find((t) =>
            /controls|layers/i.test(t.textContent ?? ''),
          );
          if (!tab) return true;
          const r = tab.getBoundingClientRect();
          const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return !top || !(top === tab || tab.contains(top));
        });
        test.skip(tabCovered, `${s.name}'s full-height sheet covers the Controls drawer`);
      }
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

  test('a 3D canvas click on a body selects it: panel, ring and camera, like a row', async ({
    page,
  }) => {
    await openExplore(page);
    const at = await clickablePoint(page, 'planet:jupiter');
    await page.mouse.click(at.x, at.y);
    await expect(
      panels(page)
        .filter({ hasText: /Jupiter/i })
        .first(),
    ).toBeVisible({
      timeout: 20_000,
    });
    await settled(page);
    const c = await cam(page);
    expect(c.ringVisible).toBe(true);
    expect(dist(c.origin, (await bodyAt(page, 'planet:jupiter'))!)).toBeLessThan(1);
  });

  test('a milestone marker on a path opens its mission (IM5)', async ({ page }) => {
    await openExplore(page, '?paths=1');
    const at = await clickablePoint(page, 'marker:voyager-2');
    await page.mouse.click(at.x, at.y);
    await expect(
      panels(page)
        .filter({ hasText: /Voyager 2/i })
        .first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('a side panel moves the look-at point into the space it leaves; closing it gives it back', async ({
    page,
  }) => {
    await openExplore(page, '?id=mars');
    const panel = panels(page).filter({ hasText: /Mars/i }).first();
    await expect(panel).toBeVisible({ timeout: 20_000 });
    // A side drawer covers the right edge and shifts the view by half its width; a bottom sheet
    // (touch portrait) covers the scene and shifts nothing.
    const cover = await panel.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const docked = r.right >= window.innerWidth - 1;
      const width = window.innerWidth - r.left;
      return docked && width <= window.innerWidth * 0.7 ? width : 0;
    });
    await expect
      .poll(async () => (await cam(page)).viewShiftPx, { timeout: 5_000 })
      .toBeCloseTo(cover / 2, 0);
    if (test.info().project.name === 'desktop-chromium')
      expect((await cam(page)).viewShiftPx, 'a desktop drawer shifts the view').toBeGreaterThan(
        100,
      );
    await panel.locator('.panel-close').click();
    await expect(panels(page)).toHaveCount(0);
    await expect.poll(async () => (await cam(page)).viewShiftPx, { timeout: 5_000 }).toBe(0);
  });

  test('a focused moon keeps its planet zoom ceiling: zooming out from Io stays in the solar system', async ({
    page,
  }) => {
    await openExplore(page, '?id=jupiter:io');
    await settled(page);
    const solar = page.getByTestId('scale-index-toggle');
    await expect(solar).toHaveAttribute('aria-label', /^Body index/);
    const vp = page.viewportSize()!;
    await page.mouse.move(vp.width * 0.3, vp.height * 0.5);
    // Io's own 50 radii (1.3 x 50 = 65 units) used to be the ceiling, where the next scroll
    // leaves the solar system. The ceiling is Jupiter's 50 radii now: scroll past 65 and stay.
    let r = (await cam(page)).camR;
    for (let i = 0; i < 120 && r <= 70; i++) {
      await page.mouse.wheel(0, 100);
      r = (await cam(page)).camR;
    }
    expect(r, 'zoomed out beyond the moon ceiling').toBeGreaterThan(70);
    await expect(solar).toHaveAttribute('aria-label', /^Body index/);
  });

  test('Reset View from the stellar neighbourhood leaves it and flies home', async ({
    page,
    isMobile,
  }) => {
    test.slow();
    await openExplore(page, '?id=mars');
    await expect(panels(page).filter({ hasText: /Mars/i }).first()).toBeVisible({
      timeout: 20_000,
    });
    await settled(page);
    await page.getByTestId('explore-scale-toggle').click();
    await page.getByTestId('explore-scale-rung-neighborhood').click();
    const toggle = page.getByTestId('scale-index-toggle');
    await expect(toggle).toHaveAttribute('aria-label', /^Stellar Neighborhood index/, {
      timeout: 45_000,
    });
    // The solar HUD is not drawn out here, but its Reset is what clears the selection and goes
    // home: the call, not the pixel, is what is under test.
    await page
      .getByTestId(isMobile ? 'explore-reset-view-mobile' : 'explore-reset-view')
      .dispatchEvent('click');
    await expect(toggle).toHaveAttribute('aria-label', /^Body index/, { timeout: 45_000 });
    await settled(page);
    const c = await cam(page);
    expect(c.ringVisible).toBe(false);
    expect(dist(c.origin, [0, 0, 0]), 'the camera is on the heliocentric view').toBeLessThan(1);
    await expect(panels(page)).toHaveCount(0);
  });

  test('Pluto and the other /plan small bodies offer Plan mission, deep-linked; a comet does not', async ({
    page,
  }) => {
    await openExplore(page, '?id=pluto');
    const pluto = panels(page).filter({ hasText: /Pluto/ }).first();
    await expect(pluto).toBeVisible({ timeout: 20_000 });
    await expect(pluto.getByTestId('plan-mission-chip')).toHaveAttribute(
      'href',
      /\/plan\?dest=pluto$/,
    );
    await openExplore(page, '?id=ceres');
    await expect(
      panels(page).filter({ hasText: /Ceres/ }).first().getByTestId('plan-mission-chip'),
    ).toHaveAttribute('href', /\/plan\?dest=ceres$/);
    await openExplore(page, '?id=halley');
    const halley = panels(page)
      .filter({ hasText: /Halley/ })
      .first();
    await expect(halley).toBeVisible({ timeout: 20_000 });
    await expect(halley.getByTestId('plan-mission-chip')).toHaveCount(0);
  });

  test('the ring follows the selection, not the panel: x closes the panel, the body stays ringed', async ({
    page,
  }) => {
    for (const id of ['sun', 'mars', 'ceres', 'jupiter:io']) {
      await openExplore(page, `?id=${id}`);
      await expect(panels(page).first()).toBeVisible({ timeout: 20_000 });
      await settled(page);
      expect((await cam(page)).ringVisible, `${id} ringed`).toBe(true);
      await panels(page).first().locator('.panel-close').click();
      await expect(panels(page)).toHaveCount(0);
      expect((await cam(page)).ringVisible, `${id} still ringed after x`).toBe(true);
    }
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

  test('the mission opened over a body panel covers it and has a back chip that returns to it', async ({
    page,
  }) => {
    await openExplore(page, '?id=mars');
    const planet = panels(page).filter({ hasText: /Mars/ }).first();
    await expect(planet).toBeVisible({ timeout: 20_000 });
    await planet.getByRole('tab', { name: /missions/i }).click();
    await planet.locator('a.mission-link[href*="/missions?id="]').first().click();
    const mission = panels(page).last();
    await expect(mission.locator('.panel-back')).toBeVisible({ timeout: 20_000 });
    await expect(planet, 'only the mission is painted').toBeHidden();
    // One panel is visible, so framing counts that one: the side drawer's width, not two.
    await expect(page.locator('aside.panel:visible')).toHaveCount(1);
    await mission.locator('.panel-back').click();
    await expect(panels(page)).toHaveCount(1);
    await expect(planet).toBeVisible();
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
  // Nothing is skipped on any project. A cold load of an outer scale is heavy on the 2-CPU
  // landscape shard (the scene chunks, the data and the cross-out dolly run in sequence), so
  // every test here is test.slow(): its 90 s budget triples instead of the test being dropped.
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

  test('M87* takes the Virgo Cluster pin first, then opens the lensing view; leaving it lands on the pin', async ({
    page,
  }) => {
    test.slow();
    await openExplore(page, '?context=virgo');
    await expect(page.getByTestId('scale-index-toggle')).toHaveAttribute('aria-label', /index/i, {
      timeout: 45_000,
    });
    await expect.poll(async () => (await cam(page)).flying, { timeout: 45_000 }).toBe(false);
    await page.waitForTimeout(2_500); // the cross-out dolly
    const panel = await openIndex(page, 'virgo');
    await indexRow(panel, 'm87-star').click();
    await expect(panels(page).filter({ hasText: /M87/ }).first()).toBeVisible({ timeout: 45_000 });
    await settled(page);
    expect(dist((await cam(page)).origin, [0, 0, 0]), 'the camera took the pin').toBeGreaterThan(1);
    await page
      .locator('aside.panel:visible')
      .filter({ hasText: /M87/ })
      .locator('.panel-close')
      .click();
    await expect(
      panels(page)
        .filter({ hasText: /Virgo Cluster/i })
        .first(),
    ).toBeVisible({
      timeout: 20_000,
    });
    expect(dist((await cam(page)).origin, [0, 0, 0]), 'and still has it').toBeGreaterThan(1);
  });

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
