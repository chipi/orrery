/**
 * Falcon 9 ascent validation harness (RFC-033 §5 · epic #412 · S2).
 *
 * Anchors the integrated ascent to published Falcon 9 milestones so a
 * regression in the equations of motion OR the profile data fails CI —
 * "physics first, prototype is ground truth" (PA §principles / ADR-030,
 * mirroring fly-physics-validation).
 *
 * Golden values: SpaceX webcast telemetry / Spaceflight Now launch
 * timelines for a typical LEO ascent:
 *   - Max-Q       ~T+78 s
 *   - MECO        ~T+156 s, ~80 km, ~Mach 10 (~2.4 km/s)
 *   - 2nd-stage burn ~6 min → SECO ~T+530 s, ~200 km, orbital ~7.7 km/s
 *   Sources: spaceflightnow.com Falcon 9 launch timelines; en.wikipedia.org/wiki/Falcon_9
 *
 * Tolerance bands are MODERATE by design: FALCON9_SAMPLE is a
 * representative Falcon 9 (per-flight numbers vary with payload and
 * target orbit), so the bands accept the vehicle's real envelope while
 * still catching a genuine regression (a broken pitch program, a mass/
 * Isp typo, an integrator drift).
 */

import { describe, it, expect } from 'vitest';
import { integrateAscent, circularSpeed, type AscentEvent } from './ascent-physics';
import { FALCON9_SAMPLE } from './ascent-profiles';
import { expectCloseTo } from '../test-helpers/expect-close';

const s = integrateAscent(FALCON9_SAMPLE);
const ev = (type: AscentEvent['type']): AscentEvent | undefined => s.events.find((e) => e.type === type);

describe('Falcon 9 ascent — published-milestone validation (S2)', () => {
  it('reaches orbit', () => {
    expect(s.reachedOrbit).toBe(true);
  });

  it('Max-Q occurs near T+78 s at a physical dynamic pressure', () => {
    expectCloseTo(s.maxQ.t, 78, 28, 'Max-Q time (s)');
    // Real F9 Max-Q is ~30-35 kPa; the single-exponential atmosphere keeps
    // it in the right decade.
    expect(s.maxQ.qPa / 1000).toBeGreaterThan(10);
    expect(s.maxQ.qPa / 1000).toBeLessThan(60);
    // Max-Q is a low-atmosphere event.
    expect(s.maxQ.altKm).toBeGreaterThan(6);
    expect(s.maxQ.altKm).toBeLessThan(30);
  });

  it('MECO near T+156 s, ~80 km, ~2.4 km/s', () => {
    const meco = ev('meco');
    expect(meco).toBeDefined();
    expectCloseTo(meco!.t, 156, 22, 'MECO time (s)');
    expectCloseTo(meco!.altKm, 80, 22, 'MECO altitude (km)');
    expectCloseTo(meco!.speedKms, 2.4, 0.8, 'MECO velocity (km/s)');
  });

  it('stage separation follows MECO', () => {
    const meco = ev('meco');
    const sep = ev('staging');
    expect(sep).toBeDefined();
    expect(sep!.t).toBeGreaterThanOrEqual(meco!.t);
  });

  it('SECO cuts off ON TARGET at orbital speed (~7.7 km/s), not to depletion', () => {
    const seco = ev('seco');
    expect(seco).toBeDefined();
    // Cut off within ~0.5 km/s of local circular speed — NOT overshooting
    // to propellant depletion (~8.6 km/s), which was the pre-S2 behaviour.
    expectCloseTo(seco!.speedKms, 7.7, 0.6, 'SECO velocity (km/s)');
    expectCloseTo(seco!.altKm, 200, 60, 'SECO altitude (km)');
    // Sanity: SECO speed is at/above local circular speed.
    expect(seco!.speedKms * 1000).toBeGreaterThanOrEqual(circularSpeed(seco!.altKm * 1000) - 400);
  });

  it('Δv loss ledger is physical (powered flight only)', () => {
    // Gravity loss dominates (~1-2 km/s), drag is small, steering smaller.
    expect(s.losses.gravityKms).toBeGreaterThan(0.5);
    expect(s.losses.gravityKms).toBeLessThan(2.5);
    expect(s.losses.dragKms).toBeGreaterThan(0.02);
    expect(s.losses.dragKms).toBeLessThan(0.6);
    expect(s.losses.steeringKms).toBeGreaterThanOrEqual(0);
    // Closed-loop insertion guidance (#415 Track 1) holds altitude by pointing
    // thrust off the velocity vector while still sub-orbital, so some of what a
    // velocity-aligned gravity turn books as gravity loss lands here as steering
    // loss — real Δv, just recategorised. Band widened from 0.5 accordingly.
    expect(s.losses.steeringKms).toBeLessThan(0.75);
  });

  it('ideal Δv capacity clears the ~9.4 km/s LEO requirement', () => {
    // Tsiolkovsky capacity must exceed orbital speed + losses with margin.
    expect(s.idealDvKms).toBeGreaterThan(9);
  });
});
