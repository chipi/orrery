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
| The orbit ruler's regime in a scene | `buildRegimeHighlight` | one group of annulus + `Line2` edges, great-circle shell or pin rings per regime shape (`$lib/orbit-regime-geometry`), `set(hover, active)`, `update(camera, w, h, t, still)` per frame, `dispose()`; `explore-scene-host.ts` and `SurfaceScene` both use it (UXD-024) |
| An iconic mission's trajectory, markers and boxes | `buildIconicTrajectory` (`iconic-trajectory.ts`) + `iconic-box.ts` | the Line2 path, the milestone markers (the pick contract: `PICK_KINDS`, `userData`, `pickTargets`), the per-frame sizing and placement of the milestone boxes (`n/N · date` header, name body, 12 px at any zoom, drawn at the first highlight) and the one mission box at Today, through `universe/scene-pins.ts` `placeLabels` (UXD-026); `iconic-box.ts` is the pure text and size part (`boxHeader`, `wrapText`, `layoutBox`) |
| Soft-edged alpha mask for a square patch | `featherMask(edge)` | smoothstep fade over the outer `edge` fraction; each call returns its own texture over one cached buffer, so `disposeObject3D` on one patch never strips the mask from the others (#641) |

## Colour pipeline — one output step

Composer targets are linear. The renderer's `toneMapping`, `toneMappingExposure` and
`outputColorSpace` apply only when drawing straight to the canvas, so a composer scene without a
final `OutputPass` shows raw linear values (darker, higher contrast, ACES ignored) while a
direct-render tier or scene shows ACES + sRGB. Rules (guarded by `output-step-rule.test.ts`):

- **Every `EffectComposer` ends in exactly one `OutputPass`, last** — after bloom, bokeh, film and
  vignette. `createOutlinePassSetup({ outputPass: true })` does it for the surface and station routes;
  `explore-render-stack.ts`, `ascent-renderer.ts`, `fly-helio-scene.ts`, `milky-way-scene.ts` and
  `local-group-scene.ts` add their own. A new composer adds one in the same change.
- **Every colour texture sets `colorSpace = THREE.SRGBColorSpace`; every data map (roughness, alpha
  mask, anything not a colour) sets `THREE.NoColorSpace` explicitly.** An untagged texture is read
  as linear and comes out lighter than authored once the OutputPass encodes.
- Hex `THREE.Color` constants are already sRGB-aware (`ColorManagement`); do not pre-convert them.
- **Shader colours are `THREE.Color` uniforms; no raw `vec3`/`vec4` colour literals in GLSL** (0 and 1
  are fine). A colour-named uniform (`uColor`, `uHorizon`, `rimColor`, ...) is `new THREE.Color(hex)`,
  never an array or `Vector3`. A raw sRGB literal is read as linear and the OutputPass encodes it a
  second time (pale colours). Guarded by `output-step-rule.test.ts`
  (exceptions are listed there with a reason).
- Bloom thresholds, exposure and light intensities are tuned against the OutputPass output, not
  against raw linear values.

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
