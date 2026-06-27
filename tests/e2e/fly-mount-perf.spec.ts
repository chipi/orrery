import { test, expect } from '@playwright/test';

/**
 * /fly mount-perf guard (v0.7 sweep).
 *
 * /fly is the heaviest 3D route (heliocentric + cislunar scenes, the
 * cinematic centerpiece) and was the only major scene with no
 * time-to-interactive budget — surface routes have surface-mount-perf,
 * /explore has perf-explore-iconic-clicks, but /fly had none. This adds
 * the same TTI contract: the scene must build its trajectory + expose its
 * introspection hook within a few seconds.
 *
 * Readiness signal: `window.__flyArcHash()` returns a non-null hash once
 * the scene has built the transfer arc (the planet system + Keplerian
 * ellipse are up by then). Same shape as the surface routes'
 * `__surfaceSceneSelectSite` hook.
 */

test('/fly — scene becomes interactive within a few seconds', async ({ page, isMobile }) => {
  const t0 = Date.now();
  await page.goto('/fly');
  await page.waitForFunction(
    () => {
      const w = window as { __flyArcHash?: () => string | null };
      return typeof w.__flyArcHash === 'function' && w.__flyArcHash() !== null;
    },
    null,
    // Mobile-chromium on CI is meaningfully slower; give it 2× the desktop
    // budget without masking a real hang.
    { timeout: isMobile ? 20_000 : 12_000 },
  );
  const ms = Date.now() - t0;
  // eslint-disable-next-line no-console
  console.log(`[perf] /fly time-to-interactive = ${ms} ms`);
  expect(ms, `/fly took ${ms}ms to become interactive`).toBeLessThan(isMobile ? 12_000 : 7000);
});

test('/fly?mission= — deep-linked mission arc builds within budget', async ({ page, isMobile }) => {
  const t0 = Date.now();
  await page.goto('/fly?mission=cassini');
  // The deep-link path applies the mission then builds its arc; wait for
  // both the hook + the mission id to settle.
  await page.waitForFunction(
    () => {
      const w = window as {
        __flyArcHash?: () => string | null;
        __flyMissionId?: () => string | null;
      };
      return (
        typeof w.__flyArcHash === 'function' &&
        w.__flyArcHash() !== null &&
        w.__flyMissionId?.() === 'cassini'
      );
    },
    null,
    { timeout: isMobile ? 25_000 : 15_000 },
  );
  const ms = Date.now() - t0;
  // eslint-disable-next-line no-console
  console.log(`[perf] /fly?mission=cassini time-to-arc = ${ms} ms`);
  expect(ms, `/fly?mission=cassini took ${ms}ms to build its arc`).toBeLessThan(
    isMobile ? 15_000 : 9000,
  );
});
