# `src/lib/surface-scene/`

The shared renderer for `/moon` and `/mars`. Owns ~90 % of the surface-route behaviour. Routes consume `SurfaceScene.svelte` and pass a planet config.

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
- HUD: ViewToggleButton, View3dControls, LayerChipRow, HotspotsLodChip, altitude indicator, TierContextCard, debug overlay (`?debug=1`)
- Panorama enter/exit (`hotspot_tier3_panorama` → skybox)
- E2E contract signals: `data-sites-count`, `data-hotspot-tier` on the canvas
- Reduced-motion handling (gates auto-spin + dot pulse + fly-in)
- Teardown: cancel RAF, dispose scene + renderer + composer

## What's planet-specific (config knobs)

A handful of `SurfaceSceneConfig` props. Each has a physical / domain justification — see ADR-072 §"True body differences" for the why.

```ts
interface SurfaceSceneConfig {
  // Identity (used for asset paths, e2e signals, debug)
  planet: 'moon' | 'mars';

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
    color: number;                // 0x4ecdc4 (teal)
    opacity: number;              // 0.18
  };

  // Real obliquity. Mars 25.19°, Moon ~0°
  axialTiltDeg: number;

  // Mission-specific lander mesh builders
  landerModelBuilder: LanderModelBuilder;

  // 2D projection convention — see ADR-038
  twoDMode: 'lunar-polar-discs' | 'equirectangular';

  // Vendored traverse polylines + captions. Mars rovers today.
  // Moon Apollo EVA / Lunokhod tracks → future slice.
  traverses?: TraverseRegistry;

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
3. Add `src/lib/mercury-lander-models.ts` (currently empty — MESSENGER + BepiColombo if/when they land).
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
| `debug-info.ts` | Shared debug overlay shape + factory (Slice 2A) |
| `register-moon-hotspot-builders.ts` | Moon's Tier 1 model registration bundle (Slice 2A) |
| `register-mars-hotspot-builders.ts` | Mars's Tier 1 model registration bundle (Slice 2A) |
| `README.md` | This file — the contract |

## Adjacent libs (already factored)

These are upstream of `surface-scene/` and should be used as-is:

- `src/lib/surface-map/*` — 12 pure helpers (nation palette, tier scale, hotspots mode, link tiers, panel tabs, story autopromote, 2D legend, load panel data, site formatters, tier context, URL sync)
- `src/lib/three/*` — 23 Three.js helpers (scene renderer, canvas resizer, input listeners, outline pass, marker halo, orbiter group, place-on-sphere, surface lights, panorama keys, dispose helpers, star field, etc.)
- `src/lib/hotspot-lod-dispatcher.ts` — Tier 0/1/2/3 LOD + LRU + cross-fade engine
- `src/lib/hotspot-surface-patch.ts` — Tier 2 detail patch builder
- `src/lib/hotspot-tier3-skybox.ts` — Tier 3 ground-level panorama
- `src/types/surface-site.ts` — `SurfaceSite`, `RegionBounds`, `RegionKind` types
