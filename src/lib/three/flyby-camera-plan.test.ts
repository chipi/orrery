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

  it("targets the ship's position (camera looks AT the ship)", () => {
    const out = planFlybyShot(baseCtx)!;
    expect(out.cameraTarget).toEqual(out.shipPos);
  });

  it('places the camera at distance planet_radius × camRMultiplier from the ship', () => {
    const out = planFlybyShot(baseCtx)!;
    const dx = out.cameraPos.x - out.shipPos.x;
    const dy = out.cameraPos.y - out.shipPos.y;
    const dz = out.cameraPos.z - out.shipPos.z;
    const dist = Math.hypot(dx, dy, dz);
    const expected = baseCtx.planetRadius * PLANET_COMPOSITION.venus.camRMultiplier;
    expect(Math.abs(dist - expected)).toBeLessThan(1e-6);
  });

  it('honours the side-angle override (camera direction rotates in xz)', () => {
    const dead = planFlybyShot({
      ...baseCtx,
      composition: { ...PLANET_COMPOSITION.venus, sideAngleRad: 0, pitchRad: Math.PI / 2 },
    })!;
    const tilted = planFlybyShot({
      ...baseCtx,
      composition: {
        ...PLANET_COMPOSITION.venus,
        sideAngleRad: Math.PI / 4,
        pitchRad: Math.PI / 2,
      },
    })!;
    // With pitch = π/2 (horizontal), the y component is ~0 and the
    // xz component dominates. Tilting by π/4 should visibly rotate
    // camera position in xz vs dead-behind.
    const deadAngle = Math.atan2(dead.cameraPos.x - dead.shipPos.x, dead.cameraPos.z - dead.shipPos.z);
    const tiltedAngle = Math.atan2(
      tilted.cameraPos.x - tilted.shipPos.x,
      tilted.cameraPos.z - tilted.shipPos.z,
    );
    const deltaAngle = Math.abs(((tiltedAngle - deadAngle + Math.PI) % (2 * Math.PI)) - Math.PI);
    // π/4 rotation in xz should produce ~π/4 angular delta.
    expect(Math.abs(deltaAngle - Math.PI / 4)).toBeLessThan(1e-4);
  });

  it('honours the pitch override (camera y component changes)', () => {
    const fromAbove = planFlybyShot({
      ...baseCtx,
      composition: { ...PLANET_COMPOSITION.venus, pitchRad: 0 },
    })!;
    const horizontal = planFlybyShot({
      ...baseCtx,
      composition: { ...PLANET_COMPOSITION.venus, pitchRad: Math.PI / 2 },
    })!;
    // pitch = 0 → camera directly above ship (y component = camR).
    const camR = baseCtx.planetRadius * PLANET_COMPOSITION.venus.camRMultiplier;
    expect(Math.abs(fromAbove.cameraPos.y - fromAbove.shipPos.y - camR)).toBeLessThan(1e-6);
    // pitch = π/2 → camera at ship's altitude (y component ≈ 0).
    expect(Math.abs(horizontal.cameraPos.y - horizontal.shipPos.y)).toBeLessThan(1e-6);
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
