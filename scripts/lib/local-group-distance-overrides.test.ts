import { describe, expect, it } from 'vitest';
import { applyToSchematic, applyToSprites } from './local-group-catalogue.mjs';
import {
  LOCAL_GROUP_OVERRIDES,
  overrideSchematic,
  overrideSprites,
} from './local-group-distance-overrides.mjs';

const mcc = new Map([
  ['LMC', { dKpc: 51, uncertain: false }],
  ['SMC', { dKpc: 64, uncertain: false }],
  ['Andromeda', { dKpc: 783, uncertain: false }],
]);

describe('local group distance overrides', () => {
  it('replaces the McConnachie LMC and SMC schematic distance after a refresh', () => {
    const fresh = applyToSchematic(
      [{ id: 'lmc' }, { id: 'smc' }, { id: 'andromeda' }],
      mcc,
    ).members;
    expect(fresh[0].dist_mly).toBe(0.1663);
    const out = overrideSchematic(fresh);
    expect(out[0].dist_mly).toBe(0.1617);
    expect(out[0].catalogue.dist_mly.value).toBe(0.1617);
    expect(out[0].catalogue.dist_mly.bibcode).toBe('2019Natur.567..200P');
    expect(out[1].dist_mly).toBe(0.2037);
    expect(out[1].catalogue.dist_mly.source).toMatch(/Graczyk/);
    expect(out[2]).toBe(fresh[2]);
  });

  it('replaces the sprite distance_kpc with 49.59 and 62.44', () => {
    const fresh = applyToSprites([{ id: 'lmc' }, { id: 'smc' }, { id: 'andromeda' }], mcc).entries;
    expect(fresh[0].distance_kpc).toBe(51);
    const out = overrideSprites(fresh);
    expect(out[0].distance_kpc).toBe(49.59);
    expect(out[1].distance_kpc).toBe(62.44);
    expect(out[1].catalogue.distance_kpc.value).toBe(62.44);
    expect(out[1].catalogue.distance_kpc.record_url).toBe('https://arxiv.org/abs/2010.08754');
    expect(out[2]).toBe(fresh[2]);
  });

  it('never carries an unconfirmed bibcode: each is null or 19 characters', () => {
    for (const ov of Object.values(LOCAL_GROUP_OVERRIDES)) {
      if (ov.bibcode) expect(ov.bibcode).toHaveLength(19);
    }
  });
});
