import { expect, test, type Page } from '@playwright/test';
import { openDrawerTab } from './_helpers/hud-expand';
import { waitForHydration } from './_helpers/hydration';

/**
 * C7 (UXD-026): the Iconic missions legend (a one-line title with an (i), the hovered craft's
 * tagline in a card beside its row, 28 px rows, ICONIC MISSIONS first in its chip row) and the
 * boxes in the scene (`n/N · date` over the milestone name, 12 px at every zoom, no mission
 * name in them, one mission box at Today).
 */

const ROWS = '[data-testid^="paths-legend-row-"]';
const desktopOnly = () =>
  test.skip(test.info().project.name !== 'desktop-chromium', 'a fine-pointer legend');

async function openPaths(page: Page) {
  await page.goto('/explore?paths=1');
  await waitForHydration(page);
  await page.waitForFunction(() => typeof window.__iconicBoxes === 'function', null, {
    timeout: 45_000,
  });
}

const boxes = (page: Page) => page.evaluate(() => window.__iconicBoxes!());
const shownBoxes = async (page: Page) => (await boxes(page)).filter((b) => b.shown);

/** Hover a legend row until its mission's boxes are drawn: the 18 trajectories build one per
 *  frame after load, so a hover that lands before its mission exists has nothing to highlight. */
async function hoverUntilBoxes(page: Page, id: string, min = 2) {
  const row = page.getByTestId(`paths-legend-row-${id}`);
  await expect
    .poll(
      async () => {
        await page.mouse.move(1240, 600);
        await row.hover();
        await page.waitForTimeout(400);
        return (await shownBoxes(page)).length;
      },
      { timeout: 20_000 },
    )
    .toBeGreaterThanOrEqual(min);
}

test.describe('/explore — iconic legend (C7)', () => {
  test('ICONIC MISSIONS is the first chip of the layer row', async ({ page }) => {
    desktopOnly();
    await openPaths(page);
    const first = page.locator('.hud-controls .ctrl-row.chips [data-testid^="layer-"]').first();
    await expect(first).toHaveAttribute('data-testid', 'layer-paths');
  });

  test('1440x900: 18 rows and the title fit without a scrollbar, rows are 28 px', async ({
    page,
  }) => {
    desktopOnly();
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPaths(page);
    const list = page.locator('.paths-legend .paths-legend-list');
    await expect(page.locator(ROWS)).toHaveCount(18);
    const m = await list.evaluate((el) => ({
      scroll: el.scrollHeight,
      client: el.clientHeight,
    }));
    expect(m.scroll, 'the list does not scroll').toBeLessThanOrEqual(m.client + 1);
    const rowH = await page
      .locator(ROWS)
      .first()
      .evaluate((el) => el.getBoundingClientRect().height);
    expect(rowH).toBeGreaterThanOrEqual(24);
    expect(rowH).toBeLessThanOrEqual(30);
    const bottom = await page
      .locator('.paths-legend')
      .evaluate((el) => el.getBoundingClientRect().bottom);
    expect(bottom).toBeLessThanOrEqual(900);
  });

  test('a short window: only the list scrolls and the legend stays above the footer', async ({
    page,
  }) => {
    desktopOnly();
    await page.setViewportSize({ width: 1280, height: 560 });
    await openPaths(page);
    const list = page.locator('.paths-legend .paths-legend-list');
    await expect(page.locator(ROWS)).toHaveCount(18);
    await expect
      .poll(() => list.evaluate((el) => el.scrollHeight > el.clientHeight + 1))
      .toBe(true);
    const bottom = await page
      .locator('.paths-legend')
      .evaluate((el) => el.getBoundingClientRect().bottom);
    expect(bottom).toBeLessThanOrEqual(560);
    // the title stays while the list scrolls
    const titleTop = () =>
      page.locator('.paths-legend-title').evaluate((el) => el.getBoundingClientRect().top);
    const before = await titleTop();
    await list.evaluate((el) => (el.scrollTop = el.scrollHeight));
    expect(await titleTop()).toBe(before);
  });

  test('the title reads the placeholder; a hovered row shows its tagline in a card, the list stays put', async ({
    page,
  }) => {
    desktopOnly();
    await openPaths(page);
    const title = page.locator('.paths-legend-title');
    const tip = page.getByTestId('paths-legend-tip');
    await expect(title).toHaveText(/hover any spacecraft/i);
    await expect(tip).toHaveCSS('opacity', '0');
    const row = page.getByTestId('paths-legend-row-voyager-2');
    const rowTop = async () => (await row.boundingBox())!.y;
    const before = await rowTop();
    await row.hover();
    await expect(tip).toHaveCSS('opacity', '1');
    await expect(tip).toHaveText(/\S{3}/);
    expect(await rowTop(), 'no layout shift on hover').toBe(before);
    await expect(title).toHaveText(/hover any spacecraft/i);
    const legendBox = (await page.locator('.paths-legend').boundingBox())!;
    const tipBox = (await tip.boundingBox())!;
    expect(tipBox.x, 'the card is beside the legend').toBeGreaterThanOrEqual(
      legendBox.x + legendBox.width,
    );
    const rowBox = (await row.boundingBox())!;
    expect(tipBox.y, 'level with the row').toBeLessThanOrEqual(rowBox.y + rowBox.height);
    expect(tipBox.y + tipBox.height).toBeGreaterThanOrEqual(rowBox.y);
    await page.mouse.move(1240, 600);
    await expect(tip).toHaveCSS('opacity', '0');
  });

  test('the (i) opens the why-one-plane popover with the science link; Escape closes it', async ({
    page,
  }) => {
    desktopOnly();
    await openPaths(page);
    const trigger = page.getByTestId('paths-legend-why').locator('button.trigger');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    const hit = await trigger.evaluate((el) => {
      const r = getComputedStyle(el, '::after');
      return { w: parseFloat(r.width), h: parseFloat(r.height) };
    });
    expect(Math.min(hit.w, hit.h), 'a 24 px hit area').toBeGreaterThanOrEqual(24);
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const pop = page.getByTestId('why-popover');
    await expect(pop).toBeVisible();
    // the popover has no "WHY THIS NUMBER" eyebrow here
    await expect(pop.locator('.eyebrow')).toHaveCount(0);
    await expect(pop.getByText(/why this number/i)).toHaveCount(0);
    await expect(pop.getByRole('link')).toHaveAttribute(
      'href',
      /\/science\/transfers\/coplanar-trajectories$/,
    );
    const legendBox = (await page.locator('.paths-legend').boundingBox())!;
    const popBox = (await pop.boundingBox())!;
    expect(popBox.x, 'the popover is not clipped by the legend').toBeGreaterThanOrEqual(
      legendBox.x - 1,
    );
    expect(popBox.x + popBox.width).toBeLessThanOrEqual(legendBox.x + legendBox.width + 1);
    await page.keyboard.press('Escape');
    await expect(pop).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('the phone drawer has the title and the (i), no hover card', async ({ page }) => {
    test.skip(!test.info().project.name.startsWith('mobile'), 'touch only');
    await page.goto('/explore');
    await waitForHydration(page);
    await openDrawerTab(page, /missions/i);
    const body = page.locator('.mdg-body');
    await expect(body.locator('.paths-legend-title')).toHaveText(/hover any spacecraft/i);
    await expect(body.getByTestId('paths-legend-why').locator('button.trigger')).toBeVisible();
    // AGENTS.md touch floor: the (i) keeps a 44 x 44 px hit area
    const hit = await body
      .getByTestId('paths-legend-why')
      .locator('button.trigger')
      .evaluate((el) => {
        const r = getComputedStyle(el, '::after');
        return Math.min(parseFloat(r.width), parseFloat(r.height));
      });
    expect(hit).toBeGreaterThanOrEqual(44);
    await expect(body.locator(ROWS)).toHaveCount(18);
    await expect(body.getByTestId('paths-legend-tip')).toHaveCount(0);
  });
});

test.describe('/explore — iconic milestone boxes (C7)', () => {
  test('a highlighted mission shows n/N · date over the name, 12 px, no mission name, one mission box', async ({
    page,
  }) => {
    desktopOnly();
    await openPaths(page);
    await hoverUntilBoxes(page, 'voyager-2');
    const all = await shownBoxes(page);
    const milestones = all.filter((b) => b.kind === 'milestone');
    const mission = all.filter((b) => b.kind === 'mission');
    expect(mission, 'the mission name appears once').toHaveLength(1);
    expect(mission[0].header).toBe('VOYAGER 2');
    expect(milestones.length).toBeGreaterThan(0);
    for (const b of milestones) {
      expect(b.header).toMatch(/^\d+\/\d+ · \d{4}(-\d{2}){0,2}$/);
      expect(b.header + b.lines.join(' ')).not.toMatch(/voyager/i);
      expect(b.n).toBeGreaterThanOrEqual(1);
      expect(b.n).toBeLessThanOrEqual(b.total);
    }
    for (const b of all) expect(b.textPx).toBeCloseTo(12, 0);
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i];
        const b = all[j];
        const apart =
          a.x + a.w <= b.x + 0.5 ||
          b.x + b.w <= a.x + 0.5 ||
          a.y + a.h <= b.y + 0.5 ||
          b.y + b.h <= a.y + 0.5;
        expect(apart, `${a.header} / ${b.header} do not overlap`).toBe(true);
      }
    }
  });

  test('a box keeps its pixel size when the camera zooms in and out (the IM2 regression)', async ({
    page,
  }) => {
    desktopOnly();
    test.slow();
    await openPaths(page);
    const row = page.getByTestId('paths-legend-row-voyager-2');
    await hoverUntilBoxes(page, 'voyager-2');
    const sizeByHeader = async () => {
      // hover is held by the pointer on the row: keep it there while the wheel zooms over the canvas
      return new Map((await shownBoxes(page)).map((b) => [b.header, { w: b.w, h: b.h }]));
    };
    const base = await sizeByHeader();
    const vp = page.viewportSize()!;
    for (const dy of [-500, 1400]) {
      await page.mouse.move(vp.width / 2, vp.height / 2);
      await page.mouse.wheel(0, dy);
      await page.waitForTimeout(900);
      // the pointer left the row: highlight again through the legend
      await row.hover();
      await page.waitForTimeout(300);
      const now = await sizeByHeader();
      let compared = 0;
      for (const [header, size] of now) {
        const was = base.get(header);
        if (!was) continue;
        compared++;
        expect(Math.abs(size.w - was.w), `${header} width`).toBeLessThan(1.5);
        expect(Math.abs(size.h - was.h), `${header} height`).toBeLessThan(1.5);
      }
      expect(compared, `boxes compared after wheel ${dy}`).toBeGreaterThan(0);
    }
  });

  for (const id of ['voyager-1', 'voyager-2', 'pioneer-10', 'pioneer-11']) {
    test(`${id}: the mission box and the heading pill do not overlap (NV6)`, async ({ page }) => {
      desktopOnly();
      test.slow();
      await openPaths(page);
      // the outbound craft are past the default view: zoom out until Today is on screen
      const vp = page.viewportSize()!;
      await page.mouse.move(vp.width / 2, vp.height / 2);
      await page.mouse.wheel(0, 2200);
      await page.waitForTimeout(1500);
      await hoverUntilBoxes(page, id, 1);
      await expect
        .poll(
          async () =>
            (await page.evaluate((k) => window.__exploreDirectionLabels!()[k]?.drawn, id)) ?? false,
        )
        .toBe(true);
      const pill = await page.evaluate((k) => window.__exploreDirectionLabels!()[k], id);
      const mission = (await boxes(page)).find((b) => b.kind === 'mission' && b.missionId === id)!;
      expect(mission.shown, 'the mission box is drawn').toBe(true);
      const apart =
        mission.x + mission.w <= pill.x + 0.5 ||
        pill.x + pill.w <= mission.x + 0.5 ||
        mission.y + mission.h <= pill.y + 0.5 ||
        pill.y + pill.h <= mission.y + 0.5;
      expect(apart, `pill ${JSON.stringify(pill)} / box ${JSON.stringify(mission)}`).toBe(true);
    });
  }

  test('the live region reads the tagline after the pointer rests, not on a sweep', async ({
    page,
  }) => {
    desktopOnly();
    await openPaths(page);
    const live = page.getByTestId('paths-legend-live');
    await expect(live).toHaveText('');
    const a = page.getByTestId('paths-legend-row-pioneer-10');
    const b = page.getByTestId('paths-legend-row-voyager-2');
    await a.hover();
    await b.hover();
    await expect(live).toHaveText(/\S{3}/, { timeout: 3000 });
    await expect(page.getByTestId('paths-legend-tip')).toHaveAttribute('aria-hidden', 'true');
  });
});

test.describe('/explore — the orbit ruler folds under the open legend (UXD-026)', () => {
  const toggle = (page: Page) => page.getByTestId('ruler-toggle');
  const stored = (page: Page) =>
    page.evaluate(() => localStorage.getItem('orrery.ruler.collapsed'));

  for (const saved of ['0', '1'] as const) {
    test(`legend open: ruler folded; closed: its own state (saved ${saved}) and the saved choice is untouched`, async ({
      page,
    }) => {
      desktopOnly();
      await page.addInitScript((v) => localStorage.setItem('orrery.ruler.collapsed', v), saved);
      await page.goto('/explore');
      await waitForHydration(page);
      const open = saved === '0';
      await expect(toggle(page)).toHaveAttribute('aria-expanded', String(open));
      const chip = page.getByTestId('layer-paths');
      await chip.click();
      await expect(page.locator('.paths-legend')).toBeVisible();
      await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
      // a click on the folded header does not unfold it nor overwrite the choice
      await toggle(page).click({ force: true });
      await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
      expect(await stored(page)).toBe(saved);
      await chip.click();
      await expect(page.locator('.paths-legend')).toBeHidden();
      await expect(toggle(page)).toHaveAttribute('aria-expanded', String(open));
      expect(await stored(page)).toBe(saved);
    });
  }

  for (const [w, h] of [
    [1440, 900],
    [1366, 768],
    [1280, 720],
  ] as const) {
    test(`${w}x${h}: the legend stops above the lower-left stack; the time dock stays clickable`, async ({
      page,
    }) => {
      desktopOnly();
      await page.setViewportSize({ width: w, height: h });
      await openPaths(page);
      await expect(page.locator(ROWS)).toHaveCount(18);
      await page.waitForTimeout(600);
      const list = page.locator('.paths-legend .paths-legend-list');
      const m = await list.evaluate((el) => [el.scrollHeight, el.clientHeight]);
      if (h >= 900)
        expect(m[0], `list ${m}: 18 rows without scrolling`).toBeLessThanOrEqual(m[1] + 1);
      else expect(m[0], `list ${m}: scrolls inside`).toBeGreaterThan(m[1] + 1);
      const legendBottom = await page
        .locator('.paths-legend')
        .evaluate((el) => el.getBoundingClientRect().bottom);
      for (const sel of [
        '.ruler-desktop-only .ruler',
        '[data-testid=sizes-toggle]',
        '.time-controls',
      ]) {
        const top = await page
          .locator(sel)
          .first()
          .evaluate((el) => el.getBoundingClientRect().top);
        expect(legendBottom, `legend bottom above ${sel}`).toBeLessThanOrEqual(top);
      }
      await expect(page.getByTestId('ruler-toggle')).toHaveAttribute('aria-expanded', 'false');
      const play = page.getByTestId('explore-time-play');
      const hit = await play.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!at && (at === el || el.contains(at));
      });
      expect(hit, 'the play button is the element under its centre').toBe(true);
    });
  }
});

test.describe('/de — the (i) popover does not cover a three-line title (UXD-026)', () => {
  test('the popover starts below the legend head', async ({ page }) => {
    desktopOnly();
    await page.goto('/de/explore?paths=1');
    await waitForHydration(page);
    const trigger = page.getByTestId('paths-legend-why').locator('button.trigger');
    await expect(trigger).toBeVisible({ timeout: 30_000 });
    await trigger.click();
    const pop = page.getByTestId('why-popover');
    await expect(pop).toBeVisible();
    const title = (await page.locator('.paths-legend-title').boundingBox())!;
    const p = (await pop.boundingBox())!;
    expect(title.height, 'the German title wraps to more than one line').toBeGreaterThan(30);
    expect(p.y, 'popover top is below the title bottom').toBeGreaterThanOrEqual(
      title.y + title.height,
    );
  });
});

test.describe('/ar — the (i) popover in a right-to-left page (UXD-026)', () => {
  test('opens inside the viewport and inside the legend', async ({ page }) => {
    desktopOnly();
    await page.goto('/ar/explore?paths=1');
    await waitForHydration(page);
    const trigger = page.getByTestId('paths-legend-why').locator('button.trigger');
    await expect(trigger).toBeVisible({ timeout: 30_000 });
    await trigger.click();
    const pop = page.getByTestId('why-popover');
    await expect(pop).toBeVisible();
    const vp = page.viewportSize()!;
    const p = (await pop.boundingBox())!;
    const l = (await page.locator('.paths-legend').boundingBox())!;
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.y).toBeGreaterThanOrEqual(0);
    expect(p.x + p.width).toBeLessThanOrEqual(vp.width);
    expect(p.y + p.height).toBeLessThanOrEqual(vp.height);
    const t = (await page.locator('.paths-legend-title').boundingBox())!;
    expect(p.y, 'below the title (RTL)').toBeGreaterThanOrEqual(t.y + t.height);
    expect(p.x, 'inside the legend (start)').toBeGreaterThanOrEqual(l.x - 1);
    expect(p.x + p.width, 'inside the legend (end)').toBeLessThanOrEqual(l.x + l.width + 1);
  });
});
