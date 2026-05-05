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
    await page.waitForTimeout(800); // let objects populate
    // Sweep the canvas in a grid until a click opens the right-panel.
    // Now that satellites occupy inclined orbits (v0.x.x), their 2D
    // projection isn't on a clean ring at phase=i*2.4 anymore —
    // hardcoding ISS's old position no longer hits.
    const box = await flat.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const panel = page.getByRole('complementary');
    let opened = false;
    outer: for (let r = 60; r < Math.min(box.width, box.height) / 2 - 20; r += 12) {
      for (let theta = 0; theta < Math.PI * 2; theta += Math.PI / 12) {
        await page.mouse.click(cx + Math.cos(theta) * r, cy + Math.sin(theta) * r);
        if (await panel.isVisible().catch(() => false)) {
          opened = true;
          break outer;
        }
      }
    }
    expect(opened, 'expected at least one click within the satellite cluster to open a panel').toBe(
      true,
    );
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
  // Compute ISS's 2D position from the same hash + incl math used by
  // the renderer (inclined orbits — v0.x.x — moved satellites off
  // the equatorial ring so a fixed (cx + R, cy) click no longer
  // hits ISS reliably).
  function hashToAngle(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return ((h % 360) / 360) * Math.PI * 2;
  }

  async function openIssPanel(page: import('@playwright/test').Page) {
    await page.goto('/earth');
    await page.getByRole('button', { name: /^2d$/i }).click();
    const flat = page.locator('canvas.layer');
    await page.waitForTimeout(800);
    const box = await flat.boundingBox();
    if (!box) throw new Error('canvas not found');
    // ISS: id="iss", inclination=51.64°, index 0 → phase=0.
    // 2D = projection onto equatorial plane, then node-rotation.
    const inclRad = (51.64 * Math.PI) / 180;
    const nodeRad = hashToAngle('iss');
    const pxPerUnit = Math.min(box.width, box.height) / 70;
    const orbitR = 10.9 * pxPerUnit;
    const phase = 0;
    const lx = Math.cos(phase) * orbitR;
    const lz = Math.sin(phase) * orbitR * Math.cos(inclRad);
    const cn = Math.cos(nodeRad);
    const sn = Math.sin(nodeRad);
    const issX = box.x + box.width / 2 + (lx * cn + lz * sn);
    const issY = box.y + box.height / 2 - (-lx * sn + lz * cn);
    await page.mouse.click(issX, issY);
    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible({ timeout: 5_000 });
    return panel;
  }

  test('ISS panel exposes GALLERY tab with thumbnails (v0.1.10)', async ({ page }) => {
    const panel = await openIssPanel(page);
    const galleryTab = page.getByRole('tab', { name: /^GALLERY$/ });
    await expect(galleryTab).toBeVisible({ timeout: 5_000 });
    await galleryTab.click();
    await expect(panel.locator('.gallery-thumb').first()).toBeVisible({ timeout: 5_000 });
  });

  test('ISS panel LEARN tab shows tiered links (v0.1.10)', async ({ page }) => {
    const panel = await openIssPanel(page);
    await page.getByRole('tab', { name: /^LEARN$/ }).click();
    await expect(panel).toContainText(/INTRO/);
    await expect(panel.locator('.link-tier a').first()).toBeVisible();
  });

  /* ── v0.4 — category filter chips (replaced year scrubber) ───────── */
  test('category filter chips render with correct testids', async ({ page }) => {
    await page.goto('/earth');
    await expect(page.getByTestId('layer-stations')).toBeVisible();
    await expect(page.getByTestId('layer-observatories')).toBeVisible();
    await expect(page.getByTestId('layer-constellations')).toBeVisible();
    await expect(page.getByTestId('layer-comsats')).toBeVisible();
    await expect(page.getByTestId('layer-moon-orbiters')).toBeVisible();
    await expect(page.getByTestId('layer-orbits')).toBeVisible();
  });

  test('chip toggle flips aria-pressed', async ({ page }) => {
    await page.goto('/earth');
    const stations = page.getByTestId('layer-stations');
    await expect(stations).toHaveAttribute('aria-pressed', 'true');
    await stations.click();
    await expect(stations).toHaveAttribute('aria-pressed', 'false');
  });
});
