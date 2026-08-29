import { describe, it, expect } from 'vitest';
import {
  airDensity,
  ambientPressure,
  ascentToOrbit,
  circularSpeed,
  combinedBoosterStage,
  commandedPitchRad,
  dynamicPressure,
  gravity,
  GUIDANCE,
  integrateAscent,
  type LaunchProfile,
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

  it('exposes totalDurationS matching the final sampled state (no re-derivation)', () => {
    expect(s.totalDurationS).toBe(s.states.at(-1)!.t);
    expect(s.totalDurationS).toBeGreaterThan(0);
  });
});

describe('integrateAscent — HUD frame correctness (B2/S3 regression)', () => {
  const s = integrateAscent(FALCON9);

  it('reports ZERO dynamic pressure + drag + heat flux on the pad (air-relative, not inertial)', () => {
    // At liftoff the vehicle carries Earth's rotation speed inertially (~409 m/s),
    // but the co-rotating atmosphere means air-relative airspeed ≈ 0 → the HUD must
    // read q = 0, drag = 0 (was ~100 kPa / ~330 kN — inertial-frame bug B2).
    expect(s.states[0].qPa).toBeLessThan(1);
    expect(s.states[0].dragN).toBeLessThan(1);
    expect(s.states[0].aeroHeatFlux).toBeLessThan(1);
  });

  it('peak HUD dynamic pressure agrees with the integrator maxQ (same air-relative frame + time)', () => {
    let peakQ = 0;
    let peakT = 0;
    for (const st of s.states)
      if (st.qPa > peakQ) {
        peakQ = st.qPa;
        peakT = st.t;
      }
    // Was ~3× the integrator maxQ at the wrong time; now both air-relative.
    expect(peakQ).toBeGreaterThan(s.maxQ.qPa * 0.85);
    expect(peakQ).toBeLessThan(s.maxQ.qPa * 1.2);
    expect(Math.abs(peakT - s.maxQ.t)).toBeLessThan(8);
  });

  it('thrust honesty: every engine-dark state reports zero thrust/TWR/chamber-temp (S3)', () => {
    for (const st of s.states) {
      if (st.thrustN === 0) {
        expect(st.twr, `TWR at t=${st.t}`).toBe(0);
        expect(st.chamberTempK, `chamberTempK at t=${st.t}`).toBe(0);
      }
    }
    // Liftoff itself is engine-lit.
    expect(s.states[0].thrustN).toBeGreaterThan(0);
    expect(s.states[0].twr).toBeGreaterThan(1);
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

describe('commandedPitchRad — two-phase insertion guidance (#415)', () => {
  const belowHandover = GUIDANCE.handoverAltM - 5_000;
  const aboveHandover = GUIDANCE.handoverAltM + GUIDANCE.blendM + 30_000;

  it('follows the aero pitch table below the handover altitude', () => {
    const guided = commandedPitchRad(FALCON9, 40, belowHandover, 300, 200, 25);
    expect(guided).toBe(pitchAngleRad(FALCON9, 40));
  });

  it('falls back to the table while coasting (no thrust) even above handover', () => {
    const guided = commandedPitchRad(FALCON9, 300, aboveHandover, 100, 5_000, 0);
    expect(guided).toBe(pitchAngleRad(FALCON9, 300));
  });

  it('commands prograde while apoapsis is still below target (raise apoapsis)', () => {
    // Low horizontal speed → sub-orbital arc → apoapsis below target → prograde.
    const velUp = 400;
    const velHoriz = 1_000;
    const guided = commandedPitchRad(FALCON9, 200, aboveHandover, velUp, velHoriz, 20);
    expect(guided).toBeCloseTo(Math.atan2(velUp, velHoriz), 6);
  });

  it('stays within the guidance climb/dive clamps', () => {
    for (const vh of [1_000, 4_000, 7_000, 7_800]) {
      const guided = commandedPitchRad(FALCON9, 250, aboveHandover, 50, vh, 18);
      expect(guided).toBeLessThanOrEqual(GUIDANCE.maxClimbRad + 1e-9);
      expect(guided).toBeGreaterThanOrEqual(-GUIDANCE.maxDiveRad - 1e-9);
    }
  });

  it('drops the commanded pitch as horizontal speed builds (vₓ²/r cancels gravity)', () => {
    // At target altitude with super-circular horizontal speed the guidance is in
    // its altitude-hold branch; as vₓ grows, the centrifugal relief pushes the
    // commanded pitch down toward (and past) level — arriving level at orbit.
    const atTarget = GUIDANCE.targetAltM;
    const slow = commandedPitchRad(FALCON9, 250, atTarget, 0, 7_900, 18);
    const fast = commandedPitchRad(FALCON9, 250, atTarget, 0, 8_100, 18);
    expect(fast).toBeLessThan(slow);
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

describe('Δv-loss ledger (running totals per state)', () => {
  const s = integrateAscent(FALCON9);

  it('drag + steering losses are monotonic non-decreasing; all non-negative', () => {
    // Drag loss (drag/m·dt) and steering loss ((1−cosα)·dt) are non-negative
    // integrands → strictly monotonic. Gravity loss integrates g·sin(γ)·dt,
    // which can tick DOWN when the flight-path angle goes negative near
    // insertion (Δv is recovered thrusting while descending) — so it is only
    // bounded non-negative overall, not monotonic.
    for (let i = 1; i < s.states.length; i++) {
      const p = s.states[i - 1];
      const c = s.states[i];
      expect(c.lossDragKms).toBeGreaterThanOrEqual(p.lossDragKms);
      expect(c.lossSteeringKms).toBeGreaterThanOrEqual(p.lossSteeringKms);
      expect(c.lossGravityKms).toBeGreaterThanOrEqual(0);
      expect(c.lossDragKms).toBeGreaterThanOrEqual(0);
      expect(c.lossSteeringKms).toBeGreaterThanOrEqual(0);
    }
  });

  it('the first sample starts at zero losses', () => {
    expect(s.states[0].lossGravityKms).toBe(0);
    expect(s.states[0].lossDragKms).toBe(0);
    expect(s.states[0].lossSteeringKms).toBe(0);
  });

  it('the final sampled state equals summary.losses exactly', () => {
    const last = s.states.at(-1)!;
    expect(last.lossGravityKms).toBe(s.losses.gravityKms);
    expect(last.lossDragKms).toBe(s.losses.dragKms);
    expect(last.lossSteeringKms).toBe(s.losses.steeringKms);
  });

  it('gravity loss dominates for a vertical-launch stack (physical sanity)', () => {
    const last = s.states.at(-1)!;
    expect(last.lossGravityKms).toBeGreaterThan(last.lossDragKms);
  });
});

describe('ascentToOrbit — dvRequired uses target alt + rotation credit (M2)', () => {
  const s = integrateAscent(FALCON9);
  const plan = ascentToOrbit(FALCON9);

  it('exposes a positive launch-site rotation credit (< equatorial 0.465 km/s)', () => {
    expect(s.siteRotationCreditKms).toBeGreaterThan(0.2);
    expect(s.siteRotationCreditKms).toBeLessThan(0.465);
  });

  it('dvRequired = circular(target alt) + losses − rotation credit', () => {
    const targetAltM = FALCON9.targetOrbitAltM ?? GUIDANCE.targetAltM;
    const totalLoss = plan.losses.gravityKms + plan.losses.dragKms + plan.losses.steeringKms;
    const expected = circularSpeed(targetAltM) / 1000 + totalLoss - s.siteRotationCreditKms;
    expect(plan.dvRequiredKms).toBeCloseTo(expected, 6);
    // The credit genuinely lowers what the rocket must supply.
    expect(plan.dvRequiredKms).toBeLessThan(circularSpeed(targetAltM) / 1000 + totalLoss);
  });

  it('payloadMargin is exactly idealDv − dvRequired', () => {
    expect(plan.payloadMarginKms).toBeCloseTo(plan.idealDvKms - plan.dvRequiredKms, 9);
  });
});

describe('stackIdealDv — parallel boosters not double-counted (M4)', () => {
  const boosted: LaunchProfile = {
    ...FALCON9,
    boosters: {
      name: 'test strap-ons',
      count: 2,
      wetKg: 45_000,
      dryKg: 4_500,
      thrustSlKN: 1_400,
      thrustVacKN: 1_550,
      ispSlS: 260,
      ispVacS: 285,
    },
  };

  it('boosters raise idealDv but by LESS than summing their solo burn (no double-count)', () => {
    const coreDv = stackIdealDv(FALCON9);
    const boostedDv = stackIdealDv(boosted);
    expect(boostedDv).toBeGreaterThan(coreDv); // strap-ons add real capability

    // The old bug summed the core's FULL solo Δv + the boosters' solo Δv, which
    // overcounts the parallel phase (the core actually burns against the heavier
    // stack while the boosters fire). The combined-burn model must come in under it.
    const b = combinedBoosterStage(boosted.boosters!);
    const fullStack =
      boosted.payloadKg +
      (boosted.fairingKg ?? 0) +
      boosted.stages.reduce((m, st) => m + st.wetKg, 0) +
      b.wetKg;
    const overcount = coreDv + tsiolkovskyDv(b.ispVacS, fullStack, fullStack - stagePropellant(b));
    expect(boostedDv).toBeLessThan(overcount);
  });
});
