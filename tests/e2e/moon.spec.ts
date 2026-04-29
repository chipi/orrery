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

  test('2D toggle reveals the equirectangular flat map', async ({ page }) => {
    await page.goto('/moon');
    await page.getByRole('button', { name: /^2d$/i }).click();
    await expect(page.getByRole('button', { name: /^3d$/i })).toBeVisible();
    const flat = page.locator('canvas.layer');
    await expect(flat).toBeVisible({ timeout: 5_000 });
    // Wait until the 2D map has painted at least one frame.
    await page.waitForFunction(
      () => {
        const c = document.querySelector('canvas.layer') as HTMLCanvasElement | null;
        if (!c || c.width === 0 || c.height === 0) return false;
        const ctx = c.getContext('2d');
        if (!ctx) return false;
        // The map fill is non-#04040c; sample interior of the rect.
        const data = ctx.getImageData(
          Math.floor(c.width * 0.5),
          Math.floor(c.height * 0.4),
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

  test('clicking a 2D site opens the panel with "STILL ON THE SURFACE" block', async ({ page }) => {
    await page.goto('/moon');
    await page.getByRole('button', { name: /^2d$/i }).click();
    const flat = page.locator('canvas.layer');
    await expect(flat).toBeVisible();
    await page.waitForTimeout(500); // let sites populate
    const box = await flat.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    // Apollo 11 site: lat 0.67°N, lon 23.5°E. Map projection:
    // x = margin + ((lon + 180)/360)*mapW; y = margin + ((90-lat)/180)*mapH.
    const margin = 36;
    const mapW = box.width - margin * 2;
    const mapH = box.height - margin * 2 - 60;
    const lon = 23.5;
    const lat = 0.67;
    const cx = margin + ((lon + 180) / 360) * mapW;
    const cy = margin + ((90 - lat) / 180) * mapH;
    await flat.click({ position: { x: cx, y: cy } });
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
    await page.waitForTimeout(800);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
