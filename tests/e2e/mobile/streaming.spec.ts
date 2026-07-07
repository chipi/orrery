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
    expect((await request.get('/textures/4k_io.jpg')).status()).toBe(200); // base-4K, downscaled
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
});
