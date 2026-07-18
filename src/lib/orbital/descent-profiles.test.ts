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
import { expectInRange } from '../test-helpers/expect-close';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../');
const profilePath = (id: string): string =>
  resolve(ROOT, `static/data/descent-profiles/${id}.json`);
const loadRaw = (id: string): RawDescentProfile =>
  JSON.parse(readFileSync(profilePath(id), 'utf-8')) as RawDescentProfile;

/** The three missions whose EDL is an honest failure (impact, not touchdown). */
const CRASHES = new Set(['beresheet', 'schiaparelli', 'mars3']);

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
