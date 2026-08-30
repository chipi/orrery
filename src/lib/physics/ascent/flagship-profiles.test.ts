/**
 * Flagship launch-profile guard (RFC-034 §6 · epic #412 · Track A).
 *
 * Two tiers:
 *
 *  1. DATA SHAPE — every hand-authored flagship JSON must be a well-formed
 *     multi-stage profile (wet > dry, Isp in a physical band, ≥ 2 stages).
 *     Catches a mass/thrust/Isp digit typo in the sourced data.
 *
 *  2. GENUINE ORBIT — the profile integrates to a STABLE orbit: perigee above
 *     the decaying atmosphere, near circular speed at LEO altitude, still up
 *     after the post-SECO coast — not a suborbital lob that trips the orbit gate
 *     on the way *down*.
 *
 * As of #416, ALL 14 flagships reach a genuine orbit. The three enabling pieces:
 *  - Earth-rotation launch credit (the pad carries 465·cos(lat) m/s eastward,
 *    airspeed-relative drag + steering) — the missing physics that put the two
 *    thinnest-margin, most-equatorial vehicles (ariane-5 @ Kourou 5.2°, h-iia @
 *    Tanegashima 30.4°) over the line.
 *  - PEG + lofted-boost guidance for the genuinely low-TWR upper stages
 *    (Centaur, ESC-A, LE-5B) — they fly a lofted direct injection, gated by the
 *    `loftBoost` profile flag; adequately-powered vehicles are untouched.
 *  - Spec corrections: Shuttle Orbiter empty mass (real 78 t), atlas-v as the
 *    541 heavy variant, ariane-5 at a representative dual-GTO payload.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { integrateAscent, type LaunchProfile } from './ascent-physics';
import { R_EARTH_M, MU_EARTH_M3_S2 } from './ascent-physics-constants';

/** Osculating perigee/apoapsis/eccentricity from the final integrated state. */
function orbitElements(s: ReturnType<typeof integrateAscent>) {
  const last = s.states[s.states.length - 1];
  const r = R_EARTH_M + s.finalAltKm * 1000;
  const v = s.finalSpeedKms * 1000;
  const vr = (last?.velUpKms ?? 0) * 1000;
  const vh = Math.sqrt(Math.max(0, v * v - vr * vr));
  const energy = (v * v) / 2 - MU_EARTH_M3_S2 / r;
  const a = -MU_EARTH_M3_S2 / (2 * energy);
  const ecc = Math.sqrt(Math.max(0, 1 + (2 * energy * (r * vh) ** 2) / MU_EARTH_M3_S2 ** 2));
  return {
    periKm: (a * (1 - ecc) - R_EARTH_M) / 1000,
    apoKm: (a * (1 + ecc) - R_EARTH_M) / 1000,
    ecc,
  };
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../');

function load(id: string): LaunchProfile {
  return JSON.parse(
    readFileSync(resolve(ROOT, `static/data/launch-profiles/${id}.json`), 'utf-8'),
  ) as LaunchProfile;
}

const ALL_FLAGSHIPS = [
  'falcon-9',
  'atlas-v',
  'saturn-v',
  'saturn-ib',
  'proton-k',
  'titan-ii-glv',
  'vostok-k',
  'ariane-5',
  'h-iia',
  'atlas-lv-3b',
  'space-shuttle-stack',
  'voskhod-11a57',
  'soyuz',
  'long-march-2f',
];
// All 14 now reach a genuine orbit (#416).
const GENUINE_ORBIT = ALL_FLAGSHIPS;

describe.each(ALL_FLAGSHIPS)('flagship profile %s — data shape', (id) => {
  const p = load(id);
  it('is a well-formed multi-stage flagship profile', () => {
    expect(p.source_tier).toBe('flagship');
    expect(p.stages.length).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(p.pitchProgram)).toBe(true);
    expect(p.payloadKg).toBeGreaterThan(0);
    for (const st of p.stages) {
      expect(st.wetKg).toBeGreaterThan(st.dryKg);
      expect(st.ispVacS).toBeGreaterThan(150);
      expect(st.ispVacS).toBeLessThan(500);
      expect(st.thrustVacKN).toBeGreaterThan(0);
    }
    // A launch latitude is required — the Earth-rotation credit (#416) reads it.
    expect(typeof p.launchSite?.lat).toBe('number');
    expect(Math.abs(p.launchSite!.lat)).toBeLessThanOrEqual(90);
  });
});

describe.each(GENUINE_ORBIT)('flagship profile %s — genuine orbit', (id) => {
  const s = integrateAscent(load(id));

  it('reaches orbit', () => {
    expect(s.reachedOrbit).toBe(true);
  });

  it('inserts into a stable, non-decaying orbit', () => {
    const o = orbitElements(s);
    // Perigee above the decaying atmosphere is the honest stability measure. A
    // very-low-TWR direct insertion (Centaur) legitimately lands slightly
    // elliptical — real Atlas V parking orbits do too — so the ecc bound is
    // loose; perigee is the load-bearing check.
    expect(o.periKm).toBeGreaterThan(130);
    expect(o.ecc).toBeLessThan(0.05);
  });

  it('is still up at ~circular speed after the post-SECO coast', () => {
    expect(s.finalAltKm).toBeGreaterThan(90);
    expect(s.finalSpeedKms).toBeGreaterThan(7.0);
    expect(s.finalSpeedKms).toBeLessThan(8.5);
    const seco = s.events.find((e) => e.type === 'seco');
    expect(seco).toBeDefined();
    expect(seco!.t).toBeGreaterThan(120);
    // A single-RL10 Centaur / LE-5B insertion burn runs 12–15 min — widened from
    // 900 s (#416); the 2000 s integrator cap still bounds a runaway.
    expect(seco!.t).toBeLessThan(1500);
  });
});
