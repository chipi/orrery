import { test, expect } from '@playwright/test';

/**
 * Layer 1 mobile e2e — asserts the stream-heavy `__MOBILE__` contract baked
 * into the Capacitor build (ADR-078 / ADR-079), running against the
 * `build:mobile` output via `vite preview`. See docs/guides/mobile-testing.md.
 *
 * This is what turns "the streaming architecture can only be checked by
 * eyeballing a simulator" into a CI gate: it proves, device-free, that heavy
 * buckets are pruned on-device + routed to the CDN, that the default locale
 * stays offline-usable, and that the 4K textures are gated off. The genuinely
 * native surface (safe-area, plugins, WebGL context-loss) is Layer 2/3.
 *
 * Network-independent: the GitHub Pages origin is stubbed, so a CDN outage
 * never turns this red.
 */

const CDN = 'https://chipi.github.io/orrery';

test.describe('mobile stream-heavy contract', () => {
  test('landing hero image is served from the stream CDN, not the local bundle', async ({
    page,
  }) => {
    // Stub the CDN so the run never depends on chipi.github.io being reachable.
    await page.route(`${CDN}/**`, (route) =>
      route.fulfill({ status: 200, contentType: 'image/webp', body: Buffer.from([]) }),
    );
    await page.goto('/');
    // The hero <img> src is baked absolute-to-CDN at build time via assetOrigin.
    const cdnHero = page.locator(`img[src^="${CDN}/images/"]`);
    await expect(cdnHero.first()).toBeAttached();
  });

  test('image + audio requests target the CDN origin, never the local preview', async ({
    page,
  }) => {
    const localAssetReqs: string[] = [];
    const cdnAssetReqs: string[] = [];
    await page.route(`${CDN}/**`, (route) => {
      cdnAssetReqs.push(route.request().url());
      return route.fulfill({ status: 200, body: Buffer.from([]) });
    });
    page.on('requestfinished', (req) => {
      const u = new URL(req.url());
      const streamedBucket = u.pathname.startsWith('/images/') || u.pathname.startsWith('/audio/');
      if (streamedBucket && (u.hostname === '127.0.0.1' || u.hostname === 'localhost')) {
        localAssetReqs.push(req.url());
      }
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // No streamed bucket may be fetched from the local (on-device) origin…
    expect(localAssetReqs, `local streamed-bucket requests:\n${localAssetReqs.join('\n')}`).toEqual(
      [],
    );
    // …and at least one asset must have actually gone to the CDN.
    expect(cdnAssetReqs.length).toBeGreaterThan(0);
  });

  test('streamed + pruned buckets 404 locally; on-device buckets are served', async ({
    request,
  }) => {
    // Streamed off-device (ADR-078) — must NOT be in the local bundle.
    expect((await request.get('/images/app-landing-hero.webp')).status()).toBe(404);
    expect((await request.get('/data/i18n/de.json')).status()).toBe(404); // non-default locale
    // 4K LOD textures pruned + gated off (ADR-079 D3).
    expect((await request.get('/textures/4k_moon.jpg')).status()).toBe(404);
    expect((await request.get('/textures/4k_sun.jpg')).status()).toBe(404);

    // Kept on-device so the app is fully usable offline from install.
    expect((await request.get('/data/i18n/en-US.json')).status()).toBe(200); // default locale
    expect((await request.get('/textures/2k_moon.jpg')).status()).toBe(200); // 2K sibling
    expect((await request.get('/textures/4k_io.jpg')).status()).toBe(404); // 4K pruned (#596)
    expect((await request.get('/textures/2k_io.jpg')).status()).toBe(200); // its 2K base
  });

  // #482 added /credit-thumbs and /diagrams width rungs; the mobile bundle
  // prunes both (prune-streamed-assets.mjs) so it stays under the 75 MB budget.
  test('credit thumbs and diagram rungs are pruned; the base diagram stays', async ({
    request,
  }) => {
    expect((await request.get('/credit-thumbs/images/deep-sky/chandra-crab.webp')).status()).toBe(
      404,
    );
    expect((await request.get('/diagrams/science/aerobraking-640.webp')).status()).toBe(404);
    expect((await request.get('/diagrams/science/aerobraking.webp')).status()).toBe(200);
  });

  test('/credits streams its thumbnails from the CDN, never the local bundle', async ({ page }) => {
    const local: string[] = [];
    const cdn: string[] = [];
    await page.route(`${CDN}/**`, (route) => {
      if (route.request().url().includes('/credit-thumbs/')) cdn.push(route.request().url());
      return route.fulfill({ status: 200, contentType: 'image/webp', body: Buffer.from([]) });
    });
    page.on('request', (req) => {
      const u = new URL(req.url());
      if (u.pathname.startsWith('/credit-thumbs/') && u.hostname !== new URL(CDN).hostname)
        local.push(req.url());
    });
    await page.goto('/credits');
    await page.waitForLoadState('networkidle');
    await page.mouse.wheel(0, 20000);
    await page.waitForTimeout(1500);
    expect(local, `local credit-thumb requests:\n${local.join('\n')}`).toEqual([]);
    expect(cdn.length, 'some credit thumbnails should load from the CDN').toBeGreaterThan(0);
  });

  // content-visibility:auto on the source blocks (removed 2026-10-21) made a
  // Sources link land short and left the lazy images it reached unrequested.
  test('a /credits Sources link lands on its block and the images there load', async ({ page }) => {
    await page.route(`${CDN}/**`, (route) =>
      route.fulfill({ status: 200, contentType: 'image/webp', body: Buffer.from([]) }),
    );
    await page.goto('/credits');
    await page.waitForLoadState('networkidle');
    // DOM click: a Playwright tap waits for a stable layout, which a page of
    // ~2 800 loading images never has.
    await page.evaluate(() =>
      document.querySelector<HTMLAnchorElement>('a[href="#src-nasa"]')?.click(),
    );
    const block = page.locator('#src-nasa');
    await expect
      .poll(async () => Math.abs((await block.boundingBox())?.y ?? 9e9), { timeout: 10_000 })
      .toBeLessThan(200);
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              [...document.querySelectorAll('img')].filter((i) => {
                const r = i.getBoundingClientRect();
                return r.bottom > 0 && r.top < innerHeight && r.width > 0 && !i.currentSrc;
              }).length,
          ),
        { timeout: 10_000, message: 'images in view after the jump that were never requested' },
      )
      .toBe(0);
  });

  test('a /science diagram carries no srcset, so no pruned rung can be chosen', async ({
    page,
  }) => {
    // Asserted on the DOM, not the network: at this viewport the browser would
    // pick the base file from a srcset anyway, so a network check can't see a
    // srcset that points at pruned rungs (it passed with the mobile skip removed).
    const rungs: string[] = [];
    await page.route(`${CDN}/**`, (route) => route.fulfill({ status: 200, body: Buffer.from([]) }));
    page.on('request', (req) => {
      const p = new URL(req.url()).pathname;
      if (p.startsWith('/diagrams/') && /-\d+\.webp$/.test(p)) rungs.push(p);
    });
    // A section page: the /science landing's chapter diagrams are SVGs (no ladder).
    await page.goto('/science/mission-phases/aerobraking');
    await page.waitForLoadState('networkidle');
    const diagramImgs = page.locator('img[src*="/diagrams/science/aerobraking"]');
    await expect(diagramImgs.first()).toBeAttached();
    await expect(page.locator('img[srcset*="/diagrams/"]')).toHaveCount(0);
    expect(rungs, `pruned diagram rungs requested:\n${rungs.join('\n')}`).toEqual([]);
  });

  test('service-worker precache manifest is en-US only', async ({ request }) => {
    const sw = await (await request.get('/sw.js')).text();
    expect(sw).toContain('data/i18n/en-US.json');
    expect(sw).not.toContain('data/i18n/de.json');
    expect(sw).not.toContain('data/i18n/fr.json');
  });

  test('non-en locale HTML is pruned; the SPA fallback shell can render it client-side', async ({
    request,
  }) => {
    // Per-locale prerendered HTML dropped off-device (ADR-079). On-device the
    // app renders these routes client-side.
    expect((await request.get('/de/science.html')).status()).toBe(404);
    expect((await request.get('/fr.html')).status()).toBe(404);

    // The offline shell that serves them: adapter fallback + SW navigateFallback
    // both point at 404.html, which carries the hashed app bundle → boots the
    // SPA, reroute-strips the locale prefix, and renders client-side.
    const shell = await request.get('/404.html');
    expect(shell.status()).toBe(200);
    expect(await shell.text()).toContain('_app/immutable');
  });

  // Regression guard for the __MOBILE__ 4K-texture gates (ADR-079 D3). The
  // pruned-bucket 404 checks above pass whether or not the gates exist — this
  // one loads a 3D scene and asserts no pruned 4K texture is actually REQUESTED.
  // Catches an un-gated load site (e.g. a satellite base wired to 4k_moon.jpg).
  test('3D scene requests no pruned 4K texture on mobile (gate regression guard)', async ({
    page,
  }) => {
    const PRUNED_4K =
      /\/textures\/4k_(moon|sun|mars|mercury|venus_atmosphere|jupiter|saturn|earth_daymap)\.jpg$/;
    const bad: string[] = [];
    const loadedTextures: string[] = [];
    await page.route(`${CDN}/**`, (route) => route.fulfill({ status: 200, body: Buffer.from([]) }));
    page.on('request', (req) => {
      const p = new URL(req.url()).pathname;
      if (PRUNED_4K.test(p)) bad.push(p);
      if (p.startsWith('/textures/')) loadedTextures.push(p);
    });
    await page.goto('/explore');
    // Let the WebGL scene initialise + kick off its texture loads.
    await page.waitForTimeout(6000);
    // Sanity: the scene actually loaded on-device (2K) textures — otherwise a
    // silent no-load would make the negative assertion below vacuously pass.
    expect(loadedTextures.length, 'scene should have requested on-device textures').toBeGreaterThan(
      0,
    );
    expect(bad, `un-gated pruned-4K texture requests:\n${bad.join('\n')}`).toEqual([]);
  });
});
