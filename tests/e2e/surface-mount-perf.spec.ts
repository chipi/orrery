import { test, expect } from '@playwright/test';

/**
 * Surface-page mount-perf guard (#363).
 *
 * Regression context: #360/#361 added along-route HiRISE patches (Mars)
 * and Kaguya regional + LROC detail patches (Moon) that were built +
 * downloaded for EVERY site/rover at mount, regardless of zoom — a flood
 * of dozens of multi-MB textures (Mars ~127 / ~55 MB, Moon ~36 / ~59 MB)
 * that competed with the base planet texture and stalled first paint by
 * several seconds.
 *
 * The fix makes that imagery lazy + per-landing-zone: tier-2 patches build
 * only when the LOD dispatcher promotes a specific hotspot (you zoom into
 * it); rover route patches build only when that rover is selected. So at
 * mount, BEFORE any interaction, essentially no hotspot imagery should
 * load — and it must still load once you actually zoom/select (no feature
 * dropped).
 */

/** Count hotspot/route patch image requests; ignore the base planet +
 *  marker thumbnails (those aren't the regression). */
function isHotspotImage(url: string): boolean {
  return /\/images\/hotspots\/.*\.(jpe?g|png|webp)$/i.test(url);
}

const ROUTES = ['/mars', '/moon', '/earth'] as const;

for (const route of ROUTES) {
  test(`${route} — no hotspot-imagery flood at mount`, async ({ page }) => {
    const hotspotReqs: string[] = [];
    page.on('request', (r) => {
      if (r.resourceType() === 'image' && isHotspotImage(r.url())) hotspotReqs.push(r.url());
    });

    await page.goto(route);
    // Wait for the scene to mount + settle WITHOUT any interaction.
    await page
      .waitForFunction(
        () =>
          typeof (window as { __surfaceSceneSelectSite?: unknown }).__surfaceSceneSelectSite ===
          'function',
        null,
        { timeout: 20_000 },
      )
      .catch(() => {});
    await page.waitForTimeout(6000);

    console.log(`[perf] ${route} mount-time hotspot image requests = ${hotspotReqs.length}`);

    // Pre-fix this was ~127 (Mars) / ~36 (Moon). Lazy per-zone loading
    // means near-zero before the user interacts. A small budget absorbs
    // any single always-on asset without masking a flood regression.
    expect(
      hotspotReqs.length,
      `mount-time hotspot image requests on ${route}:\n${hotspotReqs.slice(0, 8).join('\n')}`,
    ).toBeLessThan(8);
  });

  test(`${route} — planet scene becomes interactive within a few seconds`, async ({ page }) => {
    const t0 = Date.now();
    await page.goto(route);
    // Scene-ready = SurfaceScene mounted its renderer + exposed the
    // selection hook (the planet mesh + base texture are up by then).
    await page.waitForFunction(
      () =>
        typeof (window as { __surfaceSceneSelectSite?: unknown }).__surfaceSceneSelectSite ===
        'function',
      null,
      { timeout: 20_000 },
    );
    const ms = Date.now() - t0;

    console.log(`[perf] ${route} time-to-interactive = ${ms} ms`);
    expect(ms, `${route} took ${ms}ms to become interactive`).toBeLessThan(5000);
  });
}

test('/mars — selecting a rover lazily loads its route imagery (feature intact)', async ({
  page,
}) => {
  // Heavy /mars surface interaction (mount + rover select + lazy imagery); the
  // GPU-less CI runner renders it far slower than local, so give it 3× the wall.
  test.slow();
  const hotspotReqs: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'image' && isHotspotImage(r.url())) hotspotReqs.push(r.url());
  });

  await page.goto('/mars');
  await page.waitForFunction(
    () =>
      typeof (window as { __surfaceSceneSelectSite?: unknown }).__surfaceSceneSelectSite ===
      'function',
    null,
    { timeout: 20_000 },
  );
  await page.waitForTimeout(2000);
  const atMount = hotspotReqs.length;

  // Select Curiosity (has route_patches) via the scene's test hook.
  await page.evaluate(() => {
    (window as { __surfaceSceneSelectSite?: (id: string) => void }).__surfaceSceneSelectSite?.(
      'curiosity',
    );
  });
  // Its along-route HiRISE imagery should now load (it didn't at mount).
  await expect.poll(() => hotspotReqs.length, { timeout: 15_000 }).toBeGreaterThan(atMount);
});
