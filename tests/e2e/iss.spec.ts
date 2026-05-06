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

  test('3D canvas grid click opens the module panel', async ({ page }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/iss', { waitUntil: 'networkidle' });
    const canvas = page.getByTestId('iss-canvas');
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    await page.waitForFunction(
      () => {
        const c = document.querySelector('[data-testid="iss-canvas"]') as HTMLCanvasElement | null;
        return c != null && c.width > 0 && c.height > 0;
      },
      { timeout: 12_000 },
    );
    const box = await canvas.evaluate((el: HTMLCanvasElement) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const panel = page.locator('aside.panel');
    let opened = false;
    outer: for (let r = 40; r < Math.min(box.width, box.height) / 2 - 16; r += 14) {
      for (let theta = 0; theta < Math.PI * 2; theta += Math.PI / 16) {
        await page.mouse.click(cx + Math.cos(theta) * r, cy + Math.sin(theta) * r);
        if (await panel.isVisible().catch(() => false)) {
          opened = true;
          break outer;
        }
      }
    }
    expect(opened).toBe(true);
    expect(errors).toEqual([]);
  });
});
