/**
 * Shared assembly-state ref for /iss and /tiangong.
 *
 * Both station routes drive an "assembly playback" mode where the user
 * scrubs through a synthetic timeline of module-arrival / dock events.
 * The reactive UI lives in Svelte `$state` (the toggle button, the
 * scrubber slider). The per-frame animate() closure inside the Three.js
 * scene reads a plain mutable ref each frame — going through `$state`
 * directly from a captured closure would tie the closure to the rune
 * proxy, which is both slower and a layering violation.
 *
 * The pattern is therefore:
 *   1. Component declares 3 `$state` flags (open, playing, progress)
 *   2. Component creates one `AssemblyRef` POJO via `createAssemblyRef()`
 *   3. Component wires a `$effect` that calls `syncAssemblyRef()` to
 *      mutate the ref whenever the reactive flags change
 *   4. The animate() closure captures the ref and reads `ref.active`,
 *      `ref.playing`, `ref.progress` each frame
 *
 * This module owns the type + factory + sync helper so /iss and
 * /tiangong don't drift in shape. Each route still owns its own
 * ASSEMBLY_DURATION_MS (50_000 ms for ISS, 24_000 ms for Tiangong — a
 * per-station tuning constant).
 *
 * Companion to `station-assembly-anim.ts` which owns the animation
 * primitives (captureHomes, applyAssembly, currentChip, …); this module
 * is strictly about the reactive-state↔plain-ref bridge.
 */

/** Plain ref read by the Three.js animate() closure each frame. */
export interface AssemblyRef {
  /** `assemblyOpen` mirror — true while the assembly mode UI is visible. */
  active: boolean;
  /** `assemblyPlaying` mirror — true while the timeline is auto-advancing. */
  playing: boolean;
  /** `assemblyProgress` mirror — scrub position in [0, 1]. */
  progress: number;
}

/** Snapshot of the component's reactive flags passed into the sync helper. */
export interface AssemblySnapshot {
  open: boolean;
  playing: boolean;
  progress: number;
}

/** Returns a fresh ref with the default off-state. */
export function createAssemblyRef(): AssemblyRef {
  return { active: false, playing: false, progress: 0 };
}

/**
 * Mutates `ref` in-place to match `snap`. Call from inside a `$effect` so
 * the rune system tracks the three reactive reads and re-fires whenever
 * any of them change.
 */
export function syncAssemblyRef(ref: AssemblyRef, snap: AssemblySnapshot): void {
  ref.active = snap.open;
  ref.playing = snap.playing;
  ref.progress = snap.progress;
}
