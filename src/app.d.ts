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
   * audio, non-default-locale overlays) from the STREAM_ORIGIN host. `false` in
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
    __flyLaunchT?: (t: number) => void;
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
    /** Where the /explore camera looks, whether the selection ring is up, the panel-aware view shift. */
    __exploreCameraState?: () => {
      origin: number[];
      camR: number;
      flying: boolean;
      ringVisible: boolean;
      ringAt: number[];
      viewShiftPx: number;
    };
    /** The direction pills (ʻOumuamua's and the heading craft's): drawn (whole chain visible) and text, by owner id. */
    __exploreDirectionLabels?: () => Record<
      string,
      { drawn: boolean; text: string; x: number; y: number; w: number; h: number }
    >;
    /** Pin scenes (neighbourhood to cosmic web): every label and ring as drawn, client px; null elsewhere. */
    __scenePins?: () => import('$lib/universe/scene-pins').PinsSnapshot | null;
    /** Iconic-mission boxes (milestones and the mission box) of the highlighted missions, as drawn, canvas px. */
    __iconicBoxes?: () => import('$lib/three/iconic-trajectory').IconicBoxSnapshot[];
    /** Screen points (canvas-box px) on a kind of solar line or the neighbourhood's light-year rings, for the readability probe. */
    __exploreLinePoints?: (
      kind:
        | 'planet-orbits'
        | 'moon-orbits'
        | 'small-orbits'
        | 'asteroid-belt'
        | 'kuiper-belt'
        | 'ly-rings',
    ) => Array<{ x: number; y: number }>;
    /** The 2D view's labels of the last frame (only the ones pushed that frame): text, the font the canvas drew it with and its size in CSS px (0 when not drawn), whether it was drawn. */
    __explore2dLabels?: () => Array<{ text: string; font: string; fontPx: number; shown: boolean }>;
    /** A solar-system body's world position: planet:<id>, small:<id>, moon:<parent>:<id>, belt:<id>. */
    __exploreBodyPosition?: (key: string) => number[] | null;
    /** Where a body (or marker:<missionId>) is on screen, client pixels, or null when behind the camera. */
    __exploreBodyScreen?: (key: string) => { x: number; y: number } | null;
    /** /earth, /moon, /mars surface scene (SurfaceScene, TourAnchors). */
    __surfaceSceneSelectSite?: (id: string) => void;
    __surfaceSceneFrameRoute?: (id: string) => void;
    __surfaceSceneExitRouteView?: () => void;
    __surfaceSceneFaceLatLon?: (latDeg: number, lonDeg: number, targetR?: number) => void;
    /** Test hook: face a site at camera distance `targetR`, centred as selecting it would (a rover: its route centre). */
    __surfaceSceneFaceSite?: (id: string, targetR?: number) => void;
    /** Test hook: where the site's own spot (through the route's magnified frame) is drawn, client px. */
    __surfaceSceneDrawnSiteXY?: (id: string) => { x: number; y: number } | null;
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
