import { test, expect } from '@playwright/test';

/**
 * /fly — Mission Arc.
 *
 * Covers:
 *   - default ORRERY DEMO free-return loads with the HUDs populated
 *   - 3D/2D toggle works (both views render the trajectory)
 *   - timeline scrubber drives spacecraft position
 *   - speed pills change selection
 *   - ?mission=curiosity loads Curiosity's mission identity
 *   - CAPCOM toggle opens/closes the panel
 *   - mission library → fly end-to-end (RFC-004 contract)
 */

test.describe('/fly — default mission', () => {
  test('default loads with ORRERY DEMO in the identity HUD', async ({ page }) => {
    await page.goto('/fly');
    const id = page.locator('[data-testid="mission-name"]');
    await expect(id).toBeVisible();
    await expect(id).toContainText(/ORRERY DEMO/);
    await expect(id).toContainText(/Falcon Heavy/);
  });

  test('3D/2D toggle switches the active layer', async ({ page }) => {
    await page.goto('/fly');
    const toggle = page.getByRole('button', { name: /^2d$/i });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.getByRole('button', { name: /^3d$/i })).toBeVisible();
  });

  test('2D mode renders non-blank pixels (regression test)', async ({ page }) => {
    await page.goto('/fly');
    await page.getByRole('button', { name: /^2d$/i }).click();
    await expect(page.getByRole('button', { name: /^3d$/i })).toBeVisible();
    const canvas2d = page.locator('canvas.layer');
    await expect(canvas2d).toBeVisible({ timeout: 5_000 });
    // Wait until the 2D draw loop has painted at least one frame —
    // mirror the /explore pattern: poll a region near the canvas
    // centre (Sun glow) for any non-background pixel.
    await page.waitForFunction(
      () => {
        const c = document.querySelector('canvas.layer') as HTMLCanvasElement | null;
        if (!c || c.width === 0 || c.height === 0) return false;
        const ctx = c.getContext('2d');
        if (!ctx) return false;
        const cx = Math.floor(c.width / 2);
        const cy = Math.floor(c.height / 2);
        const data = ctx.getImageData(cx - 4, cy - 4, 9, 9).data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const isBg = Math.abs(r - 4) < 6 && Math.abs(g - 4) < 6 && Math.abs(b - 12) < 8;
          if (!isBg) return true;
        }
        return false;
      },
      { timeout: 7_000 },
    );
  });

  test('timeline scrubber moves simDay forward', async ({ page }) => {
    await page.goto('/fly');
    const id = page.locator('[data-testid="mission-name"]');
    await expect(id).toBeVisible();
    // Pause first so the scrubber value isn't fighting the play loop.
    await page.getByRole('button', { name: /pause/i }).click();
    const scrub = page.locator('input[type="range"][aria-label*="timeline" i]');
    await expect(scrub).toBeVisible();
    await scrub.fill('0.5');
    // After scrubbing to mid-mission, the MET should reflect roughly
    // half of the total (~250 days for ORRERY DEMO → render shows DAY ~254).
    await expect(id).toContainText(/DAY \d{2,}/);
  });

  test('speed pills change active selection', async ({ page }) => {
    await page.goto('/fly');
    const speed30 = page.getByRole('button', { name: /^30×$/ });
    await expect(speed30).toBeVisible();
    await speed30.click();
    await expect(speed30).toHaveClass(/active/);
  });
});

test.describe('/fly — URL mission loading (RFC-004)', () => {
  test('?mission=curiosity populates the identity HUD with Curiosity', async ({ page }) => {
    await page.goto('/fly?mission=curiosity');
    const id = page.locator('[data-testid="mission-name"]');
    await expect(id).toBeVisible();
    await expect(id).toContainText(/Curiosity/i, { timeout: 10_000 });
    await expect(id).toContainText(/Atlas V/i);
  });

  test('?mission=apollo11 loads a Moon mission via the moon-dest fallback', async ({ page }) => {
    await page.goto('/fly?mission=apollo11');
    const id = page.locator('[data-testid="mission-name"]');
    await expect(id).toContainText(/Apollo 11/i, { timeout: 10_000 });
  });

  test('?mission=does-not-exist surfaces the load-failed banner', async ({ page }) => {
    await page.goto('/fly?mission=does-not-exist');
    const banner = page.getByRole('alert');
    await expect(banner).toBeVisible({ timeout: 10_000 });
    await expect(banner).toContainText(/Failed to load/i);
  });
});

test.describe('/fly — CAPCOM mode', () => {
  test('CAPCOM panel is always visible when a mission is loaded (v0.1.7)', async ({ page }) => {
    await page.goto('/fly');
    // No toggle button — CAPCOM panel renders directly per ADR-026
    // batch (v0.1.7 audit feedback). Panel sits below the 2D/3D
    // toggle on desktop so it can never overlap.
    const panel = page.getByRole('complementary', { name: /CAPCOM monitoring/i });
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(/MISSION EVENTS/i);
    await expect(panel).toContainText(/COMMUNICATIONS/i);
    await expect(panel).toContainText(/ANOMALY MONITOR/i);
  });

  test('CAPCOM panel surfaces ORRERY DEMO events for the default mission', async ({ page }) => {
    await page.goto('/fly');
    const panel = page.getByRole('complementary', { name: /CAPCOM monitoring/i });
    await expect(panel).toBeVisible();
    // Skip ahead so events have fired.
    await page.getByRole('button', { name: /pause/i }).click();
    await page.locator('input[type="range"][aria-label*="timeline" i]').fill('0.3');
    await expect(panel).toContainText(/LAUNCH/i, { timeout: 5_000 });
    await expect(panel).toContainText(/TMI BURN/i);
  });
});

test.describe('/missions → /fly end-to-end (RFC-004)', () => {
  test('library card → FLY → fly screen loads correct mission', async ({ page }) => {
    await page.goto('/missions');
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(28, {
      timeout: 10_000,
    });
    await page.locator('[data-testid="mission-card-curiosity"]').click();
    await page.locator('[data-testid="fly-mission-btn"]').click();
    await expect(page).toHaveURL(/\/fly\?mission=curiosity/);
    const id = page.locator('[data-testid="mission-name"]');
    await expect(id).toContainText(/Curiosity/i, { timeout: 10_000 });
  });
});

test.describe('/fly — 3D scene actually renders (regression for black-screen bug)', () => {
  test('?mission=curiosity renders non-bg pixels in 3D mode', async ({ page }) => {
    await page.goto('/fly?mission=curiosity');
    // Wait for HUD to confirm load.
    await expect(page.locator('[data-testid="mission-name"]')).toContainText(/Curiosity/i, {
      timeout: 10_000,
    });
    // Wait a beat for the Three.js animate loop to paint a frame with
    // Earth + Mars + spacecraft + arc Lines visible.
    await page.waitForTimeout(800);
    // The 3D layer is a div with a child WebGL canvas. Sample several
    // pixels from the centre region — at least one should be non-bg.
    const hasContent = await page.evaluate(() => {
      const layers = document.querySelectorAll<HTMLElement>('.layer');
      const threeLayer = Array.from(layers).find((l) => l.tagName === 'DIV');
      const canvas = threeLayer?.querySelector('canvas') as HTMLCanvasElement | null;
      if (!canvas || canvas.width === 0) return false;
      const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      if (!gl) return false;
      const w = canvas.width;
      const h = canvas.height;
      const px = new Uint8Array(4);
      // Sample 20 random points; if any has non-bg colour, scene is rendering.
      for (let i = 0; i < 20; i++) {
        const x = Math.floor(Math.random() * w);
        const y = Math.floor(Math.random() * h);
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        // bg = #04040c. Allow 6 unit tolerance for anti-aliasing.
        const isBg = Math.abs(px[0] - 4) < 6 && Math.abs(px[1] - 4) < 6 && Math.abs(px[2] - 12) < 8;
        if (!isBg) return true;
      }
      return false;
    });
    expect(hasContent).toBe(true);
  });
});

test.describe('/fly — multi-destination (v0.1.6 / ADR-026)', () => {
  test('?dest=jupiter&type=flyby&dep=N&tof=N renders a Jupiter trajectory', async ({ page }) => {
    // Synthesised /plan → /fly path: dest + dep + tof, no mission.
    await page.goto('/fly?dest=jupiter&type=flyby&dep=200&tof=900');
    const id = page.locator('[data-testid="mission-name"]');
    await expect(id).toContainText(/JUPITER/i, { timeout: 10_000 });
    await expect(id).toContainText(/FLYBY/i);
    // Canvas painted (basic sanity).
    const threeCanvas = page.locator('.layer:not(canvas) canvas').first();
    await expect(threeCanvas).toBeVisible({ timeout: 5_000 });
  });

  test('?dest=mercury&type=landing identifies Mercury + LANDING in HUD', async ({ page }) => {
    await page.goto('/fly?dest=mercury&type=landing&dep=400&tof=180');
    const id = page.locator('[data-testid="mission-name"]');
    await expect(id).toContainText(/MERCURY/i, { timeout: 10_000 });
    await expect(id).toContainText(/LANDING/i);
  });

  test('default /fly (no params) still loads ORRERY DEMO scenario', async ({ page }) => {
    await page.goto('/fly');
    const id = page.locator('[data-testid="mission-name"]');
    await expect(id).toContainText(/ORRERY DEMO/, { timeout: 10_000 });
  });
});
