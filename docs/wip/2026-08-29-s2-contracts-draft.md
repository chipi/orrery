# S2 contract shapes — **FROZEN** (2 Fable-5 rounds) — the S2a implementation target

_2026-08-29 · S2a #509 · **FROZEN.** v1 → Fable-5 (5 BLOCKER + 6 MAJOR) → v2 (all applied) →
Fable-5 confirm (11/11 resolved; N1–N4 edges) → N-fixes → frozen. Structural bets confirmed
sound: FieldSpec-over-JSONSchema, closed `Unit` union, fidelity axis, `wiresFrom[]`, Goal/Card
split. **These shapes are now the S2a build target; changing one is a contract re-freeze.**_

Changes from v1: **B1** declared `outputs` · **B2** wire unit-equality · **B3** `'cross-cutting'`
family · **B4** Unit-union audit + `as Unit` lint-ban (+ fixed the example's wrong accel unit) ·
**B5** generic selection channel + Card-persisted + `arrDays`→`tofDays` · **M1** `date`/`injected`/
labeled-enums · **M2** `Card.note` + promote-resolves-to-text · **M3** `figure.assumptions ⊆ result`
invariant · **M4** `staleAfterDays` · **M6** non-formula figures documented out of the card model.

## 1 · Units + constants (D10)

```ts
// physics/util/units.ts — closed union, audited against EVERY M1–M6 + Family-B output (B4).
export type Unit =
  | 'km' | 'm' | 'AU'                                   // length
  | 'km/s' | 'm/s' | 'AU/yr'                            // velocity
  | 'm/s2'                                              // acceleration (B4: was missing)
  | 's' | 'day' | 'yr'                                  // time
  | 'kg' | 'N' | 'kg*m/s' | 'N*s'                       // mass, force, momentum, impulse (B4)
  | 'J' | 'W'                                           // energy, power (B4)
  | 'deg' | 'rad' | 'K' | 'Pa' | '';                    // angle, temp, pressure, dimensionless
// `as Unit` casts are LINT-BANNED in physics/** (no-restricted-syntax TSAsExpression on Unit) —
// v1's example smuggled a wrong unit (m/s for acceleration) past the compiler exactly this way.

// physics/util/constants.ts — ONE home; unit IS in the name (D10; kills same-name-diff-unit).
export const MU_SUN_KM3_S2 = 1.327_124_400_18e11;
export const MU_SUN_AU3_YR2 = 4 * Math.PI ** 2;
export const MU_EARTH_KM3_S2 = 398_600.4418;
export interface BodyConstants { mu_km3_s2: number; radius_km: number; g0_m_s2: number; }
export const BODY: Record<BodyId, BodyConstants> = { /* migrated + a cross-module agreement test */ };
```

## 2 · FormulaDef + registry — now declares OUTPUTS (B1)

```ts
export interface FieldSpec {
  key: string;
  labelKey: string;                                   // i18n
  units: Unit;
  kind: 'number' | 'enum' | 'body' | 'date';          // + 'date' (M1): ISO-string, adapter→JD
  default: number | string;
  min?: number; max?: number; step?: number;          // number
  enumValues?: { value: string; labelKey: string }[]; // labeled (M1) — no raw untranslated ids
  bodyIds?: BodyId[];                                  // body: per-formula domain (Lambert≠free-fall)
  serverCap?: number;                                  // MCP abuse bound
  injected?: true;                                     // adapter-owned (e.g. fresh TLE) — NOT an MCP user param (M1)
}

export interface OutputSpec { key: string; labelKey: string; units: Unit; }

export interface FormulaDef<I = Record<string, number | string>> {
  id: string;
  titleKey: string;
  domain: 'ephemeris' | 'transfer' | 'ascent' | 'descent' | 'propulsion' | 'satellite' | 'mechanics';
  tier: number;
  prereqs: string[];
  inputs: FieldSpec[];
  outputs: OutputSpec[];                              // B1 — static; test asserts compute() keys match (§3)
  selectionOutputs?: OutputSpec[];                    // B5 — interactive-figure picks (generic, any figure)
  // N1 (invariant): keys are UNIQUE across `outputs ∪ selectionOutputs` — the B1 test enforces
  // disjointness so "merge selection into the output namespace on recompute" is unambiguous and
  // the wire rule (§5) resolves a name to exactly one source. String-valued picks (body/enum)
  // declare `units: ''` and match a wire's target by FieldSpec.kind; numeric picks match by units.
  staleAfterDays?: number;                            // M4 — data-staleness bound (TLE/ephemeris)
  citationKey?: string;
  compute(inputs: I): FormulaResult;
}
export type Registry = ReadonlyMap<string, FormulaDef>;
```
- `domain` files `lambert-geocentric` under `'transfer'` (no `'cislunar'` domain — minor, decided).

## 3 · FormulaResult

```ts
export interface Quantity { value: number; units: Unit; }
export interface FormulaResult {
  values: Record<string, Quantity>;                  // keys ⊆ FormulaDef.outputs[].key always; ≡ when ok:true (N3)
  figure?: FigureSpec;
  status: { ok: true } | { ok: false; reasonKey: string };  // on !ok, `values` may be partial (minor)
  assumptions: string[];                             // i18n keys (D12)
  epochAgeDays?: number;                             // D13 age; bound = FormulaDef.staleAfterDays (M4)
}
```

## 4 · FigureSpec + fidelity axis (B5 naming + fallback rule + M3 invariant)

```ts
export interface Vec2 { x: number; y: number; }
export type Fidelity = 'computed' | 'geometric' | 'replayed-published';
export interface Provenance { fidelity: Fidelity; module: string; }   // kernel ⇒ always 'computed'
export interface Annotation { at: Vec2; labelKey: string; kind: 'point' | 'vector' | 'region' | 'note'; }
export interface Axis { labelKey: string; units: Unit; scale?: 'linear' | 'log'; }   // scale additive (minor)

// FigureBase is the FROZEN public surface; renderers MUST fall back to an honest
// "provenance + assumptions + unsupported-kind" render for unknown `kind` (M3/degrade-not-crash).
interface FigureBase { provenance: Provenance; assumptions: string[]; }  // ⊆ result.assumptions (M3, tested)

export type FigureSpec = FigureBase & (
  | { kind: 'curve'; x: Axis; y: Axis; series: { labelKey?: string; points: Vec2[] }[]; marks?: Annotation[] }
  | { kind: 'force-diagram'; bodyLabelKey: string; vectors: { labelKey: string; dir: Vec2; magN: number }[] }
  | { kind: 'dv-waterfall'; segments: { labelKey: string; dv: number; kind: 'gain' | 'cost' }[] }
  | { kind: 'transfer-ellipse'; frame: 'heliocentric'; bodies: { labelKey: string; at: Vec2 }[]; arc: Vec2[]; marks: Annotation[] }
  | { kind: 'porkchop'; depDays: number[]; tofDays: number[]; grid: number[][]; units: Unit }  // B5: tofDays, NOT "arrDays" (kernel: TOF)
  | { kind: 'orbit' | 'ground-track' | 'sky-chart' | 'entry-corridor' | 'cislunar-eci'; /* TBD, additive */ }
);
```
**S2a renders M1's 3 only** (`curve`, `force-diagram`, `dv-waterfall`) + the register-distinction
rendered-SVG golden-master. A figure's pick (porkchop cell, sky-chart body) surfaces via the
owning `FormulaDef.selectionOutputs`, persisted in `Card.selection` (§5), merged into the output
namespace on recompute so ordinary `wires` address it — zero contract change at M4 or any future
interactive figure (B5).

## 5 · Goal / GoalStep + Card / Notebook

```ts
export interface Goal {
  id: string;
  titleKey: string;                                  // i18n — authored curriculum, translated ×14
  family: 'spaceflight' | 'observe' | 'cross-cutting';   // B3
  tier: number;
  prereqs: string[];
  path: GoalStep[];
}
export interface GoalStep {
  formulaId: string;
  narrativeKey: string;
  wiresFrom?: { fromStep: number; output: string; toInput: string }[];   // array (Fable-5 r2)
}

export interface Card {
  id: string;
  formulaId: string;
  inputs: Record<string, number | string>;
  wires?: { fromCard: string; output: string; toInput: string }[];
  selection?: Record<string, number | string>;      // B5+N2 — picks, persisted (string = body/enum pick, e.g. sky-chart)
  note?: string;                                     // M2 — USER free text; N4: NEVER URL-serialized (localStorage/.orrlab only)
}
export interface Notebook {
  orrlab: 1;                                         // .orrlab.json VERSION (frozen); codec PRESERVES unknown fields
  title: string;                                     // USER free text — NOT i18n-keyed
  cards: Card[];
}
```
**Wire integrity (B1+B2, S2c CI + runtime guard):** a `wires`/`wiresFrom` entry is valid IFF
`output` names a declared `OutputSpec.key` (or `selectionOutputs.key`) of the source formula
AND that output's `units` === the target `FieldSpec.units` — **no implicit conversion** (B2 kills
the MU_SUN-at-the-wire hazard). **Wire beats `inputs`** on recompute; `inputs` is the unwired
fallback (minor). `fromStep` stays an index; the S2c validator makes renumbering safe (M5).

**Promote (M2):** pulling a curriculum `Goal` into a user `Notebook` **resolves every `*Key` to a
string in the user's current locale** and writes the text (into `title` / `Card.note`). Documents
outlive message bundles; a `.orrlab.json` must be the user's own words, not keys that rot or
re-translate per reader.

## 6 · Explicitly OUT of the card model (M6, Non-Goal)
Non-formula figures — e.g. M-return's trans-Earth coast leg (an app-side `geometric` producer, not
a `FormulaDef`) — are **Lab-view overlays, not cards.** `Goal/Card.formulaId` reference registry
formulas only. Stated so it isn't an accidental contract break at M-return.

## 7 · Worked example — F=ma (B4 fixed: acceleration is m/s², no cast)
```ts
export const fMaFormula: FormulaDef<{ massKg: number; forceN: number }> = {
  id: 'newton-second-law', titleKey: 'lab.f.newton-second-law.title', domain: 'mechanics',
  tier: 1, prereqs: [], citationKey: 'science/mechanics/newton-laws',
  inputs: [
    { key: 'forceN', labelKey: 'lab.f.force', units: 'N', kind: 'number', default: 100, min: 0, max: 1e7 },
    { key: 'massKg', labelKey: 'lab.f.mass', units: 'kg', kind: 'number', default: 100, min: 0.001, max: 1e6 },
  ],
  outputs: [{ key: 'acceleration', labelKey: 'lab.f.accel', units: 'm/s2' }],   // B1 + B4
  compute: ({ forceN, massKg }) => ({
    values: { acceleration: { value: forceN / massKg, units: 'm/s2' } },        // m/s² — no `as Unit`
    status: { ok: true },
    assumptions: ['lab.assume.point-mass', 'lab.assume.no-friction'],
    figure: { kind: 'force-diagram', provenance: { fidelity: 'computed', module: 'mechanics/dynamics' },
              assumptions: ['lab.assume.point-mass'],   // ⊆ result.assumptions (M3)
              bodyLabelKey: 'lab.body.payload',
              vectors: [{ labelKey: 'lab.vec.applied-force', dir: { x: 1, y: 0 }, magN: forceN }] },
  }),
};
```

## 8 · Freeze checklist (S2a locks)
`Unit` (audited + `as Unit` lint-ban) · `FieldSpec` (+date/injected/labeled-enums/bodyIds) ·
`FormulaDef` (+outputs/selectionOutputs/staleAfterDays) · `FormulaResult` · `FigureSpec`+`FigureBase`
(fidelity axis, tofDays, unknown-kind fallback, `figure.assumptions ⊆ result`) · `Goal`(+cross-cutting)
/`GoalStep` · `Card`(+selection/note)/`Notebook`(+orrlab version, preserve-unknown) · wire
unit-equality + output-name validity · D10 constants home. Renderers: M1's 3. URL grammar → S3 (not S2a).
