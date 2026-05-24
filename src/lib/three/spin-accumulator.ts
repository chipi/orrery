/**
 * Shared spin accumulator for "auto-spin" canvas routes (#57).
 *
 * Smoothly pauses + resumes a rotation by integrating dt over time
 * gated by `paused`. The accumulator stops growing while paused so
 * un-pausing resumes the rotation at the same angular position
 * rather than jumping ahead by the wall-clock pause duration.
 *
 * Used by /iss + /tiangong today; /mars and /moon use a simpler
 * dt-on-rotation pattern that doesn't need the accumulator (their
 * marker layers don't compound across multiple rotation calls).
 *
 * Usage:
 *   const spin = createSpinAccumulator();
 *   function frame(t: number) {
 *     spin.tick(t, autoSpin);          // integrate dt if not paused
 *     station.rotation.y = spin.value() * 0.028;
 *   }
 *
 * Pre-extraction this lived as ~12 lines of state + math inside each
 * onMount; the helper makes the contract explicit and dedupes the
 * "lastFrameT === 0" first-frame initialiser.
 */
export interface SpinAccumulator {
  /** Integrate one frame's dt onto the accumulator if `running` is true. */
  tick(now: number, running: boolean): void;
  /** Current accumulated time in seconds — multiply by your rotation rate. */
  value(): number;
  /** Reset to zero (e.g. for camera-pose restore). */
  reset(): void;
}

export function createSpinAccumulator(): SpinAccumulator {
  let accum = 0;
  let lastFrameT: number | null = null;
  return {
    tick(now: number, running: boolean): void {
      // `null` sentinel (not 0) — `0` is a valid wall-clock time when
      // the page loads at requestAnimationFrame's initial timestamp.
      if (lastFrameT === null) {
        lastFrameT = now;
        return;
      }
      const dt = now - lastFrameT;
      if (running) accum += dt;
      lastFrameT = now;
    },
    value(): number {
      return accum;
    },
    reset(): void {
      accum = 0;
      lastFrameT = null;
    },
  };
}
