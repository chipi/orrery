import { test, expect } from '@playwright/test';
import { clickViaEvaluate } from './_helpers/click-via-evaluate';

/**
 * /earth launch-pad tier ladder e2e (#546 phases 1-3).
 *
 * The moon/mars Surface Hotspots ladder now covers all 26 launch pads
 * (Tier-2 detail + regional imagery) with Tier-3 ground panoramas on 6
 * pads. The renderer machinery is the same SurfaceScene path the
 * moon/mars specs exercise — this file covers what is earth-specific:
 *
 *   1. the sidecar → adapter spread merge (getEarthLaunchSites) actually
 *      delivers tier fields to the panel (Stand-at-site presence/absence)
 *   2. the earth tier assets exist and are served (moon-tier2.spec.ts
 *      pattern — catches a dropped file or a sidecar path typo)
 *   3. the perf rule: zero hotspot imagery requests at rest (tier
 *      textures build on promotion only — AGENTS.md §3D discipline)
 *   4. one full panorama enter/exit lifecycle on the flagship pad
 *      (mars-tier3-panorama.spec.ts pattern)
 *
 * Site lists are hardcoded (moon-tier2.spec.ts precedent) — a new pad
 * needs a row here, and a pad accidentally dropped from the sidecar
 * fails the asset loop.
 */

// All 26 pads carry Tier-2 detail + regional (#546 phases 1-2).
const ALL_PAD_IDS = [
  'lc-39a',
  'lc-39b',
  'cape-canaveral-slc-40',
  'cape-canaveral-slc-41',
  'cape-canaveral-lc-36b',
  'lc-5',
  'lc-14',
  'lc-34',
  'starbase-orbital-a',
  'vandenberg-slc-4e',
  'baikonur-1-5',
  'baikonur-31-6',
  'baikonur-200',
  'gagarins-start',
  'plesetsk-41-1',
  'plesetsk-43',
  'kourou-ela-2',
  'kourou-ela-3',
  'kourou-ela-4',
  'tanegashima-yoshinobu',
  'sriharikota-slp',
  'jiuquan-slc-43',
  'taiyuan-lc-9',
  'wenchang-lc-101',
  'xichang-lc-2',
  'xichang-lc-3',
];

// The 6 pads with an open-licensed ground photo (#546 phase 3).
const TIER3_PAD_IDS = [
  'baikonur-31-6',
  'baikonur-1-5',
  'vandenberg-slc-4e',
  'sriharikota-slp',
  'jiuquan-slc-43',
  'wenchang-lc-101',
];

test.describe('/earth tier ladder — panel wiring', () => {
  test('tier-3 pad deep-link shows Stand-at-site (sidecar merge delivers)', async ({ page }) => {
    await page.goto('/earth?site=baikonur-31-6');
    await expect(page.getByRole('tab', { name: 'OVERVIEW' })).toBeVisible({ timeout: 20_000 });
    // Renders only when selected.hotspot_tier3_panorama survives the
    // adapter's sidecar spread merge — the earth-specific wiring.
    await expect(page.getByTestId('stand-at-site')).toBeVisible({ timeout: 5_000 });
  });

  test('tier-2-only pad has no Stand-at-site button (regression gate)', async ({ page }) => {
    await page.goto('/earth?site=lc-39a');
    await expect(page.getByRole('tab', { name: 'OVERVIEW' })).toBeVisible({ timeout: 20_000 });
    // lc-39a is tier_max 2 — a sidecar regression that grows a stray
    // tier3 field (or a merge bug that leaks another site's) fails here.
    await expect(page.getByTestId('stand-at-site')).toHaveCount(0);
  });
});

test.describe('/earth tier ladder — no hotspot imagery at rest', () => {
  test('landing on /earth requests zero /images/hotspots/ assets', async ({ page }) => {
    // AGENTS.md §"Performance — 3D scene discipline": tier textures are
    // multi-MB and build only on LOD promotion. 26 enrolled pads eagerly
    // fetching 52 tiles at mount would flood network + GPU; this pins
    // the contract (was only ever verified by hand before #546 shipped).
    const hotspotRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/images/hotspots/')) hotspotRequests.push(req.url());
    });
    await page.goto('/earth');
    await page.waitForLoadState('networkidle');
    const canvas = page.locator('[data-sites-count]');
    await expect(canvas.first()).toBeAttached({ timeout: 10_000 });
    expect(hotspotRequests, hotspotRequests.join('\n')).toEqual([]);
  });
});

test.describe('/earth tier ladder — panorama lifecycle (flagship pad)', () => {
  test('Stand at site → panorama active → exit → back to orbit', async ({ page, isMobile }) => {
    test.slow(isMobile, 'mobile /earth sites+objects load chain > 30 s budget');
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

    await page.goto('/earth?site=baikonur-31-6', { waitUntil: 'networkidle' });
    const stand = page.getByTestId('stand-at-site');
    await expect(stand).toBeVisible({ timeout: 30_000 });

    await clickViaEvaluate(stand);

    const overlay = page.getByTestId('panorama-overlay');
    await expect(overlay).toBeVisible({ timeout: 5_000 });

    // Desktop reuses the panel slot; mobile shows a floating exit over
    // the fullscreen panorama (mars-tier3-panorama.spec.ts pattern).
    const exit = page.getByTestId(isMobile ? 'panorama-floating-exit' : 'exit-panorama');
    await expect(exit).toBeVisible();
    await expect(stand).toHaveCount(0);

    if (isMobile) {
      await clickViaEvaluate(exit);
    } else {
      await page.keyboard.press('Escape');
    }

    // Exit tears down the panorama scene and rebuilds orbit + panel —
    // same heavy re-render budget the mars spec allows.
    await expect(overlay).toHaveCount(0, { timeout: 15_000 });
    await expect(exit).toHaveCount(0);
    if (!isMobile) {
      await expect(stand).toBeVisible({ timeout: 15_000 });
    }

    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('/earth tier ladder — assets served', () => {
  for (const site of ALL_PAD_IDS) {
    test(`${site} Tier 2 detail + regional JPEGs are served`, async ({ request }) => {
      for (const tile of ['tier2-detail', 'tier2-regional']) {
        const res = await request.get(`/images/hotspots/earth/${site}/${tile}.jpg`);
        expect(res.status(), `${site}/${tile}`).toBe(200);
        const buf = await res.body();
        // 2 KB floor (moon-tier2.spec.ts sanity level) — real tiles are
        // ~40 KB (coarse Sentinel-2 fallback) to ~1.5 MB (NAIP detail).
        expect(buf.length, `${site}/${tile}`).toBeGreaterThan(2048);
      }
    });
  }

  for (const site of TIER3_PAD_IDS) {
    test(`${site} Tier 3 panorama JPEG is served`, async ({ request }) => {
      const res = await request.get(`/images/hotspots/earth/${site}/tier3-pan.jpg`);
      expect(res.status()).toBe(200);
      const buf = await res.body();
      // 4096×2048 equirects — smallest (Gagarin's Start banner) ~100 KB.
      expect(buf.length).toBeGreaterThan(50_000);
    });
  }
});
