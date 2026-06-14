/**
 * Resolve a flyby's planet identity for the iconic-shot composition.
 *
 * Two strategies, in order of reliability:
 *   1. `findFlybyPlanetFromLabel` — parse the event's human-readable
 *      label ("Venus #1 — gravity assist" → 'venus'). Authoritative when
 *      labels are present (post-#332 corpus sweep ensures all flyby
 *      events have them).
 *   2. `findClosestPlanetToShip` — heliocentric-closest fallback. Used
 *      pre-#332 for unlabeled events; left in place as a safety net.
 *      The closest-planet detector can pick the wrong planet
 *      mid-cruise (Juno's MET 749 was heliocentrically closer to Mars
 *      than Earth at its Earth-flyby moment), which is why labels are
 *      preferred.
 *
 * Both helpers used to live as closures inside /fly's animate loop
 * scope (~3436 lines into the page component). Lifted here so the
 * planet-resolution path is unit-testable + can be reused by the
 * upcoming animate-loop split (post-#332 §3).
 */

import { earthPos, destinationPos } from '$lib/orbital/mission-arc';
import type { DestinationId } from '$lib/lambert-grid.constants';

// Earth isn't a `DestinationId` (it's the universal departure body in
// the Lambert grid), but flyby cinema treats Earth like any other
// planet target. Widen the union here so the type tells the truth.
export type FlybyPlanetId = DestinationId | 'earth';

/** Scene-space render radius for each major planet, in /fly's
 *  SCALE_3D-scaled units. Drives the iconic-shot framing (planetRadius
 *  feeds `PLANET_COMPOSITION[planetId].camRMultiplier` × planetRadius
 *  → camera distance). Pre-extraction these lived inline in /fly. */
export const PLANET_SIZES: Record<string, number> = {
  mercury: 1.0,
  venus: 2.5,
  earth: 2.6,
  mars: 1.9,
  jupiter: 5.5,
  saturn: 4.8,
  uranus: 3.4,
  neptune: 3.4,
  // Pluto's render radius — the dwarf is 1188 km (smaller than Earth's
  // moon) but fly-helio-scene's DEST_STYLE puts it at size 0.9 so the
  // iconic-shot framing still has something to look at. Use the same
  // 0.9 here so planFlybyShot's camR multiplier composes correctly.
  pluto: 0.9,
  // Arrokoth — real radius ~18 km. Stylised to 0.5 so the cinematic
  // composition reads at the NH 2019 encounter beat. Mirror of
  // DEST_STYLE.arrokoth.size in $lib/three/fly-helio-scene.
  arrokoth: 0.5,
};

export interface FlybyPlanet {
  id: FlybyPlanetId;
  size: number;
}

/** Parse the flyby body from the event's human-readable label
 *  ("Venus #1 — gravity assist" → 'venus'). Returns `null` if no
 *  planet keyword matches — callers fall back to
 *  `findClosestPlanetToShip` in that case.
 *
 *  Why label-parsing is the primary signal: /fly's trajectory model is
 *  a simplified Keplerian approximation that doesn't faithfully pass
 *  through each planet's heliocentric position at the actual flyby
 *  moment. A spot-check at Cassini MET 894 showed scPos = (1.28, 1.74)
 *  AU = 2.16 AU from Sun, far from Earth's actual 1.0 AU. Parsing the
 *  label is the reliable signal because the data layer carries the
 *  mission's narrative truth even when the math layer doesn't. */
export function findFlybyPlanetFromLabel(label: string | undefined | null): FlybyPlanet | null {
  if (!label) return null;
  const lower = label.toLowerCase();
  const planets: DestinationId[] = [
    'mercury',
    'venus',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    // Pluto — New Horizons' "Pluto — first close encounter" is the
    // canonical case. Without this, findFlybyPlanetFromLabel returns
    // null at the encounter, the closest-planet fallback finds no body
    // within its 3 AU threshold (Pluto sits at ~39 AU), and the
    // animate loop never enters flyby-cinema mode — Pluto is invisible.
    'pluto',
    // Arrokoth — New Horizons' MET-4730 KBO flyby ("Arrokoth (2014
    // MU69) — Kuiper Belt flyby" in NH mission JSON). Without this,
    // the same null-label / out-of-range fallback path leaves the
    // most-distant-object-ever-visited beat composing against empty
    // space.
    'arrokoth',
  ];
  for (const p of planets) {
    if (lower.includes(p)) return { id: p, size: PLANET_SIZES[p] ?? 2.0 };
  }
  // Earth is checked LAST + separately so labels like "Earth-Moon LEGA"
  // get a positive match without short-circuiting on the substring.
  if (lower.includes('earth')) {
    return {
      id: 'earth',
      size: PLANET_SIZES.earth,
    };
  }
  return null;
}

/** Fallback for missions whose flyby events lack labels — find the
 *  planet the spacecraft is heliocentric-closest to. Threshold is 3 AU
 *  so outer-system Voyager-style flybys still resolve. Returns `null`
 *  when no body is within range (deep cruise). */
export function findClosestPlanetToShip(
  scenePos: { x: number; z: number },
  simDay: number,
): FlybyPlanet | null {
  const CANDIDATES: DestinationId[] = [
    'mercury',
    'venus',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'pluto',
    'arrokoth',
  ];
  let closest: FlybyPlanetId | null = null;
  let closestSize = 1;
  // 3 AU works for the inner-system flyby cluster (Cassini Venus/Earth,
  // Galileo Venus/Earth, etc.) but is too tight for outer-system
  // encounters at Saturn/Uranus/Neptune/Pluto where the trajectory data
  // can be 5-10 AU off the body. Widen to 12 AU so Pluto-class flybys
  // resolve while still rejecting deep-cruise distances.
  let minDist = 12.0;

  const ePos = earthPos(simDay);
  const dEarth = Math.hypot(scenePos.x - ePos.x, scenePos.z - ePos.z);
  if (dEarth < minDist) {
    minDist = dEarth;
    closest = 'earth';
    closestSize = PLANET_SIZES.earth;
  }

  for (const id of CANDIDATES) {
    const p = destinationPos(simDay, id);
    const d = Math.hypot(scenePos.x - p.x, scenePos.z - p.z);
    if (d < minDist) {
      minDist = d;
      closest = id;
      closestSize = PLANET_SIZES[id] ?? 2.0;
    }
  }

  return closest ? { id: closest, size: closestSize } : null;
}
