# Kernel scope expansion — classical mechanics + the NL "ask" layer (operator vision, 2026-08-29)

_Captured per operator note ("take this into account as we build kernel; discuss upper
layers later"). This is a **proposed scope expansion of the flagship** — it is NOT yet
folded into PRD-033/RFC-037; §"Honest scope impact" says what has to change to adopt it._

## The two ideas

**Idea 1 — natural-language goal → formulas → compute → mini-chart.**
The operator wants to open the workbench and say, in plain language: *"explain what it
takes to launch a rocket from Earth to suborbital"*, *"get all the formulas to send a
spaceship from Earth orbit to the Moon"* — and have the system select the relevant
formulas, run the calculations, and produce a short explanation + a small drawing/chart.

**Idea 2 — general classical / Newtonian physics in the kernel.**
Beyond spaceflight: *"I push a 100 kg payload in space — what happens?"* (Newton I,
momentum), *"I drop 100 kg from 100 m — what happens?"* (free-fall kinematics, impact
velocity, optionally air resistance). The operator: *"we should also expand the kernel
with the Newtonian stuff and all the core physics because that's also important."*

## Where each lands architecturally

| Idea | Layer | Kernel change? | Slice home |
|---|---|---|---|
| 1 · NL ask-box | **Upper layer (consumer)** | **None** | PRD-033 **T4** — powered by the MCP server (S4/S6) + the registry; the LLM interprets the goal, picks registry formulas, calls them as MCP tools, assembles results+FigureSpecs. The kernel stays pure/typed; the "ask" is a client. |
| 2 · Classical mechanics | **New kernel subdomain** | **Yes — new physics** | New `src/lib/physics/mechanics/` domain; greenfield content; lands **after S1** (nothing to move) and rides **S2** (needs registry + FigureSpec to be exposed). |

**Idea 1 needs no kernel work** — it validates the architecture (registry + FigureSpec +
MCP is exactly the substrate a NL layer sits on). It is gated on S2 (rich self-describing
registry) → S4 (MCP) → T4. The Lab's own honesty line still holds: computed vs illustrated.

## Honest scope impact — this AMENDS the frozen flagship (do not bury)

- **PRD-033 non-goal:** *"No new physics. The Lab exposes today's fidelity."*
- **RFC-037 §12 non-goal:** *"Changing any physics formula… extraction is behaviour-preserving."*

Idea 2 **contradicts both.** Adopting it is a deliberate expansion, not a clarification.
It requires: a **PRD-033 amendment** (add classical mechanics as in-scope) and likely an
**RFC-037 amendment** (new kernel subdomain + new FigureSpec kinds). Adopting it also
**enlarges S2 (registry)** and **S2.5 (workbench coverage)** materially — each new formula
is a new registry entry + a new workbench scenario + citations + tests.

**S1 is unaffected** — it is a pure move of *existing* modules; the new domain doesn't
exist yet, so nothing about the carve changes. S1 proceeds as planned.

## The compose insight (why classical mechanics is kernel-native, not a bolt-on)

The general layer is the **foundation the spaceflight layer already sits on**, so they
compose and share data:

- *"Drop 100 kg from 100 m on Mars vs Earth vs Titan"* = general free-fall reusing the clean
  per-body helpers **`bodyGravity` / `bodyAirDensity`** (`descent-physics.ts:253/260`) under a
  **purpose-built free-fall integrator** in `mechanics/`. ⚠️ **Corrected (Fable-5 MAJOR 4):
  NOT "the same EDL integrator"** — that one clamps `Math.max(v,1)` and is silently wrong from
  rest, and `SURFACE_BODY_KINEMATICS` has no Titan. The *insight* (same physics at different
  altitudes) holds; the *implementation* is a small dedicated integrator sharing the constants.
- *"Push 100 kg in space"* = Newton I + momentum, then it coasts — which is what a LEO
  coast already is (`fly-leo-coast-scene` calls a coast "free-fall: no thrust or drag").

So the general primitives and the mission primitives are the **same physics at different
altitudes of abstraction** — a gorgeous educational bridge, and the reason this belongs in
the kernel rather than as a separate toy.

## THE MVP — the First-Principles Critical Path (operator-locked 2026-08-29)

Audience widened (operator): **a school/early-undergrad student who wants to learn it all
in one place, building from first principles** — *"you don't build a rocket before you can
move a Lego toy on a table."* **Keyword: first principles** (Musk/Tesla framing —
understand why gravity pulls down and thrust pushes up before you launch anything).

**v1 = ONE critical path**, minimal, no deviations, but *complete* — every key construct,
so a learner finishes and says *"I got everything I need; I understand how it works."*
Progression UI = **minimum** (no skill-tree); the path exists as **data**, rendered as a
plain authored Notebook.

**Path: "What does it take to launch a rocket?"** (🆕 new mechanics · ✅ existing kernel)

| Rung | First-principle question | Construct |
|---|---|---|
| 0 | Push a toy on a table — what makes it move? | 🆕 **F = ma** |
| 1 | Why do things fall? | 🆕 **weight = m·g** + ✅ `planet-stats` gravity |
| 2 | How do you push back up? (throw mass back → move forward) | 🆕 **momentum / thrust** |
| 3 | **Liftoff = thrust beats weight** (add engines ↑thrust; heavier ↑weight) | 🆕+✅ **TWR = thrust/(m·g)** → `engine-registry` + `ascent-physics` |
| 4 | Fuel is mass — burning it lightens you | ✅ **Tsiolkovsky** Δv=Isp·g·ln(m₀/m_f) → my Δv *capacity* |
| 5 | How much Δv does orbit *require*? | ✅ **ascent integrator** → Δv-to-orbit |
| **6 · verdict** | **Do I have enough?** capacity vs required (fail-honest if not) | **comparison card fed by BOTH rung 4 and rung 5** — the two-input step that exercises `wiresFrom[]` (Fable-5 NEW-5); mars-red if capacity < required |
| 7 *(extension)* | And to another planet? | ✅ **Lambert / transfer** → interplanetary |

**Rung 3 is the centerpiece** — the "I get it" moment; it is literally TWR>1, already in
the ascent kernel. The path threads new fundamentals (0–2) → the liftoff insight (3) →
Orrery's existing kernel (4–6) in one scrollable notebook. New-physics cost = a handful of
mechanics formulas (F=ma, weight, momentum), NOT the full taxonomy below.

**The one architectural bet:** model the critical path as **registry metadata** (`tier`,
`prereqs`, ordered path) from S2 — render it as a plain Notebook in v1; the visual
skill-tree is deferred. Cheap now, the spine of the whole "learn it all" vision later.

**Sequence the operator chose:** finish converging this vision → **write the PRD-033 +
RFC-037 amendments** (formalize) → **then** return to the tactical slice view and possibly
resize. Tactical resizing happens AFTER the docs, not now.

## THE MILESTONE LADDER — the organizing spine (operator, 2026-08-29)

The curriculum is a **sequence of mission-goal milestones**, each a scenario that lines up
physics and adds new slices, so **completing the goals = understanding all of spaceflight**.
Not a random formula set — goals you line up. **These milestones are THREE things at once:**
(1) the learner's **curriculum**, (2) the **S2.5 workbench validation scenarios**, (3) our
**engineering anchors** — the end-to-end acceptance scenarios that prove the kernel works.
One artifact, three jobs. (🆕 new mechanics · ✅ existing kernel.)

| Milestone (goal) | New physics introduced | Existing kernel exercised |
|---|---|---|
| **M1 · Launch a rocket → orbit** *(= the MVP path, rungs 0–5 above)* | F=ma, weight, momentum/thrust, TWR>1, orbit = "falling around" | `engine-registry`, `ascent-physics`, Tsiolkovsky, ascent integrator |
| **M2 · Get to the Moon** | orbit velocity v=√(μ/r), transfer orbit, TLI burn, **SOI/patched-conic 🆕** | ✅ **`lambert-geocentric`** (ADR-085 — real TLI/LOI, Apollo-tested) ⚠️ NOT `cislunar-geometry` (geometric/app-side) |
| **M3 · Land on the Moon** | powered descent, NO atmosphere — thrust vs gravity, **ignition-altitude/hover 🆕** | `descent-physics` (airless), `descent-profile-registry` |
| **M4 · Get to Mars** | heliocentric transfer, launch windows (synodic), C3 escape | `lambert`, `lambert-grid` (⚠️ `porkchop.ts` = app-side rendering, not compute), `interplanetary-geometry`, `astronomy/planets` |
| **M5 · Land on Mars** | atmospheric EDL — drag, dyn. pressure, heating, entry corridor | `descent-physics` (atmospheric, per-body), entry-corridor figure |
| **M-return · Come home** | deorbit from LEO, heat shield, splashdown (mirror of M3/M5) | `descent-physics` (Earth return, 2-DOF orbital-decay) — the computed core; the trans-Earth coast *leg* renders from the app-side `geometric` producer, not kernel |
| **M6 · Leave the solar system** | escape velocity, **gravity-assist v∞-rotation + Oberth 🆕** (assists today = authored waypoints, not computed) | `orbital.ts` (vis-viva/escape), `interplanetary-geometry` |

**Why it holds together:** (a) M1→M6 is *complete* — launch, orbit, transfer, airless +
atmospheric landing, escape = all of spaceflight, no padding. (b) **First principles
compound** — the M1 foundation (F=ma, gravity, thrust, momentum) *reappears* at every rung
(landing = thrust vs gravity; gravity assist = momentum exchange; orbit = centripetal), so
the learner watches 4 principles pay off in 6 escalating situations.

**MVP = the ENTIRE ladder** (operator 2026-08-29, corrected: NOT M1-only — every goal in both
families + kernel + mechanics + Lab + MCP ships in v0.9; v1.0 adds *more* beyond these docs).
**M1 is built first** (it proves the machine), then M2…M-return + G7–G10 all ship. Additivity
is the bet — each later milestone is scenario-authoring + budgeted new physics, no structural
rebuild — **validated live at the M2 checkpoint. Architect the milestone/critical-path data
model now** so later milestones are *content added to a proven structure*, not rebuilds.

> **Post-Fable-5 corrections (round 1, 2026-08-29) folded into PRD-033 A01 + RFC-037 A01:**
> (1) **Provenance is a fidelity axis** `computed | geometric | replayed-published` — some
> "kernel" geometry (`cislunar-geometry` Tier-1) draws *shapes*, not integrated truth, and
> must not be stamped `computed` to a learner (reclassified app-side; S1 manifest revised).
> (2) **Per-milestone new-physics budget** — the ladder needs bounded *new astrodynamics
> sideways* (SOI, ignition-altitude, gravity-assist/Oberth, eclipse), not just the mechanics
> floor; each named + pulled demand-driven. (3) **Demand-driven mechanics** — no formula
> lands until a goal pulls it (friction/collisions/rotational/fluids/thermo stay out). (4)
> `assumptions: string[]` on every result (the real honesty payload for teaching). (5) The
> "M2 costs a fraction of M1" gate is an **executable dry-run** at S3, not a slogan.

## Proposed classical-mechanics taxonomy (for the amendment — size later)

- **Kinematics** — 1D/2D motion, projectile, free-fall (v=u+at, s=ut+½at², v²=u²+2as).
- **Dynamics** — Newton I/II/III, F=ma, friction, general drag (½ρv²C_dA).
- **Momentum & collisions** — p=mv, impulse, elastic/inelastic (restitution).
- **Energy & work** — KE, PE, work-energy theorem, conservation, power.
- **Gravitation** — universal law F=Gm₁m₂/r², two-body energy (partially exists in orbital.ts).
- *(later / "too complex" tier)* — rotational (torque, L, I), oscillations (SHM, pendulum),
  fluids (buoyancy, pressure — ocean-world tie-in), basic thermo (atmospheric).

Each is a `FormulaDef` in the registry with a `FigureSpec` (projectile arc, v–t graph,
free-body diagram, energy bar) — most FigureSpec kinds already planned in RFC-037 §4.

## Sequencing recommendation

1. **S1** — carve existing kernel (unchanged by this).
2. **PRD-033 amendment + RFC-037 amendment** — adopt classical mechanics as in-scope;
   define the `mechanics/` subdomain + any new FigureSpec kinds. Do this **when S2 is
   picked up**, so the registry contract and the new domain are designed together.
3. **`mechanics/` domain** — greenfield formulas + tests + citations, registered in S2.
4. **S2.5 workbench scenarios** — cover the new formulas alongside the spaceflight ones.
5. **NL ask-box (T4)** — after S4 (MCP); the upper layer over the whole enriched registry.

**Open for later discussion (operator deferred):** exact depth of the classical tier
(where "too complex" cuts), and how the NL layer, the MCP, and the Lab renderers fit
together end-to-end. Not decided here — captured so it shapes the kernel from the start.
