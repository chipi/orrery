import { describe, it, expect } from 'vitest';
import { ENCOUNTER_BODIES, encounterScenePos, findEncounterBody } from './encounter-bodies';
import { findFlybyPlanetFromLabel, PLANET_SIZES } from './find-flyby-planet';
import { PLANET_COMPOSITION } from './flyby-camera-plan';

describe('encounter-only flyby bodies (flyby review call 1)', () => {
  it.each([
    ['253 Mathilde — flyby', 'mathilde'],
    ['Grigg-Skjellerup — extended-mission flyby', 'grigg-skjellerup'],
    ['Steins (2867) — asteroid flyby', 'steins'],
    ['Lutetia (21) — asteroid flyby', 'lutetia'],
    ['Dinkinesh — first asteroid flyby', 'dinkinesh'],
    ['Gaspra — first asteroid encounter', 'gaspra'],
    ['Ida + Dactyl — second asteroid encounter', 'ida'],
  ])('%s → %s', (label, id) => {
    expect(findFlybyPlanetFromLabel(label)).toBeNull();
    expect(findEncounterBody(label)?.id).toBe(id);
  });

  it('leaves planet and destination labels alone', () => {
    for (const l of ['Venus #1 — gravity assist', 'Arrokoth flyby', 'Earth flyby', undefined])
      expect(findEncounterBody(l)).toBeNull();
  });

  it('every body composes with an existing small-body preset', () => {
    for (const b of ENCOUNTER_BODIES) {
      expect(PLANET_COMPOSITION[b.standIn]).toBeDefined();
      expect(b.size).toBeGreaterThan(0);
      expect(b.size).toBeLessThanOrEqual(PLANET_SIZES.vesta);
    }
  });

  it('sits off the ship’s peak path, across its track and away from the Sun', () => {
    const peak = { x: 30, z: 0 };
    const after = { x: 30, z: 1 }; // moving +z at 30 units from the Sun
    const p = encounterScenePos(peak, after, 0.4);
    expect(p.z).toBeCloseTo(0, 6); // perpendicular to the track
    expect(p.x).toBeGreaterThan(peak.x); // outward: the camera on the ship's side sees the lit face
    expect(Math.hypot(p.x - peak.x, p.z - peak.z)).toBeCloseTo(0.4 * 2.5, 6);
    // the same body when the ship moves the other way
    expect(encounterScenePos(peak, { x: 30, z: -1 }, 0.4).x).toBeGreaterThan(peak.x);
  });

  it('with no later sample, sits outward along the Sun line', () => {
    const p = encounterScenePos({ x: 0, z: -20 }, null, 0.3);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.z).toBeCloseTo(-20 - 0.75, 6);
  });
});
