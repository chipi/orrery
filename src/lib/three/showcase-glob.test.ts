import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

// showcase/ holds model tests next to the models. A page or module that globs showcase/*.ts
// without excluding *.test.ts ships vitest into the browser (it broke /dev/models and the
// /fleet line-up on 2026-11-24).
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.(ts|svelte)$/.test(f) && !/\.test\.ts$/.test(f) ? [p] : [];
  });
}

describe('showcase globs', () => {
  it('every non-test glob of showcase/*.ts excludes the test files', () => {
    const offenders = sources('src').filter((p) => {
      const s = readFileSync(p, 'utf8');
      return (
        /import\.meta\.glob[^(]*\([^)]*showcase\/\*\.ts/.test(s) &&
        !s.includes('showcase/*.test.ts')
      );
    });
    expect(offenders).toEqual([]);
  });
});
