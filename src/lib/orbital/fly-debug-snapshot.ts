/**
 * Build the `window.__flyDebug` snapshot object. /fly writes this on
 * every animate frame so chrome-devtools-mcp verification can read
 * cinematic state. The structure varies by build mode:
 *
 *  - DEV: full snapshot (~13 fields) including peakHold timings, the
 *    spacecraft scene position, the camera state, and the active sub-
 *    phase. The fly-iconic-peakhold test harness reads this.
 *  - Production: just `{ flybyId, flybySize }`. The fly-page foreground
 *    ship-offset logic reads these two regardless of mode, so they
 *    stay outside the DEV gate. Everything else is stripped.
 *
 * The builder is pure — caller still owns the
 * `window.__flyDebug = buildFlyDebugSnapshot(...)` assignment.
 */

import type { FlybyPlanet } from './find-flyby-planet';

export interface FlyDebugInputs {
  /** True in DEV builds. Caller passes `import.meta.env.DEV` so the
   *  builder doesn't reach for it (keeps testability + the build-time
   *  tree-shake intact). */
  isDev: boolean;
  /** Active flyby MET — null when not in a flyby window. */
  activeFlybyMet: number | null;
  /** Resolved flyby planet — null when no flyby is active. */
  flyby: FlybyPlanet | null;
  /** Spacecraft world position (xz, AU). */
  spacecraftPos: { x: number; z: number };
  /** Heliocentric sub-phase string ("cruise-out", "flyby-193-venus", etc.). */
  subPhase: string | null;
  /** Current sim-day. */
  simDay: number;
  /** Wall-clock ms past which the peak hold ends. */
  peakHoldUntil: number;
  /** MET the current peak hold is armed for, or null. */
  peakHoldArmedForFlybyMet: number | null;
  /** Current performance.now() in ms — used to derive peakHoldRemainingMs. */
  now: number;
  /** Camera distance from camTarget. */
  camR: number;
  /** Camera target position in scene-space. */
  camTarget: { x: number; y: number; z: number };
}

export interface FlyDebugSnapshotProd {
  flybyId: string | null;
  flybySize: number | null;
}

export interface FlyDebugSnapshotDev extends FlyDebugSnapshotProd {
  activeFlybyMet: number | null;
  scPos: { x: number; z: number };
  subPhase: string | null;
  simDay: number;
  peakHoldUntil: number;
  peakHoldArmedForFlybyMet: number | null;
  peakHoldRemainingMs: number;
  camR: number;
  camTx: number;
  camTy: number;
  camTz: number;
}

export type FlyDebugSnapshot = FlyDebugSnapshotDev | FlyDebugSnapshotProd;

export function buildFlyDebugSnapshot(inputs: FlyDebugInputs): FlyDebugSnapshot {
  // These two fields ship in BOTH build modes — the production
  // ship-offset logic reads them outside the DEV gate.
  const flybyId = inputs.flyby?.id ?? null;
  const flybySize = inputs.flyby?.size ?? null;

  if (!inputs.isDev) {
    return { flybyId, flybySize };
  }

  return {
    flybyId,
    flybySize,
    activeFlybyMet: inputs.activeFlybyMet,
    scPos: { x: inputs.spacecraftPos.x, z: inputs.spacecraftPos.z },
    subPhase: inputs.subPhase,
    simDay: inputs.simDay,
    peakHoldUntil: inputs.peakHoldUntil,
    peakHoldArmedForFlybyMet: inputs.peakHoldArmedForFlybyMet,
    peakHoldRemainingMs: Math.max(0, inputs.peakHoldUntil - inputs.now),
    camR: inputs.camR,
    camTx: inputs.camTarget.x,
    camTy: inputs.camTarget.y,
    camTz: inputs.camTarget.z,
  };
}
