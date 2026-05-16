import { test, expect } from '@playwright/test';

/**
 * /moon — Moon Map (3D textured sphere + 2D equirectangular map).
 */

test.describe('/moon', () => {
  test('default loads in 3D mode with the WebGL canvas sized', async ({ page }) => {
    await page.goto('/moon');
    const threeCanvas = page.locator('.layer:not(canvas) canvas').first();
    await expect(threeCanvas).toBeVisible({ timeout: 5_000 });
    const dim = await threeCanvas.evaluate((el: HTMLCanvasElement) => ({
      w: el.width,
      h: el.height,
    }));
    expect(dim.w).toBeGreaterThan(0);
    expect(dim.h).toBeGreaterThan(0);
  });

  test('2D toggle reveals the orthographic moon discs (v0.1.8)', async ({ page }) => {
    await page.goto('/moon');
    await page.getByRole('button', { name: /^2d$/i }).click();
    await expect(page.getByRole('button', { name: /^3d$/i })).toBeVisible();
    const flat = page.locator('canvas.layer');
    await expect(flat).toBeVisible({ timeout: 5_000 });
    // Sample a pixel near the centre of the LEFT disc — should be
    // moon-grey (the radial gradient body), not bg-black.
    await page.waitForFunction(
      () => {
        const c = document.querySelector('canvas.layer') as HTMLCanvasElement | null;
        if (!c || c.width === 0 || c.height === 0) return false;
        const ctx = c.getContext('2d');
        if (!ctx) return false;
        // Near-side disc centre is at ~27% of width, ~46% of height.
        const data = ctx.getImageData(
          Math.floor(c.width * 0.27),
          Math.floor(c.height * 0.46),
          5,
          5,
        ).data;
        for (let i = 0; i < data.length; i += 4) {
          // Moon-grey: r ≈ 200, g ≈ 200, b ≈ 195 (between #cdcdc8 and
          // #7c7a76 depending on radial gradient sample).
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r > 60 && g > 60 && b > 60) return true; // anything not bg-dark
        }
        return false;
      },
      { timeout: 7_000 },
    );
  });

  test('clicking an Apollo 11 site on the near-side disc opens the panel', async ({ page }) => {
    await page.goto('/moon');
    await page.getByRole('button', { name: /^2d$/i }).click();
    const flat = page.locator('canvas.layer');
    await expect(flat).toBeVisible();
    await expect(page.locator('canvas.layer')).not.toHaveAttribute('data-sites-count', '0', {
      timeout: 10_000,
    }); // let sites populate
    const box = await flat.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    // Near-side disc center: (W * 0.27, H * 0.46), radius = min(W*0.2, H*0.42).
    // Apollo 11: lat 0.67°N, lon 23.47°E → on the near side (cos(lon) > 0).
    // Project: x = sin(lon)·cos(lat)·discR; y = -sin(lat)·discR.
    const cx = box.width * 0.27;
    const cy = box.height * 0.46;
    const discR = Math.min(box.width * 0.2, box.height * 0.42);
    const lonRad = (23.47 * Math.PI) / 180;
    const latRad = (0.67 * Math.PI) / 180;
    const px = cx + Math.sin(lonRad) * Math.cos(latRad) * discR;
    const py = cy - Math.sin(latRad) * discR;
    await flat.click({ position: { x: px, y: py } });
    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible({ timeout: 5_000 });
    // The panel should expose the STILL ON THE SURFACE block — the
    // emotional centrepiece of UXS-006.
    await expect(panel).toContainText(/STILL ON THE SURFACE/i);
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/moon');
    // Mobile takes meaningfully longer to hydrate the sites array — on
    // a Pixel-5 viewport the canvas layer settled in 11-15 s in local
    // benchmarks (vs ~3 s on desktop). 30 s gives a 2× margin without
    // masking a real hang.
    await expect(page.locator('canvas.layer')).not.toHaveAttribute('data-sites-count', '0', {
      timeout: 30_000,
    });
    expect(errors, errors.join('\n')).toEqual([]);
  });

  /* ── v0.1.10 — GALLERY + LEARN tabs on the site detail panel ── */
  test('Apollo 11 site GALLERY tab shows mission photos (v0.1.10)', async ({ page }) => {
    await page.goto('/moon');
    await page.getByRole('button', { name: /^2d$/i }).click();
    const flat = page.locator('canvas.layer');
    await expect(page.locator('canvas.layer')).not.toHaveAttribute('data-sites-count', '0', {
      timeout: 10_000,
    });
    const box = await flat.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    const cx = box.width * 0.27;
    const cy = box.height * 0.46;
    const discR = Math.min(box.width * 0.2, box.height * 0.42);
    const lonRad = (23.47 * Math.PI) / 180;
    const latRad = (0.67 * Math.PI) / 180;
    const px = cx + Math.sin(lonRad) * Math.cos(latRad) * discR;
    const py = cy - Math.sin(latRad) * discR;
    await flat.click({ position: { x: px, y: py } });
    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible({ timeout: 5_000 });
    const galleryTab = page.getByRole('tab', { name: /^GALLERY$/ });
    await expect(galleryTab).toBeVisible({ timeout: 5_000 });
    await galleryTab.click();
    // Apollo 11 site copies its 5 photos from images/missions/apollo11/
    await expect(panel.locator('.gallery-thumb').first()).toBeVisible({ timeout: 5_000 });
  });

  test('Apollo 11 site LEARN tab shows tiered links (v0.1.10)', async ({ page }) => {
    await page.goto('/moon');
    await page.getByRole('button', { name: /^2d$/i }).click();
    const flat = page.locator('canvas.layer');
    await expect(page.locator('canvas.layer')).not.toHaveAttribute('data-sites-count', '0', {
      timeout: 10_000,
    });
    const box = await flat.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    const cx = box.width * 0.27;
    const cy = box.height * 0.46;
    const discR = Math.min(box.width * 0.2, box.height * 0.42);
    const lonRad = (23.47 * Math.PI) / 180;
    const latRad = (0.67 * Math.PI) / 180;
    const px = cx + Math.sin(lonRad) * Math.cos(latRad) * discR;
    const py = cy - Math.sin(latRad) * discR;
    await flat.click({ position: { x: px, y: py } });
    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible({ timeout: 5_000 });
    await page.getByRole('tab', { name: /^LEARN$/ }).click();
    await expect(panel.locator('.link-tier a').first()).toBeVisible({ timeout: 5_000 });
  });
});
