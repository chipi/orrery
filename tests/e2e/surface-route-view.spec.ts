import { test, expect, type Page } from '@playwright/test';

/**
 * "View entire route" camera mode (#380) — the details-panel button that
 * frames the WHOLE rover traverse (route line + along-route detail tiles +
 * regional context) in one view, on /moon and /mars.
 *
 * The camera move is driven from SurfaceScene; the button toggles
 * `routeViewActive` and swaps the `view-route` ↔ `exit-route-view` testids.
 * We drive it through the `__surfaceSceneFrameRoute` / `__surfaceSceneExitRouteView`
 * hooks (registered onMount, same pattern as `__surfaceSceneSelectSite`) so the
 * test doesn't depend on raycasting a canvas pixel.
 */

async function waitForScene(page: Page): Promise<void> {
  // The 3D scene streams imagery continuously, so don't wait for networkidle —
  // wait for the canvas to mount + the scene test hooks to register (onMount).
  await expect(page.locator('canvas.layer, div.layer').first()).toBeVisible({ timeout: 15000 });
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { __surfaceSceneFrameRoute?: unknown })
        .__surfaceSceneFrameRoute === 'function',
    { timeout: 15000 },
  );
}

test.describe('Route-view — frame the whole traverse (#380)', () => {
  for (const { body, site } of [
    { body: 'moon', site: 'apollo17' }, // LROC NAC tiles
    { body: 'mars', site: 'curiosity' }, // HiRISE tiles
  ] as const) {
    test(`${body} / ${site} — button frames the route then exits`, async ({ page }) => {
      await page.goto(`/${body}?site=${site}`);
      await waitForScene(page);

      // A routed site shows the "View entire route" button.
      const viewBtn = page.locator('[data-testid="view-route"]');
      await expect(viewBtn).toBeVisible({ timeout: 10000 });

      // Enter route view → an exit control appears (in-panel on desktop; the
      // floating chip on mobile, where entering route-view closes the panel).
      const exitControl = page.locator(
        '[data-testid="exit-route-view"], [data-testid="route-floating-exit"]',
      );
      await page.evaluate(
        (id) =>
          (
            window as unknown as { __surfaceSceneFrameRoute: (i: string) => void }
          ).__surfaceSceneFrameRoute(id),
        site,
      );
      await expect(exitControl.first()).toBeVisible({ timeout: 5000 });
      await expect(viewBtn).toHaveCount(0);

      // Exit → no route-view exit control remains.
      await page.evaluate(() =>
        (
          window as unknown as { __surfaceSceneExitRouteView: () => void }
        ).__surfaceSceneExitRouteView(),
      );
      await expect(exitControl).toHaveCount(0, { timeout: 5000 });
    });
  }

  test('moon / apollo15 — regional-only site still offers the route view', async ({ page }) => {
    // apollo15 has a route polyline but no along-route detail tiles; the button
    // still appears (frames the route line + regional context).
    await page.goto('/moon?site=apollo15');
    await waitForScene(page);
    await expect(page.locator('[data-testid="view-route"]')).toBeVisible({ timeout: 10000 });
  });

  test('moon / a non-routed site has no route-view button', async ({ page }) => {
    // apollo11 is a landing site with no traverse → no button.
    await page.goto('/moon?site=apollo11');
    await waitForScene(page);
    await expect(page.locator('[data-testid="exit-route-view"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="view-route"]')).toHaveCount(0);
  });
});
