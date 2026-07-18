/**
 * The Science-Lens layers that drive the ascent scene's force vectors, and the
 * force each one maps to (RFC-034 §11.2). Weight reuses the shared `gravity`
 * layer (the same toggle that draws gravity arrows in the cruise scene), so the
 * launch scene needs no separate "weight" layer; thrust / drag / velocity map
 * one-to-one.
 *
 * LaunchScene subscribes to each of these layers via `onLayerChange` and calls
 * `sceneObj.setForceVisible(force, on)` — the lens panel is the force legend.
 */

import type { LayerKey } from '$lib/science-layers';
import type { ForceKey } from '$lib/three/flight-phase-scene';

export const LAUNCH_FORCE_LAYERS = {
  thrust: 'thrust',
  gravity: 'weight',
  drag: 'drag',
  velocity: 'velocity',
} as const satisfies Partial<Record<LayerKey, ForceKey>>;

/** The Science-Lens layer keys that control a launch force vector. */
export type LaunchForceLayerKey = keyof typeof LAUNCH_FORCE_LAYERS;

/** All (layer, force) pairs — for LaunchScene to iterate its subscriptions. */
export const LAUNCH_FORCE_LAYER_ENTRIES = Object.entries(LAUNCH_FORCE_LAYERS) as Array<
  [LaunchForceLayerKey, ForceKey]
>;
