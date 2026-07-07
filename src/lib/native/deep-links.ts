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
export function initDeepLinks(): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};

  let removeListener: (() => void) | undefined;
  let disposed = false;

  void import('@capacitor/app').then(({ App }) => {
    if (disposed) return;
    void App.addListener('appUrlOpen', ({ url }) => {
      try {
        const u = new URL(url);
        // orrery://<host><path>?<query>#<hash>  →  /<host><path>?<query>#<hash>
        // Collapse duplicate slashes in the PATH only — never the query/hash,
        // whose values may legitimately contain `//` (e.g. a URL param).
        const path = `/${u.host}${u.pathname}`.replace(/\/{2,}/g, '/');
        void goto(`${base}${path}${u.search}${u.hash}`);
      } catch {
        /* malformed deep link — ignore */
      }
    }).then((handle) => {
      removeListener = () => void handle.remove();
    });
  });

  return () => {
    disposed = true;
    removeListener?.();
  };
}
