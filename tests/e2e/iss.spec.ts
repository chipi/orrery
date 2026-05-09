import { test, expect, type ConsoleMessage, type Page } from '@playwright/test';

function attachConsoleAndError(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err: Error) => {
    errors.push(`pageerror: ${err.message}`);
  });
  return errors;
}

test.describe('/iss', () => {
  test('default load has no console errors and shows 3D canvas or HUD toggle', async ({ page }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/iss', { waitUntil: 'networkidle' });
    await expect(page).toHaveTitle(/ISS Explorer/i);
    expect(errors).toEqual([]);
    const toggle = page.getByTestId('iss-view-toggle');
    await expect(toggle).toBeVisible({ timeout: 8_000 });
  });

  test('list mode shows module list', async ({ page }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/iss?view=list', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('iss-list-view')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('heading', { name: /modules/i })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('module query in list mode opens detail panel', async ({ page }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/iss?view=list&module=zarya', { waitUntil: 'networkidle' });
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 8_000 });
    await expect(panel.getByRole('heading', { level: 1, name: /zarya/i })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('module query in 3D mode opens detail panel', async ({ page }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/iss?module=cupola', { waitUntil: 'networkidle' });
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await expect(panel.getByRole('heading', { level: 1, name: /cupola/i })).toBeVisible();
    await panel.locator('button.close').click();
    await expect(page).toHaveURL(/\/iss(?:\?view=list)?$/);
    expect(errors).toEqual([]);
  });

  test('3D canvas click opens the module panel', async ({ page }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/iss', { waitUntil: 'networkidle' });
    const canvas = page.getByTestId('iss-canvas');
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    // Wait for the page to register its test hook AND for at least one
    // requestAnimationFrame so world matrices are populated and the
    // canvas has rendered once. The hook itself forces a matrixWorld
    // update, but the camera also needs to have settled into its
    // initial position before we project anything.
    await page.waitForFunction(
      () => typeof (window as unknown as { __issPickAt?: unknown }).__issPickAt === 'function',
      { timeout: 12_000 },
    );
    await page.evaluate(
      () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
    );
    // Project a known pickable module's world position to client-space
    // pixels and click that exact spot. Replaces the previous spiral-
    // search pattern that raced software-rasterizer WebGL in CI.
    const pos = await page.evaluate(() =>
      (
        window as unknown as {
          __issPickAt: () => { x: number; y: number; moduleId: string } | null;
        }
      ).__issPickAt(),
    );
    expect(pos, 'expected at least one pickable ISS module on-screen').not.toBeNull();
    if (!pos) return;
    // Use locator.click({position}) — dispatches the click to the
    // canvas element at canvas-relative coords, bypassing any
    // fixed-position overlay (e.g. StationOrbitBanner at top, z-index
    // 30) that would swallow a raw page.mouse.click.
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas bounding box unavailable');
    await canvas.click({ position: { x: pos.x - box.x, y: pos.y - box.y } });
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 5_000 });
    expect(errors).toEqual([]);
  });
});
