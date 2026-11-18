import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  boosterThrustMultiplier,
  integrateAscent,
  mecoTargetState,
  stackIdealDv,
  stageThrustN,
  throttleLevel,
  type LaunchBoosters,
  type LaunchProfile,
  type LaunchStage,
} from './ascent-physics';

/**
 * Booster thrust-time curves (impulse gates) and stage throttle commands (backlog F2 / F6):
 * the Shuttle RSRM's impulse gates and the main engines' throttle bucket and 3 g limit from
 * the STS-68 mission report, the H-IIA SRB-A's published burn time, the Falcon Heavy throttle.
 */
const load = (id: string): LaunchProfile =>
  JSON.parse(
    readFileSync(resolve(__dirname, `../../../../static/data/launch-profiles/${id}.json`), 'utf-8'),
  ) as LaunchProfile;

const G0 = 9.80665;

// A vacuum-like booster (sea-level = vacuum) so thrust and mass flow do not vary with altitude.
const booster: LaunchBoosters = {
  name: 'test SRM',
  count: 2,
  wetKg: 500_000,
  dryKg: 100_000,
  thrustSlKN: 10_000,
  thrustVacKN: 10_000,
  ispSlS: 260,
  ispVacS: 260,
  impulseGates: [
    { t: 20, fraction: 0.25 },
    { t: 60, fraction: 0.6 },
    { t: 120, fraction: 1 },
  ],
};
const prop = booster.wetKg - booster.dryKg;
const mdotRated = (booster.thrustVacKN! * 1000) / (booster.ispVacS! * G0);

describe('throttleLevel', () => {
  const stage: LaunchStage = {
    name: 'core',
    wetKg: 1,
    dryKg: 0,
    thrustVacKN: 1,
    ispVacS: 1,
    throttle: [
      { t: 3.8, level: 1.04 },
      { t: 27.3, level: 0.67 },
      { t: 60.4, level: 1.04 },
    ],
  };
  it('is 100 % before the first command and holds each command until the next', () => {
    expect(throttleLevel(stage, 0)).toBe(1);
    expect(throttleLevel(stage, 3.79)).toBe(1);
    expect(throttleLevel(stage, 3.8)).toBe(1.04);
    expect(throttleLevel(stage, 40)).toBe(0.67);
    expect(throttleLevel(stage, 60.4)).toBe(1.04);
    expect(throttleLevel(stage, 500)).toBe(1.04);
  });
  it('is 100 % for a stage with no commands', () => {
    expect(throttleLevel({ ...stage, throttle: undefined }, 100)).toBe(1);
  });
});

describe('boosterThrustMultiplier — impulse gates', () => {
  it('is 1 without gates', () => {
    expect(boosterThrustMultiplier({ ...booster, impulseGates: undefined }, prop, 50)).toBe(1);
  });
  it('gives each segment the mass flow that spends its share of the propellant', () => {
    const seg = (df: number, dt: number) => (df * prop) / dt / mdotRated;
    expect(boosterThrustMultiplier(booster, prop, 0)).toBeCloseTo(seg(0.25, 20), 12);
    expect(boosterThrustMultiplier(booster, prop, 19.99)).toBeCloseTo(seg(0.25, 20), 12);
    expect(boosterThrustMultiplier(booster, prop, 20)).toBeCloseTo(seg(0.35, 40), 12);
    expect(boosterThrustMultiplier(booster, prop, 100)).toBeCloseTo(seg(0.4, 60), 12);
    expect(boosterThrustMultiplier(booster, prop, 130)).toBeCloseTo(seg(0.4, 60), 12);
  });
  it('spends exactly the propellant by the last gate (impulse is conserved)', () => {
    let spent = 0;
    const dt = 0.01;
    for (let t = 0; t < 120 - dt / 2; t += dt) {
      spent += boosterThrustMultiplier(booster, prop, t) * mdotRated * dt;
    }
    expect(spent / prop).toBeCloseTo(1, 4);
  });
});

describe('integrateAscent with impulse gates and throttle commands', () => {
  const stack = (extra: Partial<LaunchProfile> = {}): LaunchProfile => ({
    id: 'test',
    name: 'test',
    payloadKg: 10_000,
    fairingKg: 0,
    refAreaM2: 20,
    cd: 0.3,
    launchSite: { lat: 28.5, lon: -80.6, name: 'pad' },
    boosters: booster,
    stages: [
      {
        name: 'core',
        wetKg: 700_000,
        dryKg: 30_000,
        thrustSlKN: 5_000,
        thrustVacKN: 5_000,
        ispSlS: 450,
        ispVacS: 450,
      },
      { name: 'upper', wetKg: 30_000, dryKg: 5_000, thrustVacKN: 300, ispVacS: 450 },
    ],
    pitchProgram: [
      [0, 90],
      [20, 85],
      [120, 50],
      [300, 15],
    ],
    ...extra,
  });

  it('booster propellant left at each gate matches its published share', () => {
    const s = integrateAscent(stack());
    const at = (t: number) =>
      s.states.reduce((b, x) => (Math.abs(x.t - t) < Math.abs(b.t - t) ? x : b));
    const total = 2 * prop;
    expect(at(20).boosterPropRemainingKg / total).toBeCloseTo(0.75, 2);
    expect(at(60).boosterPropRemainingKg / total).toBeCloseTo(0.4, 2);
  });

  it('the boosters burn out and separate at the last gate', () => {
    const s = integrateAscent(stack());
    const sep = s.events.find((e) => e.type === 'staging')!;
    expect(sep.t).toBeGreaterThan(119.9);
    expect(sep.t).toBeLessThan(120.2);
  });

  it('the boost-phase thrust follows the gates (high at liftoff, lower after 60 s)', () => {
    const s = integrateAscent(stack());
    const at = (t: number) => s.states.find((x) => x.t >= t)!;
    const boost = (t: number) => at(t).thrustN - 5_000_000; // core at 100 %, vacuum = sea level
    expect(boost(10) / (2 * 10_000_000)).toBeCloseTo(boosterThrustMultiplier(booster, prop, 10), 3);
    expect(boost(90) / (2 * 10_000_000)).toBeCloseTo(boosterThrustMultiplier(booster, prop, 90), 3);
  });

  it('the core follows its throttle commands', () => {
    const p = stack();
    p.stages[0] = {
      ...p.stages[0],
      throttle: [
        { t: 30, level: 0.6 },
        { t: 70, level: 1 },
      ],
    };
    const s = integrateAscent(p);
    const at = (t: number) => s.states.find((x) => x.t >= t)!;
    const core = (t: number) =>
      at(t).thrustN - 2 * 10_000_000 * boosterThrustMultiplier(booster, prop, at(t).t);
    // Off the 20 s and 60 s gate boundaries: a sampled state carries the previous step's thrust.
    expect(core(10) / 5_000_000).toBeCloseTo(1, 3);
    expect(core(45) / 5_000_000).toBeCloseTo(0.6, 3);
    expect(core(100) / 5_000_000).toBeCloseTo(1, 3);
  });

  it('the acceleration limit throttles the core down to hold it, never below its floor', () => {
    const p = stack();
    p.stages[0] = { ...p.stages[0], maxAccelG: 2, minThrottle: 0.5 };
    const s = integrateAscent(p);
    const core = s.states.filter((x) => x.stageIndex === 0 && x.thrustN > 0 && x.t > 125);
    expect(core.length).toBeGreaterThan(10);
    for (const x of core) {
      const a = x.thrustN / x.massKg / G0;
      const floor = (0.5 * stageThrustN(p.stages[0], x.altKm * 1000)) / x.massKg / G0;
      // The cap uses the mass at the start of each 0.05 s step; a sample divides that step's
      // thrust by the mass at its end, so it reads up to mdot*dt/m (about 2e-4) high.
      expect(a).toBeLessThanOrEqual(Math.max(2, floor) * 1.001);
    }
    // It did engage: some sample sits on the 2 g line.
    expect(core.some((x) => Math.abs(x.thrustN / x.massKg / G0 - 2) < 1e-3)).toBe(true);
  });

  it('the throttle floor holds when the limit would need less (thrust never below the floor)', () => {
    const p = stack();
    p.stages[0] = { ...p.stages[0], maxAccelG: 1.2, minThrottle: 0.9 };
    const s = integrateAscent(p);
    const core = s.states.filter((x) => x.stageIndex === 0 && x.thrustN > 0 && x.t > 125);
    expect(core.length).toBeGreaterThan(10);
    for (const x of core) {
      expect(x.thrustN).toBeGreaterThanOrEqual(0.9 * 5_000_000 - 1);
    }
    // ...so the vehicle runs above the limit once the floor binds.
    expect(core.some((x) => x.thrustN / x.massKg / G0 > 1.25)).toBe(true);
  });

  it('an air-lit group times its gates from its own ignition, not from liftoff', () => {
    const p = stack({
      boosters: { ...booster, count: 4, airLitCount: 2, airLitIgnitionS: 30 },
    });
    const s = integrateAscent(p);
    const seps = s.events.filter((e) => e.type === 'staging').map((e) => e.t);
    // Ground-lit pair burns out at its last gate (120 s), the air-lit pair 120 s after T+30.
    expect(seps[0]).toBeGreaterThan(119.9);
    expect(seps[0]).toBeLessThan(120.2);
    expect(seps[1]).toBeGreaterThan(149.9);
    expect(seps[1]).toBeLessThan(150.2);
  });

  it('without gates the boosters burn at their rated mass flow (burnout at prop / mdot)', () => {
    const plain = stack({ boosters: { ...booster, impulseGates: undefined } });
    const sep = integrateAscent(plain).events.find((e) => e.type === 'staging')!;
    expect(sep.t).toBeCloseTo(prop / mdotRated, 0);
  });

  it('a motor whose sea-level and vacuum mass flows differ still burns out on its last gate', () => {
    // H-IIA SRB-A-like: 2,260 kN / 265 s at sea level, 2,520 kN / 284 s in vacuum (flows 4 %
    // apart). The gates fix the mass flow, so burnout is the last gate wherever the motor flies.
    const p = stack({
      boosters: { ...booster, thrustSlKN: 9_000, thrustVacKN: 10_000, ispSlS: 240, ispVacS: 260 },
    });
    const sep = integrateAscent(p).events.find((e) => e.type === 'staging')!;
    expect(sep.t).toBeGreaterThan(119.9);
    expect(sep.t).toBeLessThan(120.2);
  });

  it('the ideal Δv counts the core at its commanded throttle beside the boosters', () => {
    const plain = stack();
    const throttled = stack();
    throttled.stages[0] = {
      ...throttled.stages[0],
      throttle: [
        { t: 0, level: 0.5 },
        { t: 120, level: 1 },
      ],
    };
    // Less core propellant burnt inside the boost phase leaves more for after it: a different,
    // larger capacity, and equal to the plain stack when the throttle is 100 %.
    expect(stackIdealDv(throttled)).toBeGreaterThan(stackIdealDv(plain));
    const full = stack();
    full.stages[0] = { ...full.stages[0], throttle: [{ t: 0, level: 1 }] };
    expect(stackIdealDv(full)).toBeCloseTo(stackIdealDv(plain), 6);
  });
});

describe('the sourced profiles (STS-68, H-IIA 202, Falcon Heavy / Europa Clipper)', () => {
  it('Shuttle: the main engines throttle to 67 % through max-Q and hold 3 g before MECO', () => {
    const p = load('space-shuttle-stack');
    const s = integrateAscent(p);
    const at = (t: number) => s.states.find((x) => x.t >= t)!;
    // The integrated thrust drops by about 37 % of the SSMEs' rating across the 27.3 s
    // throttle-down (the RSRM gate segment 20-60 s holds the SRBs' flow constant across it) and
    // rises by the same across 60.4 s.
    const rated = (t: number) => stageThrustN(p.stages[0], at(t).altKm * 1000);
    const down = (at(27).thrustN - at(28).thrustN) / rated(28);
    expect(down).toBeGreaterThan(0.3);
    expect(down).toBeLessThan(0.45);
    const fine = integrateAscent(p, { sampleDtS: 0.1 });
    const atFine = (t: number) => fine.states.find((x) => x.t >= t)!;
    // 60.3 and 60.5 s both sit in the RSRM's last gate segment (from 60 s), either side of 60.4 s.
    const up = (atFine(60.5).thrustN - atFine(60.3).thrustN) / rated(60.5);
    expect(up).toBeGreaterThan(0.25);
    // Between the 3 g onset and the 67 % floor the vehicle holds 3 g.
    const held = s.states.filter((x) => x.stageIndex === 0 && x.t > 460 && x.t < 505);
    expect(held.length).toBeGreaterThan(20);
    for (const x of held) expect(x.thrustN / x.massKg / G0).toBeCloseTo(3, 2);
    // 3 g engages within 10 s of STS-68's 450.2 s.
    const first3g = s.states.find(
      (x) => x.stageIndex === 0 && x.t > 200 && x.thrustN / x.massKg / G0 >= 2.999,
    )!;
    expect(Math.abs(first3g.t - 450.2)).toBeLessThan(10);
  });

  it('Shuttle: the RSRM impulse gates come from the report and burn out at its action time', () => {
    const b = load('space-shuttle-stack').boosters!;
    expect(b.impulseGates!.at(-1)).toEqual({ t: 120.55, fraction: 1 });
    const s = integrateAscent(load('space-shuttle-stack'));
    const sep = s.events.find((e) => e.type === 'staging')!;
    expect(Math.abs(sep.t - 123.4)).toBeLessThan(1); // STS-68 separation command 123.4 s
  });

  it('mecoTargetState reproduces NASA TD0358A Table 3-1 (direct insertion: 160 x 35 nmi at 360 kft)', () => {
    const nmi = 1852;
    const ft = 0.3048;
    const st = mecoTargetState({
      altM: 360_000 * ft,
      apogeeAltM: 160 * nmi,
      perigeeAltM: 35 * nmi,
    });
    // Table: 25,871 ft/s, 0.792 deg (computed 25,869 ft/s, 0.801 deg). The model's sphere
    // (R 6,371 km) is not the table's Earth.
    expect(st.speed / ft).toBeGreaterThan(25_871 * 0.995);
    expect(st.speed / ft).toBeLessThan(25_871 * 1.005);
    expect(Math.abs((Math.atan2(st.vr, st.vh) * 180) / Math.PI - 0.792)).toBeLessThan(0.02);
    // Standard insertion, 85 x 0 nmi: 25,725 ft/s, 0.675 deg.
    const std = mecoTargetState({ altM: 360_000 * ft, apogeeAltM: 85 * nmi, perigeeAltM: 0 });
    expect(std.speed / ft).toBeGreaterThan(25_725 * 0.995);
    expect(std.speed / ft).toBeLessThan(25_725 * 1.005);
  });

  it('Shuttle direct insertion: MECO short of orbit with propellant left, one OMS-2 burn to circular', () => {
    const p = load('space-shuttle-stack');
    const s = integrateAscent(p, { sampleDtS: 0.5 });
    const meco = s.events.find((e) => e.type === 'meco')!;
    expect(Math.abs(meco.t - 514)).toBeLessThan(10); // STS-68 MECO 513.4 s
    const atMeco = s.states.find((x) => x.t >= meco.t + 1)!;
    expect(atMeco.stageIndex).toBe(0); // the tank is still on (separates 18 s later)
    expect(atMeco.propRemainingKg).toBeGreaterThan(1000); // a residual, not depletion
    expect(atMeco.altKm).toBeGreaterThan(100);
    expect(atMeco.altKm).toBeLessThan(120); // 360,000 ft
    // The orbiter burns once: a single run of lit samples, about 98 s long (STS-68).
    const lit = s.states.filter((x) => x.stageIndex === 1 && x.thrustN > 0);
    expect(lit.length).toBeGreaterThan(0);
    const span = lit.at(-1)!.t - lit[0].t;
    expect(lit.length).toBeGreaterThan(span / 0.5 - 2); // no gap inside the burn
    expect(Math.abs(span - 98)).toBeLessThan(10);
    // Δv about 48.8 m/s and a circular orbit at the end.
    const before = s.states.filter((x) => x.t < lit[0].t).at(-1)!;
    const after = s.states.find((x) => x.t > lit.at(-1)!.t + 1)!;
    expect(Math.abs((after.speedKms - before.speedKms) * 1000 - 48.8)).toBeLessThan(5);
    expect(s.reachedOrbit).toBe(true);
    expect(Math.abs(after.velUpKms)).toBeLessThan(0.01);
  });

  it('every changed profile still reaches orbit', () => {
    for (const id of ['space-shuttle-stack', 'h-iia', 'falcon-heavy']) {
      expect(integrateAscent(load(id)).reachedOrbit, id).toBe(true);
    }
  });
});

describe('the vehicle after SECO keeps its spent final stage', () => {
  it('post-SECO mass is the payload plus the final stage dry mass and residual', () => {
    const p = load('falcon-9');
    const s = integrateAscent(p);
    const last = s.states.at(-1)!;
    expect(last.stageIndex).toBe(-1);
    expect(last.massKg).toBeGreaterThanOrEqual(p.payloadKg + p.stages.at(-1)!.dryKg);
  });

  it('a profile with no payload integrates to a finite end (no zero-mass coast)', () => {
    const s = integrateAscent({ ...load('space-shuttle-stack'), payloadKg: 0 });
    const last = s.states.at(-1)!;
    expect(Number.isFinite(last.speedKms)).toBe(true);
    expect(last.altKm).toBeGreaterThan(200);
    expect(s.reachedOrbit).toBe(true);
  });
});

describe('H-IIA 202 capacity with the real SRB-A burn', () => {
  it('still puts 8 t into orbit (about 10 t to LEO quoted; the old pitch program managed 4.6 t)', () => {
    expect(integrateAscent({ ...load('h-iia'), payloadKg: 8000 }).reachedOrbit).toBe(true);
  });
});
