# TA — Technical Authority
*Orrery · Reference document · v2.0 · May 2026*

This is the reference document for the technical plane. RFCs anchor to it by section. ADRs update `§stack` and `§map` when decisions are locked. Authoritative listings: [`index.md`](index.md) (ADRs), [`../rfc/index.md`](../rfc/index.md) (RFCs), [`../prd/index.md`](../prd/index.md) (PRDs).

v2.0 catches up from v1.9 (May 2026, ADR-033) through **v0.6.0 reality** — 5 new routes, 25 new ADRs, the Fleet / Science / ISS / Tiangong / Mars / Cislunar subsystems, the Provenance pipeline, the Science Lens, and the multi-layer overlay state machine.

---

## §components

The subsystems of the production application, grouped by concern.

### Application shell

**Router** — SvelteKit's built-in router using the History API. File-based routing in `src/routes/`. Clean URLs: `/explore`, `/fly?mission=curiosity`, `/missions?dest=MARS`. GitHub Pages deploy uses a `404.html` SPA-redirect workaround per ADR-014. See ADR-012, ADR-013.

**Nav bar** (`src/lib/components/Nav.svelte`) — shared across every route. Hamburger collapse on mobile (≤500 px) per the v0.6 mobile pass; locale switcher (ADR-057), share button, and route chips on desktop.

**Footer** (`src/routes/+layout.svelte`) — version chip linking to GitHub README, `/credits` link, `/library` link (ADR-051). Stays clear of bottom-of-page CTAs on mobile.

**Right panel** (`src/lib/components/Panel.svelte`) — shared detail panel used by /explore, /missions, /moon, /mars, /earth, /iss, /tiangong, /fleet. Bottom sheet on mobile (per ADR-018), right drawer on desktop. Renders header, tab strip (OVERVIEW / TECHNICAL / GALLERY / LEARN / ANATOMY / FLIGHTS / SCIENCE — per-panel subset), scrollable content, optional action footer.

**Service worker** — `@vite-pwa/sveltekit`-generated. Caches the shell + critical data on first paint; the app survives subsequent reloads offline. Install prompt and `data-high-contrast` attribute on `<html>` for accessibility. See ADR-029.

### Routes

The production app ships **12 primary routes** at v0.6.0. Each is a SvelteKit page module under `src/routes/<route>/+page.svelte`. Pages do not share mutable state directly — they communicate via the data client + URL search params (`$page.url.searchParams`).

| Route | Purpose | Anchored by |
|---|---|---|
| `/` | 30-second orientation; 11-card route grid | PRD-013 |
| `/explore` | Solar System Explorer · 3D orrery + per-body Science Lens layers | PRD-001 / ADR-012 |
| `/plan` | Mission Configurator · porkchop plot (9 destinations) | PRD-002 / RFC-006 / ADR-023 / ADR-026 / ADR-028 |
| `/fly` | Mission Arc · heliocentric transfer (+ cislunar Earth-centered view) | PRD-003 / ADR-030 / ADR-058 |
| `/missions` | Mission Catalog · 37 flown / active / planned / concept missions | PRD-004 / ADR-020 / ADR-027 |
| `/earth` | Earth Orbit Viewer · ISS, Tiangong, Hubble, JWST, GNSS constellations | PRD-005 / ADR-046 |
| `/moon` | Moon Map · 16 surface sites + lunar orbiters with per-mission 3D models | PRD-006 / ADR-037 / ADR-038 |
| `/mars` | Mars Surface Map · equirectangular + 3D globe; 16 surface sites + 11 orbiters; rover traverses | PRD-007 / ADR-037 / ADR-038 / RFC-012 |
| `/iss` | ISS Explorer · 18 modules raycast-pickable; visiting spacecraft diagrams | PRD-010 / RFC-013 / ADR-040 / ADR-041 / ADR-042 |
| `/tiangong` | Tiangong Explorer · Tianhe + Wentian + Mengtian module overlays | PRD-011 / RFC-014 / ADR-048 / ADR-049 / ADR-050 |
| `/science` | Science Encyclopedia · 85 sections × 10 tabs · KaTeX · 71 SVG diagrams · ?-chip deep-links · Cmd-K search | PRD-008 / RFC-011 / ADR-034 / ADR-035 / ADR-036 |
| `/fleet` | Spaceflight Fleet · 137 entries × 9 categories with bidirectional cross-refs | PRD-012 / RFC-016 / ADR-052 / ADR-053 / ADR-054 |

**Disclosure + gallery pages:** `/credits` (image + text-source provenance per ADR-047), `/library` (outbound LEARN-link bill of links per ADR-051), `/posters` (11 hand-authored SVG art-print posters across three style families — JPL travel-poster, era-matched mood-lit, indie-pop halftone — every poster 600×900 portrait SVG; right-click save gives a scalable wallpaper file).

### Data layer

**Data client** (`src/lib/data.ts`) — fetch-and-cache layer for every JSON under `static/data/` (runtime URLs `/data/...` with SvelteKit `base` prefix). Returns parsed JSON with locale-overlay shallow merge for missions, planets, science sections, fleet entries, surface sites, and other localised records per ADR-017 / ADR-054. Cache is a `Map` keyed by URL, session-only. Cross-locale fallback: a missing non-English overlay falls back to **en-US** (not the base file) per ADR-054. See ADR-006, ADR-017, ADR-054.

**Schema validation** (`scripts/validate-data.ts` + `static/data/schemas/`) — 33 JSON Schema files (mission, fleet, planet, surface-site, science-section, provenance manifests, etc.) validated by `ajv` at every build. Fail-closed: schema mismatch breaks `npm run build`. See ADR-019, ADR-020.

### Physics & math

**Orbital library** (`src/lib/orbital.ts`) — Keplerian two-body mechanics. `keplerPos(a, e, L0, T, t)` returns position at time `t` (days from J2000). `visViva(a, r)` returns orbital velocity in km/s. All constants from IAU; see §contracts.

**Scale library** (`src/lib/scale.ts`) — rendering scale helpers. `auToPx(a_au)` — compressed log-linear scale for the solar-system 2D explorer. `altToOrbitRadius(alt_km)` — maps satellite altitude (km) to radial distance in the `/earth` 3D scene.

**Lambert library** (`src/lib/lambert.ts`) — Lagrange-Gauss short-way Lambert solver. Called only from the Lambert worker, never from the main thread. See ADR-008, RFC-003.

**Lambert worker** (`src/workers/lambert.worker.ts`) — runs the solver off the main thread. id-based cancellation, every-10-row progress, single result message; `destinationId` ∈ `{mercury, venus, mars, jupiter, saturn, uranus, neptune, pluto, ceres}`. See RFC-003, ADR-022, ADR-026, ADR-028. Worker is dormant for the 9 default destinations whose grids are pre-computed at build time.

**Fly-physics** (`src/lib/fly-physics.ts`) — transfer-ellipse math (`transferEllipse`), Tsiolkovsky rocket equation, per-mission validation harness. See ADR-030.

**Cislunar geometry** (`src/lib/cislunar-geometry.ts`) — Earth-Centered Inertial trajectory builder for Moon missions. `buildCislunarTrajectory` consumes the optional `flight.cislunar_profile` block on Moon missions (parking orbit → TLI → translunar arc → lunar arrival → TEI). Drives the second `/fly` camera. See ADR-058.

### 3D model builders

Mission-specific Three.js builders, each composing primitives into a recognisable silhouette. All bundled at build time, no glTF loader at runtime.

- `src/lib/earth-satellite-models.ts` — ISS, Tiangong, Hubble, JWST, Chandra, XMM, Gaia, LRO, GEO comsat, GNSS constellations (GPS / Galileo / GLONASS / BeiDou), + 7 lunar orbiters as generic-orbiter silhouettes.
- `src/lib/moon-lander-models.ts` — Apollo LM (descent + ascent) for Apollo 11/12/14, J-mission LM + LRV for Apollo 15/16/17, Luna 9 petal-capsule, Luna sample-return stub, Lunokhod 1/2 bathtub-on-wheels, Chang'e 3/4 lander + Yutu rover, Chang'e 5/6 return stub, Chandrayaan-3 Vikram + Pragyan, SLIM "Moon Sniper" tipped pose, Artemis III HLS placeholder.
- `src/lib/iss-proxy-model.ts` — ISS module geometry + `userData.moduleId` pickability per ADR-041. 18 USOS + ROS modules.
- `src/lib/tiangong-proxy-model.ts` — Tianhe + Wentian + Mengtian module geometry + pickability per ADR-049.
- Mars rover marker geometry — rendered inline in `src/routes/mars/+page.svelte` (per-rover small-3D silhouettes; v0.6 parity with /earth + /moon markers).

### Provenance pipeline

The fail-closed asset + outbound-link discipline that distinguishes Orrery from a typical front-end.

**Imagery sourcing** (`scripts/fetch-assets.ts`) — agency-first per ADR-046. NASA Image and Video Library + Wikimedia Commons curated lists + Roscosmos / CNSA / SpaceX / partner archives. No artist's impressions for flown vehicles (per-mission `artistic-impression` waiver flag for planned-only entries).

**Image provenance manifest** (`scripts/build-image-provenance.ts`, `static/data/image-provenance.json`) — one row per image: source agency, license, attribution string, file hash. Wikimedia `imageinfo` API resolves Commons URLs at build. Asset size cap **8 MiB / file**. See ADR-047.

**Text-source attribution** (`static/data/text-sources.json`) — every paraphrased editorial fragment registered with source, license, and last-verified date.

**Outbound LEARN-link manifest** (`scripts/build-link-provenance.ts`, `static/data/link-provenance.json`) — one entry per `(entity_id, url)` pair. Per-link source agency, language (BCP-47), tier (`intro`/`core`/`deep`), last-verified date. Locale fallback chain: UI-locale link first, then operator-native-language link, then English, then multi-lingual landing. See ADR-051.

**Link checker** (`scripts/check-learn-links.ts`) — live HEAD+GET probe, redirect chain capture, slow-response detection, robots.txt honoured. Writes `docs/provenance/last-link-check.md`. Build does not call this script (no live network in CI) but the report is the gate for `validate-data.ts`.

**License waivers** (`static/data/license-waivers.json`) — per-image carve-outs for restricted-license partners (e.g., airandspacehistory.com per ADR-053 OQ-18).

**Source logos** (`static/data/source-logos.json`) — 28 publisher logos with their license summary; rendered on `/credits` + `/library`.

`npm run fetch` chains `fetch-assets && build-image-provenance && build-link-provenance && check-learn-links && validate-data` so a refetch re-derives every manifest atomically. `npm run build` keeps only `validate-data` as the pre-hook.

### Science encyclopedia

**Article rendering** (`src/routes/science/[tab]/[section]/+page.svelte`) — base file in `static/data/science/<tab>/<section>.json`, locale overlay in `static/data/i18n/<locale>/science/<tab>/<section>.json` (same ADR-017 pattern), rendered via `body_paragraphs[]` schema. Per-section diagram embedded from `static/diagrams/science/<section>.svg`.

**Math rendering** (`src/lib/katex.ts`) — KaTeX server-rendered at build time. Every `formula_latex` field on a science section becomes HTML inline; zero KaTeX runtime cost. See ADR-034.

**Diagram authoring** — every science diagram is a hand-authored SVG committed at `static/diagrams/science/<id>.svg`, validated by `scripts/validate-diagrams.ts`. No AI generation, palette matches the canonical Orrery style. See ADR-035.

**Search index** (`scripts/build-science-index.ts`, `static/data/science-index.json`) — walks the science overlay tree, builds the section tree + Cmd-K search index + ?-chip vocabulary. Generated at build time.

**Cross-route ?-chip pattern** (`src/lib/components/ScienceChip.svelte`) — `?name=concept` chips on /missions, /iss, /tiangong, /fleet, /explore, /fly, /plan deep-link to `/science/<tab>/<section>`. Hover tooltip on desktop, click-to-navigate on mobile. See ADR-036.

### Science Lens + multi-layer state

**Master lens** (`src/lib/science-lens.ts`) — single `data-science-lens` attribute on `document.documentElement`, value `"on"` or `"off"`. Helpers: `isScienceLensOn`, `toggleScienceLens`, `onScienceLensChange`. SSR-safe. Session-bounded by default. See ADR-055.

**Multi-layer toggles** (`src/lib/science-layers.ts`) — 12 layers, each its own `data-science-layer-<key>` attribute on `<html>`. Keys: `gravity · velocity · soi · hover · centripetal · apsides · coast · conics · microgravity · atmosphere · tidal-lock · ozone`. `isLayerOn(key)` gates on master lens AND layer attribute. CSS reacts via `:global([data-science-layer-foo='on'])` selectors with zero imports.

**UI surfaces** — `ScienceLensBanner.svelte` (master toggle), `ScienceLayersPanel.svelte` (per-layer checkboxes; shown only when lens is on). Per-route filter: /fly shows all 8 mission-relevant layers; /explore + /earth + /iss + /tiangong + /moon + /mars hide /fly-only layers (coast, conics).

### i18n machinery

**Paraglide-js** (`src/lib/paraglide/`) — compiled message catalogue for 14 locales: `en, en-US, es, fr, de, pt-BR, it, nl, zh-CN, ja, ko, hi, ar, ru, sr-Cyrl`. Compiled by `paraglide-js compile` at the start of `npm run dev` / `build`. See ADR-017, ADR-031.

**Locale detection** (`src/lib/locale.ts`) — BCP-47 normalisation, accept-language reading, cookie-based explicit override (the **single** functional cookie permitted per ADR-057). Cookie name: `orrery_locale`. Auto-detect is the default; the user can pin explicitly via the nav switcher.

**Content overlays** — per-locale JSON under `static/data/i18n/<locale>/<surface>/...`. Surfaces: missions, planets, sun, fleet, science, iss-modules, tiangong-modules, moon-sites, mars-sites, earth-objects, rocks, suit overlays. Shallow-merge per ADR-017.

**Translation pipeline** — LLM-first-pass plus `argos-translate` offline-NMT batch fallback per ADR-033. `scripts/wave23/{catalog,maps,apply-translations}.ts` is the toolchain. sr-Cyrl is manually authored per ADR-043 (no Cyrillic Serbian model in argos).

**Font + script strategy** — Wave 1 (Latin + Cyrillic) uses bundled Inter + Crimson Pro per ADR-032. Wave 2 CJK uses Noto Sans CJK + Noto Serif CJK per ADR-044. Arabic uses Noto Sans Arabic + RTL `dir="rtl"` per ADR-045. Serbian Cyrillic gates the font load per ADR-043.

### Test infrastructure

**Unit + integration: Vitest + jsdom** — 35 test files, 814 tests at v0.6.0. Three.js geometry tests use the `// @vitest-environment jsdom` pragma. Sprite-texture paths use `canvas` polyfill. See ADR-015.

**End-to-end: Playwright + Chromium** — 28+ test files covering every route + per-locale smoke for Wave 1. CI runs on push to main only (not on every PR); 40-minute timeout, single-worker per `playwright.config.ts`. See ADR-015, ADR-056.

**Deterministic readiness signals** — every canvas route exposes a `window.__pickAt(x, y)` test hook + `data-*` ready attributes so Playwright can synchronise without polling. See ADR-056.

**Preflight chain** (`npm run preflight`) — `typecheck && lint && test && validate-data && build`. Husky pre-push hook enforces. Mirrors CI exactly.

### Documentation site

**VitePress + vitepress-sidebar** — `/docs/` hosted on the same GitHub Pages deploy as the app. Sidebar auto-generated from the docs tree. Renders ADRs, RFCs, PRDs, prototypes, research notes. See ADR-021.

---

## §rendering

How 3D works on every canvas route. The application has **seven distinct 3D scenes** (`/explore`, `/fly` heliocentric, `/fly` cislunar, `/earth`, `/moon`, `/mars`, `/iss`, `/tiangong`) and **two 2D map scenes** (`/mars` equirectangular, `/moon` orthographic dual-disc). Each follows the same architectural pattern but with a different scale, coordinate frame, and asset budget.

### Shared rendering primitives

- **Renderer:** `THREE.WebGLRenderer` with `antialias: true`, `alpha: false`, `powerPreference: 'high-performance'`. One renderer per route mount; disposed on `onDestroy`.
- **Composer pipeline (selection halo only):** `EffectComposer` + `RenderPass` + `OutlinePass` for the v0.6 selection-halo outline on `/earth`, `/moon`, `/mars`. Other routes draw without postprocessing to keep mobile GPUs cool.
- **Materials:** PBR (`MeshStandardMaterial`) for hand-modelled spacecraft per ADR-040 / v0.1.7. Older inline geometry on `/moon` and `/mars` markers uses `MeshPhongMaterial` where the v0.6 marker rewrite hasn't reached yet. Planet surfaces use `MeshStandardMaterial` with a base-colour texture, no normal map (mobile budget).
- **Lighting:** one `DirectionalLight` as the Sun (per-route position) + low `AmbientLight` for shadow fill. No real-time shadows; the silhouette read is what matters.
- **Animation loop:** `requestAnimationFrame` driven by the route's `onMount` handler. Pauses on `prefers-reduced-motion: reduce` per ADR-025; pauses when tab is hidden (`document.hidden`); stops cleanly on `onDestroy`.
- **Pick handling:** `THREE.Raycaster` against tagged scene objects whose `userData` carries the entity id (`{ siteId }`, `{ moduleId }`, `{ missionId }`, etc.). The same `userData` is exposed to Playwright via `window.__pickAt(x, y)` per ADR-056.
- **Disposal:** every route's teardown walks the scene graph and calls `geometry.dispose()` + `material.dispose()` (texture too where appropriate) for each `Mesh`. Without this, locale switching leaks ~6 MB per swap.

### Scene 1 — `/explore` (heliocentric solar-system)

- **Coordinate frame:** heliocentric, AU units (constraint per §constraints). Sun at origin. Planet positions from `static/data/planets.json` (`a`, `e`, `T`, `L0`, `incl`, `axialTilt`, `rotPeriod`).
- **Scale:** Sun radius **0.06 AU** (visually exaggerated for legibility; absurd at true scale). Planet radii scaled per `planetVisualRadius` in `src/lib/scale.ts`.
- **Geometry:** each planet is a `SphereGeometry(radius, 32, 32)` + an albedo texture under `static/images/textures/<planet>.jpg`. Saturn carries an extra `RingGeometry` with `RingTexture` (transparent edge). Asteroid belt is a `Points` cloud at semi-major-axis 2.5 AU.
- **Orbital paths:** each planet's orbit is a `LineLoop` of 256 points sampling `keplerPos(a, e, L0, T, t)` over one full period. Re-computed once at mount.
- **Sun:** `MeshBasicMaterial` (self-emissive surface) + a halo `SphereGeometry` with `BackSide` rendering at 1.04× radius for a corona glow.
- **Auto-orbit:** the camera arcs around the Y-axis at 0.05 rad/s by default; pauses under reduced-motion or when the user grabs `OrbitControls`.
- **Science Lens overlays:** when the lens is on, each planet additionally draws SOI rings, gravity arrows, atmosphere shells, tidal-lock indicators (per layer toggles). All overlay objects are built by `src/lib/orbit-overlays.ts` and toggled by `onLayerChange` per ADR-055.

### Scene 2 — `/fly` (heliocentric transfer)

- **Coordinate frame:** heliocentric, AU units, identical to `/explore`. Sun at origin.
- **Trajectory geometry:** the transfer arc is a Keplerian half-ellipse from Earth at the mission's departure date to the destination at arrival (per ADR-010). Sampled at 96 points; rendered as a `Line` with `LineDashedMaterial`. Pre-arrival segment dashed dim; covered segment solid bright; the ship marker (a small `ConeGeometry`) tracks the current MET.
- **Bodies:** Sun + departure planet + destination planet + the spacecraft cone. Other planets are dimmed `Points` for context.
- **Physics:** `src/lib/fly-physics.ts` — `transferEllipse`, Tsiolkovsky, per-mission validation harness per ADR-030. Math runs in pure functions, validated against committed expected values per mission so a regression in either the math or the data fails CI.
- **Camera switching for Moon missions:** when the destination is `MOON` and the mission carries a `flight.cislunar_profile` block, the heliocentric scene hands off to **Scene 3** (Cislunar) once the spacecraft has crossed the Moon's sphere of influence. See ADR-058.

### Scene 3 — `/fly` cislunar (Earth-centered)

- **Coordinate frame:** Earth-Centered Inertial (ECI), world units in km / 1000. Earth at origin.
- **Trajectory geometry:** `src/lib/cislunar-geometry.ts` consumes `flight.cislunar_profile` (parking orbit → TLI → translunar arc → lunar arrival → lunar orbit / TEI) and emits a polyline through 96+ points. The Moon orbits Earth in this scene; the spacecraft polyline is parented to the Earth–Moon barycentre frame so the trajectory stays geometrically faithful.
- **Bodies:** textured Earth + textured Moon + spacecraft cone + a thin `Line` for the Moon's orbit.
- **When it activates:** controlled by a `view` URL param + the destination check; visible only on Moon missions. Camera defaults to a 3-Moon-radii-out perspective with the trajectory fully framed.

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

Every route's `onDestroy` walks the scene graph and disposes `geometry`, `material`, and any `texture` it can identify, then nulls the renderer and removes the canvas from the DOM. Locale switching, navigation away, or HMR reload triggers this path. Without it, repeated route mounts leak GPU memory across sessions — caught by the `dispose-leak.test.ts` jsdom harness that snapshots `renderer.info.memory` before / after.

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

Walks `static/data/i18n/en-US/science/<tab>/*.json` for the canonical (en-US) section list, joins with `static/data/science/<tab>/<section>.json` base files for the diagram + LEARN tier metadata, and writes a single manifest. Auto-walks: adding a new section file in any tab makes it appear on `/science` + in search + as a chip target on the next build.

### Pipeline 9 — Porkchop pre-computation (`scripts/precompute-porkchops.ts`)

**Goal:** ship pre-computed Lambert grids for every default destination so `/plan` first-paint never spawns a worker.

9 destinations: Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Ceres. Each grid is 112 × 100 cells × `dv_kms` (~50 KB JSON gzipped). Committed to `static/data/porkchop/earth-to-<dest>.json` per ADR-016 + ADR-026 + ADR-028.

The Lambert worker stays in the bundle for any future custom-range computation (user-driven date-range editor); dormant on the default scenarios.

### Pipeline 10 — i18n + translation (`scripts/wave23/`)

Three-stage pipeline per ADR-033 + ADR-054:

1. **catalog.ts** — read every en-US overlay (missions, fleet, science, surface sites, ISS modules, Tiangong modules) and write a flat key → en-US-string map.
2. **maps.ts** — translate each en-US string with argos-translate per target locale; merge with any LLM-spot-fix overrides; write a per-locale key → translated-string map.
3. **apply-translations.ts** — read each base file, replace en-US fields with the locale's translations, write the per-locale overlay.

**sr-Cyrl** is hand-authored (no argos model). The pipeline writes a stub overlay; the curator fills it in.

`scripts/wave23/` is reused identically across mission, fleet, and science content — no per-surface forks.

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

Base file: `static/data/missions/<dest_lower>/<id>.json`. Overlay: `static/data/i18n/<locale>/missions/<dest>/<id>.json`. Shapes locked by `mission.schema.json`.

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

Locked by `fleet-entry.schema.json`. Language-neutral; editorial fields merge from `static/data/i18n/<locale>/fleet/<category>/<id>.json` per ADR-054.

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

- **No user data, with one carve-out.** No accounts. No login. No `localStorage`. No `sessionStorage`. No tracking. **The single permitted cookie is `orrery_locale`** (ADR-057) — explicit locale-override only. Auto-detected locale, Science Lens, mission filters, install counter, and every other piece of state stay runtime-only.

- **Three.js r128.** Not r129, not r130. r128 is the pinned version. `THREE.CapsuleGeometry` does not exist in r128 — use `CylinderGeometry` or `SphereGeometry` instead. Production bundles locally.

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

## §stack

Locked technical choices. Each entry points to its ADR.

| Concern | Choice | ADR |
|---|---|---|
| Language | TypeScript, strict mode | ADR-011 |
| Framework | SvelteKit | ADR-012 |
| Bundler | Vite (via SvelteKit) | ADR-012 |
| Routing | History API via SvelteKit router | ADR-013 |
| 3D rendering | Three.js r128, local bundle | ADR-001 |
| Math rendering | KaTeX, server-rendered at build | ADR-034 |
| Service worker / PWA | @vite-pwa/sveltekit | ADR-029 |
| Documentation site | VitePress + vitepress-sidebar at `/docs/` | ADR-021 |
| CI + preview hosting | GitHub Actions + GitHub Pages | ADR-014 |
| Unit / integration tests | Vitest (+ jsdom + canvas polyfill) | ADR-015 |
| End-to-end tests | Playwright (Chromium, single-worker CI) | ADR-015, ADR-056 |
| External assets | Resolved at build time via GH Actions | ADR-016 |
| Imagery sourcing | Agency-first (NASA / Roscosmos / CNSA / JAXA / ESA / ISRO archives) then Wikimedia Commons | ADR-046 |
| Provenance manifests | image-provenance + link-provenance + text-sources + source-logos + license-waivers | ADR-047, ADR-051 |
| Outbound LEARN-link policy | Per-link source + language + last-verified; locale fallback chain | ADR-051 |
| i18n UI strings | Paraglide-js compiled message catalogue | ADR-017 |
| i18n content | Locale overlay files (shallow-merge over base data) | ADR-017, ADR-054 |
| Translation pipeline | LLM-first-pass + argos-translate offline-NMT batch fallback; sr-Cyrl manual | ADR-033, ADR-043, ADR-054 |
| Font + script strategy | Wave 1 (Latin+Cyrillic), Wave 2 (CJK), RTL Arabic | ADR-032, ADR-043, ADR-044, ADR-045 |
| Design approach | Mobile-first, bottom sheet panels | ADR-018 |
| Accessibility | Tier-1 contract: reduced-motion, focus mgmt, role=tablist, canvas aria-labels | ADR-025 |
| Locale persistence | Single `orrery_locale` cookie (the sole exception to "no client storage") | ADR-057 |
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
| ADR-058 | Accepted | Cislunar Earth-centered second camera |
| ADR-059 to ADR-062 | _Reserved_ | Planned closure targets for RFC-017 (Surface Hotspots, v0.7) |

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
