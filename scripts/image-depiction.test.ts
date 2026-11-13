import { describe, expect, it } from 'vitest';
import {
  blessedHeroes,
  collectSlots,
  diffBaseline,
  heroFindings,
  heroId,
  heroesWithoutStatus,
  labelFindings,
  says,
  scopeSet,
  slotKey,
  type HeroRef,
} from './image-depiction';

const prov = (path: string, title: string) => ({ path, title });
const slots = (rows: [string, string, string][]) =>
  collectSlots(
    rows.flatMap(([stem, title]) => [prov(`${stem}.webp`, title), prov(`${stem}.1x1.jpg`, title)]),
    Object.fromEntries(rows.map(([stem, , alt]) => [`${stem}.webp`, alt])),
  );

describe('says (the concept vocabulary)', () => {
  it.each([
    "Artist's concept of Juno",
    'Computer-generated view',
    'A computer graphic of the probe',
    'File:Akatsuki CG01.png',
    'Painting of Pioneer 11',
    'ATV diagram.jpg',
    '3D render of a lander',
  ])('says concept: %s', (t) => expect(says(t)).toBe(true));

  it.each([
    'Rendezvous of two spacecraft in orbit',
    'Full-scale model of the Beresheet lander on a museum stand',
    'Delta II Heavy launch of Opportunity',
    '',
  ])('does not say concept: %s', (t) => expect(says(t)).toBe(false));
});

describe('Rule B: labelFindings', () => {
  const A = '/images/fleet-galleries/juno/04';
  const B = '/images/fleet-galleries/juno/05';
  it('passes a slot whose title and alt both say concept, and one that says neither', () => {
    const s = slots([
      [A, "JUNO (artist's concept)", "Artist's concept of Juno at Jupiter"],
      [B, 'Juno launch', 'Juno lifting off on an Atlas V'],
    ]);
    expect(labelFindings(s, new Set())).toEqual([]);
  });

  it('fails a slot labelled only in the alt text, and one labelled only in the title', () => {
    const s = slots([
      [A, 'File:Juno spacecraft model.png', "Artist's render of Juno"],
      [B, 'Juno Artist Concept', 'Juno above Jupiter'],
    ]);
    expect(labelFindings(s, new Set())).toEqual([
      { key: A, problem: 'alt-says-concept-title-does-not' },
      { key: B, problem: 'title-says-concept-alt-does-not' },
    ]);
  });

  it('passes a false-positive word once the slot is in not_concept', () => {
    const s = slots([
      [A, 'File:Soyuz launch vehicle model.jpg', 'A museum model of Soyuz, painted white and blue'],
    ]);
    expect(labelFindings(s, new Set())).toHaveLength(1);
    expect(labelFindings(s, scopeSet([{ scope: `${A}.webp` }]))).toEqual([]);
  });

  it('ignores surfaces that are not vehicle galleries', () => {
    const s = slots([['/images/planets/mars/06', 'Mars globe', 'Rendered globe of Mars']]);
    expect(s).toEqual([]);
  });
});

describe('Rule A: heroFindings', () => {
  const key = '/images/missions/hera/01';
  const s = slots([[key, "File:Hera in orbit (artist's concept)", "Artist's concept of Hera"]]);
  const hero = (status: string | undefined): HeroRef => ({
    surface: 'missions',
    id: 'hera',
    key,
    status,
  });

  it('fails a concept hero of a vehicle that is not planned-only', () => {
    expect(heroFindings([hero('ACTIVE')], s, new Set(), new Set())).toHaveLength(1);
    expect(heroFindings([hero('CANCELLED')], s, new Set(), new Set())).toHaveLength(1);
  });

  it('exempts status PLANNED by the status field, not by a keyword', () => {
    expect(heroFindings([hero('PLANNED')], s, new Set(), new Set())).toEqual([]);
  });

  it('counts a missing status as not planned-only and lists it', () => {
    expect(heroFindings([hero(undefined)], s, new Set(), new Set())).toHaveLength(1);
    expect(heroesWithoutStatus([hero(undefined), hero('ACTIVE')])).toHaveLength(1);
  });

  it('passes a waived hero, and a hero in not_concept', () => {
    expect(heroFindings([hero('ACTIVE')], s, new Set(), scopeSet([{ scope: key }]))).toEqual([]);
    expect(heroFindings([hero('ACTIVE')], s, scopeSet([{ scope: key }]), new Set())).toEqual([]);
  });

  it('passes a photograph hero', () => {
    const photo = slots([[key, 'Hera cleanroom', 'Hera in a cleanroom']]);
    expect(heroFindings([hero('ACTIVE')], photo, new Set(), new Set())).toEqual([]);
  });
});

describe('baseline and hero lookup', () => {
  it('diffBaseline names a new finding and a cleared one', () => {
    expect(diffBaseline(['a', 'b'], ['b', 'c'])).toEqual({ added: ['a'], cleared: ['c'] });
    expect(diffBaseline(['a'], ['a'])).toEqual({ added: [], cleared: [] });
  });

  it('blessedHeroes reads the entity-thumbs slots and the Worlds sites', () => {
    const heroes = blessedHeroes(
      {
        surfaces: { missions: { dir: 'missions', slots: { hera: '03' } } },
        sites: { moon: { slots: { luna9: 'missions/luna9/02' } }, mars: { slots: {} } },
      },
      { missions: { hera: 'ACTIVE' }, 'site:moon': { luna9: 'FLOWN' } },
    );
    expect(heroes.map(heroId)).toEqual([
      'missions/hera /images/missions/hera/03',
      'site:moon/luna9 /images/missions/luna9/02',
    ]);
    expect(heroes[1].status).toBe('FLOWN');
  });

  it('slotKey strips the extension and the crop suffix', () => {
    expect(slotKey('/images/a/b/01.1x1.jpg')).toBe('/images/a/b/01');
    expect(slotKey('/images/a/b/01.webp')).toBe('/images/a/b/01');
    expect(slotKey('/images/a/b/01')).toBe('/images/a/b/01');
  });
});
