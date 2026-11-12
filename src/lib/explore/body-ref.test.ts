import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PLANETS } from '$lib/explore-scene';
import { SMALL_BODIES, smallBodyById } from './small-bodies';
import {
  beltFocusFrame,
  chipForSmallBodyType,
  chipOf,
  focusFrameFor,
  isBodyHidden,
  isBodyInScene,
  resolveBodyRef,
  scenePlanetIdOf,
  type BodyChip,
  type BodyRef,
  type SceneMembers,
  type SmallBodyType,
} from './body-ref';

const planetIds = new Set(PLANETS.map((p) => p.id));
const membership = {
  isPlanet: (id: string) => planetIds.has(id),
  isSmallBody: (id: string) => smallBodyById.has(id),
};
const scene: SceneMembers = {
  planets: planetIds,
  smallBodies: new Set(SMALL_BODIES.map((b) => b.id)),
  moons: new Set(PLANETS.flatMap((p) => (p.satellites ?? []).map((s) => `${p.id}:${s.id}`))),
};
const typeOf = (id: string): SmallBodyType | undefined => smallBodyById.get(id)?.type;
const allOn: Record<BodyChip, boolean> = {
  planets: true,
  dwarfs: true,
  comets: true,
  interstellar: true,
};

describe('resolveBodyRef', () => {
  it('sun, the planets, a small body, a moon, a belt', () => {
    expect(resolveBodyRef('sun', membership)).toEqual({ kind: 'sun', id: 'sun' });
    for (const id of [
      'mercury',
      'venus',
      'earth',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
    ])
      expect(resolveBodyRef(id, membership)).toEqual({ kind: 'planet', id });
    expect(resolveBodyRef('ceres', membership)).toEqual({ kind: 'small-body', id: 'ceres' });
    expect(resolveBodyRef('jupiter:io', membership)).toEqual({
      kind: 'moon',
      id: 'io',
      parent: 'jupiter',
    });
    expect(resolveBodyRef('asteroid-belt', membership)).toEqual({ kind: 'belt', id: 'asteroid' });
    expect(resolveBodyRef('belt:kuiper', membership)).toEqual({ kind: 'belt', id: 'kuiper' });
  });

  it('Pluto is one body with one panel, the small-body panel, however it is reached', () => {
    expect(resolveBodyRef('pluto', membership)).toEqual({ kind: 'small-body', id: 'pluto' });
  });

  it('unknown, empty and null ids give null', () => {
    expect(resolveBodyRef('nibiru', membership)).toBeNull();
    expect(resolveBodyRef('', membership)).toBeNull();
    expect(resolveBodyRef(null, membership)).toBeNull();
    expect(resolveBodyRef('nibiru:io', membership)).toBeNull();
  });
});

describe('scenePlanetIdOf', () => {
  it('a planet is drawn as itself and Pluto, a small body, as the planet-style mesh', () => {
    expect(scenePlanetIdOf({ kind: 'planet', id: 'mars' })).toBe('mars');
    expect(scenePlanetIdOf({ kind: 'small-body', id: 'pluto' })).toBe('pluto');
    expect(scenePlanetIdOf({ kind: 'small-body', id: 'ceres' })).toBeNull();
    expect(scenePlanetIdOf({ kind: 'sun', id: 'sun' })).toBeNull();
  });
});

describe('chipOf', () => {
  it('maps every small-body type: asteroids and Arrokoth ride DWARFS', () => {
    expect(chipForSmallBodyType('dwarf')).toBe('dwarfs');
    expect(chipForSmallBodyType('asteroid')).toBe('dwarfs');
    expect(chipForSmallBodyType('kbo')).toBe('dwarfs');
    expect(chipForSmallBodyType('comet')).toBe('comets');
    expect(chipForSmallBodyType('interstellar')).toBe('interstellar');
  });

  it('every catalogued small body but Pluto has a chip of its own type', () => {
    for (const b of SMALL_BODIES) {
      const chip = chipOf({ kind: 'small-body', id: b.id }, typeOf);
      expect(chip, b.id).toBe(b.id === 'pluto' ? 'planets' : chipForSmallBodyType(b.type));
    }
  });

  it('planets and moons ride PLANETS; the Sun and the belts ride no chip', () => {
    expect(chipOf({ kind: 'planet', id: 'earth' }, typeOf)).toBe('planets');
    expect(chipOf({ kind: 'moon', id: 'io', parent: 'jupiter' }, typeOf)).toBe('planets');
    expect(chipOf({ kind: 'sun', id: 'sun' }, typeOf)).toBeNull();
    expect(chipOf({ kind: 'belt', id: 'asteroid' }, typeOf)).toBeNull();
  });

  it('isBodyHidden follows the chip', () => {
    const ceres: BodyRef = { kind: 'small-body', id: 'ceres' };
    expect(isBodyHidden(ceres, allOn, typeOf)).toBe(false);
    expect(isBodyHidden(ceres, { ...allOn, dwarfs: false }, typeOf)).toBe(true);
    expect(isBodyHidden(ceres, { ...allOn, comets: false }, typeOf)).toBe(false);
    expect(
      isBodyHidden(
        { kind: 'moon', id: 'io', parent: 'jupiter' },
        { ...allOn, planets: false },
        typeOf,
      ),
    ).toBe(true);
    expect(isBodyHidden({ kind: 'sun', id: 'sun' }, { ...allOn, planets: false }, typeOf)).toBe(
      false,
    );
  });
});

describe('isBodyInScene over the ruler residents', () => {
  const dir = 'i18n-src/en-US/orbit-regimes-explore';
  const residents = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .flatMap(
      (f) =>
        (JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) as { residents?: { id: string }[] })
          .residents ?? [],
    )
    .map((r) => r.id);

  it('20 residents: 16 resolve to a scene object, Pallas, Hygiea, Quaoar and Sedna do not', () => {
    expect(residents).toHaveLength(20);
    const inScene = residents.filter((id) => {
      const ref = resolveBodyRef(id, membership);
      return ref !== null && isBodyInScene(ref, scene);
    });
    expect(inScene).toHaveLength(16);
    expect(residents.filter((id) => !inScene.includes(id)).sort()).toEqual([
      'hygiea',
      'pallas',
      'quaoar',
      'sedna',
    ]);
  });

  it('a moon is in the scene only under its own parent', () => {
    expect(isBodyInScene({ kind: 'moon', id: 'io', parent: 'jupiter' }, scene)).toBe(true);
    expect(isBodyInScene({ kind: 'moon', id: 'io', parent: 'saturn' }, scene)).toBe(false);
    expect(isBodyInScene({ kind: 'moon', id: 'io' }, scene)).toBe(false);
  });

  it('both belts are in the scene, an unknown belt is not', () => {
    expect(isBodyInScene({ kind: 'belt', id: 'asteroid' }, scene)).toBe(true);
    expect(isBodyInScene({ kind: 'belt', id: 'kuiper' }, scene)).toBe(true);
    expect(isBodyInScene({ kind: 'belt', id: 'oort' }, scene)).toBe(false);
  });
});

describe('focus frames', () => {
  it('a planet lands at 8 radii and zooms 1.5 to 50 radii', () => {
    expect(focusFrameFor('planet', 5.2)).toEqual({ r: 5.2 * 8, minR: 5.2 * 1.5, maxR: 5.2 * 50 });
    expect(focusFrameFor('moon', 1)).toEqual({ r: 8, minR: 1.5, maxR: 50 });
  });

  it('a small body lands at 14 radii: 25 units for a dwarf, 17 for a comet', () => {
    expect(focusFrameFor('small-body', 1.8).r).toBeCloseTo(25.2, 6);
    expect(focusFrameFor('small-body', 1.2).r).toBeCloseTo(16.8, 6);
    expect(focusFrameFor('small-body', 1.8)).toMatchObject({ minR: 4, maxR: 600 });
  });

  it('a belt lands inside the heliocentric zoom range', () => {
    for (const b of ['asteroid', 'kuiper'] as const) {
      const f = beltFocusFrame(b);
      expect(f.r).toBeGreaterThan(f.minR);
      expect(f.r).toBeLessThan(f.maxR);
    }
    expect(beltFocusFrame('asteroid').r).toBe(570);
    expect(beltFocusFrame('kuiper').r).toBe(1430);
  });
});
