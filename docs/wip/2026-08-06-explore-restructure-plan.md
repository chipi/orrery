# /explore god-file restructure — RFC-036 Workstream C (#443)

Same pattern as WS-B (`/fly`, now landed): split the tangled **scale-shell
orchestration** (pure logic → a tested controller) from the **3D scene layer**
(the `onMount` → a scene host), meeting at the one-way seam contract (RFC-036 §4).
`/explore/+page.svelte` is **8,816 lines**. Byte-identical behavior is the hard gate.

## Pickup state
- **WS-A + WS-B landed** (`/fly`), unpushed on `content`. WS-C is blocked-by them (pattern proven).
- Reuse the WS-B *pattern*, not the code: pure controller (C1) → scene host (C2) → thin page (C3) → verify (C4).

---

## C0 — onMount + scale-shell map (done 2026-08-06, read-only)

**Shell discriminant:** `contextId` (line 915) `$state<'solar-system' | 'neighborhood' | 'milky-way' | 'local-group' | 'body-scene'>`. There is **no** `activeScale`/`viewScale` — `contextId` IS the active-scale field. The transition engine `ContextGraph` (`$lib/universe/context-graph`, 205 lines — `activeId`, `crossBoundary`, `cross(transition, camDist)`, `rebaseDistance`) is **already a pure module**; scale-readout math is already in `$lib/universe/scale-readout`. So `/explore`'s pure surface is **thinner than `/fly`'s** — the ladder + rebasing already live in `$lib`.

**The shell ladder:** `CTX_ORDER = ['solar-system', 'neighborhood', 'milky-way', 'local-group']` (page line 4609). The `contextDeepLinkFn` walker (4620–4637) climbs OUT/IN one level at a time via the scene-coupled `crossOut*`/`crossIn*` fns until the active level == target. `body-scene` + `black-hole` + `deep-sky` are *sub-shells* off `neighborhood`, not ladder rungs.

**Two `onMount`s:** (1) line 418–420 — tiny `exploreRegimes` data fetch, stays on the page. (2) **lines 1510–6089** — the ~4,580-line scene closure (the C2/C3 target).

**onFrame loop:** lines 5562–6041 (`createAnimateLoop`). Shell dispatch at 5972–6019 (BH / body / neighborhood / milky-way / local-group each `.update`+`.render`).

**onMount regions (C2/C3):** renderer/host 1510–1768 · solar-system scene assembly (inline, huge `PLANETS.map` 1877–2513) 1769–2961 · camera state 2963–3003 · scale-shell boundary machinery (ensure*/cross* fns, dynamic scene imports) 3005–3899 · input listeners 3974–5098 · onFrame 5562–6041 · cleanup 6043–6089.

**Existing `$lib` seam (host builds over these):** `$lib/universe/{context-graph, neighborhood-scene, body-scene, milky-way-scene, local-group-scene, black-hole-scene, scale-readout, deep-sky-lod}`, `$lib/three/{scene-renderer, star-field, animate-loop, route-lifecycle, dispose-object3d, iconic-trajectory}`, `$lib/explore-scene` (`PLANETS`), `$lib/galaxies-layer`.

**Deep-link routing (the untested, bug-prone surface):** 10 params — `?context ?galaxy ?id ?goto ?system ?deepsky ?bh ?regime ?paths+?focus ?mission` — each a read `$effect` (dispatch to a fn-pointer) + a write-back `$effect` (state → `replaceState`) guarded by a `lastXxx` var. Read effects: 1241–1494; cold-load resolvers: 3779–3812, 4639–4651.

**Bridge hazards (frame/listener → `$state` → template):** `contextId scaleReadout scaleBarPx scaleBarLabel simDateLabel sunCompass warpCaption crossingFlashId hoverData anonStar` + the `live*` DebugPanel passes. Same get/set-bridge pattern WS-B used.

**~24 fn-pointers** (`flyToBodyFn`/`exitNeighborhoodFn`/`contextDeepLinkFn`/… declared null at script scope 1101–1156, assigned inside onMount) — the current page↔scene seam; C2 replaces them with the host handle.

---

## C1 — `scale-shell-controller.ts` (pure, tested) — **LANDED (2026-08-06, uncommitted → checkpoint)**

`$lib/explore/scale-shell-controller.ts` + 22 unit tests. Exports: `resolveSolarBodyTarget(id, membership)` (the `?id=` router incl. the Pluto-prefer-small-body nuance), `contextLevel` + `planShellJump`/`planShellJumpTo` (the ladder-climb planner), `isValidShellTarget` (the `?context=` guard), `CTX_ORDER`. Page wired: the `?id=` `$effect` dispatches on `resolveSolarBodyTarget`; the `contextDeepLinkFn` walker + cold-load resolver use `contextLevel`/`isValidShellTarget` (the duplicated local `CTX_ORDER` deleted). **Gates:** svelte-check 0 errors / 3328 files · 22 controller tests pass · `/explore` e2e desktop-chromium **27 passed / 0 failed** (1.7m) · browser smoke: `?id=pluto` → dwarf-planet (small-body) panel, `?id=mars` → planet panel. Pure module → coverage-**counted** (adds covered lines, no exclusion). Byte-identical.

Unlike `/fly`, the shell *transitions* already live in `ContextGraph`. C1 extracts the two pieces that are **pure, untested, and bug-prone**:

1. **The ladder planner.** `contextLevel(contextId) → 0..3`; `planShellJump(fromLevel, toLevel) → Array<'out'|'in'>` (the deterministic step sequence the walker executes). Catches walker/off-by-one bugs.
2. **The deep-link intent resolver.** `parseExploreDeepLink(params) → ExploreIntent` — priority-ordered normalization of the 10 URL params into one intent `{ kind, value }`, plus `intentToParams(state)` for the write-back direction. Catches routing-to-wrong-shell bugs (the `/fly` analogue was scrub-U → act).

Pure (no svelte/three/dom), coverage-gated, unit-tested. The page keeps the scene-coupled `crossOut*`/`crossIn*` execution but drives it from the controller's plan.

## C2 — `explore-scene-host.ts` + per-shell modules
Move onMount scene assembly (solar-system inline build + the ensure*/cross* orchestration + onFrame) into a host over the existing `$lib/universe/*-scene` seam. Bridge the frame-written `$state` (contextId/scaleReadout/…) like WS-B. Highest-risk slice.

## C3 — thin the page
onMount → create host + wire listeners + deep-link effects (driven by C1) + cleanup. Target the same "wiring only" shape as `/fly`.

## C4 — verify + land
`/explore` e2e both projects + per-shell manual confirm (solar → neighbourhood → galaxy → Local Group → universe) + shell-boundary visual/geometry check. Byte-identical.
