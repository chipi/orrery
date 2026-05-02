import { test, expect, type Page } from '@playwright/test';

/**
 * Switch to 2D mode and wait until the canvas has actually rendered
 * something (not just been laid out). Polls a region around the canvas
 * centre — the Sun is drawn there with `#fff8e7` fill, so once any
 * non-background pixel appears, we know `draw2d()` has run at least
 * once. This avoids relying on rAF timing, which Chromium throttles
 * under parallel-test load.
 */
async function enterTwoDMode(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^2d$/i }).click();
  await expect(page.getByRole('button', { name: /^3d$/i })).toBeVisible();
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
    { timeout: 7_000 },
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

  test('2D toggle reveals a non-blank canvas (regression for 3a-4 bug)', async ({ page }) => {
    await page.goto('/explore');
    await enterTwoDMode(page);
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

  test('toggle round-trips 3D ⇄ 2D without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

    await page.goto('/explore');
    // Use the .toggle class — the text content flips between "2D" and
    // "3D" each click, which races Svelte's reactive update on slow
    // viewports if we re-resolve by name.
    const toggle = page.locator('button.toggle');
    await expect(toggle).toBeVisible();
    for (let i = 0; i < 6; i++) {
      await toggle.click();
      await page.waitForTimeout(80);
    }
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('/explore — selection and panel', () => {
  test('clicking the Sun in 2D opens the Sun panel', async ({ page }) => {
    await page.goto('/explore');
    await enterTwoDMode(page);

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
    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(/The Sun/i);
  });

  test('clicking Earth in 2D opens the planet panel with TECHNICAL data', async ({ page }) => {
    // Earth's orbitR is 113 in world space and at simT=0 it sits at
    // (W/2 + 113, H/2). simT advances at 0.04 scale, so on slow CI a
    // 6+ second test gap can rotate Earth ~90° off that spot and the
    // click misses entirely. Emulating reduced-motion freezes simT
    // (per the gate in /explore's animate loop) so the click hits a
    // deterministic position.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/explore');
    await enterTwoDMode(page);

    const canvas2d = page.locator('canvas.layer');
    const box = await canvas2d.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    await canvas2d.click({ position: { x: box.width / 2 + 113, y: box.height / 2 } });

    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(/Earth/);

    // Open the TECHNICAL tab and verify a known IAU figure shows up.
    await page.getByRole('tab', { name: /technical/i }).click();
    await expect(panel).toContainText(/SEMI-MAJOR AXIS/);
    await expect(panel).toContainText(/1\.0000 AU/);
    await expect(panel).toContainText(/ECCENTRICITY/);
  });

  test('the SIZES tab renders without errors after switching to it', async ({ page }) => {
    // Same Earth-position determinism as the test above — freeze simT
    // via reduced-motion so the click reliably hits Earth on CI.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/explore');
    await enterTwoDMode(page);
    const canvas2d = page.locator('canvas.layer');
    const box = await canvas2d.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    await canvas2d.click({ position: { x: box.width / 2 + 113, y: box.height / 2 } });
    await page.getByRole('tab', { name: /sizes/i }).click();
    // SizesCanvas renders a canvas with aria-label
    const sizesCanvas = page.getByLabel(/Planet size comparison/i);
    await expect(sizesCanvas).toBeVisible();
  });

  test('toggle stays accessible when panel is open (regression for the desktop panel-shift)', async ({
    page,
  }) => {
    await page.goto('/explore');
    await enterTwoDMode(page);
    const canvas2d = page.locator('canvas.layer');
    const box = await canvas2d.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    // Open the Sun panel.
    await canvas2d.click({ position: { x: box.width / 2, y: box.height / 2 } });
    await expect(page.getByRole('complementary')).toBeVisible();
    // Toggle button must still be visible AND clickable. On desktop the
    // .panel-shifted class moves it left by --panel-width; on mobile the
    // panel is a bottom sheet so the toggle stays put.
    const toggle = page.getByRole('button', { name: /^3d$/i });
    await expect(toggle).toBeVisible();
    await toggle.click(); // Should switch back to 3D without throwing.
  });
});

/**
 * v0.1.10 — GALLERY + LEARN tabs on PlanetPanel + SunPanel.
 */
test.describe('/explore — GALLERY + LEARN tabs (v0.1.10)', () => {
  test('Earth panel exposes GALLERY tab with thumbnails', async ({ page }) => {
    await page.goto('/explore');
    await enterTwoDMode(page);
    const canvas2d = page.locator('canvas.layer');
    const box = await canvas2d.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    await canvas2d.click({ position: { x: box.width / 2 + 113, y: box.height / 2 } });
    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible();
    const galleryTab = page.getByRole('tab', { name: /^GALLERY$/ });
    await expect(galleryTab).toBeVisible({ timeout: 5_000 });
    await galleryTab.click();
    await expect(panel.locator('.gallery-thumb').first()).toBeVisible({ timeout: 5_000 });
  });

  test('Earth panel LEARN tab shows tiered links', async ({ page }) => {
    await page.goto('/explore');
    await enterTwoDMode(page);
    const canvas2d = page.locator('canvas.layer');
    const box = await canvas2d.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    await canvas2d.click({ position: { x: box.width / 2 + 113, y: box.height / 2 } });
    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible();
    await page.getByRole('tab', { name: /^LEARN$/ }).click();
    // Earth overlay carries 5 links across intro/core/deep tiers.
    await expect(panel).toContainText(/INTRO/);
    await expect(panel.locator('.link-tier a').first()).toBeVisible();
  });

  test('Sun panel exposes GALLERY + LEARN tabs', async ({ page }) => {
    await page.goto('/explore');
    await enterTwoDMode(page);
    const canvas2d = page.locator('canvas.layer');
    const box = await canvas2d.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    await canvas2d.click({ position: { x: box.width / 2, y: box.height / 2 } });
    const panel = page.getByRole('complementary');
    await expect(panel).toContainText(/The Sun/i);
    await expect(page.getByRole('tab', { name: /^GALLERY$/ })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('tab', { name: /^LEARN$/ })).toBeVisible();
  });
});
