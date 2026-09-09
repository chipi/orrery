# /lab feedback triage — prod testing notes → improvement arc (2026-09-09)

Operator tested **prod as it is now** and captured field notes. This organizes them into
themes + per-goal items, flags what the **un-deployed local batch already fixes**, lists the
clarifications needed, and proposes the mini-arc. Ships together with the LLM epic (#539).

## ⚠️ Read first — prod vs local
The operator tested **prod**, which does NOT yet have the committed-but-unpushed pedagogy
batch (`8ed18a3590`) or the LLM epic. So some notes are **already addressed locally** and
should be re-checked after we deploy this batch:
- "Move a mass in wrong order in dropdown" → **W1** already regroups the picker (Foundations /
  "Move a mass" first, tier-ordered). Re-verify after deploy.
- "no clear connection of terms first→last equation" / "assumptions" → **W2** now discloses
  every card's assumptions; **W4** added the F=ṁ·v_e rung closing momentum→thrust→TWR.
- "connect to next lesson (engines), highlight it" → partly served by the new thrust rung +
  the /science + learn-more links (previous batch).
So: **deploy the batch, then re-walk these notes** — the residual is the real new work.

## Cross-cutting themes (apply across goals)
- **T1 · Diagram legibility (FigureRenderer).** Vectors need colours distinct from bodies;
  no overlap of vectors/bodies/labels; place vectors side-by-side not stacked; bigger margin
  between labels and drawings. *(launch-a-rocket, reach-orbit, land-on-earth)*
- **T2 · One threaded example.** If 100 kg is the example, use it on every rung; same for
  other values — build ONE realistic case start→finish.
- **T3 · Formula pedagogy.** Show the equation BEFORE substitution; then substitute. Name
  every parameter (Δv, launch-site params). Relate to physical laws (momentum = action/
  reaction; TWR = T/W = T/mg). Consistent variable naming first→last equation.
- **T4 · Units in [] not ().**
- **T5 · "World" → "Gravity" field.** Rename the input to *gravity* with the g value in
  brackets; keep the world as the explanation for the choice next to it.
- **T6 · Bottom examples feel like Orrery.** Small images / agency logos / colours, reuse
  existing styles; connect the numbers to ACTUAL rockets/missions. *(launch-a-rocket, scale-rocket)*
- **T7 · Cross-lesson wiring.** Use cells to carry a previous lesson's result into the next
  ("this lesson takes what the last computed"). *(reach-orbit especially)*
- **T8 · Mini-capstone per goal.** End a goal by connecting to a real mission (e.g. a real
  satellite launch) as a mini-capstone.
- **T9 · Goal ordering.** "Engines of the world" should come BEFORE the first time engines are
  referenced (launch-a-rocket's thrust rung); re-check tiering.

## Per-goal
- **Launch a rocket** — T1 (force vectors colour/overlap/labels/margins), "payload" → a nicer
  varied diagram subject, weight card: world field shorter + T5 rename, T4 units, T3 (rocket
  equation Δv unexplained; launch-site params unexplained; TWR formula-before-substitution +
  connect to prior cards), T2 (100 kg everywhere), Δv-to-orbit: use REAL orbit types (like the
  earth page) as the proxy instead of a random 200 km, discuss realistic rocket mass breakdown
  (frame/engines/fuel), thrust rung "how is it made" → link to engines (number+type → fuel →
  weight) + to the next lesson (keep a minimal realistic example here), T8 real-mission end.
- **Scale a rocket** — T6 (logos/images/colours at the bottom), engine name as proxy-to-value,
  a diagram+formula per example rocket with numbers tied to the actual rocket.
- **Reach orbit** — missing an Earth+forces diagram for the description; the reach-orbit
  diagram is unclear (liftoff seems not on Earth / what is Earth?); T7 wiring; explain losses
  better.
- **Land on Earth** — the re-entry corridor needs 3D; the diagrams are not clear.
- **Move a mass** — dropdown order (see prod-vs-local; likely W1-fixed).
- **Reach the Moon** — the opening diagram + phases aren't all connected to the lesson.
- **Reach Mars** — link to the planning page.
- **Engines of the world** — ordering (T9): before engines are first referenced.

## Clarifications — ANSWERED (operator 2026-09-09)
1. **Diagrams:** elevate them; explore where **Higgsfield** (the generative image tool used for
   /posters) can help. → FB1 becomes: legibility fixes on the computed figures + a recon of
   Higgsfield for the ILLUSTRATIVE (non-data) subjects (rocket/mission art at the bottoms).
   Computed force/vector diagrams stay kernel-accurate (never generated).
2. **Re-entry corridor:** try the clearer **2D** first (3D as a later follow-up).
3. **"Gravity" field:** show the **g value in the label** (e.g. `Gravity [9.81 m/s²]`); the
   world stays as the choice's explanation. Label/label-value only — do NOT rename the `body`
   input key (17 formulas + wiring depend on it).
4. **Ordering:** **move `engines-of-the-world` up the ladder** (earlier tier) — impact unclear
   but the current order feels wrong; re-tier so engines appear before they're first referenced.

## Clarifications needed (before building)
1. **Diagrams (T1):** are these tweaks to the existing `FigureRenderer` per-figure specs, or a
   broader figure redesign? Any reference look you want?
2. **3D re-entry corridor (land-on-earth):** a new 3D scene is a large lift — is a clearer 2D
   diagram acceptable first, with 3D as a follow-up?
3. **T5 "gravity" rename:** rename the field label only, or also the underlying input key/data
   (the key is `body`, used by 17 formulas + wiring)? Label-only is safe; key rename is a
   contract change.
4. **T9 ordering:** move `engines-of-the-world` earlier in tier, or just add an inline pointer
   from launch-a-rocket's thrust rung? (Re-tiering ripples through prereqs.)
5. **T2 threaded example:** pick the canonical case (e.g. "100 kg payload to LEO on a small
   rocket") and thread it through every goal, or per-goal only?

## Proposed mini-arc (ships with #539)
- **FB1 · Figure legibility pass** (T1) — colours, overlap, label margins in FigureRenderer +
  the per-figure specs. Highest-frequency complaint.
- **FB2 · Formula-pedagogy pass** (T3+T4) — equation-before-substitution, param glossary per
  card, [] units, physical-law connective tissue. Card + narrative + ×14.
- **FB3 · Consistent example + real-number/real-mission connections** (T2+T6+T8) — one threaded
  case; agency logos/styles + real-rocket numbers at the bottoms; mini-capstone links.
- **FB4 · Per-goal fixes** (reach-orbit Earth+forces diagram & wiring & losses; land-on-earth
  entry-corridor clarity; reach-moon opening-diagram dots; reach-mars→planning link).
- **FB5 · "Gravity" field rename** (T5) — pending clarification #3.
- **FB6 · Goal-ordering** (T9) — pending clarification #4.

Sizing + Fable-5 design pre-review per slice, same as the LLM epic.
