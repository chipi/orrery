import { describe, it, expect } from 'vitest';
import {
  findFlybyPlanetFromLabel,
  findClosestPlanetToShip,
  PLANET_SIZES,
} from './find-flyby-planet';
import { earthPos } from '$lib/orbital/mission-arc';

describe('findFlybyPlanetFromLabel', () => {
  it('parses the standard "Planet # — gravity assist" label', () => {
    expect(findFlybyPlanetFromLabel('Venus #1 — gravity assist')).toEqual({
      id: 'venus',
      size: PLANET_SIZES.venus,
    });
    expect(findFlybyPlanetFromLabel('Jupiter — gravity assist')).toEqual({
      id: 'jupiter',
      size: PLANET_SIZES.jupiter,
    });
  });

  it('parses the orbit-insertion label (Cassini Saturn-OI)', () => {
    expect(findFlybyPlanetFromLabel('Saturn orbit insertion')).toEqual({
      id: 'saturn',
      size: PLANET_SIZES.saturn,
    });
  });

  it('handles Earth labels correctly, including the LEGA combined-body case', () => {
    expect(findFlybyPlanetFromLabel('Earth — gravity assist')?.id).toBe('earth');
    expect(findFlybyPlanetFromLabel('Earth-Moon LEGA — first-ever lunar gravity assist')?.id).toBe(
      'earth',
    );
    expect(findFlybyPlanetFromLabel('Earth #3 — gravity assist')?.id).toBe('earth');
  });

  it('is case-insensitive', () => {
    expect(findFlybyPlanetFromLabel('VENUS')?.id).toBe('venus');
    expect(findFlybyPlanetFromLabel('jupiter')?.id).toBe('jupiter');
    expect(findFlybyPlanetFromLabel('mArS')?.id).toBe('mars');
  });

  it('returns null for missing / empty labels', () => {
    expect(findFlybyPlanetFromLabel(undefined)).toBeNull();
    expect(findFlybyPlanetFromLabel(null)).toBeNull();
    expect(findFlybyPlanetFromLabel('')).toBeNull();
  });

  it('returns null when no planet keyword appears (other small bodies)', () => {
    // Gaspra + Ida + Steins not yet wired; remain null.
    expect(findFlybyPlanetFromLabel('Asteroid Gaspra — flyby')).toBeNull();
    expect(findFlybyPlanetFromLabel('Ida — flyby')).toBeNull();
    expect(findFlybyPlanetFromLabel('Steins — asteroid flyby')).toBeNull();
  });

  it('resolves #341 Batch 5 small bodies (DART + Lucy + Hayabusa-1 destinations)', () => {
    // DART system — Dimorphos kinetic-impact target + Didymos parent.
    expect(findFlybyPlanetFromLabel('Dimorphos kinetic impact')).toEqual({
      id: 'dimorphos',
      size: PLANET_SIZES.dimorphos,
    });
    expect(findFlybyPlanetFromLabel('Didymos system approach')).toEqual({
      id: 'didymos',
      size: PLANET_SIZES.didymos,
    });
    // Lucy itinerary — one bonus main-belt + 7 Trojans.
    expect(findFlybyPlanetFromLabel('Donaldjohanson (main-belt bonus)')?.id).toBe('donaldjohanson');
    expect(findFlybyPlanetFromLabel('Eurybates approach (L4 Trojan)')?.id).toBe('eurybates');
    expect(findFlybyPlanetFromLabel('Polymele')?.id).toBe('polymele');
    expect(findFlybyPlanetFromLabel('Leucus')?.id).toBe('leucus');
    expect(findFlybyPlanetFromLabel('Orus')?.id).toBe('orus');
    expect(findFlybyPlanetFromLabel('Patroclus-Menoetius binary (L5)')?.id).toBe('patroclus');
    expect(findFlybyPlanetFromLabel('Menoetius — L5 binary secondary')?.id).toBe('menoetius');
    // Hayabusa-1 target.
    expect(findFlybyPlanetFromLabel('Itokawa station-keeping')).toEqual({
      id: 'itokawa',
      size: PLANET_SIZES.itokawa,
    });
  });

  it('resolves comet flyby labels (Giotto-Halley + Rosetta-67P)', () => {
    expect(findFlybyPlanetFromLabel('Halley — closest comet encounter')).toEqual({
      id: 'halley',
      size: 0.35,
    });
    expect(
      findFlybyPlanetFromLabel('67P/Churyumov–Gerasimenko rendezvous + Philae landing'),
    ).toEqual({ id: '67p', size: 0.3 });
  });

  it('resolves Pluto + Arrokoth labels (NH 2015 + 2019 encounters)', () => {
    expect(findFlybyPlanetFromLabel('Pluto — first close encounter')).toEqual({
      id: 'pluto',
      size: 0.9,
    });
    expect(findFlybyPlanetFromLabel('Arrokoth (2014 MU69) — Kuiper Belt flyby')).toEqual({
      id: 'arrokoth',
      size: 0.5,
    });
  });

  it('matches every PlanetId in the standard list', () => {
    for (const id of [
      'mercury',
      'venus',
      'earth',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
    ] as const) {
      const out = findFlybyPlanetFromLabel(`${id} flyby`);
      expect(out?.id).toBe(id);
      expect(out?.size).toBe(PLANET_SIZES[id]);
    }
  });
});

describe('findClosestPlanetToShip', () => {
  // earthPos at simDay=0 is the J2000 epoch + dep_day=0 sample. We
  // assert relative-distance behaviour rather than specific positions
  // (the actual numbers come from mission-arc's earthPos /
  // destinationPos and are covered by their own tests).

  it('returns null when no body is within 3 AU', () => {
    // Position far from every planet's orbit (40 AU out is past Pluto)
    expect(findClosestPlanetToShip({ x: 40, z: 0 }, 0)).toBeNull();
  });

  it('returns the closest planet within 3 AU', () => {
    // At earthPos's location, Earth should be the nearest.
    // (Don't assert specific xz; just confirm the resolver picks SOME
    // valid planet ID when the ship is in inner solar system.)
    const result = findClosestPlanetToShip({ x: 1.0, z: 0 }, 0);
    expect(result).not.toBeNull();
    expect(['mercury', 'venus', 'earth', 'mars']).toContain(result?.id);
  });

  it('includes Earth as a candidate (it is NOT in CANDIDATES but checked separately)', () => {
    // Sentinel test: if a future refactor removes Earth from the
    // resolver, this fails (no shipPos in the inner solar system
    // would ever return earth).
    let foundEarth = false;
    for (let day = 0; day < 365; day += 30) {
      // Sample ship at exactly Earth's position at varying epochs
      const ePos = earthPos(day);
      const result = findClosestPlanetToShip(ePos, day);
      if (result?.id === 'earth') {
        foundEarth = true;
        break;
      }
    }
    expect(foundEarth, 'Earth should be reachable as a closest-planet result').toBe(true);
  });
});
