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
  // Asteroid + dwarf-planet bodies in DESTINATIONS that the /fly
  // flyby cinema needs to recognise (Dawn at Vesta + Ceres; Psyche
  // mission to Psyche; OSIRIS-REx at Bennu). Stylised radii — these
  // are tiny in reality (Ceres 470 km, Vesta 263 km, Psyche 113 km,
  // Bennu 0.25 km) but the camera needs SOMETHING to compose
  // against. Mirror of DEST_STYLE entries.
  ceres: 0.6,
  vesta: 0.45,
  psyche: 0.4,
  bennu: 0.3,
  // Comet nuclei. Halley ~5.5 km radius, 67P ~2 km — both stylised to
  // small but readable scene radii for the Giotto / Rosetta cinematic
  // beats. Halley sits slightly larger to read at flyby speed.
  halley: 0.35,
  '67p': 0.3,
  // #341 Batch 5 small bodies. Stylised radii — these are all sub-
  // kilometre to ~100 km in reality but the camera needs SOMETHING
  // to compose against. Tuning logic per body:
  //   - Itokawa (165 m): peanut rubble pile, size 0.35 reads at
  //     Hayabusa's slow station-keeping approach.
  //   - Didymos (390 m) + Dimorphos (80 m): binary cinema. Didymos
  //     0.40, Dimorphos 0.25 so the size ratio reads in frame at
  //     DART's impact moment.
  //   - Donaldjohanson (2 km): Lucy main-belt bonus, small but
  //     identifiable, 0.30.
  //   - Eurybates (32 km): largest L4 family member, 0.45.
  //   - Polymele (10.5 km): smaller P-type, 0.35.
  //   - Leucus (17.5 km): D-type slow rotator, 0.40.
  //   - Orus (25.5 km): mid-size D-type, 0.40.
  //   - Patroclus (56.5 km) + Menoetius (52 km): largest Trojan
  //     binary, both 0.55 / 0.50 to read as a binary pair at
  //     Lucy's 2033 climax.
  itokawa: 0.35,
  didymos: 0.4,
  dimorphos: 0.25,
  donaldjohanson: 0.3,
  eurybates: 0.45,
  polymele: 0.35,
  leucus: 0.4,
  orus: 0.4,
  patroclus: 0.55,
  menoetius: 0.5,
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
    // Asteroid + small-body destinations — Dawn at Vesta + Ceres,
    // Psyche mission to Psyche, OSIRIS-REx to Bennu. Each has a
    // DestinationId + DEST_STYLE entry; the parser needed widening
    // so labels like "Vesta orbit insertion" resolve.
    'ceres',
    'vesta',
    'psyche',
    'bennu',
    // Comet nuclei — Giotto at Halley, Rosetta at 67P. Label parsing
    // is lowercase-substring so "Halley — closest comet encounter"
    // and "67P/Churyumov–Gerasimenko rendezvous + Philae landing"
    // both resolve. Note: 'churyumov' is also matched as a synonym
    // for 67P in case future data uses the full name without the id.
    'halley',
    '67p',
    // #341 Batch 5 — small bodies. Each gets a substring match against
    // the event label so flight.events labels like "Dimorphos kinetic
    // impact" or "Eurybates + Queta" route through to per-body camera
    // composition.
    'itokawa',
    'dimorphos',
    'didymos',
    'donaldjohanson',
    'eurybates',
    'polymele',
    'leucus',
    'orus',
    'patroclus',
    'menoetius',
  ];
  for (const p of planets) {
    if (lower.includes(p)) return { id: p, size: PLANET_SIZES[p] ?? 2.0 };
  }
  // Churyumov synonym → 67P
  if (lower.includes('churyumov')) return { id: '67p', size: PLANET_SIZES['67p'] };
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
    'ceres',
    'vesta',
    'psyche',
    'bennu',
    'halley',
    '67p',
    'itokawa',
    'didymos',
    'dimorphos',
    'donaldjohanson',
    'eurybates',
    'polymele',
    'leucus',
    'orus',
    'patroclus',
    'menoetius',
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
