/**
 * The illustration register's fail-closed gates (G · #536 · pre-review 6).
 *
 * Three invariants, each structural:
 *  1. Manifest integrity — every entry names a real goal, a real on-disk
 *     file, an authored alt key (×14 enforced by the derived parity check),
 *     and has a provenance record with operator approval; and vice versa —
 *     art with no provenance is a RED BUILD.
 *  2. The Fidelity union stays three-membered: 'illustration' must never
 *     become expressible on the data path.
 *  3. FigureRenderer (the kernel-figure renderer) must never learn about the
 *     illustration module — checked at source level, same class as the
 *     ESLint purity boundary.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { GOALS } from '$lib/physics/registry/goals';
import { allIllustrations } from './illustration';
import type { FigureSpec } from '$lib/physics/spec';

const en = JSON.parse(readFileSync('messages/en-US.json', 'utf8')) as Record<string, string>;
const provenance = (
  JSON.parse(readFileSync('static/data/lab-illustration-provenance.json', 'utf8')) as {
    records: { goalId: string; model: string; generated: string; operator_approved: string }[];
  }
).records;

describe('illustration manifest ↔ provenance (fail-closed)', () => {
  it('every manifest entry: real goal, on-disk file, authored alt key, provenance w/ approval', () => {
    for (const i of allIllustrations()) {
      expect(GOALS.has(i.goalId), `unknown goal '${i.goalId}'`).toBe(true);
      expect(existsSync(`static/${i.file}`), `missing file ${i.file}`).toBe(true);
      expect(i.altKey.replace(/[.-]/g, '_') in en, `unauthored alt key ${i.altKey}`).toBe(true);
      const rec = provenance.find((r) => r.goalId === i.goalId);
      expect(rec, `no provenance record for '${i.goalId}'`).toBeTruthy();
      expect(rec!.operator_approved, `'${i.goalId}' lacks operator approval`).toBeTruthy();
    }
  });

  it('no orphan ASSETS: every shipped goals/*.webp has a manifest entry', () => {
    // The reverse fail-closed direction (holistic MINOR-2): a file that lost
    // its manifest write (e.g. a race) must red the build, not ship silently.
    const files = (() => {
      try {
        return readdirSync('static/images/lab/goals').filter((f) => f.endsWith('.webp'));
      } catch {
        return [];
      }
    })();
    const manifestGoals = new Set(allIllustrations().map((i) => i.goalId));
    for (const f of files) {
      expect(manifestGoals.has(f.replace(/\.webp$/, '')), `orphan asset ${f}`).toBe(true);
    }
  });

  it('no orphan provenance: every record has a manifest entry', () => {
    const manifestGoals = new Set(allIllustrations().map((i) => i.goalId));
    for (const r of provenance) {
      expect(manifestGoals.has(r.goalId), `provenance without manifest: '${r.goalId}'`).toBe(true);
    }
  });
});

describe('the register cannot leak onto the data path', () => {
  it("Fidelity stays three-membered — 'illustration' is not expressible", () => {
    // Type-level lock: assigning 'illustration' to a Fidelity slot must not
    // compile. If someone widens the union, this file goes red at typecheck.
    type Fidelity = NonNullable<FigureSpec['provenance']>['fidelity'];
    const legal: Fidelity[] = ['computed', 'geometric', 'replayed-published'];
    expect(legal).toHaveLength(3);
    // @ts-expect-error 'illustration' must never be a Fidelity
    const illegal: Fidelity = 'illustration';
    void illegal;
  });

  it('FigureRenderer has no path to the illustration module (source-level)', () => {
    const src = readFileSync('src/lib/lab/FigureRenderer.svelte', 'utf8');
    expect(src).not.toMatch(/illustration/i);
  });

  it('the codec grammar carries no illustration fields (documents stay pure data)', () => {
    const codec = readFileSync('src/lib/lab/codec.ts', 'utf8');
    expect(codec).not.toMatch(/illustration/i);
  });
});
