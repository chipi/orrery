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
    await expect(page.locator('[data-testid^="mission-card-"]')).toHaveCount(37, {
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
    // Wait for the render-state hook to publish data-sim-day — proves
    // the Three.js animate loop has run at least once and the arc /
    // spacecraft / planet meshes are in their initial positions.
    await expect(page.locator('[data-testid="fly-render-state"]')).toHaveAttribute(
      'data-sim-day',
      /\d/,
      { timeout: 10_000 },
    );
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

test.describe('/fly — /plan default-Mars selection (v0.1.9 regression)', () => {
  test('?type=landing&dep=N&tof=N (no explicit dest) loads Mars selection, not the demo', async ({
    page,
  }) => {
    // /plan omits ?dest= when the user picked Mars (the default),
    // so /fly's /plan-driven branch must coalesce missing dest to mars.
    // Previous bug: the branch required a non-empty dest param and
    // fell through to the ORRERY DEMO scenario.
    await page.goto('/fly?type=landing&dep=200&tof=250');
    const id = page.locator('[data-testid="mission-name"]');
    await expect(id).not.toContainText(/ORRERY DEMO/i, { timeout: 10_000 });
    // The synthesised mission name follows the EARTH → MARS · LANDING
    // template from applyPlanSelection.
    await expect(id).toContainText(/MARS/i);
    await expect(id).toContainText(/LANDING/i);
  });
});

test.describe('/fly — Moon-mission mode (v0.1.8)', () => {
  test('?mission=apollo11 renders Earth-Moon scene (not Earth-Mars)', async ({ page }) => {
    await page.goto('/fly?mission=apollo11');
    // HUD identifies Apollo 11.
    const id = page.locator('[data-testid="mission-name"]');
    await expect(id).toContainText(/Apollo 11/i, { timeout: 10_000 });
    // Wait for the render-state hook to publish data-sim-day — proves
    // the Three.js animate loop has painted at least one frame.
    await expect(page.locator('[data-testid="fly-render-state"]')).toHaveAttribute(
      'data-sim-day',
      /\d/,
      { timeout: 10_000 },
    );
    // Verify the canvas isn't black — i.e. Moon-mode actually renders
    // something (Moon mesh + arc + markers).
    const hasContent = await page.evaluate(() => {
      const layers = document.querySelectorAll<HTMLElement>('.layer');
      const threeLayer = Array.from(layers).find((l) => l.tagName === 'DIV');
      const canvas = threeLayer?.querySelector('canvas') as HTMLCanvasElement | null;
      if (!canvas || canvas.width === 0) return false;
      const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      if (!gl) return false;
      const px = new Uint8Array(4);
      for (let i = 0; i < 20; i++) {
        const x = Math.floor(Math.random() * canvas.width);
        const y = Math.floor(Math.random() * canvas.height);
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
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

  test('?dest=neptune&type=flyby shows ADR-028 direct-trajectory caveat in identity HUD', async ({
    page,
  }) => {
    await page.goto('/fly?dest=neptune&type=flyby&dep=100&tof=12000');
    const id = page.locator('[data-testid="mission-name"]');
    await expect(id).toContainText(/NEPTUNE/i, { timeout: 10_000 });
    await expect(page.locator('.hud-trajectory-caveat')).toContainText(/Direct trajectory shown/i);
  });

  test('?mission=galileo loads Jupiter mission from index (3.0a-5)', async ({ page }) => {
    await page.goto('/fly?mission=galileo');
    const id = page.locator('[data-testid="mission-name"]');
    await expect(id).toContainText(/Galileo/i, { timeout: 15_000 });
  });

  test('default /fly (no params) still loads ORRERY DEMO scenario', async ({ page }) => {
    await page.goto('/fly');
    const id = page.locator('[data-testid="mission-name"]');
    await expect(id).toContainText(/ORRERY DEMO/, { timeout: 10_000 });
  });
});

test.describe('/fly — flight params HUD readout (v0.1.7 / ADR-027)', () => {
  // The .hud-flight-params + NEXT EVENT row are desktop-only —
  // CLAUDE.md mobile-first rules + the @media (max-width: 767px)
  // CSS rule in +page.svelte hide both on mobile to keep the bottom-
  // sheet panel layout uncluttered. Skip the whole block on mobile
  // viewports so CI doesn't flag the by-design hidden state.
  test.beforeEach(async ({ viewport }) => {
    test.skip(
      !!viewport && viewport.width < 768,
      'FLIGHT PARAMS HUD is desktop-only (mobile uses bottom-sheet panel)',
    );
  });

  test('?mission=curiosity surfaces real C3 and total ∆v in the HUD', async ({ page }) => {
    await page.goto('/fly?mission=curiosity');
    await expect(page.locator('[data-testid="mission-name"]')).toContainText(/Curiosity/i, {
      timeout: 10_000,
    });
    // FLIGHT PARAMS section title shows on desktop viewport.
    const flightHud = page.locator('.hud-flight-params');
    await expect(flightHud).toBeVisible();
    await expect(flightHud).toContainText(/FLIGHT PARAMS/);
    await expect(flightHud).toContainText(/11\.40 km²\/s²/);
    await expect(flightHud).toContainText(/6\.10 km\/s/);
  });

  test('?mission=mars3 shows sparse-data caveat banner in HUD', async ({ page }) => {
    await page.goto('/fly?mission=mars3');
    await expect(page.locator('[data-testid="mission-name"]')).toContainText(/Mars 3/i, {
      timeout: 10_000,
    });
    const flightHud = page.locator('.hud-flight-params');
    await expect(flightHud).toBeVisible();
    await expect(flightHud).toContainText(/SPARSE PUBLIC RECORDS/i);
  });

  test('default ORRERY DEMO has no FLIGHT PARAMS group (no regression)', async ({ page }) => {
    await page.goto('/fly');
    await expect(page.locator('[data-testid="mission-name"]')).toContainText(/ORRERY DEMO/, {
      timeout: 10_000,
    });
    // The demo scenario carries no flight sub-object, so the FLIGHT
    // PARAMS HUD group should not render.
    const flightHud = page.locator('.hud-flight-params');
    await expect(flightHud).toHaveCount(0);
  });

  /* ── v0.1.13 — NEXT EVENT row in /fly HUD ──────────────────────── */
  test('?mission=curiosity surfaces a NEXT EVENT row', async ({ page }) => {
    await page.goto('/fly?mission=curiosity');
    await expect(page.locator('[data-testid="mission-name"]')).toContainText(/Curiosity/i, {
      timeout: 10_000,
    });
    const nextEvent = page.locator('[data-testid="fly-next-event"]');
    await expect(nextEvent).toBeVisible();
    // At simDay = dep_day, the next event is the launch or TLI burn
    // (both very early). The label should match one of the canonical
    // mission events.
    await expect(nextEvent).toContainText(/T\+\d+d/i);
  });

  test('Mars 3 (sparse-data) surfaces structural events in the ticker', async ({ page }) => {
    await page.goto('/fly?mission=mars3');
    await expect(page.locator('[data-testid="mission-name"]')).toContainText(/Mars 3/i, {
      timeout: 10_000,
    });
    // Mars 3's editorial overlay is sparse but its flight.events has
    // structural TCMs + EDL + anomaly. The merged ticker shows them.
    const nextEvent = page.locator('[data-testid="fly-next-event"]');
    await expect(nextEvent).toBeVisible();
  });

  /* ── C.6 — Why popover on flight-caveat banner ─────────────────── */
  test('flight caveat exposes Why popover on reconstructed missions', async ({ page }) => {
    // Mars 3 is sparse-quality, so the FLIGHT PARAMS HUD shows the
    // caveat banner. The WhyPopover trigger renders alongside.
    await page.goto('/fly?mission=mars3');
    await expect(page.locator('[data-testid="mission-name"]')).toContainText(/Mars 3/i, {
      timeout: 10_000,
    });
    const caveat = page.locator('.flight-caveat-banner');
    await expect(caveat).toBeVisible();
    const trigger = caveat.locator('button.trigger');
    await expect(trigger).toBeVisible();
    await trigger.click();
    const popover = page.locator('[data-testid="why-popover"]');
    await expect(popover).toBeVisible();
    // ESC closes.
    await page.keyboard.press('Escape');
    await expect(popover).toHaveCount(0);
  });

  /* ── C.5 — Flight Director narration banner ────────────────────── */
  test('Flight Director banner is hidden until Science Lens is enabled', async ({ page }) => {
    await page.goto('/fly');
    const banner = page.locator('[data-testid="flight-director-banner"]');
    await expect(banner).toHaveCount(0);

    // Toggle the Science Lens via the nav button.
    await page.locator('button[aria-label="Toggle science lens"]').click();
    await expect(banner).toBeVisible();

    // The banner carries the current phase as a data-attribute. One of
    // the five known phases; departure/injection/cruise/approach/arrival.
    await expect(banner).toHaveAttribute(
      'data-phase',
      /^(departure|injection|cruise|approach|arrival)$/,
    );
    // The /science deep-link lives on the inner anchor — the outer
    // <section> got a sibling collapse button when the banner became
    // collapsible, so the href moved one level in.
    const linkHref = await banner.locator('a.banner-body-link').getAttribute('href');
    expect(linkHref).toMatch(/\/science\/[^/]+\/[^/]+$/);

    // Toggle off — banner should disappear again.
    await page.locator('button[aria-label="Toggle science lens"]').click();
    await expect(banner).toHaveCount(0);
  });
});
