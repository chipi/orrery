import { test, expect, type Page } from '@playwright/test';
import { clickViaEvaluate } from './_helpers/click-via-evaluate';

/**
 * SurfaceFlatPatch — sphere → flat ground-patch transition view
 * (#283 Slice 4–5, ADR-062).
 *
 * Covers the happy path on /mars + /moon: a region-bound site is
 * deep-linked, the user zooms past the sphere → flat-patch threshold
 * (camR < 30.5), and the flat patch materialises with its HUD
 * (back button, layer chips, scale bar, lat/lon). Back gesture
 * dismisses and returns to the sphere with smooth-zoom back out.
 *
 * The trigger is implemented in SurfaceScene's per-frame animation
 * loop — there's no public function to flip it; only scroll-wheel
 * (desktop) or pinch (mobile) zoom past the threshold fires it.
 * Tests scroll-wheel many times to traverse the camR 85 → 30.5 range,
 * then wait for the flat-patch wrapper to appear.
 */

async function zoomIntoSurface(page: Page): Promise<void> {
  // Wait for the 3D canvas to mount + sites to load before any input.
  await page.waitForLoadState('networkidle');
  const layer = page.locator('canvas.layer, div.layer').first();
  await expect(layer).toBeVisible({ timeout: 10000 });
  // Each wheel event moves camRTarget by ~5 units (deltaY=100, factor 0.05).
  // From camR=85 to camR=30.5 = need ~11 events, but the smooth-zoom
  // lerp (15%/frame) dampens this — pump many wheels with small waits.
  const box = await layer.boundingBox();
  if (!box) throw new Error('canvas layer has no bounding box');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  for (let i = 0; i < 25; i++) {
    // Negative deltaY = wheel UP = zoom IN per SurfaceScene's wheel handler
    // (camRTarget + deltaY * wheelK). Pushing positive deltaY zooms OUT
    // and never crosses the flat-patch threshold.
    await page.mouse.wheel(0, -100);
    // Small wait between wheels so the smooth-zoom lerp catches up
    // before the next event (15%/frame at 60 Hz ≈ 250 ms half-life).
    await page.waitForTimeout(80);
  }
}

test.describe('SurfaceFlatPatch — sphere → flat-patch transition (desktop)', () => {
  // The heaviest interactive-3D flow in the suite: it pumps ~25 wheel events and
  // relies on the rAF-driven smooth-zoom lerp to cross the flat-patch threshold.
  // On the GPU-less CI runner (SwiftShader, no hardware GL) that render loop runs
  // far slower than local, so the default 30s wall is too tight even though the
  // feature works (~5-6s local). Triple the budget for this describe block.
  test.slow();
  test.beforeEach(({ isMobile }) => {
    // Mobile-chromium can't simulate the wheel-zoom that fires the
    // sphere → flat-patch trigger. Playwright's touch-pinch helpers
    // aren't stable enough for v1. Mobile coverage is in the
    // mobile-smoke describe block below (mount + panel open only).
    test.skip(!!isMobile, 'desktop-only — pinch-zoom not simulated');
  });

  test('mars / curiosity — deep-link, zoom in, flat patch materialises with HUD', async ({
    page,
  }) => {
    await page.goto('/mars?site=curiosity');
    await zoomIntoSurface(page);
    // Flat-patch wrapper appears once camR < 30.5.
    const flatPatch = page.locator('.flat-patch');
    await expect(flatPatch).toBeVisible({ timeout: 8000 });
    // HUD elements per ADR-062.
    await expect(page.getByRole('button', { name: /back to planet/i })).toBeVisible();
    await expect(page.getByText(/^REGIONAL$/i)).toBeVisible();
    await expect(page.getByText(/^DETAIL$/i)).toBeVisible();
    // Curiosity has a traverse, so the TRAVERSE chip should be visible too.
    await expect(page.getByText(/^TRAVERSE$/i)).toBeVisible();
  });

  test('mars / curiosity — back button returns to sphere', async ({ page }) => {
    await page.goto('/mars?site=curiosity');
    await zoomIntoSurface(page);
    const flatPatch = page.locator('.flat-patch');
    await expect(flatPatch).toBeVisible({ timeout: 8000 });
    // Back-to-planet shares its HUD slot with SurfaceScene's RESET VIEW
    // chip; mouse-click would land on whichever sits on top. Helper
    // dispatches the click directly so the handler runs regardless.
    await clickViaEvaluate(page.getByRole('button', { name: /back to planet/i }));
    // 600 ms cross-fade + camR ramp back to 50 — flat patch unmounts.
    await expect(flatPatch).toBeHidden({ timeout: 5000 });
  });

  test('mars / curiosity — Esc dismisses the flat patch', async ({ page }) => {
    await page.goto('/mars?site=curiosity');
    await zoomIntoSurface(page);
    const flatPatch = page.locator('.flat-patch');
    await expect(flatPatch).toBeVisible({ timeout: 8000 });
    await page.keyboard.press('Escape');
    await expect(flatPatch).toBeHidden({ timeout: 5000 });
  });

  test('moon / apollo11 — region-bound site triggers flat patch (landing-ellipse, no traverse)', async ({
    page,
  }) => {
    await page.goto('/moon?site=apollo11');
    await zoomIntoSurface(page);
    const flatPatch = page.locator('.flat-patch');
    await expect(flatPatch).toBeVisible({ timeout: 8000 });
    // Apollo 11 is a stationary landing — no TRAVERSE chip.
    await expect(page.getByText(/^REGIONAL$/i)).toBeVisible();
    await expect(page.getByText(/^DETAIL$/i)).toBeVisible();
    await expect(page.getByText(/^TRAVERSE$/i)).toBeHidden();
  });

  test('no console errors during sphere → flat-patch → back flow', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const txt = msg.text();
        // i18n overlay 404s are intentional fallback noise per the i18n
        // overlay loader contract (#83 / ADR-069).
        if (/\/data\/i18n\//.test(txt)) return;
        errors.push(txt);
      }
    });
    await page.goto('/mars?site=curiosity');
    await zoomIntoSurface(page);
    await expect(page.locator('.flat-patch')).toBeVisible({ timeout: 8000 });
    // Back-to-planet shares its HUD slot with SurfaceScene's RESET VIEW
    // chip; mouse-click would land on whichever sits on top. Helper
    // dispatches the click directly so the handler runs regardless.
    await clickViaEvaluate(page.getByRole('button', { name: /back to planet/i }));
    await page.waitForTimeout(800); // give the cross-fade + camera-back lerp time
    expect(errors).toEqual([]);
  });
});

test.describe('SurfaceFlatPatch — mobile smoke (mount-only)', () => {
  // Mobile doesn't have a stable wheel/pinch primitive in Playwright,
  // so we can't fire the sphere → flat-patch trigger. These tests
  // verify the route mounts + the panel opens for a region-bound site
  // — the bare-minimum signal that #283's surface routes still load
  // on mobile after the SurfaceScene refactor. Full mobile pinch-zoom
  // coverage of the flat-patch flow is a future slice once Playwright
  // touch-input helpers stabilise.

  test.beforeEach(({ isMobile }) => {
    test.skip(!isMobile, 'mobile-only smoke');
  });

  test('mars / curiosity — page mounts, panel opens', async ({ page }) => {
    await page.goto('/mars?site=curiosity');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /curiosity/i }).first()).toBeVisible({
      timeout: 15000,
    });
    // Flat-patch should NOT appear (no trigger fired) — confirms the
    // sphere is the active view on mount.
    await expect(page.locator('.flat-patch')).toBeHidden();
  });

  test('moon / apollo11 — page mounts, panel opens', async ({ page }) => {
    await page.goto('/moon?site=apollo11');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /apollo 11/i }).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator('.flat-patch')).toBeHidden();
  });
});
