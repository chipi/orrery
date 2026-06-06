import { describe, it, expect } from 'vitest';
import { resolveSpacecraftRefs } from './resolve-spacecraft-refs.js';

describe('resolveSpacecraftRefs', () => {
  it('maps SpaceX Crew-N missions to crew-dragon', () => {
    expect(resolveSpacecraftRefs('falcon-9', 'Crew-10', 'Falcon 9 | Crew-10')).toEqual([
      'crew-dragon',
    ]);
    expect(resolveSpacecraftRefs('falcon-9', 'Crew-14', null)).toEqual(['crew-dragon']);
  });

  it('maps Axiom + Polaris private missions to crew-dragon', () => {
    expect(
      resolveSpacecraftRefs('falcon-9', 'Axiom Space Mission 5', 'Falcon 9 | Axiom-5'),
    ).toEqual(['crew-dragon']);
    expect(resolveSpacecraftRefs('falcon-9', 'Polaris Dawn', null)).toEqual(['crew-dragon']);
  });

  it('maps historic Dragon serial-number naming (Cxx) to the right spacecraft type', () => {
    expect(resolveSpacecraftRefs('falcon-9', 'Dragon C206', null)).toEqual(['crew-dragon']);
    expect(resolveSpacecraftRefs('falcon-9', 'Dragon C207.2', null)).toEqual(['crew-dragon']);
    expect(resolveSpacecraftRefs('falcon-9', 'Dragon C212', null)).toEqual(['cargo-dragon-2']);
  });

  it('maps Cargo Dragon CRS-2 / SpX-N missions to cargo-dragon-2', () => {
    expect(resolveSpacecraftRefs('falcon-9', 'Dragon CRS-2 SpX-35', null)).toEqual([
      'cargo-dragon-2',
    ]);
    expect(resolveSpacecraftRefs('falcon-9', 'SpX-30', null)).toEqual(['cargo-dragon-2']);
  });

  it('maps Cygnus regardless of launcher (Antares historic → Falcon 9 NG-22+)', () => {
    expect(resolveSpacecraftRefs(null, 'Cygnus NG-15', 'Antares 230+ | Cygnus NG-15')).toEqual([
      'cygnus-enhanced',
    ]);
    expect(resolveSpacecraftRefs('falcon-9', 'Cygnus CRS-2 NG-22', null)).toEqual([
      'cygnus-enhanced',
    ]);
  });

  it('maps Tianzhou regardless of launcher', () => {
    expect(resolveSpacecraftRefs('long-march-5', 'Tianzhou 7', null)).toEqual(['tianzhou']);
    expect(resolveSpacecraftRefs(null, 'Tianzhou-8', null)).toEqual(['tianzhou']);
  });

  it('maps HTV-X to its H3 launcher', () => {
    expect(resolveSpacecraftRefs('h3', 'HTV-X1', null)).toEqual(['htv-x']);
    expect(resolveSpacecraftRefs('h3', 'HTV-X2', null)).toEqual(['htv-x']);
  });

  it('returns [] when mission_name is empty / no rule matches', () => {
    expect(resolveSpacecraftRefs('falcon-9', null, null)).toEqual([]);
    expect(resolveSpacecraftRefs('falcon-9', 'Starlink V1.0-L20', null)).toEqual([]);
    expect(resolveSpacecraftRefs(null, 'Some unrelated payload', null)).toEqual([]);
  });
});
