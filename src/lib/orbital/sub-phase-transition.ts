/**
 * Detect a /fly heliocentric sub-phase transition + decide which
 * cinematic side effects need firing.
 *
 * /fly's `lastHelioSubPhase` is a string like "cruise-out",
 * "approach", "flyby-193-venus", or "epilogue". When the active
 * sub-phase string changes between animate frames, three things
 * may need to happen:
 *
 *   1. Always: write the new sub-phase + flip helioAutoZoomActive
 *      back on (the lerp restarts when the target changes).
 *   2. On ENTER flyby cinema: force the moons layer visible so
 *      Galilean / Saturnian / Neptunian moons show up in the iconic
 *      composition regardless of the user's Science Lens setting.
 *   3. On EXIT flyby cinema: restore the moons layer to whatever the
 *      lens last asked for.
 *
 * This helper is the pure detection step — it returns a tuple of
 * booleans the caller dispatches. Caller still owns the state
 * mutations (lastHelioSubPhase + helioAutoZoomActive + cinemaForceMoons
 * are all closure-scope `let` bindings) and the side effect
 * (`helioHandles.setMoonsVisible`).
 */

export interface SubPhaseTransitionInputs {
  /** Sub-phase observed on the previous frame. null on first frame. */
  prev: string | null;
  /** Sub-phase computed for the current frame. */
  next: string;
}

export interface SubPhaseTransitionResult {
  /** True when prev !== next — caller updates lastHelioSubPhase +
   *  flips helioAutoZoomActive = true. */
  transitioned: boolean;
  /** True when crossing into a flyby-cinema sub-phase ("flyby-..."). */
  enteredFlybyCinema: boolean;
  /** True when crossing out of a flyby-cinema sub-phase. */
  exitedFlybyCinema: boolean;
}

const FLYBY_PREFIX = 'flyby-';

function isFlybyCinema(sub: string | null): boolean {
  return sub != null && sub.startsWith(FLYBY_PREFIX);
}

export function detectSubPhaseTransition(
  inputs: SubPhaseTransitionInputs,
): SubPhaseTransitionResult {
  const { prev, next } = inputs;
  if (prev === next) {
    return { transitioned: false, enteredFlybyCinema: false, exitedFlybyCinema: false };
  }
  const wasFlyby = isFlybyCinema(prev);
  const isFlyby = isFlybyCinema(next);
  return {
    transitioned: true,
    enteredFlybyCinema: isFlyby && !wasFlyby,
    exitedFlybyCinema: !isFlyby && wasFlyby,
  };
}
