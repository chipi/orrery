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
import { describe, it, expect, vi } from 'vitest';
import {
  expandDescentProfile,
  DESCENT_MISSION_IDS,
  type RawDescentProfile,
} from './descent-profile-registry';
import { integrateDescent, type DescentProfile, type DescentSummary } from './descent-physics';
import { expectInRange } from '../../test-helpers/expect-close';

// Every test in this file runs one or more full multi-phase entry integrations
// at the profile's dt. The long Earth-return capsules sit within a few hundred
// ms of vitest's 5 s default on an unloaded machine and blow past it under v8
// coverage or a busy runner — observed at 5.3 s bare and 6.6-12.4 s under
// coverage (2026-09-10). Set once for the FILE rather than per test: patching
// individual `it`s missed the lifting-band group and the suite went red on a
// second run. Same remedy as the bank-solve test (0a2b51ac59); the work is
// legitimately this big, so give it a real budget instead of letting machine
// load decide whether the suite is green.
vi.setConfig({ testTimeout: 30_000 });

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../');
const profilePath = (id: string): string =>
  resolve(ROOT, `static/data/descent-profiles/${id}.json`);
const loadRaw = (id: string): RawDescentProfile =>
  JSON.parse(readFileSync(profilePath(id), 'utf-8')) as RawDescentProfile;

// integrateDescent is a pure function of the expanded profile, so each
// profile flies once per file and every describe below reads the same flight
// (the lifting, skip and Mars groups re-flew profiles the first loop had
// already flown; this file set the unit suite's wall time).
const flights = new Map<string, { profile: DescentProfile; s: DescentSummary }>();
function flight(id: string): { profile: DescentProfile; s: DescentSummary } {
  let f = flights.get(id);
  if (!f) {
    const profile = expandDescentProfile(loadRaw(id));
    f = { profile, s: integrateDescent(profile) };
    flights.set(id, f);
  }
  return f;
}

/** The missions whose EDL is an honest failure (impact, not touchdown). Mars 3 soft-landed. */
const CRASHES = new Set(['beresheet', 'schiaparelli', 'soyuz-1', 'chandrayaan2']);

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
  // overshoots). Suborbital Mercury-Redstone (freedom-7/liberty-bell-7) fly their sourced 11.0 /
  // 11.1 g since the 2026-11-03 fit (scripts/fit-earth-capsule.ts). Band [3, 11.5] brackets all.
  earth: [3, 11.5],
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

/** A vehicle the body's band was not drawn for. Starship Flight 5 (0.9.11 F3) is not a capsule:
 *  a belly-first, high-angle lifting entry from a suborbital trajectory. The model reads ~2.7 g;
 *  no published Flight 5 peak-g was found, so this band is the model's, not a source's. */
const PEAK_G_BY_MISSION: Record<string, [number, number]> = {
  'starship-flight-5': [1.5, 4],
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
      const { profile, s } = flight(id);
      const noSurface = NO_SURFACE.has(id);
      // A lander whose published record stops in the air (Vikram, recordEndsAltM) ends there.
      const recordEnds = profile.recordEndsAltM != null;
      // Landers end at the ground; an atmospheric probe ends on a pressure crush.
      expect(profile.phases.at(-1)!.endTrigger.type).toBe(noSurface ? 'pressure_pa' : 'ground');

      if (CRASHES.has(id)) {
        expect(s.touchdownSuccess).toBe(false);
      } else {
        expect(s.touchdownSuccess).toBe(true);
      }
      // Peak deceleration in the body's plausible band.
      const band = PEAK_G_BY_MISSION[id] ?? PEAK_G_BAND[profile.body];
      expectInRange(s.peakDecel.g, band[0], band[1], `${id} peak decel (g)`);
      // Beats open on entry; landers close on touchdown (or, after it, their ground beats: an
      // airbag lander's bounces, rest and petals), probes on signal loss.
      expect(s.events[0].type).toBe('entry');
      const flightEnd = raw.afterTouchdown
        ? s.events.filter((e) => e.t <= s.events.find((x) => x.type === 'touchdown')!.t).at(-1)
        : s.events.at(-1);
      expect(flightEnd!.type).toBe(
        noSurface ? 'probe_signal_lost' : recordEnds ? 'record_ends' : 'touchdown',
      );
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
 * [3, 6] brackets the model (Apollo 7 and 9, fitted to their reports in 0.9.5, read 3.4–3.9 g against
 * the flown 3.33/3.35); a ballistic (lift-free) regression would spike ~11 g and fail here.
 */
describe('lifting re-entries fly the calibrated lifting band (all capsules)', () => {
  // EARTH LEO capsule returns only (~7.8 km/s). apollo8 (LUNAR return, 10.8 km/s skip) and the Mars
  // guided-lifting entries (super-circular, higher corridor g) are different regimes, asserted in
  // their own tests (the lunar-return skip test / the Mars EDL band).
  const liftingIds = [...DESCENT_MISSION_IDS].filter((id) => {
    if (!existsSync(profilePath(id))) return false;
    const raw = loadRaw(id);
    return (
      raw.body === 'earth' &&
      raw.archetype !== 'EARTH_STARSHIP_RETURN' &&
      (raw.liftToDragRatio ?? 0) > 0 &&
      raw.entryState.velocityMs < 9000
    );
  });

  it('covers every authored lifting capsule (>=10)', () => {
    expect(liftingIds.length).toBeGreaterThanOrEqual(10);
  });

  for (const id of liftingIds) {
    it(`${id} rides its lift vector, peak-g in the lifting band`, () => {
      const raw = loadRaw(id);
      const { s } = flight(id);
      expectInRange(s.peakDecel.g, 3, 6, `${id} lifting peak decel (g)`);
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
 * apollo8 is the shipped lunar-return flight (#29 Phase 3 · ADR-089) — the first crewed 10.8 km/s
 * skip entry. It exercises the loft/skip model end-to-end through its real EARTH_CAPSULE_REENTRY
 * profile: loft above the atmosphere (skip_out), the coast, the second entry, then chutes to
 * splashdown. Peak-g sits in the real lunar-return corridor (~6.5–8 g); LEO returns never skip.
 */
describe('apollo8 lunar-return skip flight (shipped profile)', () => {
  it('skips out then re-enters and splashes down in the lunar-return g corridor', () => {
    const { s } = flight('apollo8');
    expect(s.events.some((e) => e.type === 'skip_out')).toBe(true);
    expect(s.events.some((e) => e.type === 'second_entry')).toBe(true);
    expect(Math.max(...s.states.map((st) => st.altKm))).toBeGreaterThan(130); // lofts above the interface
    expect(s.touchdownSuccess).toBe(true);
    expectInRange(s.peakDecel.g, 6, 9, 'apollo8 lunar-return peak-g'); // real ~6.8 g
  });

  it('the LEO Apollo 7 return does NOT skip (same capsule, sub-circular speed)', () => {
    const { s } = flight('apollo7');
    expect(s.events.some((e) => e.type === 'skip_out')).toBe(false);
  });
});

/**
 * Mars guided-lifting entries (#29 Phase 2 · ADR-089). Curiosity/MSL (the first guided Mars entry,
 * L/D 0.24 sourced), Perseverance, and Tianwen-1 fly a bank-steered LIFTING entry at the real ~15°
 * inertial FPA — 2-DOF, not the old fixed-γ ballistic. They must land soft, stay in the Mars g band,
 * and NOT skip (a steep super-circular entry digs in, it doesn't loft). MSL peak 12.6 g flown
 * (reconstruction); since 2026-11-03 Curiosity and Perseverance fly their sourced entry state with
 * a bank-averaged effective L/D tuned to the reconstructed timeline, reading ~9–10 g (was 6.5–8.5
 * flying full lift-up). The band below admits the flown value; under 6 g would be a regression.
 */
describe('Mars guided-lifting entries (2-DOF, no skip)', () => {
  for (const id of ['curiosity', 'perseverance', 'tianwen1']) {
    it(`${id} flies a lifting entry, lands soft, does not skip`, () => {
      const raw = loadRaw(id);
      expect(raw.liftToDragRatio).toBeGreaterThan(0); // guided lifting, not ballistic
      const { s } = flight(id);
      expect(s.touchdownSuccess).toBe(true);
      expect(s.events.some((e) => e.type === 'skip_out')).toBe(false); // steep enough not to loft
      // Corridor (not the generic Mars [4,18]): the model reads ~7–10 g for these three; the
      // flown MSL value is 12.6 g, so the band tops out just above it.
      expectInRange(s.peakDecel.g, 6, 13, `${id} Mars guided-lifting peak-g`);
    });
  }
});

/**
 * Honest provenance (ADR-088 Phase 0b/1a · ADR-089 Phase 2). Every capsule/lifting profile splits
 * its entry fields into SOURCED and MODEL-AUTHORED; the SOURCED ones must NOT be flagged in
 * `estimatedFields` and the estimated ones MUST. Machine-checkable so a model estimate can never
 * silently wear the mission-report provenance block. Covers Earth capsules AND the Mars lifting
 * entries. The entry angle is deliberately NOT universally forced estimated — apollo8's 6.48° FPA
 * is sourced from the mission report, while the LEO 1.5° / Mars 15° are model estimates.
 */
describe('model-authored entry fields are declared as estimates, sourced ones are not', () => {
  // L/D SOURCED per capsule (see docs/reference/capsule-entry-aerodynamics.md); anything with lift
  // NOT in this set has an estimated L/D that must be declared. Perseverance/Tianwen are MSL-class
  // estimates; Curiosity's is too since 2026-11-03 — it flies a bank-averaged effective L/D tuned to
  // the reconstructed timeline, not the cited 0.24 trim value. Apollo/Gemini/Soyuz/Dragon/Shenzhou
  // are directly sourced.
  // Starship Flight 5: L/D fitted to its sourced timeline (no published value).
  const ESTIMATED_LD = new Set(['curiosity', 'perseverance', 'tianwen1', 'starship-flight-5']);
  // Cd·A sourced only for the Apollo CM family (BC 313.5, NASA); estimated/tuned for everyone else.
  const SOURCED_CDA = new Set([
    'apollo7',
    'apollo8',
    'apollo9',
    'apollo-soyuz',
    'skylab-2',
    'skylab-3',
    'skylab-4',
  ]);
  const profiles = [...DESCENT_MISSION_IDS].filter((id) => {
    if (!existsSync(profilePath(id))) return false;
    const raw = loadRaw(id);
    return raw.body === 'earth' || (raw.liftToDragRatio ?? 0) > 0; // all capsules + Mars lifting
  });

  it('covers all Earth capsules + Mars lifting entries (>=28)', () => {
    expect(profiles.length).toBeGreaterThanOrEqual(28);
  });

  for (const id of profiles) {
    it(`${id} declares its estimates, omits its sourced fields`, () => {
      const raw = loadRaw(id);
      const est = raw.estimatedFields ?? [];
      // A guided range target is always a model estimate.
      if (raw.targetDownrangeKm != null) expect(est).toContain('targetDownrangeKm');
      // L/D: sourced unless in the MSL-class-estimate set.
      if ((raw.liftToDragRatio ?? 0) > 0) {
        if (ESTIMATED_LD.has(id)) expect(est).toContain('liftToDragRatio');
        else expect(est).not.toContain('liftToDragRatio');
      }
      // Cd·A: sourced only for the Apollo CM family.
      if (SOURCED_CDA.has(id)) expect(est).not.toContain('entryCdA');
      else if ((raw.liftToDragRatio ?? 0) > 0 || raw.body === 'earth')
        expect(est).toContain('entryCdA');
    });
  }
});

describe('Chandrayaan-2 Vikram: the published rough braking, then the record ends', () => {
  const raw = JSON.parse(
    readFileSync(
      resolve(__dirname, '../../../../static/data/descent-profiles/chandrayaan2.json'),
      'utf-8',
    ),
  ) as RawDescentProfile;
  const s = integrateDescent(expandDescentProfile(raw));
  it('flies from 30 km / 1,683 m/s and ends at 7.4 km near 146 m/s (PIB, 20 Nov 2019)', () => {
    expect(s.states[0].altKm).toBeCloseTo(30, 1);
    expect(s.states[0].velocityMs).toBeCloseTo(1683, 0);
    const end = s.events.at(-1)!;
    expect(end.type).toBe('record_ends');
    expect(Math.abs(end.altKm - 7.4)).toBeLessThan(0.05);
    expect(Math.abs(end.velocityMs - 146)).toBeLessThan(2);
  });
  it('models no crash: no touchdown beat, and the run is not a success', () => {
    expect(s.events.some((e) => e.type === 'touchdown')).toBe(false);
    expect(s.touchdownSuccess).toBe(false);
  });
});

// Starship Flight 5 (0.9.11 F3), SpaceX's timeline after re-entry (T+48:03): transonic 1:02:34,
// landing flip 1:05:15, landing burn 1:05:20, splashdown 1:05:40. Lift-to-drag, Cd·A, the entry
// angle and the flip altitude are fitted to these (docs/wip/2026-11-22-starship-flight-5-sourced.md).
describe('starship-flight-5: belly-first return, landing flip and burn', () => {
  const { s } = flight('starship-flight-5');
  const at = (type: string) => s.events.find((e) => e.type === type)?.t;
  it('flips and lights the landing burn at ~1032 s after re-entry (±5), splashes at ~1057 s (±5)', () => {
    expect(Math.abs(at('landing_flip')! - 1032)).toBeLessThanOrEqual(5);
    expect(Math.abs(at('retro_ignition')! - 1037)).toBeLessThanOrEqual(6);
    expect(Math.abs(at('touchdown')! - 1057)).toBeLessThanOrEqual(5);
  });
  it('goes transonic at ~871 s (±20) and splashes down slowly', () => {
    const trans = s.states.find((q) => q.velocityMs < 300)!.t;
    expect(Math.abs(trans - 871)).toBeLessThanOrEqual(20);
    expect(s.touchdownSuccess).toBe(true);
  });
});

/**
 * The airbag landings (pass 2): every beat in the order the record gives, at the sourced heights
 * and times (Pathfinder: Braun et al., AIAA 97-3663; MER: Desai & Knocke, AIAA 2004-5092, and the
 * MER landing press kit). Each profile's provenance block cites them.
 */
describe('airbag landings fly the recorded sequence', () => {
  const ORDER = [
    'parachute_deploy',
    'heatshield_sep',
    'bridle_lower',
    'radar_lock',
    'airbag_deploy',
    'retro_ignition',
    'bridle_cut',
    'touchdown',
    'at_rest',
    'petals_open',
  ];
  const run = (id: string) => integrateDescent(expandDescentProfile(loadRaw(id)));
  const ev = (s: DescentSummary, type: string) => s.events.find((e) => e.type === type)!;

  for (const id of ['mars-pathfinder', 'spirit', 'opportunity']) {
    it(`${id}: each beat once, in the recorded order`, () => {
      const s = run(id);
      const times = ORDER.map((type) => {
        const all = s.events.filter((e) => e.type === type);
        expect(all, type).toHaveLength(1);
        return all[0].t;
      });
      for (let i = 1; i < times.length; i++)
        expect(times[i], ORDER[i]).toBeGreaterThan(times[i - 1]);
    });
  }

  it('Pathfinder: heat shield 22 s and bridle 41 s after the chute; 135 s from chute to impact', () => {
    const s = run('mars-pathfinder');
    const chute = ev(s, 'parachute_deploy').t;
    expectInRange(ev(s, 'heatshield_sep').t - chute, 22, 22.1, 'heat shield after chute (s)');
    expectInRange(ev(s, 'bridle_lower').t - chute, 41, 41.1, 'bridle after chute (s)');
    expectInRange(ev(s, 'touchdown').t - chute, 130, 140, 'chute to first impact (s)');
    expectInRange(ev(s, 'bridle_cut').altKm * 1000, 19, 21, 'bridle cut (m)');
    expectInRange(ev(s, 'airbag_deploy').altKm * 1000, 290, 300, 'airbag inflation (m)');
  });

  it('Pathfinder: more than a dozen bounces, petals stamped 87 minutes after first contact', () => {
    const s = run('mars-pathfinder');
    expect(s.events.filter((e) => e.type === 'bounce').length).toBeGreaterThanOrEqual(14);
    expect(ev(s, 'petals_open').realT! - ev(s, 'touchdown').t).toBe(87 * 60);
  });

  it('Spirit: bridle cut at 8.5 m, first impact at the reconstructed ~14 m/s, 28 contacts', () => {
    const s = run('spirit');
    expectInRange(ev(s, 'bridle_cut').altKm * 1000, 7.5, 8.5, 'Spirit bridle cut (m)');
    expectInRange(s.touchdownVelocityMs, 13, 15, 'Spirit first impact (m/s)');
    expect(s.events.filter((e) => e.type === 'bounce')).toHaveLength(27);
  });

  it('Opportunity: bridle cut at 6.9 m, 26 contacts', () => {
    const s = run('opportunity');
    expectInRange(ev(s, 'bridle_cut').altKm * 1000, 5.9, 6.9, 'Opportunity bridle cut (m)');
    expect(s.events.filter((e) => e.type === 'bounce')).toHaveLength(25);
  });
});

describe('Beagle 2 (pilot chute, then a 10 m main; bags; bounces)', () => {
  it('main opens at 2.6 km with the back cover leaving; bags at 280 m; first impact near 17 m/s', () => {
    const s = flight('mars-express').s;
    const ev = (t: string) => s.events.find((e) => e.type === t)!;
    expectInRange(ev('parachute_jettison').altKm * 1000, 2590, 2610, 'main chute (m)');
    expect(ev('backshell_sep').t).toBe(ev('parachute_jettison').t);
    expectInRange(ev('airbag_deploy').altKm * 1000, 270, 290, 'bags (m)');
    expectInRange(s.touchdownVelocityMs, 14, 20, 'first impact (m/s)');
    expect(s.events.filter((e) => e.type === 'bounce').length).toBeGreaterThanOrEqual(8);
  });
});

/**
 * The six Apollo landings and the two Artemis stand-ins share one powered-descent flow (pass 2):
 * the gates, the contact light and the engine cutoff, each once and in order, the cutoff above the
 * ground. Apollo 11's high gate is the sourced 8:26 at 7,515 ft (Mission Report); the other
 * missions' thrust and approach angle are fitted so all six reach their high gate at about the same
 * altitude and fly their reported descent times.
 */
describe("Chang'e landings hover at 100 m, cut the engine at 4 m (lunar record)", () => {
  for (const id of ['change3', 'change4', 'change5', 'change6']) {
    it(`${id}: holds 100 m for the hover, cutoff at 4 m, soft touchdown`, () => {
      const s = flight(id).s;
      const hv = s.events.find((e) => e.type === 'hover')!;
      expectInRange(hv.altKm * 1000, 90, 101, 'hover start (m)');
      const during = s.states.filter((x) => x.t > hv.t + 3 && x.t < hv.t + 9);
      const alts = during.map((x) => x.altM);
      expect(Math.max(...alts) - Math.min(...alts), 'altitude spread (m)').toBeLessThan(2);
      expectInRange(
        s.events.find((e) => e.type === 'engine_cutoff')!.altKm * 1000,
        3,
        4,
        'cutoff (m)',
      );
      expect(s.touchdownSuccess).toBe(true);
    });
  }
});

describe('Apollo landings fly the gates, the contact light and the engine cutoff', () => {
  const APOLLO = ['apollo11', 'apollo12', 'apollo14', 'apollo15', 'apollo16', 'apollo17'];
  const ORDER = [
    'retro_ignition',
    'high_gate',
    'low_gate',
    'contact_light',
    'engine_cutoff',
    'touchdown',
  ];
  for (const id of APOLLO) {
    it(`${id}: each beat once, in order; contact light above the cutoff above the ground`, () => {
      const s = flight(id).s;
      const times = ORDER.map((type) => {
        const all = s.events.filter((e) => e.type === type);
        expect(all, type).toHaveLength(1);
        return all[0].t;
      });
      for (let i = 1; i < times.length; i++)
        expect(times[i], ORDER[i]).toBeGreaterThanOrEqual(times[i - 1]);
      const alt = (type: string): number => s.events.find((e) => e.type === type)!.altKm * 1000;
      expectInRange(alt('contact_light'), 1.2, 1.7, 'contact light (m)');
      expectInRange(alt('engine_cutoff'), 0.5, 1, 'engine cutoff (m)');
      expectInRange(alt('high_gate'), 2000, 2800, 'high gate (m)');
      expectInRange(alt('low_gate'), 140, 152, 'low gate (m)');
    });
  }

  it('Apollo 11: high gate at 8:26 into the burn, 150 m/s', () => {
    const hg = flight('apollo11').s.events.find((e) => e.type === 'high_gate')!;
    expectInRange(hg.t, 498, 514, 'Apollo 11 high gate (s after ignition)');
    expectInRange(hg.velocityMs, 148, 152, 'high-gate speed (m/s)');
  });

  it("a lander that names no gates (Chang'e 3) emits none", () => {
    const types = flight('change3').s.events.map((e) => e.type);
    expect(types).not.toContain('high_gate');
    expect(types).not.toContain('low_gate');
  });

  it('Artemis IV and V cut the engine above the ground, then touch down', () => {
    for (const id of ['artemis4', 'artemis5']) {
      const ev = flight(id).s.events;
      const cut = ev.find((e) => e.type === 'engine_cutoff')!;
      expect(cut.altKm * 1000, id).toBeLessThanOrEqual(1);
      expect(cut.t, id).toBeLessThanOrEqual(ev.find((e) => e.type === 'touchdown')!.t);
    }
  });
});

describe('Mars legged landers (Viking, Phoenix, InSight)', () => {
  const at = (id: string, t: string) => flight(id).s.events.find((e) => e.type === t)!;
  it('Viking: legs after the aeroshell, descent at 2.4 m/s from 17 m, touchdown at 2.4 m/s', () => {
    const s = flight('viking1').s;
    expect(at('viking1', 'leg_deploy').t).toBeGreaterThan(at('viking1', 'heatshield_sep').t);
    const near17 = s.states.filter((x) => x.altM > 0 && x.altM < 16);
    expect(near17.every((x) => Math.abs(x.velDownMs - 2.4) < 0.15)).toBe(true);
    expectInRange(s.touchdownVelocityMs, 2.3, 2.5, 'Viking touchdown (m/s)');
  });
  it('InSight: heat shield 15 s and legs 25 s after the chute; arrays 16 min after landing', () => {
    const chute = at('insight', 'parachute_deploy').t;
    expectInRange(at('insight', 'heatshield_sep').t - chute, 14.9, 15.1, 'heat shield (s)');
    expectInRange(at('insight', 'leg_deploy').t - chute, 24.9, 25.1, 'legs (s)');
    expect(at('insight', 'arrays_open').realT! - at('insight', 'touchdown').t).toBe(960);
  });
});

describe('Mars sky crane and hover (Curiosity, Perseverance, Tianwen-1)', () => {
  const at = (id: string, t: string) => flight(id).s.events.find((e) => e.type === t)!;
  it('Curiosity: heat shield 19.7 s after the chute; Perseverance: 20 s, terrain nav at 4.2 km', () => {
    expectInRange(
      at('curiosity', 'heatshield_sep').t - at('curiosity', 'parachute_deploy').t,
      19.6,
      19.8,
      'Curiosity heat shield (s)',
    );
    expectInRange(at('perseverance', 'terrain_nav').altKm * 1000, 4190, 4210, 'TRN start (m)');
  });
  it('Tianwen-1: stops at about 100 m, holds, then lands', () => {
    const s = flight('tianwen1').s;
    const hov = at('tianwen1', 'hover');
    expectInRange(hov.altKm * 1000, 95, 105, 'hover altitude (m)');
    const held = s.states.filter((x) => x.t > hov.t + 3 && x.t < hov.t + 9);
    expect(held.length).toBeGreaterThan(0);
    expect(held.every((x) => Math.abs(x.altM - hov.altKm * 1000) < 6)).toBe(true);
    expectInRange(s.touchdownVelocityMs, 2, 3, 'touchdown (m/s)');
  });
});

describe('Chandrayaan-3 hovers at 800 m and 150 m, then lands soft', () => {
  it('two hovers at the right altitudes, touchdown under 2 m/s, about the record 19 min', () => {
    const s = flight('chandrayaan3').s;
    const hv = s.events.filter((e) => e.type === 'hover');
    expect(hv).toHaveLength(2);
    expectInRange(hv[0].altKm * 1000, 780, 801, 'first hover (m)');
    expectInRange(hv[1].altKm * 1000, 140, 151, 'second hover (m)');
    expect(s.touchdownVelocityMs).toBeLessThan(2);
    const last = s.states[s.states.length - 1].t;
    expectInRange(last, 1140 * 0.8, 1140 * 1.2, 'descent time (s, ~19 min estimate)');
  });
});
