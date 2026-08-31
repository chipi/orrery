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
    // Ground-track map (Family B / G9 "catch the ISS") — successive orbits as sine tracks on an
    // equirectangular graticule, each marching west by `shiftDeg`. `tracks` are (lonDeg, latDeg)
    // polylines; the renderer wraps longitude to [-180,180]. No continents — the longitudes are
    // relative (the shape + inclination cap + westward march are the honest content).
    | { kind: 'ground-track'; tracks: Vec2[][]; inclinationDeg: number; shiftDeg: number }
    // Sky-chart (Family B / G7 "observe the sky") — an honest Sun-centred elongation schematic:
    // the planet's angular separation from the Sun and whether it trails (eastern → evening star)
    // or leads (western → morning star). NOT a literal horizon placement (that would overclaim
    // altitude); the honest content is the angle from the Sun + the morning/evening side.
    | {
        kind: 'sky-chart';
        elongationDeg: number;
        eastern: boolean; // true → evening star (east of the Sun); false → morning star
        planetLabelKey: string;
        maxElongationDeg?: number; // inner planets: the cap the elongation can never exceed
      }
    // Entry-corridor (Family A landings) — the re-entry knife-edge. Two rigorously-computed
    // boundaries: the SKIP boundary (shallower → the Keplerian perigee grazes above the capture
    // floor and the vehicle skips back out) and the G-LIMIT boundary (steeper → ballistic peak
    // deceleration exceeds the survivable limit). The corridor is the gap between them — and for a
    // fast lunar return it CLOSES (skip > g-limit), the honest reason a ballistic capsule can't
    // come back from the Moon and Apollo needed a lifting entry.
    | {
        kind: 'entry-corridor';
        skipBoundaryDeg: number; // shallower than this → skips out (perigee above the capture floor)
        gLimitBoundaryDeg: number; // steeper than this → ballistic peak-g exceeds the limit
        entryDeg: number; // the chosen entry flight-path angle
        peakGeeAtEntry: number; // ballistic peak g-load at the chosen angle (readout)
        perigeeAltKm: number; // Keplerian perigee altitude at the chosen angle (readout)
      }
    // Cislunar transfer (Earth→Moon, ECI frame) — the trans-lunar coast ellipse from a LEO
    // parking orbit to the Moon, drawn in the Earth-centred-inertial frame with the Moon's orbit
    // and its travel during the flight. TLI + LOI Δv are the kernel's geocentric-Lambert
    // patched-conic values. The idealized min-energy (Hohmann) trans-lunar geometry.
    | {
        kind: 'cislunar-eci';
        earthRadiusKm: number;
        leoRadiusKm: number;
        moonDistanceKm: number;
        moonTravelDeg: number; // how far the Moon moves during the transfer (lead angle)
        tofDays: number;
        tliKms: number; // trans-lunar injection Δv from LEO
        loiKms: number; // lunar-orbit-insertion Δv
      }
    // Ascent trajectory (reach-orbit) — the real gravity-turn from the kernel's ascent
    // integrator: the flight path (downrange × altitude) coloured by active stage, the
    // staging/Max-Q/insertion events, and the Δv loss ledger (gravity + drag + steering)
    // that is the whole reason orbit costs ~9.4 km/s for 7.8 km/s of orbital speed.
    | {
        kind: 'ascent-trajectory';
        points: { x: number; y: number; stage: number }[]; // downrange km, altitude km, stage idx
        events: { type: string; x: number; y: number }[];
        losses: { gravityKms: number; dragKms: number; steeringKms: number };
        idealDvKms: number;
        orbitAltKm: number;
        reachedOrbit: boolean;
        finalSpeedKms: number;
        targetSpeedKms: number;
      }
    // Guidance timeline (systems — ascent guidance / PEG) — the flight computer's commanded
    // pitch γ over the burn, split into the OPEN-loop pre-planned pitch table (in the atmosphere)
    // and the CLOSED-loop guidance takeover (PEG for a low-TWR upper stage, which lofts the arc
    // by pitching BELOW horizontal to trade altitude for speed — a command no human flies by hand).
    | {
        kind: 'guidance-timeline';
        samples: { t: number; pitchDeg: number; closedLoop: boolean }[];
        events: { type: string; t: number; pitchDeg: number }[];
        handoffTimeS: number; // when the open→closed handoff completes
        minPitchDeg: number; // the deepest lofted dip (PEG below horizontal)
        burnTimeS: number;
        reachedOrbit: boolean;
      }
    // Descent guidance (systems — powered descent) — the landing computer's phase portrait:
    // altitude vs speed, with the descent-rate SCHEDULE line (v = gain·h) the controller tracks
    // down to a terminal touchdown speed. When the brake authority can't keep up with a fast
    // arrival the actual path stays right of the schedule and touches down hard — a crash.
    | {
        kind: 'descent-guidance';
        samples: { altKm: number; speedMs: number }[];
        scheduleGain: number; // the schedule slope v = gain·altitude (s⁻¹)
        terminalMs: number; // the survivable touchdown speed
        touchdownMs: number; // the actual speed at the surface
        peakDecelG: number;
        dvUsedMs: number; // propellant Δv spent (m/s)
        landedSoft: boolean;
        bodyLabelKey: string;
      }
  );

// ─── Goal / GoalStep (curriculum) + Card / Notebook (user documents) ────────

export interface Goal {
  id: string;
  titleKey: string; // authored curriculum text — i18n-keyed, translated ×14
  // 'systems' (ADR-087) = the guidance/control CONTROLLERS that fly the physics — a different
  // question from the physics itself ("how does a machine fly this?").
  family: 'spaceflight' | 'observe' | 'cross-cutting' | 'systems';
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
