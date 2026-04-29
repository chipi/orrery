import { test, expect } from '@playwright/test';

/**
 * /earth — Earth Orbit log-scale viewer.
 */

test.describe('/earth', () => {
  test('loads with non-blank canvas (regression for blank-canvas class of bug)', async ({
    page,
  }) => {
    await page.goto('/earth');
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 5_000 });
    await page.waitForFunction(
      () => {
        const c = document.querySelector('canvas') as HTMLCanvasElement | null;
        if (!c || c.width === 0 || c.height === 0) return false;
        const ctx = c.getContext('2d');
        if (!ctx) return false;
        // Earth at the bottom is the most reliable non-bg signal.
        const cx = Math.floor(c.width / 2);
        const cy = c.height - 60;
        const data = ctx.getImageData(cx - 4, cy - 4, 9, 9).data;
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

  test('clicking the canvas near ISS opens the panel', async ({ page }) => {
    await page.goto('/earth');
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    // ISS is at the lowest altitude — closest to Earth at the bottom.
    // altToVis(408) ≈ 38 + 54·log10(1+4.08) ≈ 38 + 54·0.708 ≈ 76.
    // Earth centre is 40 px from the bottom, so ISS sits ~76 px above
    // Earth centre = bottom - 40 - 76 ≈ bottom - 116.
    const cx = box.width / 2;
    const cy = box.height - 116;
    // Wait briefly for the canvas to draw + objects to populate.
    await page.waitForTimeout(400);
    await canvas.click({ position: { x: cx, y: cy } });
    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible();
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/earth');
    await page.waitForTimeout(800);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
