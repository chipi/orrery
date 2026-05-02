import { describe, it, expect } from 'vitest';
import {
  auToKm,
  auToMkm,
  distanceBetween,
  dvRemaining,
  heliocentricSpeed,
  missionElapsedDays,
  moonOutboundArc,
  moonPositionAtMet,
  moonReturnArc,
  signalDelayMin,
} from './fly-physics';
import {
  AU_TO_KM,
  C_LIGHT_KM_S,
  MOON_ORBITAL_PERIOD_DAYS,
  MOON_VISUAL_DISTANCE,
} from './fly-physics-constants';
import { expectCloseTo } from './test-helpers/expect-close';
import { outboundArc } from './mission-arc';

describe('heliocentricSpeed (vis-viva)', () => {
  it('Earth-circular at r=1.0, a=1.0 ≈ 29.78 km/s (NASA fact sheet)', () => {
    expectCloseTo(heliocentricSpeed(1.0, 1.0), 29.78, 0.05, 'Earth circular vel');
  });

  it('Mars-circular at r=1.524, a=1.524 ≈ 24.13 km/s', () => {
    expectCloseTo(heliocentricSpeed(1.524, 1.524), 24.13, 0.05, 'Mars circular vel');
  });

  it('Hohmann perihelion (a=1.262, r=1.0) ≈ 32.73 km/s (Curtis §6.2)', () => {
    expectCloseTo(heliocentricSpeed(1.0, 1.262), 32.73, 0.05, 'Hohmann perihelion');
  });
});

describe('distanceBetween', () => {
  it('zero for identical points', () => {
    expect(distanceBetween({ x: 1, z: 0 }, { x: 1, z: 0 })).toBe(0);
  });
  it('returns Euclidean distance for orthogonal vectors', () => {
    expect(distanceBetween({ x: 0, z: 0 }, { x: 3, z: 4 })).toBe(5);
  });
});

describe('auToKm + auToMkm', () => {
  it('1 AU = 149,597,870.7 km', () => {
    expect(auToKm(1)).toBe(AU_TO_KM);
  });
  it('1 AU = ~149.6 M km', () => {
    expectCloseTo(auToMkm(1), 149.6, 0.1, 'auToMkm');
  });
});

describe('signalDelayMin', () => {
  it('0 AU → 0 minutes', () => {
    expect(signalDelayMin(0)).toBe(0);
  });
  it('1 AU ≈ 8.317 light-minutes', () => {
    expectCloseTo(signalDelayMin(1.0), AU_TO_KM / C_LIGHT_KM_S / 60, 0.001, '1 AU light-min');
    expectCloseTo(signalDelayMin(1.0), 8.317, 0.005, '1 AU ≈ 8.317 lmin');
  });
});

describe('missionElapsedDays', () => {
  it('pre-launch (simDay < depDay) clamps to 0', () => {
    expect(missionElapsedDays(-10, 0, 254, 254)).toBe(0);
  });
  it('post-arrival clamps to total', () => {
    expect(missionElapsedDays(300, 0, 254, 254)).toBe(254);
  });
  it('linear midpoint = totalDays/2', () => {
    expect(missionElapsedDays(127, 0, 254, 254)).toBe(127);
  });
  it('rescales to mission display days when arc != mission length', () => {
    // Free-return scenario: arc spans 509 days but mission display is 254
    expect(missionElapsedDays(254.5, 0, 509, 254)).toBeCloseTo(127, 0);
  });
  it('zero-length arc returns 0', () => {
    expect(missionElapsedDays(50, 100, 100, 254)).toBe(0);
  });
});

describe('dvRemaining', () => {
  it('returns difference when total > used', () => {
    expect(dvRemaining(6.1, 5.7)).toBeCloseTo(0.4, 5);
  });
  it('clamps to 0 when used > total', () => {
    expect(dvRemaining(6.1, 7.0)).toBe(0);
  });
});

describe('moonPositionAtMet + moonOutboundArc + moonReturnArc', () => {
  it('moonPositionAtMet at t=0 sits on +X axis at MOON_VISUAL_DISTANCE', () => {
    const p = moonPositionAtMet(0);
    expectCloseTo(p.x, MOON_VISUAL_DISTANCE, 1e-9, 'moon at t=0 x');
    expectCloseTo(p.z, 0, 1e-9, 'moon at t=0 z');
  });
  it('moonPositionAtMet wraps period correctly', () => {
    const a = moonPositionAtMet(0);
    const b = moonPositionAtMet(MOON_ORBITAL_PERIOD_DAYS);
    expectCloseTo(a.x, b.x, 1e-9, 'moon wraps x');
    expectCloseTo(a.z, b.z, 1e-9, 'moon wraps z');
  });
  it('moonOutboundArc starts at Earth (0,0)', () => {
    const arc = moonOutboundArc({ x: 100, z: 0 }, 50);
    expect(arc[0]).toEqual({ x: 0, z: 0 });
  });
  it('moonOutboundArc ends at the Moon position', () => {
    const arc = moonOutboundArc({ x: 100, z: 0 }, 50);
    expect(arc[arc.length - 1].x).toBeCloseTo(100, 5);
    expect(arc[arc.length - 1].z).toBeCloseTo(0, 5);
  });
  it('moonReturnArc starts at Moon and ends at Earth', () => {
    const arc = moonReturnArc({ x: 0, z: 100 }, 50);
    expect(arc[0].x).toBeCloseTo(0, 5);
    expect(arc[0].z).toBeCloseTo(100, 5);
    expect(arc[arc.length - 1]).toEqual({ x: 0, z: 0 });
  });
  it('moonOutboundArc and moonReturnArc curve oppositely (control-point flip)', () => {
    // For a Moon position on +X axis, outbound midpoint should curve
    // to -Z, return midpoint to +Z (or vice versa depending on signs).
    const moon = { x: 100, z: 0 };
    const out = moonOutboundArc(moon, 50);
    const ret = moonReturnArc(moon, 50);
    const outMid = out[Math.floor(out.length / 2)];
    const retMid = ret[Math.floor(ret.length / 2)];
    // Mid-curve points should be on opposite sides of the Earth-Moon line.
    expect(Math.sign(outMid.z)).not.toBe(Math.sign(retMid.z));
  });
});

describe('outboundArc V∞ shaping (mission-arc.ts:76)', () => {
  it('baseline: identical to no-V∞ when V∞ is undefined', () => {
    const baseline = outboundArc({ x: 1, z: 0 }, 20, 1.524);
    const passthrough = outboundArc({ x: 1, z: 0 }, 20, 1.524, undefined);
    expect(baseline).toEqual(passthrough);
  });

  it('V∞ above baseline curls the arc outward (eccentricity bumps)', () => {
    const baseline = outboundArc({ x: 1, z: 0 }, 20, 1.524);
    const energetic = outboundArc({ x: 1, z: 0 }, 20, 1.524, 5.0);
    // Pick the arc midpoint and compare radial distances.
    const baseR = Math.hypot(baseline[10].x, baseline[10].z);
    const energR = Math.hypot(energetic[10].x, energetic[10].z);
    expect(energR).not.toBe(baseR);
  });

  it('V∞ at Hohmann baseline produces ~zero bend', () => {
    // Hohmann V∞ for Mars ≈ 2.94 km/s; passing it should leave the
    // arc effectively unchanged.
    const baseline = outboundArc({ x: 1, z: 0 }, 20, 1.524);
    const matched = outboundArc({ x: 1, z: 0 }, 20, 1.524, 2.94);
    const baseR = Math.hypot(baseline[10].x, baseline[10].z);
    const matchedR = Math.hypot(matched[10].x, matched[10].z);
    expectCloseTo(matchedR, baseR, 0.05, 'V∞=Hohmann matches baseline');
  });

  it('extreme V∞ clamped (no unphysical loop)', () => {
    // 3× Hohmann V∞ should clamp to the bend cap, not produce a
    // negative-eccentricity arc.
    const arc = outboundArc({ x: 1, z: 0 }, 20, 1.524, 12.0);
    expect(arc.length).toBe(21);
    for (const p of arc) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.z)).toBe(true);
    }
  });
});
