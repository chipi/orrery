import { test, expect } from '@playwright/test';
import { openDrawerTab } from './_helpers/hud-expand';

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
  test('/earth — toggles a nation off then back on', async ({ page, isMobile }) => {
    await page.goto('/earth');
    await waitForSceneReady(page);
    // The nation button is dual-rendered on mobile (hidden desktop mirror +
    // the drawer's Nations tab). Tapping the drawer chip auto-collapses the
    // drawer ("pick → reveal the scene"), so open the drawer only to tap and
    // always assert state on the mirror — getByTestId resolves to that single
    // instance whenever the drawer is closed.
    const usa = page.getByTestId('legend-nation-USA');
    async function toggleUsa() {
      if (isMobile) {
        await openDrawerTab(page, /nations/i);
        await page.locator('.mdg-body [data-testid="legend-nation-USA"]').first().tap();
        await page.waitForTimeout(200); // drawer auto-collapses on selection
      } else {
        await usa.click();
      }
    }

    // Default: every nation button is pressed (shown).
    await expect(usa).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 });

    // Toggle off → un-pressed + dimmed.
    await toggleUsa();
    await expect(usa).toHaveAttribute('aria-pressed', 'false');
    await expect(usa).toHaveClass(/legend-item--off/);

    // Toggle back on → restored.
    await toggleUsa();
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
    await expect(usa).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 });

    // Toggle USA off. On mobile, tap the drawer chip (it auto-collapses);
    // state reflects on the mirror.
    if (isMobile) {
      await openDrawerTab(page, /nations/i);
      await page.locator('.mdg-body [data-testid="legend-nation-USA"]').first().tap();
      await page.waitForTimeout(200);
    } else {
      await usa.click();
    }
    await expect(usa).toHaveAttribute('aria-pressed', 'false');

    // Flip to the 2D flat view — the same interactive legend renders there
    // (the canvas-painted legend was dropped) and keeps its state. mode-toggle
    // is dual-rendered (desktop hud-controls + the always-present mobile
    // `.hud-top-mobile` cluster) → scope to the visible one on both viewports.
    const modeToggle = page.getByTestId('mode-toggle').filter({ visible: true }).first();
    if (isMobile) await modeToggle.tap();
    else await modeToggle.click();

    // State persists across the switch — assert on the legend button.
    await expect(page.getByTestId('legend-nation-USA').first()).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
