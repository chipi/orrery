import { describe, it, expect } from 'vitest';
import type { ShowcaseModel } from './showcase/types';
import { SHOWCASE_FAMILY, hasShowcaseModel } from './showcase-index';

describe('showcase index', () => {
  it('lists every showcase model under the family file that defines it (run scripts/build-showcase-index.ts)', () => {
    const families = import.meta.glob<{ SHOWCASE?: Record<string, ShowcaseModel> }>(
      './showcase/*.ts',
      { eager: true },
    );
    const actual: Record<string, string> = {};
    for (const [path, mod] of Object.entries(families)) {
      const family = path.replace('./showcase/', '').replace(/\.ts$/, '');
      for (const id of Object.keys(mod.SHOWCASE ?? {})) actual[id] = family;
    }
    expect({ ...SHOWCASE_FAMILY }).toEqual(actual);
  });

  it('answers for ids with and without a model', () => {
    expect(hasShowcaseModel('curiosity')).toBe(true);
    expect(hasShowcaseModel('no-such-craft')).toBe(false);
    expect(hasShowcaseModel(undefined)).toBe(false);
  });
});
