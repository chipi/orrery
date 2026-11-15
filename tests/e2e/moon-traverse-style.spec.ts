import { test, expect, type Page } from '@playwright/test';

/**
 * Moon traverses take the Mars line style (UXD-044). The drawing itself is
 * WebGL and is checked in the unit tests (`surface-traverses.build.test.ts`);
 * here: the route view still opens for a Moon rover and the two 9-point
 * routes say "Approximate route" in the panel, the mapped tracks do not.
 */

async function waitForScene(page: Page): Promise<void> {
  await expect(page.locator('canvas.layer, div.layer').first()).toBeVisible({ timeout: 15000 });
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { __surfaceSceneFrameRoute?: unknown })
        .__surfaceSceneFrameRoute === 'function',
    { timeout: 15000 },
  );
}

test.describe('Moon traverse style (UXD-044)', () => {
  for (const site of ['change3', 'chandrayaan3']) {
    test(`${site} — the panel says "Approximate route"`, async ({ page }) => {
      await page.goto(`/moon?site=${site}`);
      await waitForScene(page);
      await expect(page.locator('[data-testid="traverse-approximate"]')).toBeVisible({
        timeout: 15000,
      });
    });
  }

  for (const site of ['luna17', 'apollo17']) {
    test(`${site} — a mapped track has the route view and no "Approximate route"`, async ({
      page,
    }) => {
      await page.goto(`/moon?site=${site}`);
      await waitForScene(page);
      await expect(page.locator('[data-testid="view-route"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('[data-testid="traverse-approximate"]')).toHaveCount(0);
    });
  }
});
