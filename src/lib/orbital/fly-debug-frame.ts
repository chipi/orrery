/**
 * Build the `window.__flyDebugFrame` per-frame snapshot. Symmetric to
 * `buildFlyDebugSnapshot` but with the FULL cinematic-frame state —
 * sim time + camera + every active beat (peak hold, finale, cut,
 * cruise hold). This is the snapshot the chrome-devtools-mcp + e2e
 * verification harnesses inspect to assert that a beat actually
 * engaged at the expected frame.
 *
 * DEV-only. Caller is responsible for the `import.meta.env.DEV` gate
 * around the write — Vite tree-shakes the dead branch at build time
 * so production builds carry zero per-frame overhead.
 */

export interface FlyDebugFrameInputs {
  /** Current sim-day. */
  simDay: number;
  /** Active heliocentric sub-phase. */
  lastHelioSubPhase: string | null;
  /** Peak hold state from CinematicBeatState. */
  peakHoldArmedForFlybyMet: number | null;
  peakHoldUntil: number;
  /** Cruise hold state. */
  cruiseHoldUntil: number;
  cruiseHoldFired: boolean;
  cruiseHoldTriggerSimDay: number | null;
  /** Cut-overlay state. */
  cutStartedAt: number;
  cutBlackOpacity: number;
  /** Finale state. */
  finaleStartedAt: number;
  inMissionFinale: boolean;
  finaleCaptionOpacity: number;
  finaleBlackOpacity: number;
  /** Camera state. */
  camR: number;
  camTarget: { x: number; z: number };
  /** Current performance.now() in ms — used to derive *RemainingMs
   *  and *ElapsedMs values. */
  now: number;
}

export interface FlyDebugFrameSnapshot {
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
}

export function buildFlyDebugFrameSnapshot(inputs: FlyDebugFrameInputs): FlyDebugFrameSnapshot {
  return {
    simDay: inputs.simDay,
    lastHelioSubPhase: inputs.lastHelioSubPhase,
    peakHoldArmedForFlybyMet: inputs.peakHoldArmedForFlybyMet,
    peakHoldRemainingMs: Math.max(0, inputs.peakHoldUntil - inputs.now),
    camR: inputs.camR,
    camTx: inputs.camTarget.x,
    camTz: inputs.camTarget.z,
    inMissionFinale: inputs.inMissionFinale,
    finaleCaptionOpacity: inputs.finaleCaptionOpacity,
    finaleBlackOpacity: inputs.finaleBlackOpacity,
    finaleStartedAt: inputs.finaleStartedAt,
    // finaleElapsedMs is 0 when the finale hasn't started (sentinel
    // finaleStartedAt = 0). Otherwise it's the running stopwatch.
    finaleElapsedMs: inputs.finaleStartedAt > 0 ? inputs.now - inputs.finaleStartedAt : 0,
    cutBlackOpacity: inputs.cutBlackOpacity,
    cutStartedAt: inputs.cutStartedAt,
    cruiseHoldUntil: inputs.cruiseHoldUntil,
    cruiseHoldFired: inputs.cruiseHoldFired,
    cruiseHoldRemainingMs: Math.max(0, inputs.cruiseHoldUntil - inputs.now),
    cruiseHoldTriggerSimDay: inputs.cruiseHoldTriggerSimDay,
  };
}
