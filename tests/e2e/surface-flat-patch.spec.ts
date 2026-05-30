import { test, expect, type Page } from '@playwright/test';

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

async function zoomIntoSurface(page: Page, isMobile: boolean): Promise<void> {
  // Wait for the 3D canvas to mount + sites to load before any input.
  await page.waitForLoadState('networkidle');
  const layer = page.locator('canvas.layer, div.layer').first();
  await expect(layer).toBeVisible({ timeout: 10000 });
  // Each wheel event moves camR by ~5 units (deltaY=100, factor 0.05).
  // From camR=85 to camR=30.5 = need ~11 events at deltaY=100, but the
  // smooth-zoom lerp dampens this — pump many wheels to be safe.
  const box = await layer.boundingBox();
  if (!box) throw new Error('canvas layer has no bounding box');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  if (isMobile) {
    // Mobile-chromium doesn't fire wheel events the same way; pinch via
    // two-finger gesture isn't trivial in Playwright. Skip the trigger
    // and just assert the page mounts. Full mobile coverage is a
    // follow-up once Playwright touch-pinch helpers stabilise.
    return;
  }
  await page.mouse.move(cx, cy);
  for (let i = 0; i < 25; i++) {
    await page.mouse.wheel(0, 100);
    // Small wait between wheels so the smooth-zoom lerp catches up
    // before the next event (15%/frame at 60 Hz ≈ 250 ms half-life).
    await page.waitForTimeout(80);
  }
}

test.describe('SurfaceFlatPatch — sphere → flat-patch transition', () => {
  test('mars / curiosity — deep-link, zoom in, flat patch materialises with HUD', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/mars?site=curiosity');
    await zoomIntoSurface(page, isMobile ?? false);
    if (isMobile) {
      // Mobile pinch-zoom helper not yet stable; just confirm the page
      // mounts with the Curiosity panel open (proves the data + URL
      // deep-link still work after #283 changes).
      await expect(page.getByRole('heading', { name: /curiosity/i }).first()).toBeVisible({
        timeout: 15000,
      });
      return;
    }
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

  test('mars / curiosity — back button returns to sphere', async ({ page, isMobile }) => {
    if (isMobile) test.skip();
    await page.goto('/mars?site=curiosity');
    await zoomIntoSurface(page, false);
    const flatPatch = page.locator('.flat-patch');
    await expect(flatPatch).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: /back to planet/i }).click();
    // 600 ms cross-fade + camR ramp back to 50 — flat patch unmounts.
    await expect(flatPatch).toBeHidden({ timeout: 5000 });
  });

  test('mars / curiosity — Esc dismisses the flat patch', async ({ page, isMobile }) => {
    if (isMobile) test.skip();
    await page.goto('/mars?site=curiosity');
    await zoomIntoSurface(page, false);
    const flatPatch = page.locator('.flat-patch');
    await expect(flatPatch).toBeVisible({ timeout: 8000 });
    await page.keyboard.press('Escape');
    await expect(flatPatch).toBeHidden({ timeout: 5000 });
  });

  test('moon / apollo11 — region-bound site triggers flat patch (landing-ellipse, no traverse)', async ({
    page,
    isMobile,
  }) => {
    if (isMobile) test.skip();
    await page.goto('/moon?site=apollo11');
    await zoomIntoSurface(page, false);
    const flatPatch = page.locator('.flat-patch');
    await expect(flatPatch).toBeVisible({ timeout: 8000 });
    // Apollo 11 is a stationary landing — no TRAVERSE chip.
    await expect(page.getByText(/^REGIONAL$/i)).toBeVisible();
    await expect(page.getByText(/^DETAIL$/i)).toBeVisible();
    await expect(page.getByText(/^TRAVERSE$/i)).toBeHidden();
  });

  test('no console errors during sphere → flat-patch → back flow', async ({ page, isMobile }) => {
    if (isMobile) test.skip();
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
    await zoomIntoSurface(page, false);
    await expect(page.locator('.flat-patch')).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: /back to planet/i }).click();
    await page.waitForTimeout(800); // give the cross-fade + camera-back lerp time
    expect(errors).toEqual([]);
  });
});
