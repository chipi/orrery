import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import {
  deeperLinks,
  hardwareRows,
  missionRows,
  programSections,
  reuseHeroPath,
  surfaceSiteHref,
} from './program-page';
import { fleetHeroOf, heroOfThumb, siteHeroOf } from './entity-thumb';
import type { ProgramBase, ProgramIndexEntry } from '$types/program';

const rj = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const index = rj<ProgramIndexEntry[]>('static/data/programs/index.json');
const programs = index.map((e) => rj<ProgramBase>(`static/data/programs/${e.id}.json`));

describe('programSections (E1: a section with no rows draws nothing)', () => {
  it('lists Hardware exactly for the programs with a fleet row', () => {
    for (const p of programs) {
      const has = programSections(p).includes('hardware');
      expect(has, p.id).toBe(p.roster.some((r) => r.ref === 'fleet'));
    }
  });

  it('draws no Hardware for Sputnik, which has no fleet row', () => {
    const sputnik = programs.find((p) => p.id === 'sputnik');
    expect(sputnik).toBeDefined();
    expect(programSections(sputnik as ProgramBase)).not.toContain('hardware');
  });

  it('keeps the page order on every program', () => {
    const order = ['missions', 'surface', 'hardware', 'related', 'deeper', 'sources'];
    for (const p of programs) {
      const got = programSections(p);
      expect(got, p.id).toEqual(order.filter((s) => got.includes(s as never)));
    }
  });

  it('draws surface, related and deeper only with rows', () => {
    for (const p of programs) {
      const got = programSections(p);
      expect(got.includes('surface'), p.id).toBe(!!p.surface_sites?.length);
      expect(got.includes('related'), p.id).toBe(!!p.related_programs?.length);
      expect(got.includes('deeper'), p.id).toBe(deeperLinks(p.see_also).length > 0);
    }
  });

  it('puts Missions first and Sources last on a full program', () => {
    const apollo = programs.find((p) => p.id === 'apollo') as ProgramBase;
    const got = programSections(apollo);
    expect(got[0]).toBe('missions');
    expect(got[got.length - 1]).toBe('sources');
    expect(got.indexOf('surface')).toBeLessThan(got.indexOf('hardware'));
    expect(got.indexOf('related')).toBeLessThan(got.indexOf('deeper'));
  });

  it('sorts mission rows by year, undated last, and splits hardware', () => {
    const rows = missionRows([
      { ref: 'mission', linked_id: 'b', year: 1969 },
      { ref: 'fleet', linked_id: 'f' },
      { name: 'ctx' },
      { ref: 'mission', linked_id: 'a', year: 1961 },
    ]);
    expect(rows.map((r) => r.linked_id ?? r.name)).toEqual(['a', 'b', 'ctx']);
    expect(hardwareRows([{ ref: 'fleet', linked_id: 'f' }, { ref: 'mission' }])).toHaveLength(1);
  });
});

describe('deeperLinks (E1: Go deeper drops the program rows)', () => {
  it('removes every program row, which the related rail repeats, and keeps the rest', () => {
    let dropped = 0;
    for (const p of programs) {
      const kept = deeperLinks(p.see_also);
      expect(
        kept.some((s) => s.kind === 'program'),
        p.id,
      ).toBe(false);
      for (const s of p.see_also ?? []) {
        if (s.kind === 'program') {
          dropped++;
          const id = s.href.replace(/^\/programs\//, '');
          expect(p.related_programs ?? [], `${p.id} -> ${id}`).toContain(id);
        }
      }
      expect(kept.length).toBe((p.see_also ?? []).filter((s) => s.kind !== 'program').length);
    }
    expect(dropped).toBeGreaterThan(0);
  });
});

describe('surfaceSiteHref (E1: Earth objects read ?object=, not ?site=)', () => {
  it('uses ?object= for Earth and ?site= for the other worlds', () => {
    expect(surfaceSiteHref('earth', 'iss')).toBe('/earth?object=iss');
    expect(surfaceSiteHref('moon', 'apollo15')).toBe('/moon?site=apollo15');
    expect(surfaceSiteHref('mars', 'jezero')).toBe('/mars?site=jezero');
  });

  it('gives all Earth surface sites on the programs an object link', () => {
    const earth = programs.flatMap((p) =>
      (p.surface_sites ?? []).filter((s) => s.surface === 'earth'),
    );
    expect(earth.length).toBe(9);
    for (const s of earth)
      expect(surfaceSiteHref(s.surface, s.site)).toBe(`/earth?object=${s.site}`);
  });
});

describe('heroes of the rail and hardware cards (E1)', () => {
  it('turns a credit thumb into the full hero path', () => {
    expect(heroOfThumb('/credit-thumbs/images/missions/apollo15/02.1x1.webp')).toBe(
      '/images/missions/apollo15/02.webp',
    );
    expect(heroOfThumb(null)).toBeNull();
    expect(heroOfThumb('/images/x.webp')).toBeNull();
  });

  it('gives every surface site on the programs an existing hero file', () => {
    for (const p of programs) {
      for (const s of p.surface_sites ?? []) {
        const body = s.surface === 'earth' ? 'earth-objects' : s.surface;
        const hero = siteHeroOf(body, s.site);
        expect(hero, `${p.id} ${s.site}`).not.toBeNull();
        expect(existsSync(`static${hero}`), `${p.id} ${s.site} ${hero}`).toBe(true);
      }
    }
  });

  it('gives every hardware row a hero file', () => {
    for (const p of programs) {
      for (const r of hardwareRows(p.roster)) {
        const hero = fleetHeroOf(r.linked_id ?? '');
        expect(hero, `${p.id} ${r.linked_id}`).not.toBeNull();
        expect(existsSync(`static${hero}`), `${p.id} ${hero}`).toBe(true);
      }
    }
  });

  it('resolves an index hero reference', () => {
    expect(reuseHeroPath('missions/apollo11/01')).toBe('/images/missions/apollo11/01.webp');
    expect(reuseHeroPath('fleet/saturn-v/02')).toBe('/images/fleet-galleries/saturn-v/02.webp');
    expect(reuseHeroPath(undefined)).toBeNull();
  });

  it('gives every related program an index entry with a hero', () => {
    const byId = new Map(index.map((e) => [e.id, e]));
    for (const p of programs) {
      for (const id of p.related_programs ?? []) {
        expect(reuseHeroPath(byId.get(id)?.hero), `${p.id} -> ${id}`).not.toBeNull();
      }
    }
  });
});
