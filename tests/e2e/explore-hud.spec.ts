import { expect, test, type Page } from '@playwright/test';
import { waitForHydration } from './_helpers/hydration';

/**
 * UXD-021, slice C3 (HUD fixes). One scale-bar rule: a bar of constant pixel width (120 px, 64 px
 * under 600 px wide) with the value beside it following the zoom, on Explore and on both Worlds
 * views; the strip box does not resize. The scale picker's ladder opens leftward at the right
 * edge and stays in the viewport, and the row clears a docked side panel. Reset is always in its
 * slot at all eight scales. The direction pills show only for their owner. The REFERENCES overlay
 * lists the eight planets in an aligned grid in the reader's language.
 *
 * Nothing is skipped on any project; a heavy load is test.slow(), not dropped. Reduced motion
 * freezes the sim clock so a moon or a craft holds still while the point is read.
 */

test.use({ reducedMotion: 'reduce' });
test.describe.configure({ timeout: 90_000 });

const barWidthFor = (viewportW: number) => (viewportW < 600 ? 64 : 120);
const stripWidthFor = (viewportW: number) => (viewportW < 768 ? 190 : 232);

async function openExplore(page: Page, query = '', path = '/explore') {
  await page.goto(`${path}${query}`);
  await waitForHydration(page);
  await page.waitForFunction(() => typeof window.__exploreCameraState === 'function', null, {
    timeout: 45_000,
  });
}

const panels = (page: Page) => page.locator('aside.panel');

/** A point a click can use: on the 3D canvas itself, not under the HUD, a panel or the edge. */
async function clickablePoint(page: Page, key: string): Promise<{ x: number; y: number }> {
  let found: { x: number; y: number } | null = null;
  await expect
    .poll(
      async () => {
        const p = await page.evaluate((k) => window.__exploreBodyScreen!(k), key);
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

const labels = (page: Page) => page.evaluate(() => window.__exploreDirectionLabels!());

test.describe('/explore scale bar: fixed width, the value follows the zoom', () => {
  test('the strip bar keeps its width and the strip box keeps its size through four zoom steps', async ({
    page,
  }) => {
    test.slow();
    await openExplore(page);
    const vw = page.viewportSize()!.width;
    const strip = page.locator('.scale-strip');
    const bar = strip.getByTestId('scale-bar');
    const label = strip.getByTestId('scale-bar-label');
    await expect(bar).toBeVisible({ timeout: 20_000 });
    const canvas = page.locator('canvas').first();
    const cb = (await canvas.boundingBox())!;
    await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2);

    const widths: number[] = [];
    const boxes: number[] = [];
    const texts = new Set<string>();
    for (let i = 0; i < 4; i++) {
      await expect(bar).toBeVisible();
      widths.push((await bar.boundingBox())!.width);
      boxes.push((await strip.boundingBox())!.width);
      texts.add((await label.textContent()) ?? '');
      await page.mouse.wheel(0, i % 2 === 0 ? -700 : 1400);
      await page.waitForTimeout(700);
    }
    for (const w of widths) expect(w).toBeGreaterThanOrEqual(barWidthFor(vw) - 1);
    for (const w of widths) expect(w).toBeLessThanOrEqual(barWidthFor(vw) + 1);
    for (const w of boxes) expect(Math.abs(w - stripWidthFor(vw))).toBeLessThanOrEqual(1);
    expect(
      texts.size,
      `the label changed with the zoom: ${[...texts].join(' | ')}`,
    ).toBeGreaterThan(1);
  });

  test('the strip box is the same size at the solar system and the stellar neighbourhood', async ({
    page,
  }) => {
    test.slow();
    await openExplore(page, '?goto=antares');
    const vw = page.viewportSize()!.width;
    const strip = page.locator('.scale-strip.neighborhood');
    await expect(strip).toBeVisible({ timeout: 45_000 });
    await expect(strip.getByTestId('scale-bar')).toBeVisible();
    const b = (await strip.boundingBox())!;
    expect(Math.abs(b.width - stripWidthFor(vw))).toBeLessThanOrEqual(1);
    const w = (await strip.getByTestId('scale-bar').boundingBox())!.width;
    expect(Math.abs(w - barWidthFor(vw))).toBeLessThanOrEqual(1);
  });

  test('the Worlds 3D bar and the flat-patch bar keep their width while the value follows the zoom', async ({
    page,
  }) => {
    test.slow();
    await page.goto('/mars?site=curiosity');
    await page.waitForLoadState('networkidle');
    const vw = page.viewportSize()!.width;
    const layer = page.locator('canvas.layer, div.layer').first();
    await expect(layer).toBeVisible({ timeout: 15_000 });
    const lb = (await layer.boundingBox())!;
    await page.mouse.move(lb.x + lb.width / 2, lb.y + lb.height / 2);

    // Zoom in until the 3D distance scale fades in (a tier-2 layer shows).
    const scale3d = page.getByTestId('distance-scale');
    for (let i = 0; i < 40 && !(await scale3d.isVisible()); i++) {
      await page.mouse.wheel(0, -60);
      await page.waitForTimeout(150);
    }
    await expect(scale3d).toBeVisible({ timeout: 15_000 });
    const w3: number[] = [];
    const t3 = new Set<string>();
    for (let i = 0; i < 4; i++) {
      if (!(await scale3d.isVisible())) break;
      w3.push((await scale3d.getByTestId('scale-bar').boundingBox())!.width);
      t3.add((await scale3d.getByTestId('scale-bar-label').textContent()) ?? '');
      await page.mouse.wheel(0, -40);
      await page.waitForTimeout(350);
    }
    expect(w3.length).toBeGreaterThanOrEqual(2);
    for (const w of w3) expect(Math.abs(w - barWidthFor(vw))).toBeLessThanOrEqual(1);
    expect(t3.size, `the 3D label changed with the zoom: ${[...t3].join(' | ')}`).toBeGreaterThan(
      1,
    );

    // On into the flat patch: its own bar, the same rule.
    const flat = page.locator('.flat-patch');
    for (let i = 0; i < 60 && !(await flat.isVisible()); i++) {
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(100);
    }
    await expect(flat).toBeVisible({ timeout: 15_000 });
    const hud = flat.locator('.hud-scale');
    const wf: number[] = [];
    const tf = new Set<string>();
    for (let i = 0; i < 4; i++) {
      wf.push((await hud.getByTestId('scale-bar').boundingBox())!.width);
      tf.add((await hud.getByTestId('scale-bar-label').textContent()) ?? '');
      await page.mouse.wheel(0, i % 2 === 0 ? -150 : 300);
      await page.waitForTimeout(500);
    }
    for (const w of wf) expect(Math.abs(w - barWidthFor(vw))).toBeLessThanOrEqual(1);
    expect(tf.size, `the flat-patch label changed: ${[...tf].join(' | ')}`).toBeGreaterThan(1);
  });
});

test.describe('/explore scale picker: the ladder stays on screen', () => {
  for (const locale of ['en', 'de', 'ru', 'ar']) {
    test(`at the solar system the ladder lies inside the viewport at 1100, 1280 and 1440 px (${locale})`, async ({
      page,
    }) => {
      test.slow();
      await openExplore(page, '', locale === 'en' ? '/explore' : `/${locale}/explore`);
      const toggle = page.getByTestId('explore-scale-toggle');
      await expect(toggle).toBeVisible({ timeout: 20_000 });
      for (const width of [1100, 1280, 1440]) {
        await page.setViewportSize({ width, height: 720 });
        await page.waitForTimeout(300);
        if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
        const rail = page.locator('[data-testid="explore-scale-picker"] .rail');
        await expect(rail).toBeVisible();
        const b = (await rail.boundingBox())!;
        expect(b.x, `${locale} ${width}: left edge`).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width, `${locale} ${width}: right edge`).toBeLessThanOrEqual(width);
        await toggle.click();
      }
    });
  }

  test('the ladder lies inside the viewport at the project size, at the solar system and at the Milky Way', async ({
    page,
  }) => {
    test.slow();
    await openExplore(page);
    const toggle = page.getByTestId('explore-scale-toggle');
    await expect(toggle).toBeVisible({ timeout: 20_000 });
    const vw = page.viewportSize()!.width;
    const rail = page.locator('[data-testid="explore-scale-picker"] .rail');
    await toggle.click();
    await expect(rail).toBeVisible();
    let b = (await rail.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(vw);
    await page.getByTestId('explore-scale-rung-milky-way').click();
    await expect(page.getByTestId('explore-scale-rung-milky-way')).toHaveAttribute(
      'aria-current',
      'true',
      { timeout: 60_000 },
    );
    await toggle.click();
    await expect(rail).toBeVisible();
    b = (await rail.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(vw);
  });

  test('with a side panel open the picker is the hit target at its centre, opens, and a rung changes scale', async ({
    page,
  }) => {
    test.slow();
    await page.setViewportSize({ width: 1280, height: 720 });
    await openExplore(page, '?id=mars');
    const panel = panels(page).filter({ hasText: /Mars/i }).first();
    await expect(panel).toBeVisible({ timeout: 20_000 });
    const toggle = page.getByTestId('explore-scale-toggle');
    const cover = () =>
      panel.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const docked = r.right >= window.innerWidth - 1;
        const width = window.innerWidth - r.left;
        return docked && width <= window.innerWidth * 0.7 ? width : 0;
      });
    // The same signal the camera framing uses: a docked drawer covers the right edge.
    await expect.poll(cover, { timeout: 5_000 }).toBeGreaterThan(300);
    await expect
      .poll(
        () =>
          toggle.evaluate((el) => {
            const r = el.getBoundingClientRect();
            const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            return !!hit?.closest('[data-testid="explore-scale-toggle"]');
          }),
        { timeout: 5_000, message: 'the scale toggle is the hit target at its centre' },
      )
      .toBe(true);
    const tb = (await toggle.boundingBox())!;
    const pb = (await panel.boundingBox())!;
    expect(tb.x + tb.width, 'the row ends left of the panel').toBeLessThanOrEqual(pb.x);
    await toggle.click();
    const rail = page.locator('[data-testid="explore-scale-picker"] .rail');
    await expect(rail).toBeVisible();
    const rb = (await rail.boundingBox())!;
    expect(rb.x).toBeGreaterThanOrEqual(0);
    expect(rb.x + rb.width).toBeLessThanOrEqual(1280);
    await page.getByTestId('explore-scale-rung-neighborhood').click();
    await expect(page.getByTestId('explore-scale-rung-neighborhood')).toHaveAttribute(
      'aria-current',
      'true',
      { timeout: 45_000 },
    );
  });

  test('opening a panel moves the row only for a docked drawer, never for a bottom sheet', async ({
    page,
  }) => {
    test.slow();
    await openExplore(page);
    const reset = page.getByTestId('explore-scale-reset');
    await expect(reset).toBeVisible({ timeout: 20_000 });
    const before = (await reset.boundingBox())!;
    await page.goto('/explore?id=mars');
    await waitForHydration(page);
    await expect(panels(page).filter({ hasText: /Mars/i }).first()).toBeVisible({
      timeout: 20_000,
    });
    await page.waitForTimeout(600);
    const after = (await reset.boundingBox())!;
    const cover = await panels(page)
      .first()
      .evaluate((el) => {
        const r = el.getBoundingClientRect();
        const docked = r.right >= window.innerWidth - 1;
        const width = window.innerWidth - r.left;
        return docked && width <= window.innerWidth * 0.7 ? width : 0;
      });
    if (cover === 0) {
      expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
    } else {
      expect(after.x, 'beside a docked drawer the row moves left, by its width').toBeLessThan(
        before.x - cover + 20,
      );
    }
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
  });
});

const RESET_SCALES = [
  { scale: 'solar-system', plain: '/explore', picked: '/explore?id=mars' },
  {
    scale: 'neighborhood',
    plain: '/explore?context=neighborhood',
    picked: '/explore?goto=antares',
  },
  {
    scale: 'milky-way',
    plain: '/explore?context=milky-way',
    picked: '/explore?galaxy=omega-centauri',
  },
  {
    scale: 'local-group',
    plain: '/explore?context=local-group',
    picked: '/explore?context=local-group&pick=andromeda',
  },
  {
    scale: 'local-sheet',
    plain: '/explore?context=local-sheet',
    picked: '/explore?context=local-sheet&pick=m81-group',
  },
  {
    scale: 'virgo',
    plain: '/explore?context=virgo',
    picked: '/explore?context=virgo&pick=virgo-cluster',
  },
  {
    scale: 'laniakea',
    plain: '/explore?context=laniakea',
    picked: '/explore?context=laniakea&pick=great-attractor',
  },
  {
    scale: 'cosmic-web',
    plain: '/explore?context=cosmic-web',
    picked: '/explore?context=cosmic-web&pick=shapley-concentration',
  },
];

test.describe('/explore Reset slot: always drawn, at all eight scales', () => {
  for (const s of RESET_SCALES) {
    test(`${s.scale}: Reset is in its slot, disabled with nothing to reset, enabled after a selection, and does not move`, async ({
      page,
    }) => {
      test.slow();
      const settle = async () => {
        await waitForHydration(page);
        await expect(page.getByTestId(`explore-scale-rung-${s.scale}`)).toHaveAttribute(
          'aria-current',
          'true',
          { timeout: 75_000 },
        );
        await page.waitForTimeout(2_500); // the cross-out dolly
      };
      const reset = page.getByTestId('explore-scale-reset');

      await page.goto(s.plain);
      await settle();
      await expect(reset).toBeVisible();
      // The stellar neighbourhood's Reset is also enabled while the Sun is out of frame.
      if (s.scale !== 'neighborhood') await expect(reset).toBeDisabled();
      const plain = (await reset.boundingBox())!;

      await page.goto(s.picked);
      await settle();
      await expect(reset).toBeEnabled({ timeout: 45_000 });
      const picked = (await reset.boundingBox())!;
      expect(Math.abs(picked.y - plain.y), 'same row').toBeLessThanOrEqual(1);
      expect(Math.abs(picked.width - plain.width), 'same size').toBeLessThanOrEqual(1);
      // At the solar system a docked side panel moves the whole row left of it; elsewhere it is flush left.
      if (s.scale !== 'solar-system') {
        expect(Math.abs(picked.x - plain.x), 'same place').toBeLessThanOrEqual(1);
      }
    });
  }
});

test.describe('/explore direction pills: only for their owner', () => {
  test("ʻOumuamua's pill is hidden at load, shown while the body is hovered and while it is selected", async ({
    page,
  }) => {
    test.slow();
    await openExplore(page);
    await expect
      .poll(async () => 'oumuamua' in (await labels(page)), { timeout: 30_000 })
      .toBe(true);
    expect((await labels(page)).oumuamua.drawn, 'hidden at load').toBe(false);

    const at = await clickablePoint(page, 'small:oumuamua');
    await page.mouse.move(at.x, at.y);
    await expect
      .poll(async () => (await labels(page)).oumuamua.drawn, { timeout: 10_000 })
      .toBe(true);
    await page.mouse.move(2, 400);
    await expect
      .poll(async () => (await labels(page)).oumuamua.drawn, { timeout: 10_000 })
      .toBe(false);

    await page.mouse.click(at.x, at.y);
    await expect(
      panels(page)
        .filter({ hasText: /umuamua/i })
        .first(),
    ).toBeVisible({
      timeout: 20_000,
    });
    await page.mouse.move(2, 400);
    await expect
      .poll(async () => (await labels(page)).oumuamua.drawn, { timeout: 10_000 })
      .toBe(true);
  });

  test('the star name on the pill is in the reader’s language (Vega in de)', async ({ page }) => {
    test.slow();
    await openExplore(page, '', '/de/explore');
    await expect
      .poll(async () => (await labels(page)).oumuamua?.text, { timeout: 30_000 })
      .toBe('← Wega');
  });

  test('a heading craft’s pill shows only while its path is highlighted', async ({ page }) => {
    test.slow();
    await openExplore(page, '?paths=1');
    const craft = ['voyager-1', 'voyager-2', 'pioneer-10', 'pioneer-11'];
    await expect
      .poll(
        async () => {
          const all = await labels(page);
          return craft.every((id) => id in all);
        },
        { timeout: 45_000 },
      )
      .toBe(true);
    for (const id of craft) {
      expect((await labels(page))[id].drawn, `${id} hidden at load`).toBe(false);
    }
    const at = await clickablePoint(page, 'marker:voyager-2');
    await page.mouse.click(at.x, at.y);
    await expect(
      panels(page)
        .filter({ hasText: /Voyager 2/i })
        .first(),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect.poll(async () => (await labels(page))['voyager-2'].drawn).toBe(true);
    expect((await labels(page))['voyager-1'].drawn, 'the other craft stays hidden').toBe(false);
  });
});

test.describe('/explore REFERENCES overlay: bodies in the canvas, an aligned grid for the names', () => {
  async function openSizes(page: Page) {
    const toggle = page
      .locator('[data-testid="sizes-toggle-compact"], [data-testid="sizes-toggle"]')
      .filter({ visible: true })
      .first();
    await expect(toggle).toBeVisible({ timeout: 20_000 });
    // The persistent footer strip can sit over the chip on a phone; the DOM click still runs its handler.
    await toggle.evaluate((el) => (el as HTMLButtonElement).click());
    await expect(page.getByTestId('sizes-legend')).toBeVisible();
  }

  test('eight cells share one top edge (two rows of four under 560 px), the open planet is marked', async ({
    page,
  }) => {
    test.slow();
    await openExplore(page, '?id=mars');
    await expect(panels(page).filter({ hasText: /Mars/i }).first()).toBeVisible({
      timeout: 20_000,
    });
    await openSizes(page);
    const cells = page.locator('[data-testid^="sizes-cell-"]');
    await expect(cells).toHaveCount(8);
    const tops: number[] = [];
    for (let i = 0; i < 8; i++) tops.push((await cells.nth(i).boundingBox())!.y);
    const rows = [...new Set(tops.map((y) => Math.round(y)))];
    expect(rows.length, `distinct top edges: ${rows.join(', ')}`).toBe(
      page.viewportSize()!.width < 560 ? 2 : 1,
    );
    for (const y of tops) {
      expect(rows.some((r) => Math.abs(r - y) <= 1)).toBe(true);
    }
    await expect(page.getByTestId('sizes-cell-mars')).toHaveAttribute('aria-current', 'true');
    await expect(page.getByTestId('sizes-cell-earth')).not.toHaveAttribute('aria-current', 'true');
    // A tap pins a cell (a phone has no hover).
    await page.getByTestId('sizes-cell-earth').evaluate((el) => (el as HTMLElement).click());
    await expect(page.getByTestId('sizes-cell-earth')).toHaveAttribute('aria-pressed', 'true');
  });

  const NAMES: Array<{ path: string; earth: string; diameter: string | RegExp }> = [
    { path: '/de/explore', earth: 'Erde', diameter: '12.742' },
    { path: '/ru/explore', earth: 'Земля', diameter: '12 742' },
    { path: '/ar/explore', earth: 'الأرض', diameter: '' },
    { path: '/ja/explore', earth: '地球', diameter: '12,742' },
  ];
  for (const n of NAMES) {
    test(`names and diameters are localised (${n.path})`, async ({ page }) => {
      test.slow();
      await openExplore(page, '', n.path);
      await openSizes(page);
      await expect(page.getByTestId('sizes-cell-earth').locator('.sizes-name')).toHaveText(n.earth);
      if (n.diameter) {
        await expect(page.getByTestId('sizes-cell-earth').locator('.sizes-km')).toContainText(
          n.diameter,
        );
      }
    });
  }
});
