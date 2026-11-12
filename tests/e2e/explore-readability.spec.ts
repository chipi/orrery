import { expect, test, type Page } from '@playwright/test';

/**
 * UX slice C2 (UXD-020): readability of the /explore pin scenes.
 *
 * Reads the scenes through the read-only probe `window.__scenePins()` (every label and ring as
 * drawn, canvas-box px; installed by the scene host, present in the preview build too) and the 2D
 * view through `window.__explore2dLabels()`. The outer levels cold-load through every smaller
 * scene, so each test is slow.
 *
 * The E2 contrast numbers (orbit lines, rings, belts at 3:1, 2:1 under a 12 % veil) are measured
 * by `node scripts/readability-probe.mjs`, which needs no test runner; this spec holds what a
 * regression would break: label size, label overlap, ring size, a steady label, an arm ring.
 */

const LEVELS = [
  'neighborhood',
  'milky-way',
  'local-group',
  'local-sheet',
  'virgo',
  'laniakea',
  'cosmic-web',
] as const;

type Snap = NonNullable<Awaited<ReturnType<typeof readSnap>>>;

async function readSnap(page: Page) {
  return page.evaluate(() => window.__scenePins?.() ?? null);
}

async function open(page: Page, level: string, locale = '') {
  await page.goto(`${locale}/explore?context=${level}`);
  await page.waitForFunction(() => window.__scenePins?.() != null, null, { timeout: 60_000 });
  // The entry camera settles after the cross-out.
  await page.waitForTimeout(2_500);
}

/** The 3D canvas box, so a probe point (canvas px) becomes a client point. */
async function canvasOrigin(page: Page) {
  return page.evaluate(() => {
    const r = [...document.querySelectorAll('canvas')]
      .map((el) => el.getBoundingClientRect())
      .filter((b) => b.width > 0 && b.height > 0)
      .sort((a, b) => b.width * b.height - a.width * a.height)[0];
    return { x: r.left, y: r.top };
  });
}

const shown = (s: Snap) => s.labels.filter((l) => l.shown);

test.describe('/explore readability (C2, UXD-020)', () => {
  test.slow();

  for (const level of LEVELS) {
    test(`${level}: every shown label is 12 px at 667, 768 and 900 px viewport heights`, async ({
      page,
    }) => {
      const width = page.viewportSize()?.width ?? 1280;
      await open(page, level);
      for (const h of [900, 768, 667]) {
        await page.setViewportSize({ width, height: h });
        await page.waitForTimeout(600);
        const s = (await readSnap(page))!;
        expect(shown(s).length, `${level} @${h}: some label is shown`).toBeGreaterThan(0);
        for (const l of shown(s)) {
          expect(l.textPx, `${level} @${h}: ${l.id}`).toBeGreaterThanOrEqual(11);
          expect(l.textPx, `${level} @${h}: ${l.id}`).toBeLessThanOrEqual(13);
        }
      }
    });

    for (const locale of ['', '/de', '/ru', '/ja']) {
      test(`${level} ${locale || '/en'}: no two shown labels overlap at the default pose`, async ({
        page,
      }) => {
        await open(page, level, locale);
        const s = (await readSnap(page))!;
        const boxes = shown(s).map((l) => ({
          id: l.id,
          l: l.x,
          r: l.x + l.w,
          t: l.y,
          b: l.y + l.h,
        }));
        const tol = 2; // px: the label's own padding is wider than its text
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i];
            const b = boxes[j];
            const hit = a.l + tol < b.r && b.l + tol < a.r && a.t + tol < b.b && b.t + tol < a.b;
            expect(hit, `${a.id} overlaps ${b.id}`).toBe(false);
          }
        }
      });
    }
  }

  test('the anchor ring is 44 px, gold-persistent, and stays 44 px when the camera moves', async ({
    page,
  }) => {
    await open(page, 'milky-way');
    const sun = async () => (await readSnap(page))!.rings.find((r) => r.id === 'sun')!;
    const before = await sun();
    expect(before.opacity).toBeGreaterThan(0.5);
    expect(before.d).toBeGreaterThan(42);
    expect(before.d).toBeLessThan(46);
    const o = await canvasOrigin(page);
    await page.mouse.move(o.x + 400, o.y + 300);
    await page.mouse.wheel(0, -600);
    await page.waitForTimeout(1_200);
    const after = await sun();
    expect(after.d).toBeGreaterThan(42);
    expect(after.d).toBeLessThan(46);
  });

  test('hovering a pin shows its ring and leaves its label where it was', async ({ page }) => {
    await open(page, 'milky-way');
    const id = 'sagittarius-a-star';
    const find = async () => {
      const s = (await readSnap(page))!;
      return { label: s.labels.find((l) => l.id === id)!, ring: s.rings.find((r) => r.id === id)! };
    };
    const rest = await find();
    expect(rest.ring.opacity).toBe(0);
    const o = await canvasOrigin(page);
    await page.mouse.move(o.x + rest.ring.cx, o.y + rest.ring.cy);
    await expect.poll(async () => (await find()).ring.opacity, { timeout: 5_000 }).toBe(1);
    const hot = await find();
    expect(hot.ring.d).toBeGreaterThan(42);
    expect(hot.ring.d).toBeLessThan(46);
    expect(Math.abs(hot.label.cx - rest.label.cx)).toBeLessThanOrEqual(1);
    expect(Math.abs(hot.label.cy - rest.label.cy)).toBeLessThanOrEqual(1);
  });

  test('every arm ring is pickable and shows its ring and label on hover, hidden label or not (MW4)', async ({
    page,
  }) => {
    await open(page, 'milky-way');
    const o = await canvasOrigin(page);
    const box = await page.evaluate(() => {
      const r = [...document.querySelectorAll('canvas')]
        .map((el) => el.getBoundingClientRect())
        .sort((a, b) => b.width * b.height - a.width * a.height)[0];
      return { w: r.width, h: r.height };
    });
    for (const id of ['perseus', 'scutum-centaurus', 'sagittarius', 'norma']) {
      const ring = (await readSnap(page))!.rings.find((r) => r.id === id);
      expect(ring, `${id}: the arm has a ring`).toBeTruthy();
      expect(ring!.cx, `${id}: ring centre is on screen (x)`).toBeGreaterThan(0);
      expect(ring!.cx, `${id}: ring centre is on screen (x)`).toBeLessThan(box.w);
      expect(ring!.cy, `${id}: ring centre is on screen (y)`).toBeGreaterThan(0);
      expect(ring!.cy, `${id}: ring centre is on screen (y)`).toBeLessThan(box.h);
      expect(ring!.opacity, `${id}: idle ring is hidden`).toBe(0);
      await page.mouse.move(o.x + ring!.cx, o.y + ring!.cy);
      await expect
        .poll(async () => (await readSnap(page))!.rings.find((r) => r.id === id)!.opacity, {
          timeout: 5_000,
          message: `${id}: hovering the ring shows it`,
        })
        .toBe(1);
      const label = (await readSnap(page))!.labels.find((l) => l.id === id)!;
      expect(label.shown, `${id}: hovering forces the label`).toBe(true);
      await page.mouse.move(o.x + 2, o.y + 2);
      await expect
        .poll(async () => (await readSnap(page))!.rings.find((r) => r.id === id)!.opacity, {
          timeout: 5_000,
        })
        .toBe(0);
    }
  });

  test('a selected pin keeps its ring and label while another pin is hovered (m1)', async ({
    page,
  }) => {
    await open(page, 'milky-way');
    const o = await canvasOrigin(page);
    const ringOf = async (id: string) => (await readSnap(page))!.rings.find((r) => r.id === id)!;
    const sel = await ringOf('perseus');
    await page.mouse.click(o.x + sel.cx, o.y + sel.cy);
    await expect.poll(async () => (await ringOf('perseus')).opacity, { timeout: 5_000 }).toBe(1);
    await page.waitForTimeout(2_000); // the focus move settles
    const other = await ringOf('norma');
    await page.mouse.move(o.x + other.cx, o.y + other.cy);
    await expect.poll(async () => (await ringOf('norma')).opacity, { timeout: 5_000 }).toBe(1);
    expect((await ringOf('perseus')).opacity).toBe(1);
    const label = (await readSnap(page))!.labels.find((l) => l.id === 'perseus')!;
    expect(label.shown).toBe(true);
  });

  test('the light-year rings are four, localised, and the 5 ly label never covers a star label', async ({
    page,
  }) => {
    await open(page, 'neighborhood', '/de');
    const s = (await readSnap(page))!;
    const ly = s.labels.filter((l) => l.id.startsWith('ly-'));
    expect(ly.map((l) => l.id).sort()).toEqual(['ly-10', 'ly-25', 'ly-5', 'ly-50']);
    const stars = shown(s).filter((l) => !l.id.startsWith('ly-'));
    for (const r of ly.filter((l) => l.shown)) {
      for (const st of stars) {
        const hit =
          r.x + 2 < st.x + st.w &&
          st.x + 2 < r.x + r.w &&
          r.y + 2 < st.y + st.h &&
          st.y + 2 < r.y + r.h;
        expect(hit, `${r.id} covers ${st.id}`).toBe(false);
      }
    }
  });

  test('the 2D view draws its text at 11 px', async ({ page, isMobile }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');
    const toggle = page.getByTestId(
      isMobile ? 'explore-view-toggle-mobile' : 'explore-view-toggle',
    );
    await expect(toggle).toBeVisible({ timeout: 10_000 });
    if (isMobile) await toggle.tap();
    else await toggle.click();
    await expect(toggle).toHaveText(/3D/i, { timeout: 10_000 });
    await page.waitForFunction(
      () => (window.__explore2dLabels?.() ?? []).some((l) => l.shown),
      null,
      {
        timeout: 20_000,
      },
    );
    const labels = await page.evaluate(() => window.__explore2dLabels!());
    expect(labels.length).toBeGreaterThan(0);
    const drawn = labels.filter((l) => l.shown);
    expect(drawn.length).toBeGreaterThan(0);
    for (const l of drawn) {
      expect(l.fontPx, l.text).toBe(11);
      expect(l.font, l.text).toContain('11px');
    }
  });
});
