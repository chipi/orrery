import { base } from '$app/paths';
import { DEFAULT_LOCALE } from './locale';

/**
 * Asset-origin spine (ADR-079 D1).
 *
 * Heavy asset buckets — gallery/hero imagery, narration audio, and
 * non-default-locale overlay bundles — are pruned from the Capacitor
 * on-device bundle (ADR-078) and streamed from GitHub Pages. This module is
 * the single seam that decides local-vs-streamed origin, so no caller
 * hard-codes it.
 *
 * In every browser build `__MOBILE__` is `false`, so `assetOrigin === base`
 * and every URL is byte-identical to before this module existed. The same
 * seam is where an optional prod CDN plugs in later.
 */

/** GitHub Pages origin the mobile build streams pruned buckets from. */
export const STREAM_ORIGIN = 'https://chipi.github.io/orrery';

/**
 * Origin for images + audio. Streamed from `STREAM_ORIGIN` under the
 * Capacitor stream-heavy build; the local `base` in every browser build.
 */
export const assetOrigin: string = __MOBILE__ ? STREAM_ORIGIN : base;

/**
 * Build a URL for a streamed asset. `path` is root-relative with a leading
 * slash, e.g. `/images/fleet-galleries/dawn/01.jpg`.
 */
export function assetUrl(path: string): string {
  return `${assetOrigin}${path}`;
}

/**
 * Rewrite a root-relative streamed-asset URL to the stream origin under the
 * mobile build. For load points that construct `/images/…` or `/audio/…`
 * paths WITHOUT going through `assetOrigin` — surface/hotspot textures and
 * panorama skyboxes loaded via `TextureLoader` / `Image()`. A no-op in every
 * browser build and for non-streamed buckets (e.g. bundled `/textures/…`).
 */
export function streamedUrl(url: string): string {
  if (!__MOBILE__) return url;
  return url.startsWith('/images/') || url.startsWith('/audio/')
    ? `${STREAM_ORIGIN}${url}`
    : url;
}

/**
 * Origin for a per-locale overlay bundle (`/data/i18n/<locale>.json`). The
 * default locale stays on-device so the app is fully usable offline from
 * install; the other 13 locales are pruned and streamed under mobile.
 */
export function localeBundleOrigin(locale: string): string {
  return __MOBILE__ && locale !== DEFAULT_LOCALE ? STREAM_ORIGIN : base;
}
