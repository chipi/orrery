import { describe, it, expect } from 'vitest';
import {
  biasJumpToIconicMoment,
  ICONIC_LEAD_DAYS_FOR_JUMP_BIAS,
  type FlightEventLite,
} from './jump-to-met-bias';

const events: FlightEventLite[] = [
  { met_days: 0, type: 'launch' },
  { met_days: 193, type: 'flyby' }, // Cassini Venus #1
  { met_days: 2451, type: 'edl_or_oi' }, // Cassini Saturn-OI
  { met_days: 100, type: 'arrival' }, // not a flyby/edl
];

describe('biasJumpToIconicMoment', () => {
  it('snaps a flyby target onto peakMet − ICONIC_LEAD_DAYS_FOR_JUMP_BIAS', () => {
    expect(biasJumpToIconicMoment(193, events)).toBe(193 - ICONIC_LEAD_DAYS_FOR_JUMP_BIAS);
  });

  it('snaps an edl_or_oi target the same way', () => {
    expect(biasJumpToIconicMoment(2451, events)).toBe(2451 - ICONIC_LEAD_DAYS_FOR_JUMP_BIAS);
  });

  it('leaves the target unchanged when the MET is not a flyby/edl event', () => {
    expect(biasJumpToIconicMoment(100, events)).toBe(100); // arrival event ignored
    expect(biasJumpToIconicMoment(500, events)).toBe(500); // not in events at all
  });

  it('leaves MET 0 unchanged so the launch opening replay is not skipped', () => {
    expect(biasJumpToIconicMoment(0, events)).toBe(0);
  });

  it('treats events as flyby if MET is within 1 day (fractional-MET flybys)', () => {
    const fractional: FlightEventLite[] = [{ met_days: 3.13, type: 'flyby' }];
    expect(biasJumpToIconicMoment(3.13, fractional)).toBe(3.13 - ICONIC_LEAD_DAYS_FOR_JUMP_BIAS);
    // Round to integer the user might've clicked
    expect(biasJumpToIconicMoment(3, fractional)).toBe(3 - ICONIC_LEAD_DAYS_FOR_JUMP_BIAS);
  });

  it('clamps the landing MET at zero (early-mission flyby bias clamped)', () => {
    const early: FlightEventLite[] = [{ met_days: 1, type: 'flyby' }];
    expect(biasJumpToIconicMoment(1, early)).toBe(0);
  });

  it('passes through negative or NaN inputs as zero', () => {
    expect(biasJumpToIconicMoment(-5, events)).toBe(0);
    expect(biasJumpToIconicMoment(Number.NaN, events)).toBe(0);
  });

  it('handles missing or empty events without crashing', () => {
    expect(biasJumpToIconicMoment(193, undefined)).toBe(193);
    expect(biasJumpToIconicMoment(193, null)).toBe(193);
    expect(biasJumpToIconicMoment(193, [])).toBe(193);
  });

  it('ignores events with non-finite met_days', () => {
    const bad: FlightEventLite[] = [
      { met_days: Number.NaN, type: 'flyby' },
      { met_days: null, type: 'flyby' },
    ];
    expect(biasJumpToIconicMoment(193, bad)).toBe(193);
  });
});
