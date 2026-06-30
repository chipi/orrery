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
test.describe('PWA — update propagation invariants', () => {
  test('service worker registers and reaches an active worker', async ({ page }) => {
    await page.goto('/');
    const state = await page
      .waitForFunction(
        async () => {
          if (!('serviceWorker' in navigator)) return 'no-sw-api';
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg?.active) return 'active';
          return false;
        },
        { timeout: 15_000 },
      )
      .then((h) => h.jsonValue());
    expect(state).toBe('active');
  });

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
