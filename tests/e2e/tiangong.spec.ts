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

test.describe('/tiangong', () => {
  test('default load has no console errors and shows 3D canvas or HUD toggle', async ({ page }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/tiangong', { waitUntil: 'networkidle' });
    await expect(page).toHaveTitle(/Tiangong/i);
    expect(errors).toEqual([]);
    const toggle = page.getByTestId('tiangong-view-toggle');
    await expect(toggle).toBeVisible({ timeout: 8_000 });
  });

  test('list mode shows module list', async ({ page }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/tiangong?view=list', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('tiangong-list-view')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('heading', { name: /modules/i })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('module query in list mode opens detail panel', async ({ page }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/tiangong?view=list&module=tianhe', { waitUntil: 'networkidle' });
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 8_000 });
    await expect(panel.getByRole('heading', { level: 1, name: /tianhe/i })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('module query in 3D mode opens detail panel', async ({ page }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/tiangong?module=mengtian', { waitUntil: 'networkidle' });
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await expect(panel.getByRole('heading', { level: 1, name: /mengtian/i })).toBeVisible();
    await panel.locator('button.close').click();
    await expect(page).toHaveURL(/\/tiangong(?:\?view=list)?$/);
    expect(errors).toEqual([]);
  });

  test('3D canvas click opens the module panel', async ({ page }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/tiangong', { waitUntil: 'networkidle' });
    const canvas = page.getByTestId('tiangong-canvas');
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    // Wait for the page's test-pick hook (set right after the canvas
    // pointer handlers attach in /tiangong/+page.svelte).
    await page.waitForFunction(
      () =>
        typeof (window as unknown as { __tiangongPickAt?: unknown }).__tiangongPickAt ===
        'function',
      { timeout: 12_000 },
    );
    // Project a known pickable module's world position to client-space
    // pixels and click that exact spot. Replaces the previous spiral-
    // search approach which raced software-rasterizer WebGL in CI.
    const pos = await page.evaluate(() =>
      (
        window as unknown as {
          __tiangongPickAt: () => { x: number; y: number; moduleId: string } | null;
        }
      ).__tiangongPickAt(),
    );
    expect(pos, 'expected at least one pickable Tiangong module in the scene').not.toBeNull();
    if (!pos) return;
    await page.mouse.click(pos.x, pos.y);
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 5_000 });
    expect(errors).toEqual([]);
  });
});
