import { describe, it, expect } from 'vitest';
import {
  airDensity,
  ambientPressure,
  ascentToOrbit,
  circularSpeed,
  dynamicPressure,
  gravity,
  integrateAscent,
  pitchAngleRad,
  pressureRatio,
  sampleAscentAt,
  stackIdealDv,
  stageIspS,
  stagePropellant,
  stageThrustN,
  tsiolkovskyDv,
} from './ascent-physics';
import { FALCON9_SAMPLE as FALCON9 } from './ascent-profiles';
import { SEA_LEVEL_DENSITY_KGM3, SEA_LEVEL_PRESSURE_PA } from './ascent-physics-constants';
import { expectCloseTo } from '../test-helpers/expect-close';

describe('atmosphere + gravity', () => {
  it('sea-level density + pressure match the constants', () => {
    expectCloseTo(airDensity(0), SEA_LEVEL_DENSITY_KGM3, 1e-6, 'ρ₀');
    expectCloseTo(ambientPressure(0), SEA_LEVEL_PRESSURE_PA, 1e-3, 'p₀');
    expectCloseTo(pressureRatio(0), 1, 1e-9, 'p/p₀ at sea level');
  });

  it('density falls by 1/e over one scale height (8.5 km)', () => {
    expectCloseTo(
      airDensity(8_500),
      SEA_LEVEL_DENSITY_KGM3 / Math.E,
      1e-4,
      'ρ at one scale height',
    );
  });

  it('surface gravity ≈ 9.82 m/s² (µ/R⊕²)', () => {
    expectCloseTo(gravity(0), 9.82, 0.02, 'g at surface');
  });

  it('circular speed at 200 km ≈ 7.79 km/s', () => {
    expectCloseTo(circularSpeed(200_000) / 1000, 7.788, 0.01, 'v_circ @ 200 km');
  });

  it('dynamic pressure q = ½ρv²', () => {
    expectCloseTo(dynamicPressure(1.0, 100), 5_000, 1e-6, 'q');
  });
});

describe('rocket equation', () => {
  it('Tsiolkovsky: Isp 300 s, mass-ratio 2 → 2039 m/s', () => {
    expectCloseTo(tsiolkovskyDv(300, 1000, 500), 2039.2, 0.5, 'Δv for ln(2) mass ratio');
  });

  it('returns 0 for a non-positive or non-shrinking mass ratio', () => {
    expect(tsiolkovskyDv(300, 500, 500)).toBe(0);
    expect(tsiolkovskyDv(300, 400, 500)).toBe(0);
  });

  it('stage propellant is wet − dry', () => {
    expect(stagePropellant(FALCON9.stages[0])).toBe(433_100 - 25_600);
  });

  it('Falcon 9 ideal Δv is in the ~9 km/s LEO envelope', () => {
    const dv = stackIdealDv(FALCON9) / 1000;
    expect(dv).toBeGreaterThan(8);
    expect(dv).toBeLessThan(12);
  });
});

describe('pressure-interpolated thrust + Isp', () => {
  it('sea-level altitude → sea-level values', () => {
    expectCloseTo(
      stageThrustN(FALCON9.stages[0], 0) / 1000,
      7_607,
      1,
      'S1 thrust @ sea level (kN)',
    );
    expectCloseTo(stageIspS(FALCON9.stages[0], 0), 283, 0.1, 'S1 Isp @ sea level');
  });

  it('high altitude → approaches vacuum values', () => {
    expectCloseTo(
      stageThrustN(FALCON9.stages[0], 120_000) / 1000,
      8_227,
      5,
      'S1 thrust @ 120 km (kN)',
    );
    expectCloseTo(stageIspS(FALCON9.stages[0], 120_000), 312, 0.2, 'S1 Isp @ 120 km');
  });

  it('vacuum-only upper stage ignores altitude', () => {
    expect(stageThrustN(FALCON9.stages[1], 0)).toBe(981 * 1000);
    expect(stageIspS(FALCON9.stages[1], 0)).toBe(348);
  });
});

describe('pitch program', () => {
  it('clamps to the endpoints and interpolates linearly between knots', () => {
    expectCloseTo((pitchAngleRad(FALCON9, 0) * 180) / Math.PI, 90, 1e-6, 'pitch @ t=0');
    expectCloseTo(
      (pitchAngleRad(FALCON9, -5) * 180) / Math.PI,
      90,
      1e-6,
      'pitch clamped pre-launch',
    );
    expectCloseTo((pitchAngleRad(FALCON9, 26) * 180) / Math.PI, 79.5, 1e-6, 'pitch midway 12→40 s');
    expectCloseTo(
      (pitchAngleRad(FALCON9, 9_999) * 180) / Math.PI,
      3,
      1e-6,
      'pitch clamped post-program',
    );
  });
});

describe('integrateAscent (Falcon 9 smoke test)', () => {
  const s = integrateAscent(FALCON9);

  it('lifts off (TWR > 1) and climbs out of the atmosphere', () => {
    expect(s.states[0].twr).toBeGreaterThan(1);
    expect(s.finalAltKm).toBeGreaterThan(80);
  });

  it('gains near-orbital speed', () => {
    expect(s.finalSpeedKms).toBeGreaterThan(6);
  });

  it('burns propellant monotonically until staging', () => {
    expect(s.states.at(-1)!.massKg).toBeLessThan(s.states[0].massKg);
  });

  it('passes through a physical Max-Q (5–80 kPa, 20–140 s)', () => {
    expect(s.maxQ.qPa).toBeGreaterThan(5_000);
    expect(s.maxQ.qPa).toBeLessThan(80_000);
    expect(s.maxQ.t).toBeGreaterThan(20);
    expect(s.maxQ.t).toBeLessThan(140);
  });

  it('fires the expected beats in order', () => {
    const types = s.events.map((e) => e.type);
    expect(types[0]).toBe('liftoff');
    expect(types).toContain('meco');
    expect(types).toContain('staging');
    expect(types).toContain('seco');
    // MECO precedes SECO.
    expect(types.indexOf('meco')).toBeLessThan(types.lastIndexOf('seco'));
  });

  it('books all three Δv losses as positive and bounded', () => {
    expect(s.losses.gravityKms).toBeGreaterThan(0);
    expect(s.losses.gravityKms).toBeLessThan(3);
    expect(s.losses.dragKms).toBeGreaterThan(0);
    expect(s.losses.dragKms).toBeLessThan(1);
    expect(s.losses.steeringKms).toBeGreaterThanOrEqual(0);
  });
});

describe('ascentToOrbit (/plan reuse)', () => {
  const plan = ascentToOrbit(FALCON9);

  it('reports the planning Δv budget with a positive margin', () => {
    expect(plan.idealDvKms).toBeGreaterThan(8);
    expect(plan.dvRequiredKms).toBeGreaterThan(7.8); // circular speed + losses
    expect(plan.payloadMarginKms).toBeGreaterThan(0);
  });

  it('agrees with the integrator on ideal Δv', () => {
    expectCloseTo(plan.idealDvKms, stackIdealDv(FALCON9) / 1000, 1e-6, 'ideal Δv parity');
  });
});

describe('sampleAscentAt', () => {
  const s = integrateAscent(FALCON9);

  it('clamps below the first + above the last sample', () => {
    expect(sampleAscentAt(s.states, -100).t).toBe(s.states[0].t);
    expect(sampleAscentAt(s.states, 1e9).t).toBe(s.states.at(-1)!.t);
  });

  it('interpolates monotonically-increasing altitude early in flight', () => {
    const lo = sampleAscentAt(s.states, 30);
    const hi = sampleAscentAt(s.states, 60);
    expect(hi.altKm).toBeGreaterThan(lo.altKm);
    expect(hi.t).toBe(60);
  });
});
