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
    const traverses = page.getByTestId('layer-traverses');
    await expect(surface).toBeVisible();
    await expect(orbiters).toBeVisible();
    await expect(traverses).toBeVisible();
    await expect(surface).toHaveAttribute('aria-pressed', 'true');
    await expect(traverses).toHaveAttribute('aria-pressed', 'true');
    await orbiters.click();
    await expect(orbiters).toHaveAttribute('aria-pressed', 'false');
    await traverses.click();
    await expect(traverses).toHaveAttribute('aria-pressed', 'false');
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

  test('curiosity panel surfaces FULL MISSION CARD cross-link', async ({ page }) => {
    await page.goto('/mars?site=curiosity');
    // Drop `waitForLoadState('networkidle')` — /mars keeps streaming
    // canvas textures + traverse polylines well past the 500 ms
    // network-quiet window networkidle needs, so on mobile-chromium
    // under CI load the wait ate the entire 30 s test budget before
    // the panel even got asserted. The panel.toBeVisible() below is
    // the actual readiness signal we need (issue #222).
    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    const link = panel.getByRole('link', { name: /FULL MISSION CARD/i });
    // The cross-link list hydrates after the panel mounts (it depends
    // on the site→mission resolver fetching the mission JSON). On
    // mobile-chromium under CI load this exceeded the default 5 s
    // toBeVisible timeout (test was timing out before the locator
    // even resolved). 10 s gives 2× margin without masking a real
    // regression. Issue #222 (flaky retry-pass in v0.6.2).
    await expect(link).toBeVisible({ timeout: 10_000 });
    await expect(link).toHaveAttribute('href', /\/missions\?id=curiosity/);
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto('/mars');
    await expect(page.locator('.layer:not(canvas) canvas').first()).toBeVisible({
      timeout: 5_000,
    });
    // Wait for sites JSON to load — canvas exposes data-sites-count.
    await expect(page.locator('canvas.layer')).not.toHaveAttribute('data-sites-count', '0', {
      timeout: 10_000,
    });
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
