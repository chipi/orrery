import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { preflightRange } from './preflight-range.mjs';

const MAIN = 'origin/main...HEAD';

describe('preflightRange (plan E3: a push checks what it adds)', () => {
  it('diffs against main with no base', () => {
    expect(preflightRange(undefined, () => true)).toEqual({ range: MAIN });
    expect(preflightRange('  ', () => true)).toEqual({ range: MAIN });
  });

  it('diffs only the pushed commits when the base is an ancestor', () => {
    expect(preflightRange('375044dfc29', () => true)).toEqual({ range: '375044dfc29..HEAD' });
  });

  it('falls back to main after a rebase (the base is not an ancestor)', () => {
    const r = preflightRange('375044dfc29', () => false);
    expect(r.range).toBe(MAIN);
    expect(r.note).toMatch(/not an ancestor/);
  });

  it('never puts anything but a sha into a git command', () => {
    let asked = false;
    const r = preflightRange('main; rm -rf /', () => {
      asked = true;
      return true;
    });
    expect(r.range).toBe(MAIN);
    expect(asked).toBe(false);
  });

  // CI checks out one commit (shallow): there is no HEAD~1 to agree with there.
  const hasParent = (() => {
    try {
      execSync('git rev-parse --verify --quiet HEAD~1', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  })();
  it.skipIf(!hasParent)('agrees with git on this checkout: HEAD~1 is an ancestor of HEAD', () => {
    const isAncestor = (sha: string) => {
      try {
        execSync(`git merge-base --is-ancestor ${sha} HEAD`, { stdio: 'pipe' });
        return true;
      } catch {
        return false;
      }
    };
    const parent = execSync('git rev-parse HEAD~1', { encoding: 'utf8' }).trim();
    expect(preflightRange(parent, isAncestor)).toEqual({ range: `${parent}..HEAD` });
  });
});
