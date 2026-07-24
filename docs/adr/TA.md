# TA — Technical Authority
*Orrery · Reference document · v3.2 · July 2026*

This is the reference document for the technical plane. RFCs anchor to it by section. ADRs update `§stack` and `§map` when decisions are locked. Authoritative listings: [`index.md`](index.md) (ADRs), [`../rfc/index.md`](../rfc/index.md) (RFCs), [`../prd/index.md`](../prd/index.md) (PRDs).

v2.0 caught up from v1.9 (May 2026, ADR-033) through **v0.6.0 reality** — 5 new routes, 25 new ADRs, the Fleet / Science / ISS / Tiangong / Mars / Cislunar subsystems, the Provenance pipeline, the Science Lens, and the multi-layer overlay state machine.

v2.1 catches up through **v0.7.0 reality** — audio narration system (PRD-016 / RFC-019), surface hotspots (RFC-017) shipped onto the corpus, docker-stack runtime (ADR-063–066) with sharded e2e workflow (W7), build-time compression + nginx static-serving (W3), centralised Three.js disposal (`disposeScene` helper), and content-visibility long-list perf (W4).

v2.2 catches up through the **`/fly` throne-of-glory sweep (June 13-14 2026)** — every A-B-C-D mission segment of the existing catalog now composes an iconic hero shot at its narrative beat. Body wiring is now a repeatable checklist (see §body-wiring below) with Arrokoth (commit `e6e9175b`) as the worked example for adding new flyby destinations. New destinations landed: Pluto + Arrokoth (Pluto already was a DestinationId but not flyby-wired; Arrokoth is fully new), Halley + 67P (comet nuclei for Giotto + Rosetta), Vesta + Ceres + Psyche + Bennu (asteroid bodies for Dawn / OSIRIS-REx / Psyche / DART). Cislunar Tier-1.5 hybrid waypoint data gets a "swing-by hold" detector that synthesises lunar_flyby / descent phases for missions whose authored waypoints "park" the spacecraft at periselene (Apollo 11/13/17, Luna 9/16, SLIM, Chandrayaan-3, Chang'e 5, etc.). Per-event MoonComposition variants tune each cislunar beat (loi / tei / descent_start / ascent / flyby / edl_or_oi / arrival). Race-free DEV-only test hooks `__flySetSimDay` + `__flyCislunarDebug` survive multi-Claude-session chrome-devtools-mcp interference. ADR-077 captures the architecture.

v2.3 catches up through the **`/fly` approach-camera + debug-instrument rework (June 2026)** — the orbiter-arrival composition (`buildArrivalComposition` / adaptive spatial lead) that stops the ship glyph sitting on the planet disc at orbit insertion, the decorative-moon strobe fix (wall-clock drift, decoupled from `simSpeed`), and the `FlybyDebugViewer` upgrade into a live instrument (live ship + real-camera-path tracking, sun/terminator + elevation overlays, auto-solve) backed by the `npm run audit:fly-cameras` all-missions regression dashboard at `/dev/fly-cameras`. See §"Scene 2" above.

v2.4 catches up through the **`/fly` multi-camera flyby montage (#371, June 2026)** — flybys now play as a beat-cut shot sequence (establish → approach → hero → depart-catapult) with slow-motion across the close passage and no freeze-frames, replacing the single continuously-repositioning camera. Pure shot rigs in `$lib/orbital/flyby-shots.ts` + schedule/selector in `flyby-shot-schedule.ts`; the audit + `/dev/fly-cameras` dashboard now report per-shot verdicts. See §"Scene 2" above.

---

## §components

The subsystems of the production application, grouped by concern.

### Application shell

**Router** — SvelteKit's built-in router using the History API. File-based routing in `src/routes/`. Clean URLs: `/explore`, `/fly?mission=curiosity`, `/missions?dest=MARS`. GitHub Pages deploy uses a `404.html` SPA-redirect workaround per ADR-014. See ADR-012, ADR-013.

**Nav bar** (`src/lib/components/Nav.svelte`) — shared across every route. Hamburger collapse on mobile (≤500 px) per the v0.6 mobile pass; locale switcher (ADR-057), share button, and route chips on desktop.

**Footer** (`src/routes/+layout.svelte`) — version chip linking to GitHub README, `/credits` link, `/library` link (ADR-051). Stays clear of bottom-of-page CTAs on mobile.

**Right panel** (`src/lib/components/Panel.svelte`) — shared detail panel used by /explore, /missions, /moon, /mars, /earth, /iss, /tiangong, /fleet. Bottom sheet on mobile (per ADR-018), right drawer on desktop. Renders header, tab strip (OVERVIEW / TECHNICAL / GALLERY / LEARN / ANATOMY / FLIGHTS / SCIENCE — per-panel subset), scrollable content, optional action footer.

**Service worker** — `@vite-pwa/sveltekit`-generated. Caches the shell + critical data on first paint; the app survives subsequent reloads offline. Install prompt and `data-high-contrast` attribute on `<html>` for accessibility. See ADR-029.

**DebugPanel** (`src/lib/components/DebugPanel.svelte` + `DebugPanelRegistrar.svelte` + `debug-panel-context.ts`) — in-app inspector, surfaced on every route via `?debug=1`. Mounted once from `+layout.svelte`; a Svelte context (created on the layout, not the panel — siblings under `<main>` need a shared ancestor) lets any page register a page-specific snippet as a "Page" tab via `<DebugPanelRegistrar label="X" content={snippet?} />`. Built-in tabs: Page (conditional), Perf (FPS + frame time, stub for rolling avg / low-1%), i18n (current locale, stub for missing-key warnings), Route (`pathname` / `search` / `hash`). `/fly` registers `FlybyDebugViewer` (2D Canvas chart for iconic-shot camera math); other surface routes register a label-only header. Expand the stubs as you fix issues — agents are expected to reach for this before `console.log`. See AGENTS.md §"Debugging — `?debug=1` is the in-app inspector".

### Accessibility & keyboard/TV navigation (RFC-031 · executes ADR-025 Tier 2)

One shared interaction model for **keyboard, screen reader, and TV D-pad remote** (a remote is a keyboard: ←→↑↓ + Enter/Back), so a fix for one is a fix for all three. Target conformance is **WCAG 2.1 Level AA** (`docs/accessibility.md` is the public statement).

**Roving focus engine** (`src/lib/a11y/roving-focus.svelte.ts`) — framework-agnostic core: `stepInOrder` (list wrap-around) + `nearestInDirection` (2-D spatial nearest-neighbour with a cross-axis penalty) + a `createRovingFocus` factory that tracks registered items, the current id, and roving tabindex (0 for current, −1 for the rest). Pure + unit-tested (`roving-focus.test.ts`).

**`use:roving` action** (`src/lib/a11y/roving.ts`) — the Svelte binding: applies roving tabindex to a container's focusable children, maps arrow keys to list/spatial movement, and a `MutationObserver` re-normalises tabindexes when the child set changes (dynamic `{#each}` lists). Disconnects observer + listeners on `destroy()`. Applied to the nav toolbar, `/posters` grid, surface site index, and the object indexes below.

**Canvas object indexes (the DOM "mirror")** — the piece ADR-025 deferred. Each 3D/2D scene exposes a keyboard-reachable DOM list of its selectable objects, and selecting a row does exactly what a canvas click does: `/explore` **body index** (`ExploreBodyIndex.svelte` — Sun, planets, small bodies), the surface **site index** (`SurfaceIndexPanel.svelte` — `/moon` `/mars` `/earth`), and the `/iss` · `/tiangong` module lists. Camera *manipulation* (orbit/pan/zoom) stays pointer-driven — RFC-031 S4, deferred; reachability does not depend on it.

**Command palette** (`src/lib/components/CommandPalette.svelte`) — app-wide Cmd/Ctrl-K jump-to-anything (routes + key bodies), wired in `+layout.svelte`. ARIA combobox+listbox: options are exposed via `aria-activedescendant` (not tab stops), Tab is trapped, focus restores to the opener on close. The force-multiplier for keyboard + D-pad users where sweeping a long list is painful.

**TV 10-foot layer** (`src/lib/styles/app.css`) — a media query (`hover:none` + `pointer:coarse` + `min-width:1100px` + `max-resolution:1.5dppx`, the last excluding high-DPR tablets) that pulls overscan-safe insets from the `--safe-area-inset-*` vars and thickens focus rings for 10-foot legibility. Leanback manifest + banner ship in the Android project (RFC-030).

### Routes

The production app ships **13 primary routes** (the core experience below; nav-hub pages `/catalog` · `/learn` · `/explore/hub` and `/programs` are additional). Each is a SvelteKit page module under `src/routes/<route>/+page.svelte`. Pages do not share mutable state directly — they communicate via the data client + URL search params (`$page.url.searchParams`).

| Route | Purpose | Anchored by |
|---|---|---|
| `/` | 30-second orientation; 11-card route grid | PRD-013 |
| `/explore` | Solar System Explorer · 3D orrery + per-body Science Lens layers · per-planet 4K texture LOD swap (#287) for Mercury/Venus/Earth/Mars/Jupiter/Saturn/Sun; Uranus + Neptune stay 2K (SSS publishes no higher res) · user time controls — pause / 1×–100× days-per-sec / reset-to-today over a real-J2000-anchored sim clock (#351) | PRD-001 / ADR-012 / #287 / #351 |
| `/plan` | Mission Configurator · porkchop plot (9 destinations) | PRD-002 / RFC-006 / ADR-023 / ADR-026 / ADR-028 |
| `/fly` | Mission Arc · one continuous pad→arrival scrubber — **launch/ascent** (Scene 0: pad → orbit, integrated ascent EOM + per-vehicle launch profiles + procedural launchers), orbit-coast, heliocentric transfer (+ cislunar Earth-centered view), and **EDL descent** to touchdown/splashdown; force-vector Science Lens across every segment | PRD-003 / PRD-032 / RFC-034 / ADR-030 / ADR-058 / #412 |
| `/missions` | Mission Catalog · 113 flown / active / planned / concept missions (+ `/missions/launches` calendar, PRD-020) | PRD-004 / ADR-020 / ADR-027 |
| `/earth` | Hybrid scene — default orbital mode (ISS, Tiangong, Hubble, JWST, GNSS constellations) + surface mode (`?mode=surface`) with 14 launchpads via shared `SurfaceScene`. Mode toggle top-center. | PRD-005 / ADR-046 / ADR-072 / #285 |
| `/moon` | Moon Map · 16 surface sites + lunar orbiters with per-mission 3D models | PRD-006 / ADR-037 / ADR-038 |
| `/mars` | Mars Surface Map · equirectangular + 3D globe; 16 surface sites + 11 orbiters; rover traverses | PRD-007 / ADR-037 / ADR-038 / RFC-012 |
| `/iss` | ISS Explorer · 18 modules raycast-pickable; visiting spacecraft diagrams | PRD-010 / RFC-013 / ADR-040 / ADR-041 / ADR-042 |
| `/tiangong` | Tiangong Explorer · Tianhe + Wentian + Mengtian module overlays | PRD-011 / RFC-014 / ADR-048 / ADR-049 / ADR-050 |
| `/science` | Science Encyclopedia · 85 sections × 10 tabs · KaTeX · 71 SVG diagrams · ?-chip deep-links · Cmd-K search | PRD-008 / RFC-011 / ADR-034 / ADR-035 / ADR-036 |
| `/fleet` | Spaceflight Fleet · 137 entries × 9 categories with bidirectional cross-refs | PRD-012 / RFC-016 / ADR-052 / ADR-053 / ADR-054 |
| `/live` | Live feeds · pinned NASA ISS stream (click-to-load facade) + launch broadcasts time-gated off `$lib/launches` (link-out). Under the Catalog nav group. | PRD-031 / RFC-033 |

**Sub-routes + dev tooling (not in the route grid):** `/science/reading-list` + `/science/watch-list` (curated book / documentary / podcast / channel lists), `/library/episodes` (audio episode index, RFC-019). `/dev/*` (model preview, staging-ground review per RFC-029, Slice-A approval, UI style-guide) are **developer-only** — `src/routes/dev/+layout.ts` 404s the subtree in any non-dev build.

**Disclosure + gallery pages:** `/credits` (image + text-source provenance per ADR-047), `/colophon` (the *original*-work bill-of-materials — spacecraft anatomy art, science diagrams, 3D/2D graphics, tour scripts; manifest `static/data/original-work.json` built by `scripts/build-original-work.mjs`. Anatomy art is AI-generated watercolor/pencil cutaways under `static/images/anatomy/*.webp` — to add more without style drift follow [`docs/anatomy-art-runbook.md`](../anatomy-art-runbook.md), #367), `/library` (outbound LEARN-link bill of links per ADR-051), `/posters` (11 hand-authored SVG art-print posters across three style families — JPL travel-poster, era-matched mood-lit, indie-pop halftone — every poster 600×900 portrait SVG; right-click save gives a scalable wallpaper file).

**Video & live feeds (PRD-031 / RFC-033).** Linked-not-hosted video: zero bytes stored — every clip is an embed. `static/data/video-provenance.json` (built by `scripts/build-video-provenance.ts` from `video-sources.json`, gated by the fail-closed channel allowlist in `scripts/video-channel-allowlist.ts`; validate-data enforces channel-∈-allowlist, unique ids, and that every entity `videos:[{id}]` resolves) is the single source of truth, consumed by `$lib/video-provenance.ts`. `MediaPlayer.svelte` is a **click-to-load facade** — no `<iframe>` mounts until a user click (perf non-negotiable, e2e-enforced) — with a `content_advisory` interstitial and capture-phase Escape. `VideoThumb.svelte` tiles interleave into the mission / fleet / launch-site (`FleetEntryPanel`) / landing-site (`SurfaceScene`) galleries; the credited set surfaces on `/credits`. `$lib/live-feeds.ts` powers `/live`: the ISS `live-pin` + launch broadcasts time-gated on scheduled `net` vs real `now` (`deriveLaunchFeedState`, pure/tested).

### Data layer

**Data client** (`src/lib/data.ts`) — fetch-and-cache layer for every JSON under `static/data/` (runtime URLs `/data/...` with SvelteKit `base` prefix). Returns parsed JSON with locale-overlay shallow merge for missions, planets, science sections, fleet entries, surface sites, and other localised records per ADR-017 / ADR-054. Cache is a `Map` keyed by URL, session-only. Cross-locale fallback: a missing non-English overlay falls back to **en-US** (not the base file) per ADR-054. See ADR-006, ADR-017, ADR-054.

**Schema validation** (`scripts/validate-data.ts` + `static/data/schemas/`) — 33 JSON Schema files (mission, fleet, planet, surface-site, science-section, provenance manifests, etc.) validated by `ajv` at every build. Fail-closed: schema mismatch breaks `npm run build`. See ADR-019, ADR-020.

**`RemoteData<E, T>`** (`src/lib/types/remote-data.ts`) — discriminated union for fetched IO state (#330 C.2). Replaces the `{items: T[], loading: boolean, loadFailed: boolean}` triple that 5+ routes inlined; the union admits exactly three shapes (`{type: 'loading'}` / `{type: 'error', error: E}` / `{type: 'success', data: T}`) so impossible combinations (loading && loadFailed) collapse out at compile time. Constructors `loading()` (frozen singleton — no allocation per fetch start), `error(e)`, `success(data)`. Type guards `isLoading` / `isError` / `isSuccess` narrow without casts. Combinators `map(rd, fn)` (transforms success branch, passes loading/error through identity-preserved) and `fold(rd, cases)` (exhaustive variant dispatch returning a non-RemoteData value — for aria-labels, summaries). Adopted by `/missions` + `/fleet` as of #332 commit 10; `/iss`, `/tiangong`, `/plan` migrations queued.

**`useUrlParam<T>`** (`src/lib/routes/use-url-param.svelte.ts`) — typed two-way URL ↔ state binding rune (#331). Replaces the ~20-line hand-rolled `$page.url.searchParams.get(...) + $effect + goto + untrack()` pattern that 20+ sites re-invented. The rune bakes in the `untrack()` discipline (project memory `feedback_svelte5_effect_untrack` / RFC documenting the `effect_update_depth_exceeded` gotcha on URL-deep-links) so callers can't accidentally trip it; debounces state→URL writes (default 200 ms — slider-scrub use case); `replaceState: true` by default so filter / camera state doesn't pollute the back-button. Pure helpers `buildNextUrl` + `urlValueMatches` are extracted for unit testing without a live component scope. First consumer: `SurfaceScene`'s `?hotspots=` mode (#332 commit 11). Adoption sweep continues organically as URL-sync needs arise.

### Physics & math

**Orbital library** (`src/lib/orbital.ts`) — Keplerian two-body mechanics. `keplerPos(a, e, L0, T, t)` returns position at time `t` (days from J2000). `visViva(a, r)` returns orbital velocity in km/s. All constants from IAU; see §contracts.

**Scale library** (`src/lib/scale.ts`) — rendering scale helpers. `auToPx(a_au)` — compressed log-linear scale for the solar-system 2D explorer. `altToOrbitRadius(alt_km)` — maps satellite altitude (km) to radial distance in the `/earth` 3D scene.

**Lambert library** (`src/lib/lambert.ts`) — Lagrange-Gauss short-way Lambert solver. Called only from the Lambert worker, never from the main thread. See ADR-008, RFC-003.

**Lambert worker** (`src/workers/lambert.worker.ts`) — runs the solver off the main thread. id-based cancellation, every-10-row progress, single result message; `destinationId` ∈ `{mercury, venus, mars, jupiter, saturn, uranus, neptune, pluto, ceres}`. See RFC-003, ADR-022, ADR-026, ADR-028. Worker is dormant for the 9 default destinations whose grids are pre-computed at build time.

**Fly-physics** (`src/lib/fly-physics.ts`) — transfer-ellipse math (`transferEllipse`), Tsiolkovsky rocket equation, per-mission validation harness. See ADR-030.

**Cislunar geometry** (`src/lib/cislunar-geometry.ts`) — Earth-Centered Inertial trajectory builder for Moon missions. `buildCislunarTrajectory` consumes the optional `flight.cislunar_profile` block on Moon missions (parking orbit → TLI → translunar arc → lunar arrival → TEI). Drives the second `/fly` camera. See ADR-058.

**Interplanetary geometry** (`src/lib/interplanetary-geometry.ts`) — heliocentric trajectory builder for Mars + outer-system missions, parallel to cislunar. `buildInterplanetaryTrajectory` consumes the optional `flight.interplanetary_profile` block (departure body, arrival body, transfer type, hybrid waypoints). 11 phase types: parking_earth → tmi_coast → helio_cruise → mid_course → arrival_approach → arrival_orbit → mars_descent/surface/ascent → tei_helio → earth_return_helio. Operator guide for adding a new mission's waypoints + phase markers: [docs/guides/mission-trajectories.md](../guides/mission-trajectories.md). See ADR-058 (third amendment).

**Launch / powered ascent — Scene 0 of `/fly` (RFC-034 · PRD-032 · epic #412).** The `pad → orbit` opening act, one continuous mission on `/fly`'s clock. There is **one** implementation, mounted by `LaunchScene.svelte` when a mission is opened with `?launch=1` — the former `/dev/ascent` + `/dev/launch` workbenches were consolidated in and **deleted** (2026-07-18); all their affordances live in `/fly` (force vectors → Science-Lens layers, cam-debug + pad-calibration + test hooks → `?debug=1`). Layering:
- **Headless physics** — `src/lib/orbital/ascent-physics.ts` (`integrateAscent(profile) → AscentSummary`, a pure powered-flight EOM integrator), `ascent-clock.ts` (the multi-scale `Phase = 'ascent'|'cruise'` clock: `makeTimeline`/`scrubberToPoint`/`advanceClock`), `ascent-hud.ts` (countdown/beats/status), `ascent-cameras.ts` (shot schedule), `launch-profile-registry.ts` (per-vehicle `LaunchProfile`). All unit-tested.
- **The phase-scene contract** — `src/lib/three/flight-phase-scene.ts`: `interface FlightPhaseScene<TState>` (`scene`/`camera`/`setState`/`setAspect`/`setForceVisible`/`setForcesVisible`/`snapCamera`/`reset`/`dispose`) + `type ForceKey`. `AscentScene` **and `DescentScene`** implement it; the broadcast composer `ascent-renderer.ts` drives any `FlightPhaseScene` unchanged. This was the seam the descent/landing act extended (RFC-034 §12) — same interface, same composer, thrust-reversed physics; `ascent-clock` `Phase` widened to add `'descent'`.
- **WebGL builders** (jsdom-can't-run, coverage-excluded per the `explore-scene.ts` policy) — `ascent-scene.ts` (Scene 0 render), `ascent-renderer.ts` (ACES + film + vignette), `launcher-models.ts` (procedural rockets), `launch-ground.ts` (launch-site ground patch).
- **Science-Lens forces** — the `thrust`/`drag` layers (+ reused `gravity`=weight, `velocity`) drive the on-vehicle free-body arrows via the pure `launch-force-layers.ts` map; the lens panel is the legend.
- **Injection burn** (RFC-034 §3.1) — after SECO, before the warp, the kick/upper stage that leaves parking orbit fires as an explicit beat (S-IVB/Centaur/Blok D/Star 48B/…): `injection-burn.ts` `resolveInjectionBurn()` names the stage (prefers `flight.launch.vehicle_stage`, else a launcher→stage map) + burn type (`TLI`/`TMI`/`INJECTION` from `dest`) + Δv (`tli_or_tmi_dv_km_s`); LaunchScene shows the callout + a plume re-light (`ascent-scene.setInjectionBurn`). Hosted Earth-local because a parking orbit is sub-pixel in the AU cruise scene. Gracefully absent for LEO-direct launchers.

**Descent & landing — the closing bookend of `/fly` (RFC-034 §12 · §12.1 · epic Track D).** The inverse of the launch act: **37 Moon/Mars/Venus landers** (Phase 1) + **5 asteroid/comet/Jupiter missions** (Phase 2: hayabusa1/2, osiris-rex, rosetta/Philae, galileo; Titan/Eros pending — GH #418) continue `arrival → descent → surface`, closing the arc `pad → orbit → cruise → arrival → descent → surface`. A 1:1 mirror of the ascent stack, built on the same three seams. Layering:
- **Headless physics** — `descent-physics.ts` (`integrateDescent(profile) → DescentSummary`, a 1-DOF along-track EOM: per-body gravity + exponential drag + per-phase flight-path angle; aerodynamic phases force-integrated, powered/skycrane phases throttle-guided to a soft touchdown) + `descent-physics-constants.ts` (per-body μ/R/atmosphere: Moon vacuum, Mars thin CO₂, Venus dense CO₂). `descent-hud.ts` (EDL phase labels + beats). All unit-tested (`descent-physics.test.ts`, `descent-profiles.test.ts` = all 37 land per their honest outcome).
- **Registry + 6 EDL archetypes** — `descent-profile-registry.ts`: thin per-mission JSON (`static/data/descent-profiles/<missionId>.json`) expanded via `LUNAR_POWERED` / `LUNA_DIRECT_IMPACT` / `MARS_PARACHUTE_RETRO` / `MARS_AIRBAG` / `MARS_SKYCRANE` / `VENUS_AEROSHELL`. `hasDescentProfile(id)` gates entry — orbiters never descend. **The descent profile is the single source of truth for EDL data** (the mission JSON's `arrival` block is NOT backfilled — no duplication). Crash reconstructions (Beresheet / Schiaparelli / Mars 3) model a propellant cutout → honest impact.
- **WebGL builders** (coverage-excluded) — `descent-models.ts` (`buildDescentModel`: aeroshell + parachute + skycrane/retro/airbag stack wrapped around the reused landed model as the terminal part) + `descent-scene.ts` (body growing below, per-body sky, scrub-safe EDL separations, retro plume, per-phase camera; implements `FlightPhaseScene`).
- **Clock + UI** — `ascent-clock` `Phase` widened to `+'descent'` (`descentDurationS`/`descentScrubberFraction`, default 0 ⇒ orbiters unchanged); the descent owns the scrubber tail; `E+MM:SS` readout; `DESCENT_SPEED_MULTIPLIERS`. `DescentScene.svelte` (EDL HUD). In `/fly`, `showDescent`/`descentT` mirror `showLaunch`/`launchT`; at arrival a lander enters the descent act; `?descent=1` deep-links to it; at touchdown it hands off to `/${body}?site=${siteId}` (SurfaceScene reads `?site=` and faces the site — the circle closes ON the site). Force lens via `descent-force-layers.ts` (reuses the 4 generic layers).

### 3D model builders

Mission-specific Three.js builders, each composing primitives into a recognisable silhouette. All bundled at build time, no glTF loader at runtime.

- `src/lib/earth-satellite-models.ts` — ISS, Tiangong, Hubble, JWST, Chandra, XMM, Gaia, LRO, GEO comsat, GNSS constellations (GPS / Galileo / GLONASS / BeiDou), + 7 lunar orbiters as generic-orbiter silhouettes.
- `src/lib/moon-lander-models.ts` — Apollo LM (descent + ascent) for Apollo 11/12/14, J-mission LM + LRV for Apollo 15/16/17, Luna 9 petal-capsule, Luna sample-return stub, Lunokhod 1/2 bathtub-on-wheels, Chang'e 3/4 lander + Yutu rover, Chang'e 5/6 return stub, Chandrayaan-3 Vikram + Pragyan, SLIM "Moon Sniper" tipped pose, Artemis III HLS placeholder.
- `src/lib/mars-lander-models.ts` — Viking 1/2 tripod, Pathfinder/Sojourner pair, MER (Spirit/Opportunity), Curiosity-class (Curiosity + Perseverance with Ingenuity option), Phoenix-class (Phoenix + InSight), Mars 3 petal, Tianwen-Zhurong, Schiaparelli + Beagle 2 silhouettes.
- `src/lib/iss-proxy-model.ts` — ISS module geometry + `userData.moduleId` pickability per ADR-041. 18 USOS + ROS modules.
- `src/lib/iss-assembly-phases.ts` — `ISS_DOCK_EVENTS` (7 first-arrival visiting-craft fly-ins) + `ISS_TRUSS_PHASES` (10 STS truss installs + 3 iROSA EVA roll-out campaigns). Pure data, consumed by /iss assembly walker to animate each part in at its real launch / install date.
- `src/lib/tiangong-proxy-model.ts` — Tianhe + Wentian + Mengtian module geometry + pickability per ADR-049.
- `src/lib/tiangong-assembly-phases.ts` — `TIANGONG_DOCK_EVENTS` (3 first-of-kind cargo/crew dockings). Pure data (mirrors `iss-assembly-phases.ts`), shared by the /tiangong assembly walker + the AR replay (#408).
- `src/lib/ar/ar-assembly.ts` — AR tabletop assembly replay (#408): resolves per-station launch epochs (`loadStationEpochs`) + auto-advances an `applyAssembly` sweep on the anchored proxy (`startArStationAssembly`), reusing the flat routes' primitives so both stay in lockstep.
- `src/lib/ar/sky-orientation.ts` — pure sky-pointing compass math (#393): `deviceQuaternion` (DeviceOrientation→camera), `compassHeadingRad` (iOS `webkitCompassHeading` vs W3C absolute `alpha`), `skyYawOffset` (WebXR azimuth correction). `AZIMUTH_CALIBRATION_RAD` is the on-device calibration knob.
- `src/lib/ar/sky-view.ts` — the `SkyView` substrate abstraction: `createXrSkyView` (ARKit/WebXR + compass), `createCameraSkyView` (non-XR magic window: camera feed + DeviceOrientation), `pickSkyView` (XR-first, magic-window fallback).
- `src/lib/station-assembly-state.ts` — shared between Svelte `$state` + the Three.js animate() closure on both /iss + /tiangong. `AssemblyRef` POJO type + `createAssemblyRef()` factory + `syncAssemblyRef(ref, snap)` pure mutator. Component owns the `$state` flags and calls `syncAssemblyRef` from a `$effect` to mirror them into the plain ref the closure reads each frame.
- `src/lib/station-assembly-anim.ts` — assembly-animation primitives (`captureHomes`, `applyAssembly`, `currentChip`, `buildPiecewiseMapping`) consumed by both station routes.
- `src/lib/surface-scene/` — canonical /moon + /mars renderer per ADR-072 (closing ADR-037's deferred-component decision). `SurfaceScene.svelte` owns ~90 % of the surface-route behaviour: scene/camera/renderer setup, axial-tilt wrapper, conditional atmosphere + tidal-lock layers, marker building, hotspot LOD dispatch, per-frame animation loop with fly-in tween + drag inertia + smooth zoom lerp, altitude HUD, traverse rendering with curated stops, panel state, panorama enter/exit, e2e signal attributes. `SurfaceFlatPatch.svelte` is the flat 2D ground-patch view at deep zoom (ADR-062) — rectangular regional + detail CTX/HiRISE/LROC NAC layers, traverse polyline, scale-aware markers, scale bar + lat/lon HUD, upsample warning. Both `/moon` + `/mars` route files are thin shells (~224 / 245 LOC, mostly the per-body `SurfaceSceneConfig` literal) over `SurfaceScene.svelte` (~6.5k LOC).

### Provenance pipeline

The fail-closed asset + outbound-link discipline that distinguishes Orrery from a typical front-end.

**Tier-1 Earth-orbit re-entry — the *return* bookend (RFC-034 §13, 2026-07-19).** The ~31 Earth-orbit crewed capsules (Mercury/Gemini/Vostok/Voskhod/Apollo-CM/Skylab/Soyuz/Dragon/Shenzhou) fly **pad → orbit-coast → re-entry → recovery** on the *same* unified `/fly` timeline. `DescentBody` gains `'earth'` + an `EARTH_CAPSULE_REENTRY` archetype (ballistic → drogue → mains → splashdown/ground; a fouled main = honest IMPACT). The orbit-coast act (`fly-leo-coast-scene.ts` + `CoastScene.svelte`, km-unit Earth-centred) renders the capsule looping its ring with the **hybrid loop rule** — `min(realRevs, 3)` loops rendered, real REV/date counters carrying the scale (1 orbit → 1214). It's the `cruise` act of the **unified master scrubber**: `CoastScene` is `externalClock`-driven, the one scrubber drags continuously launch→coast→descent (`onMasterScrub` routes the cruise band to the coast; the rAF advances `coastMetDays`). 8 capsule families in `capsule-models.ts`, coast descriptors in `earth-orbit-registry.ts`, 31 profiles in `descent-profiles/`, launchers `mercury-redstone`/`voskhod-11a57`/`soyuz`/`long-march-2f`. Open follow-ups (descent-playback time-compression, in-scene re-entry HUD): `docs/wip/2026-07-19-tier1-earth-orbit-reentry.md`.

**Imagery sourcing** (`scripts/fetch-assets.ts`) — agency-first per ADR-046. NASA Image and Video Library + Wikimedia Commons curated lists + Roscosmos / CNSA / SpaceX / partner archives. No artist's impressions for flown vehicles (per-mission `artistic-impression` waiver flag for planned-only entries).

**Image provenance manifest** (`scripts/build-image-provenance.ts`, `static/data/image-provenance.json`) — one row per image: source agency, license, attribution string, file hash. Wikimedia `imageinfo` API resolves Commons URLs at build. Asset size cap **8 MiB / file**. See ADR-047.

**Text-source attribution** (`static/data/text-sources.json`) — every paraphrased editorial fragment registered with source, license, and last-verified date.

**Outbound LEARN-link manifest** (`scripts/build-link-provenance.ts`, `static/data/link-provenance.json`) — one entry per `(entity_id, url)` pair. Per-link source agency, language (BCP-47), tier (`intro`/`core`/`deep`), last-verified date. Locale fallback chain: UI-locale link first, then operator-native-language link, then English, then multi-lingual landing. See ADR-051.

**Link checker** (`scripts/check-learn-links.ts`) — live HEAD+GET probe, redirect chain capture, slow-response detection, robots.txt honoured. Writes `docs/provenance/last-link-check.md`. Build does not call this script (no live network in CI) but the report is the gate for `validate-data.ts`.

**License waivers** (`static/data/license-waivers.json`) — per-image carve-outs for restricted-license partners (e.g., airandspacehistory.com per ADR-053 OQ-18).

**Source logos** (`static/data/source-logos.json`) — 28 publisher logos with their license summary; rendered on `/credits` + `/library`.

`npm run fetch` chains `fetch-assets && build-image-provenance && build-link-provenance && check-learn-links && validate-data` so a refetch re-derives every manifest atomically. `npm run build` keeps only `validate-data` as the pre-hook.

### Science encyclopedia

**Article rendering** (`src/routes/science/[tab]/[section]/+page.svelte`) — base file in `static/data/science/<tab>/<section>.json`, locale overlay in `i18n-src/<locale>/science/<tab>/<section>.json` (same ADR-017 pattern), rendered via `body_paragraphs[]` schema. Per-section diagram embedded from `static/diagrams/science/<section>.svg`.

**Math rendering** (`src/lib/katex.ts`) — KaTeX server-rendered at build time. Every `formula_latex` field on a science section becomes HTML inline; zero KaTeX runtime cost. See ADR-034.

**Diagram authoring** — every science diagram is a hand-authored SVG committed at `static/diagrams/science/<id>.svg`, validated by `scripts/validate-diagrams.ts`. No AI generation, palette matches the canonical Orrery style. See ADR-035.

**Search index** (`scripts/build-science-index.ts`, `static/data/science-index.json`) — walks the science overlay tree, builds the section tree + Cmd-K search index + ?-chip vocabulary. Generated at build time.

**Cross-route ?-chip pattern** (`src/lib/components/ScienceChip.svelte`) — `?name=concept` chips on /missions, /iss, /tiangong, /fleet, /explore, /fly, /plan deep-link to `/science/<tab>/<section>`. Hover tooltip on desktop, click-to-navigate on mobile. See ADR-036.

### Science Lens + multi-layer state

**Master lens** (`src/lib/science-lens.ts`) — single `data-science-lens` attribute on `document.documentElement`, value `"on"` or `"off"`. Helpers: `isScienceLensOn`, `toggleScienceLens`, `onScienceLensChange`. SSR-safe. Session-bounded by default. See ADR-055.

**Multi-layer toggles** (`src/lib/science-layers.ts`) — 12 layers, each its own `data-science-layer-<key>` attribute on `<html>`. Keys: `gravity · velocity · soi · hover · centripetal · apsides · coast · conics · microgravity · atmosphere · tidal-lock · ozone`. `isLayerOn(key)` gates on master lens AND layer attribute. CSS reacts via `:global([data-science-layer-foo='on'])` selectors with zero imports.

**UI surfaces** — `ScienceLensBanner.svelte` (master toggle), `ScienceLayersPanel.svelte` (per-layer checkboxes; shown only when lens is on). Per-route filter: /fly shows all 8 mission-relevant layers; /explore + /earth + /iss + /tiangong + /moon + /mars hide /fly-only layers (coast, conics).

### i18n machinery

**Paraglide-js 2.x** (`src/lib/paraglide/`) — compiled message catalogue for 14 locales: `en-US, es, fr, de, pt-BR, it, nl, zh-CN, ja, ko, hi, ar, ru, sr-Cyrl`. Compiled by `paraglideVitePlugin` during dev / build (CLI `paraglide-js compile` retained for `/scripts/` translators). See ADR-017, ADR-031.

**URL-segment locale routing** — `?lang=de` was replaced by `/de/<path>` per #328. URL pattern: en-US (baseLocale) lives at bare paths (`/iss`, `/missions`); other locales prefix the path (`/de/iss`, `/fr/missions`). `src/hooks.ts` `reroute` calls `deLocalizeUrl` so SvelteKit's router matches the bare path against the file-system routes; `src/hooks.server.ts` wraps `paraglideMiddleware` for prerender locale binding. `src/app.html` placeholders `%paraglide.lang%` + `%paraglide.textDirection%` are filled in `transformPageChunk` so SSR HTML ships locale-correct on first byte. `prerender.entries` (svelte.config.js) seeds one root per locale via `generateStaticLocalizedUrls(['/'])`; the crawler follows nav links (which use `localizeHref`) into every per-locale sub-page.

**Bundle splitting** — `experimentalMiddlewareLocaleSplitting: true` (vite.config.ts) tree-shakes every message function from the client bundle; the prerender middleware injects the messages each per-locale route uses into the emitted HTML. Trade-off: cross-locale navigation requires a full reload — `LocalePicker` calls `setLocale()` which handles this transparently.

**Locale detection** (`src/lib/locale.ts`) — thin wrapper over Paraglide 2.x's runtime since #328. URL/cookie/canonicalisation now owned by `$lib/paraglide/runtime` (URL strategy chain: `['url', 'cookie', 'preferredLanguage', 'baseLocale']`); `locale.ts` keeps `SUPPORTED_LOCALES` metadata (native name + short tag + flag), `LocaleCode` union, `isRtlLocale`, `syncDocumentLocaleAttributes`, a reactive `localeFromPage($page)` helper that tracks page-URL changes for `$derived` consumers, and the `assertLocalesInSync()` drift-check. The old `orrery_locale` cookie + ADR-057 cookie semantics are superseded by Paraglide's cookie strategy.

**Content overlays** — per-locale JSON under `i18n-src/<locale>/<surface>/...`. Surfaces: missions, planets, sun, fleet, science, iss-modules, tiangong-modules, moon-sites, mars-sites, earth-objects, rocks, suit overlays. Shallow-merge per ADR-017.

**Translation pipeline** — LLM-first-pass plus `argos-translate` offline-NMT batch fallback per ADR-033. `scripts/wave23/{catalog,maps,apply-translations}.ts` is the toolchain. sr-Cyrl is manually authored per ADR-043 (no Cyrillic Serbian model in argos).

**Font + script strategy** — Wave 1 (Latin + Cyrillic) uses bundled Inter + Crimson Pro per ADR-032. Wave 2 CJK uses Noto Sans CJK + Noto Serif CJK per ADR-044. Arabic uses Noto Sans Arabic + RTL `dir="rtl"` per ADR-045. Serbian Cyrillic gates the font load per ADR-043.

### Test infrastructure

**Unit + integration: Vitest + jsdom** — 35 test files, 814 tests at v0.6.0. Three.js geometry tests use the `// @vitest-environment jsdom` pragma. Sprite-texture paths use `canvas` polyfill. See ADR-015.

**End-to-end: Playwright + Chromium** — 28+ test files covering every route + per-locale smoke for Wave 1. CI runs on push to main only (not on every PR); 40-minute timeout, single-worker per `playwright.config.ts`. See ADR-015, ADR-056.

**Docker-stack e2e** (ADR-066) — separate workflow runs Playwright against the full compose stack (web + pipeline-runner containers) as the VPS-readiness gate. Sharded per W7: `desktop-chromium` full + `mobile-chromium` split into 2 parallel legs, each with its own 45-min ceiling so a single slow shard can't cancel the whole matrix.

**Deterministic readiness signals** — every canvas route exposes a `window.__pickAt(x, y)` test hook + `data-*` ready attributes so Playwright can synchronise without polling. See ADR-056.

**`/fly` race-free test hooks (ADR-077, June 2026)** — when a second Claude Code session shares the same chrome-devtools-mcp browser instance, click/scrub events race the automated test's intended state (pause buttons get re-pressed, scrubbers move under us). The hook pair below bypasses the UI layer entirely:
- `window.__flySetSimDay(metDays)` — sets `simDay` + pauses. Skips `biasJumpToIconicMoment` / 700 ms snap-cut / peakHold clearing (all upstream input concerns). Everything downstream — auto-zoom lerp, scene render, hero detector — runs identically to a real user landing at the same MET. DEV-gated; production never sees it.
- `window.__flyCislunarDebug()` — mirror of `__flyDebug` for cislunar missions (which `__flyDebug` is gated out of via `!isMoonMission`). Returns `{simDay, phases, camPos, camTarget, camR, autoZoomActive, lastAutoZoomPhase, moonInScenePos, spacecraftPos, closestApproachKm}`. Lets automated tests diagnose the auto-zoom / scene-render pipeline without spelunking Three.js refs.
Reach for these when (a) another session is using the same Chrome, (b) the opening sequence (~9.5 s freeze on simDay) makes timing-based assertions flaky, or (c) you need to observe internal cislunar state.

**Preflight chain** (`npm run preflight`) — `typecheck && lint && test && validate-data && build`. Husky pre-push hook enforces. Mirrors CI exactly.

**Overlay-completeness gate** (inside `validate-data`, ADR-069) — for every ID in `earth-objects.json` / `fleet/index.json` / `moon-sites.json` / `mars-sites.json` / `science/<tab>/_index.json`, verify the canonical en-US overlay exists. Closes the GH #83 defect class where missing overlays passed preflight but 404ed at e2e runtime. Optional Layer-2 smoke-subset e2e in pre-push via `PREFLIGHT_INCLUDE_SMOKE=1` (`landing.spec.ts` + `smoke.spec.ts`, ~30-60s, off by default).

### Documentation site

**VitePress + vitepress-sidebar** — `/docs/` hosted on the same GitHub Pages deploy as the app. Sidebar auto-generated from the docs tree. Renders ADRs, RFCs, PRDs, prototypes, research notes. See ADR-021.

### Audio narration (v0.7 ship — en-US)

**Overlay shell** (`src/lib/components/AudioOverlay.svelte`) — right-panel on desktop ≥ 800 px, bottom-sheet below. Houses Curator Tour bar, transport (play/pause/scrub/speed/CC), provider A/B switcher, per-route inventory with scope tabs ("for this screen" / "all episodes"), captions banner, cue banner, origin disclosure. Focus-trapped while open, Escape closes, focus restored on close. Triggered by the waveform icon in `Nav.svelte` (icon pulses while playing).

**Reactive state** (`src/lib/audio-state.svelte.ts`) — Svelte 5 singleton (`audio`). Owns `open`, `currentEpisode`, `positionSec`, `durationSec`, `playing`, `speed`, `captionsOn`, `currentCaption`, `heardEpisodeIds`, tour queue (`tourActive`, `tourIndex`, `tourSequence`), and (v0.7 tour-v2 per PRD-016 §S8) `compact`. In-memory only per ADR-057, with one narrow exception per ADR-075: the active-tour resume point (`{ep, pos, idx, cmp}`) persists in the `orrery_tour` cookie. Per-episode heard-state stays runtime-only.

**Runtime registry** (`src/lib/audio-registry.svelte.ts`) — fetches `static/data/audio/audio-provenance.json` once via a shared in-flight Promise (concurrent callers can't race the load). Collapses multi-provider rows into one `Episode` with a `variants[]` array; `forRoute(pathname)` matches exact route plus sub-routes; `byId` / `byIdLocale` for deep-link + locale-switch lookup. `PROVIDER_PRIORITY` puts ElevenLabs first by default.

**Tour playlist** (`src/lib/audio-tour.ts`) — `CURATOR_FULL_TOUR` (21-episode ordered ids, ~66 min), `CURATOR_EXTENDED_TOUR` (31-episode, ~87 min), and `EPISODE_STAGES` (timed action queue per episode). Single declarative file. Filtered to registry-present ids at `startTour()`.

**Action vocabulary** — seven actions, all timed by `at_sec` against the actual VTT track (not the SSML target — ElevenLabs renders ~30–45 % faster than guide-tier SSML targets, see #342). `flash` (1.8 s gold pulse on a DOM target), `scroll-to`, `click` / `open-tab` (programmatic), `cue` (directive banner inside the overlay, `target` = message text, default 6000 ms visibility), `drag` and `zoom` (CustomEvents the canvas routes listen for — pan/rotate/scale the camera), `navigate` (SvelteKit `goto`, target = URL path; used to demo URL-bound state like `/missions?q=apollo` or `/fleet?category=crewed-spacecraft`). The executor is `executeStage()` in `AudioOverlay.svelte` — case-per-action, no per-route specialisation.

**DOM hook conventions** — selectors live on stable `data-audio-stage` attributes. Several prefixes are templated onto loops (`route-card-`, `science-tab-`, `science-section-`, `missions-select-`, `fleet-select-`, `mars-select-`, `explore-select-`, `explore-speed-`) so any catalogued entity gets a hook automatically; the unit test in `audio-tour.test.ts` allows the prefix when the literal appears anywhere in the haystack. Hidden tour anchors (`<div class="tour-anchors" aria-hidden="true">…`) provide programmatic click targets where the live UI is a 3D canvas (e.g. `__surfaceSceneSelectSite` window hook on /earth/moon/mars, `selectPlanet` on /explore). Shared components carry their own attrs: `PanoramaToggleButton` (`surface-stand-at-site` / `surface-exit-panorama`), `StationAssemblyControl` siblings (`iss-assembly-toggle`), `PlanetPanel` (`planet-tab-technical`).

**Authoring rules** — see AGENTS.md § "Tour cue authoring". Tightest: time against the VTT, not the SSML target; 1 s cue→click default; cue text is directive not subtitle; roll-calls get per-item hooks; `navigate` is the right action for URL-bound state. The audio bundle is frozen ground truth — interaction-side edits don't trigger re-renders.

**Shared types** (`src/lib/audio-types.ts`) — `Persona`, `ProviderName`, `TextAuthorship` literal unions. Imported by every runtime and build-side consumer; adding a provider edits one file.

**Transparency surface** — `/credits` renders an audio table with text authorship + per-variant provider, `tts_model`, and `voice_id`. Schema-enforced at validate-data time.

**Build pipeline** — see Pipeline 12 below.

**See:** PRD-016 (product), RFC-019 (architecture; §11 = v0.7 tour-v2), [docs/guides/audio-pipeline-setup.md](../guides/audio-pipeline-setup.md) (operator), ADR-057 (no-localStorage), ADR-075 (`orrery_tour` cookie — narrow exception #2 for tour resume), ADR-047 (provenance pattern parallel).

---

## §rendering

How 3D works on every canvas route. The application has **seven distinct 3D scenes** (`/explore`, `/fly` heliocentric, `/fly` cislunar, `/earth`, `/moon`, `/mars`, `/iss`, `/tiangong`) and **two 2D map scenes** (`/mars` equirectangular, `/moon` orthographic dual-disc). Each follows the same architectural pattern but with a different scale, coordinate frame, and asset budget.

### Shared rendering primitives

- **Renderer:** `THREE.WebGLRenderer` with `antialias: true`, `alpha: false`, `powerPreference: 'high-performance'`. One renderer per route mount; disposed on `onDestroy`.
- **Composer pipeline (selection halo only):** `EffectComposer` + `RenderPass` + `OutlinePass` for the v0.6 selection-halo outline on `/earth`, `/moon`, `/mars`. Other routes draw without postprocessing to keep mobile GPUs cool.
- **Materials:** PBR (`MeshStandardMaterial`) for hand-modelled spacecraft per ADR-040 / v0.1.7. Older inline geometry on `/moon` and `/mars` markers uses `MeshPhongMaterial` where the v0.6 marker rewrite hasn't reached yet. Planet surfaces use `MeshStandardMaterial` with a base-colour texture, no normal map (mobile budget).
- **Lighting:** one `DirectionalLight` as the Sun (per-route position) + low `AmbientLight` for shadow fill. No real-time shadows; the silhouette read is what matters.
- **Animation loop:** `createAnimateLoop` from `src/lib/three/animate-loop.ts` (#329). Owns raf scheduling, dt clamp (default 0.05 s — 20 fps minimum effective rate), `prefers-reduced-motion: reduce` gate per ADR-025, and the `document.hidden` pause contract. All 7 3D routes (`/iss`, `/tiangong`, `/moon`, `/mars`, `/earth` via SurfaceScene, `/explore`, `/fly`) consume the factory as of #332; routes that hand-roll `requestAnimationFrame` leak the visibility-pause contract and should be migrated. Companion `createRouteLifecycle` (route-lifecycle.ts) holds listener + disposable teardowns; the lifecycle.cleanup drain runs LIFO so later registrations tear down before the systems they referenced.
- **Pick handling:** `THREE.Raycaster` against tagged scene objects whose `userData` carries the entity id (`{ siteId }`, `{ moduleId }`, `{ missionId }`, etc.). The same `userData` is exposed to Playwright via `window.__pickAt(x, y)` per ADR-056.
- **Disposal:** every route's teardown walks the scene graph and calls `geometry.dispose()` + `material.dispose()` (texture too where appropriate) for each `Mesh`. Without this, locale switching leaks ~6 MB per swap.

### /explore v2 — The Known Universe (`$lib/universe`, Slices 0–8 · explore-v2 branch)

Extends `/explore` outward from the solar system into the real stellar neighborhood, in place. **v1 is untouched:** the solar scene + composer render path are unchanged; the neighborhood is a **second `THREE.Scene`, dynamically imported only at the boundary** (RFC-032 C-F), so v1's bundle + first paint don't move. PRD-030 / RFC-032 / UXS-014.

- **Nested contexts (`context-graph.ts`)** — a scale-shell stack. Slice 0 has two: `solar-system` (units AU, the v1 scene) and `neighborhood` (units pc). Crossing a boundary re-bases the camera between coordinate spaces (`rebaseDistance`, physically-correct via `AU_PER_PARSEC`); a hysteresis band prevents seam flicker. Pure + unit-tested (the RFC §8 "precision at the boundary" risk).
- **Boundary crossing** — zoom out to the heliocentric ceiling, scroll/pinch once more → cross out; the scene swaps to the neighborhood (Sun collapses to a sprite dot, real star field fades in), with an eased pull-back dolly + a warp-flash mask (both reduced-motion-aware). Scroll/pinch in past the inner edge (or Reset View / breadcrumb) crosses back.
- **Render vocabulary** — `point-field.ts`: one instanced `THREE.Points` draw call, per-point spectral colour (B−V→blackbody→RGB, `bv-to-rgb.ts`) + magnitude-driven size, distance-attenuated shader, `uOpacity` cross-fade. LOD ("N brightest within radius R") + attribute packing in `star-selection.ts` (pure, tested). Device caps via `budget.ts` over the existing `detect-gpu` quality tier. `neighborhood-scene.ts` is the context scene (Sun sprite + field + reveal); consumed by both `/explore` and the dev anchor.
- **Data** — `scripts/build-universe-stars.ts` fetches HYG v4.1 (CC-BY-SA-4.0), normalizes + tiles 109,400 stars into distance shells under `static/data/universe/stars/` (+ schemas, `validate-universe-stars` in the validate-data runner, provenance). Network-fetch-then-commit pattern (like image-provenance); not in the `build` chain.
- **HUD** — a scale ruler (`scale-readout.ts`, pure/tested): km·AU·ly·pc unit ladder, light-travel time, map-style scale bar, live across both contexts. The solar Orbit Ruler and solar-only chrome (layer chips, time controls, 2D/SKY) hide in the neighborhood; a breadcrumb (UXS-014) gives orientation + tap-back. Localized to 14 locales.
- **Coverage** — the pure `$lib/universe` math is coverage-counted + tested; the WebGL builders (`point-field.ts`, `neighborhood-scene.ts`) are coverage-excluded per the `explore-scene.ts` policy.
- **Credits** — `static/data/data-sources.json` powers a `/credits` "Data & catalogues" section (HYG · GCAT · Launch Library 2).

Since-shipped in explore-v2 (RFC-032 §7): S1 object selection / Panel / named stars / constellations / `?goto=` · S2 warp + exoplanet mini-orreries · S3 /science + culture · S4 deep-sky · S5 Milky Way · S6 black holes + physics lenses · S7 property-space / causality overlays · S8 Local Group. Still deferred: S9+ (message-object trajectories, grand-tour narration).

### Scene 1 — `/explore` (heliocentric solar-system)

- **Coordinate frame:** heliocentric, AU units (constraint per §constraints). Sun at origin. Planet positions from `static/data/planets.json` (`a`, `e`, `T`, `L0`, `incl`, `axialTilt`, `rotPeriod`).
- **Scale:** Sun radius **0.06 AU** (visually exaggerated for legibility; absurd at true scale). Planet radii scaled per `planetVisualRadius` in `src/lib/scale.ts`.
- **Geometry:** each planet is a `SphereGeometry(radius, 32, 32)` + an albedo texture under `static/images/textures/<planet>.jpg`. Saturn carries an extra `RingGeometry` with `RingTexture` (transparent edge). Asteroid belt is a `Points` cloud at semi-major-axis 2.5 AU.
- **Orbital paths:** each planet's orbit is a `LineLoop` of 256 points sampling `keplerPos(a, e, L0, T, t)` over one full period. Re-computed once at mount.
- **Sun:** `MeshBasicMaterial` (self-emissive surface) + a halo `SphereGeometry` with `BackSide` rendering at 1.04× radius for a corona glow.
- **Auto-orbit:** the camera arcs around the Y-axis at 0.05 rad/s by default; pauses under reduced-motion or when the user grabs `OrbitControls`.
- **Sim clock + time controls (#351):** planets, moons, and small bodies advance on a shared `simT` clock (years). A bottom-left panel (`data-audio-stage="explore-time"`, beside the PLANET SCALES card) gives the user pause/play, 1×/10×/100× days-per-second speed pills, a locale-formatted date readout, and a reset-to-today button. `simT=0 ≡ page-load day`; at load each planet's start-angle (`a0`) is anchored to its real J2000 mean longitude propagated to today, so the arrangement approximates the real sky (circular 2-body — a few degrees off for eccentric bodies, artistic by design). `prefers-reduced-motion` still hard-freezes the clock per ADR-025, independent of the user pause.
- **Science Lens overlays:** when the lens is on, each planet additionally draws SOI rings, gravity arrows, atmosphere shells, tidal-lock indicators (per layer toggles). All overlay objects are built by `src/lib/orbit-overlays.ts` and toggled by `onLayerChange` per ADR-055.

### Scene 2 — `/fly` (heliocentric transfer)

- **Coordinate frame:** heliocentric, AU units, identical to `/explore`. Sun at origin.
- **Trajectory geometry:** the transfer arc is a Keplerian half-ellipse from Earth at the mission's departure date to the destination at arrival (per ADR-010). Sampled at 96 points; rendered as a `Line` with `LineDashedMaterial`. Pre-arrival segment dashed dim; covered segment solid bright; the ship marker (a small `ConeGeometry`) tracks the current MET.
- **Bodies:** Sun + departure planet + destination planet + the spacecraft cone. Other planets are dimmed `Points` for context.
- **Physics:** `src/lib/fly-physics.ts` — `transferEllipse`, Tsiolkovsky, per-mission validation harness per ADR-030. Math runs in pure functions, validated against committed expected values per mission so a regression in either the math or the data fails CI.
- **Camera switching for Moon missions:** when the destination is `MOON` and the mission carries a `flight.cislunar_profile` block, the heliocentric scene hands off to **Scene 3** (Cislunar) once the spacecraft has crossed the Moon's sphere of influence. See ADR-058.
- **Flyby cinema iconic-shot composer (`$lib/orbital/flyby-camera-plan.ts`):** when `findActiveFlybyMet` returns a non-null MET, the standard cruise framing yields to `planFlybyShot` which composes camera + lookAt for an iconic Cassini-art frame around the body. Per-planet `PLANET_COMPOSITION` carries `camRMultiplier`, `sideAngleRad`, `pitchRad`, `iconicLeadDays`, `targetBias`. Sun-lit-hemisphere bias (ADR-077): the perp vector flips when `cos(α) < −0.7` (camera deep on night side, α > 134°) so the camera lands on the lit hemisphere for the worst-case alignments — every Voyager / Cassini hero photograph composes against the lit limb, not the thin lit edge.
- **Arrival composition / adaptive spatial lead (June 2026):** orbit-insertion + arrival events (`edl_or_oi` / `arrival` — Mars Express MOI, Curiosity EDL, Cassini SOI, Dawn at Vesta…) take a distinct composition via `buildArrivalComposition`, NOT the gravity-assist flyby defaults. At orbit insertion the spacecraft matches the planet's heliocentric velocity, so the legacy *time* lead (`iconicLeadDays`) barely separated it and the ship glyph sat ON the planet disc. The arrival composition instead uses `planFlybyShot`'s `iconicSeparationRadii` — a *spatial* lead that walks back from peak until the ship clears ~2× the body radius off the limb — plus a wider camR (×1.3, skipped for sub-`ARRIVAL_SMALL_BODY_RADIUS` asteroids/comets which would vanish), 75° side, and 0.25 look-bias so the ship reads as silhouetted-and-approaching. `buildArrivalComposition` is the single source of truth, shared by the live scene (`+page.svelte`) and the `npm run audit:fly-cameras` regression script. **Validation:** the audit runs all 122 flyby/arrival events through `planFlybyShot` + `classifyShot` → `static/data/fly-camera-audit.json`, surfaced at the **`/dev/fly-cameras`** dashboard (current-vs-proposed verdict per event). The in-panel `FlybyDebugViewer` (FLY tab, `?debug=1`) renders the live flight: live ship marker, the real scene camera's moving path (mirrored via DEV-only `debugCamWorld`), sun/terminator + lit-hemisphere overlay, an elevation profile, and an auto-solve grid-search that snaps the composition to the best ICONIC frame.
  - **`classifyShot` small-body rule:** the "planet dominates frame" gate (`planetTooSmall`) is dropped for sub-`ARRIVAL_SMALL_BODY_RADIUS` bodies — a spacecraft at a sub-km asteroid/comet is genuinely comparable in size (every Hayabusa / OSIRIS-REx / DART hero shot is), so the rule would falsely fail those. A `planetTooTiny` floor still requires the body to be visible.
  - **Ship-occlusion guard:** after the sunlit-flip chooses the perp side for lighting, `planFlybyShot` checks whether the planet ends up between the camera and the ship; if so it flips to the other perp side. Ship-visibility (the hard rule: ship in front, never behind) wins over the lit-hemisphere preference. Some gravity-assist geometries hide the ship on both sides — those remain non-iconic and are visible in the dashboard.
  - **Known data gap (not a camera bug):** events whose MET exceeds the mission's modeled outbound arc (`transit_days`) — late Trojan flybys, some MOIs scheduled after the arc end — make the ship sampler clamp to the arc end, so `planFlybyShot` returns null and the cinema falls back to cruise framing (shown as `no-plan` in the dashboard). The fix belongs in the mission timeline/trajectory data, not the camera math.
- **Flyby montage — multi-camera shot cutting (#371, June 2026):** every flyby/arrival plays as an EDITED SEQUENCE of camera shots, cut on beats, instead of one continuously-repositioning camera: **establish (wide) → approach (chase, locked behind the ship → can't occlude) → hero (the composed `planFlybyShot` frame) → depart (pulled-back *catapult* that frames planet+ship together and pulls back as they separate, viewed off-plane so the slingshot curve reads).** Shots are pure functions in `$lib/orbital/flyby-shots.ts` (`composeShot`); the MET-relative timeline + selector + `flybySlowmoSpeed` live in `$lib/orbital/flyby-shot-schedule.ts`. `/fly/+page.svelte` selects the active shot in the flyby branch of `updateHelioAutoZoomTargets` and OVERRIDES the camera transform after `updateCam()` — eased within a shot, hard-cut between shots, with the spherical state kept in sync for a clean handoff back to cruise. Two pacing rules: a **slow-motion** ramp across the close passage (`flybySlowmoSpeed` caps the effective day/sec so the swing is watchable), and **no freeze-frames** — the montage drops the peak-hold AND afterglow freezes (the slow-mo + cuts carry the beat). Toggle: `?montage=0` / DEV `window.__flyMontage(false)`. Validated by `npm run audit:fly-cameras` (per-shot verdicts → `/dev/fly-cameras`); the `FlybyDebugViewer` overlays the four shot cameras + highlights the live one.
- **Decorative moons (`fly-helio-scene.ts` `updateMoonsForParent`):** the major-moon overlay's orbital phase is driven by a wall-clock accumulator (`moonDriftSec`) gated by the same play/freeze predicate as `simDay`, NOT by `simDay × simSpeed`. Decoupling from sim speed stops the strobe at high speeds (Phobos's 0.32 d period at 7 d/s was ~22 rev/s); `MOON_SCENE_SECONDS_PER_DAY` compresses real periods into a calm drift (~10 s/rev for the fastest moon) while preserving relative speeds.

### Body-wiring checklist (ADR-077)

Adding a new flyby body / destination touches ~10 files. Worked examples in order of scope:

- **Arrokoth** (commit `e6e9175b`) — single-body, end-to-end. Canonical reference for the pattern.
- **Halley + 67P** (commit `3c1e6938e`) — comet pair with the synonym-label workaround ("Churyumov" → '67p').
- **#341 Batch 5 — 10 bodies in one sweep** (commit `91b8ed0db`) — Dimorphos+Didymos (DART binary impact target) + 7 Lucy Trojans (Donaldjohanson + Eurybates + Polymele + Leucus + Orus + Patroclus + Menoetius) + Itokawa (Hayabusa 1). Proves the 15-step pattern scales batch-wise — the same 10 files take the entries together (small-bodies.json gets 10 entries at once, DEST_STYLE gets 10 entries at once, etc.) — much more efficient than 10 sequential single-body PRs would be. Also covers the file-rename gotcha (mission JSONs must move to `missions/<dest_lowercase>/` when `dest` changes — the loader resolves by directory).

Per-body steps:

1. **Orbital data** — `static/data/small-bodies.json` entry: `a`, `e`, `T`, `L0`, `incl`, `color`, `radius_km`, `discovered`, `mission_visited`, `description`, `wiki`. Bodies with `e > 0.20` need eccentric-arrival treatment (see Bennu / Pluto pattern in `buildDwarfDestination`); below that the circular model is fine. Comets get `buildCometDestination` so the Lambert-convergence concern (which doesn't apply since no porkchop grid ships) is logged.
2. **`DestinationId` widening** — `src/lib/lambert-grid.constants.ts`. Add literal to the union, add `DESTINATIONS[id]` entry calling the appropriate `build*Destination` builder.
3. **`PLANET_SIZES`** — `src/lib/orbital/find-flyby-planet.ts`. Stylised render radius (small bodies need 0.3–0.9 to read against the bloom).
4. **Label parser** — same file: add to `findFlybyPlanetFromLabel` candidates + `findClosestPlanetToShip` candidates. Add a synonym branch if the label's data form (e.g. "Churyumov" → '67p') differs from the id.
5. **`PlanetId` union + `PLANET_COMPOSITION`** — `src/lib/orbital/flyby-camera-plan.ts`. Tune `camRMultiplier` (6× for small bodies, 4× for giants), `iconicLeadDays` (2–3 for outer/sparse trajectory data, 1 for inner-system).
6. **`DEST_STYLE` + `bodyTextures`** — `src/lib/three/fly-helio-scene.ts`. Visual radius (mirror PLANET_SIZES), stylised color. Texture slot is optional — bodies ship without a texture if no public-domain image source exists.
7. **`labelToPlanetId` + `FLYBY_RADIUS_AU`** — `src/lib/fly-mission-apply.ts`. **Critical** — this remaps the trajectory.json waypoint at the body's label through `destinationPos()` so the ship glyph coincides with the destination mesh at the iconic moment. Without this remap the ship sits at the raw trajectory coords (20+ AU off-axis) and the iconic composition frames empty space.
8. **`NON_CONTEXT_BODIES`** — `src/routes/fly/+page.svelte`. Add to the set so the destinationMesh swap fires when the flyby body differs from the mission's primary destination (NH at Arrokoth past Pluto — the secondary-flyby-mesh-swap mechanism).
9. **Debug-panel `planetIdGuess` loop** — same file, the `FlybyDebugViewer` snippet.
10. **`DESTINATION_LABEL_COLORS`** — `src/lib/fly-scene-constants.ts`.
11. **`/plan` label switch** — `src/routes/plan/+page.svelte`. Switch case for the exhaustive `destinationLabel` function.
12. **14-locale messages** — `messages/en-US.json` + 13 other locales. Use the Python pattern from the Arrokoth commit (transliterate per locale where appropriate; comet 67P keeps Latin in all locales).
13. **i18n overlay (optional)** — `i18n-src/en-US/planets/{id}.json` for /explore detail panel.
14. **Test update** — `find-flyby-planet.test.ts` — move new body out of the "returns null" bucket; add a positive case.
15. **Browser-verify** — load any mission that flies past the body at the iconic MET, confirm iconic composition.

### Scene 3 — `/fly` cislunar (Earth-centered)

- **Coordinate frame:** Earth-Centered Inertial (ECI), world units in km / 1000. Earth at origin.
- **Trajectory geometry:** `src/lib/cislunar-geometry.ts` consumes `flight.cislunar_profile` (parking orbit → TLI → translunar arc → lunar arrival → lunar orbit / TEI) and emits a polyline through 96+ points. The Moon orbits Earth in this scene; the spacecraft polyline is parented to the Earth–Moon barycentre frame so the trajectory stays geometrically faithful.
- **Bodies:** textured Earth + textured Moon + spacecraft cone + a thin `Line` for the Moon's orbit.
- **When it activates:** controlled by a `view` URL param + the destination check; visible only on Moon missions. Camera defaults to a 3-Moon-radii-out perspective with the trajectory fully framed.
- **Tier-1.5 hybrid waypoint hold detector (ADR-077, June 2026):** when `cislunar_profile.waypoints_km` is shipped (Apollo / Luna / Chang'e / SLIM / Chandrayaan-3 / etc.), `buildFromWaypoints` walks the waypoints for "hold" runs — 3+ consecutive entries with identical (x, y, z) within 10 km tolerance. Each hold is a data-designer signature for an iconic beat the analytic model couldn't compute (LOI hold, surface stay, TEI, free-return periselene). Every hold becomes its own `lunar_flyby` (or `descent` if `closest_approach_km ≤ R_MOON + 50`) phase, with `tli_coast`/`tei_coast` filling outbound/inter-hold/return — phases interleave with no overlap. Points are stored as `moonAtFlyby` ECI so the sampler's `MOON_LOCAL_PHASE_TYPES` shift collapses to `live_moon` → spacecraft pins to the live Moon centre for the entire hold window. Multi-hold per mission supported (Apollo 17 with LOI + surface stay + TEI all firing). See ADR-077 for the convention details.
- **Per-event hero compositions (`$lib/orbital/cislunar/cislunar-hero-shot.ts`):** seven event types now drive their own `MoonComposition` variant — `loi`/`tei`/`descent_start`/`ascent` use the Apollo-8-earthrise default (side 85°, pitch 15°, camR 4×, targetBias 0); `flyby` uses `MOON_COMPOSITION_FLYBY` (side 60°, pitch 35°, camR 5×, targetBias 0.4 — Apollo 13 free-return limb arc); `edl_or_oi` uses `MOON_COMPOSITION_IMPACT` (side 45°, pitch 10°, camR 3×, targetBias 0.5 — Luna 9 / Chandrayaan-3 descent-toward-surface tightness); `arrival` shares the loi composition. `findActiveCislunarHero` widened to match all seven types (ADR-077).
- **Live-moon hero tracking (ADR-077):** `planCislunarHeroShot` reads `moonEciPos(simDay)` for its `moonPos`, not `moonEciPos(iconicMet)`. Otherwise the moon mesh (at simDay) drifted out-of-frame for users landing 0.1 d past iconicMet (Moon moves ~13°/day). The shipPosAtMet sampler still uses iconicMet so the approach-direction geometry is invariant inside the hero window.

### Scene 4 — `/earth` (Earth orbit viewer)

- **Coordinate frame:** Earth-Centered, world units chosen so the Earth sphere fits a comfortable viewport. Earth radius = 8 world units.
- **Earth surface:** `SphereGeometry(8, 64, 64)` + base-colour texture (8K NASA Blue Marble; downsampled for mobile per ADR-046 pipeline).
- **Satellite altitude scale:** `altToOrbitRadius(alt_km)` in `src/lib/scale.ts` — a log-linear compression so LEO at 400 km, MEO at 20,000 km, and GEO at 35,786 km all fit visually without GEO sticking 90× further out than LEO. Constants in `scale.ts`.
- **Per-mission silhouettes:** built by `src/lib/earth-satellite-models.ts`. Each builder composes Three.js primitives into a recognisable form: ISS (long truss + 8 wing panels), Tiangong (T-shape), Hubble (silver tube + gold wings), JWST (hex mirror + pentagonal sunshield), Chandra (tapered tube), GNSS constellation (6-dot ring), generic-orbiter fallback (hex bus + symmetric wings + accent ring). 20 dedicated builders; unknown ids fall through to `buildGenericOrbiter`.
- **Orbital rings:** each satellite gets a `RingGeometry` at its log-scaled radius, tilted by inclination. Dimmed for inactive satellites.
- **Selection halo:** `OutlinePass` (postprocess pipeline) draws the gold halo around the picked satellite at frame-time, leaving the silhouette art untouched. See `makeHalo` helper.

### Scene 5 — `/moon` (surface site browser)

- **Coordinate frame:** Moon-centered, world units. Moon radius = 30 world units.
- **Moon surface:** `SphereGeometry(30, 64, 64)` + USGS LRO-Kaguya albedo + bump (downsampled). The Moon is tidally locked in render: the camera default-faces the near side; the user can orbit to the far side.
- **Surface markers:** for each entry in `static/data/moon-sites.json` whose `kind` is `surface`, `src/lib/moon-lander-models.ts` builds a per-mission silhouette positioned at `latLonToUnitSphere(lat, lon) * 30`. The local-up axis is the surface normal (radial outward); the model is oriented by `setFromUnitVectors([0,1,0], up)` so towers stand tall on the surface. 11 mission-specific builders (Apollo LM, J-mission LM + LRV, Luna 9, Luna sample-return, Lunokhod, Chang'e 3/4, Chang'e 5/6, Yutu, Vikram + Pragyan, SLIM, Artemis III); plus 4 category fallbacks.
- **Orbital ring + dot:** lunar orbiters (`kind: 'orbiter'`) render in a separate `THREE.Group` parented to the scene root (not to `moonMesh`) so the orbiter stays in an inertial frame while the Moon rotates underneath. Per-orbiter ring + spacecraft model from the shared `buildSatelliteModel` factory.
- **Selection halo:** same `OutlinePass` pattern as `/earth`.
- **2D dual-disc projection (optional view):** `view=2d` URL param swaps to an orthographic dual-disc near-side + far-side layout per ADR-038, useful on small screens.

### Scene 6 — `/mars` (surface site + orbital probe browser)

- **Coordinate frame:** Mars-centered, world units. Mars radius = 30 world units (same as `/moon` so the mental model carries over).
- **Mars surface:** `SphereGeometry(30, 64, 64)` + HiRISE-derived albedo + topography texture.
- **Surface markers:** per-mission silhouettes for rovers (Curiosity, Perseverance, Spirit, Opportunity, Sojourner, Zhurong), landers (Viking 1/2, InSight, Phoenix, Pathfinder, Mars Polar Lander), and the upcoming Mars Sample Return SRL. Same pattern as `/moon`.
- **Rover traverses:** `static/data/mars-traverses/*.json` holds traverse path geometries. Each rover with a published traverse renders a polyline draped across the sphere using sphere-surface interpolation (great-circle splines between waypoints). Traverse is dim by default, brightens on rover selection.
- **Along-route HiRISE (#360):** the single 512 m landing patch is no longer the whole story. `scripts/hotspots/fetch-mars-traverse.ts` samples each rover's stops + a ~0.5 km interval fill and crops a 512 m HiRISE patch at every point (1024², cache-warm — most reuse one swath), writing a `<rover>.route-patches.json` manifest (loaded by `getMarsTraverse`). `SurfaceScene` renders these along the **magnified** traverse: the true-scale path (`tpos`, magnification `M = co-scale ÷ true-scale ≈ 22×`) is blown up around the landing so the 0.1u detail patches sit on the imagery; route patches are **path-direction aligned**, the regional CTX is re-centred on the **arc-length midpoint** (`buildRegionalPatch`), the camera + crosshair frame the route centre, and deepest-zoom opens the **nearest** route patch. Traverse rovers hide their landing halo/regional (rendered at the midpoint instead). Authored for Curiosity, Perseverance, Opportunity, Spirit + **Zhurong** (CNSA). Traverse polylines are V1 approximations (#362 tracks high-fidelity per-sol coords). Moon equivalent tracked in #361.
- **Surface-imagery credit (#360):** HiRISE/CTX provenance records the capturing spacecraft (`spacecraft_id`/`spacecraft_name`/`instrument`); `/credits` routes them via `provenanceSourceId` into dedicated **NASA · HiRISE** and **NASA · CTX (Murray Lab)** sections with a chip linking to `/mars?site=mro`. `fetch-mars-traverse` self-credits; `backfill-imagery-provenance.ts` covers the existing set.
- **Moon regional context = Kaguya TC, monoscopic-first (#361):** the Moon's CTX-equivalent Tier 2a layer for the 12 detail-only landers (Luna 9/16/17/21/24, Chang'e 3/4/5/6, Chandrayaan-3, SLIM, Beresheet). `scripts/hotspots/fetch-moon-kaguya-regional.ts` STAC-searches the USGS Astrogeology ARD Kaguya (SELENE) TC collections and `gdal /vsicurl/` window-crops a ~16 km patch from the public S3 COGs — JAXA imagery, no full downloads. `rankScore` weights **collection ×1e6 so monoscopic (sharp, nominal mapping) always wins** over stereoscopic/spsupport (off-nominal, soft — a crop reads like an upscaled thumbnail). Self-credited `JAXA-OPEN` / `instrument:'Kaguya TC'` → `/credits` **JAXA · Kaguya TC** section. Wiring the regional source re-sizes the selection bracket to the 3.0u patch.
- **Moon detail = LROC Featured Images + guard + Kaguya failover (#361):** no programmatic sharp NAC exists for these sites (verified: STAC has no NAC; ODE `SDPPHO` map-projected NAC = 0 at every robotic site, 99 at Apollo; only raw `EDRNAC4` needing ISIS, not installed). `fetch-moon-featured-images.ts` downloads LROC's published Featured Images with an **orbital-surface guard** (reject >40 % near-black → catches a hardware photo like the old luna17) and **Kaguya failover** (guard reject / no image → that site's Kaguya regional as detail; luna9). Apollo + 4 mare sites use curated BDR NAC ROI ids (`lroc-products.ts`, no ISIS). Co-scale extents authored for all 17 Moon Tier-2 sites → Mars-style progressive detail reveal.
- **Moon rover traverses (#361):** Lunokhod 1/2, Yutu, Yutu-2, Pragyan. `build-moon-traverses.mjs` writes V1 polylines (procedural, anchored at real landing coords); `getMoonTraverse` + `/moon` `loadMoonTraverses` reuse the planet-agnostic `loadTraverses` path; `fetch-moon-traverse.ts` (lunar `fetch-mars-traverse`) crops along-route Kaguya patches → `moon-traverses/<rover>.route-patches.json`. Magnified-traverse render is shared with Mars.
- **Surface select-landing + reveal + blink (#361):** selecting a site lands at camR 37 (was 50, before the regional ramp started); regional reveal `44 → 33`, detail `33 → 30.32`, ~64% bracket-framed on arrival. The closer landing exposed an LRU-thrash blink (most hotspots promote at once at camR 37, `HOTSPOT_LRU_CEILING` 16 capped them → demote/re-promote 2/frame → `fadeProgress` reset → flicker); raised to **28** (moon 18 + mars 13).
- **Orbital probes:** Mars Reconnaissance Orbiter, MAVEN, Mars Express, Mangalyaan, Trace Gas Orbiter, Hope Probe, Tianwen-1 — same orbital-ring-plus-dot pattern as `/moon`, using `buildGenericOrbiter` from `earth-satellite-models.ts`.
- **2D equirectangular map (alternate view):** the same site data renders flat on an equirectangular projection per ADR-038, suitable for traversal overlay studies.

### Scene 7 — `/iss` (ISS Explorer)

- **Coordinate frame:** ISS-local. Stage axes drawn per ADR-040 so the user can see orbit-direction labels (zenith / nadir / prograde / retrograde) overlaid on the structure.
- **Geometry:** `src/lib/iss-proxy-model.ts` (~68 KB) — a hand-modelled **diagrammatic** representation of all 18 USOS + ROS modules at consistent box-and-cylinder fidelity. Not glTF, not photogrammetry: every module is composed of Three.js primitives with PBR materials and accent-coloured agency stripes. Solar arrays animate-shimmer over a 20-second cycle to mimic albedo specular.
- **Pickability:** every module mesh carries `userData.moduleId` per ADR-041 so `Raycaster` returns the picked module id without a string lookup. The right panel slides open with the matching module's overlay content. Same pattern is exposed to Playwright via `window.__pickAt(x, y)`.
- **Visiting spacecraft:** Crew Dragon, Cygnus, Progress, HTV, Soyuz, Starliner, etc. — when docked, they render as small inline diagrams attached at the correct port. The "current visitors" set is data-driven from `static/data/iss-visitors.json`.
- **Low-end fallback:** per ADR-042, devices with WebGL2 disabled or limited VRAM fall back to a **list view** of modules with the same overlay content. Heuristic test: `webgl_capable && screen.width >= 480 && !low_memory_hint`.
- **Schematics:** `static/diagrams/iss-schematic-front.svg` + `iss-schematic-top.svg` render alongside the 3D scene as 2D blueprints with overlay annotations.

### Scene 8 — `/tiangong` (Tiangong Explorer)

- Mirrors `/iss` exactly: `src/lib/tiangong-proxy-model.ts` (~28 KB; smaller because Tiangong has 3 modules vs ISS's 18) builds Tianhe + Wentian + Mengtian using the same primitives-with-PBR pattern, same `userData.moduleId` pickability per ADR-049, same low-end list fallback per ADR-050. Decision pattern locked by ADR-048 was "use the ISS template; minimal divergence."

### 2D scenes (non-WebGL)

- **`/plan` porkchop plot** — pure 2D canvas. Pre-computed grids in `static/data/porkchop/earth-to-<dest>.json` per ADR-016 + ADR-026 + ADR-028; rendered via canvas with a per-pixel colourised delta-v value. Magnifier interaction per ADR-023 (5×5-cell window, 140 px bubble).
- **`/missions` timeline** — pure DOM + CSS. SVG ribbons per phase (cruise / arrival / EVA / sample-return) from `mission.flight.events`.
- **`/science` diagrams** — pure SVG, embedded inline; KaTeX renders maths into adjacent HTML at build time.

### Per-route teardown discipline

Every route's `onDestroy` calls `disposeScene(scene)` from `src/lib/three/dispose-object3d.ts`, which walks the graph for `Mesh | Line | Points`, disposes their geometry + material(s), and frees the 17 PBR texture slots (`map`, `emissiveMap`, `normalMap`, `bumpMap`, `displacementMap`, `roughnessMap`, `metalnessMap`, `specularMap`, `envMap`, `alphaMap`, `aoMap`, `lightMap`, `matcap`, `gradientMap`, `clearcoatMap`, `clearcoatNormalMap`, `clearcoatRoughnessMap`). The renderer is nulled and the canvas removed from the DOM. Locale switching, navigation away, or HMR reload triggers this path. Without it, repeated route mounts leak GPU memory across sessions — caught by the `dispose-leak.test.ts` jsdom harness that snapshots `renderer.info.memory` before / after. The helper was centralised in v0.7.0 (previously each route inlined a partial traversal that missed `Line` / `Points` and several texture slots).

### Long-list rendering perf

Routes with mostly-text long lists — `/fleet` (137 entries × 9 categories), `/library` (per-entity outbound link blocks), `/credits` (per-image provenance rows) — apply CSS `content-visibility: auto` + `contain-intrinsic-size` per `<li>` / `.source-block`. Browser skips rendering off-screen items until they near the viewport. Browser-native (Chromium ≥ 85, Safari ≥ 18); no JS virtualisation library. Cuts initial paint cost and scroll smoothness on slow devices (W4).

---

## §pipelines

How content reaches the application — the fail-closed asset + provenance discipline that distinguishes Orrery from a typical front-end.

### Pipeline 1 — Asset fetch (`scripts/fetch-assets.ts`)

**Goal:** for every entity in the corpus (mission, fleet entry, surface site, planet, etc.), pull a curated set of imagery from operator-first sources to `static/images/<surface>/<id>/`.

**Source priority** (per ADR-046, restated in ADR-053):

1. **Operating agency archive** — NASA Images and Video Library, ESA, Roscosmos, CNSA, JAXA Digital Archives, ISRO, KARI, MBRSC, CSA, ASI. Each entity's `country` + `agency` fields drive the lookup. NASA-side: search via the official `images.nasa.gov` JSON API.
2. **Wikimedia Commons** — only when the agency archive doesn't publish the era's imagery. Resolved via Commons `imageinfo` API; license must be CC-BY / CC-BY-SA / PD-Gov / PD-Soviet / PD-NASA.
3. **`airandspacehistory.com`** — first-party permission granted for restricted Soviet imagery; per-image waiver in `license-waivers.json` (ADR-053 OQ-18).

**Banned:**

- Artist's impressions of vehicles that exist or have existed (planned-only entries carry an `artistic-impression: true` waiver per ADR-053).
- Stock photography / third-party render mockups (no `wired.com`, no `space.com`).
- Anything that can't produce a license + attribution + last-verified for the manifest.

**Layout:**

```
static/images/<surface>/<id>/01.jpg        # hero
static/images/<surface>/<id>/02..NN.jpg    # gallery
static/images/missions/<id>-patch.png      # mission patch (per crewed flight)
static/images/crew/<surname>-<initial>.jpg # crew portrait
static/images/textures/<body>.jpg          # planet / moon surface texture
```

**Asset size cap: 8 MiB / file** (enforced by `validate-data.ts`). Aggregate watch via CI guard.

**Audit tooling:**

- `scripts/audit-fleet-heroes.ts` — read-only flagger for low-quality fleet heroes (URLs that look like ad-hoc Google-Images downloads instead of agency archives).
- `scripts/fix-fleet-heroes.ts` — substitution helper, Wikipedia-API filename derivation pattern. Output to `docs/provenance/fleet-hero-audit.md`.

### Pipeline 2 — Image provenance manifest (`scripts/build-image-provenance.ts`)

**Output:** `static/data/image-provenance.json`. One row per image file present anywhere under `static/images/`. Schema in `static/data/schemas/image-provenance.schema.json`.

**Row shape:**

```json
{
  "id": "fleet-galleries/saturn-v/01.jpg",
  "file_hash": "sha256:...",
  "source_id": "nasa-images",
  "source_url": "https://images.nasa.gov/details/AS11-40-5874",
  "license": "PD-USGov-NASA",
  "attribution": "NASA / Apollo 11 / Buzz Aldrin",
  "title": "Apollo 11 — descent stage 'Tranquillity' surface",
  "last_verified": "2026-05-08"
}
```

**How it's built:**

1. Walk `static/images/` for every file.
2. Look up the entity that references the file (by walking `static/data/**` for `hero_path`, `gallery[*].path`, `patch_path`, `portrait_path`).
3. Resolve the source via `source-logos.json` (28 known sources at v0.6).
4. For Wikimedia Commons URLs, call the `imageinfo` API to confirm the current license + attribution at build time (not at install time — the manifest captures the build-day truth).
5. Write the manifest in deterministic ordering (by `id`).
6. Fail closed if any image lacks a recognisable source row.

**License allowlist** lives in `src/lib/license-allowlist.ts`. Anything outside the allowlist requires a row in `license-waivers.json` or the build fails.

### Pipeline 3 — Outbound LEARN-link manifest (`scripts/build-link-provenance.ts`)

**Output:** `static/data/link-provenance.json`. One row per `(entity_id, url)` pair. Schema in `static/data/schemas/link-provenance.schema.json` (see ADR-051).

**Row shape:**

```json
{
  "id": "apollo11__abc123",
  "entity_id": "apollo11",
  "route": "/missions",
  "category": "mission",
  "url": "https://history.nasa.gov/SP-4029/...",
  "label": "Apollo by the Numbers",
  "tier": "core",
  "source_id": "nasa-history",
  "language": "en",
  "kind": "agency-official",
  "fair_use_rationale": "external reference; rel=noopener noreferrer external",
  "last_verified": "2026-05-08"
}
```

**How it's built:**

1. Walk every `links[]` array under `static/data/` (missions, fleet, sites, planets, science).
2. Normalise URLs: strip `utm_*`, `fbclid`, AMP suffixes, `m.` mobile prefixes.
3. Classify the host against `source-logos.json`.
4. Infer the language from the URL pattern (`ru.wikipedia.org` → `ru`; agency TLDs follow); mark for human review when ambiguous.
5. Output in deterministic ordering.

**Diversity targets** (per ADR-051):

- Every non-US entity has at least one `agency-official` `intro` link to its operator. **First** intro link on a non-US entity must be the operator portal.
- No entity has Wikipedia as its sole source.
- Non-US source share rises from ~4 % to ≥ 15 % across the corpus (v0.6 ship: 17 %).
- 100 % first-link agency coverage on non-US entities.

**Locale fallback chain** (applied by `src/lib/library-grouping.ts` at render time):

1. Links whose `language` matches the active UI locale.
2. Links whose `language` matches the operator's native language (Roscosmos → `ru`, CNSA → `zh`, JAXA → `ja`, ISRO → `hi` or `en`, MBRSC → `ar`).
3. English.
4. Multi-lingual landing (`*`).

Additive — a non-matching locale never *hides* a link, only re-orders. Native-language pages stay visible to every user.

### Pipeline 4 — Live link health (`scripts/check-learn-links.ts`)

**Goal:** keep the link manifest honest in the face of agency-site reorganisations.

- HEAD-probes every URL; falls back to GET on 405.
- Honours each host's `robots.txt`.
- Captures redirect chains (so a `301 → 200` is recorded as the final URL).
- Flags slow responses (> 5 s), expired TLS, IPv6-only hosts.
- Writes `docs/provenance/last-link-check.md` with a per-source health table.
- `--update` mode rewrites `link-provenance.json` to follow safe 301 redirects.

**When it runs:** `npm run fetch` chain (manual; not in CI). Build does **not** call this (no live network in CI).

`scripts/validate-data.ts` enforces: every `intro` / `core` link returned 2xx in the most recent `last-link-check.md`; 4xx / 5xx on `intro` / `core` fails the build. `deep` 4xx / 5xx warn but don't fail.

### Pipeline 5 — Text-source attribution (`static/data/text-sources.json`)

**Goal:** every paraphrased editorial fragment (`/science` section body, surface-site `credit` field, fleet `best_known_for`, mission CAPCOM notes) is registered with a source row.

**Row shape:**

```json
{
  "id": "science-orbits-keplers-laws__01",
  "section_id": "orbits/keplers-laws",
  "source": "encyclopedia-britannica",
  "license": "fair-use-citation",
  "url": "https://...",
  "last_verified": "2026-05-08"
}
```

15 entries at v0.6 (small surface — most text is original or carries inline link attribution). Schema in `text-sources.schema.json`. Validated by `validate-data.ts`.

### Pipeline 6 — Source logos (`static/data/source-logos.json`)

**Goal:** display a recognisable publisher logo + license summary next to every external source on `/credits` and `/library`.

28 entries at v0.6: nasa, esa, roscosmos, cnsa, jaxa, isro, kari, mbrsc, csa, asi, spx, blueorigin, wikipedia, wikimedia, commons, britannica, planetary-society, airandspacehistory, history-nasa, etc.

Each entry: logo path (`/images/source-logos/<id>.svg`), display name, license summary, base URL pattern. Used by `LinkCredit.svelte` + `/credits` route.

### Pipeline 7 — Diagram authoring (`scripts/validate-diagrams.ts`)

**Goal:** every diagram referenced from a data file is a hand-authored SVG, committed to source.

- 71 `/science` diagrams at `static/diagrams/science/`.
- ~35 `/fleet` ANATOMY SVGs at `static/diagrams/fleet/` (tiered F.1–F.4 per ADR-053).
- ~10 station schematics (`iss-schematic-*.svg`, `tiangong-schematic-*.svg`).
- Section cover SVGs (`_cover-<tab>.svg` for each `/science` tab).

`validate-diagrams.ts` walks the data tree, collects every `diagram` field, and confirms the file exists + parses as XML. Missing or malformed diagram **fails the build** (per ADR-035).

### Pipeline 8 — Science index (`scripts/build-science-index.ts`)

**Goal:** generate `static/data/science-index.json` — the search index for Cmd-K, the tab tree for navigation, and the `?-chip` vocabulary for cross-route chips.

Walks `i18n-src/en-US/science/<tab>/*.json` for the canonical (en-US) section list, joins with `static/data/science/<tab>/<section>.json` base files for the diagram + LEARN tier metadata, and writes a single manifest. Auto-walks: adding a new section file in any tab makes it appear on `/science` + in search + as a chip target on the next build.

### Pipeline 9 — Porkchop pre-computation (`scripts/precompute-porkchops.ts`)

**Goal:** ship pre-computed Lambert grids for every default destination so `/plan` first-paint never spawns a worker.

9 destinations: Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Ceres. Each grid is 112 × 100 cells × `dv_kms` (~50 KB JSON gzipped). Committed to `static/data/porkchop/earth-to-<dest>.json` per ADR-016 + ADR-026 + ADR-028.

The Lambert worker stays in the bundle for any future custom-range computation (user-driven date-range editor); dormant on the default scenarios.

### Pipeline 10 — i18n + translation (`scripts/wave23/`)

> **Source relocated (ADR-079 D2 / #377, 2026-07-07):** the raw per-entity overlay tree moved from `i18n-src/<locale>/` to **`i18n-src/<locale>/`** — it is build-time *source*, never a servable asset (~10,360 files, ~60% of the old `static/` file count, that were flaking GH Pages, #373). `build-i18n-bundles.mjs` reads `i18n-src/` and writes the 14 collapsed runtime bundles into `static/data/i18n/{locale}.json` (still served). Consumers repointed via the `$i18nSrc` alias (`svelte.config.js`). References below to `i18n-src/<locale>/…` describe the *logical* overlay path; the physical source is `i18n-src/`.

Three-stage pipeline per ADR-033 + ADR-054:

1. **catalog.ts** — read every en-US overlay (missions, fleet, science, surface sites, ISS modules, Tiangong modules) and write a flat key → en-US-string map.
2. **maps.ts** — translate each en-US string with argos-translate per target locale; merge with any LLM-spot-fix overrides; write a per-locale key → translated-string map.
3. **apply-translations.ts** — read each base file, replace en-US fields with the locale's translations, write the per-locale overlay.

**sr-Cyrl** is hand-authored (no argos model). The pipeline writes a stub overlay; the curator fills it in.

`scripts/wave23/` is reused identically across mission, fleet, and science content — no per-surface forks.

### Pipeline 11 — Build-time compression (W3)

`vite-plugin-compression2` runs at the tail of `vite build` and emits `.br` (Brotli, quality 11) + `.gz` siblings for every text-ish asset (`.js`, `.mjs`, `.cjs`, `.css`, `.html`, `.json`, `.svg`, `.ico`, `.webmanifest`, `.map`) above 1 KiB threshold. Originals are kept (`deleteOriginalAssets: false`) so clients without compression negotiation still get a valid response. GitHub Pages serves the originals as-is; the docker-stack web container (ADR-063) serves the precompiled siblings via nginx `brotli_static on` + `gzip_static on` — zero CPU cost, a file-existence lookup per request. Live brotli compression is intentionally NOT enabled: an earlier attempt to compress `/data/*.json` on the fly tipped docker-e2e past the 45-min cap (rollback documented in `ops/docker/nginx.conf`).

### Pipeline 12 — Audio narration (`scripts/audio/`)

Operator-triggered, per-episode build pipeline. v0.7 ships en-US only. Inputs are markdown scripts under `content/episodes/<locale>/<episode-id>.md` with YAML frontmatter (`id`, `persona`, `route`, `title`, `duration_target_sec`, optional `text_authorship` / `text_author_model`). Outputs are content-addressed audio + caption + transcript triples under `static/audio/<locale>/<persona>/<id>.<hash8>.{mp3,vtt,txt}`.

Stages:

1. **Provider abstraction** (`scripts/audio/tts/provider.ts`) — `TtsProvider` interface; concrete implementations for Google Cloud TTS (`google.ts`, MP3 default ~64 kbps mono) and ElevenLabs (`elevenlabs.ts`, `mp3_44100_96` explicit), each wrapped in `withRetry` (`retry.ts`) for 3-attempt exponential backoff, honouring `Retry-After` on 429.
2. **Cache** — SHA-256 over `(provider, voiceId, ssml)` → 8-char hash in the filename. Identical input never re-generates; a cached row logs `chars: 0, cost_usd: 0` to the ledger.
3. **Cost ledger** (`scripts/audio/cost-ledger.ts`) — append-only `static/data/audio/cost-ledger.json` with per-provider monthly totals. Atomic writes (tmp + rename). UTC ts contract asserted. Thresholds: $50/mo soft warn, $200/mo hard halt. `npm run audio:check-cost` is the operator + CI gate; wired into `npm run preflight`.
4. **Provenance** (`scripts/audio/provenance.ts`) — upsert by `(episode_id, locale, persona, provider)` into `static/data/audio/audio-provenance.json`. Manifest top-level `generated_at` is quiescent — re-running on unchanged input doesn't churn git diffs.
5. **Cross-check** (`scripts/validate-data.ts` audio gate) — every provenance row's mp3/vtt/txt must exist on disk; every script under `content/episodes/` must have at least one provenance row. Mismatches fail-closed at preflight.

Schema: `static/data/schemas/audio-provenance.schema.json`. Voice ID map: `static/data/audio/voices.json`. Runbook: [docs/guides/audio-pipeline-setup.md](../guides/audio-pipeline-setup.md). See PRD-016 + RFC-019.

### Pipeline orchestration (`npm run fetch` + `npm run preflight`)

```
npm run fetch         = fetch-assets
                      → build-image-provenance
                      → build-link-provenance
                      → check-learn-links
                      → validate-data

npm run preflight     = typecheck
                      → lint
                      → test
                      → validate-data
                      → build

npm run build         = i18n:compile
                      → validate-data (fail-closed gate)
                      → vite build
```

The husky pre-push hook runs `preflight`. CI mirrors this chain exactly (per ADR-014 / ADR-015). The build is reproducible from a clean checkout in under 6 minutes locally, ~22 minutes in CI on `ubuntu-latest` single-worker per `playwright.config.ts`.

**Deploy tiers — dev → staging → prod.** Three environments, and analytics are tagged by tier:

| Tier | Host | Trigger | Workflow | URL |
|---|---|---|---|---|
| **dev** | local | `npm run dev` | — | `http://localhost` |
| **staging** | **GitHub Pages** | **auto** after `docker-e2e` goes green on `main` (+ manual + weekly cron) | `preview.yml` (workflow name "Deploy preview") | the GitHub Pages site |
| **prod** | Hetzner VPS (docker stack, ADR-063) | **manual only** — `gh workflow run "Deploy to prod VPS (orrery)"` | `deploy-prod.yml` | `https://www.orrerylearn.com` |

Staging is **not** a conveyor to prod: main pushes auto-publish to GitHub Pages (staging) on every green build, but promotion to the VPS (prod) is a deliberate manual step — an operator chooses which good staging build to ship, and may iterate on staging many times without ever going live. The workflow that publishes staging is still literally named **"Deploy preview"** / `preview.yml` (the file predates the tier vocabulary); "preview" and "staging" refer to the same GitHub Pages tier.

**One smoke suite, reused per tier.** `scripts/validate-prod.mjs` is URL-parameterized (`VALIDATE_URL`) and tier-parameterized (`VALIDATE_TIER`, default `prod`), so the same suite validates any tier — the difference is only which checks apply and whether it blocks:

- **staging** — `validate-staging.yml` runs it (`VALIDATE_TIER=staging`, `VALIDATE_REQUIRE_DSN=1`) automatically after every `preview.yml` publish, as the **final link of the staging chain** (`ci → docker-e2e → preview → validate-staging`). It skips the nginx security-header/CSP suite (GitHub Pages is a static host — those are a VPS/nginx concern) and hard-requires a baked Sentry DSN (staging emits Sentry tagged `environment=staging`). The chain **ends here** — it never triggers prod. A publish-lag poll on the `/_deploy-sha.txt` fingerprint (written by `preview.yml`) waits for the new build before smoking.
- **prod** — the same suite runs post-deploy in `deploy-prod.yml`'s `validate` job (full nginx header/CSP assertions) and on the 6-hourly `validate-prod.yml` schedule. Prod runs are a **detector** (post-deploy, no rollback); the staging run is a **gate** signal on staging quality.

Base-path note: staging serves under base `/orrery/` (`VITE_BASE`), so the validator is base-aware (`BASE_PATH` derived from the URL) — the SW-fallback + localized-home assertions respect the base rather than assuming root.

**CI trigger map.** `ci.yml` (typecheck · lint · `test:coverage` · validate-data · build) and CodeQL run on `push`/`pull_request` to `main`; a green `ci.yml` chains the e2e + publish gates via `workflow_run` (`docker-e2e.yml` — sharded per W7/ADR-066 — and `mobile-e2e.yml`), and a green `docker-e2e` in turn triggers the **staging** publish (`preview.yml` → GitHub Pages) and the docs publish (`deploy-docs.yml`, ADR-070); a successful `preview.yml` then triggers the **staging smoke** (`validate-staging.yml`) as the chain's final link (see "Deploy tiers" above). Orrery merges feature branches straight to local `main` (no PRs), so a long-lived branch otherwise gets **zero Linux `npm ci` runs until it's already merged**. `lock-check.yml` closes that gap: on every push to a non-`main` branch it runs a cold `npm ci --ignore-scripts` on `ubuntu-latest`, surfacing lockfile drift on the branch push instead of post-merge. The drift it guards against: a macOS `npm install` silently strips Linux-only optional peer deps (`@emnapi/*`, pulled transitively by the optional `@rolldown/binding-wasm32-wasi` → `@napi-rs/wasm-runtime`) from `package-lock.json`, which then fails the cold Linux `npm ci` with `Missing @emnapi/... from lock file`. Regenerate the lock on Linux (`docker run --rm -v "$PWD":/app -w /app node:20 npm install --package-lock-only`), never macOS. The file lives on `main` so branches cut from it inherit the guard.

---

## §contracts

Data shapes between components. Locked by schemas under `static/data/schemas/`.

### Mission index entry (from `missions/index.json`)

Language-neutral manifest for the catalog grid (no `name`, `type`, `first`).

```json
{
  "id": "curiosity",
  "agency": "NASA",
  "dest": "MARS",
  "status": "ACTIVE",
  "year": 2011,
  "sector": "gov",
  "color": "#0B3D91"
}
```

### Full mission record (base + overlay)

Base file: `static/data/missions/<dest_lower>/<id>.json`. Overlay: `i18n-src/<locale>/missions/<dest>/<id>.json`. Shapes locked by `mission.schema.json`.

```json
{
  "id": "curiosity",
  "agency": "NASA", "agency_full": "...", "sector": "gov", "dest": "MARS",
  "color": "#0B3D91", "year": 2011, "status": "ACTIVE",
  "departure_date": "2011-11-26", "arrival_date": "2012-08-06", "transit_days": 254,
  "vehicle": "Atlas V 541", "payload": "...", "delta_v": "~6.1 km/s",
  "data_quality": "good", "credit": "© NASA / JPL-Caltech — ...",
  "links": [{ "l": "...", "u": "https://...", "t": "intro|core|deep" }],
  "flight_data_quality": "measured",
  "flight": {
    "launch": {}, "cruise": {}, "arrival": {}, "totals": {},
    "events": [],
    "cislunar_profile": {
      "parking_orbit": { "alt_km": 185, "incl_deg": 32.5 },
      "tli": { "dv_kms": 3.1, "epoch_met_days": 0.12 },
      "translunar_type": "direct",
      "lunar_arrival": { "approach_km": 110, "loi_dv_kms": 0.85, "lunar_orbit_alt_km": 100 },
      "tei": { "epoch_met_days": 8.5 }
    }
  },
  "fleet_refs": [
    { "id": "atlas-v-541", "role": "launcher" },
    { "id": "curiosity-rover", "role": "spacecraft" }
  ]
}
```

`flight.cislunar_profile` is **optional**, present only on Moon-destination missions; consumed by the second `/fly` camera per ADR-058. `fleet_refs[]` is the **forward pointer** for the bidirectional fleet contract (ADR-052) and must be matched by a reverse `linked_missions[]` entry on the corresponding fleet entry.

### Fleet entry (from `static/data/fleet/<category>/<id>.json`)

Locked by `fleet-entry.schema.json`. Language-neutral; editorial fields merge from `i18n-src/<locale>/fleet/<category>/<id>.json` per ADR-054.

```json
{
  "id": "saturn-v",
  "name": "Saturn V",
  "category": "launcher",
  "agency": "NASA", "country": "USA", "manufacturer": "Boeing / North American / Douglas",
  "first_flight": "1967-11-09", "last_flight": "1973-05-14",
  "status": "RETIRED", "era": "1969-1981", "epoch": "lunar-era",
  "specs": { "height_m": 110.6, "payload_lEO_kg": 140000, "stages": 3 },
  "linked_missions": ["apollo11", "apollo12", "apollo13", ...],
  "linked_sites": [{ "type": "moon", "site_id": "apollo11" }, ...],
  "flights": [
    {
      "mission_id": "apollo11", "flight_designation": "AS-506",
      "patch_path": "/images/missions/apollo11-patch.png",
      "crew": [{ "name": "Neil Armstrong", "role": "Commander", "portrait_path": "..." }]
    }
  ],
  "explorer_route": "/iss",
  "credit": "© NASA — ...",
  "links": [{ "l": "...", "u": "https://...", "t": "intro|core|deep" }]
}
```

`linked_missions[]` + `linked_sites[]` are the **reverse pointers** matched against the forward `fleet_refs[]` on every mission and surface-site. Symmetric-link drift fails the build per ADR-052.

### Surface site (Moon / Mars)

Schemas: `surface-site.schema.json`, `surface-site-overlay.schema.json`. Used by `static/data/moon-sites.json` + `static/data/mars-sites.json`.

```json
{
  "id": "apollo11",
  "kind": "surface",
  "agency": "NASA", "nation": "USA", "year": 1969,
  "landing_date": "1969-07-20",
  "lat": 0.674, "lon": 23.473,
  "crewed": true,
  "status": "FLOWN",
  "surface_status": "completed",
  "surface_duration_days": 0.92, "samples_kg": 21.55,
  "credit": "© NASA — ...",
  "links": [{ "l": "...", "u": "https://...", "t": "intro" }],
  "fleet_refs": [{ "id": "apollo-lm", "role": "spacecraft" }, { "id": "a7l", "role": "surface-suit" }]
}
```

### Science section (encyclopedia)

Schemas: `science-section.schema.json`, `science-section-overlay.schema.json`, `science-tab-intro.schema.json`, `science-landing.schema.json`. The base file holds only the section id + tab + diagram path + linked LEARN tier; the overlay carries `title`, `subtitle`, `body_paragraphs[]`, optional `formula_latex`, optional `chip_label`, optional photo embed metadata. Per ADR-034, formulas are server-rendered KaTeX at build.

### Provenance manifests

Locked by `image-provenance.schema.json`, `link-provenance.schema.json`, `text-sources.schema.json`, `source-logos.schema.json`, `license-waivers.schema.json`. Each row: source, license, attribution, last-verified, optional waiver-reason. See ADR-047, ADR-051.

### Lambert worker message protocol

Locked by ADR-022 (closes RFC-003); generalised over destination by ADR-026 (closes RFC-007); outer-system destinations added by ADR-028. Every message carries a monotonic `id` for implicit cancellation.

**Main → Worker (request):**
```json
{ "id": 1, "depRange": [0, 1460], "arrRange": [80, 520], "steps": [112, 100], "destinationId": "mars" }
```

`destinationId` optional (defaults to `"mars"`). Valid: `mercury | venus | mars | jupiter | saturn | uranus | neptune | pluto | ceres`.

**Worker → Main (progress, every 10 rows):**
```json
{ "id": 1, "progress": 0.42 }
```

**Worker → Main (final result):**
```json
{ "id": 1, "grid": [[dv, ...], ...], "depDays": [...], "arrDays": [...] }
```

Failed cells: sentinel `28` km/s — clamps into the deepest red of the colour scale.

Note: the worker is dormant for the 9 default destinations because their grids are pre-computed at build time and committed to `static/data/porkchop/earth-to-<id>.json` per ADR-016 + ADR-026 + ADR-028.

### Orbital constants

```js
MU_SUN       = 4 * Math.PI * Math.PI   // AU³/yr²  — IAU
AU_TO_KM     = 149597870.7             // km/AU    — IAU 2012
AU_TO_LMIN   = 8.317                   // light-minutes/AU
AUPYR_TO_KMS = 4.7404                  // km/s per AU/yr
```

### Test readiness contract

Per ADR-056. Every canvas route exposes:

- `window.__pickAt(x: number, y: number): string | null` — synthetic pick at viewport coordinates; returns the picked entity id or null.
- `data-route-ready="true"` on a known element when first paint completes.
- `data-loading="<state>"` for long-running operations (porkchop fetch, fleet-gallery hydration, etc.).

Playwright synchronises on these instead of arbitrary sleeps.

---

## §constraints

Non-negotiables. Cannot be changed without a new ADR that explicitly supersedes the constraint.

- **Browser-only.** No server-side logic. No backend. No API server. The host (GitHub Pages today; nginx, Cloudflare Pages, or any static host in future per ADR-014) serves static files only. The application must work as `http://localhost` and from any static host.

- **No user data, with two narrow carve-outs.** No accounts. No login. No `localStorage`. No `sessionStorage`. No tracking. **Two permitted cookies, each ADR-gated:** `orrery_locale` (ADR-057, explicit locale-override only) and `orrery_tour` (ADR-075, Curator Tour resume `{ep, pos, idx, cmp}` only). Auto-detected locale, Science Lens, mission filters, install counter, per-episode heard-state, and every other piece of state stay runtime-only. Each future cookie request needs its own ADR.

- **Three.js 0.185.1.** Pinned, local bundle (upgraded from r128 in #203 — ADR-001 amended). Lighting is physically-correct by default post-r155; the legacy r128 look is restored where it mattered via `× Math.PI` light-intensity scaling (`surface-lights.ts`, the /iss / /tiangong / `fly` cislunar scenes). Production bundles locally.

- **AU units in 3D scenes.** All 3D coordinates in the `/explore` heliocentric scene are in astronomical units. Earth orbit = 1.0 AU. Sun sphere radius = 0.06 AU. Do not mix pixel-scale coordinates into 3D scenes. Per-scene local scales (km in `/earth`, world-units in `/moon`/`/mars`) are documented per route.

- **Keplerian two-body mechanics only.** No n-body simulation. No perturbations. Simplifications are documented; they do not produce wrong intuitions.

- **No npm dependencies without ADR.** Every npm package added to `package.json` requires an ADR justifying it. The dependency list must remain minimal.

- **No hidden business logic in the data client.** Parsed JSON is returned as fetched, except for **documented** shallow merges (locale overlays per ADR-017 / ADR-054). Filtering, sorting, physics live at call sites. The client is not an ORM.

- **No runtime third-party URLs.** All external assets (fonts, textures, logos, mission imagery, fleet imagery, crew portraits) are resolved at build time. The production bundle fetches nothing from external URLs at runtime. See ADR-016, ADR-046.

- **Mobile-first.** All UI components designed at mobile size first. Base CSS targets viewports below 768px. Desktop is a progressive enhancement. See ADR-018.

- **i18n from the start.** No hardcoded UI strings in component files. All user-facing text goes through Paraglide-js. Content strings live in locale overlay files, never in base data files. See ADR-017, ADR-031, ADR-054.

- **TypeScript strict mode.** `strict: true` in `tsconfig.json`. No `any` types without explicit justification. See ADR-011.

- **Provenance is fail-closed.** Every image referenced from a data file must have a row in `image-provenance.json` with a valid license; every outbound LEARN link must resolve in `link-provenance.json`; every paraphrased text fragment must register in `text-sources.json`. Missing rows fail the build. See ADR-047, ADR-051.

- **No artist's impressions of flown vehicles.** Imagery sources prefer the operating agency's archive first, then Wikimedia Commons under free licence. Planned-only vehicles carry an explicit `artistic-impression: true` waiver flag. See ADR-046, ADR-053.

- **Diagram sources committed.** Every science / fleet SVG diagram is hand-authored and the SVG file *is* the source. No AI generation. `validate-diagrams.ts` is fail-closed: missing SVG breaks the build. See ADR-035, ADR-053.

- **Asset size cap: 8 MiB per file.** Enforced by `validate-data.ts`; CI guard tracks aggregate trend.

- **Bidirectional cross-references symmetric.** Every `fleet_refs[]` forward pointer (on missions, sites, earth-objects) must be matched by a reverse `linked_missions[]` / `linked_sites[]` entry on the corresponding fleet entry. Asymmetry fails the build. See ADR-052.

- **Deterministic e2e readiness.** Every interactive screen exposes `data-*` ready attributes; canvas routes expose `window.__pickAt`. No `sleep(N)`-style synchronisation in Playwright tests. See ADR-056.

---

## §mobile — Mobile wrapper (Capacitor · v0.8)

Locked by **ADR-078** (iOS-first + stream-heavy bundle) + **ADR-079** (assetUrl origin spine). Contributor runbook: **[docs/guides/mobile-build-and-deploy.md](../guides/mobile-build-and-deploy.md)**. Integration spec: **[RFC-018](../rfc/RFC-018.md)** (read the v0.5 correction notes — several original sections drifted from shipped code).

**Shape.** Capacitor 8.4.1 wraps the SvelteKit static `build/` in a WKWebView (iOS 15+) / Chromium WebView (Android, JDK 21). No native UI; the web app is the product. `ios/` + `android/` are committed. CI never builds the binaries (no Xcode/Android SDK in runners) — mobile builds are local.

**Stream-heavy bundle (ADR-078 D2).** The naive build is ~2 GB (10× the iOS 200 MB OTA cap). `npm run build:mobile` = `MOBILE=1 build` → `prune-streamed-assets.mjs` (strips `build/images`, `build/audio`, the 13 non-default locale HTML trees + bundles + raw i18n, dead `.br/.gz`, and the 4K LOD textures gated off under `__MOBILE__`) → `downscale-base-textures.mjs` (io/titan/enceladus/pluto in place) → `check-mobile-size-budget.mjs` (fails the build over **65 MB**). Result: **~47 MB on-device**. Pruned buckets stream from `chipi.github.io/orrery` at runtime, SW-cached on first view. Cost: galleries + audio need one online view (PRD-015 M5 relaxed).

**assetUrl origin spine (ADR-079 D1).** `src/lib/asset-url.ts` is the single seam that resolves streamed-bucket URLs to the CDN origin under the `__MOBILE__` Vite define (`MOBILE=1`) and to `base` in every browser build (byte-identical off-device):
- `assetOrigin` — images/audio origin.
- `assetUrl(path)` / `streamedUrl(url)` — the latter for load points that build `/images//audio/` URLs without going through `assetOrigin` (surface/hotspot textures, panorama skyboxes).
- `localeBundleOrigin(locale)` — en-US stays on-device (offline default), others stream.
Threaded through ~9 chokepoints (`pickHero`, `data.ts` gallery builders + `loadI18nBundle`, `spacecraft-diagrams`, `image-vision` `pickVariant` → hotspots, `SurfaceScene`/`SurfaceFlatPatch`, `hotspot-surface-patch`, `audio-registry`). **Any new `/images//audio/` consumer must route through it** or it 404s on mobile.

**iOS safe-area — native shim (RFC-018 §11.4 corrected).** Capacitor's WKWebView returns `env(safe-area-inset-*)` = **0**. `SafeAreaViewController` (`ios/App/App/AppDelegate.swift`, wired via `Main.storyboard`) reads native `view.safeAreaInsets` and injects them as CSS vars; CSS reads `var(--safe-area-inset-top, env(...))`. `--nav-height` (tokens.css) folds the top inset in so the nav + `calc(var(--nav-height)+N)` canvas controls move together. The same shim forces `scrollView.isScrollEnabled = true` (the config flag wasn't reliably applied).

**WebGL context-loss recovery (S8, #195).** WKWebView drops the WebGL context on background. `src/lib/native/webgl-recovery.ts` (in `+layout`) detects a lost context (`webglcontextlost`/`restored` + `@capacitor/app` `appStateChange`) and **reloads the route** — reliable, no blank scene. Per-scene `reinit()` (RFC-018 §11.2) deferred pending real-device verification.

**Plugins:** `@capacitor/{app,browser,share,haptics,splash-screen}` + `@capacitor-community/safe-area` (Android edge-to-edge). Deep links `orrery://<route>` (`src/lib/native/deep-links.ts` + Info.plist/Manifest). Share → native sheet / `navigator.share` / copy-link, on a public URL (`src/lib/share.ts`). External links → in-app Safari via `@capacitor/browser` (`src/lib/external-link.ts`, routed from the `+layout` click delegation). Android hardware/gesture back (S7, #194) → `src/lib/native/back-gesture.ts` (`@capacitor/app` `backButton` → `window.history.back()` while WebView history remains, else `App.exitApp()`; iOS/web no-op), per RFC-018 §10.3.

**Icons/splash:** `@capacitor/assets` generates from `assets/icon.png` (1024, from `static/favicon.svg`) + `assets/splash.png` (2732, Higgsfield-reimagined orrery + wordmark).

## §sensory — Sensory layer (sound · vibration · tilt · v0.8)

PRD-017 / RFC-020 (#147), **replanned 2026-07-11** ("good simple" reframe — see `docs/wip/sensory-cue-vocabulary.md`). Cross-platform: desktop gets sound; mobile adds vibration + tilt. All modules under `src/lib/sensory/`. Opt-in — master defaults OFF, in-memory only (ADR-057, resets on reload).

**State + shell.** `state.svelte.ts` — `sensory` rune singleton: master `on`, per-channel `*Wanted` flags, `active(ch)` = master ∧ wanted ∧ capable. `capabilities.ts` (pure, unit-tested per RFC-020 §7.3): desktop → Sound only; iOS-web hides Vibration (no API); reduced-motion hides Vibration + Tilt. UI: one nav `sensory-toggle` opens `SensorySheet.svelte` (dropdown desktop / bottom-sheet mobile) with the master + capability-gated Sound/Vibration/Tilt switches; first-time hint toast in `Nav.svelte`.

**Event cues (Phase 2).** `audio-engine.ts` — one lazy `AudioContext` + master gain; ducks under PRD-016 narration via `audio-bus.ts`; suspends on background. `haptics.ts` — Capacitor Haptics / `navigator.vibrate` / no-op. `feedback.ts` — `cue(kind)` fires a tone **+** haptic together (I-B), each gated by `active()`. Vocabulary: **`select`** is wired app-wide at user-click selection seams (explore bodies, surface sites/objects, earth/mars regime, missions/fleet/iss/tiangong, fly event-jump); `confirm`/`threshold`/`warning` are defined but unwired (no natural triggers in the current cinematic app — see the wip doc).

**Gyroscope (Phase 3).** `device-orientation.ts` — one service, G-C home calibration, low-pass + dead-zone, T-B touch-pause (re-homes 200ms after drag), iOS permission on the toggle tap. `+layout` starts/stops it on `active('gyro')`. Injected per-frame into all 7 scenes: 5 spherical-orbit (`explore`, `fly` helio+cislunar, `SurfaceScene` earth/moon/mars) nudge `camT`/`camP`; 2 OrbitControls (`iss`/`tiangong`) via `gyro-orbit.ts` (three@0.128 keeps `rotateLeft` private, so we orbit the camera manually). Recalibrate-gesture (#173) is redundant here — the service auto-re-homes after every drag.

**Hero sonification (Phase 4).** Two continuous voices on the shared bus (duck automatically): `sonify/kepler-chord.ts` (/explore — a soft pentatonic bed tuned by orbital order, consonant-by-design to dodge the phone-speaker-mud risk) and `sonify/fly-velocity.ts` (/fly — one voice whose pitch tracks live heliocentric km/s). The other 9 per-route sonifications from the original PRD are **dropped**. `audioEngine.muted` is the screen-reader mute hook (M10; auto-detection deferred — opt-in + ducking mitigate).

## §immersive — Immersive Mode (WebXR AR · ARKit · Exhibit · sky-pointing · real-now · v0.8)

PRD-019 / RFC-021 (#150). Two "step into it" modes share the epic: **AR** (place the scene on a real surface) and **Exhibit** (unattended kiosk loop). The AR runtime under `src/lib/ar/` is **excluded from coverage** (device-only — verified on hardware, same policy as `scripts/hotspots/`); the provider-selection seam `src/lib/ar.ts` and `src/lib/exhibit.svelte.ts` are ordinary covered code. Depends on the r128 → 0.185.1 Three.js upgrade (RFC-021 §5 / #203).

**Backend abstraction (RFC-021 §3).** `src/lib/ar.ts` — one `ArBackend` interface (lifecycle · `getCameraPose` · `hitTest` · anchors · events), two implementations chosen by a pure `classifyArPlatform(env)`: iPhone-wrapped → ARKit (`ar/arkit-capacitor.ts`, the `@orrery/ar-bridge` Capacitor plugin); Android wrapped-or-web-with-WebXR → WebXR (`ar/webxr.ts`); everything else (desktop, iOS Safari, non-ARCore Android) → unsupported. `getArBackend()` lazily imports the chosen chunk so neither weighs on the flat bundle — same "abstract over provider, implement once per platform" template as PRD-016 TtsProvider / PRD-018 VisionProvider.

**Capability gate (#213).** `isArSessionSupported()` is the REAL gate, not API-presence: `navigator.xr.isSessionSupported('immersive-ar')` (analogous to a WebGL probe; ARKit-wrapped is assumed supported). `EnterArButton.svelte` resolves `arAvailability()` on mount → **enabled** ("View in AR" on /explore, /earth, /moon, /mars, /iss, /tiangong — wired to `launchArScene`), **ios-fallback** (greyed App-Store link on iOS Safari — the URL is a placeholder pending store-ship #217), or **hidden** (desktop/unsupported; the flat scene is the graceful fallback).

**WebXR backend (RFC-021 §3).** `ar/webxr.ts` runs its own `XRSession` rAF loop caching the latest viewer pose + hit-test so the scene builder reads them synchronously each frame. Per-tap precision via transient-input hit-test (`generic-touchscreen` profile) with a viewer-space centre-aim fallback; real `frame.createAnchor()` anchors (queued from the DOM tap, drained on a live frame, synthetic-id fallback where unsupported). The ARKit plugin (`ios/App/App/Plugins/ar-bridge/*.swift`) needs Xcode → never built in CI, verified on-device.

**Scene + sensory wiring (RFC-021 §1, §6-8).** `ar/ar-scene.ts` splits `buildArSceneContent(type)` (pure tabletop Three.js Group — unit-tested) from `createArScene(...)` (session + tap-to-place + render loop). On placement three senses confirm (NE-B): `arHaptic('anchor-placed')`, a real anchor, per-body HRTF **spatial voices** (`ar-audio.ts` reuses the §sensory audio-engine, pans by world position, `updateArListener` follows the device each frame, `initHeadphoneDetection` toggles HRTF↔equalpower), and the Guide **narration** 2 s later (`ar-narrator.ts` → `launch-ar` drives the app's real audio player, which ducks the voices via `audio-bus`); `arHaptic('narrator-end')` on `ended`.

**Exhibit Mode (RFC-021 §9).** `src/lib/exhibit.svelte.ts` — `?mode=exhibit` (or the in-app Kiosk button) flips any flat route into an unattended chrome-less looping kiosk: an `exhibit-mode` body class hides chrome, `AudioOverlay` runs the Curator Full Tour on a loop with per-route auto-nav, a real QR (`qrcode` dep, dynamic-imported, `?qr=<base64>` override) hands off to the live scene, Escape / hidden-corner exits. In-memory only (ADR-057; reload → off).

### AR-astronomy modes (#393 / #402–#408, July 2026)

Beyond the tabletop scene, AR gained **real-sky + real-time** modes powered by two new **pure, unit-tested** engines (these ARE counted toward the coverage gate, unlike the device-only `ar/` runtime):

- **`src/lib/astronomy/`** — real-time Sun/Moon/planet positions. JPL approximate Keplerian elements (1800–2050, `planets.ts`), a compact lunar perturbation model (`moon.ts` — the Moon had no ephemeris before), obliquity/GMST/LST (`time.ts`), and the geocentric-ecliptic → RA/Dec → **altitude/azimuth** pipeline with topocentric parallax (`horizontal.ts`). `skyPosition(body,date,lat,lon)` + `skyDirectionENU`. Validated against Meeus (Venus alt/az <0.5°).
- **`src/lib/satellite/`** — TLE parse (`tle.ts`) + Keplerian **J2-secular** propagation (`propagate.ts`, *not* full SGP4 — good for LEO over hours/days from a fresh element set) → geocentric ECI; full topocentric look-angles (`look-angles.ts`) + `nextPass()` visible-pass predictor. `tle-source.ts` fetches **current** ISS/Tiangong TLEs from Celestrak at runtime (localStorage-cached ≤1 day, bundled *sample* fallback).
- **`src/lib/geolocation.ts`** — observer lat/lon via `navigator.geolocation` in the WKWebView (no extra Capacitor plugin; Info.plist `NSLocationWhenInUseUsageDescription`), timezone fallback, then `[0,0]`. On-device only; never transmitted.

Modes (entered via `EnterArButton`/`EnterSkyButton` on the relevant routes — `EnterSkyButton` on /explore + /earth + /moon + /mars via SurfaceScene; hidden on /iss, /tiangong, desktop):
- **Sky-pointing (#393)** — `ar/sky-scene.ts` is substrate-agnostic: it marks each body at its true ENU alt/az direction and delegates the camera pose + ENU→world mapping to a **`SkyView`** (`ar/sky-view.ts`). Three substrates give **cross-platform parity**: **(a)** ARKit — `worldAlignment = .gravityAndHeading` (true north + gravity, via `startSession({headingAligned})`), ENU maps straight through; **(b)** WebXR (Android/ARCore) — `local` space isn't heading-aligned, so the device **compass** (`DeviceOrientation`) corrects the azimuth each frame (`sky-orientation.ts` `skyYawOffset`); **(c)** the non-XR **magic window** (`createCameraSkyView`) — rear-camera `<video>` backdrop + `DeviceOrientation` driving the camera directly (`deviceQuaternion`), for any mobile with a magnetometer + gyro (no ARCore; also iOS Safari). Reticles for Sun/Moon/planets **+ the ISS/Tiangong** with a "next visible pass" banner (#405). `skyAvailability(xrSupported, magicWindow)` enables `SKY` wherever either substrate exists; `pickSkyView` chooses XR-first, magic-window fallback; hidden on desktop.
- **Real-now Earth (#402) / Explore (#403)** — `ar/real-now.ts`. The AR Earth is lit by the **real current Sun** (live day/night terminator, sub-solar + your-location pins) with the stations **orbiting it at their true positions** (#406); /explore planets snap to their **true current heliocentric positions**.
- **Tabletop stations (#407) + assembly replay (#408)** — `ar/ar-scene.ts` `iss`/`tiangong` reuse the flat routes' procedural `buildIssProxyStation`/`buildTiangongProxyStation`, fit to the tabletop. On placement the station **replays its own assembly** once — `ar/ar-assembly.ts` reuses the routes' `applyAssembly`/`buildPiecewiseMapping`/`captureHomes` primitives + the shared launch-epoch data (`ISS_DOCK_EVENTS`/`ISS_TRUSS_PHASES`/`TIANGONG_DOCK_EVENTS` + the overlay-free `get*ModulesBase`/`get*VisitorsBase` loaders) to fly each module in on its real launch timeline (empty stage → fully built over ~9 s), so the AR replay and the flat scrubbable timeline stay in lockstep.

**Caveats (honest limits).** Bundled TLEs are refreshed daily from Celestrak by the `Refresh station TLEs` workflow (#404 · `scripts/fetch-station-tles.mjs` → `src/lib/satellite/station-tles.json`), so the offline/CORS fallback is ≤~1 day stale; the runtime live fetch still takes precedence. Propagation is J2-secular, not SGP4. Sky-pointing works cross-platform (ARKit heading-aligned, WebXR + compass correction, or the magic window), but the compass sign/offset conventions vary by OS/browser and can't be verified in jsdom — `sky-orientation.ts` exposes `AZIMUTH_CALIBRATION_RAD` as the single knob to nudge if a real device reads the sky rotated/mirrored. The magic window depends on a device magnetometer (uncalibrated compasses drift). **Platform parity:** the Android manifest carries `CAMERA` (#214) + `ACCESS_COARSE_LOCATION` (mirrors iOS `NSCameraUsageDescription` + `NSLocationWhenInUseUsageDescription`); gyro/compass needs no manifest entry on either OS (JS permission APIs — iOS prompts via `DeviceOrientationEvent.requestPermission`).

**Scope note.** RFC-021 §2 (decision S-E) deferred `/iss` + `/tiangong` station AR to v2; it was brought into v1 (#407) because reusing the existing procedural proxy models made it cheap. RFC-021/PRD-019 predate the AR-astronomy modes above — treat this §immersive entry as authoritative for them.

## §stack

Locked technical choices. Each entry points to its ADR.

| Concern | Choice | ADR |
|---|---|---|
| Language | TypeScript, strict mode | ADR-011 |
| Framework | SvelteKit | ADR-012 |
| Bundler | Vite (via SvelteKit) | ADR-012 |
| Routing | History API via SvelteKit router | ADR-013 |
| 3D rendering | Three.js 0.185.1, local bundle | ADR-001 (amended #203) |
| Math rendering | KaTeX, server-rendered at build | ADR-034 |
| Service worker / PWA | @vite-pwa/sveltekit | ADR-029 |
| Mobile wrapper (iOS + Android) | Capacitor 8 · stream-heavy bundle · assetUrl origin spine · native safe-area shim | ADR-078, ADR-079 (see §mobile) |
| Immersive Mode (AR + Exhibit) | `ArBackend` abstraction · WebXR (Android) + ARKit Capacitor (iPhone) · capability-gated · Exhibit kiosk loop · AR-astronomy modes (sky-pointing / real-now / station) on the `$lib/astronomy` + `$lib/satellite` engines + `$lib/geolocation` | PRD-019 / RFC-021 (see §immersive) |
| Documentation site | VitePress + vitepress-sidebar at `/docs/` | ADR-021 |
| CI + staging hosting | GitHub Actions + GitHub Pages (the **staging** tier — prod is `orrerylearn.com`, VPS; see "Deploy tiers" in §pipelines) | ADR-014, ADR-082 |
| Unit / integration tests | Vitest (+ jsdom + canvas polyfill) | ADR-015 |
| End-to-end tests | Playwright (Chromium, single-worker CI) | ADR-015, ADR-056 |
| External assets | Resolved at build time via GH Actions | ADR-016 |
| Build-time compression | vite-plugin-compression2 (.br + .gz siblings); nginx brotli_static + gzip_static | W3 / ADR-063 |
| Imagery sourcing | Agency-first (NASA / Roscosmos / CNSA / JAXA / ESA / ISRO archives) then Wikimedia Commons | ADR-046 |
| Provenance manifests | image-provenance + link-provenance + text-sources + source-logos + license-waivers | ADR-047, ADR-051 |
| Outbound LEARN-link policy | Per-link source + language + last-verified; locale fallback chain | ADR-051 |
| i18n UI strings | Paraglide-js compiled message catalogue | ADR-017 |
| i18n content | Locale overlay files (shallow-merge over base data) | ADR-017, ADR-054 |
| Translation pipeline | LLM-first-pass + argos-translate offline-NMT batch fallback; sr-Cyrl manual | ADR-033, ADR-043, ADR-054 |
| Font + script strategy | Wave 1 (Latin+Cyrillic), Wave 2 (CJK), RTL Arabic | ADR-032, ADR-043, ADR-044, ADR-045 |
| Design approach | Mobile-first, bottom sheet panels | ADR-018 |
| Accessibility | Tier-1 contract: reduced-motion, focus mgmt, role=tablist, canvas aria-labels | ADR-025 |
| Locale persistence | `orrery_locale` cookie (narrow exception #1 to "no client storage") | ADR-057 |
| Curator Tour resume | `orrery_tour` cookie (narrow exception #2 to "no client storage"; `{ep, pos, idx, cmp}` only) | ADR-075 |
| Data validation | ajv JSON schema + symmetric cross-reference checks on every build | ADR-019, ADR-052 |
| Mission data format | Static JSON under `static/data/` (served as `/data/...`) | ADR-006 |
| Lambert solver | Web Worker with id-based cancellation + 9-destination protocol | ADR-008, ADR-022, ADR-026, ADR-028 |
| Porkchop grids | Pre-computed at build time per ADR-016; 9 destinations | ADR-026, ADR-028 |
| Default `/fly` scenario | ORRERY-1 free-return Mars flyby | ADR-009 |
| Transfer arcs | Keplerian half-ellipses (heliocentric); cislunar profile for Moon missions | ADR-010, ADR-058 |
| `/fly` math validation | Pure-function isolation + per-mission validation harness | ADR-030 |
| Science encyclopedia structure | base + locale overlay sections; auto-walked tab tree | RFC-011 closed by ADR-034/035/036 |
| Diagram authoring | Hand-drawn SVG; sources committed; AI generation forbidden | ADR-035 |
| ?-chip cross-screen learn pattern | Hover tooltip desktop, click navigates `/science` | ADR-036 |
| Science Lens + multi-layer state | Attribute-on-`<html>` + MutationObserver subscription | ADR-055 |
| Surface map / sites | Per-body 2D projection: Mars equirectangular, Moon orthographic dual-disc | ADR-038 |
| Surface site cross-link | Bidirectional `fleet_refs` ↔ `linked_sites` | ADR-039, ADR-052 |
| ISS Explorer | Diagrammatic model + asset pipeline + module pickability (`userData.moduleId`) + low-end fallback | ADR-040, ADR-041, ADR-042 |
| Tiangong Explorer | Same pattern as ISS — proxy model, pickability, fallback | ADR-048, ADR-049, ADR-050 |
| Fleet schema | Per-category folders + generated index + bidirectional cross-refs | ADR-052 |
| Fleet imagery | Agency-first; hand-authored ANATOMY SVG; mission patches + crew portraits | ADR-053 |
| Fleet i18n | 137 entries × 14 locales × overlay merge | ADR-054 |
| `/fly` cislunar view | Earth-centered second camera; per-mission `flight.cislunar_profile` | ADR-058 |
| Client error tracking | Sentry SDK (`@sentry/sveltekit`) → **self-hosted GlitchTip** (`telemetry.orrerylearn.com`); errors only, PII-scrubbed; env-ladder dev/staging/prod, fork-silent by construction | ADR-067, ADR-082 |
| Usage analytics | **Self-hosted Umami** (`analytics.orrerylearn.com`), cookieless, PII-free, env-var-gated; same dev/staging/prod ladder | ADR-081, ADR-082 |
| Telemetry environments | 3 isolated rungs — prod (`orrerylearn.com`, GlitchTip 4), staging (`chipi.github.io/orrery`, GlitchTip 6), dev (`vite dev` → tailnet `homelab`, GlitchTip 7); dev events tagged by git worktree | ADR-082 |

---

## §map

State board for all RFCs and ADRs. Authoritative copies live in [`index.md`](index.md) (ADR table) and [`../rfc/index.md`](../rfc/index.md) (RFC table); this section summarises closure status.

### RFCs

| RFC | Title | Status | Closes into |
|---|---|---|---|
| RFC-001 | Router design | Closed (superseded by ADR-013) | ADR-013 |
| RFC-002 | Mission JSON schema | Closed | ADR-020 |
| RFC-003 | Lambert worker protocol | Closed | ADR-022 |
| RFC-004 | Mission URL sharing | Closed | ADR-024 |
| RFC-005 | Accessibility tier-1 | Closed | ADR-025 |
| RFC-006 | Porkchop mobile interaction | Closed | ADR-023 |
| RFC-007 | Multi-destination porkchop | Closed | ADR-026 |
| RFC-008 | Outer planets + dwarf planets | Closed | ADR-028 |
| RFC-009 | Mission flight params + timeline | Closed | ADR-027 |
| RFC-010 | Translation + i18n strategy | Closed | ADR-031, ADR-032, ADR-033 |
| RFC-011 | `/science` render pipeline | Closed | ADR-034, ADR-035, ADR-036 |
| RFC-012 | Mars Surface Map | Closed | ADR-037, ADR-038, ADR-039 |
| RFC-013 | ISS Explorer | Closed | ADR-040, ADR-041, ADR-042 |
| RFC-014 | Tiangong Explorer | Closed | ADR-048, ADR-049, ADR-050 |
| RFC-015 | LEARN-link rollout | Closed | ADR-051 |
| RFC-016 | Spaceflight Fleet | Closed | ADR-052, ADR-053, ADR-054 |
| RFC-017 | Surface Hotspots (LOD + ground views + hardware models) | Open | ADR-059 / 060 / 061 / 062 (planned v0.7) |

### ADRs

Listed here in numeric order; full title and date in [`index.md`](index.md).

| Range | Status | Notes |
|---|---|---|
| ADR-001 to ADR-005 | Mix accepted / superseded | Foundational; ADR-002/003/004/005 superseded by ADR-011/012/013/014 |
| ADR-006 to ADR-027 | Accepted | Core stack + slice-1 through slice-6 closures |
| ADR-028 | Accepted (closes RFC-008) | Outer planets + dwarf planets |
| ADR-029 | Accepted | Service worker via @vite-pwa/sveltekit |
| ADR-030 | Accepted | /fly trajectory math validation |
| ADR-031 to ADR-033 | Accepted (close RFC-010) | i18n language list, fonts, translation workflow |
| ADR-034 to ADR-036 | Accepted (close RFC-011) | KaTeX, SVG diagrams, ?-chip pattern |
| ADR-037 to ADR-039 | Accepted (close RFC-012) | Surface site type, per-body projection, cross-link contract |
| ADR-040 to ADR-042 | Accepted (close RFC-013) | ISS Explorer model, pickability, fallback |
| ADR-043 to ADR-045 | Accepted | sr-Cyrl font gate, CJK Wave-2 fonts, RTL Arabic |
| ADR-046 to ADR-047 | Accepted | Agency-first imagery + provenance manifests |
| ADR-048 to ADR-050 | Accepted (close RFC-014) | Tiangong Explorer mirror of ISS |
| ADR-051 | Accepted (closes RFC-015) | Outbound learn-link stewardship |
| ADR-052 to ADR-054 | Accepted (close RFC-016) | Fleet schema, imagery, i18n — authored retrospectively May 2026 |
| ADR-055 | Accepted | Science Lens + multi-layer attribute state |
| ADR-056 | Accepted | Deterministic e2e readiness signals |
| ADR-057 | Accepted (closes #73 Gap 2) | Locale-override cookie carve-out |
| ADR-075 | Accepted (PRD-016 §S9, v0.7) | Curator Tour resume cookie — narrow exception #2 |
| ADR-058 | Accepted | Cislunar Earth-centered second camera |
| ADR-059, ADR-060 | _Reserved_ | Planned closure targets for RFC-017 (Surface Hotspots, v0.7) |
| ADR-061 | Accepted | Surface hotspots are regions, not points (`region_bounds` on `SurfaceSite`) — Slice 1 of #283 |
| ADR-062 | Accepted | Sphere → flat ground patch transition at deep zoom — Slice 4 of #283 |
| ADR-072 | Accepted | Surface routes (`/moon`, `/mars`) share `SurfaceScene.svelte`; 8 body-justified knobs, 22 drifts consolidated — Slice 2 of #283 (closes the deferral in ADR-037) |
| ADR-077 | Accepted (v0.7.x; v0.8+ extension point for #341) | /fly throne-of-glory iconic-shot architecture — body wiring + cislunar hold detector + per-event compositions |
| ADR-078 | Accepted (amends PRD-015 / RFC-018) | v0.8 mobile wrapper reshaped — **iOS-first** + **stream-heavy bundle** (galleries + audio stream from `chipi.github.io`, §8.1 SW); reverses the 2026-05-16 Android-first + §8.2 locks after `main` grew to a ~2 GB naive build |
| ADR-079 | Accepted (closes #373 root cause; delivers #191) | Asset-origin `assetUrl()` spine (local/CDN configurable) + source/derived separation (i18n source + image masters out of `static/`) + WebP-only delivery, encoded locally + committed. Slices #377/#378/#379 |
| ADR-080 | Accepted (design RFC-030; executes ADR-079 Slice C; #383) | **WebP-only** responsive image **size ladder + `srcset`** for mobile/web/**Google TV** — base `NN.webp` (≤3072 px q80) + smaller `NN-<w>.webp` rungs; full-res **masters kept permanently in git-LFS** (regenerate any derivative losslessly); 3D textures pick by quality-tier; `hotspots/` (zoom) + `posters/` (downloadable art) stay JPEG. Shipped ~1.9 GB→897 MB. Auto-derive `validate-data` invariant is Slice 4 (pending) |
| ADR-067, ADR-068, ADR-081, ADR-082 | Accepted | **Observability / telemetry.** Sentry SDK → self-hosted **GlitchTip** errors (ADR-067), docker log shipping (ADR-068), self-hosted **Umami** analytics (ADR-081), and the **dev → staging → prod env ladder** — isolated GlitchTip project + Umami site per rung, dev via the tailnet `homelab` host, fork-silent by construction (ADR-082) |

---

## Changelog

| Version | Date | Change |
|---|---|---|
| v1.0 | April 2026 | Initial — components, contracts, constraints, stack extracted from `04_Technical_Architecture.md` + six prototypes |
| v1.1 | April 2026 | Stack updated: TS (ADR-011), SvelteKit (ADR-012), History API (ADR-013), GH Actions (ADR-014), Vitest+Playwright (ADR-015), build-time assets (ADR-016), Paraglide (ADR-017), mobile-first (ADR-018), ajv (ADR-019). ADR-002/003/004/005 marked superseded |
| v1.2 | April 2026 | §components rewritten for post-pivot stack |
| v1.3 | April 2026 | RFC-002 closed by ADR-020 |
| v1.4 | April 2026 | ADR-021 added (VitePress docs site) |
| v1.5 | April 2026 | RFC-003 closed by ADR-022; RFC-006 by ADR-023 |
| v1.6 | April 2026 | RFC-004 closed by ADR-024 |
| v1.7 | April 2026 | RFC-005 closed by ADR-025 |
| v1.8 | April 2026 | RFC-007 closed by ADR-026 |
| v1.9 | May 2026 | §map extended through RFC-013 and ADR-033 |
| **v2.0** | **May 2026** | **v0.6.0 catch-up.** Added §components for 5 new routes (`/mars`, `/iss`, `/tiangong`, `/science`, `/fleet`) + 4 new subsystems (Provenance pipeline, Science Encyclopedia, Science Lens + multi-layer state, Cislunar geometry, 3D model builders). Added §contracts for fleet, surface-site, science section, provenance manifests, `flight.cislunar_profile`, e2e readiness. Added §constraints for provenance fail-closed, no artist's impressions, diagram sources, asset cap, symmetric cross-refs, deterministic e2e. Added §stack rows for KaTeX (ADR-034), @vite-pwa/sveltekit (ADR-029), VitePress, argos-translate batch (ADR-033/054), Science Lens (ADR-055), fleet (ADR-052/053/054), cislunar (ADR-058), ISS/Tiangong/Mars/Moon explorers, and 22 other ADRs locked between ADR-034 and ADR-058. §map summarised through RFC-017 and ADR-058 with reserved slots ADR-059–062 for v0.7 surface hotspots. Three fleet ADRs (052/053/054) authored retrospectively in the same commit. |
| **v2.1** | **May 2026** | **v0.7.0 catch-up.** Named `disposeScene` helper in §rendering teardown (centralised in `src/lib/three/dispose-object3d.ts` after audit found 5 routes inlining partial traversals that missed `Line` / `Points` + texture slots). Added §rendering "Long-list rendering perf" subsection for CSS `content-visibility` on `/fleet` / `/library` / `/credits` (W4). Added §pipelines Pipeline 11 for build-time compression — `vite-plugin-compression2` emits `.br` + `.gz` siblings, nginx serves them via `brotli_static` + `gzip_static` (W3). Added §components Test infrastructure note for sharded docker-stack e2e workflow (W7). Added §stack row for build-time compression. Header updated to v0.7.0 reality. (Audio narration system — PRD-016 / RFC-019 — and surface hotspots ship — RFC-017 — referenced in header but not yet fully cross-sectioned; pending §components / §pipelines deepening in follow-up.) |
| **v2.2** | **June 2026** | **Foundational refactors (#332).** §components i18n machinery rewritten for Paraglide 2.x URL-segment routing (`/de/iss` replaces `?lang=de`) + `experimentalMiddlewareLocaleSplitting` — every per-locale route prerenders locale-correct HTML on first byte; client JS ships ~0 KB of message strings instead of all 14 locales' 1.5 MB. §components Data layer extended with `RemoteData<E,T>` (`src/lib/types/remote-data.ts`, #330 C.2) and `useUrlParam<T>` (`src/lib/routes/use-url-param.svelte.ts`, #331) rune. §rendering Animation loop now points at `createAnimateLoop` (`src/lib/three/animate-loop.ts`, #329) which finally enforces the `document.hidden` pause contract across all 7 3D routes — the contract that v2.0 referenced was unimplemented until #329. Companion `createRouteLifecycle` (route-lifecycle.ts) holds the listener + disposable LIFO drain. README at `src/lib/three/README.md` is the discoverability matrix for future contributors. /fly effect-ladder consolidation (#330 C.3) deferred — needs deeper cinematic-timing analysis than fit in #332's scope. |
| **v2.5** | **July 2026** | **v0.8 mobile-plan reshape (ADR-078).** Registered ADR-077 (/fly iconic-shot, was missing) + ADR-078 in the §map ADR table. ADR-078 reshapes the v0.8 Capacitor wrapper: **iOS-first** (reverses the 2026-05-16 Android-first lock) + **stream-heavy bundle** (galleries + `static/audio/` stream from `chipi.github.io` via RFC-018 §8.1 network-aware SW, superseding the §8.2 disable-SW plan) after a re-assessment measured the naive build at ~2 GB (`static/images/` 1.6 GB + audio 97 MB) vs the 355 MB modelled in May. PRD-015 + RFC-018 amended to v0.4. No code changes yet — plan + docs only. (Pre-existing changelog gap v2.3–v2.4 vs header not backfilled — out of scope.) |
| **v2.6** | **July 2026** | **v0.8 mobile subsystem + drift correction (deep review).** Added **§mobile** — the Capacitor wrapper architecture (stream-heavy bundle, `assetUrl` origin spine, iOS safe-area native shim, WebGL context-loss recovery, plugins, deep-links/share) — locked by ADR-078/079. Added a Mobile-wrapper §stack row. Noted the i18n source relocation (`i18n-src/<locale>/` → `i18n-src/`, ADR-079 D2) in Pipeline 10. Companion contributor guide `docs/guides/mobile-build-and-deploy.md`. Fixes the doc-authority gap where mobile existed in code + RFC-018/ADR-078/079 but not in TA.md. |
| **v2.7** | **July 2026** | **a11y + keyboard/TV subsystem (RFC-031, deep review).** Added §components "Accessibility & keyboard/TV navigation" — the roving focus engine (`roving-focus.svelte.ts` + `use:roving`), the canvas object indexes (`/explore` body index, surface site index, `/iss` `/tiangong` module lists) that execute ADR-025's deferred Tier 2, the Cmd/Ctrl-K command palette, and the TV 10-foot layer. Closes the doc-authority gap where RFC-031 shipped S1–S3/S5–S8 in code but was invisible in TA.md; S4 (camera keyboard control) is explicitly deferred. |
| **v2.8** | **July 2026** | **Immersive Mode subsystem (PRD-019 / RFC-021 · #150, deep review).** Added **§immersive** — the `ArBackend` provider abstraction (`src/lib/ar.ts`, pure `classifyArPlatform` → WebXR / ARKit Capacitor), the `isArSessionSupported` capability gate + `EnterArButton`, the WebXR backend (transient-input hit-test + real `frame.createAnchor` anchors), the tap-to-place scene builders with three-sense (haptic + spatial-audio + narration) placement wiring, and Exhibit Mode kiosk. Added an Immersive-Mode §stack row. Closes the doc-authority gap where the whole AR + Exhibit epic shipped in code but was invisible in TA.md. AR runtime is coverage-excluded (device-only); `ar.ts` + `exhibit.svelte.ts` are covered. |
| **v2.9** | **July 2026** | **AR-astronomy + cross-platform parity (#393/#402–#408).** Expanded §immersive for the modes shipped past the original 4-globe scope: **sky-pointing** (`ar/sky-scene.ts` + `ar/sky-view.ts` + pure `ar/sky-orientation.ts` compass math) with three substrates — ARKit heading-aligned, WebXR + compass correction, and the non-XR **magic window** (camera feed + DeviceOrientation) for any mobile incl. iOS Safari; **real-now Earth/Explore** (`ar/real-now.ts`, #402/#403) + **stations in the sky / orbiting Earth** (#405/#406) on new `$lib/astronomy` + `$lib/satellite` engines; **tabletop stations** (#407) + **assembly-on-placement replay** (`ar/ar-assembly.ts`, #408); **daily Celestrak TLE refresh** (#404). Cross-platform gate: `skyAvailability(xrSupported, magicWindow)` + `isMobileSkyCapable`; Android manifest gained `ACCESS_COARSE_LOCATION` (iOS-plist parity). PRD-019 + RFC-021 carry v1.1 amendments where shipped scope overtook them (stations no longer v2-deferred; iPhone Safari gets sky-pointing). |
| **v3.0** | **July 2026** | **/explore v2 S5–S8 subsystems (deep review).** Updated §rendering "/explore v2" header from "Slice 0" to "Slices 0–8" to reflect shipped scope. S5: Milky Way schematic scene (`milky-way-scene.ts` + `milky-way-visual.ts`, `MILKY_WAY_CONTEXT`, `MilkyWayPanel`). S6: black-hole geodesic lensing scene (`black-hole-scene.ts` + `black-hole-visual.ts`, four objects: M87*, Sag A*, Cygnus X-1, Gargantua). S7: property-space / causality overlays (`property-space.ts` — HR diagram + exoplanet mass-vs-period axes, `causality.ts` — light-cone spheres, `LensLayer` integration). S8: Local Group schematic scene (`local-group-scene.ts`, `LOCAL_GROUP_CONTEXT`, `LocalGroupPanel`, 33 real members). All four WebGL builders coverage-excluded per the `explore-scene.ts` policy; their pure math has dedicated `*.test.ts` files. |
| **v3.1** | **July 2026** | **/fly launch/ascent + descent epic (PRD-032 / RFC-034 / #412).** `/fly` becomes one continuous pad→arrival scrubber. **Scene 0 (launch/ascent):** integrated ascent EOM (`ascent-physics.ts`), per-vehicle launch profiles (`launch-profile-registry.ts`), procedural launchers (`launcher-models.ts`), `LaunchScene` + `LaunchTelemetry` HUD, cinematic shot schedule (`ascent-cameras.ts`). **EDL descent:** `descent-physics.ts` (moon/mars/venus/earth bodies), `descent-profile-registry.ts` archetypes incl. `EARTH_CAPSULE_REENTRY`, `DescentScene` + terminal-EDL time-warp (`descent-timewarp.ts`). **Cinematic primitives:** `BoldArrow` force vectors (`bold-arrow.ts`), glowing trajectory/orbit tubes (`glow-line.ts`), separation bursts (`separation-burst.ts`), per-event slow-mo beat + master unified clock (`ascent-clock.ts`). Force-vector Science Lens across ascent/coast/descent/cruise; 2 new /science articles (deorbit-corridor, comms-blackout). Master routes-table `/fly` row updated. |
| **v3.2** | **July 2026** | **Telemetry environment ladder (ADR-082).** Registered the observability cluster (ADR-067/068/081/082) in §map — previously absent from TA.md entirely — and added three §stack rows (client error tracking, usage analytics, telemetry environments). The prod estate is self-hosted (Sentry SDK → **GlitchTip**, **Umami**); telemetry now runs on a **dev → staging → prod** ladder with an isolated GlitchTip project + Umami site per rung (prod=4, staging=6, dev=7), the gh-pages deploy relabelled **staging** (`preview.yml`→`staging.yml`), and `vite dev` reporting to a tailnet-only dev rung tagged by git worktree — fork-silent by construction. Companion: `docs/guides/observability.md` rewritten; README §Privacy + `analytics.ts`/`sentry.ts` aligned. |
