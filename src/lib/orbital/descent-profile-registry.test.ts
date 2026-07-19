import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  expandDescentProfile,
  hasDescentProfile,
  DESCENT_MISSION_IDS,
  type RawDescentProfile,
} from './descent-profile-registry';
import { integrateDescent } from './descent-physics';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../');

function loadRaw(missionId: string): RawDescentProfile {
  return JSON.parse(
    readFileSync(resolve(ROOT, `static/data/descent-profiles/${missionId}.json`), 'utf-8'),
  ) as RawDescentProfile;
}

const MVP_IDS = ['apollo11', 'curiosity', 'perseverance', 'viking1'];
const MVP: [string, RawDescentProfile][] = MVP_IDS.map((id) => [id, loadRaw(id)]);
const viking1 = loadRaw('viking1');
const apollo11 = loadRaw('apollo11');

describe('hasDescentProfile gate', () => {
  it('covers the 44 landers + Tier-1 Earth re-entry, and rejects the rest', () => {
    // 37 Moon/Mars/Venus + 7 Phase-2 outer/small-body + Tier-1 Earth-orbit
    // capsules (friendship-7 for the MVP; grows as the ~31-mission set lands).
    expect(DESCENT_MISSION_IDS.size).toBe(75);
    expect(hasDescentProfile('apollo11')).toBe(true);
    expect(hasDescentProfile('curiosity')).toBe(true);
    expect(hasDescentProfile('friendship-7')).toBe(true);
    // Orbiters / flybys must NOT play a descent act.
    expect(hasDescentProfile('juno')).toBe(false);
    expect(hasDescentProfile('voyager1')).toBe(false);
    expect(hasDescentProfile(undefined)).toBe(false);
    expect(hasDescentProfile(null)).toBe(false);
  });
});

describe('MVP descent profiles expand + fly to a soft touchdown', () => {
  for (const [id, raw] of MVP) {
    it(`${id} expands via its archetype and lands survivably`, () => {
      const profile = expandDescentProfile(raw);
      expect(profile.missionId).toBe(id);
      expect(profile.phases.length).toBeGreaterThan(0);
      // The last phase always ends on the ground.
      expect(profile.phases.at(-1)!.endTrigger.type).toBe('ground');

      const s = integrateDescent(profile);
      expect(s.touchdownSuccess).toBe(true);
      expect(s.states.at(-1)!.altM).toBe(0);
      // A descent beat sequence always opens with entry and closes on touchdown.
      expect(s.events[0].type).toBe('entry');
      expect(s.events.at(-1)!.type).toBe('touchdown');
    });
  }

  it('viking1 hands off to its distinct surface-site id', () => {
    // The mission id is viking1 but the surface site is viking1-lander.
    expect(expandDescentProfile(viking1).siteId).toBe('viking1-lander');
  });

  it('rejects an unknown archetype', () => {
    expect(() => expandDescentProfile({ ...apollo11, archetype: 'NOPE' as never })).toThrow();
  });
});
