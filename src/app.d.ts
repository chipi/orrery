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
   * Build timestamp ("MM-DD HH:MM") injected at build time. Shown as the
   * visible build tag on the splash + the menu version so builds are
   * distinguishable at a glance (#51). Shared with the native storyboard
   * stamp via the BUILD_TAG env.
   */
  const __BUILD_TAG__: string;
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
   * True only in an INTERNAL mobile build (`MOBILE_INTERNAL=1`, ADR-083) —
   * simulator / TestFlight. Gates the runtime staging↔prod target switcher
   * (`src/lib/target-env.ts`); `false` in web + App Store release builds, where
   * the switcher + all-tier config tree-shake out.
   */
  const __MOBILE_INTERNAL__: boolean;

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

    // ─── Test / tour hooks ──────────────────────────────────────────────
    // Installed by the app for e2e specs, the audio tour and devtools
    // checks. One declaration here instead of an inline cast at each site,
    // so a renamed or retyped hook fails typecheck.
    /** /fly (src/lib/fly/fly-test-hooks.ts). null until a mission is applied. */
    __flyArcHash?: () => string | null;
    __fly2DArcHash?: () => string | null;
    __flyMissionId?: () => string | null;
    __flyJumpToMet?: (met: number) => void;
    __flySetSimDay?: (met: number) => void;
    __flyMontage?: (on: boolean) => void;
    __flyCislunarDebug?: () => unknown;
    __flyReentryDebug?: () => unknown;
    __flyCoastCamDebug?: () => import('$lib/three/fly-leo-coast-scene').CoastCamDebug | null;
    /** /explore (src/lib/three/explore-scene-host.ts). */
    __exploreSelectStar?: (id: string) => void;
    __exploreEnterSystem?: (id: string) => void;
    __exploreSelectExoplanet?: (id: string) => void;
    __exploreEnterDeepSky?: (id: string) => void;
    __exploreEnterMilkyWay?: () => Promise<void>;
    __exploreSelectMilkyWay?: (id: string) => Promise<void>;
    __exploreEnterLocalGroup?: () => Promise<void>;
    __exploreSelectLocalGroup?: (id: string) => void;
    __exploreEnterBlackHole?: (id: string) => Promise<void>;
    __explore2dBodyOffset?: (id: string) => { x: number; y: number } | null;
    /** /earth, /moon, /mars surface scene (SurfaceScene, TourAnchors). */
    __surfaceSceneSelectSite?: (id: string) => void;
    __surfaceSceneFrameRoute?: (id: string) => void;
    __surfaceSceneExitRouteView?: () => void;
    /** /iss, /tiangong (StationRoute, as `__${config.id}PickAt`). */
    __issPickAt?: (moduleId?: string) => { x: number; y: number; moduleId: string } | null;
    __tiangongPickAt?: (moduleId?: string) => { x: number; y: number; moduleId: string } | null;
    /** Audio tour state (AudioOverlay). */
    __orreryAudio?: unknown;
    /** /dev/sky-preview only. */
    __skyDebug?: unknown;
    __skyHandle?: unknown;
    __skyPreviewReady?: boolean;
    __planetAzEl?: Record<string, [number, number]>;
    __stationAzEl?: Record<string, unknown>;
  }
}

export {};
