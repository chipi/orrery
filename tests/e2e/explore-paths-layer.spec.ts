import { test, expect, type Page } from '@playwright/test';

/**
 * /explore PATHS layer — iconic spacecraft trajectories (#306).
 *
 * Coverage:
 *  - PATHS chip is rendered and starts in the OFF state (aria-pressed)
 *  - clicking the chip flips the state to ON without console errors
 *  - the 9 iconic trajectory JSON files (Voyager 1+2, Pioneer 10+11,
 *    New Horizons, Galileo, Juno, Cassini, Dawn) all fetch 200
 *  - the Saturn-anchored Cassini orbiter-tour JSON (Slice D) fetches 200
 *
 * We don't try to raycast the canvas-side rendering — that requires
 * Three.js scene access from the page side, which couples this spec
 * to internal scene state. The trajectory builder + raycaster wiring
 * are exercised by unit tests; here we verify the public surface (chip
 * + fetches) so users can actually turn the layer on.
 */

const PATHS_TRAJECTORY_IDS = [
  'voyager-1',
  'voyager-2',
  'pioneer-10',
  'pioneer-11',
  'new-horizons',
  'galileo',
  'juno',
  'cassini',
  'dawn',
] as const;

const ORBITER_TOUR_IDS = ['cassini-tour', 'galileo-tour', 'juno-tour'] as const;

async function collectErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    // Filter expected SvelteKit dev-only noise on first paint. Real
    // errors from our code surface as pageerror or as unique strings.
    if (/Failed to load resource/i.test(text)) return;
    errors.push(text);
  });
  return errors;
}

test.describe('/explore — PATHS layer', () => {
  test('PATHS chip toggles aria-pressed without console errors', async ({ page, isMobile }) => {
    const errors = await collectErrors(page);
    await page.goto('/explore');
    // Wait for SvelteKit hydration so onclick is bound before synthetic
    // input lands (existing pitfall called out in explore.spec.ts's
    // enterTwoDMode helper — mobile-chromium races without this).
    await page.waitForLoadState('networkidle');
    const chip = page.locator('[data-testid="layer-paths"]');
    await expect(chip).toBeVisible();
    // Default OFF per #306 — the layer ships hidden so wide-zoom view
    // stays uncluttered for new users.
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    if (isMobile) {
      await chip.tap();
    } else {
      await chip.click();
    }
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    if (isMobile) {
      await chip.tap();
    } else {
      await chip.click();
    }
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(errors, `console errors during PATHS toggle: ${errors.join(' | ')}`).toEqual([]);
  });

  test('all 9 iconic trajectory JSON files are reachable', async ({ page, baseURL }) => {
    const resolvedBase = baseURL ?? 'http://localhost:4173';
    for (const id of PATHS_TRAJECTORY_IDS) {
      const res = await page.request.get(`${resolvedBase}/data/trajectories/${id}.json`);
      expect(res.status(), `trajectory ${id}`).toBe(200);
      const payload = await res.json();
      expect(payload.id, `trajectory ${id} id field`).toBe(id);
      expect(payload.waypoints.length, `trajectory ${id} waypoint count`).toBeGreaterThan(1);
    }
  });

  test('Saturn-anchored Cassini orbiter-tour JSON is reachable (Slice D)', async ({
    page,
    baseURL,
  }) => {
    const resolvedBase = baseURL ?? 'http://localhost:4173';
    for (const id of ORBITER_TOUR_IDS) {
      const res = await page.request.get(`${resolvedBase}/data/trajectories/${id}.json`);
      expect(res.status(), `orbiter-tour ${id}`).toBe(200);
      const payload = await res.json();
      expect(payload.parent_planet, `orbiter-tour ${id} anchor`).toBeTruthy();
      expect(payload.orbits.length, `orbiter-tour ${id} orbit families`).toBeGreaterThan(0);
    }
  });

  test('MissionPanel surfaces the /explore backlink with correct href', async ({ page }) => {
    // Cassini's panel — the focus=saturn variant routes to the Saturn-
    // anchored orbital tour at planet zoom.
    await page.goto('/missions?id=cassini');
    const backlink = page.locator('[data-testid="explore-backlink"]');
    await expect(backlink).toBeVisible({ timeout: 10_000 });
    const href = await backlink.getAttribute('href');
    expect(href).toContain('paths=1');
    expect(href).toContain('focus=saturn');
  });

  test('/explore?paths=1 deep-link auto-activates the PATHS layer', async ({ page }) => {
    // Direct URL navigation exercises the same plumbing the panel
    // backlink uses, without depending on mobile-chromium synthetic-tap
    // hit-testing under tight panel layouts (the descriptive paragraph
    // above the link can intercept the tap by sub-pixel margin on
    // narrow viewports; the real-finger UX works fine).
    await page.goto('/explore?paths=1');
    const chip = page.locator('[data-testid="layer-paths"]');
    await expect(chip).toBeVisible();
    await expect(chip).toHaveAttribute('aria-pressed', 'true', { timeout: 5_000 });
  });

  test('non-trajectory missions do NOT show the /explore backlink', async ({ page }) => {
    // Sanity-check the gate — apollo11 has no iconic trajectory file,
    // so the backlink chip should not render in its panel.
    await page.goto('/missions?id=apollo11');
    await page.waitForLoadState('networkidle');
    const backlink = page.locator('[data-testid="explore-backlink"]');
    await expect(backlink).toHaveCount(0);
  });
});
