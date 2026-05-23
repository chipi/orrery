import { test, expect } from '@playwright/test';

/**
 * Moon Tier 2 + TierContext info card + Tier 3 "Stand at site"
 * smoke (PRD-014 §v0.7.x #PC).
 *
 * The full Tier 2 disc-reveal interaction (zoom-in until
 * data-hotspot-tier == "2", info card pops, halo hides) is
 * timing-sensitive on mobile-chromium and runs separately in
 * hotspots.spec.ts. This file covers the *static* assertions a
 * deep-link can deliver without programmatic camera control:
 *   1. apollo11 deep-link opens the panel with all four tabs.
 *   2. the patch JPEG on disk is served (no 404).
 *   3. the "Stand at site" button renders (apollo11 has
 *      hotspot_tier3_panorama set).
 *
 * Failure mode this would catch: a future commit drops the
 * static patch from disk, or removes the tier3_panorama field
 * from the sidecar, or breaks the panel's tab rendering.
 */

test.describe('Moon — Tier 2 patch + Tier 3 button smoke', () => {
  test('/moon?site=apollo11 deep-link opens panel + Stand-at-site visible', async ({ page }) => {
    await page.goto('/moon?site=apollo11');
    // Wait for the panel to mount (panel-tab-overview is on the OVERVIEW tab button).
    await expect(page.getByRole('tab', { name: 'OVERVIEW' })).toBeVisible({ timeout: 20_000 });
    // Stand-at-site button renders only when hotspot_tier3_panorama is
    // set on the site's sidecar entry.
    await expect(page.getByRole('button', { name: /stand at site/i })).toBeVisible({
      timeout: 5_000,
    });
  });

  test('apollo11 Tier 2 LROC patch JPEG is served', async ({ request }) => {
    const res = await request.get('/images/hotspots/moon/apollo11/tier2-lroc.jpg');
    expect(res.status()).toBe(200);
    const buf = await res.body();
    // 2 KB minimum sanity check — real patches are ~600 KB - 2 MB.
    expect(buf.length).toBeGreaterThan(2048);
  });

  test('apollo11 Tier 3 panorama JPEG is served', async ({ request }) => {
    const res = await request.get('/images/hotspots/moon/apollo11/tier3-pan.jpg');
    expect(res.status()).toBe(200);
    const buf = await res.body();
    // Panorama is 4096x2048 — at least 50 KB after sharp re-encode.
    expect(buf.length).toBeGreaterThan(50_000);
  });

  test('change4 Tier 3 panorama (first farside view) is served', async ({ request }) => {
    const res = await request.get('/images/hotspots/moon/change4/tier3-pan.jpg');
    expect(res.status()).toBe(200);
    const buf = await res.body();
    expect(buf.length).toBeGreaterThan(50_000);
  });

  test('beresheet Tier 2 patch (Phase 2.5 hand-curated) is served', async ({ request }) => {
    const res = await request.get('/images/hotspots/moon/beresheet/tier2-lroc.jpg');
    expect(res.status()).toBe(200);
    const buf = await res.body();
    expect(buf.length).toBeGreaterThan(2048);
  });

  // v0.7.0 Step 1 — all 18 Moon sites now ship Tier 3 panoramas
  // (10 newly added: change3/5/6, chandrayaan3, slim, luna16/17/21/24, beresheet).
  // No "graceful absent button" anywhere on /moon. Mirrors mars3/beagle2/schiaparelli
  // editorial pattern where single-frame / descent-only imagery is padded honestly.
  const ALL_MOON_TIER3_SITES = [
    'apollo11',
    'apollo12',
    'apollo14',
    'apollo15',
    'apollo16',
    'apollo17',
    'change3',
    'change4',
    'change5',
    'change6',
    'chandrayaan3',
    'slim',
    'luna16',
    'luna17',
    'luna21',
    'luna24',
    'beresheet',
    'luna9',
  ];

  for (const site of ALL_MOON_TIER3_SITES) {
    if (site === 'luna9') continue; // luna9 has no LROC coords yet → Tier 2/3 deferred
    if (site === 'apollo11' || site === 'change4') continue; // covered by explicit tests above
    test(`${site} Tier 3 panorama JPEG is served`, async ({ request }) => {
      const res = await request.get(`/images/hotspots/moon/${site}/tier3-pan.jpg`);
      expect(res.status()).toBe(200);
      const buf = await res.body();
      expect(buf.length).toBeGreaterThan(50_000);
    });
  }
});
