import { describe, it, expect } from 'vitest';
import {
  bodyAirDensity,
  bodyGravity,
  dynamicPressure,
  integrateDescent,
  machNumber,
  sampleDescentAt,
  type DescentProfile,
} from './descent-physics';
import { SURFACE_DENSITY_KGM3 } from './descent-physics-constants';
import { expandDescentProfile, type RawDescentProfile } from './descent-profile-registry';
import { expectCloseTo, expectInRange } from '../../test-helpers/expect-close';

// ─── Archetype test profiles (one per EDL class) ────────────────────

const MOON_POWERED: DescentProfile = {
  siteId: 'test-apollo',
  missionId: 'test-apollo',
  body: 'moon',
  landingSite: { lat: 0, lon: 23.5 },
  entryState: { altitudeM: 2500, velocityMs: 150, flightPathAngleDeg: 60 },
  entryMassKg: 7000,
  entryCdA: 0, // vacuum — drag irrelevant
  retroPropellantKg: 8000,
  phases: [
    {
      kind: 'powered_retro',
      endTrigger: { type: 'ground', value: 0 },
      ispS: 311,
      events: ['retro_ignition'],
    },
  ],
  source_tier: 'flagship',
};

const MARS_SKYCRANE: DescentProfile = {
  siteId: 'test-curiosity',
  missionId: 'test-curiosity',
  body: 'mars',
  landingSite: { lat: -4.59, lon: 137.44 },
  // flightPathAngleDeg is the effective descent (collapse) angle — tuned so the
  // 1-DOF speed-bleed + timeline match the published EDL (Mach ~2 at chute
  // deploy, ~6-min entry-to-touchdown), NOT the inertial entry FPA.
  entryState: { altitudeM: 125_000, velocityMs: 5800, flightPathAngleDeg: 7.5 },
  entryMassKg: 3300,
  entryCdA: 24,
  retroPropellantKg: 450,
  phases: [
    { kind: 'ballistic_entry', endTrigger: { type: 'altitude_m', value: 11_000 } },
    {
      kind: 'parachute',
      endTrigger: { type: 'altitude_m', value: 1800 },
      cdA: 200,
      jettisonKg: 380,
      events: ['parachute_deploy', 'heatshield_sep'],
    },
    {
      kind: 'powered_retro',
      endTrigger: { type: 'altitude_m', value: 21 },
      ispS: 225,
      jettisonKg: 630,
      events: ['backshell_sep', 'retro_ignition'],
    },
    {
      kind: 'skycrane',
      endTrigger: { type: 'ground', value: 0 },
      ispS: 225,
      terminalVelocityMs: 0.75,
      events: ['skycrane_lower'],
    },
  ],
  source_tier: 'flagship',
};

const MARS_AIRBAG: DescentProfile = {
  siteId: 'test-pathfinder',
  missionId: 'test-pathfinder',
  body: 'mars',
  landingSite: { lat: 19.13, lon: -33.22 },
  entryState: { altitudeM: 125_000, velocityMs: 7600, flightPathAngleDeg: 7 },
  entryMassKg: 585,
  entryCdA: 8,
  retroPropellantKg: 40,
  survivableTouchdownMs: 25,
  phases: [
    { kind: 'ballistic_entry', endTrigger: { type: 'altitude_m', value: 9000 } },
    {
      kind: 'parachute',
      endTrigger: { type: 'altitude_m', value: 300 },
      cdA: 60,
      jettisonKg: 90,
      events: ['parachute_deploy', 'heatshield_sep'],
    },
    {
      kind: 'powered_retro',
      endTrigger: { type: 'altitude_m', value: 15 },
      ispS: 200,
      terminalVelocityMs: 12,
      events: ['retro_ignition'],
    },
    { kind: 'airbag_bounce', endTrigger: { type: 'ground', value: 0 }, events: ['airbag_deploy'] },
  ],
  source_tier: 'flagship',
};

const VENUS_AEROSHELL: DescentProfile = {
  siteId: 'test-venera',
  missionId: 'test-venera',
  body: 'venus',
  landingSite: { lat: 7.5, lon: 303 },
  // Venus enters STEEPLY — its dense atmosphere brakes even a 65° dive to a
  // ~160-g peak, then the lander drifts ~50 min to the surface (Venera-13).
  entryState: { altitudeM: 130_000, velocityMs: 10_700, flightPathAngleDeg: 65 },
  entryMassKg: 1650,
  entryCdA: 1.6,
  survivableTouchdownMs: 15,
  phases: [
    { kind: 'ballistic_entry', endTrigger: { type: 'altitude_m', value: 62_000 } },
    {
      kind: 'parachute',
      endTrigger: { type: 'altitude_m', value: 47_000 },
      cdA: 24,
      events: ['parachute_deploy'],
    },
    {
      kind: 'aeroshell_descent',
      endTrigger: { type: 'ground', value: 0 },
      cdA: 3.2,
      jettisonKg: 200,
      events: ['heatshield_sep'],
    },
  ],
  source_tier: 'flagship',
};

// Schiaparelli-class crash: retro cuts out, the lander free-falls to impact.
const MARS_CRASH: DescentProfile = {
  siteId: 'test-schiaparelli',
  missionId: 'test-schiaparelli',
  body: 'mars',
  landingSite: { lat: -1.95, lon: 6.21 },
  entryState: { altitudeM: 122_000, velocityMs: 5800, flightPathAngleDeg: 7 },
  entryMassKg: 577,
  entryCdA: 6,
  survivableTouchdownMs: 3,
  phases: [
    { kind: 'ballistic_entry', endTrigger: { type: 'altitude_m', value: 11_000 } },
    {
      kind: 'parachute',
      endTrigger: { type: 'altitude_m', value: 3700 },
      cdA: 50,
      events: ['parachute_deploy'],
    },
    { kind: 'coast', endTrigger: { type: 'ground', value: 0 } }, // retro failed → free-fall
  ],
  source_tier: 'flagship',
};

// ─── Per-body atmosphere + gravity ──────────────────────────────────

describe('per-body atmosphere + gravity', () => {
  it('surface gravity matches μ/R² for each body', () => {
    expectCloseTo(bodyGravity(0, 'moon'), 1.625, 0.01, 'g Moon');
    expectCloseTo(bodyGravity(0, 'mars'), 3.728, 0.01, 'g Mars');
    expectCloseTo(bodyGravity(0, 'venus'), 8.87, 0.02, 'g Venus');
  });

  it('the Moon is a vacuum — zero drag at any altitude', () => {
    expect(bodyAirDensity(0, 'moon')).toBe(0);
    expect(bodyAirDensity(50_000, 'moon')).toBe(0);
  });

  it('surface density matches the constants', () => {
    expectCloseTo(bodyAirDensity(0, 'mars'), SURFACE_DENSITY_KGM3.mars, 1e-6, 'ρ₀ Mars');
    expectCloseTo(bodyAirDensity(0, 'venus'), SURFACE_DENSITY_KGM3.venus, 1e-6, 'ρ₀ Venus');
  });

  it('Mars density falls by 1/e over one scale height (11 km)', () => {
    expectCloseTo(
      bodyAirDensity(11_000, 'mars'),
      SURFACE_DENSITY_KGM3.mars / Math.E,
      1e-6,
      'ρ Mars @ H',
    );
  });

  it('Mach uses per-body sound speed; vacuum reads 0', () => {
    expectCloseTo(machNumber(480, 'mars'), 2.0, 0.01, 'Mach 2 on Mars');
    expect(machNumber(1000, 'moon')).toBe(0);
  });

  it('dynamic pressure q = ½ρv²', () => {
    expectCloseTo(dynamicPressure(65, 8), 2080, 1e-6, 'q');
  });
});

// ─── Soft landings (one per EDL archetype) ──────────────────────────

describe('EDL archetypes land soft', () => {
  it('Moon powered descent touches down under the survivable limit', () => {
    const s = integrateDescent(MOON_POWERED);
    expect(s.touchdownSuccess).toBe(true);
    expect(s.touchdownVelocityMs).toBeLessThan(3);
    expect(s.states.at(-1)!.altM).toBe(0);
  });

  it('Mars skycrane touches down soft (< 1 m/s)', () => {
    const s = integrateDescent(MARS_SKYCRANE);
    expect(s.touchdownSuccess).toBe(true);
    expect(s.touchdownVelocityMs).toBeLessThan(1.5);
    // Mars entry peaks in the g band it's famous for (loose, uncalibrated).
    expectInRange(s.peakDecel.g, 3, 20, 'Mars skycrane peak decel (g)');
  });

  it('Mars airbag arrives within airbag-survivable speed', () => {
    const s = integrateDescent(MARS_AIRBAG);
    expect(s.touchdownSuccess).toBe(true);
    expectInRange(s.touchdownVelocityMs, 5, 25, 'airbag impact speed');
  });

  it('Venus aeroshell survives, far harsher entry + far longer descent than Mars', () => {
    const venus = integrateDescent(VENUS_AEROSHELL);
    const mars = integrateDescent(MARS_SKYCRANE);
    expect(venus.touchdownSuccess).toBe(true);
    expect(venus.peakDecel.g).toBeGreaterThan(mars.peakDecel.g);
    expect(venus.peakDecel.g).toBeGreaterThan(50);
    expect(venus.totalDurationS).toBeGreaterThan(mars.totalDurationS);
  });
});

// ─── Earth-orbit capsule re-entry (Tier-1, EARTH_CAPSULE_REENTRY) ─────

const EARTH_ORBITAL: RawDescentProfile = {
  missionId: 'test-friendship7',
  siteId: 'test-atlantic-splashdown',
  body: 'earth',
  landingSite: { lat: 21.35, lon: -68.65 },
  // Orbital re-entry: entry interface ~122 km at ~7.8 km/s, shallow effective
  // corridor angle (1-DOF collapse angle, tuned — not the literal inertial FPA).
  entryState: { altitudeM: 122_000, velocityMs: 7800, flightPathAngleDeg: 3 },
  entryMassKg: 1350, // Mercury capsule re-entry mass
  entryCdA: 3, // blunt ~1.9 m heat-shield face
  archetype: 'EARTH_CAPSULE_REENTRY',
  params: { chuteDeployAltM: 8000, terminalHandoffAltM: 3000, parachuteCdA: 30, terminalCdA: 440 },
  source_tier: 'flagship',
};

const EARTH_SUBORBITAL: RawDescentProfile = {
  ...EARTH_ORBITAL,
  missionId: 'test-freedom7',
  // Suborbital hop: lower, steeper — same capsule + chutes, different entry state.
  entryState: { altitudeM: 90_000, velocityMs: 2300, flightPathAngleDeg: 30 },
};

const EARTH_CHUTE_FAIL: RawDescentProfile = {
  ...EARTH_ORBITAL,
  missionId: 'test-soyuz1',
  // Main canopies fouled (Soyuz 1) — only a drogue-sized Cd·A survives → hard impact.
  params: { ...EARTH_ORBITAL.params, terminalCdA: 18 },
};

describe('Earth capsule re-entry lands soft', () => {
  it('orbital re-entry rides the heat shield + chutes to a survivable splashdown', () => {
    const s = integrateDescent(expandDescentProfile(EARTH_ORBITAL));
    expect(s.touchdownSuccess).toBe(true);
    expect(s.touchdownVelocityMs).toBeLessThan(10);
    // Manned entry g-band (loose, uncalibrated) — the peak is the main-canopy
    // opening shock; well under a Venus aeroshell's ~100 g. See E2 for per-mission
    // tuning of the corridor angle + chute Cd·A toward the published ~8 g histories.
    expectInRange(s.peakDecel.g, 3, 16, 'Earth orbital re-entry peak decel (g)');
  });

  it('orbital entry heats far harder than the suborbital hop (heat ∝ v³)', () => {
    const sub = integrateDescent(expandDescentProfile(EARTH_SUBORBITAL));
    const orb = integrateDescent(expandDescentProfile(EARTH_ORBITAL));
    expect(sub.touchdownSuccess).toBe(true);
    expect(sub.touchdownVelocityMs).toBeLessThan(10);
    // A 7.8 km/s orbital entry sheds vastly more energy as heat than a 2.3 km/s hop.
    expect(orb.peakHeat.flux).toBeGreaterThan(sub.peakHeat.flux * 3);
  });
});

// ─── Honest crash ────────────────────────────────────────────────────

describe('crash landings read as failures', () => {
  it('a retro-failure free-fall impacts hard → touchdownSuccess false', () => {
    const s = integrateDescent(MARS_CRASH);
    expect(s.touchdownSuccess).toBe(false);
    expect(s.touchdownVelocityMs).toBeGreaterThan(20);
  });

  it('a fouled main canopy (Soyuz 1) busts the survivable limit → crash', () => {
    const s = integrateDescent(expandDescentProfile(EARTH_CHUTE_FAIL));
    expect(s.touchdownSuccess).toBe(false);
    expect(s.touchdownVelocityMs).toBeGreaterThan(15);
  });
});

// ─── Event sequencing ────────────────────────────────────────────────

describe('EDL beats fire in order', () => {
  it('skycrane sequence: entry → parachute → retro → skycrane → touchdown', () => {
    const { events } = integrateDescent(MARS_SKYCRANE);
    const at = (type: string) => events.find((e) => e.type === type)?.t ?? -1;
    expect(events[0].type).toBe('entry');
    expect(events.at(-1)!.type).toBe('touchdown');
    expect(at('parachute_deploy')).toBeGreaterThan(at('entry'));
    expect(at('retro_ignition')).toBeGreaterThan(at('parachute_deploy'));
    expect(at('skycrane_lower')).toBeGreaterThan(at('retro_ignition'));
    expect(at('touchdown')).toBeGreaterThan(at('skycrane_lower'));
    // peak beats are present and within the flight.
    expect(at('peak_decel')).toBeGreaterThanOrEqual(0);
    expect(at('peak_heat')).toBeGreaterThanOrEqual(0);
  });
});

// ─── Interpolation ───────────────────────────────────────────────────

describe('sampleDescentAt', () => {
  it('clamps outside the sampled range and interpolates within', () => {
    const s = integrateDescent(MARS_SKYCRANE);
    const first = s.states[0];
    const last = s.states.at(-1)!;
    expect(sampleDescentAt(s.states, -10).t).toBe(first.t);
    expect(sampleDescentAt(s.states, 1e9).altM).toBe(last.altM);
    const mid = sampleDescentAt(s.states, s.totalDurationS / 2);
    expectInRange(mid.altKm, 0, first.altKm, 'mid-flight altitude within range');
  });

  it('throws on an empty trajectory', () => {
    expect(() => sampleDescentAt([], 0)).toThrow();
  });
});

// ─── Guided range-control entry (#29 · ADR-088) ──────────────────────

describe('range-control entry guidance', () => {
  const RAW_CAPSULE: RawDescentProfile = {
    missionId: 'test-capsule',
    siteId: 'test',
    body: 'earth',
    landingSite: { lat: 0, lon: 0 },
    entryState: { altitudeM: 122_000, velocityMs: 7820, flightPathAngleDeg: 4 },
    entryMassKg: 5560,
    entryCdA: 6,
    liftToDragRatio: 0.3,
    archetype: 'EARTH_CAPSULE_REENTRY',
    params: {
      chuteDeployAltM: 7300,
      terminalHandoffAltM: 3000,
      parachuteCdA: 367,
      terminalCdA: 1392,
    },
    source_tier: 'flagship',
  };
  const capsule = expandDescentProfile(RAW_CAPSULE);

  it('downrange is monotone in the entry bank (lift-up flies farther)', () => {
    const short = integrateDescent(capsule, { entryBankCos: -1 }).landingDownrangeKm;
    const mid = integrateDescent(capsule, { entryBankCos: 0 }).landingDownrangeKm;
    const long = integrateDescent(capsule, { entryBankCos: 1 }).landingDownrangeKm;
    expect(short).toBeLessThan(mid);
    expect(mid).toBeLessThan(long);
  });

  it('the shortest-range (lift-down) entry pulls the highest peak-g', () => {
    const down = integrateDescent(capsule, { entryBankCos: -1 }).peakDecel.g;
    const up = integrateDescent(capsule, { entryBankCos: 1 }).peakDecel.g;
    expect(down).toBeGreaterThan(up); // range traded against deceleration
  });

  it('the computer solves the bank to hit a reachable target downrange', () => {
    for (const target of [1400, 1600, 1800]) {
      const s = integrateDescent({ ...capsule, targetDownrangeKm: target });
      expect(s.guidance?.targetReachable).toBe(true);
      expectInRange(s.landingDownrangeKm, target - 25, target + 25, `guided to ${target} km`);
      expect(s.guidance!.entryBankCos).toBeGreaterThanOrEqual(-1);
      expect(s.guidance!.entryBankCos).toBeLessThanOrEqual(1);
    }
  });

  it('flags an out-of-footprint target and clamps to the reachable edge', () => {
    const s = integrateDescent({ ...capsule, targetDownrangeKm: 5000 });
    expect(s.guidance?.targetReachable).toBe(false);
    expect(s.landingDownrangeKm).toBeLessThan(5000); // clamped to full-lift-up max
    expect(s.touchdownSuccess).toBe(true); // still a real, survivable entry
  });
});
