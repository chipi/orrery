import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { REGISTRY, defaultInputs } from '$lib/physics/registry';
import { GOALS } from '$lib/physics/registry/goals';
import type { FormulaResult } from '$lib/physics/spec';

/**
 * Resolver key-parity (S3d review M2). The `t` resolver maps a dotted registry key
 * to a flat snake_case paraglide id via `replace(/[.-]/g, '_')`. If a referenced key
 * has no authored en-US message, the resolver falls through and renders the RAW key
 * to the user — exactly the bug that shipped for `lab.f.projectile.maxHeight` (a
 * camelCase key the resolver couldn't map). This walks every lab.* key the UI can
 * reach — including fail-branch reason keys and figure labels — and asserts each one
 * resolves. As S3e/S4 add formulas, this catches an unauthored key at test time.
 */
const en = JSON.parse(readFileSync('messages/en-US.json', 'utf8')) as Record<string, string>;
const resolves = (key: string): boolean => key.replace(/[.-]/g, '_') in en;

function collectFromResult(res: FormulaResult, add: (k?: string) => void): void {
  res.assumptions.forEach(add);
  if (!res.status.ok) add(res.status.reasonKey);
  const f = res.figure as Record<string, unknown> | undefined;
  if (!f) return;
  (f.assumptions as string[] | undefined)?.forEach(add);
  add((f.x as { labelKey?: string })?.labelKey);
  add((f.y as { labelKey?: string })?.labelKey);
  add(f.bodyLabelKey as string | undefined);
  (f.series as { labelKey?: string }[] | undefined)?.forEach((s) => add(s.labelKey));
  (f.marks as { labelKey?: string }[] | undefined)?.forEach((m) => add(m.labelKey));
  (f.vectors as { labelKey?: string }[] | undefined)?.forEach((v) => add(v.labelKey));
  (f.segments as { labelKey?: string }[] | undefined)?.forEach((s) => add(s.labelKey));
}

function collectAllKeys(): string[] {
  const keys = new Set<string>();
  const add = (k?: string): void => {
    if (k) keys.add(k);
  };

  for (const def of REGISTRY.values()) {
    add(def.titleKey);
    for (const input of def.inputs) {
      add(input.labelKey);
      input.enumValues?.forEach((e) => add(e.labelKey));
    }
    def.outputs.forEach((o) => add(o.labelKey));
    def.selectionOutputs?.forEach((o) => add(o.labelKey));
    collectFromResult(def.compute(defaultInputs(def)), add);
  }

  // Fail branches — the reason keys only surface when a formula is infeasible.
  collectFromResult(REGISTRY.get('tsiolkovsky')!.compute({ ispS: 350, m0Kg: 1, mfKg: 1 }), add);
  collectFromResult(
    REGISTRY.get('twr')!.compute({ thrustN: 5e6, massKg: 1e6, body: 'earth' }),
    add,
  );
  collectFromResult(
    REGISTRY.get('delta-v-margin')!.compute({ capacityKms: 5, requiredKms: 9.4 }),
    add,
  );

  for (const goal of GOALS.values()) {
    add(goal.titleKey);
    goal.path.forEach((s) => add(s.narrativeKey));
    // The practical-connection panel (v0.9) — why / hook / next + every link label.
    const c = goal.connection;
    if (c) {
      add(c.whyKey);
      add(c.hookKey);
      add(c.nextKey);
      c.links.forEach((l) => add(l.labelKey));
    }
  }

  // Fidelity register — built by concatenation in FigureRenderer, so it never
  // appears as a whole-string literal; assert the three explicitly.
  ['lab.fidelity.computed', 'lab.fidelity.geometric', 'lab.fidelity.replayed'].forEach(add);
  // Connection-panel chrome — rendered via t() in Notebook.svelte, not a data literal.
  ['lab.conn.heading', 'lab.conn.hook-label', 'lab.conn.next-label', 'lab.conn.aria'].forEach(add);

  return [...keys].filter((k) => k.startsWith('lab.'));
}

describe('lab i18n · resolver key parity', () => {
  it('every registry/goal/figure lab.* key resolves to an authored en-US message', () => {
    const missing = collectAllKeys().filter((k) => !resolves(k));
    expect(
      missing,
      `unauthored lab keys (would render raw to the user): ${missing.join(', ')}`,
    ).toEqual([]);
  });
});
