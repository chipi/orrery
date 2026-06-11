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
    __flyDebug?: {
      flybyId?: string | null;
      flybySize?: number | null;
      activeFlybyMet?: number;
      scPos?: { x: number; z: number };
      subPhase?: string | null;
      simDay?: number;
      peakHoldUntil?: number;
      peakHoldArmedForFlybyMet?: number | null;
      peakHoldRemainingMs?: number;
      camR?: number;
      camTx?: number;
      camTz?: number;
    };
    __flyDebugFrame?: {
      simDay: number;
      lastHelioSubPhase: string | null;
      peakHoldArmedForFlybyMet: number | null;
      peakHoldRemainingMs: number;
      camR: number;
      camTx: number;
      camTz: number;
      inMissionFinale: boolean;
      finaleCaptionOpacity: number;
      finaleBlackOpacity: number;
      finaleStartedAt: number;
      finaleElapsedMs: number;
      cutBlackOpacity: number;
      cutStartedAt: number;
      cruiseHoldUntil: number;
      cruiseHoldFired: boolean;
      cruiseHoldRemainingMs: number;
      cruiseHoldTriggerSimDay: number | null;
    };
  }
}

export {};
