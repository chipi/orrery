import { test, expect, type Page } from '@playwright/test';

/**
 * Moon traverses take the Mars line style (UXD-044). The drawing itself is
 * WebGL and is checked in the unit tests (`surface-traverses.build.test.ts`);
 * here: the route view opens for a Moon rover, and no mapped track says
 * "Approximate route". Chang'e 3 / Yutu and Chandrayaan-3 / Pragyan were the two 9-point
 * approximate routes until D8 (2026-11-18) digitised them from the mission teams' published
 * maps; no Moon route is approximate now.
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
  for (const site of ['change3', 'chandrayaan3', 'luna17', 'apollo17']) {
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
