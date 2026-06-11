# `src/lib/three/` — Orrery's 3D scaffolding library

Typed factories + utilities the 3D routes (`/explore`, `/fly`,
`/earth`, `/moon`, `/mars`, `/iss`, `/tiangong`) share. Reach for
these first before hand-rolling raf loops, listener registries, or
`userData` casts inside a route.

## Discoverability matrix

| Need | Use | What it owns |
|---|---|---|
| Scheduled per-frame work (raf + dt) | `createAnimateLoop` | raf pump, dt-clamp, reduced-motion gate, **`document.hidden` pause** (TA.md contract), cleanup |
| Cleanup hygiene for events + disposables | `createRouteLifecycle` | wraps `addEventListener` + arbitrary `dispose()` thunks; LIFO drain on cleanup |
| Typed read of `Object3D.userData` | `createUserDataTag<T>` | discriminator-stamped wrapper; eliminates `as unknown as` casts in pick handlers |
| WebGL renderer + canvas attach | `createSceneRenderer` (existing) | renderer construction with pixel-ratio cap, canvas attach |
| Renderer + outline-pass disposal | `disposeSceneRenderer` (existing) | matching teardown |
| Standard canvas input listeners | `bindCanvasInputs` (existing) | mouse / touch / wheel + hover; returns the matching `removeEventListener` chain |
| Closest 2D NDC hit testing | `pickClosest2D` (existing) | screen-space pick fallback for routes that don't run a full Three.js raycast |
| Object3D disposal walk | `disposeObject3D` (existing) | recursive geometry / material / texture dispose |

## Critical contract — `document.hidden` pause

`docs/adr/TA.md` declares every 3D scene **must** pause its raf loop
when `document.hidden` is true. Backgrounded tabs that don't honour
this burn CPU + battery while invisible. As of #329, the only
enforced path is `createAnimateLoop`'s built-in visibility listener —
any route that wires its own raf without going through this factory
leaks the contract.

**If you find yourself writing `requestAnimationFrame(...)` directly
inside a route, stop.** Use `createAnimateLoop` instead. The opt-out
(`ignoreVisibilityPause: true`) exists for diagnostic harnesses
only — never for user-facing routes.

## Conventions

- **Each factory returns a `cleanup` function.** Always wire it into
  `onDestroy` via the lifecycle registry, not a hand-stowed thunk.
- **`createRouteLifecycle().on(target, event, handler, opts)` instead
  of `addEventListener` + paired removal.** Forgetting the removal
  is the most common leak source in this codebase.
- **`createUserDataTag<T>('something')` at module top-level**, then
  reuse the resulting writer/reader on every mesh that carries that
  payload. Don't inline `obj.userData.something = ...` at call sites.
- **Don't subclass Three.js classes.** Compose via the factories +
  user-data tags instead. Subclassing fights tree-shaking + makes
  disposal walks harder.

## Adding a new factory

Land it as a sibling file with:
1. A docstring naming the pain point + the routes that benefit
2. A typed return value, never an opaque `Object3D`
3. A focused unit test file (jsdom environment, no real WebGL)
4. A row in the discoverability matrix above

## Cross-references

- `docs/adr/TA.md` — the visibility-pause contract (and others)
- `docs/guides/non-fly-modules-audit-plan.md` — the audit that
  surfaced these factories from the 7-route duplication
- #329 — the umbrella issue for this consolidation work
- #325 — the raf+Three.js test harness that depends on these
  factories to remove its own ad-hoc renderer setup
