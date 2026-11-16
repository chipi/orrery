import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { waitForHydration } from './_helpers/hydration';

/**
 * Touch contract of every interactive 3D scene (UXS interaction line "touch gestures"): one finger
 * orbits, two fingers drag to pan AND pinch to zoom. Synthesised through CDP
 * `Input.dispatchTouchEvent` (real touch events with two touch points), the camera read back
 * through each scene's read-only probe. A synthetic touch is not a phone: the spec proves the
 * handlers, not the glass.
 *
 * mobile-chromium only (hasTouch); the other projects skip.
 */

type Pt = [number, number];

// Per-scene probes. Each returns the numbers a gesture is judged by.
const PROBES = {
  explore: {
    path: '/explore',
    expr: `(() => { const s = window.__exploreCameraState?.(); return s ? [s.camR, ...s.origin, s.camT, s.camP] : null; })()`,
    zoomIdx: [0],
    panIdx: [1, 2, 3],
    orbitIdx: [4, 5],
  },
  moon: {
    path: '/moon',
    expr: `(() => { const s = window.__surfaceSceneCamera?.(); return s ? [s.camR, s.camT, s.camP, ...s.focus] : null; })()`,
    zoomIdx: [0],
    panIdx: [3, 4, 5],
    orbitIdx: [1, 2],
  },
  mars: {
    path: '/mars',
    expr: `(() => { const s = window.__surfaceSceneCamera?.(); return s ? [s.camR, s.camT, s.camP, ...s.focus] : null; })()`,
    zoomIdx: [0],
    panIdx: [3, 4, 5],
    orbitIdx: [1, 2],
  },
  earth: {
    path: '/earth',
    expr: `(() => { const s = window.__surfaceSceneCamera?.(); return s ? [s.camR, s.camT, s.camP, ...s.focus] : null; })()`,
    zoomIdx: [0],
    panIdx: [3, 4, 5],
    orbitIdx: [1, 2],
  },
  venus: {
    path: '/venus',
    expr: `(() => { const s = window.__surfaceSceneCamera?.(); return s ? [s.camR, s.camT, s.camP, ...s.focus] : null; })()`,
    zoomIdx: [0],
    panIdx: [3, 4, 5],
    orbitIdx: [1, 2],
  },
  iss: {
    path: '/iss',
    expr: `window.__orbitCamera?.() ?? null`,
    zoomIdx: null,
    panIdx: null,
    orbitIdx: null,
  },
  tiangong: {
    path: '/tiangong',
    expr: `window.__orbitCamera?.() ?? null`,
    zoomIdx: null,
    panIdx: null,
    orbitIdx: null,
  },
  fly: {
    path: '/fly',
    expr: `window.__orbitCamera?.() ?? null`,
    zoomIdx: null,
    panIdx: null,
    orbitIdx: null,
  },
} as const;

type Id = keyof typeof PROBES;

const read = (page: Page, id: Id): Promise<number[] | null> => page.evaluate(PROBES[id].expr);

async function touch(
  cdp: CDPSession,
  type: 'touchStart' | 'touchMove' | 'touchEnd',
  pts: Pt[],
): Promise<void> {
  await cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i })),
  });
}

async function gesture(cdp: CDPSession, page: Page, from: Pt[], to: Pt[]): Promise<void> {
  const steps = 14;
  await touch(cdp, 'touchStart', from);
  for (let s = 1; s <= steps; s++) {
    await touch(
      cdp,
      'touchMove',
      from.map((p, i): Pt => [
        p[0] + ((to[i][0] - p[0]) * s) / steps,
        p[1] + ((to[i][1] - p[1]) * s) / steps,
      ]),
    );
    await page.waitForTimeout(16);
  }
  await touch(cdp, 'touchEnd', []);
  await page.waitForTimeout(500);
}

const dist = (a: number[], b: number[], idx?: readonly number[] | null): number => {
  const ix = idx ?? a.map((_, i) => i);
  return Math.hypot(...ix.map((i) => b[i] - a[i]));
};

const IDS = Object.keys(PROBES) as Id[];

test.describe.configure({ timeout: 120_000 });

for (const id of IDS) {
  test.describe(`touch gestures: ${id}`, () => {
    test.beforeEach(({ hasTouch }, info) => {
      test.skip(!hasTouch || info.project.name !== 'mobile-chromium', 'mobile-chromium only');
    });

    async function open(page: Page): Promise<{ cdp: CDPSession; cx: number; cy: number }> {
      await page.goto(PROBES[id].path, { waitUntil: 'load' });
      await waitForHydration(page);
      const vp = page.viewportSize()!;
      const cx = Math.round(vp.width / 2);
      const cy = Math.round(vp.height / 2);
      await expect
        .poll(() => page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.tagName, [cx, cy]), {
          timeout: 60_000,
        })
        .toBe('CANVAS');
      await expect.poll(() => read(page, id), { timeout: 30_000 }).not.toBeNull();
      await page.waitForTimeout(1500);
      return { cdp: await page.context().newCDPSession(page), cx, cy };
    }

    test('two-finger drag pans the camera (and does not scroll the page)', async ({ page }) => {
      test.slow();
      const { cdp, cx, cy } = await open(page);
      const before = (await read(page, id))!;
      await gesture(
        cdp,
        page,
        [
          [cx - 40, cy],
          [cx + 40, cy],
        ],
        [
          [cx - 40 + 70, cy + 40],
          [cx + 40 + 70, cy + 40],
        ],
      );
      const after = (await read(page, id))!;
      const idx = PROBES[id].panIdx;
      expect(
        dist(before, after, idx),
        `${id}: camera unchanged by a two-finger drag (${JSON.stringify(before)} -> ${JSON.stringify(after)})`,
      ).toBeGreaterThan(idx ? 1e-3 : 0.5);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
    });

    test('pinch zooms the camera', async ({ page }) => {
      test.slow();
      const { cdp, cx, cy } = await open(page);
      const before = (await read(page, id))!;
      await gesture(
        cdp,
        page,
        [
          [cx - 25, cy],
          [cx + 25, cy],
        ],
        [
          [cx - 90, cy],
          [cx + 90, cy],
        ],
      );
      const after = (await read(page, id))!;
      const zi = PROBES[id].zoomIdx;
      // A zoom changes the radius where the scene reports it, else the camera position.
      const moved = zi ? Math.abs(after[zi[0]] - before[zi[0]]) : dist(before, after, [0, 1, 2]);
      expect(moved, `${id}: camera unchanged by a pinch`).toBeGreaterThan(1e-3);
    });

    test('one finger drag orbits the camera', async ({ page }) => {
      test.slow();
      const { cdp, cx, cy } = await open(page);
      const before = (await read(page, id))!;
      await gesture(cdp, page, [[cx, cy]], [[cx + 90, cy + 50]]);
      const after = (await read(page, id))!;
      const idx = PROBES[id].orbitIdx;
      // Scenes without a separate orbit-angle probe: the camera position or pan origin changes.
      expect(
        dist(before, after, idx),
        `${id}: camera unchanged by a one-finger drag`,
      ).toBeGreaterThan(1e-3);
    });
  });
}
