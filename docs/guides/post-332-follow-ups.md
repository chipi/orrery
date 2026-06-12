# Post-#332 follow-ups (June 2026)

Punch list captured after the foundational-refactors PR landed on main. Items
1–4 are tracked separately by Marko + the other agent; items 5–9 are open
here for future sessions.

## Tracked elsewhere (Marko + other agent)

### 1. 2D-debug helper / orbital math extraction
Extract Kepler propagation, spacecraft position, camera position, and screen
projection into pure fns under `$lib/orbital/`. Render a minimal black-and-
white 2D view of route / planet / ship / camera so the math is verifiable
without the 3D stack. The 2D view consumes the same fns the 3D scene will
eventually call — sanity check: if 2D and 3D disagree about Curiosity at
MET=100 days, the bug is in the renderer, not the math. Doubles as a
production helper for debug overlays + future test harnesses.

### 2. #327 — data.ts split + DAL architecture review
Phase 0 ADR answering the 7 architectural questions captured in the issue
body (per-domain vs shared cache, query-key pattern vs lazy singletons,
locale-overlay helper extraction, barrel-or-sweep, provenance-stays-or-moves,
cache invalidation policy, foot-gun-proof cache-import shape). Phase 1 is
the mechanical 10–11 module split, barrel-keep. `RemoteData<E,T>` (commit
3 of #332) is the consumer shape the split should adopt.

### 3. /fly effect-ladder consolidation (#330 C.3)
Deferred from #332 commit 12. /fly has 8+ scattered `$effect` blocks
reacting to overlapping state (mission load, arc changes, view-mode
switches, phase markers, cinematic state). Consolidate into 2-3 coordinated
effects with internal `switch(reason)` dispatch. Needs careful cinematic-
timing analysis so consolidation doesn't break the iconic-shot / flyby
choreography landed on main during the #332 rebase window. The lifecycle +
animate-loop foundation from #332 commit 8 is in place to build on.

### 4. /fly Apollo 11 phase-marker-jump test flake
`tests/e2e/fly-apollo11-phase-markers.spec.ts:242` — pre-existing on main,
not introduced by #332 or the post-rebase CSS fix. `force: true` click on
the phase-marker dot somehow navigates the page to `/missions` (snapshot
shows LaunchesBanner). The button has `type="button"` + plain `onclick=
{onJump}` so the navigation is unexpected. Likely a hit-test / event
bubbling issue with overlay z-stacking after the recent /fly cinematic
work. Track + reproduce locally with headed Playwright.

## Open here (deferred from #332)

### 5. Mission image rework — missing + garbage + hero selection
Scope: combined pass over `static/images/missions/<id>.jpg` (card cover) +
`static/images/missions/thumbnails/<id>.png` (trajectory thumbnail) +
`static/images/missions/<id>/...` (per-mission gallery).

- **Missing entirely (4 missions, allowlisted in
  `tests/e2e/_helpers/console-errors.ts`):**
  `inspiration4`, `polaris-dawn`, `otv-6`, `otv-7`. Slice B/C shipped
  index entries without art; cards render with `cover-missing` graceful
  degradation.
- **Garbage that passed scoring:** Marko reports the existing
  algorithmic scoring lets through low-quality images, especially in the
  hero slot. Hero is the most visible asset and the worst hit.
- **Hero selection:** which image becomes the "hero" per mission needs
  a tighter selection rule, not just a score threshold.

Next-step framing in progress with Marko (see "Image pass — framing"
section in chat). Will fold into this section once the spec is set.

### 6. createSceneContext + createPickHandler
Deferred from #329 commit 4. Existing `scene-renderer.ts` +
`bindCanvasInputs` cover the 5-of-7-route happy path. /iss + /tiangong's
WebGL-availability + quality-tier-aware setup should drive the
`createSceneContext` shape — easier to land alongside the first new
consumer (e.g. a #325 raf + Three.js test harness) than to over-design
in isolation.

### 7. Object3DUserData adoption sweep
The `createUserDataTag<T>` wrapper landed in #329 commit 4 with 11 tests
but no callers migrated. ~27 `as unknown as` clusters across
`iss-proxy-model.ts`, `tiangong-proxy-model.ts`, and
`station-assembly-anim.ts` are the audit-identified targets. Mechanical
sweep once #325 (raf + Three.js test harness) lands, since the wrapper
makes pick-handler tests trivially easier.

### 8. RemoteData migration on /iss, /tiangong, /plan
#332 commit 10 migrated /missions + /fleet. The remaining routes have
complex IO state shapes:
- `/iss`, `/tiangong`: two parallel fetches (`modules` + `visitors`)
  share a single `loadFailed` flag. Each becomes its own
  `RemoteData<Error, IssModule[]>` and a derived
  `loadFailed = isError(modulesRequest) || isError(visitorsRequest)`.
- `/plan`: multiplexes `computing` / `progress` / `loadFailed` over a
  porkchop-grid compute + load path. RemoteData's three-state shape
  doesn't naturally absorb `progress`; needs a parameterised variant or
  separate `progress` field.

### 9. useUrlParam sweep beyond SurfaceScene hotspots
#332 commit 11 migrated `SurfaceScene`'s `?hotspots=` to `useUrlParam<T>`
as the worked example. Other audit-flagged sites have awkward shapes:
- Panorama `?pano + ?yaw + ?pitch`: 3 correlated fields syncing
  together; useUrlParam's single-field shape doesn't fit. Needs a
  panorama-specific wrapper or a multi-field rune variant.
- Station `?view + ?module`: already abstracted via `syncStationUrl`;
  migration refactors the helper rather than the route.
- `/missions` filter set: overlaps #332 commit 9's typed filterState
  bag pattern — adopting useUrlParam would mix two structures in the
  same file. Bag stays for filters; useUrlParam is the right tool for
  isolated single-field contracts.
- `/explore` `?focus= / ?paths= / ?id=`: read-only deep-links with no
  write-back; existing `$effect` pattern is already minimal.

Could fold into #327's follow-up once data.ts decisions settle.

---

*Captured June 2026 after #332 (foundational-refactors PR) shipped to
main at commit `0d284611a`.*
