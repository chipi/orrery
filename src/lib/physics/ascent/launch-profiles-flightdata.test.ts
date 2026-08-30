/**
 * Flagship launch-profile guards (advisor rec #5, 2026-08-05).
 *
 * The ascent constants (stage masses, Isp, thrust) were individually sourced but
 * nothing *checked* two things: (1) that every shipped flagship profile actually
 * carries its provenance, and (2) that the integrated trajectory still lands near
 * real published flight milestones. Without (2) a wrong Isp/mass would produce a
 * plausible-looking wrong trajectory that no self-consistency test catches.
 *
 * These are deliberately WIDE bands anchored to published values — the S1 ascent
 * model is a 2-DOF gravity-turn simplification, so exact SECO fidelity is not the
 * bar. The bands are tight enough to catch a gross constant error (e.g. a halved
 * Isp blows Max-Q timing and burn duration) and loose enough not to flake on the
 * model's honest approximations.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { integrateAscent } from './ascent-physics';
import type { AscentEvent, LaunchProfile } from './ascent-physics';

const PROFILE_DIR = join('static', 'data', 'launch-profiles');

function loadProfile(id: string): LaunchProfile {
  return JSON.parse(readFileSync(join(PROFILE_DIR, `${id}.json`), 'utf8')) as LaunchProfile;
}

const allProfileFiles = readdirSync(PROFILE_DIR).filter((f) => f.endsWith('.json'));

describe('flagship launch-profile provenance completeness', () => {
  it('ships at least one flagship profile', () => {
    expect(allProfileFiles.length).toBeGreaterThan(0);
  });

  for (const file of allProfileFiles) {
    it(`${file} declares source_tier + sourced provenance`, () => {
      const p = loadProfile(file.replace(/\.json$/, ''));
      expect(p.source_tier).toBe('flagship');
      expect(Array.isArray(p.provenance)).toBe(true);
      expect(p.provenance!.length).toBeGreaterThan(0);
      for (const row of p.provenance!) {
        expect(row.l?.trim().length ?? 0).toBeGreaterThan(0);
        expect(row.u).toMatch(/^https?:\/\//);
      }
    });
  }
});

/** First event time (s) of a given type, or NaN if the event never fired. */
function eventTime(events: AscentEvent[], type: AscentEvent['type'], nth = 0): number {
  const hits = events.filter((e) => e.type === type);
  return hits[nth]?.t ?? NaN;
}

describe('ascent trajectory anchored to published flight data', () => {
  // Falcon 9 (typical LEO mission, SpaceX webcast telemetry): Max-Q ~T+72 s at
  // ~12 km; MECO / stage-1 separation ~T+150-162 s; LEO insertion at ~7.8 km/s.
  it('Falcon 9 hits Max-Q, MECO, and orbit near the real milestones', () => {
    const s = integrateAscent(loadProfile('falcon-9'));
    expect(s.reachedOrbit).toBe(true);
    expect(s.maxQ.t).toBeGreaterThan(55);
    expect(s.maxQ.t).toBeLessThan(90); // real ~72 s
    expect(s.maxQ.altKm).toBeGreaterThan(9);
    expect(s.maxQ.altKm).toBeLessThan(17); // real ~11-13 km
    const meco = eventTime(s.events, 'meco');
    expect(meco).toBeGreaterThan(135);
    expect(meco).toBeLessThan(180); // real ~150-162 s
    expect(s.idealDvKms).toBeGreaterThan(9.3);
    expect(s.idealDvKms).toBeLessThan(11.0); // LEO launcher total ideal Δv
    expect(s.finalSpeedKms).toBeGreaterThan(7.5);
    expect(s.finalSpeedKms).toBeLessThan(8.0); // circular LEO ~7.79 km/s
  });

  // Saturn V (Apollo, NASA flight evaluation): Max-Q ~T+83 s at ~13 km; S-IC
  // outboard cutoff ~T+161-168 s; S-II cutoff ~T+524 s (≈9 min); orbit at ~7.8 km/s.
  it('Saturn V hits Max-Q and the S-IC / S-II staging near the real milestones', () => {
    const s = integrateAscent(loadProfile('saturn-v'));
    expect(s.reachedOrbit).toBe(true);
    expect(s.maxQ.t).toBeGreaterThan(65);
    expect(s.maxQ.t).toBeLessThan(100); // real ~83 s
    expect(s.maxQ.altKm).toBeGreaterThan(9);
    expect(s.maxQ.altKm).toBeLessThan(18); // real ~13-14 km
    const sIcCutoff = eventTime(s.events, 'meco');
    expect(sIcCutoff).toBeGreaterThan(145);
    expect(sIcCutoff).toBeLessThan(185); // real ~161-168 s
    const sIiCutoff = eventTime(s.events, 'staging', 1);
    expect(sIiCutoff).toBeGreaterThan(480);
    expect(sIiCutoff).toBeLessThan(570); // real ~524 s
    expect(s.idealDvKms).toBeGreaterThan(11.5);
    expect(s.idealDvKms).toBeLessThan(14.0); // high TLI-capable stack
  });
});
