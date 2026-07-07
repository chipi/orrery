import { test, expect } from '@playwright/test';

/**
 * Station-scene mount-perf guard (#89 — "measure 3D browser performance and
 * assess how ISS/Tiangong would work on other computers").
 *
 * The ISS + Tiangong Explorers are the two heaviest first-load 3D scenes
 * (multi-module GLB station meshes). This measures how long each takes to
 * become interactive from a cold navigation and guards it with a budget —
 * time-to-interactive on the CI runner (which uses software-rasterised
 * WebGL, the slowest realistic path) is a proxy for lower-end-device
 * viability. Mirrors the surface-scene guard in surface-mount-perf.spec.ts.
 *
 * "Interactive" = the scene has mounted its renderer + camera + module
 * meshes and exposed its picking hook (the same signal the functional
 * station specs and the keyboard-nav helper rely on). Budgets are generous
 * (CI software WebGL is slow) but tight enough to catch a real regression —
 * e.g. the pre-forceContextLoss GPU-context leak that stalled these scenes.
 */

const SCENES = [
  { route: '/iss', hook: '__issPickAt' },
  { route: '/tiangong', hook: '__tiangongPickAt' },
] as const;

for (const { route, hook } of SCENES) {
  test(`${route} — station scene becomes interactive within budget`, async ({ page, isMobile }) => {
    const t0 = Date.now();
    await page.goto(route);
    await page.waitForFunction(
      (h) => typeof (window as unknown as Record<string, unknown>)[h] === 'function',
      hook,
      { timeout: 25_000 },
    );
    const ms = Date.now() - t0;
    // eslint-disable-next-line no-console
    console.log(`[perf] ${route} time-to-interactive = ${ms} ms (${isMobile ? 'mobile' : 'desktop'})`);
    // Measured ~85-160ms locally (hardware WebGL) across desktop + both
    // mobile projects; budget keeps ~50x headroom for CI's software WebGL
    // while still catching a multi-second stall (the context-leak class of
    // regression that previously ran the scene to a 25-min timeout).
    const budget = isMobile ? 12_000 : 8_000;
    expect(ms, `${route} took ${ms}ms to become interactive (budget ${budget}ms)`).toBeLessThan(
      budget,
    );
  });
}
