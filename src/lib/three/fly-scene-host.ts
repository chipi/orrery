import { base } from '$app/paths';
import { buildHelioScene } from '$lib/three/fly-helio-scene';
import { buildCislunarScene } from '$lib/three/fly-cislunar-scene';
import { buildCislunarReactiveOverlays } from '$lib/three/fly-cislunar-reactive';
import { buildHelioMissionOverlays } from '$lib/three/fly-helio-mission';
import { buildHelioReactiveOverlays } from '$lib/three/fly-helio-reactive';
import { buildSpacecraftSprite, buildEnginePlume } from '$lib/three/fly-helio-overlays';
import { createFlyCameraController } from '$lib/three/fly-camera-controller';

/**
 * `/fly` 3D scene host (RFC-036 WS-B/1c — the B1 `fly-scene-host` contract).
 *
 * Assembles the whole 3D layer — heliocentric + cislunar scenes, the reactive
 * overlay layers, the per-mission overlays, the spacecraft sprite + engine plume,
 * and the cinematic camera controller — lifted VERBATIM out of the fly/+page.svelte
 * onMount. Live page reads (arcTimeline / mission / simDay / camera-orbit source
 * state) thread in as getter closures on `deps`; every built ref returns on the
 * handle. Component-$state backflow a module can't write (the DebugPanel `live*`
 * passes, the mission-swap `let`s the page's $effects bind, the moon-mesh refs)
 * stays in the page, assigned from this handle. Byte-identical to the inline code.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function createFlySceneHost(deps: any) {
    const helioHandles = buildHelioScene({
      container: deps.container,
      aspect: deps.container.clientWidth / deps.container.clientHeight,
      quality: deps.quality,
      // 2026-06-06 — give /fly the same /explore-grade body imagery for
      // Sun + Earth + every destination. 2K throughout (camera here
      // sits closer than /explore but bodies are compressed, so 2K
      // matches the pixel density without a 4K LOD swap).
      bodyTextures: {
        sun: `${base}/textures/2k_sun.jpg`,
        earth: `${base}/textures/2k_earth_daymap.jpg`,
        mercury: `${base}/textures/2k_mercury.jpg`,
        venus: `${base}/textures/2k_venus_atmosphere.jpg`,
        mars: `${base}/textures/2k_mars.jpg`,
        jupiter: `${base}/textures/2k_jupiter.jpg`,
        saturn: `${base}/textures/2k_saturn.jpg`,
        uranus: `${base}/textures/2k_uranus.jpg`,
        neptune: `${base}/textures/2k_neptune.jpg`,
        pluto: `${base}/textures/4k_pluto.jpg`,
        // No Ceres texture in the catalogue today — falls back to the
        // DEST_STYLE colour. Add `2k_ceres.jpg` to the texture pack to
        // light it up automatically.
      },
    });
    const scene = helioHandles.scene;
    const camera = helioHandles.camera;
    // Base FOV to restore when a montage shot (which may set its own FOV)
    // is not active. Captured from the scene's camera at setup. (#371)
    const baseFov = camera.fov;
    const renderer = helioHandles.renderer;
    // Expose to the DebugPanel "Rendering" tab (#334) — the template-
    // mounted <RenderingDebugRegistrar> picks these up reactively.
    // bloomPass is null on minimal/low tiers (no bloom built); the
    // Rendering tab degrades gracefully (sliders hidden, on/off flag
    // falls back to the static quality value).
    const sunCore = helioHandles.sunCore;
    const sunGlow = helioHandles.sunGlow;
    const earthMesh = helioHandles.earthMesh;
    const marsMesh = helioHandles.destinationMesh;
    const earthOrbitLine = helioHandles.earthOrbitLine;
    const applyDestinationVisuals = helioHandles.setDestination;

    // ──────────────────────────────────────────────────────────────
    // Cislunar scene (ADR-058) — Earth-centred, km-scale. Static
    // construction (scene, camera, lights, Earth+Moon meshes, SoI
    // rings) lives in $lib/three/fly-cislunar-scene (W9 wave 8).
    // Layer-toggle subscription stays here because it owns the
    // cleanup contract for onDestroy.
    // ──────────────────────────────────────────────────────────────
    const cislunarHandles = buildCislunarScene({
      aspect: deps.container.clientWidth / deps.container.clientHeight,
      earthTextureUrl: `${base}/textures/2k_earth_daymap.jpg`,
      // __MOBILE__: 4K earth/moon are pruned off-device (ADR-079 D3). Passing
      // undefined makes fly-cislunar-scene skip the LOD upgrade and stay at 2K.
      earthTextureUrl4k: __MOBILE__ ? undefined : `${base}/textures/4k_earth_daymap.jpg`,
      moonTextureUrl: `${base}/textures/2k_moon.jpg`,
      moonTextureUrl4k: __MOBILE__ ? undefined : `${base}/textures/4k_moon.jpg`,
    });
    const cislunarScene = cislunarHandles.scene;
    const cislunarCamera = cislunarHandles.camera;
    const SCALE_CISLUNAR = cislunarHandles.scaleCislunar;
    const cislunarMoon = cislunarHandles.moon;
    const cislunarEarthSoI = cislunarHandles.earthSoI;
    const cislunarMoonSoI = cislunarHandles.moonSoI;

    // ─── Cislunar Science Layers (ADR-058 follow-up) ─────────────────
    // Overlay object construction (gravity / velocity / centripetal
    // arrows + apsides markers + coast line) moved to the scene
    // builder; component owns the per-layer subscriptions and the
    // per-frame position / direction updates.
    const cisGravEarthArrow = cislunarHandles.overlays.gravityEarth;
    const cisGravMoonArrow = cislunarHandles.overlays.gravityMoon;
    const cisVelocityArrow = cislunarHandles.overlays.velocity;
    const cisCentripetalArrow = cislunarHandles.overlays.centripetal;
    const cisPeriMarker = cislunarHandles.overlays.periMarker;
    const cisApoMarker = cislunarHandles.overlays.apoMarker;
    const cisCoastLine = cislunarHandles.overlays.coastLine;

    // The cislunar reactive overlay layer — the science-layer listeners, the
    // per-phase trajectory tubes (+ ensureCislunarPhaseLine + the moon-frame group),
    // the ∆v annotations, the spacecraft marker, and the per-frame updaters — now
    // live in $lib/three/fly-cislunar-reactive (RFC-036 WS-B), byte-identical. The
    // updaters + refs destructure back into the same names the frame loop +
    // mission-swap effect use; live reactive reads (arcTimeline/mission) thread as
    // getter deps. The static overlay refs above stay (the frame loop mutates them).
    const cisReactive = buildCislunarReactiveOverlays({
      scene: cislunarScene,
      moon: cislunarMoon,
      scaleCislunar: SCALE_CISLUNAR,
      earthSoI: cislunarEarthSoI,
      moonSoI: cislunarMoonSoI,
      overlays: cislunarHandles.overlays,
      getArcTimeline: deps.getArcTimeline,
      getMission: deps.getMission,
    });
    const {
      cislunarMoonFrameGroup,
      cislunarSpacecraft,
      cislunarPhaseLines,
      rebuildCislunarLines,
      updateCislunarLineProgress,
      updateCislunarSpacecraft,
      rebuildCislunarAnnotations,
    } = cisReactive;

    // Expose to outer scope so applyMissionAsLoaded can call rebuild
    // when a Moon mission's cislunar_profile lands.
    // Cislunar closures published via flyUpdaters.cislunar at end of onMount.

    // Sun + star field + orbit rings: built by the helio scene builder
    // (W9 wave A); refs already destructured into scope above.

    // v0.6.3 #228 rewrite: ONE tube per leg. The fragment shader paints
    // each fragment bright (visited) if vT < uProgress, dim (preview)
    // otherwise. uProgress is set each frame from outFraction /
    // retFraction. Why this works where the v0.1.10 four-tube +
    // drawRange + vertex-mutation approach didn't:
    //
    //   1. Cross-sections sit at EXACTLY pts[i] (manual builder below,
    //      NOT THREE.TubeGeometry — TubeGeometry sampled the curve via
    //      getPointAt(arc-length) which disagreed with lerpPoint at
    //      uniform-t for Kepler ellipses sampled at uniform true
    //      anomaly; that's what caused the 0.5 → 20.3 scene-unit
    //      sprite-vs-tube-tip gap visible in the v0.6.2 debug log).
    //   2. Each vertex carries `aT = i / (pts.length - 1)`, the same
    //      parameter the sprite uses (sc.pos = lerpPoint(pts, t)).
    //   3. Fragment interpolation of vT crosses uProgress at exactly
    //      the same world position as lerpPoint(pts, uProgress) —
    //      i.e. where the sprite sits. No drift possible by construction.
    // The per-mission helio overlays — trajectory tubes, the spacecraft model
    // (applyMissionSpacecraftModel), the LAUNCH/ARRIVAL/RETURN anchor rings, the
    // moon orbit ring, and the anchor label sprites (refreshSpriteTextures) — now
    // live in $lib/three/fly-helio-mission (RFC-036 WS-B), byte-identical. The refs
    // are assigned into the component-scope `let`s the mission-swap $effects already
    // reference; helioMission.scModel + the two swap methods are read via the handle.
    const helioMission = buildHelioMissionOverlays({ scene, outPts: deps.getOutPts(), retPts: deps.getRetPts() });

    // earthMesh + destination mesh (`marsMesh` for historic reasons),
    // orbit rings, DEST_STYLE catalogue, and the destination-swap
    // method all live in $lib/three/fly-helio-scene (W9 wave A). Refs
    // already destructured from helioHandles above. The historical-
    // Mars arcs visibility toggle is wired via the onDestinationChange
    // callback at builder construction.
    // applyDestinationVisuals published via flyUpdaters.helio at end of onMount.

    // ─── Science Layers G.2 — SoI rings around Earth + Mars ──────────
    // Sized by physical SoI radii (Earth 924 000 km, Mars 577 000 km)
    // mapped through SCALE_3D (1 AU = 80 scene units), so the ring
    // matches the actual transition the spacecraft experiences.
    // SoI radii are tiny at physical scale (Earth's 924 000 km →
    // 0.49 scene units at SCALE_3D=80), invisible at the default
    // camera distance of 360. 8× visual boost keeps the relative
    // proportions correct (Earth SoI > Mars SoI) while making the
    // rings actually readable when the lens is on.
    // Helio reactive overlay layer (SoI rings, gravity/velocity/centripetal arrows,
    // coast line, apsides markers, moon mesh) + its science-layer listeners + the
    // three frame-shared flags (soiLayerOn / cinemaForceMoons / lastLayerMoonsOn)
    // now live in $lib/three/fly-helio-reactive (RFC-036 WS-B) — byte-identical. The
    // mesh refs destructure back into the same names the frame loop already uses; the
    // shared flags stay on `helioReactive` (accessed via the handle in the loop).
    const helioReactive = buildHelioReactiveOverlays({
      scene,
      setHillSpheresVisible: helioHandles.setHillSpheresVisible,
      setLagrangePointsVisible: helioHandles.setLagrangePointsVisible,
      setMagnetospheresVisible: helioHandles.setMagnetospheresVisible,
      setMoonsVisible: helioHandles.setMoonsVisible,
      base,
      getIsMoonMission: deps.getIsMoonMission,
      getActiveDestination: deps.getActiveDestination,
      getSimDay: deps.getSimDay,
      getOutPts: deps.getOutPts,
    });
    const {
      earthSoI,
      marsSoI,
      moonSoI,
      gravArrowEarth,
      gravArrowSun,
      velocityArrow,
      centripetalArrow,
      coastLine,
      moonMesh,
      recomputeApsides,
    } = helioReactive;

    // (The layer listeners, coast line, apsides markers + recomputeApsides, the
    // hill/lagrange/magnetosphere/moons overlays, and the moon mesh all moved into
    // buildHelioReactiveOverlays above — RFC-036 WS-B. The soiLayerOn /
    // cinemaForceMoons / lastLayerMoonsOn flags live on `helioReactive`.)

    // Spacecraft — small camera-facing sprite glyph at sc.pos. Satellite
    // billboard: red rounded body + two gold solar-panel wings + a tiny
    // white antenna stub, surrounded by a soft red glow halo. Rendered
    // as a THREE.Sprite so it's always face-camera — no orbital
    // rotation math, sidestepping the chevron's "wrong direction"
    // problem on curved arcs. The red body preserves the visibility
    // the prior circle gave; the gold wings carry the spacecraft
    // identity, matching the FD banner palette.
    // The glyph drawing + sprite construction now live in buildSpacecraftSprite()
    // ($lib/three/fly-helio-overlays, RFC-036 WS-B/B2a) — byte-identical (same 64px
    // canvas, same scale 2.5 / renderOrder 999 / depthTest:false).
    const { sprite: scSprite } = buildSpacecraftSprite();
    scene.add(scSprite);

    // #1 Engine plume — directed cone at the spacecraft position
    // during burn events. Geometry tip along -Z so THREE.Object3D.lookAt
    // orients tip at any world-space target. Shader paints a base→tip
    // orange→yellow-white gradient with squared falloff toward the tip
    // (visually narrow tapering exhaust). Hidden between burns. Per-
    // event orientation + scale + opacity in the animate loop below.
    // The plume cone + gradient shader now live in buildEnginePlume()
    // ($lib/three/fly-helio-overlays, RFC-036 WS-B/B2a) — byte-identical (same
    // ConeGeometry, same shader, additive, hidden, renderOrder 998). plumeMat's
    // uOpacity + plumeMesh transform are driven per burn-event in the animate loop.
    const { mesh: plumeMesh, material: plumeMat } = buildEnginePlume();
    scene.add(plumeMesh);

    // Camera + cinematic-camera subsystem extracted to
    // $lib/three/fly-camera-controller (RFC-036 WS-B). The controller owns the
    // camera-orbit state + the auto-zoom / cinematic-camera drivers; the frame loop
    // + input handlers read/write its state via the handle (flyCam.camR etc.) and
    // call flyCam.updateCam() / flyCam.panActiveCamera() etc.
    const flyCam = createFlyCameraController({
      camera,
      cislunarCamera,
      cislunarSpacecraft,
      cislunarHandles,
      helioHandles,
      helioReactive,
      cine: deps.cine,
      getSimDay: deps.getSimDay,
      getSimSpeed: deps.getSimSpeed,
      getViewMode: deps.getViewMode,
      getIsMoonMission: deps.getIsMoonMission,
      getActiveDestination: deps.getActiveDestination,
      getMission: deps.getMission,
      getArcTimeline: deps.getArcTimeline,
      getOutPts: deps.getOutPts,
      getRetPts: deps.getRetPts,
      getCislunarTrajectory: deps.getCislunarTrajectory,
      getEpilogueActive: deps.getEpilogueActive,
      getOpeningActive: deps.getOpeningActive,
      getOpeningStartedAt: deps.getOpeningStartedAt,
      getOpeningDurationMs: deps.getOpeningDurationMs,
      getCamSnapUntil: deps.getCamSnapUntil,
      getCurrentDestMeshId: deps.getCurrentDestMeshId,
      setCurrentDestMeshId: deps.setCurrentDestMeshId,
      getFlyUpdaters: deps.getFlyUpdaters,
    });
  return {
    helioHandles,
    scene,
    camera,
    baseFov,
    renderer,
    sunCore,
    sunGlow,
    earthMesh,
    marsMesh,
    earthOrbitLine,
    applyDestinationVisuals,
    cislunarHandles,
    cislunarScene,
    cislunarCamera,
    SCALE_CISLUNAR,
    cislunarMoon,
    cislunarEarthSoI,
    cislunarMoonSoI,
    cisGravEarthArrow,
    cisGravMoonArrow,
    cisVelocityArrow,
    cisCentripetalArrow,
    cisPeriMarker,
    cisApoMarker,
    cisCoastLine,
    cisReactive,
    cislunarMoonFrameGroup,
    cislunarSpacecraft,
    cislunarPhaseLines,
    rebuildCislunarLines,
    updateCislunarLineProgress,
    updateCislunarSpacecraft,
    rebuildCislunarAnnotations,
    helioMission,
    helioReactive,
    earthSoI,
    marsSoI,
    moonSoI,
    gravArrowEarth,
    gravArrowSun,
    velocityArrow,
    centripetalArrow,
    coastLine,
    moonMesh,
    recomputeApsides,
    scSprite,
    plumeMesh,
    plumeMat,
    flyCam,
  };
}
