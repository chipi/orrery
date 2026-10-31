import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { I18N_SPLIT_TREES, i18nChunkFile, i18nChunkOf } from './i18n-chunks.js';

describe('i18n chunks', () => {
  it('maps a key to its top-level tree when split, else to core', () => {
    expect(i18nChunkOf('science/orbits/vis-viva.json')).toBe('science');
    expect(i18nChunkOf('missions/mars/curiosity.json')).toBe('missions');
    expect(i18nChunkOf('planets/mars.json')).toBe('core');
    expect(i18nChunkOf('sun.json')).toBe('core');
    expect(i18nChunkFile('pt-BR', 'fleet')).toBe('pt-BR.fleet.json');
  });

  // The built chunks (scripts/build-i18n-bundles.mjs) partition the whole bundle.
  const dir = 'static/data/i18n';
  it.skipIf(!existsSync(`${dir}/de.json`))(
    'the built chunks of a locale hold exactly the whole bundle, each key where i18nChunkOf says',
    () => {
      const whole = JSON.parse(readFileSync(`${dir}/de.json`, 'utf8')) as Record<string, unknown>;
      const seen = new Set<string>();
      for (const chunk of [...I18N_SPLIT_TREES, 'core']) {
        const part = JSON.parse(readFileSync(`${dir}/${i18nChunkFile('de', chunk)}`, 'utf8'));
        for (const [key, value] of Object.entries(part)) {
          expect(i18nChunkOf(key)).toBe(chunk);
          expect(value).toEqual(whole[key]);
          seen.add(key);
        }
      }
      expect([...seen].sort()).toEqual(Object.keys(whole).sort());
    },
  );
});
