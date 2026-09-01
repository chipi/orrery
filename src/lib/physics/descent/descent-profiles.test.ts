/**
 * Flagship descent-profile guard (RFC-034 §9) — the inverse of
 * flagship-profiles.test.ts. Every shipped lander/capsule (Moon/Mars/Venus/Titan/
 * Jupiter/small-body/Earth-return) must ship a well-formed thin profile that expands
 * via its archetype and flies to the RIGHT outcome: a survivable touchdown for the
 * soft landers, an honest high-speed impact for the crash reconstructions. Catches a
 * data typo (an entry mass, a phase altitude, a propellant budget) the moment it makes
 * a lander crater — or a crash "succeed".
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  expandDescentProfile,
  DESCENT_MISSION_IDS,
  type RawDescentProfile,
} from './descent-profile-registry';
import { integrateDescent } from './descent-physics';
import { expectInRange } from '../../test-helpers/expect-close';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../');
const profilePath = (id: string): string =>
  resolve(ROOT, `static/data/descent-profiles/${id}.json`);
const loadRaw = (id: string): RawDescentProfile =>
  JSON.parse(readFileSync(profilePath(id), 'utf-8')) as RawDescentProfile;

/** The three missions whose EDL is an honest failure (impact, not touchdown). */
const CRASHES = new Set(['beresheet', 'schiaparelli', 'mars3', 'soyuz-1']);

/**
 * Peak-decel band (Earth-g) per body — a TIGHT regression guard calibrated to
 * the published EDL peak-deceleration envelopes:
 *   - Moon: gentle powered descent, a few g of braking (no atmospheric spike).
 *   - Mars: 5–16 g across the fleet (MER ~6, Viking ~8, MSL/M2020 ~12–15).
 *   - Venus: the fierce dense-atmosphere entry, ~150–350 g (Venera-class).
 * A profile edit that pushes a body's peak-g outside its real envelope now
 * fails here instead of silently shipping an unphysical entry.
 */
const PEAK_G_BAND: Record<string, [number, number]> = {
  moon: [0, 7],
  mars: [4, 18],
  venus: [120, 320],
  // Tier-1 manned Earth re-entry (ADR-088 Phase 0a/1a). Profiles use the real ~1.5° LEO-deorbit
  // angle + sourced L/D + real/derived drag areas. Orbital BALLISTIC capsules (Mercury/Vostok/
  // Voskhod) read ~7.6–7.7 g — matching flown ~7.8 g. LIFTING capsules read ~4.2–5.6 g (flown guided
  // 3.3–4 g) — the ~1–1.5 g residual is a fixed-bank vs active-bank-modulation gap, NOT the γ-floor
  // (measured irrelevant at LEO energy) and NOT closed by the naive decel-hold controller (measured:
  // overshoots). Suborbital Mercury-Redstone (freedom-7/liberty-bell-7, 18°/2.3 km/s) read ~8.7 g vs
  // flown ~11 g — an unclosed gap (their 18° + drag are model estimates). Band [3, 9.5] brackets all.
  earth: [3, 9.5],
  // Phase 2 (RFC-034 §12): micro-g asteroids barely decelerate; the Galileo
  // Jupiter probe hits the fiercest entry of any probe (~200–260 g published).
  itokawa: [0, 2],
  bennu: [0, 2],
  ryugu: [0, 2],
  comet_67p: [0, 2],
  eros: [0, 2],
  titan: [4, 26],
  jupiter: [150, 320],
};

/** Missions whose descent has no solid-surface terminus (atmospheric probe). */
const NO_SURFACE = new Set(['galileo']);

describe('all descent profiles ship on disk', () => {
  for (const id of DESCENT_MISSION_IDS) {
    it(`${id} has a profile JSON`, () => {
      expect(existsSync(profilePath(id))).toBe(true);
    });
  }
});

describe('every descent profile expands + flies to its honest outcome', () => {
  for (const id of DESCENT_MISSION_IDS) {
    it(`${id} lands as expected`, () => {
      if (!existsSync(profilePath(id))) return; // gated by the coverage suite above
      const raw = loadRaw(id);
      expect(raw.missionId).toBe(id);
      const profile = expandDescentProfile(raw);
      const noSurface = NO_SURFACE.has(id);
      // Landers end at the ground; an atmospheric probe ends on a pressure crush.
      expect(profile.phases.at(-1)!.endTrigger.type).toBe(noSurface ? 'pressure_pa' : 'ground');

      const s = integrateDescent(profile);
      if (CRASHES.has(id)) {
        expect(s.touchdownSuccess).toBe(false);
      } else {
        expect(s.touchdownSuccess).toBe(true);
      }
      // Peak deceleration in the body's plausible band.
      const band = PEAK_G_BAND[profile.body];
      expectInRange(s.peakDecel.g, band[0], band[1], `${id} peak decel (g)`);
      // Beats open on entry; landers close on touchdown, probes on signal loss.
      expect(s.events[0].type).toBe('entry');
      expect(s.events.at(-1)!.type).toBe(noSurface ? 'probe_signal_lost' : 'touchdown');
    });
  }
});

/**
 * Every lifting capsule flies LIFT-UP, not ballistic (#419 · ADR-087/088), across the board —
 * Apollo/Skylab CM, Gemini, Soyuz, Crew Dragon, Shenzhou. A capsule rides its offset-CG lift
 * vector; a ballistic (lift-free) fall from the same 7.8 km/s entry at this angle spikes to ~11 g.
 * This guard auto-covers EVERY Earth profile carrying a `liftToDragRatio`, so dropping the lift on
 * any of them fails here. A guided profile (targetDownrangeKm) must also actually reach its target.
 *
 * CALIBRATION (ADR-088 Phase 1a): with the entry angle (1.5°), sourced L/D, and real/geometry-
 * derived drag areas (Apollo BC 313.5), lifting capsules now read ~4.2–5.6 g. Flown guided values:
 * Apollo 7 LEO ~3.3 g, Soyuz LEO 3–4 g, Shenzhou ≤4 g, Dragon ~4 g. The model runs ~1–1.5 g ABOVE
 * the flown guided value for the low-L/D capsules because our range-control solve flies a single
 * FIXED bank; the real vehicles ACTIVELY modulate bank to hold a lower g-limit (and, at lunar-
 * return energy, loft) — neither is in this planar fixed-bank model. Honest gap, not faked. Band
 * [3.5, 6] brackets the model; a ballistic (lift-free) regression would spike ~11 g and fail here.
 */
describe('lifting re-entries fly the calibrated lifting band (all capsules)', () => {
  const liftingIds = [...DESCENT_MISSION_IDS].filter((id) => {
    if (!existsSync(profilePath(id))) return false;
    return (loadRaw(id).liftToDragRatio ?? 0) > 0;
  });

  it('covers every authored lifting capsule (>=10)', () => {
    expect(liftingIds.length).toBeGreaterThanOrEqual(10);
  });

  for (const id of liftingIds) {
    it(`${id} rides its lift vector, peak-g in the lifting band`, () => {
      const raw = loadRaw(id);
      const s = integrateDescent(expandDescentProfile(raw));
      expectInRange(s.peakDecel.g, 3.5, 6, `${id} lifting peak decel (g)`);
      if (raw.targetDownrangeKm != null) {
        expect(s.guidance?.targetReachable).toBe(true);
        expectInRange(
          s.landingDownrangeKm,
          raw.targetDownrangeKm - 30,
          raw.targetDownrangeKm + 30,
          `${id} guided to target downrange`,
        );
      }
    });
  }
});

/**
 * Honest provenance (ADR-088 Phase 0b/1a). EVERY Earth capsule (lifting AND ballistic) splits its
 * entry fields into SOURCED and MODEL-AUTHORED. Sourced (NOT in estimatedFields): `liftToDragRatio`
 * (Apollo 0.3, Soyuz 0.3 [RU], Shenzhou 0.2 [CN], Dragon 0.18 [GT], Gemini 0.19 [DTIC AD0856691])
 * and — for Apollo — `entryCdA` (BC 313.5 kg/m², NASA). Estimated (MUST be declared): the
 * `flightPathAngleDeg` (the ~1.5° LEO / 18° suborbital angle), the `targetDownrangeKm`, and the
 * geometry-derived/tuned `entryCdA` on every non-Apollo capsule. Machine-checkable so a model
 * estimate can never silently wear the mission-report provenance block — enforced for the ballistic
 * profiles too (they had estimated angle+Cd·A wearing NSSDCA provenance unmarked; now flagged).
 */
describe('model-authored entry fields are declared as estimates, sourced ones are not', () => {
  const APOLLO_SOURCED_CDA = new Set([
    'apollo7',
    'apollo9',
    'apollo-soyuz',
    'skylab-2',
    'skylab-3',
    'skylab-4',
  ]);
  const earthCapsules = [...DESCENT_MISSION_IDS].filter(
    (id) => existsSync(profilePath(id)) && loadRaw(id).body === 'earth',
  );

  it('covers all Earth capsules (>=25, lifting + ballistic)', () => {
    expect(earthCapsules.length).toBeGreaterThanOrEqual(25);
  });

  for (const id of earthCapsules) {
    it(`${id} declares estimates (angle, Cd·A, target), omits sourced fields`, () => {
      const raw = loadRaw(id);
      const est = raw.estimatedFields ?? [];
      // The entry angle is a model estimate on EVERY Earth capsule (not from the provenance source).
      expect(est).toContain('flightPathAngleDeg');
      // A guided target is always an estimate.
      if (raw.targetDownrangeKm != null) expect(est).toContain('targetDownrangeKm');
      // Sourced L/D → must NOT be flagged an estimate.
      if ((raw.liftToDragRatio ?? 0) > 0) expect(est).not.toContain('liftToDragRatio');
      // Cd·A: sourced only for the Apollo CM (BC 313.5); estimated for everyone else.
      if (APOLLO_SOURCED_CDA.has(id)) expect(est).not.toContain('entryCdA');
      else expect(est).toContain('entryCdA');
    });
  }
});
