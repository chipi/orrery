/// <reference types="@vite-pwa/sveltekit" />
/// <reference types="vite-plugin-pwa/svelte" />

// SvelteKit-augmented types live here. The PWA plugin's virtual
// module (virtual:pwa-register/svelte) is declared via the
// triple-slash references above.
declare global {
  /**
   * App version injected at build time by Vite's `define` from
   * package.json#version. Rendered in the site footer.
   */
  const __APP_VERSION__: string;
  /**
   * Build date (ISO 8601, YYYY-MM-DD, UTC) injected at build time by
   * Vite's `define`. Rendered in the site footer next to the version
   * so visitors can see when the live deploy was last refreshed.
   */
  const __BUILD_DATE__: string;
  /**
   * True only in the Capacitor stream-heavy build (MOBILE=1, ADR-078).
   * App + SW code branch on this to fetch pruned asset buckets (images,
   * audio, non-default-locale overlays) from chipi.github.io. `false` in
   * every browser build.
   */
  const __MOBILE__: boolean;

  /**
   * Origin the Capacitor stream-heavy build fetches pruned buckets from
   * (images / audio / non-default-locale bundles). Injected at build time from
   * the `STREAM_ORIGIN` env var (vite define), defaulting to the current prod
   * origin. Set per build: local dev server for on-device testing, the VPS
   * IP/domain for release. Empty-string `base` in browser builds ignore it.
   */
  const __STREAM_ORIGIN__: string;

  /**
   * Live-state windows used by /fly for chrome-devtools-mcp verification
   * + (in __flyDebug's case) for the foreground-ship offset math. Typed
   * here so component code can read `window.__flyDebug?.flybyId` etc.
   * without the `as unknown as Record<string, unknown>` cast.
   *
   * - __flyDebug — populated by updateHelioAutoZoomTargets every frame
   *   we're inside a flyby cinema window. flybyId + flybySize are
   *   always present (used by the ship-positioning code). The remaining
   *   fields populate in dev-only builds for test introspection.
   * - __flyDebugFrame — populated at frame-end in dev builds only;
   *   captures W3 beat state for assertion harnesses.
   */
  interface Window {
    __flyDebug?: import('$lib/orbital/fly-debug-snapshot').FlyDebugSnapshot;
    __flyDebugFrame?: import('$lib/orbital/fly-debug-frame').FlyDebugFrameSnapshot;
  }
}

export {};
