import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

/**
 * Layer 1 mobile e2e — earth launch-pad tier imagery under the stream-heavy
 * `__MOBILE__` contract (#546 on ADR-078/-079).
 *
 * The whole /images bucket (hotspot tiers included) is pruned off-device and
 * streamed from the CDN via `streamedUrl()` — the seam SurfaceScene's
 * panorama skybox + tier patches load through. This spec proves, device-free
 * and against the exact `build/` tree Capacitor ships:
 *
 *   1. the earth tier assets are genuinely absent from the on-device bundle
 *   2. entering a pad panorama routes the texture fetch to the CDN origin
 *      (stubbed with the REAL panorama bytes, so THREE actually decodes it)
 *      and never touches the local origin's /images
 *
 * Mirrors streaming.spec.ts patterns (stubbed CDN, no network dependence).
 */

const CDN = 'https://chipi.github.io/orrery';
const PAN_PATH = '/images/hotspots/earth/baikonur-31-6/tier3-pan.jpg';

test.describe('mobile stream-heavy contract — earth hotspot tiers (#546)', () => {
  test('earth tier assets are pruned from the on-device bundle', async ({ request }) => {
    expect((await request.get(PAN_PATH)).status()).toBe(404);
    expect((await request.get('/images/hotspots/earth/lc-39a/tier2-detail.jpg')).status()).toBe(
      404,
    );
    // The sidecar DATA stays on-device (it's /data, not a streamed bucket) —
    // without it the panel could never offer the tier UI at all.
    expect((await request.get('/data/surface-hotspots.json')).status()).toBe(200);
  });

  test('pad panorama streams from the CDN and activates (from=descent auto-entry)', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

    const cdnPanoramaReqs: string[] = [];
    const localImageReqs: string[] = [];
    // Real bytes for the panorama so the texture decode path runs; empty 200s
    // for every other streamed asset (heroes, gallery thumbs).
    const panBytes = readFileSync(path.resolve(process.cwd(), `static${PAN_PATH}`));
    await page.route(`${CDN}/**`, (route) => {
      const u = new URL(route.request().url());
      if (u.pathname.endsWith('/tier3-pan.jpg')) {
        cdnPanoramaReqs.push(route.request().url());
        return route.fulfill({ status: 200, contentType: 'image/jpeg', body: panBytes });
      }
      return route.fulfill({ status: 200, body: Buffer.from([]) });
    });
    page.on('request', (req) => {
      const u = new URL(req.url());
      if (
        u.pathname.startsWith('/images/') &&
        (u.hostname === '127.0.0.1' || u.hostname === 'localhost')
      ) {
        localImageReqs.push(req.url());
      }
    });

    // from=descent auto-enters the tier-3 panorama once the fly-in settles —
    // the same deep-link the /fly descent hand-off uses.
    await page.goto('/earth?site=baikonur-31-6&from=descent');
    const overlay = page.getByTestId('panorama-overlay');
    await expect(overlay).toBeVisible({ timeout: 30_000 });

    // The skybox texture went to the CDN…
    expect(cdnPanoramaReqs.length, 'panorama fetched from CDN').toBeGreaterThan(0);
    // …and no /images request leaked to the local (on-device) origin.
    expect(localImageReqs, `local /images requests:\n${localImageReqs.join('\n')}`).toEqual([]);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
