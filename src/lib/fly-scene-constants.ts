import { DESTINATIONS, type DestinationId } from '$lib/lambert-grid.constants';

/**
 * Pure scene-scale constants + camera helper for /fly's heliocentric
 * scene. Extracted from /fly/+page.svelte during W9 (#279).
 */

/**
 * Heliocentric scene scale: 1 AU = 80 world units. Used at every
 * `pos.x * SCALE_3D` site in the /fly scene + orbit ring builders.
 * Moon-mode is a SEPARATE Earth-Moon scale where the Moon sits at
 * MOON_VISUAL_DISTANCE = 100u (see $lib/fly-physics-constants).
 */
export const SCALE_3D = 80;

/**
 * ADR-028: direct-Hohmann caveat for the giants + Pluto on
 * /plan-driven flights. /fly surfaces a banner so users understand
 * the porkchop value is direct-transfer-only and a real probe would
 * use gravity-assists.
 */
export const GRAVITY_ASSIST_CAVEAT_DESTINATIONS: DestinationId[] = [
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
];

/**
 * Per-destination accent for the ARRIVAL sprite. Earth blue (#4b9cd3)
 * is reserved for LAUNCH so the two sprites always read as a pair.
 */
export const DESTINATION_LABEL_COLORS: Record<DestinationId | 'moon', string> = {
  mercury: '#b8b8b8',
  venus: '#e8d175',
  mars: '#c1440e',
  jupiter: '#d4a373',
  saturn: '#e8c890',
  uranus: '#7de8e8',
  neptune: '#6b8cff',
  pluto: '#c8a98a',
  ceres: '#7c8b9a',
  vesta: '#b8a890',
  psyche: '#a8a090',
  bennu: '#605a55',
  arrokoth: '#9b5a48',
  moon: '#cfcfcf',
};

/**
 * Per-destination camera-reset distance, in scene units. Tuned so
 * the destination's orbit ring fills a comfortable fraction of the
 * view. Moon-mode returns a fixed Earth-Moon framing distance; all
 * other destinations scale from their semi-major axis with a floor
 * of 180u (Mars + inners would clip to too-close otherwise) and a
 * ceiling of 1600u (Saturn-scale wide framing — at greater distances
 * the inner system collapses to a few pixels and the spacecraft is
 * unrecognisable in screen space; outer-system missions like
 * Voyager 2 / New Horizons keep this Saturn-level framing and the
 * spacecraft simply flies OFF the wide-frame edge during cruise,
 * approached only when its sub-phase zooms in on the destination).
 */
export function cameraDistanceFor(destinationId: DestinationId, moonMode: boolean): number {
  if (moonMode) return 100;
  const orbitUnits = DESTINATIONS[destinationId].a * SCALE_3D;
  return Math.max(180, Math.min(1600, orbitUnits * 2.0));
}
