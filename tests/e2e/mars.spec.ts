import { test, expect } from '@playwright/test';

/**
 * /mars — Mars Surface Map (3D textured sphere + 2D equirectangular map +
 * orbital ring layer). PRD-009 / RFC-012 / issue #40.
 *
 * V1 catalogue: 16 surface sites + 11 orbital sites. Layer chips toggle
 * surface / orbital visibility. Click → detail panel. Deep-link via
 * ?site=[id]. Cross-link to /missions when mission_id is present.
 */

test.describe('/mars', () => {
  test('default loads in 3D mode with the WebGL canvas sized', async ({ page }) => {
    await page.goto('/mars');
    const threeCanvas = page.locator('.layer:not(canvas) canvas').first();
    await expect(threeCanvas).toBeVisible({ timeout: 5_000 });
    const dim = await threeCanvas.evaluate((el: HTMLCanvasElement) => ({
      w: el.width,
      h: el.height,
    }));
    expect(dim.w).toBeGreaterThan(0);
    expect(dim.h).toBeGreaterThan(0);
  });

  test('2D toggle reveals the equirectangular Mars map', async ({ page }) => {
    await page.goto('/mars');
    await page.getByTestId('mode-toggle').click();
    await expect(page.getByTestId('mode-toggle')).toHaveText('3D');
    // The 2D canvas has class="layer" and is the only `<canvas>` in
    // the route's tree (the 3D canvas is created inside the
    // bound <div class="layer"> by Three.js but doesn't carry the
    // class itself). After the toggle it should be visible — non-zero
    // box, display !== 'none', etc.
    const flat = page.locator('canvas.layer');
    await expect(flat).toBeVisible({ timeout: 8_000 });
    const dim = await flat.evaluate((el: HTMLCanvasElement) => ({ w: el.width, h: el.height }));
    expect(dim.w).toBeGreaterThan(0);
    expect(dim.h).toBeGreaterThan(0);
  });

  test('layer chips render and toggle', async ({ page }) => {
    await page.goto('/mars');
    const surface = page.getByTestId('layer-surface');
    const orbiters = page.getByTestId('layer-orbiters');
    await expect(surface).toBeVisible();
    await expect(orbiters).toBeVisible();
    await expect(surface).toHaveAttribute('aria-pressed', 'true');
    await orbiters.click();
    await expect(orbiters).toHaveAttribute('aria-pressed', 'false');
  });

  test('?site=curiosity deep-link opens panel pre-selected', async ({ page }) => {
    await page.goto('/mars?site=curiosity');
    await page.waitForLoadState('networkidle');
    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await expect(panel).toContainText(/Curiosity/i);
  });

  test('?site=mro opens an orbital site panel', async ({ page }) => {
    await page.goto('/mars?site=mro');
    await page.waitForLoadState('networkidle');
    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await expect(panel).toContainText(/Mars Reconnaissance Orbiter|MRO/i);
    await expect(panel).toContainText(/IN ORBIT/);
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto('/mars');
    await expect(page.locator('.layer:not(canvas) canvas').first()).toBeVisible({
      timeout: 5_000,
    });
    await page.waitForTimeout(800);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
