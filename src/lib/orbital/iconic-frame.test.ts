import { describe, it, expect } from 'vitest';
import { computeIconicFrame, type ComputeIconicFrameInputs } from './iconic-frame';
import { PLANET_COMPOSITION, planFlybyShot } from './flyby-camera-plan';

// Synthetic ship trajectory — mirrors the Cassini-art-ish shape used
// by the planFlybyShot tests. Moves +x at 1 unit/day, lifts +y near
// the peak.
function syntheticSampleShipScene(planetRadius: number, peakMet: number) {
  return (met: number) => {
    const t = met - peakMet;
    const yOffset = Math.max(0, 1.3 * planetRadius * Math.exp(-Math.abs(t) / 10));
    return { x: t * 1.0, y: yOffset, z: 0 };
  };
}

const FALLBACK_PITCH = 1.0;
const BASE_INPUTS = (overrides?: Partial<ComputeIconicFrameInputs>): ComputeIconicFrameInputs => ({
  flybyPlanetId: 'venus',
  flybyPlanetRadius: 2.5,
  planetScenePos: { x: 0, z: 0 },
  peakMet: 100,
  sampleShipScene: syntheticSampleShipScene(2.5, 100),
  fallbackShipPos: { x: 0, z: 0 },
  fallbackPitchRad: FALLBACK_PITCH,
  ...overrides,
});

describe('computeIconicFrame', () => {
  it('uses fallback path when the ship sampler returns null', () => {
    const out = computeIconicFrame(
      BASE_INPUTS({
        sampleShipScene: () => null,
        fallbackShipPos: { x: 42, z: -7 },
      }),
    );
    expect(out.hasPlan).toBe(false);
    expect(out.centerX).toBe(42);
    expect(out.centerY).toBe(0);
    expect(out.centerZ).toBe(-7);
    expect(out.targetR).toBe(2.5 * 3.5); // FALLBACK_CAM_DIST_PER_PLANET_RADIUS × planet radius
    expect(out.targetP).toBe(FALLBACK_PITCH);
    expect(out.helioFlybyDesiredCamT).toBeNull();
  });

  it('produces a plan when the sampler is healthy', () => {
    const out = computeIconicFrame(BASE_INPUTS());
    expect(out.hasPlan).toBe(true);
    expect(Number.isFinite(out.targetR)).toBe(true);
    expect(out.targetR).toBeGreaterThan(0);
    expect(Number.isFinite(out.targetP)).toBe(true);
    expect(out.targetP).toBeGreaterThan(0);
    expect(out.targetP).toBeLessThan(Math.PI);
    expect(out.helioFlybyDesiredCamT).not.toBeNull();
  });

  it('the returned spherical coords reproduce planFlybyShot.cameraPos when summed back', () => {
    const out = computeIconicFrame(BASE_INPUTS());
    // Reconstruct camera_pos via the documented projection:
    //   camera_pos = camTarget + R × (sin(P)·sin(T), cos(P), sin(P)·cos(T))
    const R = out.targetR;
    const P = out.targetP;
    const T = out.helioFlybyDesiredCamT!;
    const reconX = out.centerX + R * Math.sin(P) * Math.sin(T);
    const reconY = out.centerY + R * Math.cos(P);
    const reconZ = out.centerZ + R * Math.sin(P) * Math.cos(T);

    // Compute the same plan directly to cross-check.
    const ship = syntheticSampleShipScene(2.5, 100);
    const plan = planFlybyShot({
      planetId: 'venus',
      planetPos: { x: 0, z: 0 },
      planetRadius: 2.5,
      shipPosAtMet: ship,
      peakMet: 100,
    });
    expect(plan).not.toBeNull();
    expect(reconX).toBeCloseTo(plan!.cameraPos.x, 4);
    expect(reconY).toBeCloseTo(plan!.cameraPos.y, 4);
    expect(reconZ).toBeCloseTo(plan!.cameraPos.z, 4);
  });

  it('centerXYZ matches plan.cameraTarget when planet is at the world origin', () => {
    const out = computeIconicFrame(BASE_INPUTS());
    // Venus defaults: targetBias = 0 → cameraTarget = planet (which is
    // at (0,0,0) here), so centerXYZ should match.
    expect(out.centerX).toBeCloseTo(0, 5);
    expect(out.centerY).toBeCloseTo(0, 5);
    expect(out.centerZ).toBeCloseTo(0, 5);
    expect(PLANET_COMPOSITION.venus.targetBias).toBe(0);
  });

  it('fallback pitch is used when camDist degenerates to ~0', () => {
    // Pathological synthetic sampler returns ship at the same position
    // as the planet → planFlybyShot's cameraPos == cameraTarget (well,
    // cosmetically degenerate). The helper picks fallbackPitchRad.
    //
    // We construct this by making the sampler return the SAME xyz
    // regardless of met — planFlybyShot returns null in that case
    // (zero velocity), so we hit the fallback branch instead.
    const out = computeIconicFrame(
      BASE_INPUTS({
        sampleShipScene: () => ({ x: 0, y: 0, z: 0 }),
      }),
    );
    expect(out.hasPlan).toBe(false);
    expect(out.targetP).toBe(FALLBACK_PITCH);
  });
});
