import { test, expect } from '@playwright/test';

/**
 * /earth — unified surface + orbital scene (#290 Slice 7).
 *
 * Pre-#290 the route had a 2D top-down concentric-rings fallback view.
 * That mode is gone — /earth is now 3D-only (config.disable2D). Tests
 * that exercised the 2D-mode satellite-rendering path have been
 * dropped along with it; tests that opened the satellite panel via 2D
 * canvas clicks now use the `?object=iss` deep-link which mounts the
 * panel directly via the SurfaceScene wiring.
 */

test.describe('/earth', () => {
  test('default loads in 3D mode with the WebGL canvas sized', async ({ page }) => {
    await page.goto('/earth');
    const threeCanvas = page.locator('.layer:not(canvas) canvas').first();
    await expect(threeCanvas).toBeVisible({ timeout: 5_000 });
    const dim = await threeCanvas.evaluate((el: HTMLCanvasElement) => ({
      w: el.width,
      h: el.height,
    }));
    expect(dim.w).toBeGreaterThan(0);
    expect(dim.h).toBeGreaterThan(0);
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/earth');
    // Wait for the scene to settle — networkidle is a cheap proxy for
    // "all the async asset / object fetches resolved" without
    // hardcoding the specific load chain.
    await page.waitForLoadState('networkidle');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  /* ── v0.1.10 — GALLERY + LEARN tabs on the object detail panel ── */

  test('ISS panel exposes GALLERY tab with thumbnails (v0.1.10)', async ({ page, isMobile }) => {
    test.slow(isMobile, 'mobile-chromium panel-mount + thumbnail manifest > global 30 s budget');
    // ?object=<id> deep-links straight into the EarthObjectPanel —
    // SurfaceScene's Slice 6b wiring reads the param, finds the
    // matching EarthObject, and sets selectedSat. No 2D-canvas dance.
    // SurfaceScene awaits both getEarthLaunchSites (14 launchpads +
    // i18n overlays) AND getEarthObjects (50+ satellites + per-object
    // i18n overlays) before the deep-link wiring fires — the chain
    // runs ~8 s cold on desktop-chromium, longer on mobile. 25 s budget
    // gives ≈3× headroom without masking a real regression.
    await page.goto('/earth?object=iss');
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 25_000 });
    const galleryTab = page.getByRole('tab', { name: /^GALLERY$/ });
    await expect(galleryTab).toBeVisible({ timeout: 5_000 });
    await galleryTab.click();
    await expect(panel.locator('.gallery-thumb').first()).toBeVisible({ timeout: 10_000 });
  });

  test('ISS panel LEARN tab shows tiered links (v0.1.10)', async ({ page, isMobile }) => {
    test.slow(isMobile, 'mobile-chromium panel-mount > global 30 s budget');
    await page.goto('/earth?object=iss');
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 25_000 });
    await page.getByRole('tab', { name: /^LEARN$/ }).click();
    await expect(panel).toContainText(/INTRO/);
    await expect(panel.locator('.link-tier a').first()).toBeVisible();
  });

  /* ── v0.4 — category filter chips (replaced year scrubber) ───────── */
  test('category filter chips render with correct testids', async ({ page }) => {
    await page.goto('/earth');
    await expect(page.getByTestId('layer-stations')).toBeVisible();
    await expect(page.getByTestId('layer-observatories')).toBeVisible();
    await expect(page.getByTestId('layer-constellations')).toBeVisible();
    await expect(page.getByTestId('layer-comsats')).toBeVisible();
    await expect(page.getByTestId('layer-moon-orbiters')).toBeVisible();
    await expect(page.getByTestId('layer-orbits')).toBeVisible();
  });

  test('chip toggle flips aria-pressed', async ({ page, isMobile }) => {
    await page.goto('/earth');
    // Wait for HUD hydration to flush before the click — on mobile-chromium
    // the chip onclick binding sometimes hasn't attached when the test
    // sends the synthetic event (GH #253). networkidle is a cheap proxy
    // for "page is done initialising" without spec-specific waits.
    await page.waitForLoadState('networkidle');
    const stations = page.getByTestId('layer-stations');
    await expect(stations).toBeVisible();
    await expect(stations).toHaveAttribute('aria-pressed', 'true');
    // On mobile-chromium, prefer tap() (touch event) over click() (mouse)
    // — matches how the user actually interacts with the chip on a phone
    // and avoids the synthetic-click-event timing race that #253 captured.
    if (isMobile) {
      await stations.tap();
    } else {
      await stations.click();
    }
    await expect(stations).toHaveAttribute('aria-pressed', 'false');
  });
});
