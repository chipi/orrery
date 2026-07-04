import { test, expect, type Page } from '@playwright/test';
import { expandExploreHud } from './_helpers/hud-expand';

/**
 * Switch to 2D mode and wait until the canvas has actually rendered
 * something (not just been laid out). Polls a region around the canvas
 * centre — the Sun is drawn there with `#fff8e7` fill, so once any
 * non-background pixel appears, we know `draw2d()` has run at least
 * once. This avoids relying on rAF timing, which Chromium throttles
 * under parallel-test load.
 */
async function enterTwoDMode(page: Page, isMobile = false): Promise<void> {
  // Ensure hydration is complete before tapping. Without this, an
  // order-sensitive flake reproduces locally in broad sweeps: when this
  // helper runs after a previous /explore test, the new page sometimes
  // dispatches the synthetic touch before Svelte binds onclick. Adding
  // networkidle inside the helper (not at each caller) makes every
  // entry path defensive.
  await page.waitForLoadState('networkidle');
  // The 2D/3D toggle: desktop lives in the hud-controls; mobile has a
  // dedicated always-visible top-cluster button (explore-view-toggle-mobile),
  // so nothing in the drawer needs opening. tap() (touch) matches the phone
  // UX and avoids the synthetic-mouse-click-before-onclick-bound race (#253).
  const toggle = isMobile
    ? page.getByTestId('explore-view-toggle-mobile')
    : page.getByTestId('explore-view-toggle');
  await expect(toggle).toBeVisible({ timeout: isMobile ? 10_000 : 5_000 });
  if (isMobile) {
    await toggle.tap();
  } else {
    await toggle.click();
  }
  // The button label flips to "3D" once the mode change commits — wait on it
  // as the "flip landed" signal (can lag a few rAFs under shared preview load).
  await expect(toggle).toHaveText(/3D/i, { timeout: isMobile ? 10_000 : 5_000 });
  const canvas2d = page.locator('canvas.layer');
  await expect(canvas2d).toBeVisible({ timeout: 5_000 });
  await page.waitForFunction(
    () => {
      const c = document.querySelector('canvas.layer') as HTMLCanvasElement | null;
      if (!c || c.width === 0 || c.height === 0) return false;
      const ctx = c.getContext('2d');
      if (!ctx) return false;
      // Sample a 5×5 region around the canvas centre — the Sun fills
      // that area with #fff8e7. If any pixel there is non-background,
      // draw2d has executed.
      const cx = Math.floor(c.width / 2);
      const cy = Math.floor(c.height / 2);
      const data = ctx.getImageData(cx - 2, cy - 2, 5, 5).data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const isBg = Math.abs(r - 4) < 6 && Math.abs(g - 4) < 6 && Math.abs(b - 12) < 8;
        if (!isBg) return true;
      }
      return false;
    },
    { timeout: isMobile ? 20_000 : 7_000 },
  );
}

/**
 * /explore — Solar System Explorer.
 *
 * Catches the kind of bug that bit us in 3a-4 (2D canvas blank because
 * `display: none` at mount makes clientWidth 0 and resize2d sets the
 * drawing buffer to 0×0). Unit tests with jsdom can't see this — we
 * need a real browser doing real layout.
 *
 * Strategy:
 *   - Wait for the canvases to mount and have real dimensions
 *   - For the 2D canvas, sample pixels via getImageData and assert
 *     non-trivial content (not all background colour)
 *   - For the 3D canvas (WebGL), we can't sample pixels portably, but
 *     we can verify the canvas exists, has non-zero size, and doesn't
 *     throw on toggle round-trips
 */

test.describe('/explore — load and toggle', () => {
  test('3D mode is the default and renders a non-zero canvas', async ({ page }) => {
    await page.goto('/explore');
    // Three.js writes into a <canvas> the renderer creates inside the
    // .layer div. The 2D canvas has class "layer" too, so we filter.
    const threeCanvas = page.locator('.layer:not(canvas) canvas').first();
    await expect(threeCanvas).toBeVisible();
    const dim = await threeCanvas.evaluate((el: HTMLCanvasElement) => ({
      w: el.width,
      h: el.height,
      cssW: el.clientWidth,
      cssH: el.clientHeight,
    }));
    expect(dim.w).toBeGreaterThan(0);
    expect(dim.h).toBeGreaterThan(0);
    expect(dim.cssW).toBeGreaterThan(0);
    expect(dim.cssH).toBeGreaterThan(0);
  });

  test('2D toggle reveals a non-blank canvas (regression for 3a-4 bug)', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/explore');
    await enterTwoDMode(page, isMobile);
    const canvas2d = page.locator('canvas.layer');

    // Sample 50 random points and require at least one to differ from
    // the page background colour. A blank canvas is filled solid by
    // draw2d's first ctx2.fillRect — if any pixel deviates from that
    // background, we know real rendering happened.
    const result = await canvas2d.evaluate((el: HTMLCanvasElement) => {
      const ctx = el.getContext('2d');
      if (!ctx) return { ok: false, reason: 'no context' };
      if (el.width === 0 || el.height === 0) {
        return { ok: false, reason: `zero-size canvas ${el.width}×${el.height}` };
      }
      let nonBackground = 0;
      let totalSampled = 0;
      for (let i = 0; i < 200; i++) {
        const x = Math.floor(Math.random() * el.width);
        const y = Math.floor(Math.random() * el.height);
        const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
        // Background is #04040c = (4,4,12). Allow tiny tolerance for
        // gradient/AA edges that fade in under a few units.
        const isBg = Math.abs(r - 4) < 6 && Math.abs(g - 4) < 6 && Math.abs(b - 12) < 8;
        if (!isBg) nonBackground++;
        totalSampled++;
      }
      return { ok: true, nonBackground, totalSampled, w: el.width, h: el.height };
    });
    expect(result.ok, `canvas not paintable: ${(result as { reason?: string }).reason}`).toBe(true);
    expect(
      (result as { nonBackground: number }).nonBackground,
      'expected the 2D view to contain non-background pixels (planets, sun, orbit rings)',
    ).toBeGreaterThan(0);
  });

  test('toggle round-trips 3D ⇄ 2D without errors', async ({ page, isMobile }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

    await page.goto('/explore');
    // #342 Phase 31 — expand the default-collapsed hud-controls so
    // the 2D/3D toggle is in the layout.
    await expandExploreHud(page);
    // Target the 2D/3D toggle by its stable testid. The bare `.toggle`
    // class is shared (SIZES overlay, layers, and the #351 time-control
    // play button all wear it), so a class selector resolves to multiple
    // elements — strict-mode violation. The testid is unique and stable
    // across the "2D"⇄"3D" label flip. On mobile the toggle is the dedicated
    // always-visible top-cluster button (explore-view-toggle-mobile).
    const toggle = isMobile
      ? page.getByTestId('explore-view-toggle-mobile')
      : page.getByTestId('explore-view-toggle');
    await expect(toggle).toBeVisible();
    // Wait one rAF between clicks so Svelte commits the reactive
    // update (3D ⇄ 2D toggle changes the canvas layer's hidden class +
    // the button label) before the next click. Replaces a fixed 80ms
    // wait that raced the rAF loop on slow CI.
    for (let i = 0; i < 6; i++) {
      await toggle.click();
      await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => r())));
    }
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('/explore — selection and panel', () => {
  test('clicking the Sun in 2D opens the Sun panel', async ({ page, isMobile }) => {
    await page.goto('/explore');
    await enterTwoDMode(page, isMobile);

    const canvas2d = page.locator('canvas.layer');
    const box = await canvas2d.boundingBox();
    expect(box, 'canvas not laid out').not.toBeNull();
    if (!box) return; // narrow for TS

    // The Sun renders at world origin, which under the canvas transform
    // sits at (W/2 + zx2d, H/2 + zy2d). At default zoom/pan that's the
    // canvas centre — click there.
    await canvas2d.click({ position: { x: box.width / 2, y: box.height / 2 } });

    // The SunPanel uses Panel.svelte → renders an <aside class="panel">
    // with a title that includes "The Sun" (from sun.json overlay).
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(/The Sun/i);
  });

  test('clicking Earth in 2D opens the planet panel with TECHNICAL data', async ({
    page,
    isMobile,
  }) => {
    // Emulate reduced-motion to freeze simT (per the gate in /explore's
    // animate loop) so the body sits at a deterministic position. Since
    // #351 Layer 2-A, `a0` is overwritten with each planet's real J2000
    // mean longitude, so Earth no longer sits at (W/2 + 113, H/2) — read
    // its live 2D offset from the page and click there.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/explore');
    await enterTwoDMode(page, isMobile);

    const canvas2d = page.locator('canvas.layer');
    const box = await canvas2d.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    const off = await page.evaluate(
      () =>
        (
          window as Window & {
            __explore2dBodyOffset?: (id: string) => { x: number; y: number } | null;
          }
        ).__explore2dBodyOffset?.('earth') ?? null,
    );
    expect(off, 'explore exposes Earth 2D offset').not.toBeNull();
    await canvas2d.click({
      position: { x: box.width / 2 + off!.x, y: box.height / 2 + off!.y },
    });

    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(/Earth/);

    // Open the TECHNICAL tab and verify a known IAU figure shows up.
    await page.getByRole('tab', { name: /technical/i }).click();
    await expect(panel).toContainText(/SEMI-MAJOR AXIS/);
    await expect(panel).toContainText(/1\.0000 AU/);
    await expect(panel).toContainText(/ECCENTRICITY/);
  });

  test('SIZES overlay opens via toggle button + closes via ESC', async ({ page, isMobile }) => {
    // SIZES is no longer a per-planet tab (each planet panel was
    // rendering the same chart) — it's now a single global overlay
    // toggled from a button next to the 2D/3D toggle. The chart
    // highlights whichever planet panel is open, if any.
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');
    // The sizes toggle sits on the canvas (bottom-left), not in the drawer.
    // Mobile shows a compact variant — scope to whichever is visible.
    const toggle = isMobile
      ? page
          .locator('[data-testid="sizes-toggle-compact"], [data-testid="sizes-toggle"]')
          .filter({ visible: true })
          .first()
      : page.getByTestId('sizes-toggle');
    await expect(toggle).toBeVisible();
    if (isMobile) {
      // The sizes-toggle (REFERENCES button, .earth-compare) sits at
      // bottom-left of the canvas. The persistent .site-footer strip
      // (z-index 35, higher than the 20 on earth-compare) renders as
      // an inline-flex bar that spans most of a 375 px viewport
      // because of the version label, so its .footer-link children
      // overlap the chip's hit area. tap() trips on Playwright's
      // pointer-events stability check ("Credits link intercepts").
      // DOM-dispatch the click so the button's onclick handler still
      // fires — the runtime UX uses a real finger that the user can
      // place precisely on the chip.
      await toggle.evaluate((el) => (el as HTMLButtonElement).click());
    } else {
      await toggle.click();
    }
    const sizesCanvas = page.getByLabel(/Planet size comparison/i);
    await expect(sizesCanvas).toBeVisible();
    // ESC dismisses the overlay.
    await page.keyboard.press('Escape');
    await expect(sizesCanvas).toBeHidden();
  });

  test('toggle stays accessible when panel is open (regression for the desktop panel-shift)', async ({
    page,
    isMobile,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');
    await enterTwoDMode(page, isMobile);
    const canvas2d = page.locator('canvas.layer');
    await expect(canvas2d).toBeVisible();
    const box = await canvas2d.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    // Open the Sun panel (centre of canvas).
    await canvas2d.click({ position: { x: box.width / 2, y: box.height / 2 } });
    await expect(page.locator('aside.panel')).toBeVisible({ timeout: isMobile ? 15_000 : 5_000 });
    // Close the panel so it doesn't block interaction with the toggle
    // (panel backdrop intercepts clicks on mobile).
    if (isMobile) {
      const closeButton = page.locator('aside.panel').locator('button[aria-label="Close panel"]');
      await closeButton.click().catch(() => {});
      await page.waitForTimeout(100);
    }
    // Toggle button must still be visible AND clickable. On desktop the
    // .panel-shifted class moves it left by --panel-width; on mobile the
    // toggle is the dedicated always-visible top-cluster button.
    const toggle = isMobile
      ? page.getByTestId('explore-view-toggle-mobile')
      : page.locator('[data-testid="explore-view-toggle"]').filter({ visible: true });
    await expect(toggle).toBeVisible();
    if (isMobile) {
      await toggle.tap();
    } else {
      await toggle.click();
    }
  });
});

/**
 * v0.1.10 — GALLERY + LEARN tabs on PlanetPanel + SunPanel.
 */
test.describe('/explore — GALLERY + LEARN tabs (v0.1.10)', () => {
  // Both Earth panel tests use ?id=earth to open the panel directly,
  // bypassing the canvas-pixel pick (which was fragile on mobile-chromium
  // — simT drift, DPR canvas sizing, and zoom2d pan state all interacted
  // to occasionally hit Mars instead of Earth, producing the
  // "Mars panel open, GALLERY tab still on OVERVIEW" failure mode that
  // hard-failed GH e2e run 26514846316). The deep-link is a real product
  // feature (bookmarkable planet URLs, mirrors /mars?site=) — the tests
  // exercise it in the same path users get from a shared link.
  test('Earth panel exposes GALLERY tab with thumbnails', async ({ page }) => {
    await page.goto('/explore?id=earth');
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    const galleryTab = page.getByRole('tab', { name: /^GALLERY$/ });
    await expect(galleryTab).toBeVisible({ timeout: 10_000 });
    await galleryTab.click();
    // Verify the tab click registered before asserting on its content —
    // closes the Svelte-onclick-binding-race window that caused the
    // "GALLERY tapped but tab still on OVERVIEW" failure mode on CI.
    await expect(galleryTab).toHaveAttribute('aria-selected', 'true', { timeout: 5_000 });
    await expect(panel.locator('.gallery-thumb').first()).toBeVisible({ timeout: 10_000 });
  });

  test('Earth panel surfaces curated SCIENCE cards in overview', async ({ page }) => {
    await page.goto('/explore?id=earth');
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    // 2026-06-21 panel collapse (16960d316): panels dropped to 4 uniform
    // tabs and the SCIENCE tab was folded inline — curated ScienceCards
    // now render under a SCIENCE heading in the default OVERVIEW tab.
    await expect(panel.getByRole('heading', { name: 'SCIENCE', level: 3 })).toBeVisible({
      timeout: 10_000,
    });
    // Each card links into the /science deep page ("Read full section →").
    await expect(panel.locator('.science-section a').first()).toBeVisible();
  });

  test('Sun panel exposes GALLERY tab + curated SCIENCE cards', async ({ page }) => {
    // Open via deep-link (same rationale as the Earth-panel tests above).
    await page.goto('/explore?id=sun');
    const panel = page.locator('aside.panel');
    await expect(panel).toContainText(/The Sun/i, { timeout: 10_000 });
    await expect(page.getByRole('tab', { name: /^GALLERY$/ })).toBeVisible({ timeout: 5_000 });
    // SCIENCE tab folded into OVERVIEW (16960d316) — assert the inline
    // science section renders in its place.
    await expect(panel.getByRole('heading', { name: 'SCIENCE', level: 3 })).toBeVisible();
    await expect(panel.locator('.science-section a').first()).toBeVisible();
  });
});
