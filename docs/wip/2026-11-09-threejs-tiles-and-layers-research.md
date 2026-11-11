# Streamed tiles (#652) and globe/surface layer quality: research (three.js stays)

Status: research only, 2026-11-09. Nothing was installed or built. Facts marked **[V]** were checked this
session (npm registry, GitHub API, a live HTTP request, or our source); **[U]** is unverified.

Update 2026-11-11: the colour pipeline (OutputPass on every composer, `SRGBColorSpace` on colour textures, `NoColorSpace` on data maps) is done (output-step slice; rule in `docs/adr/TA.md`). The rows below that call it open describe the state on 2026-11-09.

## 1. What we have today

| Area | Fact | Where |
| --- | --- | --- |
| three.js | 0.185.1 (`three`, `@types/three` pinned), Svelte 5, Vite 8 [V] | `package.json` |
| Planet | `SphereGeometry(30, 64, 64)`; scene radius 30 = real radius, so 1 unit = ~212 km on Earth [V] | `SurfaceScene.svelte` L1853-1867 |
| Camera | `PerspectiveCamera(45, aspect, near 0.05, far 400)`; near = ~10 km. Floor `camR` 30.1 = ~21 km altitude [V] | `SurfaceScene.svelte` L1744 |
| Base texture | 2K jpg first, 4K (`4k_earth_daymap.jpg`, 1.4 MB) lazily at `camR <= 50`; 4K over 40 075 km = ~10 km/px [V] | `ensurePlanet4kLoaded` |
| Texture loading | plain `THREE.TextureLoader`; JPEG only; no KTX2/Basis, no ImageBitmap, no worker, no Cache API/IndexedDB in `src` (grep) [V] | `hotspot-surface-patch.ts` L481-545 |
| Patch filtering | `anisotropy = 16` hard-coded (not `getMaxAnisotropy()`), `LinearMipmapLinearFilter`, mipmaps generated on the CPU upload path [V] | `hotspot-surface-patch.ts` L523-531 |
| Colour | patches, planet map and cap use no `colorSpace` ("must decode" comment); composer has no `OutputPass`; 0.9.9 redesign lists the root fix [V] | `surface-context.ts` L131; `outline-pass-setup.ts` L17-19, `docs/wip/2026-11-09-0.9.9-redesign.md` L27 |
| Draping | regional/detail patches are flat `PlaneGeometry` shells at `planetRadius + 0.03` (~6 km); cap uses `polygonOffset` -1/-1 and `renderOrder -1` [V] | `hotspot-surface-patch.ts`; `surface-context.ts` L115-141 |
| Render order | traverse lines 5-7, captions 8-9 (`depthTest:false`), replay marker 10, skybox labels 10; arbitrary integers per file [V] | `surface-traverses.ts`; `hotspot-tier3-skybox.ts` |
| Flat view | 2D canvas, equirectangular, `drawImage` of regional/detail images [V] | `SurfaceFlatPatch.svelte` L263, L435 |
| Streaming | `streamedUrl()` / `assetUrl` origin spine already streams `/images/hotspots/**` for the mobile build (ADR-078/079) [V] | `asset-url.ts` |
| CSP | `img-src 'self' data: https:` (any https image OK); `connect-src` is an allow-list (no tile host); tile `<img>` loads need no CSP change, `fetch`/`createImageBitmap(blob)` do [V] | `ops/docker/nginx.conf` L275 |
| Sizes | `static/images/hotspots/earth` 135 MB; `static/textures` 62 MB; one 32 km regional patch jpg = 1.1 MB [V] | `du` |

Consequence for #652: the issue itself says "no tile code in `src/`" and the globe is a single sphere with one
texture swap. Everything below is therefore additive, not a rewrite.

## 2. Library survey (three.js-native first)

Numbers: npm `latest`, GitHub API pushed/stars/issues, bundlephobia whole-package min+gz on 2026-11-09 [V].
Bundlephobia is not tree-shaken; real cost of 3d-tiles-renderer with 2-3 plugins will be lower [U].

| Library | Licence | Latest / last push | Stars / open issues | min+gz (pkg) | three peer | Sphere LOD + XYZ/WMTS? |
| --- | --- | --- | --- | --- | --- | --- |
| [3d-tiles-renderer](https://github.com/NASA-AMMOS/3DTilesRendererJS) (NASA-AMMOS) | Apache-2.0 | 0.5.4, 2026-11-03 (releases every 2-6 weeks) | 2.5k / 111 | 30 kB | `>=0.167` (plain three OK; r3f/Babylon/PlayCanvas optional) | Yes: `GeneratedSurfacePlugin` with `projection: 'ellipsoid'` builds the quadtree from an XYZ/TMS/WMTS/WMS source; `ImageOverlayPlugin` drapes tiled imagery on any 3D Tiles; also MVT, GeoJSON, PMTiles, quantized-mesh, `TilesFadePlugin` |
| [geo-three](https://github.com/tentone/geo-three) | MIT | 0.1.15, last npm publish 2024-10, push 2026-04 | 963 / 41 | 11 kB | `>0.120` | Planar + spherical map views, XYZ/OSM/Bing providers; WMTS and fade/eviction polish [U]; slow release cadence |
| [three-globe](https://github.com/vasturiano/three-globe) / globe.gl | MIT | 2.45.6, 2026-10-14 | 1.7k / 48 | 156 kB (globe.gl 559 kB incl. three) | `>=0.154` | Yes: XYZ "tile engine" layer (built on [three-slippy-map-globe](https://github.com/vasturiano/three-slippy-map-globe), 1.0.6, 19 stars) [U on API]. Owns its own globe mesh, data layers (points/arcs/labels), camera helper: overlaps our scene; we would keep only the tile sphere |
| [three-slippy-map-globe](https://github.com/vasturiano/three-slippy-map-globe) | MIT | 1.0.6, 2026-04 | 19 / 0 | small [U] | `>=0.154` | Standalone tile-sphere object; one maintainer; simplest drop-in sphere, but radius/ellipsoid and cache hooks limited [U] |
| [three-geospatial (Takram)](https://github.com/takram-design-engineering/three-geospatial) | MIT | atmosphere 0.19.1, repo push 2026-05-27 | 1.8k / 32 | atmosphere 62 kB (+ geospatial 89 kB source) | atmosphere needs `postprocessing`; `@react-three/*` listed as peer | Atmosphere, clouds, aerial perspective, Cesium/3DTiles helpers; **not** a tile streamer. Built for r3f and the `postprocessing` library, so it would replace our EffectComposer: poor fit, optional later for Earth atmosphere only |
| [iTowns](https://github.com/iTowns/itowns) (IGN) | CeCILL-B or MIT | 2.46.0, 2026-11-03 | 1.3k / 303 | large (full GIS framework) | owns three setup | Yes, WMTS/TMS globe. Owns camera, controls and render loop: would replace SurfaceScene, which the operator does not want |
| [three-tile](https://www.npmjs.com/package/three-tile) | MIT | 0.12.2, 2026-08 | n/a | n/a | **pinned exactly `three@0.183.1`** (we are on 0.185.1) | XYZ/TMS map plane + globe; exact peer pin is a blocker [V] |
| [maplibre-gl](https://github.com/maplibre/maplibre-gl-js) + three custom layer | BSD-3 | 6.17.0 | large | 297 kB | n/a | Mature globe projection + raster tiles, but MapLibre owns the camera and GL context; three runs as a custom layer with MapLibre's matrices. Our rotating tilted planet, OutlinePass and fly-in would have to be re-hosted. Rejected for this app |

Coexistence summary: only 3d-tiles-renderer, geo-three and slippy-map-globe are *objects you add to an existing scene*
(same renderer, camera, composer, our markers/traverses/rings untouched). three-globe is a scene-owner;
iTowns and MapLibre are app-owners.

### 2.1 Why 3d-tiles-renderer fits best [V from source, not run]

- `GeneratedSurfacePlugin` doc: "generates tiled surface geometry from a tiling scheme"; `projection` defaults to
  `'ellipsoid'`; `endCaps` snaps Mercator poles; source classes in `plugins/images/sources/`: XYZ, TMS, WMTS, WMS,
  QuadKey, DeepZoom, PMTiles, MVT, GeoJSON.
- Same plugin family has `TilesFadePlugin` (LOD cross-fade) and `UnloadTilesPlugin`; the renderer has an
  `lruCache` with byte/tile limits [U on exact option names], error-target LOD per frame, and frustum culling.
- Camera is passed in (`tiles.setCamera(camera)`, `setResolutionFromRenderer`), so our camera and composer stay.
- Examples to copy: `example/three/ellipsoid.js`, the XYZ globe example, `googleMapsAerial.js` (Earth).
- Used units are metres (WGS84 ellipsoid). Our globe is radius 30 units, a sphere. Adapting means parenting
  `tiles.group` under `planetMesh` with scale `30 / 6 371 000` (or setting the tiles ellipsoid radii to a sphere) [U:
  must be prototyped]. Mean-radius sphere vs WGS84 gives up to ~21 km (0.3 %) error at the poles = 0.1 unit; pads
  and traverses are already placed on a sphere, so use a sphere to stay consistent.
- Risks: pre-1.0 (0.5.x) API churn (the `shape` option was renamed to `projection` and is deprecated [V]); large
  surface area we do not need (Google/Cesium auth, GLTF, point clouds) but the module graph is tree-shakeable [U].

### 2.2 Tile source (EOX Sentinel-2 cloudless) [V]

| Item | Finding |
| --- | --- |
| Endpoint | `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg` returned 200 (also `s2cloudless-2017..2025` and `_3857` variants; capabilities list z0-z21 and `GoogleMapsCompatible`) |
| Tile size | z12 8 kB, z13 9.7 kB, z14 8.2 kB, z15 6 kB: tiny JPEGs, so no compression work needed on tiles |
| Headers | `access-control-allow-origin: *`, `cache-control: max-age=604800`: usable as WebGL textures and with `fetch`; browser HTTP cache gives a free 7-day cache |
| Resolution | z14 = ~9.5 m/px at the equator (matches the issue's ~10 m target); Sentinel-2 source is 10 m, so z15+ adds no detail |
| Licence | per [pricing page](https://cloudless.eox.at/pricing): 2016 = CC BY 4.0; 2018-2025 = CC BY-NC-SA 4.0. Orrery is non-commercial (memory: NC sources OK, honour ShareAlike in provenance). Attribution string required, near the imagery |
| Terms | no rate limits stated on the pricing page; hotlinking is allowed ("use service endpoints directly") per EOX README snippet via search; no SLA. Heavy-use policy not found [U] |

## 3. Best practices applied to our layers

Ranked later (section 5). Cost S = hours, M = 1-2 days, L = several days.

| Practice | What it fixes in OUR app | Cost | Risk |
| --- | --- | --- | --- |
| **Colour management: OutputPass + `SRGBColorSpace` on colour maps** | `outline-pass-setup.ts` has no `OutputPass`; #889fe7 renders as rgb 63,88,204; hover/outline/sol-ramp colours darker than intended; textures deliberately left without `colorSpace` to cancel out. Streamed tiles from a library will arrive tagged sRGB and look too dark unless this is fixed first or the tile textures are forced to `NoColorSpace` | M (every surface route changes visually, needs side-by-side) | Medium: global look change; operator approval needed (already listed in redesign doc) |
| **KTX2/Basis (`KTX2Loader`) for our big JPEGs** | 135 MB of earth patches, 1.1 MB jpg per 2048px patch decoded to full RGBA in VRAM (16 MB with mips) per patch; many simultaneously (shells at 4 LODs) risk iOS tab kills. Basis transcodes to ASTC/ETC2/BC so VRAM drops 4-8x; files are also smaller than JPEG at equal quality for UASTC/ETC1S [per [three docs](https://threejs.org/docs/pages/KTX2Loader.html)] | M-L: `toktx` build step in `fetch-earth-pads.ts`, a transcoder wasm (~200 kB) in `static/`, loader singleton with `detectSupport(renderer)`, fallback to JPEG | Medium: grey-tint (`globe-tint.ts`) and single-channel patches need checking; sRGB flag on KTX2 must match our linear-decode convention ("KTX2 comes out darker" is a known pitfall [per [forum](https://discourse.threejs.org/t/ktx2-compressed-textures-come-out-darker-than-the-originals/51618.md)]); new build tool = approval |
| **Anisotropy from device caps** | hard-coded 16 in `hotspot-surface-patch.ts` is clamped silently by the driver; fine on desktop, but costs sampling bandwidth on phones where 4-8 is enough; `surface-context.ts` uses 8, `station-decals.ts` 4: inconsistent | S: one helper reading `renderer.capabilities.getMaxAnisotropy()` and quality tier | Low |
| **Mipmaps: precompute / avoid CPU `generateMipmaps` on hot path** | 2048px patch upload plus mip generation on the main thread at LOD crossing causes a hitch; KTX2 ships mips pre-built; for tiles, library does it | S inside KTX2 work, else M | Low |
| **Draped-layer depth: shell offsets vs `polygonOffset` vs log depth** | Current planar shell at +0.03 unit leaves a 6 km air gap: flat patches float above curved terrain at the edge of big 32 km patches and the horizon; `polygonOffset` is already used for the cap. `logarithmicDepthBuffer` fixes z-fight globally but disables early-Z and breaks custom `ShaderMaterial`s without the `logdepthbuf` chunks (our glow/atmosphere shells, outline pass) [per [forum](https://discourse.threejs.org/t/beware-of-logarithmic-depth-buffer-it-can-degrade-scene-performance/88495)]. Near 0.05 / far 400 gives a 8000:1 ratio at 24-bit depth, precise enough for current radius-30 scene | S-M to replace shell with the library's curved tiles (patch becomes a tile overlay) | Low if we keep shells + `polygonOffset` + explicit `renderOrder`; log depth: not recommended |
| **Central render-order table** | Orders 5-10, 22, 100, 999 scattered over 7 files; any new layer (tiles at -2) risks ordering bugs | S: one `render-layers.ts` const map | Low |
| **Tile cache / eviction** | none today; library LRU is bounded by bytes and tile count; HTTP cache is free given 7-day `cache-control` | S (config) | Low |
| **Offline packs (Cache API / IndexedDB / Capacitor filesystem)** | iOS app (ADR-078) has no tile offline path; today a failed tile means base map stays | L; z0-z8 global world is ~87 k tiles = hundreds of MB [U estimate: tiles x ~8 kB], so ship z0-z6 only (~5.5 k tiles, ~45 MB [U]) or none | Medium: size, legal (bulk copy of EOX data), cache invalidation. Needs operator approval |
| **Workers / `ImageBitmap` decoding** | JPEG decode on main thread is the main cost of streaming; `createImageBitmap` + `ImageBitmapLoader` moves decode off thread. 3d-tiles-renderer's image sources already decode tiles through its own loaders (`fetchData` hook) [U]; our patch loader is `TextureLoader` (main-thread decode) | S for `ImageBitmapLoader` in patch code (needs CSP `connect-src` for fetch); free via library for tiles | Low-Medium: `flipY` semantics differ for ImageBitmap textures |
| **Frustum / horizon culling** | Library culls by frustum and view error; we have per-site picking of near-side hotspots (`site-tags.ts`) but patches and tags still update for hidden sites [U]; horizon test on the unit sphere is a dot product | S for patches/tags | Low |
| **LOD fading** | Tier-2 opacity ramp `camR 33 -> 30.5` exists; tile-level fade comes from `TilesFadePlugin` | S with plugin | Low |
| **Label/overlay declutter** | `site-tags.ts` (833 lines) already fans out tag groups and gates by distance (#641). Remaining: collision pass on screen-space boxes (greedy by priority) in one place for tags + `AnnotationRings` | M | Low |
| **Texture memory budget** | No global budget or eviction for patches, only per-material dispose. A `TextureBudget` (byte counter, LRU over inactive patch textures, `renderer.info.memory.textures` in `?debug=1` Perf tab) | M | Low |

## 4. Staged plan for #652

### Stage 0: decide the colour pipeline (blocks everything else)
Fix or deliberately bypass (tiles `colorSpace = NoColorSpace` to match planet map) before any tile lands.
The 0.9.9 redesign already owns this decision; tiles should not force it, so Stage 1 and 2 use the bypass.

### Stage 1: flat true-scale view (1-2 days, matches issue scope item 1)
The flat view is a 2D canvas (`SurfaceFlatPatch.svelte`). Own code, no library:
1. Small pure module `src/lib/surface-scene/tile-map.ts`: Web Mercator tile maths (lat/lon to z/x/y), choose z from
   km-per-px (existing scale maths), visible-tile set, URL template, LRU of `HTMLImageElement` (cap ~150 tiles).
2. Draw tiles under the existing regional/detail `drawImage` calls; fall back to current 4K map on error/offline.
3. Attribution line in the existing credits slot; provenance row (`image-provenance.json`) for EOX with year and licence.
4. Unit tests for tile maths (pure), one e2e that a tile request leaves the page.
Needs: no new dependency. CSP unchanged (`<img>` over https). Reason not to use a library here: it is 2D, 200 lines,
and a three-based library gives nothing for a canvas.

### Stage 2: 3D globe (several days; prototype first)
Library: **3d-tiles-renderer** (Apache-2.0, 30 kB pkg, active, three `>=0.167`).
1. Spike in a branch (scratch route or `?debug=1` flag): `TilesRenderer` + `GeneratedSurfacePlugin` +
   `XYZImageSource`/EOX WMTS, `projection: 'ellipsoid'`, group parented under `planetMesh`, scaled to radius 30.
   Measure: draw calls, tile count at `camR 30.1`, frame time on a phone, texture memory (`renderer.info`).
2. Enable only below `camR ~= 45`; fade in over the 4K base (`TilesFadePlugin`); keep the base sphere underneath
   (always a valid fallback while tiles load).
3. Cap `lruCache` (bytes + tiles) per quality tier; stop updating when idle (`UpdateOnChangePlugin`).
4. Decide what to do with regional/detail patches: keep as draped shells (ordering via `renderOrder`/`polygonOffset`)
   for the first release; later convert to `ImageOverlayPlugin` overlays only if shells z-fight.
5. Gate on the repo's own checks: unit tests of the glue, Playwright on both projects, memory and fps on iPhone-class.
Stop criteria: if mobile frame time or the 0.05/400 clipping cannot be held, ship Stage 1 only and keep base map.

### Stage 3: offline and hosting (operator decision)
Prefer browser HTTP cache plus Capacitor's WebView cache; offer an optional z0-z6 pack only if the app really needs it.
Mirroring tiles on our server is hundreds of GB at full depth (issue text); limit to pad regions if EOX terms become an issue.

### Approvals needed
| Item | Why |
| --- | --- |
| New dependency `3d-tiles-renderer` (Stage 2) | AGENTS.md: no new deps without approval; also bundle-size budget check |
| Using EOX endpoint in production + licence year | 2016 CC BY vs 2018-2025 CC BY-NC-SA (ShareAlike provenance), no stated rate limit, no SLA; maybe email EOX |
| CSP `connect-src https://tiles.maps.eox.at` | only if tiles are fetched via `fetch`/`ImageBitmap`; `<img>` path needs nothing |
| Tool for KTX2 (`toktx`/KTX-Software, basis wasm in `static/`) | new build tooling and a 200 kB runtime file |
| Offline pack size | bundle budget for the iOS app (ADR-078); each MB ships to every user |
| Colour-pipeline change (OutputPass) | changes the look of every surface route; operator has asked for side-by-sides for look changes |

## 5. Ranked layer improvements

| # | Improvement | Fixes | Estimate |
| --- | --- | --- | --- |
| 1 | Stage 1 flat-view tile map | #652 reported case (Kourou mush at ~20 km) | 1-2 d |
| 2 | OutputPass and sRGB colour pipeline | darkened UI/outline colours, wrong-by-design texture tagging, prerequisite for any library texture | 1-2 d plus visual review |
| 3 | Stage 2 3D tiles via 3d-tiles-renderer (spike, then ship) | #652 for the globe; LOD, culling, cache, fade for free | 3-5 d |
| 4 | KTX2 for patch JPEGs (+ device-cap anisotropy, pre-built mips) | VRAM and hitches on phones; smaller downloads for 135 MB of patches | 2-3 d |
| 5 | Central render-order table + `TextureBudget` with debug panel readout | ordering regressions when tiles are added; unbounded texture memory | 1 d |
| 6 | Declutter pass for tags/rings; horizon culling | overlapping tags near dense pad clusters (Cape Canaveral, Kourou) | 1-2 d |
| 7 | `ImageBitmapLoader` for patch decode | main-thread decode hitch at LOD crossing | 0.5 d |
| 8 | Offline z0-z6 pack | offline iOS globe | 2+ d, approval |

Not recommended: `logarithmicDepthBuffer` (performance and shader-chunk cost, no current z-fight evidence at 0.05/400),
switching to MapLibre/iTowns/globe.gl (take over camera and loop), Takram clouds/atmosphere (needs `postprocessing`/r3f).

## 6. NOT verified

- Nothing was built or run: the Stage 2 plugin combination (ellipsoid scaled to radius 30 under a rotating `planetMesh`,
  sphere vs WGS84, composer + OutlinePass compatibility, near 0.05/far 400 clipping) is untested.
- Bundle sizes are bundlephobia whole-package numbers; tree-shaken size of 3d-tiles-renderer with our plugins is unknown.
- three-globe tile-engine API and three-slippy-map-globe feature set came from package metadata, not source reading;
  geo-three spherical mode/WMTS support recalled, not re-checked.
- EOX rate limits, fair-use policy and which year's licence applies to the free WMTS layers are not confirmed from an
  EOX terms page; only the pricing page and a search snippet were read. Layer `s2cloudless-2024_3857` answered 200
  at z12-z15 for sampled tiles only, not global coverage.
- Mobile performance claims (VRAM savings 4-8x, hitching) are from documentation, not measured on our app.
- Whether `lruCache` option names, `UpdateOnChangePlugin` and `TilesFadePlugin` behave as described for image-generated
  surfaces was read from file lists/doc text, not run.
- Offline pack tile counts are arithmetic estimates.

## Sources

- [3DTilesRendererJS](https://github.com/NASA-AMMOS/3DTilesRendererJS), plugin API in `src/three/plugins/API.md`, `GeneratedSurfacePlugin.js`, `images/sources/XYZImageSource.js`
- [geo-three](https://github.com/tentone/geo-three), [three-globe](https://github.com/vasturiano/three-globe), [three-slippy-map-globe](https://github.com/vasturiano/three-slippy-map-globe)
- [three-geospatial](https://github.com/takram-design-engineering/three-geospatial), [iTowns](https://github.com/iTowns/itowns), [three-tile](https://www.npmjs.com/package/three-tile), [maplibre-gl](https://github.com/maplibre/maplibre-gl-js)
- [EOX cloudless pricing/licences](https://cloudless.eox.at/pricing), [EOX README](https://s2downloads.eox.at/demo/EOxCloudless/README.txt), [WMTS capabilities](https://tiles.maps.eox.at/wmts/1.0.0/WMTSCapabilities.xml)
- [three KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html), [KTX2 dark textures thread](https://discourse.threejs.org/t/ktx2-compressed-textures-come-out-darker-than-the-originals/51618.md), [log depth buffer warning](https://discourse.threejs.org/t/beware-of-logarithmic-depth-buffer-it-can-degrade-scene-performance/88495)
- GitHub issue #652; `docs/wip/2026-11-09-0.9.9-redesign.md`
