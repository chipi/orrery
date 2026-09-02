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
  // M6 fail branches (defaults are feasible, so force the reason keys explicitly).
  collectFromResult(REGISTRY.get('solar-escape-velocity')!.compute({ distanceAu: 0 }), add);
  collectFromResult(REGISTRY.get('gravity-assist')!.compute({ vInfKms: -1 }), add);
  collectFromResult(
    REGISTRY.get('oberth-departure-dv')!.compute({ vInfKms: NaN, body: 'earth', altitudeKm: 200 }),
    add,
  );
  // rocket-sizing's single-stage wall (err-wall) only fires above the ceiling — force it.
  collectFromResult(
    REGISTRY.get('rocket-sizing')!.compute({
      payloadKg: 5000,
      deltaVKms: 12,
      ispS: 350,
      structuralFraction: 0.08,
    }),
    add,
  );
  // moon-phase's err-date branch (default date is valid) — force it.
  collectFromResult(REGISTRY.get('moon-phase')!.compute({ dateIso: 'not-a-date' }), add);

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
  // Promote refusal reasons (S5) — emitted by promote.ts, rendered by the Canvas UI.
  ['lab.promote.reason-cycle', 'lab.promote.reason-too-big'].forEach(add);
  // Canvas chrome (S5) — rendered via t() in Canvas.svelte + the /lab view switch.
  [
    'lab.canvas.aria',
    'lab.canvas.add-formula',
    'lab.canvas.blocked-upstream',
    'lab.canvas.blocked-wire',
    'lab.canvas.cancel',
    'lab.canvas.cycle',
    'lab.canvas.drag-handle',
    'lab.canvas.palette-aria',
    'lab.canvas.palette-search',
    'lab.canvas.promote',
    'lab.canvas.promote-confirm',
    'lab.canvas.promote-confirm-aria',
    'lab.canvas.promote-summary',
    'lab.canvas.promote-title',
    'lab.canvas.readonly-note',
    'lab.canvas.select-card',
    'lab.canvas.unwire',
    'lab.canvas.upstream-cycle',
    'lab.canvas.upstream-included',
    'lab.canvas.wire-from',
    'lab.canvas.wire-to',
    'lab.ui.view-canvas',
    'lab.ui.view-notebook',
    'lab.ui.view-switch-aria',
  ].forEach(add);
  // Body-picker option labels — rendered via t(`lab.body.${id}`) in Card.svelte (not a labelKey).
  ['earth', 'moon', 'mars', 'venus', 'mercury'].forEach((b) => add(`lab.body.${b}`));
  // Moon-phase names (G8) — figure.phaseLabelKey is dynamic (date → phase), so assert all 8.
  [
    'new',
    'waxing-crescent',
    'first-quarter',
    'waxing-gibbous',
    'full',
    'waning-gibbous',
    'last-quarter',
    'waning-crescent',
  ].forEach((n) => add(`lab.moon.phase.${n}`));

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

  it('every lab.* key is authored in ALL 14 locale bundles (P1 hole-close · #525)', () => {
    // The en-US-only check let `lab_goal_land_earth_title` ship untranslated ×13 —
    // a missing locale key silently falls back to English, so nothing LOOKED broken.
    // The standing rule is translate-everything-×14; this arms it for every key the
    // lab UI can reach.
    const locales = [
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
    ];
    const keys = collectAllKeys();
    const gaps: string[] = [];
    for (const locale of locales) {
      const bundle = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8')) as Record<
        string,
        string
      >;
      for (const k of keys) {
        if (!(k.replace(/[.-]/g, '_') in bundle)) gaps.push(`${locale}: ${k}`);
      }
    }
    expect(
      gaps,
      `untranslated lab keys (silent en-US fallback):\n${gaps.slice(0, 40).join('\n')}${gaps.length > 40 ? `\n… +${gaps.length - 40} more` : ''}`,
    ).toEqual([]);
  });
});
