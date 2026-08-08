# Handover — RFC-036 god-file decomposition (done) → the `/explore` v2 roadmap (next)

*2026-08-08 · for a fresh session. Everything below is **live on prod**; this is a
"what we did / what we didn't / what's next" map, not a to-do that's mid-flight.*

---

## TL;DR

Two 8–11k-line god-files (`/fly`, `/explore`) were decomposed into thin pages over
**pure, tested controllers** + **`$lib` scene hosts**, byte-identical, and shipped all the
way to prod. The whole thing is **done, green, and deployed** — nothing is half-finished.
The point of doing it now: `/explore` is finally **extensible**, which unblocks the four
deferred roadmap features (#258, #259, #410, #411) you want to build next.

---

## 1 · What we did (RFC-036 — `docs/rfc/RFC-036.md`)

A **behavior-preserving refactor**. Byte-identical was the hard gate; verified on both e2e
projects. Landed as many small e2e-gated commits, then pushed `content → main`.

### WS-A + WS-B — `/fly`: **10,890 → 6,496 lines** (onMount ~4,870 → ~559)
- `src/lib/fly/flight-phase-controller.ts` — pure launch→coast→cruise→cislunar→flyby→descent
  state machine, **21 tests**.
- Scene layer split into `$lib/three/`: `fly-{helio,cislunar}-overlays` (builders),
  `fly-{helio,cislunar}-reactive` (overlay layers + listeners), `fly-helio-mission`
  (per-mission tubes/markers/model), `fly-camera-controller` (the cinematic camera),
  `fly-frame-runner` (the ~1,465-line `onFrame` + `draw2d`), `fly-input-handlers`,
  `fly-scene-host` (the whole scene assembly).

### WS-C — `/explore`: **8,816 → 4,720 lines** (onMount ~4,580 → ~523)
- `src/lib/explore/scale-shell-controller.ts` — pure, **22 tests**. Owns:
  - `resolveSolarBodyTarget(id, membership)` — the `?id=` router (incl. the
    Pluto-in-two-catalogues nuance).
  - `CTX_ORDER` = `[solar-system, neighborhood, milky-way, local-group]`, `contextLevel`,
    `planShellJump` / `planShellJumpTo` — the **shell-ladder planner** (the pure core of the
    zoom-out/zoom-in walker).
  - `isValidShellTarget` — the `?context=` guard.
- `src/lib/three/explore-solar-scene.ts` — the inline solar-system 3D assembly (belts,
  planets + satellites + orbiters + overlays, small bodies, selection ring, LOD updaters).
- `src/lib/three/explore-scene-host.ts` — **the entire remaining onMount** (camera + per-frame
  loop + `draw2d` + all pointer/pick/hover input + the scale-shell orchestration:
  ensure/cross for every shell, deep-link cold-load resolvers, causality/HR/deep-sky) behind a
  **68-var bridge** (get/set over the frame-written `$state` + the `last*` deep-link guards)
  and a **34-fn-pointer handle**.

### Verification + deploy (all green)
- `svelte-check` 0 errors · full `preflight` green · `test:coverage` 4,816 passing
  (92.36/80.58/89.94/94.38).
- CI on `main` (`b490351e4d`): **CI · CodeQL · docker-e2e · mobile-e2e** all ✓.
- **Staging** (GitHub Pages, "Deploy preview" + "Validate staging") ✓.
- **Prod** (VPS / `orrerylearn.com`, `deploy-prod` run — deploy + validate both ✓), verified
  serving: homepage/`/explore`/`/fly` all HTTP 200, fresh build. Footer `0.8.0-2026-08-07-1`.
- Full plan docs: `docs/wip/2026-08-05-fly-restructure-plan.md`,
  `docs/wip/2026-08-06-explore-restructure-plan.md`.

### Housekeeping still open (your call — I didn't touch)
- **Tracking issues #440 / #441 / #443 are still OPEN** but the work is done + deployed →
  ready to close (I don't close issues without your say-so).

---

## 2 · What we did NOT do (RFC-036 §5 Non-Goals — deliberate)

- **No behavior change** of any kind — no visual/timing/cinematic/UX difference. Pixel- and
  frame-parity was the requirement.
- **No physics rewrite** (`fly-physics`, `ascent-physics`, `descent-profile` untouched).
- **No re-homing** of the existing `fly-*-scene` / `universe/*-scene` modules — the hosts build
  *over* them; they stayed put.
- **No feature work** — the four roadmap items below were explicitly out of scope and remain
  untouched.

**One flagged-and-cleared item:** a mobile `reset-to-today` e2e failed on my *local*
macOS/arm64 but **passes on CI Docker + on prod** — a local-env timing artifact, not a bug.
If it ever recurs on CI, start at `tests/e2e/explore-time-controls.spec.ts:101` and
`resetSimToToday` in `explore-scene-host.ts`.

---

## 3 · What's next — the `/explore` v2 roadmap (why the refactor unblocks it)

All four are **OPEN**, `explore`-labelled, and were the reason to refactor first: `/explore`
is now a controller + scene-host you can extend without touching a 4,580-line closure.

| # | Feature | How the refactor helps · suggested entry point |
|---|---|---|
| **#258** | **scale-toggle** — Solar System / Stellar Neighbourhood / Local Group quick-jump UI | The ladder already exists in `scale-shell-controller` (`CTX_ORDER`, `planShellJumpTo`). This is mostly a **UI**: buttons that call the existing `contextDeepLinkFn` (on the host handle) / drive `planShellJumpTo`. Lowest-effort of the four; good warm-up. |
| **#259** | **new `/cosmos` route** — Powers-of-Ten zoom (solar → stellar → galactic → Local Group → Virgo / Laniakea) | A **new route** that reuses the WS-C pattern: its own `scale-shell-controller`-style ladder (extended past Local Group to Virgo/Laniakea) + an `explore-scene-host`-style host. `explore-scene-host.ts` is the template; `$lib/universe/*-scene` modules are the reusable shell builders. Biggest of the four. |
| **#410** | **message-object trajectories** — Voyager/Pioneer/New Horizons + Golden Record / Arecibo / ʻOumuamua | Content + scene work now localized to `explore-solar-scene.ts` (add trajectory objects, like the existing iconic-trajectory layer) + a data source. The `/fly` `fly-helio-mission` trajectory-tube pattern is a strong reference for the curves. |
| **#411** | **grand-tour narration** — guided cinematic flight across the nested shells | Script a tour using `planShellJump` to sequence shell crossings, driven through the host's `contextDeepLinkFn`. Reuse `/fly`'s cinematic-beat + tour-stage patterns (see `project_tour_stage_authoring` memory + `/fly`'s `fly-cinematic-*`). Depends conceptually on #258/#259 existing. |

**Suggested order:** #258 (quick, proves the new seam is pleasant to build on) → #410
(content, self-contained) → #259 (the big new route) → #411 (the capstone tour, wants the
shells rich first). But that's a suggestion, not a constraint.

**Before building any of them:** these are *feature* work (behavior change), so they each
want the normal treatment — a PRD/RFC or at least a design note, the visual-anchor-before-UX
step for anything user-facing (see `feedback_visual_anchor_before_ux_commit`), and the
global-space-program representation rule (CNSA/ISRO/JAXA/Roscosmos/ESA, not NASA-only) for
#410's craft/messages.

---

## 4 · Fresh-session pickup pointers

- **Architecture map:** `docs/adr/TA.md` (read first for anything cross-file).
- **This refactor's design + lessons:** `docs/rfc/RFC-036.md` + the two `docs/wip/*restructure-plan.md`.
- **Memory:** `project_rfc036_godfile_decomposition_landed` (module map + the scene-host gotchas).
- **The one gotcha that matters if you extend a scene host:** the `bridge`/`refs`/`deps`
  objects are `any`-typed, so **typecheck does NOT catch a mis-wired dependency — e2e is the
  real gate.** Any verbatim retarget also mangles object keys/shorthands, `.member` access,
  comments, and lone function-args; drive fixes strictly off typecheck + a full e2e pass.
- **State:** `main` = `origin/main` = `b490351e4d`, clean, deployed to staging + prod.
