/**
 * The contract every `/fly` flight-phase render obeys — ascent today, descent /
 * arrival tomorrow (RFC-034 §9: `pad → orbit → cruise → arrival → descent →
 * surface`). A phase scene owns a Three.js scene + camera, is driven frame by
 * frame from a headless physics state, exposes the Science-Lens force vectors
 * (individually and as a group), snaps its smooth-camera for timeline scrubs,
 * and tears down its own GPU resources.
 *
 * Generic over the phase's state shape (`AscentState` today) so each phase keeps
 * its own strongly-typed `setState` while sharing the render / camera / force /
 * lifecycle surface. The `ascent-renderer` composer consumes only the
 * render-relevant slice (`scene` / `camera` / `setAspect`), so it types its
 * argument as the un-parameterised `FlightPhaseScene`.
 *
 * Pure types — no Three.js instantiation here, only the structural contract.
 */

import type * as THREE from 'three';

/** The Science-Lens force vectors a flight-phase scene can individually toggle. */
export type ForceKey = 'thrust' | 'weight' | 'drag' | 'velocity';

export interface FlightPhaseScene<TState = unknown> {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  /** Position + orient the subject and frame the camera from a physics state. */
  setState(s: TState): void;
  /** Re-fit the camera to a new viewport aspect. */
  setAspect(aspect: number): void;
  /** Toggle a single Science-Lens force vector (drives the lens-layer wiring). */
  setForceVisible(force: ForceKey, on: boolean): void;
  /** Toggle the whole force-vector group at once. */
  setForcesVisible(on: boolean): void;
  /** Snap the smooth-camera to its target instantly (use on a timeline scrub). */
  snapCamera(): void;
  /** Restore the scene to its pre-roll state (for replay). */
  reset(): void;
  /** Tear down GPU resources (call from onDestroy). */
  dispose(): void;
}
