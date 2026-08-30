/**
 * Descent HUD vocabulary (RFC-034 §9) — guards label maps, buildDescentBeats,
 * descentStatus, and formatDescentAltitude across all branch thresholds.
 */
import { describe, it, expect } from 'vitest';
import {
  EDL_PHASE_LABEL,
  EDL_BEAT_LABEL,
  buildDescentBeats,
  descentStatus,
  formatDescentAltitude,
} from './descent-hud';
import {
  integrateDescent,
  type DescentProfile,
  type DescentState,
} from '$lib/physics/descent/descent-physics';

// ─── Minimal Mars skycrane profile (same archetype as descent-physics.test.ts)

const MARS_SKYCRANE: DescentProfile = {
  siteId: 'test-curiosity-hud',
  missionId: 'test-curiosity-hud',
  body: 'mars',
  landingSite: { lat: -4.59, lon: 137.44 },
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

const MARS_SUMMARY = integrateDescent(MARS_SKYCRANE, { dtS: 0.1, sampleDtS: 1 });

// ─── Minimal Moon powered-retro profile (airless, for coverage of non-Jupiter paths)

const MOON_POWERED: DescentProfile = {
  siteId: 'test-apollo-hud',
  missionId: 'test-apollo-hud',
  body: 'moon',
  landingSite: { lat: 0, lon: 23.5 },
  entryState: { altitudeM: 2500, velocityMs: 150, flightPathAngleDeg: 60 },
  entryMassKg: 7000,
  entryCdA: 0,
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

const MOON_SUMMARY = integrateDescent(MOON_POWERED, { dtS: 0.1, sampleDtS: 1 });

// Minimal Jupiter atmospheric probe (no solid surface, ends on probe_signal_lost)
const JUPITER_PROBE: DescentProfile = {
  siteId: 'test-galileo-hud',
  missionId: 'test-galileo-hud',
  body: 'jupiter',
  landingSite: { lat: 6.57, lon: 4.46 },
  entryState: { altitudeM: 450_000, velocityMs: 47_400, flightPathAngleDeg: 8.4 },
  entryMassKg: 339,
  entryCdA: 4.1,
  phases: [
    { kind: 'ballistic_entry', endTrigger: { type: 'altitude_m', value: 50_000 } },
    {
      kind: 'aeroshell_descent',
      endTrigger: { type: 'pressure_pa', value: 2.3e6 },
      cdA: 0.8,
      events: ['parachute_deploy'],
    },
  ],
  survivableTouchdownMs: 999,
  source_tier: 'generic',
};

const JUPITER_SUMMARY = integrateDescent(JUPITER_PROBE, { dtS: 0.5, sampleDtS: 5 });

// ─── Helper: build a bare DescentState fixture

function makeState(overrides: Partial<DescentState> = {}): DescentState {
  return {
    t: 0,
    altKm: 10,
    altM: 10_000,
    velocityMs: 5000,
    velDownMs: 100,
    decelG: 0,
    massKg: 3000,
    thrustN: 0,
    dragN: 500,
    phaseIndex: 0,
    phaseKind: 'ballistic_entry',
    machNumber: 20,
    dynamicPressurePa: 1000,
    aeroHeatFlux: 1e8,
    propRemainingKg: Infinity,
    flightPathAngleDeg: 7.5,
    ...overrides,
  };
}

// ─── EDL_PHASE_LABEL ─────────────────────────────────────────────────

describe('EDL_PHASE_LABEL', () => {
  it('ballistic_entry → ENTRY', () => {
    expect(EDL_PHASE_LABEL.ballistic_entry).toBe('ENTRY');
  });
  it('parachute → PARACHUTE', () => {
    expect(EDL_PHASE_LABEL.parachute).toBe('PARACHUTE');
  });
  it('powered_retro → POWERED DESCENT', () => {
    expect(EDL_PHASE_LABEL.powered_retro).toBe('POWERED DESCENT');
  });
  it('skycrane → SKYCRANE', () => {
    expect(EDL_PHASE_LABEL.skycrane).toBe('SKYCRANE');
  });
  it('airbag_bounce → AIRBAG DESCENT', () => {
    expect(EDL_PHASE_LABEL.airbag_bounce).toBe('AIRBAG DESCENT');
  });
  it('aeroshell_descent → AEROSHELL DESCENT', () => {
    expect(EDL_PHASE_LABEL.aeroshell_descent).toBe('AEROSHELL DESCENT');
  });
  it('direct_impact → HARD DESCENT', () => {
    expect(EDL_PHASE_LABEL.direct_impact).toBe('HARD DESCENT');
  });
  it('touch_and_go_contact → TOUCH-AND-GO', () => {
    expect(EDL_PHASE_LABEL.touch_and_go_contact).toBe('TOUCH-AND-GO');
  });
  it('coast → COAST', () => {
    expect(EDL_PHASE_LABEL.coast).toBe('COAST');
  });
});

// ─── EDL_BEAT_LABEL ──────────────────────────────────────────────────

describe('EDL_BEAT_LABEL', () => {
  it('entry → ENTRY', () => expect(EDL_BEAT_LABEL.entry).toBe('ENTRY'));
  it('peak_heat → PEAK HEAT', () => expect(EDL_BEAT_LABEL.peak_heat).toBe('PEAK HEAT'));
  it('peak_decel → MAX-G', () => expect(EDL_BEAT_LABEL.peak_decel).toBe('MAX-G'));
  it('parachute_deploy → CHUTE', () => expect(EDL_BEAT_LABEL.parachute_deploy).toBe('CHUTE'));
  it('heatshield_sep → H/S SEP', () => expect(EDL_BEAT_LABEL.heatshield_sep).toBe('H/S SEP'));
  it('backshell_sep → B/S SEP', () => expect(EDL_BEAT_LABEL.backshell_sep).toBe('B/S SEP'));
  it('skycrane_lower → SKYCRANE', () => expect(EDL_BEAT_LABEL.skycrane_lower).toBe('SKYCRANE'));
  it('skycrane_flyaway → FLYAWAY', () => expect(EDL_BEAT_LABEL.skycrane_flyaway).toBe('FLYAWAY'));
  it('retro_ignition → RETRO', () => expect(EDL_BEAT_LABEL.retro_ignition).toBe('RETRO'));
  it('airbag_deploy → AIRBAG', () => expect(EDL_BEAT_LABEL.airbag_deploy).toBe('AIRBAG'));
  it('harpoon_fire → HARPOON', () => expect(EDL_BEAT_LABEL.harpoon_fire).toBe('HARPOON'));
  it('first_contact → CONTACT', () => expect(EDL_BEAT_LABEL.first_contact).toBe('CONTACT'));
  it('bounce → BOUNCE', () => expect(EDL_BEAT_LABEL.bounce).toBe('BOUNCE'));
  it('sample_collected → SAMPLE', () => expect(EDL_BEAT_LABEL.sample_collected).toBe('SAMPLE'));
  it('parachute_jettison → CHUTE SEP', () =>
    expect(EDL_BEAT_LABEL.parachute_jettison).toBe('CHUTE SEP'));
  it('probe_signal_lost → SIGNAL LOST', () =>
    expect(EDL_BEAT_LABEL.probe_signal_lost).toBe('SIGNAL LOST'));
  it('touchdown → TOUCHDOWN', () => expect(EDL_BEAT_LABEL.touchdown).toBe('TOUCHDOWN'));
});

// ─── buildDescentBeats ───────────────────────────────────────────────

describe('buildDescentBeats', () => {
  it('returns an array', () => {
    const beats = buildDescentBeats(MARS_SUMMARY);
    expect(Array.isArray(beats)).toBe(true);
  });

  it('each beat has a non-empty label and a finite t', () => {
    const beats = buildDescentBeats(MARS_SUMMARY);
    for (const b of beats) {
      expect(typeof b.label).toBe('string');
      expect(b.label.length).toBeGreaterThan(0);
      expect(Number.isFinite(b.t)).toBe(true);
    }
  });

  it('includes entry beat (always present) labelled ENTRY', () => {
    const beats = buildDescentBeats(MARS_SUMMARY);
    const entryBeat = beats.find((b) => b.label === 'ENTRY');
    expect(entryBeat).toBeDefined();
  });

  it('includes parachute_deploy beat for a Mars skycrane profile', () => {
    const beats = buildDescentBeats(MARS_SUMMARY);
    const chute = beats.find((b) => b.label === 'CHUTE');
    expect(chute).toBeDefined();
    expect(Number.isFinite(chute!.t)).toBe(true);
  });

  it('includes touchdown beat labelled TOUCHDOWN', () => {
    const beats = buildDescentBeats(MARS_SUMMARY);
    const td = beats.find((b) => b.label === 'TOUCHDOWN');
    expect(td).toBeDefined();
  });

  it('beats are in ascending time order', () => {
    const beats = buildDescentBeats(MARS_SUMMARY);
    for (let i = 1; i < beats.length; i++) {
      expect(beats[i].t).toBeGreaterThanOrEqual(beats[i - 1].t);
    }
  });

  it('airless Moon profile still produces entry + touchdown beats', () => {
    const beats = buildDescentBeats(MOON_SUMMARY);
    expect(beats.some((b) => b.label === 'ENTRY')).toBe(true);
    expect(beats.some((b) => b.label === 'TOUCHDOWN')).toBe(true);
  });
});

// ─── descentStatus ───────────────────────────────────────────────────

describe('descentStatus', () => {
  it('returns a non-empty string for a mid-entry Mars state', () => {
    const s = makeState({ altM: 50_000, phaseKind: 'ballistic_entry' });
    const label = descentStatus(s, MARS_SUMMARY);
    expect(label.length).toBeGreaterThan(0);
  });

  it('returns the phase label for altM > 0 on Mars', () => {
    const s = makeState({ altM: 10_000, phaseKind: 'parachute' });
    const label = descentStatus(s, MARS_SUMMARY);
    expect(label).toBe('PARACHUTE');
  });

  it('returns TOUCHDOWN for a successful Mars touchdown (altM ≤ 0, not asteroid)', () => {
    const final = MARS_SUMMARY.states.at(-1)!;
    const s = makeState({ altM: 0, phaseKind: final.phaseKind });
    const label = descentStatus(s, MARS_SUMMARY);
    // MARS_SKYCRANE is survivable (soft), so it should say TOUCHDOWN.
    expect(label).toBe('TOUCHDOWN');
  });

  it('returns IMPACT for an unsuccessful touchdown (altM ≤ 0, non-asteroid body)', () => {
    const failedSummary = { ...MARS_SUMMARY, touchdownSuccess: false, body: 'mars' as const };
    const s = makeState({ altM: 0, phaseKind: 'ballistic_entry' });
    expect(descentStatus(s, failedSummary)).toBe('IMPACT');
  });

  it('returns SAMPLE COLLECTED for itokawa at altM ≤ 0', () => {
    const asteroidSummary = { ...MARS_SUMMARY, body: 'itokawa' as const };
    const s = makeState({ altM: 0, phaseKind: 'touch_and_go_contact' });
    expect(descentStatus(s, asteroidSummary)).toBe('SAMPLE COLLECTED');
  });

  it('returns SAMPLE COLLECTED for ryugu at altM ≤ 0', () => {
    const asteroidSummary = { ...MARS_SUMMARY, body: 'ryugu' as const };
    const s = makeState({ altM: 0, phaseKind: 'touch_and_go_contact' });
    expect(descentStatus(s, asteroidSummary)).toBe('SAMPLE COLLECTED');
  });

  it('returns SAMPLE COLLECTED for bennu at altM ≤ 0', () => {
    const asteroidSummary = { ...MARS_SUMMARY, body: 'bennu' as const };
    const s = makeState({ altM: 0, phaseKind: 'touch_and_go_contact' });
    expect(descentStatus(s, asteroidSummary)).toBe('SAMPLE COLLECTED');
  });

  it('returns SETTLED for comet_67p touchdown when touchdownSuccess is true', () => {
    const cometSummary = { ...MARS_SUMMARY, body: 'comet_67p' as const, touchdownSuccess: true };
    const s = makeState({ altM: 0, phaseKind: 'coast' });
    expect(descentStatus(s, cometSummary)).toBe('SETTLED');
  });

  it('returns IMPACT for comet_67p touchdown when touchdownSuccess is false', () => {
    const cometSummary = { ...MARS_SUMMARY, body: 'comet_67p' as const, touchdownSuccess: false };
    const s = makeState({ altM: 0, phaseKind: 'coast' });
    expect(descentStatus(s, cometSummary)).toBe('IMPACT');
  });

  it('returns SIGNAL LOST for Jupiter at the deepest state', () => {
    const deepest = JUPITER_SUMMARY.states.at(-1)!;
    // State at the deepest altitude should trip the SIGNAL LOST branch.
    const label = descentStatus(deepest, JUPITER_SUMMARY);
    expect(label).toBe('SIGNAL LOST');
  });

  it('returns the phase label for Jupiter at high altitude (above deepest+1)', () => {
    // Use the very first state, which is at entry altitude — well above the floor.
    const first = JUPITER_SUMMARY.states[0];
    const label = descentStatus(first, JUPITER_SUMMARY);
    // First state is at entry, high in the atmosphere — should give the phase label.
    expect(label.length).toBeGreaterThan(0);
    expect(label).not.toBe('SIGNAL LOST');
  });
});

// ─── formatDescentAltitude ───────────────────────────────────────────

describe('formatDescentAltitude', () => {
  it('returns KM unit for altKm ≥ 5', () => {
    expect(formatDescentAltitude(100).unit).toBe('KM');
    expect(formatDescentAltitude(5).unit).toBe('KM');
  });

  it('formats value as integer km for large altitudes', () => {
    expect(formatDescentAltitude(100).value).toBe('100');
    expect(formatDescentAltitude(5).value).toBe('5');
  });

  it('returns M unit for altKm < 5', () => {
    expect(formatDescentAltitude(4.999).unit).toBe('M');
    expect(formatDescentAltitude(0).unit).toBe('M');
    expect(formatDescentAltitude(-1).unit).toBe('M');
  });

  it('converts km to metres for altKm < 5', () => {
    expect(formatDescentAltitude(1).value).toBe('1000');
    expect(formatDescentAltitude(0.5).value).toBe('500');
  });

  it('clamps negative altitudes to 0 m', () => {
    expect(formatDescentAltitude(-10).value).toBe('0');
  });

  it('boundary: exactly 5 km uses KM', () => {
    const r = formatDescentAltitude(5);
    expect(r.unit).toBe('KM');
    expect(r.value).toBe('5');
  });

  it('boundary: 4.999 km uses M and is ~4999 m', () => {
    const r = formatDescentAltitude(4.999);
    expect(r.unit).toBe('M');
    expect(parseInt(r.value, 10)).toBeCloseTo(4999, -1);
  });
});
