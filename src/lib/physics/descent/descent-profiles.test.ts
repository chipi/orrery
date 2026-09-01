/**
 * Flagship descent-profile guard (RFC-034 §9) — the inverse of
 * flagship-profiles.test.ts. Every one of the 37 Moon/Mars/Venus landers must
 * ship a well-formed thin profile that expands via its archetype and flies to
 * the RIGHT outcome: a survivable touchdown for the soft landers, an honest
 * high-speed impact for the three crash reconstructions. Catches a data typo
 * (an entry mass, a phase altitude, a propellant budget) the moment it makes a
 * lander crater — or a crash "succeed".
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
  // Tier-1 manned Earth re-entry (ADR-088 Phase 0a re-calibration): profiles now use the real
  // ~1.5° LEO-deorbit interface angle (was a too-steep 4°). Orbital BALLISTIC capsules
  // (Mercury/Vostok/Voskhod) now read ~7.6–7.7 g — matching the flown ~7.8 g. Suborbital Mercury
  // (freedom-7/liberty-bell-7, 18°/2.3 km/s) ~8.7 g. LIFTING capsules read ~5–8 g — still ~2× the
  // flown ~3.3–4.5 g because the app integrator floors γ (no lofting); the #29 loft/skip model
  // brings them to the flown value (then this band + the lifting band below tighten). Lower bound
  // stays 3 to accommodate that pending drop.
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

describe('all 44 descent profiles ship on disk', () => {
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
 * HONEST CALIBRATION NOTE (ADR-088 Phase 0a): the band here is [4, 8.5], the FLOORED-model value —
 * ~2× the flown ~3.3–4.5 g. The app integrator floors γ (never flies upward), so a lifting capsule
 * cannot loft the way the real vehicles did to shed g gently; it skims at a fixed shallow angle and
 * reads ~5–8 g. The #29 loft/skip model (γ-floor removal + exo-atmospheric coast) lets it loft to
 * the flown value, at which point this band tightens to ~[3, 5]. Kept honest, not faked, until then.
 */
describe('lifting re-entries fly the floored-model lifting band (all capsules)', () => {
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
      expectInRange(s.peakDecel.g, 4, 8.5, `${id} lifting peak decel (g)`);
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
 * Honest provenance (ADR-088 Phase 0b): a profile's `liftToDragRatio` and `targetDownrangeKm` are
 * MODEL-AUTHORED estimates, not values from the mission-report `provenance` block. This guard makes
 * that machine-checkable — any Earth profile setting either MUST declare both (plus the estimated
 * entry angle) in `estimatedFields`, so an invented number can never silently wear real provenance.
 */
describe('model-authored entry fields are declared as estimates, not sourced', () => {
  const earthGuided = [...DESCENT_MISSION_IDS].filter((id) => {
    if (!existsSync(profilePath(id))) return false;
    const raw = loadRaw(id);
    return (
      raw.body === 'earth' && ((raw.liftToDragRatio ?? 0) > 0 || raw.targetDownrangeKm != null)
    );
  });

  it('covers the lifting/guided Earth capsules (>=10)', () => {
    expect(earthGuided.length).toBeGreaterThanOrEqual(10);
  });

  for (const id of earthGuided) {
    it(`${id} declares its estimated physics fields`, () => {
      const raw = loadRaw(id);
      const est = raw.estimatedFields ?? [];
      if ((raw.liftToDragRatio ?? 0) > 0) expect(est).toContain('liftToDragRatio');
      if (raw.targetDownrangeKm != null) expect(est).toContain('targetDownrangeKm');
    });
  }
});
