import { test, expect } from '@playwright/test';
import { isExpectedNoise } from './_helpers/console-errors';

/**
 * /mars — Mars Surface Map (3D textured sphere + 2D equirectangular map +
 * orbital ring layer). PRD-009 / RFC-012 / issue #40.
 *
 * V1 catalogue: 16 surface sites + 11 orbital sites. Layer chips toggle
 * surface / orbital visibility. Click → detail panel. Deep-link via
 * ?site=[id]. Cross-link to /missions when mission_id is present.
 */

test.describe('/mars', () => {
  test('default loads in 3D mode with the WebGL canvas sized', async ({ page }) => {
    await page.goto('/mars');
    const threeCanvas = page.locator('.layer:not(canvas) canvas').first();
    await expect(threeCanvas).toBeVisible({ timeout: 5_000 });
    const dim = await threeCanvas.evaluate((el: HTMLCanvasElement) => ({
      w: el.width,
      h: el.height,
    }));
    expect(dim.w).toBeGreaterThan(0);
    expect(dim.h).toBeGreaterThan(0);
  });

  test('2D toggle reveals the equirectangular Mars map', async ({ page, isMobile }) => {
    await page.goto('/mars');
    await page.waitForLoadState('networkidle');
    const toggle = page.getByTestId('mode-toggle');
    await expect(toggle).toBeVisible();
    if (isMobile) {
      await toggle.tap();
    } else {
      await toggle.click();
    }
    await expect(toggle).toHaveText('3D');
    // The 2D canvas has class="layer" and is the only `<canvas>` in
    // the route's tree (the 3D canvas is created inside the
    // bound <div class="layer"> by Three.js but doesn't carry the
    // class itself). After the toggle it should be visible — non-zero
    // box, display !== 'none', etc.
    const flat = page.locator('canvas.layer');
    await expect(flat).toBeVisible({ timeout: 8_000 });
    const dim = await flat.evaluate((el: HTMLCanvasElement) => ({ w: el.width, h: el.height }));
    expect(dim.w).toBeGreaterThan(0);
    expect(dim.h).toBeGreaterThan(0);
  });

  test('layer chips render and toggle', async ({ page }) => {
    await page.goto('/mars');
    const surface = page.getByTestId('layer-surface');
    const orbiters = page.getByTestId('layer-orbiters');
    const traverses = page.getByTestId('layer-traverses');
    await expect(surface).toBeVisible();
    await expect(orbiters).toBeVisible();
    await expect(traverses).toBeVisible();
    await expect(surface).toHaveAttribute('aria-pressed', 'true');
    await expect(traverses).toHaveAttribute('aria-pressed', 'true');
    await orbiters.click();
    await expect(orbiters).toHaveAttribute('aria-pressed', 'false');
    await traverses.click();
    await expect(traverses).toHaveAttribute('aria-pressed', 'false');
  });

  test('?site=curiosity deep-link opens panel pre-selected', async ({ page }) => {
    await page.goto('/mars?site=curiosity');
    await page.waitForLoadState('networkidle');
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await expect(panel).toContainText(/Curiosity/i);
  });

  test('?site=mro opens an orbital site panel', async ({ page }) => {
    await page.goto('/mars?site=mro');
    await page.waitForLoadState('networkidle');
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await expect(panel).toContainText(/Mars Reconnaissance Orbiter|MRO/i);
    await expect(panel).toContainText(/IN ORBIT/);
  });

  test('curiosity panel surfaces FULL MISSION CARD cross-link', async ({ page, isMobile }) => {
    await page.goto('/mars?site=curiosity');
    // Deterministic readiness: wait for the sites JSON to land before
    // asserting on the panel. `canvas.layer` exposes `data-sites-count`
    // which flips from '0' to the resolved site count once
    // `getMarsSites()` (a chain of N+2 sequential fetches: list + hotspots
    // + one i18n overlay per site) resolves and `selectSite` runs from
    // the URL-param path. Without this wait, `panel.toBeVisible` raced
    // the fetch chain on mobile-chromium under GH Actions load and
    // exceeded 10 s consistently. The previous comment claimed
    // `waitForLoadState('networkidle')` ate the 30 s budget — that's
    // still true, but this signal is more specific (the actual thing
    // gating panel visibility) and bounded. Two other tests in this
    // file (?site=curiosity at L57 and ?site=mro at L65) still use
    // networkidle and pass; this test had additional cross-link
    // hydration that pushed it past the network-quiet window.
    // Issue #228-followup (CI regression on top of #222 retry-pass fix).
    // Mobile-chromium under GH Actions load: the N+2 sequential fetch
    // chain (list + hotspots + per-site i18n overlay) consistently took
    // > 15 s on the 26485179917 run, even after #228-followup. 30 s on
    // mobile gives 2× margin without masking a real hang on desktop.
    await expect(page.locator('canvas.layer')).not.toHaveAttribute('data-sites-count', '0', {
      timeout: isMobile ? 30_000 : 15_000,
    });
    const panel = page.locator('aside.panel');
    // Panel opens synchronously inside the sites-loaded .then() block,
    // so once the sites attribute flips, the panel is already mounted.
    // 5 s is plenty for the in-fly transition.
    await expect(panel).toBeVisible({ timeout: 5_000 });
    const link = panel.getByRole('link', { name: /FULL MISSION CARD/i });
    // Cross-link still hydrates after the panel mounts (mission JSON
    // fetch). 10 s margin retained.
    await expect(link).toBeVisible({ timeout: 10_000 });
    await expect(link).toHaveAttribute('href', /\/missions\?id=curiosity/);
  });

  test('no console errors on load', async ({ page, isMobile }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && !isExpectedNoise(m)) errors.push(m.text());
    });
    await page.goto('/mars');
    await expect(page.locator('.layer:not(canvas) canvas').first()).toBeVisible({
      timeout: isMobile ? 15_000 : 5_000,
    });
    // Wait for sites JSON to load — canvas exposes data-sites-count.
    // Mobile-chromium on CI is 3-5× slower than desktop; the per-site
    // i18n overlay fetch loop (~30 sites × 2 fallback fetches) regularly
    // exceeds the original 10s budget there.
    await expect(page.locator('canvas.layer')).not.toHaveAttribute('data-sites-count', '0', {
      timeout: isMobile ? 30_000 : 10_000,
    });
    // Console errors are filtered at collection via the shared
    // isExpectedNoise helper (known i18n/trajectory/gallery probe 404s
    // only — any other 404 still fails). See _helpers/console-errors.ts.
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
