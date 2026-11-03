import { describe, it, expect } from 'vitest';
import {
  IGNITION_T_S,
  INJECTION_COAST_S,
  INJECTION_BURN_S,
  payloadSepTFor,
  buildAscentBeats,
  ascentStatus,
  countdownSeconds,
  injectionPhaseStatus,
  padState,
  type AscentBeat,
} from './ascent-hud';
import { integrateAscent } from '$lib/physics/ascent/ascent-physics';
import { FALCON9_SAMPLE } from '$lib/physics/ascent/ascent-profiles';

describe('injectionPhaseStatus', () => {
  const secoT = 500;
  it('is null before SECO (caller uses ascentStatus)', () => {
    expect(injectionPhaseStatus(499, secoT, 'TRANS-LUNAR INJECTION')).toBeNull();
  });
  it('reads PARKING ORBIT during the post-SECO coast', () => {
    expect(injectionPhaseStatus(secoT + 1, secoT, 'TRANS-LUNAR INJECTION')).toBe('PARKING ORBIT');
    expect(injectionPhaseStatus(secoT + INJECTION_COAST_S - 1, secoT, 'X')).toBe('PARKING ORBIT');
  });
  it('reads the burn label once the burn starts', () => {
    expect(injectionPhaseStatus(secoT + INJECTION_COAST_S, secoT, 'TRANS-MARS INJECTION')).toBe(
      'TRANS-MARS INJECTION',
    );
  });
});

const summary = integrateAscent(FALCON9_SAMPLE);

describe('buildAscentBeats', () => {
  const beats = buildAscentBeats(summary);

  it('opens with MAX-Q and is sorted in time within the flight', () => {
    expect(beats.length).toBeGreaterThan(0);
    expect(beats[0].label).toBe('MAX-Q');
    for (let i = 1; i < beats.length; i++) {
      expect(beats[i].t).toBeGreaterThanOrEqual(beats[i - 1].t);
    }
    expect(beats.at(-1)!.t).toBeLessThanOrEqual(summary.totalDurationS);
  });

  it('drops a MECO that coincides (<2 s) with a STAGE SEP', () => {
    // Falcon 9 stages ~3 s after MECO → the two are within 2 s? Contract the rule
    // directly on a synthetic summary so it is unambiguous.
    const synthetic = {
      ...summary,
      maxQ: { t: 50, altKm: 10, qPa: 30000 },
      totalDurationS: 300,
      events: [
        { type: 'meco' as const, t: 160, altKm: 60, speedKms: 2.3, massKg: 1 },
        { type: 'staging' as const, t: 161, altKm: 61, speedKms: 2.3, massKg: 1 },
        { type: 'seco' as const, t: 280, altKm: 180, speedKms: 7.7, massKg: 1 },
      ],
    };
    const labels = buildAscentBeats(synthetic).map((b) => b.label);
    expect(labels).not.toContain('MECO');
    expect(labels).toContain('STAGE SEP');
    expect(labels).toContain('SECO');
  });

  it('keeps a MECO with no nearby STAGE SEP', () => {
    const synthetic = {
      ...summary,
      maxQ: { t: 50, altKm: 10, qPa: 30000 },
      totalDurationS: 300,
      events: [
        { type: 'meco' as const, t: 160, altKm: 60, speedKms: 2.3, massKg: 1 },
        { type: 'staging' as const, t: 200, altKm: 90, speedKms: 3.1, massKg: 1 },
      ],
    };
    expect(buildAscentBeats(synthetic).map((b) => b.label)).toContain('MECO');
  });
});

describe('ascentStatus', () => {
  const beats: AscentBeat[] = [
    { label: 'MAX-Q', t: 60 },
    { label: 'SECO', t: 300 },
  ];

  it('walks the countdown calls, then falls to the latest passed beat', () => {
    expect(ascentStatus(-12, beats)).toBe('GO FOR LAUNCH');
    expect(ascentStatus(-5, beats)).toBe('TERMINAL COUNT');
    expect(ascentStatus(-1, beats)).toBe('IGNITION SEQUENCE');
    expect(ascentStatus(5, beats)).toBe('LIFTOFF');
    expect(ascentStatus(30, beats)).toBe('ASCENT'); // past liftoff, before Max-Q
    expect(ascentStatus(70, beats)).toBe('MAX-Q');
    expect(ascentStatus(305, beats)).toBe('SECO');
  });

  it('lets an event label go after its beat — no "FAIRING" minutes after the fairing fell', () => {
    const ev: AscentBeat[] = [
      { label: 'MAX-Q', t: 60 },
      { label: 'STAGE SEP', t: 130 },
      { label: 'FAIRING', t: 190 },
      { label: 'SECO', t: 480 },
    ];
    expect(ascentStatus(120, ev)).toBe('ASCENT');
    expect(ascentStatus(140, ev)).toBe('STAGE SEP');
    expect(ascentStatus(195, ev)).toBe('FAIRING');
    expect(ascentStatus(300, ev)).toBe('ASCENT');
    // States hold: once in orbit / engines off it stays so.
    expect(ascentStatus(900, ev)).toBe('SECO');
  });

  it('honours a custom ignition boundary', () => {
    // ignition at T-5: before it → terminal count; after it → ignition sequence.
    expect(ascentStatus(-6, beats, -5)).toBe('TERMINAL COUNT');
    expect(ascentStatus(-4, beats, -5)).toBe('IGNITION SEQUENCE');
    // default ignition at T-3.
    expect(ascentStatus(-4, beats)).toBe('TERMINAL COUNT');
    expect(ascentStatus(-2, beats)).toBe('IGNITION SEQUENCE');
  });
});

describe('countdownSeconds', () => {
  it('counts whole seconds down to zero, then null once airborne', () => {
    expect(countdownSeconds(-12)).toBe(12);
    expect(countdownSeconds(-0.4)).toBe(1);
    expect(countdownSeconds(0)).toBeNull();
    expect(countdownSeconds(5)).toBeNull();
  });
});

describe('padState', () => {
  it('freezes altitude/speed/q on the pad and darkens the engine before ignition', () => {
    const pre = padState(summary, -6);
    expect(pre.altKm).toBe(0);
    expect(pre.speedKms).toBe(0);
    expect(pre.qPa).toBe(0);
    expect(pre.stageIndex).toBe(-1);
    expect(pre.thrustN).toBe(0);
    expect(pre.t).toBe(-6);
  });

  it('lights the engine (stage 0, thrust) from ignition onward', () => {
    const lit = padState(summary, IGNITION_T_S + 0.5);
    expect(lit.stageIndex).toBe(0);
    expect(lit.thrustN).toBe(summary.states[0].thrustN);
    expect(lit.thrustN).toBeGreaterThan(0);
  });
});

describe('payloadSepTFor', () => {
  const d = 500;
  it('is undefined with no injection beat (the spacecraft leaves at SECO)', () => {
    expect(payloadSepTFor(d, null)).toBeUndefined();
  });
  it('rides the stage through the whole burn by default', () => {
    expect(payloadSepTFor(d, {})).toBe(d + INJECTION_COAST_S + INJECTION_BURN_S);
  });
  it('deploys mid-coast before a kick-stage-only burn (Shuttle + IUS)', () => {
    expect(payloadSepTFor(d, { kickStage: true })).toBe(d + INJECTION_COAST_S / 2);
  });
  it('parts halfway through the burn when the stage fires first (Delta II + Star 48B)', () => {
    expect(payloadSepTFor(d, { kickStage: true, stageFiresFirst: true })).toBe(
      d + INJECTION_COAST_S + INJECTION_BURN_S / 2,
    );
  });
});
