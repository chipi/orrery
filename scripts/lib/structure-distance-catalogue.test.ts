import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { catalogueLabel } from '../../src/lib/catalogue';
import {
  applyStructureCatalogue,
  STRUCTURE_DISTANCE_SOURCES,
  STRUCTURE_FILES,
} from './structure-distance-catalogue.mjs';

const members = (file: string) =>
  JSON.parse(fs.readFileSync(`static/data/universe/${file}.json`, 'utf8')).members as {
    id: string;
    dist_mpc: number;
    catalogue?: { dist_mpc?: { value: number; source: string; record_url: string } };
  }[];

describe('applyStructureCatalogue', () => {
  it('sources a listed member with its own distance and leaves the others without an entry', () => {
    const out = applyStructureCatalogue([
      { id: 'maffei-group', dist_mpc: 5.7 },
      { id: 'local-group', dist_mpc: 0, catalogue: { dist_mpc: { value: 0 } } },
    ]);
    expect(out[0].catalogue?.dist_mpc).toMatchObject({
      value: 5.7,
      bibcode: null,
      record_url: 'https://arxiv.org/abs/1901.05981',
    });
    expect(out[0].catalogue?.dist_mpc).not.toHaveProperty('note');
    expect(out[1]).toEqual({ id: 'local-group', dist_mpc: 0 });
  });

  it('lists only ids that are in a structure file, with an https arXiv record', () => {
    const ids = new Set(STRUCTURE_FILES.flatMap((f) => members(f).map((m) => m.id)));
    for (const [id, s] of Object.entries(STRUCTURE_DISTANCE_SOURCES)) {
      expect(ids.has(id), id).toBe(true);
      expect(s.record_url, id).toMatch(/^https:\/\/arxiv\.org\/abs\//);
    }
  });

  it('shows an author-and-year label on the page, not a first author cut at a comma', () => {
    expect(Object.values(STRUCTURE_DISTANCE_SOURCES).map((s) => catalogueLabel(s.source))).toEqual([
      'Wu et al. 2014',
      'Karachentsev et al. 2007',
      'Karachentsev et al. 2021',
      'Anand et al. 2019',
      'Anand et al. 2018',
      'Müller et al. 2017',
      'Karachentsev et al. 2003',
      'Lee and Jang 2013',
      'Trentham et al. 2001',
      'Mei et al. 2007',
      'Woudt and Kraan-Korteweg 2000',
      'Durret et al. 2015',
      'Fleenor et al. 2005',
      'Proust et al. 2006',
      'Gott et al. 2005',
    ]);
  });

  it('has notes a reader can read: no process wording, and no entry the review found unverified', () => {
    for (const [id, s] of Object.entries(STRUCTURE_DISTANCE_SOURCES))
      expect((s as { note?: string }).note ?? '', id).not.toMatch(/reviewer/i);
    expect(STRUCTURE_DISTANCE_SOURCES).not.toHaveProperty('centaurus-cluster');
  });

  it('is what the four data files hold (run scripts/apply-structure-distance-catalogue.mjs)', () => {
    for (const f of STRUCTURE_FILES) {
      const ms = members(f);
      expect(applyStructureCatalogue(ms)).toEqual(ms);
    }
  });
});
