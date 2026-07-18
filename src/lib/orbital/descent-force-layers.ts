/**
 * The Science-Lens layers that drive the descent scene's force vectors, and the
 * force each one maps to (RFC-034 §9 / §11.2) — the inverse of
 * launch-force-layers.ts. Reuses the SAME four generic lens layers (thrust /
 * gravity / drag / velocity) as the launch + cruise scenes, so no new lens
 * registration is needed; the force each drives just points the other way on
 * the way down (weight down, drag up, thrust up, velocity down).
 *
 * DescentScene subscribes to each layer via `onLayerChange` and calls
 * `sceneObj.setForceVisible(force, on)`. The lens is pedagogically rich here:
 * under the parachute drag dominates; in the skycrane thrust ≈ weight; in the
 * airbag bounce only weight remains.
 */

import type { LayerKey } from '$lib/science-layers';
import type { ForceKey } from '$lib/three/flight-phase-scene';

export const DESCENT_FORCE_LAYERS = {
  thrust: 'thrust',
  gravity: 'weight',
  drag: 'drag',
  velocity: 'velocity',
} as const satisfies Partial<Record<LayerKey, ForceKey>>;

/** The Science-Lens layer keys that control a descent force vector. */
export type DescentForceLayerKey = keyof typeof DESCENT_FORCE_LAYERS;

/** All (layer, force) pairs — for DescentScene to iterate its subscriptions. */
export const DESCENT_FORCE_LAYER_ENTRIES = Object.entries(DESCENT_FORCE_LAYERS) as Array<
  [DescentForceLayerKey, ForceKey]
>;
