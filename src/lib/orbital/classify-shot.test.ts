/**
 * Baseline test: at default `PLANET_COMPOSITION`, a synthetic Cassini-art
 * trajectory (ship lifted +y above the orbital plane near peak, moving in
 * +x at 1 unit/day) composes as ICONIC for every PlanetId. This is the
 * safety net for the iconic-shot composition — any future tweak to
 * `PLANET_COMPOSITION`, `planFlybyShot`, or `classifyShot` that drops the
 * ICONIC verdict for any planet fails here, before it ships.
 *
 * If you legitimately need to retune one planet so the verdict goes
 * NOT-ICONIC for the synthetic trajectory, update the per-planet expectation
 * below — but think about whether the visual eye still reads it as iconic
 * (the synthetic trajectory is conservative; real Orrery trajectories have
 * less clean +y separation around the peak, so a NOT-ICONIC verdict here
 * usually means the live shot will read worse, not better).
 */

import { describe, it, expect } from 'vitest';
import {
  planFlybyShot,
  classifyShot,
  PLANET_COMPOSITION,
  type PlanetId,
} from './flyby-camera-plan';

const PLANET_IDS: PlanetId[] = [
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
];

// Per-planet trajectory tuning. Each planet has its own iconicLeadDays in
// PLANET_COMPOSITION, but the synthetic generator below stays consistent
// across planets: ship moves at 1 unit/day in +x, lifts +1.3·planetRadius
// at peak, planet sits at xz=(0,0). Mirrors the real Orrery mission-arc
// shape near peak (waypoint +y lift fades exponentially with distance).
function makeShipPosAtMet(planetRadius: number, peakMet: number) {
  // +y lift fades over ~10 days (e-folding), matching the shape of
  // Orrery's real flyby waypoints which sit at +y above the orbital
  // plane around peak and decay back to zero on each side. The 1.5×
  // planet-radius peak lift keeps the ship clear of the planet's
  // projected disc for the 2–4-day lead the v2 math uses.
  return (met: number) => {
    const t = met - peakMet;
    const yOffset = Math.max(0, 1.3 * planetRadius * Math.exp(-Math.abs(t) / 10));
    return { x: t * 1.0, y: yOffset, z: 0 };
  };
}

// Approximate ship visible radius — small accent (matches FlybyDebugViewer
// default).
const SHIP_VISIBLE_RADIUS = 0.4;

describe('classifyShot — ICONIC verdict at default PLANET_COMPOSITION', () => {
  for (const planetId of PLANET_IDS) {
    it(`composes as ICONIC for ${planetId} flyby (synthetic trajectory)`, () => {
      // Planet render radius varies — pick a representative value per
      // planet that matches what /fly's FLYBY_PLANET_COMPOSITION feeds.
      // 2.5 for inner planets, 4–5 for outers.
      const planetRadius = ['jupiter', 'saturn'].includes(planetId)
        ? 4.0
        : ['uranus', 'neptune'].includes(planetId)
          ? 3.0
          : 2.5;
      const peakMet = 100;
      const plan = planFlybyShot({
        planetId,
        planetPos: { x: 0, z: 0 },
        planetRadius,
        shipPosAtMet: makeShipPosAtMet(planetRadius, peakMet),
        peakMet,
      });
      expect(plan, `planFlybyShot returned null for ${planetId}`).not.toBeNull();
      const quality = classifyShot(plan!, { x: 0, y: 0, z: 0 }, planetRadius, SHIP_VISIBLE_RADIUS);
      // Detailed failure context: which classifier check tripped.
      const failureReasons = {
        shipBehindPlanet: quality.shipBehindPlanet,
        shipInsidePlanetDisk: quality.shipInsidePlanetDisk,
        shipOutOfFrame: quality.shipOutOfFrame,
        planetOutOfFrame: quality.planetOutOfFrame,
        planetTooSmall: quality.planetTooSmall,
        shipTooTiny: quality.shipTooTiny,
        shipApparent: quality.shipApparent,
        planetApparent: quality.planetApparent,
        shipPlanetFrameSeparation: quality.shipPlanetFrameSeparation,
      };
      expect(
        quality.isIconic,
        `${planetId} composition failed:\n${JSON.stringify(failureReasons, null, 2)}`,
      ).toBe(true);
    });
  }
});

describe('classifyShot — invariants the composition relies on', () => {
  it('shipDepth < planetDepth (ship is in front of planet from camera POV)', () => {
    const planetRadius = 2.5;
    const plan = planFlybyShot({
      planetId: 'venus',
      planetPos: { x: 0, z: 0 },
      planetRadius,
      shipPosAtMet: makeShipPosAtMet(planetRadius, 100),
      peakMet: 100,
    })!;
    const q = classifyShot(plan, { x: 0, y: 0, z: 0 }, planetRadius, SHIP_VISIBLE_RADIUS);
    expect(q.shipDepth).toBeLessThan(q.planetDepth);
  });

  it('planet apparent radius > ship apparent radius (planet dominates)', () => {
    const planetRadius = 2.5;
    const plan = planFlybyShot({
      planetId: 'venus',
      planetPos: { x: 0, z: 0 },
      planetRadius,
      shipPosAtMet: makeShipPosAtMet(planetRadius, 100),
      peakMet: 100,
    })!;
    const q = classifyShot(plan, { x: 0, y: 0, z: 0 }, planetRadius, SHIP_VISIBLE_RADIUS);
    // PLANET_COMPOSITION targets ≥ 2× ratio; assert it holds with margin.
    expect(q.planetApparent / q.shipApparent).toBeGreaterThan(2);
  });

  it('frame separation > planet apparent radius (ship is OUTSIDE planet disc in frame)', () => {
    const planetRadius = 2.5;
    const plan = planFlybyShot({
      planetId: 'venus',
      planetPos: { x: 0, z: 0 },
      planetRadius,
      shipPosAtMet: makeShipPosAtMet(planetRadius, 100),
      peakMet: 100,
    })!;
    const q = classifyShot(plan, { x: 0, y: 0, z: 0 }, planetRadius, SHIP_VISIBLE_RADIUS);
    expect(q.shipPlanetFrameSeparation).toBeGreaterThan(q.planetApparent);
  });
});

describe('classifyShot — degraded cases catch the right failure mode', () => {
  it('ship at frame center on top of planet → shipInsidePlanetDisk fires', () => {
    // Force ship to the planet's xz position with zero +y lift.
    const planetRadius = 2.5;
    const plan = planFlybyShot({
      planetId: 'venus',
      planetPos: { x: 0, z: 0 },
      planetRadius,
      shipPosAtMet: (met) => ({ x: met - 100, y: 0, z: 0 }),
      peakMet: 100,
      // Override composition so cameraTarget = planet (bias 0) and the
      // ship is ON the camera-to-planet axis.
    })!;
    const q = classifyShot(plan, { x: 0, y: 0, z: 0 }, planetRadius, SHIP_VISIBLE_RADIUS);
    // Without the +y lift, the synthetic ship sits at planet's altitude
    // → projects inside planet's disc at the iconic moment. The
    // classifier should flag it.
    expect(q.shipInsidePlanetDisk || q.shipBehindPlanet).toBe(true);
    expect(q.isIconic).toBe(false);
  });

  it('ship very far from planet → frame separation grows', () => {
    const planetRadius = 2.5;
    const planFar = planFlybyShot({
      planetId: 'venus',
      planetPos: { x: 0, z: 0 },
      planetRadius,
      shipPosAtMet: makeShipPosAtMet(planetRadius, 100),
      peakMet: 100,
      composition: { ...PLANET_COMPOSITION.venus, iconicLeadDays: 30 },
    })!;
    const qFar = classifyShot(planFar, { x: 0, y: 0, z: 0 }, planetRadius, SHIP_VISIBLE_RADIUS);
    const planNear = planFlybyShot({
      planetId: 'venus',
      planetPos: { x: 0, z: 0 },
      planetRadius,
      shipPosAtMet: makeShipPosAtMet(planetRadius, 100),
      peakMet: 100,
    })!;
    const qNear = classifyShot(planNear, { x: 0, y: 0, z: 0 }, planetRadius, SHIP_VISIBLE_RADIUS);
    expect(qFar.shipPlanetFrameSeparation).toBeGreaterThan(qNear.shipPlanetFrameSeparation);
  });
});
