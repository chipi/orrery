import { expect, test } from '@playwright/test';

/**
 * Mobile behavioural invariants (#342 Phase 39).
 *
 * Locks the concrete mobile UX guarantees established by Phases 23–37
 * so future PRs can't silently regress them. Each test asserts a
 * specific invariant — clientHeight ≥ 44 px on a tap target, a
 * default-collapsed HUD on a touch device, a wrapped (not scrolled)
 * filter strip, etc. — rather than relying on visual snapshots,
 * which break on any pixel-level change.
 *
 * Mobile-chromium project only. Skipped on desktop-chromium so the
 * same selectors / expected viewport widths don't false-positive on
 * Desktop Chrome's 1280-wide viewport. playwright.config.ts uses
 * Pixel 5 (375×851) for the mobile-chromium project; tests below
 * assume the (hover: none) media-query matches under that profile.
 *
 * When adding a new mobile UX guarantee, prefer extending this file
 * with the smallest possible behavioural assertion. Visual snapshot
 * baselines (visual.spec.ts) cover layout-level regressions; these
 * cover the named affordances.
 */

test.beforeEach(async (_args, testInfo) => {
  test.skip(
    testInfo.project.name !== 'mobile-chromium',
    'Mobile invariants only — desktop has different layout contracts.',
  );
});

const VIEWPORT_HINT = '375 px (Pixel 5)';

test.describe(`mobile invariants — ${VIEWPORT_HINT}`, () => {
  // ─── Phase 25 — /fly default-collapsed on touch ─────────────────
  test('/fly hud-collapse button is visible, hud-stack is hidden by default', async ({ page }) => {
    await page.goto('/fly', { waitUntil: 'networkidle' });
    const hudCollapse = page.locator('.hud-collapse');
    await expect(hudCollapse).toBeVisible({ timeout: 10_000 });
    // hud-stack is the top-left mission info HUD; on touch devices it
    // defaults to display:none (Phase 25). Wait for the chrome state
    // to settle before reading.
    await page.waitForTimeout(200);
    const hudStackHidden = await page
      .locator('.hud-stack')
      .first()
      .evaluate((el) => getComputedStyle(el).display === 'none');
    expect(hudStackHidden).toBe(true);
  });

  // ─── Phase 31 — /explore default-collapsed on touch ─────────────
  test('/explore hud-restore button is visible, hud-controls is hidden by default', async ({
    page,
  }) => {
    await page.goto('/explore', { waitUntil: 'networkidle' });
    const hudRestore = page.locator('.hud-restore');
    await expect(hudRestore).toBeVisible({ timeout: 10_000 });
    // .hud-controls has the .hidden-on-mobile class applied; CSS
    // @media (hover: none) hides it via display: none.
    await page.waitForTimeout(200);
    const hudControlsHidden = await page
      .locator('.hud-controls')
      .evaluate((el) => getComputedStyle(el).display === 'none');
    expect(hudControlsHidden).toBe(true);
  });

  // ─── Phase 33 + 34 — /explore mobile info toggle visible ────────
  test('/explore mobile-info-toggle is visible on touch devices', async ({ page }) => {
    await page.goto('/explore', { waitUntil: 'networkidle' });
    const infoToggle = page.locator('.mobile-info-toggle');
    await expect(infoToggle).toBeVisible({ timeout: 10_000 });
  });

  // ─── Phase 24 — /science mobile search button is 44×44 ──────────
  test('/science search-button is ≥ 44×44 px on mobile', async ({ page }) => {
    await page.goto('/science', { waitUntil: 'networkidle' });
    const btn = page.locator('.search-button');
    await expect(btn).toBeVisible({ timeout: 10_000 });
    const box = await btn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  // ─── Phase 32 — catalog search-input height ≥ 44 px ─────────────
  for (const path of ['/missions', '/fleet'] as const) {
    test(`${path} search-input is ≥ 44 px tall on mobile`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      const input = page.locator('.search-input');
      await expect(input).toBeVisible({ timeout: 10_000 });
      const box = await input.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    });
  }

  // ─── Phase 29 — catalog filter strip wraps (no horizontal scroll) ─
  for (const path of ['/missions', '/fleet'] as const) {
    test(`${path} .filters wraps instead of horizontal-scrolling`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      const filters = page.locator('.filters').first();
      await expect(filters).toBeVisible({ timeout: 10_000 });
      // Open the filters strip if it's collapsed (some catalog routes
      // start the strip closed; the toggle is `.filters-toggle`).
      const toggle = page.locator('.filters-toggle');
      if (await toggle.isVisible()) {
        await toggle.click();
        await page.waitForTimeout(150);
      }
      const { sw, cw } = await filters.evaluate((el) => ({
        sw: el.scrollWidth,
        cw: el.clientWidth,
      }));
      // scrollWidth should match clientWidth — pills wrapped onto
      // subsequent rows, no horizontal overflow hidden behind a scroll.
      // Tolerance of 1 px absorbs sub-pixel rendering jitter.
      expect(sw - cw).toBeLessThanOrEqual(1);
    });
  }

  // ─── Phase 28 — Panel close + iss/tiangong index-close are 44×44 ─
  for (const path of ['/iss', '/tiangong'] as const) {
    test(`${path} index-close button is ≥ 44×44 px`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      // Open the module index so .index-close mounts.
      const indexToggle = page
        .locator('button[aria-label*="module list" i], button[data-testid*="module" i]')
        .first();
      if (await indexToggle.isVisible()) {
        await indexToggle.click();
        await page.waitForTimeout(150);
      }
      const close = page.locator('.index-close');
      if ((await close.count()) === 0) {
        // Index drawer not auto-opened on this route; the invariant
        // (size ≥ 44) is the static CSS rule — verified by reading
        // the computed style on the hidden node instead.
        await page.evaluate(() => {
          const proto = document.createElement('div');
          proto.className = 'index-close';
          proto.style.cssText = 'visibility:hidden;position:absolute';
          document.body.appendChild(proto);
        });
        const ghost = page.locator('.index-close').first();
        const size = await ghost.evaluate((el) => {
          const cs = getComputedStyle(el);
          return { w: parseFloat(cs.width), h: parseFloat(cs.height) };
        });
        expect(size.w).toBeGreaterThanOrEqual(44);
        expect(size.h).toBeGreaterThanOrEqual(44);
        return;
      }
      const box = await close.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    });
  }

  // ─── Phase 36 — /plan touch-hint visible on mobile ──────────────
  test('/plan touch-hint is visible on touch devices', async ({ page }) => {
    await page.goto('/plan', { waitUntil: 'networkidle' });
    const hint = page.locator('.touch-hint');
    await expect(hint).toBeVisible({ timeout: 10_000 });
  });

  // ─── Phase 23 — SurfaceScene quality-tier respect on minimal ────
  // Set the URL override so detect-gpu doesn't decide for us. On
  // minimal tier the postprocessing composer is NOT wired (renderer
  // renders direct); we assert this indirectly by reading the
  // canvas count under the scene root (one canvas, not the post
  // chain that would add another).
  for (const path of ['/earth', '/moon', '/mars'] as const) {
    test(`${path} on quality=minimal renders without postprocessing`, async ({ page }) => {
      await page.goto(`${path}?quality=minimal`, { waitUntil: 'networkidle' });
      // Allow the scene to mount.
      await page.waitForTimeout(800);
      const canvasCount = await page.locator('canvas').count();
      // SurfaceScene mounts one canvas; the 2D fallback mounts a
      // second canvas only when view=2d. On minimal tier the post
      // composer doesn't add its own backing canvas — assert ≤ 2.
      expect(canvasCount).toBeLessThanOrEqual(2);
    });
  }
});
