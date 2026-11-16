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

/** The globe opens bare: the legend strip fades in with the first site
 *  icons as you zoom (#641). Wheel in over the globe until it has arrived. */
async function zoomUntilLegend(page: import('@playwright/test').Page) {
  const box = await page.locator('canvas').first().boundingBox();
  if (!box) throw new Error('no scene canvas');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const arrived = page.locator('.legend-3d:not(.legend-3d--away)');
  for (let i = 0; i < 40 && (await arrived.count()) === 0; i++) {
    await page.mouse.wheel(0, -150);
    await page.waitForTimeout(150);
  }
  await expect(arrived).toHaveCount(1);
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
    if (!isMobile) await zoomUntilLegend(page);
    // A nation chip shows its state by the on look (UXD-014): soft fill when on, glass at rest.
    const bg = () => usa.evaluate((el) => getComputedStyle(el).backgroundColor);
    const onBg = await bg();

    // Toggle off → un-pressed + dimmed.
    await toggleUsa();
    await expect(usa).toHaveAttribute('aria-pressed', 'false');
    expect(await bg(), 'off chip drops the on fill').not.toBe(onBg);

    // Toggle back on → restored.
    await toggleUsa();
    await expect(usa).toHaveAttribute('aria-pressed', 'true');
    expect(await bg(), 'on fill restored').toBe(onBg);
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
    if (!isMobile) await zoomUntilLegend(page);

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
