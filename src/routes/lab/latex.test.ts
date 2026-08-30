/**
 * App-side latex render gate (S3a).
 *
 * Lives here (app-side, not in the kernel) because $lib/katex imports katex,
 * which is forbidden in the physics kernel (no-restricted-imports, RFC-037 §3).
 * The test imports REGISTRY (kernel, pure) and renderKatex (app-side, Node).
 * `throwOnError: true` in renderKatex means a bad LaTeX string fails the build.
 */
import { describe, it, expect } from 'vitest';
import { REGISTRY } from '$lib/physics/registry';
import { renderKatex } from '$lib/katex';

describe('formula latex strings — build-time render gate (S3a)', () => {
  it('every registered formula with a latex field renders without throwing', () => {
    for (const def of REGISTRY.values()) {
      if (!def.latex) continue;
      expect(
        () => renderKatex(def.latex!, true),
        `${def.id}: latex failed to render`,
      ).not.toThrow();
    }
  });

  it('all 8 formulas have a latex string', () => {
    for (const def of REGISTRY.values()) {
      expect(def.latex, `${def.id}: missing latex field`).toBeTruthy();
    }
  });
});
