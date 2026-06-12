import { describe, it, expect } from 'vitest';
import {
  planFlybyShot,
  flybyCameraGuides,
  PLANET_COMPOSITION,
  type FlybyContext,
} from './flyby-camera-plan';

/** Synthetic ship trajectory — moves along +x axis at 1 unit/day,
 *  with +y offset = 3.25 (~Venus radius × 1.3) at flyby. */
function syntheticShipPosAtMet(met: number) {
  // Ship moves through the flyby on a straight line; the +y offset is
  // there at peak day, fades away from peak.
  const t = met - 100; // peak at MET 100
  const yOffset = Math.max(0, 3.25 * Math.exp(-Math.abs(t) / 5));
  return { x: t * 1.0, y: yOffset, z: 0 };
}

const baseCtx: FlybyContext = {
  planetId: 'venus',
  planetPos: { x: 0, z: 0 },
  planetRadius: 2.5,
  shipPosAtMet: syntheticShipPosAtMet,
  peakMet: 100,
};

describe('planFlybyShot', () => {
  it('returns null when trajectory cannot provide a position', () => {
    const out = planFlybyShot({ ...baseCtx, shipPosAtMet: () => null });
    expect(out).toBeNull();
  });

  it('returns null when ship velocity is zero (stationary samples)', () => {
    const out = planFlybyShot({
      ...baseCtx,
      shipPosAtMet: () => ({ x: 5, y: 0, z: 0 }),
    });
    expect(out).toBeNull();
  });

  it('freezes the iconic moment ICONIC_LEAD_DAYS before peak', () => {
    const out = planFlybyShot(baseCtx)!;
    const expectedLead = PLANET_COMPOSITION.venus.iconicLeadDays;
    expect(out.iconicMet).toBe(baseCtx.peakMet - expectedLead);
  });

  it('targets a lerp from planet (bias=0) toward ship (bias=1)', () => {
    const out = planFlybyShot(baseCtx)!;
    const bias = PLANET_COMPOSITION.venus.targetBias;
    // Planet at xz=(0,0), y=0 by convention.
    expect(out.cameraTarget.x).toBeCloseTo(out.shipPos.x * bias, 5);
    expect(out.cameraTarget.z).toBeCloseTo(out.shipPos.z * bias, 5);
    expect(out.cameraTarget.y).toBeCloseTo(out.shipPos.y * bias, 5);
  });

  it('bias=0 puts target at the planet; bias=1 puts it at the ship', () => {
    const planet = planFlybyShot({
      ...baseCtx,
      composition: { ...PLANET_COMPOSITION.venus, targetBias: 0 },
    })!;
    expect(planet.cameraTarget.x).toBeCloseTo(baseCtx.planetPos.x, 5);
    expect(planet.cameraTarget.z).toBeCloseTo(baseCtx.planetPos.z, 5);
    const ship = planFlybyShot({
      ...baseCtx,
      composition: { ...PLANET_COMPOSITION.venus, targetBias: 1 },
    })!;
    expect(ship.cameraTarget.x).toBeCloseTo(ship.shipPos.x, 5);
    expect(ship.cameraTarget.z).toBeCloseTo(ship.shipPos.z, 5);
  });

  it('places the camera at distance planet_radius × camRMultiplier from the PLANET (v2 planet-centric)', () => {
    const out = planFlybyShot(baseCtx)!;
    const dx = out.cameraPos.x - baseCtx.planetPos.x;
    const dy = out.cameraPos.y; // planet center y = 0
    const dz = out.cameraPos.z - baseCtx.planetPos.z;
    const dist = Math.hypot(dx, dy, dz);
    const expected = baseCtx.planetRadius * PLANET_COMPOSITION.venus.camRMultiplier;
    expect(Math.abs(dist - expected)).toBeLessThan(1e-6);
  });

  it('side=0 places camera directly behind ship-approach (collinear); side rotates the xz position around the planet', () => {
    // Synthetic ship moves +x at 1 u/day → approachUnit = (+1, 0).
    // side=0 → camera offset xz = (-approachUnit · camR · cos(pitch)) = (-camR·cos(pitch), 0).
    // side=π/2 (CCW) → camera offset xz = (perpUnit · camR · cos(pitch)) where perp = (0,1).
    const dead = planFlybyShot({
      ...baseCtx,
      composition: { ...PLANET_COMPOSITION.venus, sideAngleRad: 0, pitchRad: Math.PI / 2 },
    })!;
    const side = planFlybyShot({
      ...baseCtx,
      composition: {
        ...PLANET_COMPOSITION.venus,
        sideAngleRad: Math.PI / 2,
        pitchRad: Math.PI / 2,
      },
    })!;
    // pitch=π/2 means cos(pitch)=0 — degenerate, camera ends up directly
    // above planet for both. Use pitch=0 (in-plane) to read xz cleanly.
    const deadInPlane = planFlybyShot({
      ...baseCtx,
      composition: { ...PLANET_COMPOSITION.venus, sideAngleRad: 0, pitchRad: 0 },
    })!;
    const sideInPlane = planFlybyShot({
      ...baseCtx,
      composition: { ...PLANET_COMPOSITION.venus, sideAngleRad: Math.PI / 2, pitchRad: 0 },
    })!;
    const camR = baseCtx.planetRadius * PLANET_COMPOSITION.venus.camRMultiplier;
    // dead in-plane: camera at planet - approachUnit · camR = (0 - camR, 0, 0).
    expect(deadInPlane.cameraPos.x).toBeCloseTo(-camR, 5);
    expect(Math.abs(deadInPlane.cameraPos.z)).toBeLessThan(1e-5);
    // side=π/2 in-plane: camera at planet + perpUnit · camR. perpUnit = rotate(approachUnit,+90°CCW) = (0,1) in (x,z).
    expect(Math.abs(sideInPlane.cameraPos.x)).toBeLessThan(1e-5);
    expect(sideInPlane.cameraPos.z).toBeCloseTo(camR, 5);
    // Sanity: pitch=π/2 outputs the same y for both side values.
    expect(dead.cameraPos.y).toBeCloseTo(side.cameraPos.y, 5);
  });

  it('honours pitch override: pitch=0 keeps camera in plane (y≈0); pitch=π/2 lifts camera to camR above planet', () => {
    const inPlane = planFlybyShot({
      ...baseCtx,
      composition: { ...PLANET_COMPOSITION.venus, pitchRad: 0 },
    })!;
    const above = planFlybyShot({
      ...baseCtx,
      composition: { ...PLANET_COMPOSITION.venus, pitchRad: Math.PI / 2 },
    })!;
    const camR = baseCtx.planetRadius * PLANET_COMPOSITION.venus.camRMultiplier;
    expect(Math.abs(inPlane.cameraPos.y)).toBeLessThan(1e-6);
    expect(Math.abs(above.cameraPos.y - camR)).toBeLessThan(1e-6);
  });

  it('returns the velocity unit vector from the trajectory samples', () => {
    const out = planFlybyShot(baseCtx)!;
    // Ship moves +1 unit/day in x, 0 in z, so velocity unit = (1, 0).
    expect(out.shipVelocityXZ.x).toBeCloseTo(1, 5);
    expect(Math.abs(out.shipVelocityXZ.z)).toBeLessThan(1e-3);
  });
});

describe('flybyCameraGuides', () => {
  it('returns zero vectors for a zero velocity', () => {
    const g = flybyCameraGuides({ x: 0, z: 0 }, Math.PI / 6);
    expect(g.behind).toEqual({ x: 0, z: 0 });
    expect(g.cameraDir).toEqual({ x: 0, z: 0 });
  });

  it('returns -velocity for the behind direction and a rotated copy for camera', () => {
    const g = flybyCameraGuides({ x: 1, z: 0 }, Math.PI / 2);
    // -velocity = (-1, 0). Rotate by π/2 CCW in xz → (0, -1).
    expect(g.behind.x).toBeCloseTo(-1, 5);
    expect(Math.abs(g.behind.z)).toBeLessThan(1e-6);
    expect(Math.abs(g.cameraDir.x)).toBeLessThan(1e-6);
    expect(g.cameraDir.z).toBeCloseTo(-1, 5);
  });
});
