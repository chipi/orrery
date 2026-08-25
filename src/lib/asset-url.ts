import { base } from '$app/paths';
import { DEFAULT_LOCALE } from './locale';
import { targetConfig } from './target-env';
import { resolveOffline } from './native/offline/offline-assets';

/**
 * Asset-origin spine (ADR-079 D1).
 *
 * Heavy asset buckets — gallery/hero imagery, narration audio, and
 * non-default-locale overlay bundles — are pruned from the Capacitor
 * on-device bundle (ADR-078) and streamed from a configured origin. This
 * module is the single seam that decides local-vs-streamed origin, so no
 * caller hard-codes it.
 *
 * In every browser build `__MOBILE__` is `false`, so `assetOrigin === base`
 * and the app streams origin-relative from whatever host serves it (byte-
 * identical to before this module existed). Only the Capacitor build — which
 * is served from `capacitor://localhost` and has no host to infer — needs an
 * explicit origin.
 */

/**
 * Origin the mobile build streams pruned buckets from. Injected at build time
 * from the `STREAM_ORIGIN` env var (vite `define`) — NOT hardcoded, so a dev
 * build points at a local server and a release build points at the current
 * host (GitHub Pages → VPS IP → domain), changed by one env var per build.
 * Defaults to the current prod origin when the env var is unset.
 */
// Normalised at the single consumption chokepoint: any trailing slash on the
// injected origin would produce `//images/…` 404s (see vite.config define).
export const STREAM_ORIGIN = __STREAM_ORIGIN__.replace(/\/+$/, '');

// ADR-083: an INTERNAL mobile build resolves the stream origin from the runtime
// target (staging/prod), read once here at module-eval — flip + relaunch to
// change (the @sentry/capacitor native sink rebinds on relaunch too). Web + App
// Store release builds (`__MOBILE_INTERNAL__` false) use the single baked
// STREAM_ORIGIN — byte-identical to before, and `targetConfig()` is tree-shaken
// out. SSR/prerender of an internal build has no localStorage → staging default.
const ACTIVE_STREAM_ORIGIN = __MOBILE_INTERNAL__
  ? targetConfig().streamOrigin.replace(/\/+$/, '')
  : STREAM_ORIGIN;

// ─── Pure resolvers ──────────────────────────────────────────────────────
// The logic, parameterised on `mobile` + `base` so both the browser and the
// Capacitor path are unit-testable (the public API below binds them to the
// build's compile-time `__MOBILE__` and the runtime `base`).

/** Origin for images + audio: the (active) stream origin under mobile, else `base`. */
export function resolveAssetOrigin(mobile: boolean, localBase: string): string {
  return mobile ? ACTIVE_STREAM_ORIGIN : localBase;
}

/** Prefix a root-relative streamed-bucket URL with the stream origin (mobile only). */
export function resolveStreamedUrl(url: string, mobile: boolean): string {
  if (!mobile) return url;
  return url.startsWith('/images/') || url.startsWith('/audio/')
    ? `${ACTIVE_STREAM_ORIGIN}${url}`
    : url;
}

/**
 * Per-locale bundle origin: default locale stays local; others stream under
 * mobile — but ONLY at device runtime. During build-time prerender (`ssr`),
 * every per-locale bundle is present locally in the build, so we never reach
 * for the stream CDN: doing so makes the build fetch bundles over the network
 * (non-hermetic, intermittently 404s under mobile-e2e's stubbed CDN).
 */
export function resolveLocaleBundleOrigin(
  locale: string,
  mobile: boolean,
  localBase: string,
  defaultLocale: string = DEFAULT_LOCALE,
  ssr: boolean = false,
): string {
  if (ssr) return localBase;
  return mobile && locale !== defaultLocale ? ACTIVE_STREAM_ORIGIN : localBase;
}

// ─── Public API (bound to the build) ─────────────────────────────────────

/**
 * Origin for images + audio. Streamed from `STREAM_ORIGIN` under the
 * Capacitor stream-heavy build; the local `base` in every browser build.
 */
export const assetOrigin: string = resolveAssetOrigin(__MOBILE__, base);

/**
 * Build a URL for a streamed asset. `path` is root-relative with a leading
 * slash, e.g. `/images/fleet-galleries/dawn/01.webp`.
 *
 * When an offline tier is downloaded (native), a stored asset resolves to its
 * local Filesystem copy so it loads with no connectivity; otherwise it streams.
 * `resolveOffline` is a no-op until the resolver is armed (SSR / web / no
 * download), so this stays byte-identical everywhere else.
 */
export function assetUrl(path: string): string {
  return resolveOffline(path) ?? `${assetOrigin}${path}`;
}

/**
 * Rewrite a root-relative streamed-asset URL to the stream origin under the
 * mobile build. For load points that construct `/images/…` or `/audio/…`
 * paths WITHOUT going through `assetOrigin` — surface/hotspot textures and
 * panorama skyboxes loaded via `TextureLoader` / `Image()`. A no-op in every
 * browser build and for non-streamed buckets (e.g. bundled `/textures/…`).
 */
export function streamedUrl(url: string): string {
  return resolveStreamedUrl(url, __MOBILE__);
}

/**
 * Origin for a per-locale overlay bundle (`/data/i18n/<locale>.json`). The
 * default locale stays on-device so the app is fully usable offline from
 * install; the other 13 locales are pruned and streamed under mobile.
 */
export function localeBundleOrigin(locale: string): string {
  // `import.meta.env.SSR` is a compile-time constant, so the on-device client
  // bundle keeps the streaming path (the ssr branch tree-shakes away there);
  // only build-time prerender is pinned to the local base.
  return resolveLocaleBundleOrigin(locale, __MOBILE__, base, DEFAULT_LOCALE, import.meta.env.SSR);
}
