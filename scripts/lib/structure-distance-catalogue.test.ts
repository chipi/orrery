import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
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

  it('is what the four data files hold (run scripts/apply-structure-distance-catalogue.mjs)', () => {
    for (const f of STRUCTURE_FILES) {
      const ms = members(f);
      expect(applyStructureCatalogue(ms)).toEqual(ms);
    }
  });
});
