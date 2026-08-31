/**
 * The Physics-Lab contract types (S2a · RFC-037 §4/§5 + Amendment 01) — FROZEN
 * after two Fable-5 pre-freeze rounds (docs/wip/2026-08-29-s2-contracts-draft.md).
 *
 * These are the shapes the whole flagship shares: the registry, the Lab views,
 * the MCP server, and the `.orrlab.json` document format. They live in the kernel
 * (pure) because kernel formulas EMIT `FigureSpec`/`FormulaResult`. Changing any
 * shape here is a contract re-freeze.
 *
 * Text discipline: every user-facing string is an i18n message KEY (`*Key`),
 * resolved from the paraglide bundle — EXCEPT user-authored free text (Notebook
 * `title`, `Card.note`). Provenance discipline: kernel formulas emit only
 * `fidelity: 'computed'`; `geometric`/`replayed-published` come from app-side
 * producers. The honesty line, made structural.
 */
import type { Unit, Quantity } from './util/units';

export type { Unit, Quantity } from './util/units';

// Body identifiers the kernel knows. Per-body gravity resolves via
// `util/planet-stats` (`mechanics/bodies.bodyGravityMs2`), which THROWS on an
// unknown id — so a `FieldSpec.bodyIds` list must contain only resolvable ids
// (guarded by the body-resolve test in registry/index.test.ts). Out-of-domain
// inputs from an untrusted source (the MCP, S4) must be rejected fail-honest.
export type BodyId = string;

// ─── Inputs / outputs ───────────────────────────────────────────────────────

/** A typed input field: drives the slider UI, the derived MCP JSON-Schema, and caps. */
export interface FieldSpec {
  key: string;
  labelKey: string; // i18n
  units: Unit;
  kind: 'number' | 'enum' | 'body' | 'date'; // 'date' = ISO string, adapter → JD
  default: number | string;
  min?: number;
  max?: number;
  step?: number; // number
  enumValues?: { value: string; labelKey: string }[]; // labeled — no raw untranslated ids
  bodyIds?: BodyId[]; // 'body': per-formula domain (Lambert ≠ free-fall)
  serverCap?: number; // MCP abuse bound (e.g. steps ≤ N)
  injected?: true; // adapter-owned (e.g. fresh TLE) — NOT an MCP user param
}

/** A declared output — makes wires + MCP result docs statically checkable. */
export interface OutputSpec {
  key: string;
  labelKey: string;
  units: Unit;
}

// ─── Formula definition + result ────────────────────────────────────────────

/**
 * The single source the palette, all views, and the MCP tool generator derive
 * from. One place to add a formula.
 *
 * Invariant (S2c test): keys are UNIQUE across `outputs ∪ selectionOutputs`, so
 * merging picks into the output namespace on recompute is unambiguous. String
 * picks (body/enum) declare `units: ''` and match a wire's target by
 * `FieldSpec.kind`; numeric picks match by `units`.
 */
export interface FormulaDef<I = Record<string, number | string>> {
  id: string;
  titleKey: string;
  domain:
    'ephemeris' | 'transfer' | 'ascent' | 'descent' | 'propulsion' | 'satellite' | 'mechanics';
  tier: number; // difficulty rank (concept graph)
  prereqs: string[]; // FormulaDef ids that should precede
  inputs: FieldSpec[];
  outputs: OutputSpec[]; // static; a test asserts compute() keys align (see FormulaResult)
  selectionOutputs?: OutputSpec[]; // interactive-figure picks (porkchop cell, sky-chart body …)
  staleAfterDays?: number; // data-staleness bound for `epochAgeDays`
  citationKey?: string; // /science deep-link
  latex?: string; // LaTeX source for the equation card (server-rendered at build, ADR-034)
  compute(inputs: I): FormulaResult;
}

export type Registry = ReadonlyMap<string, FormulaDef>;

export interface FormulaResult {
  /** keys ⊆ FormulaDef.outputs[].key always; ≡ when status.ok is true. */
  values: Record<string, Quantity>;
  figure?: FigureSpec;
  /** fail-honest: infeasible carries an i18n reason key; `values` may be partial when !ok. */
  status: { ok: true } | { ok: false; reasonKey: string };
  /** i18n keys naming what the model ignores (the teaching-honesty payload). */
  assumptions: string[];
  /** data staleness (TLE/ephemeris); the bound is FormulaDef.staleAfterDays. */
  epochAgeDays?: number;
}

// ─── FigureSpec + provenance ────────────────────────────────────────────────

export interface Vec2 {
  x: number;
  y: number;
}

export type Fidelity = 'computed' | 'geometric' | 'replayed-published';

/** Kernel-emitted figures are ALWAYS `fidelity: 'computed'`. */
export interface Provenance {
  fidelity: Fidelity;
  module: string;
}

export interface Annotation {
  at: Vec2;
  labelKey: string;
  kind: 'point' | 'vector' | 'region' | 'note';
}

export interface Axis {
  labelKey: string;
  units: Unit;
  scale?: 'linear' | 'log';
}

/**
 * The FROZEN public surface every FigureSpec carries. Renderers MUST fall back
 * to an honest "provenance + assumptions + unsupported figure" render for an
 * unknown `kind` (degrade, never crash), so old documents / MCP clients survive.
 * `figure.assumptions ⊆ result.assumptions` (S2a test).
 */
export interface FigureBase {
  provenance: Provenance;
  assumptions: string[];
}

export type FigureSpec = FigureBase &
  (
    | {
        kind: 'curve';
        x: Axis;
        y: Axis;
        series: { labelKey?: string; points: Vec2[] }[];
        marks?: Annotation[];
      }
    | {
        kind: 'force-diagram';
        bodyLabelKey: string;
        vectors: { labelKey: string; dir: Vec2; magN: number }[];
      }
    | { kind: 'dv-waterfall'; segments: { labelKey: string; dv: number; kind: 'gain' | 'cost' }[] }
    | {
        // `frame` gained 'geocentric' at M2 (LEO→Moon Hohmann) — the heliocentric-only
        // typing was an M1-era gap; additive union extension, no shape break.
        kind: 'transfer-ellipse';
        frame: 'heliocentric' | 'geocentric';
        bodies: { labelKey: string; at: Vec2 }[];
        arc: Vec2[];
        marks: Annotation[];
      }
    // `tofDays` = Time-of-Flight (the kernel grid rows are TOF, not arrival dates).
    | { kind: 'porkchop'; depDays: number[]; tofDays: number[]; grid: number[][]; units: Unit }
    // Moon-phase disc (Family B / G8) — the lit fraction + waxing/waning + the phase name.
    | { kind: 'moon-phase'; illuminatedFraction: number; waxing: boolean; phaseLabelKey: string }
    // Orbit-shell diagram (Family B / G10 "choose an orbit") — the body drawn to scale with the
    // satellite's orbit ring at `altitudeKm` and an optional reference ring (e.g. geostationary).
    // Values (period/speed) ride the figure as readouts, so it needs no extra i18n text.
    | {
        kind: 'orbit';
        bodyRadiusKm: number;
        altitudeKm: number;
        refAltitudeKm?: number; // a reference ring (geostationary), drawn faint + dashed
        periodMin: number;
        speedKms: number;
        bodyLabelKey: string;
      }
    // Additive per goal (renderers demand-driven); typed now so the union is stable.
    | { kind: 'ground-track' | 'sky-chart' | 'entry-corridor' | 'cislunar-eci' }
  );

// ─── Goal / GoalStep (curriculum) + Card / Notebook (user documents) ────────

export interface Goal {
  id: string;
  titleKey: string; // authored curriculum text — i18n-keyed, translated ×14
  family: 'spaceflight' | 'observe' | 'cross-cutting';
  tier: number;
  prereqs: string[]; // Goal ids
  path: GoalStep[];
  connection?: Connection; // v0.9 reality-punch — the "so what" panel (additive, optional)
}

/**
 * The practical-connection ("reality punch") layer — the panel a Goal renders AFTER
 * its ladder, linking the lesson's CONCLUSION to the real missions, vehicles, programs
 * and launch sites in Orrery that live this physics, plus the citizen-science hook that
 * makes it click. Additive/optional like `GoalStep.presetInputs`: a Goal without one
 * renders no panel. Every string is an i18n KEY; every `href` is an INTERNAL Orrery route
 * (a leading-'/' path + optional query). The route PATH is covered by `check-internal-links`;
 * the query TARGET ID (`?site=`/`?mission=`/`?id=`, or a `/programs/<id>` segment) is
 * validated against the real data index by the connection-href test in `goals.test.ts`
 * (check-internal-links strips the query, so it can't see the id). So the lesson hands the
 * learner into a fleet/mission/surface page that provably exists — with the exact item
 * selected. Global-program representation is first-class (the `agency` tag).
 */
export interface Connection {
  /** the engineering "why" this lesson explains in the real world (Kourou's latitude, the sky-crane…) */
  whyKey: string;
  /** the famous thought-experiment / event this lesson unlocks (Newton's cannonball, Apollo 13's free-return…) */
  hookKey?: string;
  /** real missions/vehicles/sites that embody the conclusion — deep links OUT to Orrery routes */
  links: ConnectionLink[];
  /** optional forward pointer to a not-yet-built goal or the next rung (e.g. land-on-Mars → "leave the system") */
  nextKey?: string;
}

export interface ConnectionLink {
  labelKey: string;
  href: string; // internal Orrery route WITHOUT base (e.g. '/fleet?id=perseverance'); the view prepends `base`
  agency?: string; // optional agency tag for the badge — NASA / ESA / CNSA / ISRO / Roscosmos / JAXA / SpaceIL …
}

export interface GoalStep {
  formulaId: string;
  narrativeKey: string;
  wiresFrom?: { fromStep: number; output: string; toInput: string }[];
  /**
   * Seed values for THIS rung's inputs, over the formula defaults (M3+). Lets a goal
   * put a reused formula in the right context — e.g. "land on the Moon" presets
   * `body: 'moon'` on the shared orbital-velocity/TWR rungs. The user can still edit;
   * codec-clamped like any input. Keys not in the formula's inputs are ignored.
   */
  presetInputs?: Record<string, number | string>;
}

/**
 * The user-authored atom (Notebook/Canvas). Distinct from `Goal` (curriculum).
 * A wire is valid iff `output` names a declared `OutputSpec.key` (or
 * `selectionOutputs.key`) of the source formula AND that output's `units` equals
 * the target `FieldSpec.units` (no implicit conversion). Wire beats `inputs` on
 * recompute; `inputs` is the unwired fallback.
 */
export interface Card {
  id: string;
  formulaId: string; // registry formulas only — non-formula figures are Lab-view overlays, not cards
  inputs: Record<string, number | string>;
  wires?: { fromCard: string; output: string; toInput: string }[];
  selection?: Record<string, number | string>; // interactive-figure picks, persisted
  note?: string; // USER free text; NEVER URL-serialized (localStorage/.orrlab only)
}

export interface Notebook {
  orrlab: 1; // .orrlab.json schema VERSION (frozen); the codec preserves unknown fields
  title: string; // USER free text — NOT i18n-keyed
  cards: Card[];
}
