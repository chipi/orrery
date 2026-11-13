# `src/lib/surface-scene/`

The shared renderer for rocky-surface bodies — `/moon`, `/mars`, `/venus`, and `/earth`. **Not used by purely-orbital views (`/iss`, `/tiangong`) or trajectory views (`/fly`)** — those have their own scene architectures because their domain isn't a planetary surface. `/earth` is one unified SurfaceScene (launchpads, museums, observatories and the orbital stack as layers); `?mode=surface` is kept for old links and no longer changes rendering. Its preset is `EARTH_LAUNCH_CONFIG` in `src/routes/earth/earth-launch-sites-config.ts`. SurfaceScene owns ~90 % of the rocky-surface route behaviour. Routes consume `SurfaceScene.svelte` and pass a planet config.

**See [ADR-072](../../../docs/adr/ADR-072.md) for the decision history.** This README is the practical contract — read it before adding any moon-vs-mars divergence.

## What `SurfaceScene.svelte` owns (common layer)

Don't reinvent this on the route — extend it here:

- Three.js scene + camera + renderer + outline composer
- Planet sphere mesh + texture loading + the surrounding star field
- Surface markers (lander glyphs per site), label sprites, selection halos, marker placement via `placeOnSphereTangent`
- Hotspot LOD dispatcher entries (Tier 0/1/2/3 wiring per site, the per-frame `updateHotspotLOD` call, the selected-site clamp, the cross-fade ramp)
- Orbital rings + dots (parented to scene, log-scaled from `max(altitude_km)` in the loaded sites)
- The per-frame animation loop (camera smoothing, drag inertia, smooth zoom lerp, fly-in tween, auto-spin gating, hover outline, scale-pulse on selected, Tier-2 opacity ramp at `camR 33 → 30.5`)
- The 2D canvas drawing dispatch (delegates to body-specific projection per `twoDMode`)
- Mouse + touch + wheel input handlers (via `$lib/three/canvas-input-listeners`)
- Picker / raycaster, hit testing for both 3D + 2D
- Panel state machinery — `selected`, `panelOpen`, `panelTab`, `panelGallery`, `panelStory`, `lastSelectedId`, the reset effect that fires on site change, `loadPanelData` orchestration
- HUD: ViewToggleButton, View3dControls, LayerChipRow (one flat row of `Chip`s, no groups or masters, UXD-015, inline after the view actions in `.hud-controls`, which stays one row and wraps between the two groups; RESET VIEW and SPIN are always rendered, disabled in 2D; the Worlds set `--chip-tint` on the scene root), altitude indicator, TierContextCard, debug overlay (`?debug=1`)
- Phone bottom bar: `.surface-bottom-bar` (scale, altitude, plus the route's globe button passed as the `barStart` snippet) is ONE row above the tab row on coarse pointers and `display: contents` elsewhere; the flat ground view has its own `.hud-bottom` bar. The object-index panel (`SurfaceIndexPanel`) is always in the DOM on moon / mars / venus, hidden while closed, with a real link to each entity page (SEO ADR-096 #11); the separate A–Z tab is gone.
- Panorama enter/exit (`hotspot_tier3_panorama` → skybox)
- E2E contract signals: `data-sites-count`, `data-hotspot-tier` on the canvas
- Reduced-motion handling (gates auto-spin + dot pulse + fly-in)
- Teardown: cancel RAF, dispose scene + renderer + composer

## What's planet-specific (config knobs)

A handful of `SurfaceSceneConfig` props. Each has a physical / domain justification — see ADR-072 §"True body differences" for the why.

```ts
interface SurfaceSceneConfig {
  // Identity (used for asset paths, e2e signals, debug)
  planet: SurfacePlanet;          // 'moon' | 'mars' | 'earth' | 'venus' (types.ts)

  // Surface texture
  textureUrl: string;             // e.g. `${base}/textures/2k_moon.jpg`

  // Atmosphere shell — Mars only (Moon has vacuum)
  atmosphere?: {
    color: number;                // 0xffaa66 for Mars
    altitudeKm: number;           // 120 km for Mars
    meshOpacity: number;
    ringOpacity: number;
  };

  // Tidal-lock overlay — Moon only (tidally locked to Earth)
  tidalLockOverlay?: {
    color: number;                // 0x5070ff (accent blue)
    opacity: number;              // 0.18
  };

  // Real obliquity. Mars 25.19°, Moon ~0°
  axialTiltDeg: number;

  // Mission-specific lander mesh builders
  landerModelBuilder: LanderModelBuilder;

  // 2D projection convention — see ADR-038
  twoDMode: 'lunar-polar-discs' | 'equirectangular';

  // Per-route Tier 1 hotspot model builder registration bundle
  registerHotspotBuilders: () => void;

  // Light tint hints at body palette (slight blue Moon vs slight red
  // Mars). Intensity is now common at 0.8 — only the tint stays per-body.
  ambientColor: number;
}
```

## Before you add a new prop

The bar is high. **Most "we should make this configurable" instincts are actually drift waiting to happen.** Before adding a new knob:

1. Read ADR-072 §"Drifts that get consolidated." Twenty-two items were resolved into shared design when SurfaceScene was extracted. Don't re-introduce drift under another name.
2. Ask: *is this difference forced by physical or domain reality?* — atmosphere, tidal-lock, axial tilt, projection convention, lander catalogue, traverse data availability. If yes, knob is justified.
3. Ask: *would a third route (e.g. Mercury, or a far-future Vesta) need a third value here?* If the answer is "probably the same as Moon" or "probably the same as Mars," the value belongs as a shared constant, not a knob.
4. If you're still convinced, **open an ADR** that explains why the difference isn't drift. Don't silently add config props.

## How to add a new body

To stand up a hypothetical `/mercury` route:

1. Add Mercury sites to `static/data/mercury-sites.json` (schema: `static/data/schemas/surface-site.schema.json`).
2. Add `static/textures/2k_mercury.jpg` (1:1 crop already exists per the textures dir).
3. Add `src/lib/mercury-lander-models.ts` (does not exist; the moon/mars/venus equivalents are `src/lib/{moon,mars,venus}-lander-models.ts`).
4. Add `src/lib/surface-scene/register-mercury-hotspot-builders.ts` mirroring the moon/mars pattern.
5. Create `src/routes/mercury/+page.svelte` as a thin shell:
   ```svelte
   <SurfaceScene
     config={{
       planet: 'mercury',
       textureUrl: `${base}/textures/2k_mercury.jpg`,
       axialTiltDeg: 0.034,        // Mercury's real obliquity
       landerModelBuilder: buildMercuryLanderModel,
       twoDMode: 'equirectangular', // Mercury rotates 3:2 — equirect honest
       registerHotspotBuilders: registerMercuryHotspotBuilders,
       ambientColor: 0x887766,      // Sun-baked grey
       // No atmosphere, no tidal-lock, no traverses
     }}
     sites={mercurySites}
   >
     {#snippet panel(selected)}
       <!-- mercury-specific panel content -->
     {/snippet}
   </SurfaceScene>
   ```
6. Add `tests/e2e/mercury.spec.ts` mirroring the moon/mars patterns.

If something *can't* be expressed in this contract, that's a signal — file an ADR, don't patch the route.

## Where things live

| File | Owns |
|---|---|
| `SurfaceScene.svelte` | The shared component — scene assembly, animation loop, HUD, panel state |
| `types.ts` | `SurfaceSceneConfig` and the config types it composes |
| `SurfaceFlatPatch.svelte` | Flat ground-patch view at deep zoom (/moon, /mars; ADR-062) |
| `SurfaceIndexPanel.svelte` | Searchable orbit/land index shared by the routes; a site's round photo (`IndexItem.thumb`, the image its panel shows, `EntityThumb`, UXD-025) is ringed in its nation colour (`colorFor`, the legend's); a site with no photo keeps the dot in that colour with a light ring, the meta line ends with In orbit / On land (UXD-017 amendment) |
| `EarthObjectPanel.svelte`, `MuseumPanel.svelte`, `ObservatoryPanel.svelte` | /earth detail panels (the Earth-object panel lists its `science` slugs as compact `ScienceCard`s through `pickScienceLinks`); each passes its kind line and name to `Panel` as the `eyebrow` and `heading` snippets (the site panel inside `SurfaceScene.svelte` does the same) |
| `earth-*-layer(s).ts`, `museum-layer.ts` | /earth-only layers (atmosphere, magnetosphere, geophysics, orbital rings, satellites, place pins) |
| `moon-lens-layers.ts`, `mars-lens-layers.ts`, `surface-sun-layers.ts`, `surface-climate-layers.ts` | Science-lens layers, per body or shared |
| `register-{moon,mars,earth,venus}-hotspot-builders.ts` | Each body's Tier 1 model registration bundle |
| `surface-picking.ts`, `surface-2d-map.ts`, `surface-traverses.ts`, `surface-markers.ts`, `surface-cam-tour.ts` | Extracted from SurfaceScene's `onMount` closure: 3D raycast picking + click dispatch, the flat 2D map (lunar discs / equirectangular) + its click handler, traverse rebuild, site + orbiter marker rebuild, audio-tour camera demos. Each takes a context object (`get*` getters for reactive/reassigned state, shared arrays by reference) |
| `surface-context.ts`, `context-bounds.ts` | Context layer: a true-scale cap of a ~100 m/px mosaic crop over the selected site, child of the planet mesh, same material + texture decoding as the globe, feathered edge, opacity by camera distance (`contextOpacity`). `context-bounds.ts` has no imports so `scripts/hotspots/fetch-context-layer.ts` shares the box maths |
| `globe-tint.ts` | Globe-matched tint for greyscale imagery (#641): samples the globe texture under a patch and sets the material colour so a grey CTX / HiRISE / LROC patch takes the planet's hue (Mars, Moon; `TINT_BODIES` in SurfaceScene); `tintedCopy` does the same for the 2D flat view. Colour imagery is left alone |
| `site-anatomy.ts` | What a site's STORY tab draws (#641): `siteAnatomy()` picks the fleet drawings of the craft on the surface (the lander, then any `payload` rover; orbiters and sister craft left out) with each one's exploded cutaway, and `siteLandingSequence()` returns the site's landing-sequence sheet. Sheet ids come from `src/lib/landing-sequence-ids.json` |
| `SiteLandingPanel.svelte` | Top of the STORY tab: the landing-sequence sheet, then the anatomy drawings with their exploded views, each opening full size in the viewer and linking to its fleet entry |
| `annotation-rings.ts`, `AnnotationRings.svelte`, `annotation-ui.svelte.ts`, `SiteAnnotationList.svelte` | "What you're seeing" on the close-ups (0.9.8 pilot, Apollo): fixed-screen-size rings (not world-unit dots) at each `hotspot_annotations` entry's true ground offset, an overlay shared by the flat ground view (`SurfaceFlatPatch` projects the offsets) and the 3D detail patch (`hotspot-surface-patch.ts` leaves invisible anchors; `SurfaceScene` projects them per frame). Rings are buttons (48 px tap target); tap opens a popover (photo from `moon-annotation-photos.json` when present, explanation, source links); labels are dropped where they collide, rings never. `annotation-ui` is the hover/open state shared with the list in the Overview tab. Annotation strings: English in `static/data/surface-hotspots.json` (`label`, `explain`, `source`), translated through `i18n-src/<locale>/hotspot-metadata/<site>.json` (`hotspot_annotations[].{id,label,explain}`) |
| `site-tags.ts` | Screen-space site tags (#641): framed icon + glass card per site, pad, museum and observatory, drawn as HTML over the canvas. Touching tags merge into a group (count badge, "+N"); cards thin by priority, flip sides, and keep clear of the HUD panels. The 3D marker models and sprite labels stay in the scene graph on `UNRENDERED_LAYER` (`surface-markers.ts`), so picking still hits their spheres |
| `surface-view-state.ts` | Pure view-state rules for the close modes: whether the nations filter strip (and the mobile drawer) is hidden in route view / flat-patch, and whether "Zoom in" flies (it used to bail below camR 32, dead from a route view framed at 31-32) |
| `debug-info.ts`, `status-tone.ts` | Shared debug overlay shape + factory; site status badge mapping |
| `SurfaceScene.svelte` `setRegimeHighlight(hover, active)` | The orbit ruler's regime drawn in the scene (UXD-024): shapes from `$lib/orbit-regime-geometry`, drawing from `$lib/three/regime-highlight`; Lagrange regimes ring their residents (`earthSats`, `orbitalMarkers`); gated by `orbitsInView`; state published as `data-regime-highlight` on the scene root. The route's bottom-left column is `HudStackBL`, outside the scene: the scene only publishes `--legend-top` and lifts the column over the footer (`--ruler-clear`) |
| `README.md` | This file — the contract |

## Adjacent libs (already factored)

These are upstream of `surface-scene/` and should be used as-is:

- `src/lib/surface-map/*` — 12 pure helpers (nation palette, tier scale, hotspots mode, link tiers, panel tabs, story autopromote, 2D legend, load panel data, site formatters, tier context, URL sync)
- `src/lib/three/*` — 23 Three.js helpers (scene renderer, canvas resizer, input listeners, outline pass, marker halo, orbiter group, place-on-sphere, surface lights, panorama keys, dispose helpers, star field, etc.)
- `src/lib/hotspot-lod-dispatcher.ts` — Tier 0/1/2/3 LOD + LRU + cross-fade engine. Over the ceiling (28) it evicts the hotspots farthest from the camera, so the ones in view are never rebuilt every frame (#641, /earth's 42 pads)
- `src/lib/hotspot-surface-patch.ts` — Tier 2 detail patch builder
- `src/lib/hotspot-tier3-skybox.ts` — Tier 3 ground-level panorama
- `src/types/surface-site.ts` — `SurfaceSite`, `RegionBounds`, `RegionKind` types
