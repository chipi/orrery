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
 * Closed-loop guidance (#415 Track 1) on true 2-body dynamics (#415 Track 2 —
 * gravity toward Earth's centre) plus the parallel-boost stage (#415 Track 3 —
 * strap-on boosters that fire with the core then jettison) fly every
 * adequately-powered stack to a stable orbit: falcon-9, titan-ii-glv,
 * saturn-ib, proton-k, saturn-v, and the strap-on **vostok-k**.
 *
 * Still excluded — all for the SAME reason, a low-TWR upper stage that can't
 * circularise a wildly-eccentric insertion; each flies an accurate ascent and
 * soft-inserts to space, awaiting proper PEG (#416):
 *  - atlas-v (Centaur), ariane-5 (ESC-A), h-iia (LE-5B).
 * (delta-ii and atlas-lv-3b are strap-on vehicles not yet profiled.)
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
];
const GENUINE_ORBIT = [
  'falcon-9',
  'titan-ii-glv',
  'saturn-ib',
  'proton-k',
  'saturn-v',
  'vostok-k',
  'atlas-lv-3b',
];

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
