import { Capacitor } from '@capacitor/core';
import { goto } from '$app/navigation';
import { base } from '$app/paths';

/**
 * Custom-scheme deep links (S6 / #221, RFC-018 §7).
 *
 * `orrery://fly?mission=curiosity` → navigates to `/fly?mission=curiosity`.
 * The scheme host becomes the first path segment; query + hash carry through.
 * Registered in ios/App/App/Info.plist (CFBundleURLTypes) and
 * android/.../AndroidManifest.xml (intent-filter, scheme="orrery").
 *
 * Universal/App Links (https://chipi.github.io/orrery/…) are a follow-up
 * (need apple-app-site-association + Digital Asset Links on the GH Pages
 * domain). No-op in the browser build.
 */
/**
 * Map an `orrery://` deep-link URL to an app route (without the deploy `base`).
 * The scheme host becomes the first path segment; query + hash carry through.
 * Duplicate slashes are collapsed in the PATH only — never the query/hash,
 * whose values may legitimately contain `//` (e.g. a URL-valued param).
 * Returns null on a malformed URL. Pure — unit-tested.
 */
export function deepLinkTarget(url: string): string | null {
  try {
    const u = new URL(url);
    const path = `/${u.host}${u.pathname}`.replace(/\/{2,}/g, '/');
    return `${path}${u.search}${u.hash}`;
  } catch {
    return null;
  }
}

export function initDeepLinks(): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};

  let removeListener: (() => void) | undefined;
  let disposed = false;

  void import('@capacitor/app')
    .then(({ App }) => {
      if (disposed) return;
      void App.addListener('appUrlOpen', ({ url }) => {
        // Only handle the custom scheme. When Universal/App Links (https://…)
        // land, appUrlOpen fires for them too — without this gate deepLinkTarget
        // would map the full https host into an internal path and 404.
        if (!url.startsWith('orrery://')) return;
        const target = deepLinkTarget(url);
        if (target) void goto(`${base}${target}`);
      }).then((handle) => {
        removeListener = () => void handle.remove();
      });
    })
    // Optional native plugin — a load failure (web build, missing bridge)
    // must degrade silently, never surface as an unhandled rejection.
    .catch(() => {});

  return () => {
    disposed = true;
    removeListener?.();
  };
}
