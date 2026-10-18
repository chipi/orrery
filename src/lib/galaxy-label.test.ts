import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { galaxyLabel } from './galaxy-label';
import data from '../../static/data/local-group-galaxies.json';

describe('galaxyLabel', () => {
  it('has a message for every Local Group galaxy; English equals the data name', () => {
    for (const g of data.entries) expect(galaxyLabel(g)).toBe(g.name);
  });

  it('falls back to the data name for a galaxy with no message', () => {
    expect(galaxyLabel({ id: 'not-a-galaxy', name: 'Nowhere Dwarf' })).toBe('Nowhere Dwarf');
  });

  it('every locale translates the label; named bodies take the glossary form', () => {
    const ru = JSON.parse(readFileSync('messages/ru.json', 'utf8'));
    const de = JSON.parse(readFileSync('messages/de.json', 'utf8'));
    // native-terms.json star:"Andromeda Galaxy" ru = "Галактика Андромеды"
    expect(ru.galaxy_name_andromeda).toBe('Галактика Андромеды (M31)');
    expect(de.galaxy_name_ursa_minor_dwarf).toBe('Ursa-Minor-Zwerggalaxie');
    for (const loc of [
      'ar',
      'de',
      'es',
      'fr',
      'hi',
      'it',
      'ja',
      'ko',
      'nl',
      'pt-BR',
      'ru',
      'sr-Cyrl',
      'zh-CN',
    ]) {
      const msgs = JSON.parse(readFileSync(`messages/${loc}.json`, 'utf8'));
      for (const g of data.entries)
        expect(msgs[`galaxy_name_${g.id.replace(/-/g, '_')}`]).toBeTruthy();
    }
  });
});
