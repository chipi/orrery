import { expect, test } from '@playwright/test';

/**
 * PWA update-propagation invariants (2026-06-30).
 *
 * Guards the "device silently frozen on an old version" bug class so a
 * regression fails CI instead of shipping invisibly (it can't be caught from
 * a dev's own desktop — desktop has a huge cache quota and updates fine).
 * Three real past failures this locks down:
 *   1. SW registration pointed at a 404 URL (hardcoded `/sw.js` under a based
 *      deploy) → no updates ever.
 *   2. New SW stuck in `waiting` (missing skipWaiting/clientsClaim) → never
 *      takes over the open tab.
 *   3. Precache too big (all imagery, ~1.7 GB) → install fails on iOS's small
 *      CacheStorage quota → SW never activates → device frozen.
 *
 * This is an INVARIANT guard, not a full two-build propagation sim (that would
 * need two deploys in one run). The byte budget is enforced at build time by
 * scripts/check-precache-budget.mjs; here we assert the runtime shape.
 */
// NOTE: we deliberately do NOT assert the SW reaches `active` at runtime here.
// SW registration/activation is environment-dependent in CI (secure-context
// + the app registers only in prod builds + activation timing), which makes
// such an assertion flaky and even context-poisoning. The invariants below
// are static, deterministic, and catch the real regressions; the SW being
// *served* is covered by pwa.spec.ts.
test.describe('PWA — update propagation invariants', () => {
  test('sw.js auto-activates updates (skipWaiting + clientsClaim)', async ({ request }) => {
    const res = await request.get('/sw.js');
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    // Without these, a new SW sits in `waiting` and the open tab never swaps.
    expect(body, 'sw.js must call skipWaiting').toMatch(/skipWaiting/);
    expect(body, 'sw.js must claim clients').toMatch(/clientsClaim|clients\.claim/);
  });

  test('imagery is NOT bulk-precached (iOS quota guard)', async ({ request }) => {
    const res = await request.get('/sw.js');
    const body = await res.text();
    const urls = [...body.matchAll(/url:\s*"([^"]+)"/g)].map((m) => m[1]);
    const rasters = urls.filter((u) => /\.(jpe?g|png|webp)$/i.test(u));
    // App-shell + a few bundled images is fine; precaching the whole gallery
    // (thousands of files) is what overflowed the iOS quota. Hard ceiling far
    // below the gallery size so a regression trips here.
    expect(rasters.length, `raster images in precache: ${rasters.length}`).toBeLessThan(500);
  });
});
