/**
 * Flagship launch-profile guard (RFC-033 §6 · epic #412 · Track A).
 *
 * Two tiers:
 *
 *  1. DATA SHAPE — every hand-authored flagship JSON must be a well-formed
 *     multi-stage profile (wet > dry, Isp in a physical band, ≥ 2 stages).
 *     Catches a mass/thrust/Isp digit typo in the sourced data.
 *
 *  2. GENUINE ORBIT — the profile integrates to a STABLE orbit: it is still
 *     up (near circular speed at LEO altitude) after the post-SECO coast,
 *     not a suborbital lob that trips the orbit gate on the way *down*.
 *
 * Closed-loop insertion guidance (#415 Track 1) flies every adequately-powered
 * serial stack to a genuine orbit — falcon-9, titan-ii-glv, saturn-ib, proton-k.
 * Still excluded: vehicles whose UPPER stage has TWR < 1 and must coast to
 * apoapsis then relight (Track 2 coast+restart) — atlas-v (Centaur) and
 * saturn-v (S-IVB, which really does a partial burn → park → reignite for TLI);
 * and strap-on vehicles that need a parallel-boost stage (Track 3). As those
 * land, move vehicles into GENUINE_ORBIT and this guard confirms the win.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { integrateAscent, type LaunchProfile } from './ascent-physics';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../');

function load(id: string): LaunchProfile {
  return JSON.parse(
    readFileSync(resolve(ROOT, `static/data/launch-profiles/${id}.json`), 'utf-8'),
  ) as LaunchProfile;
}

const ALL_FLAGSHIPS = ['falcon-9', 'atlas-v', 'saturn-v', 'saturn-ib', 'proton-k', 'titan-ii-glv'];
const GENUINE_ORBIT = ['falcon-9', 'titan-ii-glv', 'saturn-ib', 'proton-k'];

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
  });
});

describe.each(GENUINE_ORBIT)('flagship profile %s — genuine orbit', (id) => {
  const s = integrateAscent(load(id));

  it('reaches orbit', () => {
    expect(s.reachedOrbit).toBe(true);
  });

  it('is still in a stable orbit after the post-SECO coast', () => {
    // A genuine orbit stays up at ~circular speed; a lob has fallen back.
    expect(s.finalAltKm).toBeGreaterThan(90);
    expect(s.finalSpeedKms).toBeGreaterThan(7.0);
    expect(s.finalSpeedKms).toBeLessThan(8.5);
    const seco = s.events.find((e) => e.type === 'seco');
    expect(seco).toBeDefined();
    expect(seco!.t).toBeGreaterThan(120);
    expect(seco!.t).toBeLessThan(900);
  });
});
