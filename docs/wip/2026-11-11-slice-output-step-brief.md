# Slice brief — one output step for every composer, sRGB on every colour texture (2026-11-11)

Operator: /iss and /tiangong get the OutputPass; the rule is project-wide. Read at HEAD, three 0.185.1.

## Mechanism
Composer targets are linear; the renderer's toneMapping and outputColorSpace apply only when drawing to
the canvas. So composer scenes today show linear values (darker, contrastier) and ignore their ACES;
direct-render tiers already show ACES + sRGB. OutputPass (last, after vignette/film/bokeh) applies the
renderer's toneMapping, exposure and sRGB. Untagged colour textures then come out lighter than authored
→ tag them `SRGBColorSpace`; data maps stay linear. Hex `Color` constants are already sRGB-aware.

## Composers (7 chains, 6 `new EffectComposer(` sites)
| # | Site | Route | Status |
|---|---|---|---|
| 1 | `outline-pass-setup.ts:57` via `SurfaceScene.svelte:1828` | /earth /moon /mars /venus | OK (8e9a7c8d1d9) |
| 2 | same helper via `StationRoute.svelte:574` | /iss /tiangong (ACES 1.05) | GAP — pass `outputPass: true` |
| 3 | `explore-render-stack.ts:242` | /explore solar (ACES 1.0, bloom) | GAP |
| 4 | `universe/milky-way-scene.ts:~737` | /explore Milky Way (bloom) | GAP — biggest glow risk |
| 5 | `universe/local-group-scene.ts:352` | /explore Local Group (+ /dev/local-group) | GAP |
| 6 | `fly-helio-scene.ts:356` | /fly helio, medium+ (ACES 1.1, bloom, bokeh, film, vignette) | GAP |
| 7 | `ascent-renderer.ts:66` | /fly launch, coast, descent (ACES 1.1, film, vignette) | GAP |
Direct-render scenes (other explore scales, fly cislunar, AR, lineup) are already encoded.

## Colour textures without SRGBColorSpace: 53 candidate sites in 30 files
Stations (`StationRoute.svelte:652,684` Earth day maps; `iss-proxy-model.ts:219`,
`tiangong-proxy-model.ts:64` solar arrays; `station-decals.ts:60`), fly (`fly-helio-scene.ts:464,465,469`,
`fly-helio-reactive.ts:218`, `fly-cislunar-scene.ts:132,148,166,180`, overlays, `fly-frame-runner.ts:344`,
`skydome.ts:74`, `sun-lens-flare.ts:141`, `separation-burst.ts:29,50`), explore (`iconic-trajectory.ts` ×4,
`bold-arrow`, `three-label`, `orbit-overlays`, `galaxies-layer`), universe scenes (milky-way ×3, local-group ×2,
neighborhood ×4, deep-sky ×2, cosmic-web ×2, laniakea ×2, local-sheet ×2, virgo ×2, body ×1),
`hotspot-tier3-skybox.ts:318`. Data maps that stay linear (mark `NoColorSpace` explicitly):
`launch-ground.ts:53`, `hero-materials.ts:148`, `launcher-detail.ts:65` (confirm slot), `feather-mask.ts:32`.
No GLTF in the repo.

## Constants to re-check after the change (tuned against linear output)
Stations: exposure `StationRoute.svelte:519`, lights :614/:615/:627, bloom floor ~:585, `iss-proxy-model.ts`
emissive :1294, :856, `OUTLINE_PASS` colours in `three-constants.ts`. Explore solar: exposure
`explore-render-stack.ts:91`, lights :109/:122/:123, glow shells :199–202. MW/LG: bloom defaults
`milky-way-scene.ts:59–63`, `local-group-scene.ts:41–45`, host override `explore-scene-host.ts:698`.
Fly helio: exposure `fly-helio-scene.ts:338`, lights :452/:460, emissives, vignette :410, film, bokeh,
bloom per tier `quality-tier.ts`. Ascent: exposure `ascent-renderer.ts:58`, vignette :71, film :69,
lights `ascent-scene.ts:414/417`, `descent-scene.ts:188/191`, `fly-cislunar-scene.ts:114/115`.
Operator context: Explore (E2) and Fly 2D (FY1) were already "too dark" — lighter is welcome; tune so
glow and bloom do not blow out, not back to the old darkness.

## Docs
`docs/adr/TA.md:369`; `docs/wip/2026-11-09-0.9.9-redesign.md:27–33`; `outline-pass-setup.ts:38–41`
comment; `src/lib/three/README.md` (add a colour-pipeline section); `docs/guides/fly-cinematic-shot-language.md:121–131`,
`fly-cinematic-gap-analysis.md:127,134,180,196`; status lines in the 0.9.8 status, 0.9.9 plan, UX plan,
three.js research note.

## Tests
No test covers 3D colour or pass lists; no visual baseline covers a 3D canvas. Add: a unit test that
`createOutlinePassSetup({outputPass:true})` ends with an OutputPass; a source-level test running checks A–C
below; colour-space tests for station and fly textures where the builders are testable. Before/after
screenshots per scene are the look check (operator approves).

## Checks (re-run by the independent checker)
A. Every `new EffectComposer(` file also contains `new OutputPass(` (HEAD: 5 GAP files; after: none), and the
site count stays 6. B. Both `createOutlinePassSetup({` users pass `outputPass: true` (HEAD: StationRoute GAP).
C. Heuristic: texture creations without a `colorSpace` line within 14 lines (HEAD: 53; after: only data maps,
each with an explicit `NoColorSpace`). D. vitest surface-scene + patch tests; e2e iss, tiangong, explore,
explore-milky-way, fly, fly-launch, fly-descent, fly-cislunar, fly-render-validation, visual — all three projects.
