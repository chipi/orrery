import { test, expect } from '@playwright/test';

/**
 * Nation legend → interactive filter (#363).
 *
 * The color key under the planet on /earth, /moon, /mars is a toggle
 * control: each entry is a `<button data-testid="legend-nation-<key>">`
 * with `aria-pressed` reflecting whether that nation's objects are shown.
 * Clicking hides every object of that nation (surface + orbital); default
 * is all-on so the page looks unchanged until you interact.
 *
 * These specs assert the DOM-observable contract (button state + the
 * dimmed `--off` class). The actual 3D marker hiding is driven by the
 * same per-frame visibility loop and covered by the nation-palette unit
 * tests + manual chrome-devtools verification — the canvas has no
 * count hook to assert against here.
 *
 * The legend is server-rendered (visible before client hydration), so we
 * gate on `window.__surfaceSceneSelectSite` — set in SurfaceScene's
 * onMount — to guarantee the component has hydrated and the button's
 * onclick is wired before we click. Without this a click can land on the
 * pre-hydration DOM and be dropped.
 */

/** Wait until the SurfaceScene component has mounted + hydrated. */
async function waitForSceneReady(page: import('@playwright/test').Page) {
  await page.waitForFunction(
    () =>
      typeof (window as { __surfaceSceneSelectSite?: unknown }).__surfaceSceneSelectSite ===
      'function',
    null,
    { timeout: 20_000 },
  );
}

test.describe('nation legend filter', () => {
  test('/earth — toggles a nation off then back on', async ({ page }) => {
    await page.goto('/earth');
    await waitForSceneReady(page);
    const usa = page.getByTestId('legend-nation-USA');
    await expect(usa).toBeVisible({ timeout: 15_000 });
    // Default: every nation button is pressed (shown).
    await expect(usa).toHaveAttribute('aria-pressed', 'true');

    // Toggle off → un-pressed + dimmed.
    await usa.click();
    await expect(usa).toHaveAttribute('aria-pressed', 'false');
    await expect(usa).toHaveClass(/legend-item--off/);

    // Toggle back on → restored.
    await usa.click();
    await expect(usa).toHaveAttribute('aria-pressed', 'true');
    await expect(usa).not.toHaveClass(/legend-item--off/);
  });

  test('/mars — filter state persists across the 2D ↔ 3D view switch', async ({
    page,
    isMobile,
  }) => {
    test.slow(isMobile, 'mobile scene mount + view switch > global 30 s budget');
    await page.goto('/mars');
    await waitForSceneReady(page);
    const usa = page.getByTestId('legend-nation-USA');
    await expect(usa).toBeVisible({ timeout: 15_000 });

    await usa.click();
    await expect(usa).toHaveAttribute('aria-pressed', 'false');

    // Flip to the 2D flat view — the same interactive legend renders there
    // (the canvas-painted legend was dropped) and keeps its state.
    await page.getByTestId('mode-toggle').click();
    const usa2d = page.getByTestId('legend-nation-USA');
    await expect(usa2d).toBeVisible();
    await expect(usa2d).toHaveAttribute('aria-pressed', 'false');
  });
});
