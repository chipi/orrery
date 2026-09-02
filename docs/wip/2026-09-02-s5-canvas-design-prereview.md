# S5 Canvas — Fable-5 design pre-review (2026-09-02, pre-build)

Slice #463 protocol step 0 (operator 2026-09-01: design pre-review before every slice). This is
the binding design for S5; deviations get recorded here.

## Premise corrections (vs the grand plan)

1. **The MCP server consumes the registry, NOT the codec** — `encodeOrrlab`/`decodeOrrlab` have
   zero consumers outside `src/lib/lab/`. Weakens any case for a v2 grammar; the only shipped
   codec consumers are in-app.
2. **`Canvas = {cards, positions, edges}` (RFC-037 §5) double-counts** — `Card.wires`
   (spec.ts:392, id-based `{fromCard, output, toInput}`) already IS the edge set. The canvas
   document needs exactly one new thing: **positions**.

## Decisions

**A · Engine — do not touch `notebook.ts`.** New `src/lib/lab/graph.ts`: Kahn's topo sort over
(nodes, wires); cycle members → status `cycle`, downstream → `upstream-cycle`; the remaining
DAG in stable topo order (tiebreak = card-array order) → remap to index wires → DELEGATE to
`recomputeNotebook` → map results back to ids. Reuses 100 % of the hardened engine (invalid-wire
/ upstream-failed / finite-value / compute-error) with a zero-line diff to the trusted core.
Canvas UI additionally does a predictive cycle check at wire-creation (refuse + toast), but the
engine-level handling stays mandatory (hostile `.orrlab` can carry cycles).

**LATENT GAP (fix in-slice, both paths): units-mismatch wires.** spec.ts:384–386 declares a
wire valid only when output units ≡ target `FieldSpec.units` (string picks by `kind`), but
neither `notebook.ts` (declaration-only check) nor `sanitizeWires` enforces it — a hostile
`.orrlab` can wire seconds into km/s and the SHIPPED notebook path honours it silently
(fake-green vector). `graph.ts` enforces units-match, and the same check lands in the notebook
path (global-checks / adjacent-audit rule).

**B · Contract — option (ii)-plus.** No opaque-extras (round-tripping attacker-controlled bags
inverts the sanitize-everything posture); no v2 grammar. Amend the false spec.ts:398 comment to
*"unknown fields are DROPPED by the sanitizing codec (by design); known optional fields degrade
honestly."* Add `Notebook.canvas?: { positions: Record<string, {x,y}> }` (card-id keyed),
sanitized on decode: finite, clamped (±50k), ids ⊆ cards, count ≤ MAX_CELLS. Old decoders
ignore it — the documented lossy degrade is LAYOUT ONLY (semantics survive). URL grammar
untouched; Canvas share is cells-only with an honest "layout not included" toast (or absent in
S5).

**C · Interaction — DOM cards + one SVG edge overlay** (the prototype's own shape). Reuse
`Card.svelte` unchanged (controlled/presentational); positioned shell + header drag handle.
Edges: single teal-bezier SVG overlay inside the pan/zoom world container, `pointer-events:none`
except delete hit-targets. Drag: `setPointerCapture`, pointermove → sync `$state` position map
(pointer-events-lightweight rule; copy DebugPanel/TimelineNavigator capture discipline). Wiring:
pointerdown on output socket → ghost edge; compatible-input set computed ONCE at drag start
(units/kind match) → commit on pointerup. One edge per input socket (creation-time); keep-last
on decode. Pan/zoom: CSS transform, wheel + pinch.

**D · Promote — refusals are narrow; fan-in AND fan-out are expressible** (the linear engine
allows multiple wires per cell and multiple consumers of one source; the only constraint is
source-before-consumer, satisfied by topo order). Semantics:
1. cycle in selection → refuse, `lab.promote.reason-cycle`;
2. in-edge from unselected node → AUTO-INCLUDE the upstream closure, surfaced in confirm UI
   ("promotes N cards, M upstream dependencies included") — never snapshot a wired value into a
   frozen default (quiet lie);
3. result > MAX_CELLS → refuse, `lab.promote.reason-too-big`.
Round-trip honesty invariant (unit test): promote → `recomputeNotebook` ≡ `recomputeGraph` on
the same subgraph.

**E · Scope floors (the honest cut lines)**
- A11y floor: DOM-mirror card list (DOM order = card order, position via transforms), wires
  announced ("input X ← CARD.output"). Honest cut: keyboard wire-CREATION (stated in slice
  notes).
- Mobile read-only = a `readonly` prop on the same component (no fork): drag/sockets off,
  tap-to-Focus on, REAL touch pan/pinch.
- **State-owner refactor decided before UI**: lift cells out of `Notebook.svelte` (currently THE
  owner) into shared /lab ownership — the biggest hidden cost in the slice.
- i18n ×14 same pass; e2e = small smoke (add card, wire, promote), weight in unit tests;
  `preflight:coverage` before push.

**F · Promote mock (operator gate)** in `docs/prototypes/lab/canvas.html`, click-through states:
(1) subgraph selection highlight; (2) confirm surface with derived topo ORDER + "M upstream
included" line — the judgment moment; (3) resulting Notebook column with wire annotations;
(4) one mars-red refusal state with reason text.

## Mandated build order

0. Promote mock → operator gate. 1. spec re-freeze (canvas.positions + comment) + codec +
hostile tests. 2. graph.ts + units-match (both paths). 3. promote.ts + round-trip test.
4. State-owner refactor. 5. Canvas.svelte desktop. 6. Promote UI. 7. Mobile readonly + a11y.
8. i18n ×14 → e2e smoke → preflight:coverage.

## Risks (ranked)

1. touching the hardened engine (eliminated by delegation) · 2. opaque-extras (rejected) ·
3. units-mismatch latent gap · 4. state-owner refactor discovered mid-build · 5. drag e2e
flake · 6. i18n/coverage forgotten at close.

## Post-build record (2026-09-03, after the Fable-5 holistic)

The holistic caught the build's blind spot exactly where the "drag e2e is flake bait" cut
left it: the wire gesture was DEAD by construction (B1 — pointer capture retargeted
pointerup away from the input socket). All findings fixed in-slice: capture removed +
pointercancel cleanup (B1), goal-switch re-seed hoisted to /lab (M1), **the
always-topo-sorted invariant** via `linearizeIndexWired` on wire commit so
`recomputeNotebook ≡ recomputeGraph` for the live document (M2), spawn-coordinate fix
(M3), pinch zoom implemented (M4 — the design mandated it; it was never a stated cut),
drag deep-writes (m1), honoured-wiredKeys display (m2), positions survive promote (m3).
A deterministic three-point wire-drag e2e now proves the gesture live.

Judged-acceptable deviations, recorded: edge deletion via per-input unwire buttons
(not on-edge hit targets); positions ride on cells (not a separate map) — WITH the m1
deep-write; keyboard wire-creation remains the stated cut; canvas edits are not
auto-saved to localStorage while in canvas view (no reader exists yet — revisit with
S3c.3's resume affordance); dialog focus traps deferred (Escape works).
