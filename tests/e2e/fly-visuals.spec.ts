import { test, expect, type Page } from '@playwright/test';
import { expandFlyHud } from './_helpers/hud-expand';

/**
 * /fly — the 2D view and the HUD grid (UXD-043, slice G2).
 *
 * The 2D canvas has no DOM text, so draw2d writes what it drew onto the canvas as data-body2d,
 * data-moon2d, data-scale2d (px per AU) and data-extent2d (AU the fit used).
 */

const FLIGHTS = {
  mars: '/fly?type=landing&dep=9800&tof=210',
  jupiter: '/fly?dest=jupiter&type=flyby&dep=9900&tof=900',
  pluto: '/fly?dest=pluto&type=flyby&dep=9900&tof=4500',
  moon: '/fly?dest=moon&type=landing&dep=9800&tof=4',
  europa: '/fly?dest=europa&type=landing&dep=9900&tof=1500',
} as const;

async function open2d(page: Page, url: string, isMobile: boolean): Promise<void> {
  await page.goto(url);
  await expandFlyHud(page);
  const skip = page.getByTestId('fly-opening-skip').first();
  await skip.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  if (await skip.isVisible().catch(() => false)) await skip.click().catch(() => {});
  const toggle = isMobile
    ? page.getByTestId('fly-view-toggle-mobile')
    : page.getByTestId('fly-view-toggle');
  const state = page.getByTestId('fly-render-state');
  // A click before hydration is lost; click again only while the view is still 3D.
  await expect(async () => {
    if ((await state.getAttribute('data-view')) !== '2d') await toggle.click({ timeout: 2_000 });
    await expect(state).toHaveAttribute('data-view', '2d', { timeout: 1_500 });
  }).toPass({ timeout: 30_000 });
}

/** Pixels of the 2D canvas that are neutral and bright: the white rings and anchors. */
async function neutralBrightPixels(page: Page): Promise<number> {
  return page.evaluate(() => {
    const c = document.querySelector('canvas.layer') as HTMLCanvasElement;
    const ctx = c.getContext('2d')!;
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      if (r >= 90 && g >= 90 && b >= 90 && Math.max(r, g, b) - Math.min(r, g, b) <= 14) n++;
    }
    return n;
  });
}

async function canvasData(page: Page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas.layer') as HTMLCanvasElement;
    return {
      body: c.dataset.body2d ?? null,
      moon: c.dataset.moon2d ?? null,
      scale: Number(c.dataset.scale2d),
      extent: Number(c.dataset.extent2d),
      w: c.width,
      h: c.height,
    };
  });
}

test.describe('/fly — 2D view draws and fits the destination', () => {
  // Each case loads /fly, switches to 2D, polls up to 15 s for the body and settles 1.5 s: most of
  // the 30 s default before any slowness. On the docker-e2e runner (2 cores, no GPU) pluto ran out
  // of time (2026-11-16, 04c3adc3262) after passing on the two runs before; the work is the test.
  test.describe.configure({ timeout: 90_000 });
  for (const name of ['mars', 'jupiter', 'pluto'] as const) {
    test(`${name}: its own body, fitted inside the canvas, rings visible`, async ({
      page,
      isMobile,
    }) => {
      await open2d(page, FLIGHTS[name], isMobile);
      await expect.poll(async () => (await canvasData(page)).body, { timeout: 15_000 }).toBe(name);
      // The scale eases (about 0.8 s); wait for it to settle before measuring.
      await page.waitForTimeout(1500);
      const d = await canvasData(page);
      expect(d.moon).toBe('');
      expect(d.extent * d.scale).toBeLessThanOrEqual(0.86 * (Math.min(d.w, d.h) / 2));
      expect(d.extent * d.scale).toBeGreaterThan(0.3 * (Math.min(d.w, d.h) / 2));
      expect(await neutralBrightPixels(page)).toBeGreaterThan(400);
    });
  }

  test('a Jupiter flight never draws Mars', async ({ page, isMobile }) => {
    await open2d(page, FLIGHTS.jupiter, isMobile);
    await expect
      .poll(async () => (await canvasData(page)).body, { timeout: 15_000 })
      .toBe('jupiter');
    for (let i = 0; i < 5; i++) {
      expect((await canvasData(page)).body).not.toBe('mars');
      await page.waitForTimeout(200);
    }
  });

  test('a Moon flight stays Earth-centred', async ({ page, isMobile }) => {
    await open2d(page, FLIGHTS.moon, isMobile);
    await expect.poll(async () => (await canvasData(page)).body, { timeout: 15_000 }).toBe('moon');
    expect(await neutralBrightPixels(page)).toBeGreaterThan(100);
  });

  test('a Europa flight draws Jupiter and the named Europa', async ({ page, isMobile }) => {
    await open2d(page, FLIGHTS.europa, isMobile);
    await expect
      .poll(async () => (await canvasData(page)).moon, { timeout: 15_000 })
      .toBe('europa');
    const d = await canvasData(page);
    expect(d.body).toBe('jupiter');
    await page.waitForTimeout(1500);
    const s = await canvasData(page);
    expect(s.extent * s.scale).toBeLessThanOrEqual(0.86 * (Math.min(s.w, s.h) / 2));
  });
});

test.describe('/fly — HUD label/value grid', () => {
  for (const [label, url] of [
    ['a long vehicle name', '/fly?mission=sputnik1'],
    ['a plan flight', FLIGHTS.jupiter],
  ] as const) {
    test(`${label}: no value starts below its label; one label column, one value column`, async ({
      page,
      isMobile: isTouch,
    }) => {
      // The left HUD rail is not shown on touch viewports (a mini HUD replaces it).
      test.skip(isTouch, 'HUD rail is desktop-only');
      await page.goto(url);
      await expandFlyHud(page);
      await expect(page.locator('.hud-identity .hud-key').first()).toBeVisible({
        timeout: 15_000,
      });
      const panels = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.hud')).map((hud) => {
          const rows = Array.from(hud.querySelectorAll(':scope > .hud-row'))
            .map((r) => {
              const k = r.querySelector('.hud-key')?.getBoundingClientRect();
              const v = r.querySelector('.hud-val')?.getBoundingClientRect();
              if (!k || !v || k.width === 0) return null;
              return {
                key: r.querySelector('.hud-key')!.textContent!.trim().replace(/\s+/g, ' '),
                kx: Math.round(k.x),
                vx: Math.round(v.x),
                dTop: Math.round(v.top - k.top),
                vRight: Math.round(v.right),
              };
            })
            .filter((r) => r !== null);
          const box = hud.getBoundingClientRect();
          return { cls: hud.className, right: Math.round(box.right), rows };
        }),
      );
      let checked = 0;
      for (const p of panels) {
        for (const r of p.rows) {
          checked++;
          expect(Math.abs(r.dTop), `${r.key}: value top vs label top`).toBeLessThanOrEqual(3);
          expect(r.vRight, `${r.key}: value inside its panel`).toBeLessThanOrEqual(p.right);
        }
        expect(new Set(p.rows.map((r) => r.kx)).size, `${p.cls}: one label x`).toBeLessThanOrEqual(
          1,
        );
        expect(new Set(p.rows.map((r) => r.vx)).size, `${p.cls}: one value x`).toBeLessThanOrEqual(
          1,
        );
      }
      expect(checked).toBeGreaterThan(4);
    });
  }

  test('no label/value block in /fly flex-wraps its rows', async ({ page }) => {
    await page.goto('/fly?mission=sputnik1');
    await expandFlyHud(page);
    const wrapping = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.hud-row, .comm-row, .row'))
        .filter((el) => {
          const s = getComputedStyle(el);
          return s.display === 'flex' && s.flexWrap !== 'nowrap';
        })
        .map((el) => el.className),
    );
    expect(wrapping).toEqual([]);
  });
});
