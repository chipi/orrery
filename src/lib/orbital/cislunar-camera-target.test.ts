import { describe, it, expect } from 'vitest';
import {
  computeCislunarCameraTarget,
  LUNAR_PHASE_TYPES,
  EARTH_PHASE_TYPES,
} from './cislunar-camera-target';
import type { CislunarPhase } from '$lib/cislunar-geometry';

const MOON_IN_SCENE = { x: 69, z: 0 };
const DISTANCES = {
  wideDistance: 69,
  lunarCloseupDistance: 3.5,
  earthCloseupDistance: 16,
};

function phase(type: string): CislunarPhase {
  return { type: type as CislunarPhase['type'], start_met_days: 0, end_met_days: 1, points: [] };
}

describe('computeCislunarCameraTarget', () => {
  it('Moon-local phases close up on the Moon', () => {
    for (const t of ['lunar_orbit', 'spiral_lunar', 'descent', 'ascent', 'lunar_flyby']) {
      const out = computeCislunarCameraTarget({
        phase: phase(t),
        phaseProgress: 0.5,
        isNearMoon: false,
        moonInScene: MOON_IN_SCENE,
        ...DISTANCES,
      });
      expect(out.targetR).toBe(3.5);
      expect(out.centerX).toBe(MOON_IN_SCENE.x);
      expect(out.centerZ).toBe(MOON_IN_SCENE.z);
    }
  });

  it('isNearMoon = true closes up on the Moon even from non-Moon-local phases', () => {
    const out = computeCislunarCameraTarget({
      phase: phase('tli_coast'),
      phaseProgress: 0.9,
      isNearMoon: true,
      moonInScene: MOON_IN_SCENE,
      ...DISTANCES,
    });
    expect(out.targetR).toBe(3.5);
    expect(out.centerX).toBe(MOON_IN_SCENE.x);
    expect(out.subPhase).toBe('tli_coast_near_moon');
  });

  it('Earth-localised phases close up on Earth at the origin', () => {
    for (const t of ['parking', 'spiral_earth', 'reentry']) {
      const out = computeCislunarCameraTarget({
        phase: phase(t),
        phaseProgress: 0.5,
        isNearMoon: false,
        moonInScene: MOON_IN_SCENE,
        ...DISTANCES,
      });
      expect(out.targetR).toBe(16);
      expect(out.centerX).toBe(0);
      expect(out.centerZ).toBe(0);
    }
  });

  it('tli_coast pans the target from Earth toward Moon (0.7 multiplier)', () => {
    const at0 = computeCislunarCameraTarget({
      phase: phase('tli_coast'),
      phaseProgress: 0,
      isNearMoon: false,
      moonInScene: MOON_IN_SCENE,
      ...DISTANCES,
    });
    expect(at0.centerX).toBe(0); // Earth side at start
    const at1 = computeCislunarCameraTarget({
      phase: phase('tli_coast'),
      phaseProgress: 1,
      isNearMoon: false,
      moonInScene: MOON_IN_SCENE,
      ...DISTANCES,
    });
    expect(at1.centerX).toBeCloseTo(MOON_IN_SCENE.x * 0.7, 5); // 70 % of the way to Moon at end
    const at_mid = computeCislunarCameraTarget({
      phase: phase('tli_coast'),
      phaseProgress: 0.5,
      isNearMoon: false,
      moonInScene: MOON_IN_SCENE,
      ...DISTANCES,
    });
    expect(at_mid.centerX).toBeCloseTo(MOON_IN_SCENE.x * 0.5 * 0.7, 5);
    expect(at_mid.targetR).toBe(69); // wide
  });

  it('tei_coast inverts the pan (Moon → Earth)', () => {
    const at0 = computeCislunarCameraTarget({
      phase: phase('tei_coast'),
      phaseProgress: 0,
      isNearMoon: false,
      moonInScene: MOON_IN_SCENE,
      ...DISTANCES,
    });
    expect(at0.centerX).toBeCloseTo(MOON_IN_SCENE.x * 0.7, 5);
    const at1 = computeCislunarCameraTarget({
      phase: phase('tei_coast'),
      phaseProgress: 1,
      isNearMoon: false,
      moonInScene: MOON_IN_SCENE,
      ...DISTANCES,
    });
    expect(at1.centerX).toBe(0); // Earth side at end
  });

  it('unknown phase types fall back to wide framing at the origin', () => {
    const out = computeCislunarCameraTarget({
      phase: phase('unknown'),
      phaseProgress: 0.5,
      isNearMoon: false,
      moonInScene: MOON_IN_SCENE,
      ...DISTANCES,
    });
    expect(out.targetR).toBe(69);
    expect(out.centerX).toBe(0);
    expect(out.centerZ).toBe(0);
  });

  it('subPhase has no suffix when isNearMoon is false', () => {
    const out = computeCislunarCameraTarget({
      phase: phase('tli_coast'),
      phaseProgress: 0.5,
      isNearMoon: false,
      moonInScene: MOON_IN_SCENE,
      ...DISTANCES,
    });
    expect(out.subPhase).toBe('tli_coast');
  });

  it('subPhase gets the _near_moon suffix when isNearMoon is true', () => {
    const out = computeCislunarCameraTarget({
      phase: phase('tli_coast'),
      phaseProgress: 0.5,
      isNearMoon: true,
      moonInScene: MOON_IN_SCENE,
      ...DISTANCES,
    });
    expect(out.subPhase).toBe('tli_coast_near_moon');
  });

  it('exposes the phase-type sets for callers that need the same source of truth', () => {
    expect(LUNAR_PHASE_TYPES.has('lunar_orbit')).toBe(true);
    expect(LUNAR_PHASE_TYPES.has('parking')).toBe(false);
    expect(EARTH_PHASE_TYPES.has('parking')).toBe(true);
    expect(EARTH_PHASE_TYPES.has('lunar_orbit')).toBe(false);
  });
});
