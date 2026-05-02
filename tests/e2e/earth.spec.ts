import { test, expect } from '@playwright/test';

/**
 * /earth — Earth & satellites in 3D + 2D top-down view.
 *
 * Mirrors the /moon dual-mode pattern (post-v0.1.0 redesign): Three.js
 * scene by default with a 2D toggle button.
 */

test.describe('/earth', () => {
  test('default loads in 3D mode with the WebGL canvas sized', async ({ page }) => {
    await page.goto('/earth');
    const threeCanvas = page.locator('.layer:not(canvas) canvas').first();
    await expect(threeCanvas).toBeVisible({ timeout: 5_000 });
    const dim = await threeCanvas.evaluate((el: HTMLCanvasElement) => ({
      w: el.width,
      h: el.height,
    }));
    expect(dim.w).toBeGreaterThan(0);
    expect(dim.h).toBeGreaterThan(0);
  });

  test('2D toggle reveals a top-down concentric-ring view', async ({ page }) => {
    await page.goto('/earth');
    await page.getByRole('button', { name: /^2d$/i }).click();
    await expect(page.getByRole('button', { name: /^3d$/i })).toBeVisible();
    const flat = page.locator('canvas.layer');
    await expect(flat).toBeVisible({ timeout: 5_000 });
    // Wait until the 2D map has painted at least one frame (Earth disc
    // is the most reliable non-bg signal — sits dead-centre).
    await page.waitForFunction(
      () => {
        const c = document.querySelector('canvas.layer') as HTMLCanvasElement | null;
        if (!c || c.width === 0 || c.height === 0) return false;
        const ctx = c.getContext('2d');
        if (!ctx) return false;
        const data = ctx.getImageData(
          Math.floor(c.width * 0.5),
          Math.floor(c.height * 0.5),
          5,
          5,
        ).data;
        for (let i = 0; i < data.length; i += 4) {
          const isBg =
            Math.abs(data[i] - 4) < 6 &&
            Math.abs(data[i + 1] - 4) < 6 &&
            Math.abs(data[i + 2] - 12) < 8;
          if (!isBg) return true;
        }
        return false;
      },
      { timeout: 7_000 },
    );
  });

  test('clicking a satellite in 2D mode opens the panel', async ({ page }) => {
    await page.goto('/earth');
    await page.getByRole('button', { name: /^2d$/i }).click();
    const flat = page.locator('canvas.layer');
    await expect(flat).toBeVisible();
    await page.waitForTimeout(600); // let objects populate
    const box = await flat.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    // The 2D layout is: Earth at centre, sats on rings, phase = i*2.4 rad.
    // ISS is index 0 → phase 0 (sits at +X). Its radius is altToOrbitRadius(408)
    // ≈ 10.9 scene units; pxPerUnit = min(W,H)/70.
    const pxPerUnit = Math.min(box.width, box.height) / 70;
    const issR = 10.9 * pxPerUnit;
    const cx = box.width / 2 + issR;
    const cy = box.height / 2;
    await flat.click({ position: { x: cx, y: cy } });
    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible({ timeout: 5_000 });
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/earth');
    await page.waitForTimeout(800);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  /* ── v0.1.10 — GALLERY + LEARN tabs on the object detail panel ── */
  test('ISS panel exposes GALLERY tab with thumbnails (v0.1.10)', async ({ page }) => {
    await page.goto('/earth');
    await page.getByRole('button', { name: /^2d$/i }).click();
    const flat = page.locator('canvas.layer');
    await page.waitForTimeout(600);
    const box = await flat.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    const pxPerUnit = Math.min(box.width, box.height) / 70;
    const issR = 10.9 * pxPerUnit;
    await flat.click({ position: { x: box.width / 2 + issR, y: box.height / 2 } });
    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible({ timeout: 5_000 });
    const galleryTab = page.getByRole('tab', { name: /^GALLERY$/ });
    await expect(galleryTab).toBeVisible({ timeout: 5_000 });
    await galleryTab.click();
    await expect(panel.locator('.gallery-thumb').first()).toBeVisible({ timeout: 5_000 });
  });

  test('ISS panel LEARN tab shows tiered links (v0.1.10)', async ({ page }) => {
    await page.goto('/earth');
    await page.getByRole('button', { name: /^2d$/i }).click();
    const flat = page.locator('canvas.layer');
    await page.waitForTimeout(600);
    const box = await flat.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    const pxPerUnit = Math.min(box.width, box.height) / 70;
    const issR = 10.9 * pxPerUnit;
    await flat.click({ position: { x: box.width / 2 + issR, y: box.height / 2 } });
    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible({ timeout: 5_000 });
    await page.getByRole('tab', { name: /^LEARN$/ }).click();
    await expect(panel).toContainText(/INTRO/);
    await expect(panel.locator('.link-tier a').first()).toBeVisible();
  });
});
