import { describe, it, expect } from 'vitest';
import {
  SCHEMATIC_NAMES,
  SPRITE_NAMES,
  applyToSchematic,
  applyToSprites,
} from './local-group-catalogue.mjs';

const mcc = new Map([
  ['LMC', { dKpc: 51, uncertain: false }],
  ['Andromeda', { dKpc: 783, uncertain: false }],
  ['Pisces II', { dKpc: 182, uncertain: true }],
]);

describe('local group catalogue', () => {
  it('sets dist_mly from McConnachie kpc and adds a matching catalogue entry', () => {
    const { members, skipped } = applyToSchematic(
      [
        { id: 'milky-way', dist_mly: 0 },
        { id: 'lmc', dist_mly: 0.163, x: 1 },
        { id: 'unlisted', dist_mly: 9 },
      ],
      mcc,
    );
    expect(members[1].dist_mly).toBe(0.1663);
    expect(members[1].x).toBe(1);
    expect(members[1].catalogue.dist_mly.value).toBe(0.1663);
    expect(members[1].catalogue.dist_mly.bibcode).toBe('2012AJ....144....4M');
    expect(members[1].catalogue.dist_mly.record_url).toContain('Name=LMC');
    expect(members[0].catalogue).toBeUndefined();
    expect(members[2].dist_mly).toBe(9);
    expect(members[2].catalogue).toBeUndefined();
    expect(skipped).toEqual(['unlisted']);
  });

  it('sets distance_kpc for the sky sprites and flags an uncertain catalogue distance', () => {
    const { entries, skipped } = applyToSprites(
      [
        { id: 'andromeda', distance_kpc: 778 },
        { id: 'pisces', distance_kpc: 1 },
      ],
      mcc,
      { andromeda: 'Andromeda', pisces: 'Pisces II' },
    );
    expect(entries[0].distance_kpc).toBe(783);
    expect(entries[0].catalogue.distance_kpc.value).toBe(783);
    expect(entries[1].catalogue.distance_kpc.note).toContain('flagged uncertain');
    expect(skipped).toEqual([]);
  });

  it('maps every id to a distinct, non-empty catalogue name', () => {
    for (const names of [SCHEMATIC_NAMES, SPRITE_NAMES]) {
      for (const n of Object.values(names)) expect(n.length).toBeGreaterThan(1);
    }
    expect(new Set(Object.values(SCHEMATIC_NAMES)).size).toBe(Object.keys(SCHEMATIC_NAMES).length);
  });
});
