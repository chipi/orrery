/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from 'three';
import { goto, replaceState } from '$app/navigation';
import { createAnimateLoop } from '$lib/three/animate-loop';
import { disposeScene } from '$lib/three/dispose-object3d';
import { buildIconicTrajectory, type IconicTrajectoryData } from '$lib/three/iconic-trajectory';
import {
  ContextGraph,
  SOLAR_SYSTEM_CONTEXT,
  NEIGHBORHOOD_CONTEXT,
  MILKY_WAY_CONTEXT,
  LOCAL_GROUP_CONTEXT,
  makeBodyContext,
  bodyContextId,
  AU_PER_PARSEC,
} from '$lib/universe/context-graph';
import { contextLevel, isValidShellTarget } from '$lib/explore/scale-shell-controller';
import { describeDistanceAu, niceScaleBar, AU_PER_PC } from '$lib/universe/scale-readout';
import { deepSkyRung, type DeepSkyRung } from '$lib/universe/deep-sky-lod';
import { gravityAccel, logScaleLength, BODY_MASS_KG } from '$lib/orbit-overlays';
import { PLANETS } from '$lib/explore-scene';
import { auToPx } from '$lib/scale';
import { gyro } from '$lib/sensory/device-orientation';
import { cue } from '$lib/sensory/feedback';
import { getLocale } from '$lib/paraglide/runtime';
import * as m from '$lib/paraglide/messages';
import { localeFromPage } from '$lib/locale';
import { assetOrigin } from '$lib/asset-url';
import { trackItemClick } from '$lib/analytics';
import { exhibit } from '$lib/exhibit.svelte';
import type { BodyScene } from '$lib/universe/body-scene';
import type { NeighborhoodScene } from '$lib/universe/neighborhood-scene';
import {
  getBlackHole,
  getCultureDoors,
  getCultureObjectIds,
  getDeepSkyGallery,
  getDeepSkyObjects,
  getExoplanetI18n,
  getExoplanetSystem,
  getExoplanetSystems,
  getLocalGroup,
  getMilkyWaySchematic,
  getNamedStarI18n,
  getNamedStars,
  type DeepSkyObject,
  type ExoplanetSystem,
  type LocalGroupMember,
  type NamedStar,
} from '$lib/data';

/**
 * `/explore` 3D scene host (RFC-036 WS-C/C2b — the whole onMount teardown).
 *
 * Everything after the renderer + solar-system setup — camera state + updateCam, the
 * per-frame animate loop + draw2d, all 3D + 2D pointer/pick/hover input, and the
 * scale-shell orchestration (ensure / cross for neighborhood, milky-way, local-group,
 * black-hole, body scenes; the deep-link cold-load resolvers; causality / HR / deep-sky)
 * — lifted VERBATIM from the explore/+page.svelte onMount. The frame + handlers read AND
 * write component $state the template binds to, so those thread through `bridge` (get/set
 * accessors; the `last*` deep-link guards ride along so the page's URL $effects stay in
 * sync). Every scene ref / handle / helper passes by reference via `deps`. The fn-pointers
 * the page's template + $effects call return on the handle. Byte-identical to inline.
 */
export function createExploreSceneHost(bridge: any, deps: any) {
  const {
    scene,
    camera,
    renderer,
    composer,
    lifecycle,
    quality,
    base,
    _orbitUp,
    _velTangent,
    bloomPass,
    sunMap4k,
    sunMesh,
    updateSunLod,
    PLANET_LOD_IN_RATIO,
    PLANET_LOD_OUT_RATIO,
    frameMonitor,
    SMALL_BODIES,
    sampleOrbitPoints,
    smallBodyById,
    smallBodyPosition,
    DAYS_PER_YEAR,
    fmtScale,
    iconic,
    sizePathsLegend,
    selectSun,
    selectPlanet,
    selectSmallBody,
    selectSatellite,
    selectBelt,
    asteroidBeltPick,
    kuiperBeltPick,
    localGroup,
    overlayPerPlanet,
    planetObjs,
    planetOrbitLines,
    selHalo,
    selRingMat,
    smallBodyObjs,
    tmpWorldPos,
    updatePlanetLods,
    updateSatellites,
    stopExploreCentripetalLayer,
    stopExploreGalaxiesLayer,
    stopExploreGravityLayer,
    stopExploreHillSphereLayer,
    stopExploreLagrangeLayer,
    stopExploreMagnetosphereLayer,
    stopExploreSubSolarLayer,
    stopExploreVelocityLayer,
    stopLensWatch,
    stopHoverLayerWatch,
  } = deps;
  let iconicTrajectoryHandles: any = [];
  let closeExoplanetFn: any = null;
  let resetSimToToday: any = null;
  let enterSystemFn: any = null;
  let setConstellationsFn: any = null;
  let setDeepSkyFn: any = null;
  let toggleHrFn: any = null;
  let openCausalityFn: any = null;
  let exitDeepSkyFn: any = null;
  let deepSkyGatewayFn: any = null;
  let deepSkyDeepLinkFn: any = null;
  let flyToBodyFn: any = null;
  let exitNeighborhoodFn: any = null;
  let resetNeighborhoodFn: any = null;
  let resetMilkyWayFn: any = null;
  let resetLocalGroupFn: any = null;
  let exitBodySceneFn: any = null;
  let exitMilkyWayFn: any = null;
  let closeMwFn: any = null;
  let mwDeepLinkFn: any = null;
  let contextDeepLinkFn: any = null;
  let exitLocalGroupFn: any = null;
  let closeLgFn: any = null;
  let exitBlackHoleFn: any = null;
  let bhDeepLinkFn: any = null;
  let setBhCurvatureFn: any = null;
  let selectStarFn: any = null;
  let closeStarFn: any = null;
  let selectDeepSkyFn: any = null;
  let gotoStarFn: any = null;
  let indexSelectStarFn: any = null;
  let tourCameraTeardown: any = null;
    let camR = 680;
    let camP = 1.05;
    let camT = 0.6;
    // Focus origin — the point the camera orbits + looks at. Heliocentric
    // by default (Sun at origin); when the user picks a planet, this
    // tweens to that planet's world position so wheel/pinch zoom +
    // drag-orbit become planet-relative. The per-planet 4K LOD swap
    // (#287) reads camera→planet distance, so planet-relative camR is
    // what makes the 4K texture fire for anything past Mercury.
    const focusOrigin = new THREE.Vector3(0, 0, 0);
    // Scratch + throttle for the Sun-compass projection (see sunCompass state).
    const _sunNdc = new THREE.Vector3();
    let sunCompassTick = 0;
    // Per-mode zoom envelope. Heliocentric is the original [60, 1400].
    // When focused on a planet, the floor drops to ~1.5 × planet
    // radius (close enough that the camera grazes the LOD threshold
    // at 4 × radius and digs well inside it for the 4K view) and the
    // ceiling caps at 50× radius so the user can pan outward without
    // accidentally re-entering heliocentric framing.
    let camRMin = 60;
    // Solar-system zoom-out ceiling (AU). Also the OUT crossing distance into the
    // Stellar Neighborhood (HELIO_CAM_R_MAX below). Raised from 1400 so you can
    // zoom out further — toward the ~3000 AU sky shell, within SOLAR_FAR (~8000)
    // — before the scene swaps. Tune to taste; NB_CAM_R_MIN derives from it so
    // the return crossing stays at the same physical distance.
    let camRMax = 2400;
    // Default heliocentric pose — captured once so the Reset View
    // button can fly back to a stable known framing.
    const HELIO_DEFAULT_CAMR = 680;
    const HELIO_DEFAULT_CAMP = 1.05;
    const HELIO_DEFAULT_CAMT = 0.6;

    const updateCam = () => {
      camera.position.set(
        focusOrigin.x + camR * Math.sin(camP) * Math.sin(camT),
        focusOrigin.y + camR * Math.cos(camP),
        focusOrigin.z + camR * Math.sin(camP) * Math.cos(camT),
      );
      camera.lookAt(focusOrigin);
    };
    updateCam();

    // ── /explore v2 boundary crossing (PRD-030 / RFC-032 · Slice 0) ──────────
    // Zoom out to the heliocentric ceiling, then scroll once more to *leave the
    // solar system*: the scene swaps to the real HYG stellar neighborhood (its
    // own pc-scaled context), the Sun collapses to a dot, the star field fades
    // in. Scroll back in past the inner edge to return. v1's zoom range + render
    // path are unchanged — the neighborhood is a second scene, loaded lazily.
    const contextGraph = new ContextGraph(
      [SOLAR_SYSTEM_CONTEXT, NEIGHBORHOOD_CONTEXT, MILKY_WAY_CONTEXT, LOCAL_GROUP_CONTEXT],
      'solar-system',
    );
    let nbScene: NeighborhoodScene | null = null;
    let nbLoading = false;
    const HELIO_CAM_R_MAX = camRMax; // 1400 AU — the v1 heliocentric ceiling
    const NB_ENTRY_CAM_R = 0.05; // pc — entry framing just outside the Sun
    // The return (neighborhood → solar-system) crossing distance. Derived from
    // the OUT ceiling so IN and OUT happen at the SAME physical distance (no
    // hysteresis gap): HELIO_CAM_R_MAX AU expressed in pc.
    const NB_CAM_R_MIN = HELIO_CAM_R_MAX / AU_PER_PARSEC; // pc (= HELIO_CAM_R_MAX AU)
    const NB_CAM_R_MAX = 60; // pc
    const NB_FAR = 1500; // pc — neighborhood far plane
    const SOLAR_FAR = camera.far; // 8000 AU

    // Slice 5 — the Milky Way schematic (nominal scene units; not to scale).
    let mwScene: import('$lib/universe/milky-way-scene').MilkyWayScene | null = null;
    let mwLoading = false;
    const MW_SCENE_RADIUS = 340; // matches MW_DISK_RADIUS_SCENE
    // Frame the bright spiral to fill the view (most of MW_SCENE_RADIUS is faint
    // halo, so 1.7× left the disk small + islanded in dead space). 1.12× brings the
    // spiral up to fill the screen like the solar system does on default /explore.
    const MW_ENTRY_CAM_R = MW_SCENE_RADIUS * 1.12;
    // Zoom-in floor → cross back to the neighborhood. Raised from 0.35 toward the
    // 1.7 entry so the return is much easier: you drop back after a modest zoom-in
    // rather than diving almost to the galactic centre. Tunable (trades away some
    // deep-disk zoom for reversibility — the asymmetry feedback).
    const MW_CAM_R_MIN = MW_SCENE_RADIUS * 0.55;
    const MW_CAM_R_MAX = MW_SCENE_RADIUS * 4; // zoom-out ceiling
    const MW_FAR = MW_SCENE_RADIUS * 12;
    const MW_ENTRY_CAM_P = 0.8; // polar angle — a little more face-on so the spiral fills + centres

    const inNeighborhood = () => contextGraph.active.id === 'neighborhood';
    const inMilkyWay = () => contextGraph.active.id === 'milky-way';

    // Slice 6 — the geodesic black-hole render is a full-screen takeover (like the
    // deep-sky immersion), rendered with its own scene + ortho camera on top of
    // whatever context you came from. Entered by pin / Sag A* / ?bh=; exit restores.
    let bhScene: import('$lib/universe/black-hole-scene').BlackHoleScene | null = null;
    let bhLoading = false;
    let bhLastFrame = 0;
    async function enterBlackHole(id: string): Promise<void> {
      if (bhLoading) return;
      bhLoading = true;
      try {
        const hole = await getBlackHole(id, fetch);
        if (!hole) return;
        const mod = await import('$lib/universe/black-hole-scene');
        bhScene?.dispose();
        bhScene = mod.createBlackHoleScene(hole, quality.tier);
        bhScene.setSize(
          bridge.container?.clientWidth ?? 1,
          bridge.container?.clientHeight ?? 1,
          renderer.getPixelRatio(),
        );
        bhScene.setCurvature(bridge.bhCurvatureLens ? 1 : 0);
        bhLastFrame = performance.now();
        bridge.activeBlackHole = hole;
        bridge.bhPanelOpen = true;
        bridge.bhCultureDoors = [];
        if (hole.culture_door) {
          void getCultureDoors(hole.id, getLocale(), fetch).then((d) => {
            if (bridge.activeBlackHole?.id === hole.id) bridge.bhCultureDoors = d;
          });
        }
        closeStarPanel();
        bridge.anonStar = null;
        cue('select');
        trackItemClick('marker', id, '/explore');
        if (!deps.getReducedMotion()) bridge.crossingFlashId++;
      } catch (err) {
        console.error('[explore v2] black hole load failed', err);
      } finally {
        bhLoading = false;
      }
    }
    function exitBlackHole(): void {
      if (!bridge.activeBlackHole) return;
      if (!deps.getReducedMotion()) bridge.crossingFlashId++;
      bhScene?.dispose();
      bhScene = null;
      bridge.activeBlackHole = null;
      bridge.bhPanelOpen = false;
      bridge.bhCurvatureLens = false;
      bridge.bhTimeLens = false;
    }

    async function ensureMilkyWay(): Promise<typeof mwScene> {
      if (mwScene) return mwScene;
      if (mwLoading) return null;
      mwLoading = true;
      try {
        const [mod, data] = await Promise.all([
          import('$lib/universe/milky-way-scene'),
          getMilkyWaySchematic(fetch),
        ]);
        if (!data) return null;
        bridge.mwObjects = data.objects;
        // Cinematic bloom — reuse the device quality tier's bloom budget so it
        // scales gracefully (disabled on minimal/low, stronger on cinematic).
        mwScene = mod.createMilkyWayScene(data, {
          enabled: quality.bloomEnabled,
          strength: Math.min(0.5, Math.max(0.32, quality.bloomStrength)),
          radius: 0.6,
          threshold: 0.62,
        });
        const w = bridge.container?.clientWidth ?? 1;
        const h = bridge.container?.clientHeight ?? 1;
        mwScene.setSize(w, h);
        return mwScene;
      } catch (err) {
        console.error('[explore v2] milky way load failed', err);
        return null;
      } finally {
        mwLoading = false;
      }
    }

    // Slice 8 — the Local Group schematic (nominal scene units; not to scale).
    let lgScene: import('$lib/universe/local-group-scene').LocalGroupScene | null = null;
    let lgLoading = false;
    let lgMembers: LocalGroupMember[] = [];
    // Camera framing params — placeholder defaults; ensureLocalGroup() overwrites all
    // of these from the scene's real LG_SCENE_RADIUS before any crossing reads them
    // (crossOutToLocalGroup awaits ensureLocalGroup first), so the defaults never ship.
    let LG_SCENE_RADIUS = 150;
    let LG_ENTRY_CAM_R = 306;
    let LG_ENTRY_CAM_R_MOBILE = 500;
    let LG_CAM_R_MIN = 200;
    let LG_CAM_R_MAX = 900;
    let LG_FAR = 6000;
    const LG_ENTRY_CAM_P = 0.85; // a little more face-on so the group fills + centres
    const inLocalGroup = () => contextGraph.active.id === 'local-group';

    async function ensureLocalGroup(): Promise<typeof lgScene> {
      if (lgScene) return lgScene;
      if (lgLoading) return null;
      lgLoading = true;
      try {
        const [mod, data] = await Promise.all([
          import('$lib/universe/local-group-scene'),
          getLocalGroup(fetch),
        ]);
        if (!data) return null;
        lgMembers = data.members;
        LG_SCENE_RADIUS = mod.LG_SCENE_RADIUS;
        // Frame the group to fill the view (was 2.04× — small + islanded in dead
        // space, like the Milky Way before its reframe).
        LG_ENTRY_CAM_R = LG_SCENE_RADIUS * 1.35;
        LG_ENTRY_CAM_R_MOBILE = LG_SCENE_RADIUS * 2.0;
        LG_CAM_R_MIN = LG_SCENE_RADIUS * 0.75; // zoom-in floor → cross back to the galaxy
        LG_CAM_R_MAX = LG_SCENE_RADIUS * 6; // zoom-out ceiling (outermost for now)
        LG_FAR = LG_SCENE_RADIUS * 40;
        lgScene = mod.createLocalGroupScene(data, {
          enabled: quality.bloomEnabled,
          strength: Math.min(0.36, Math.max(0.28, quality.bloomStrength)),
          radius: 0.62,
          threshold: 0.7,
        });
        lgScene.setSize(bridge.container?.clientWidth ?? 1, bridge.container?.clientHeight ?? 1);
        return lgScene;
      } catch (err) {
        console.error('[explore v2] local group load failed', err);
        return null;
      } finally {
        lgLoading = false;
      }
    }

    async function ensureNeighborhood(): Promise<NeighborhoodScene | null> {
      if (nbScene) return nbScene;
      if (nbLoading) return null;
      nbLoading = true;
      try {
        const mod = await import('$lib/universe/neighborhood-scene');
        const [shells, stars, constellations, exoSystems, deepSky, dsGallery, cultureIds] =
          await Promise.all([
            mod.loadNeighborhoodShells(fetch, base),
            getNamedStars(fetch),
            mod.loadConstellationLines(fetch, base),
            getExoplanetSystems(fetch),
            getDeepSkyObjects(fetch),
            getDeepSkyGallery(fetch),
            getCultureObjectIds(fetch),
          ]);
        bridge.cultureObjectIds = cultureIds;
        // Exoplanet hosts that aren't in the curated named-star catalog (dim /
        // telescope-only stars like TRAPPIST-1, TOI-700, Kepler-16, 51 Pegasi)
        // still carry a name + 3D position in the systems file — synthesize marker
        // records from that so all 11 systems are clickable + zoom-descendable, not
        // just the 7 that happen to be famous naked-eye stars.
        const namedIds = new Set(stars.map((s) => s.id));
        const hostMarkers: NamedStar[] = exoSystems
          .filter((s) => !namedIds.has(s.hostId))
          .map((s) => ({
            id: s.hostId,
            hip: s.hip ?? null,
            proper: s.star.name,
            con: s.star.con,
            spect: s.star.spect,
            dist_pc: s.star.dist_pc,
            mag: 12, // dim — label on hover/select, not always-on
            absmag: 12,
            bv: s.star.bv, // may be null → neutral swatch downstream
            x: s.star.x,
            y: s.star.y,
            z: s.star.z,
          }));
        const allStars = [...stars, ...hostMarkers];
        bridge.namedStars = allStars;
        bridge.exoplanetHostIds = new Set(exoSystems.map((s) => s.hostId));
        bridge.exoplanetSystemsById = new Map(exoSystems.map((s) => [s.hostId, s]));
        // Slice 7 — flatten every planet with a known mass for the mass–period plot.
        bridge.allExoplanetPlanets = exoSystems.flatMap((s) =>
          s.planets
            .filter((p) => p.mass_earth != null && p.period_days > 0)
            .map((p) => ({
              name: p.name,
              periodDays: p.period_days,
              massEarth: p.mass_earth as number,
              hostId: s.hostId,
            })),
        );
        bridge.deepSkyObjects = deepSky;
        bridge.deepSkyGallery = dsGallery;
        nbScene = mod.createNeighborhoodScene({
          shells,
          tier: quality.tier,
          pixelRatio: renderer.getPixelRatio(),
          namedStars: allStars,
          hostIds: bridge.exoplanetHostIds,
          constellations,
          deepSkyObjects: deepSky,
        });
        nbScene.setConstellationsVisible(bridge.showConstellations);
        nbScene.setDeepSkyVisible(bridge.showDeepSky);
        nbScene.setSize(
          bridge.container?.clientWidth ?? window.innerWidth,
          bridge.container?.clientHeight ?? window.innerHeight,
        );
        return nbScene;
      } catch (err) {
        console.error('[explore v2] neighborhood load failed', err);
        return null;
      } finally {
        nbLoading = false;
      }
    }

    // Deep-sky approach tween (Slice 4) — render-loop-driven ramp 0→1 that blooms
    // the focused glint + fades in the full-frame immersive photo.
    let dsApproachActive = false;
    let dsApproachStart = 0;
    const DS_APPROACH_MS = 1400;
    let dsRung: DeepSkyRung = 'none';

    // Crossing polish: a brief eased pull-back (so the reveal plays as a
    // continuous zoom, not a jump) + a warp flash to mask the scene cut. Both
    // are skipped under prefers-reduced-motion (ADR-025).
    let dollyActive = false;
    let dollyFrom = 0;
    let dollyTo = 0;
    let dollyStart = 0;
    let dollyMs = 0;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const startCrossDolly = (from: number, to: number, ms: number) => {
      dollyActive = true;
      dollyFrom = from;
      dollyTo = to;
      dollyStart = performance.now();
      dollyMs = ms;
    };
    const stepCrossDolly = () => {
      if (!dollyActive) return;
      const t = Math.min(1, (performance.now() - dollyStart) / dollyMs);
      camR = dollyFrom + (dollyTo - dollyFrom) * easeOutCubic(t);
      updateCam();
      if (t >= 1) dollyActive = false;
    };

    async function crossOutToNeighborhood(): Promise<void> {
      if (inNeighborhood()) return;
      const scene = await ensureNeighborhood();
      if (!scene) return; // load failed — stay in the solar system
      contextGraph.setActive('neighborhood');
      camRMin = NB_CAM_R_MIN;
      camRMax = NB_CAM_R_MAX;
      camera.far = NB_FAR;
      camera.near = 0.001;
      camera.updateProjectionMatrix();
      if (deps.getReducedMotion()) {
        camR = NB_ENTRY_CAM_R;
      } else {
        // Enter close (Sun still large), then dolly out so the field fades in
        // with motion.
        camR = 0.035;
        startCrossDolly(0.035, 0.32, 1100);
        bridge.crossingFlashId++;
      }
      updateCam();
    }

    function crossInToSolarSystem(): void {
      if (!inNeighborhood()) return;
      dollyActive = false;
      if (!deps.getReducedMotion()) bridge.crossingFlashId++;
      contextGraph.setActive('solar-system');
      camRMin = 60;
      camRMax = HELIO_CAM_R_MAX;
      camR = HELIO_CAM_R_MAX;
      camera.far = SOLAR_FAR;
      camera.near = 0.5;
      camera.updateProjectionMatrix();
      updateCam();
      // Leaving the neighborhood clears any star selection.
      closeStarPanel();
      bridge.anonStar = null;
    }
    exitNeighborhoodFn = crossInToSolarSystem;

    // Zoom-in past the neighborhood floor descends into whatever star is focused:
    // a selected non-Sol exoplanet host → its planetary system; the Sun or nothing
    // selected → our own solar system; a focused star with no known planets has
    // nothing to descend into, so the caller clamps at the floor. Returns true iff
    // a descent/cross actually fired.
    function descendFromNeighborhood(): boolean {
      const sel = bridge.selectedStarId;
      if (sel && sel !== 'sol' && bridge.exoplanetHostIds.has(sel)) {
        void enterBodyScene(sel);
        return true;
      }
      if (!sel || sel === 'sol') {
        crossInToSolarSystem();
        return true;
      }
      return false;
    }

    // Neighborhood "Reset view": recentre on the Sun (undo any pan), return to a
    // stable framed distance, and clear the selection — without leaving the scale.
    const NB_DEFAULT_CAM_R = 12;
    const NB_DEFAULT_CAM_P = 1.05;
    const NB_DEFAULT_CAM_T = 0.6;
    function resetNeighborhoodView(): void {
      if (!inNeighborhood()) return;
      dollyActive = false;
      focusOrigin.set(0, 0, 0);
      camP = NB_DEFAULT_CAM_P;
      camT = NB_DEFAULT_CAM_T;
      camR = Math.max(camRMin, Math.min(camRMax, NB_DEFAULT_CAM_R));
      closeStarPanel();
      bridge.anonStar = null;
      updateCam();
    }
    resetNeighborhoodFn = resetNeighborhoodView;

    function resetMilkyWayView(): void {
      if (!inMilkyWay()) return;
      dollyActive = false;
      focusOrigin.set(0, 0, 0);
      camP = MW_ENTRY_CAM_P;
      camR = Math.max(camRMin, Math.min(camRMax, MW_ENTRY_CAM_R));
      closeMwPanel();
      updateCam();
    }
    resetMilkyWayFn = resetMilkyWayView;

    function resetLocalGroupView(): void {
      if (!inLocalGroup()) return;
      dollyActive = false;
      focusOrigin.set(0, 0, 0);
      camP = LG_ENTRY_CAM_P;
      camR = Math.max(camRMin, Math.min(camRMax, LG_ENTRY_CAM_R));
      closeLgPanel();
      updateCam();
    }
    resetLocalGroupFn = resetLocalGroupView;

    // ── Milky Way context (Slice 5) — zoom out of the neighborhood into the
    // galaxy. The schematic is not to scale, so this is a warp framing (nominal
    // units), mirroring the BodyScene entry rather than a physical re-base. ──
    async function crossOutToMilkyWay(): Promise<void> {
      if (inMilkyWay()) return;
      const scene = await ensureMilkyWay();
      if (!scene) return; // load failed — stay in the neighborhood
      contextGraph.setActive('milky-way');
      bridge.contextId = 'milky-way'; // flip chrome immediately, ahead of the HUD tick
      camRMin = MW_CAM_R_MIN;
      camRMax = MW_CAM_R_MAX;
      camera.far = MW_FAR;
      camera.near = 1;
      camera.updateProjectionMatrix();
      camP = MW_ENTRY_CAM_P; // tilt to a face-on 3/4 view of the disk
      closeStarPanel();
      bridge.anonStar = null;
      if (deps.getReducedMotion()) {
        camR = MW_ENTRY_CAM_R;
      } else {
        camR = MW_SCENE_RADIUS * 1.8;
        startCrossDolly(MW_SCENE_RADIUS * 1.8, MW_ENTRY_CAM_R, 1300);
        bridge.crossingFlashId++;
        showWarpCaption(`${(26700).toLocaleString()} ${m.explore_light_years()} · Sagittarius A*`);
      }
      updateCam();
    }

    function crossInToNeighborhood(): void {
      if (!inMilkyWay()) return;
      dollyActive = false;
      if (!deps.getReducedMotion()) bridge.crossingFlashId++;
      bridge.mwPanelOpen = false;
      bridge.selectedMwId = null;
      mwScene?.highlight(null);
      contextGraph.setActive('neighborhood');
      bridge.contextId = 'neighborhood'; // flip chrome immediately
      camRMin = NB_CAM_R_MIN;
      camRMax = NB_CAM_R_MAX;
      camR = NB_CAM_R_MAX; // re-enter at the neighborhood's outer edge
      camera.far = NB_FAR;
      camera.near = 0.001;
      camera.updateProjectionMatrix();
      updateCam();
    }
    exitMilkyWayFn = crossInToNeighborhood;

    // ── Slice 8: MilkyWay ↔ Local Group crossing ─────────────────────────────
    // Zoom out past the galaxy's ceiling and the Milky Way collapses to one member
    // of the Local Group schematic; zoom back in past the inner edge (or tap the
    // crumb) to drop back into the galaxy. Same machinery as the MW crossing.
    async function crossOutToLocalGroup(): Promise<void> {
      if (inLocalGroup()) return;
      const scene = await ensureLocalGroup();
      if (!scene) return; // load failed — stay in the Milky Way
      bridge.mwPanelOpen = false;
      bridge.selectedMwId = null;
      mwScene?.highlight(null);
      contextGraph.setActive('local-group');
      bridge.contextId = 'local-group'; // flip chrome immediately
      camRMin = LG_CAM_R_MIN;
      camRMax = LG_CAM_R_MAX;
      camera.far = LG_FAR;
      camera.near = 1;
      camera.updateProjectionMatrix();
      camP = LG_ENTRY_CAM_P;
      const portrait = (bridge.container?.clientHeight ?? 0) > (bridge.container?.clientWidth ?? 1);
      const entryR = portrait ? LG_ENTRY_CAM_R_MOBILE : LG_ENTRY_CAM_R;
      if (deps.getReducedMotion()) {
        camR = entryR;
      } else {
        camR = entryR * 1.3;
        startCrossDolly(entryR * 1.3, entryR, 1300);
        bridge.crossingFlashId++;
        showWarpCaption(`${(2540000).toLocaleString()} ${m.explore_light_years()} · Andromeda`);
      }
      updateCam();
    }

    function crossInToMilkyWay(): void {
      if (!inLocalGroup()) return;
      dollyActive = false;
      if (!deps.getReducedMotion()) bridge.crossingFlashId++;
      bridge.lgPanelOpen = false;
      bridge.selectedLgMember = null;
      lgScene?.highlight(null);
      contextGraph.setActive('milky-way');
      bridge.contextId = 'milky-way'; // flip chrome immediately
      camRMin = MW_CAM_R_MIN;
      camRMax = MW_CAM_R_MAX;
      camR = MW_CAM_R_MAX; // re-enter at the galaxy's outer edge
      camera.far = MW_FAR;
      camera.near = 1;
      camera.updateProjectionMatrix();
      camP = MW_ENTRY_CAM_P;
      updateCam();
    }
    exitLocalGroupFn = crossInToMilkyWay;

    // ── Exoplanet BodyScene (Slice 2) ────────────────────────────────────────
    // Descend from the neighborhood into a host star's mini-orrery via a 1–2 s
    // cinematic Navigator warp; zoom out or tap the crumb to return.
    let bodyScene: BodyScene | null = null;
    let bodyHostIdLocal: string | null = null;
    let currentBodySystem: ExoplanetSystem | null = null;
    let bodySimYears = 0;
    let bodyRate = 0; // years per frame — set per-system so the outer planet orbits in ~12 s
    const inBodyScene = () => contextGraph.active.id.startsWith('body-scene:');
    const BODY_FAR = 4000;
    let warpCaptionTimer: ReturnType<typeof setTimeout> | null = null;
    const showWarpCaption = (text: string) => {
      bridge.warpCaption = text;
      if (warpCaptionTimer) clearTimeout(warpCaptionTimer);
      warpCaptionTimer = setTimeout(() => (bridge.warpCaption = ''), 1800);
    };

    async function enterBodyScene(hostId: string, planetId?: string): Promise<void> {
      const system = await getExoplanetSystem(hostId, fetch);
      if (!system) return;
      // Ensure the neighborhood is loaded so exiting the system renders the field.
      await ensureNeighborhood();
      if (bodyScene) {
        bodyScene.dispose();
        bodyScene = null;
      }
      if (bodyHostIdLocal) contextGraph.remove(bodyContextId(bodyHostIdLocal));
      const mod = await import('$lib/universe/body-scene');
      bodyScene = mod.createBodyScene(system);
      bodyHostIdLocal = hostId;
      currentBodySystem = system;
      bodySimYears = 0;
      const fr = bodyScene.framingRadius;
      contextGraph.register(makeBodyContext(hostId, fr));
      contextGraph.setActive(bodyContextId(hostId));
      bridge.contextId = 'body-scene'; // flip chrome immediately, ahead of the throttled HUD tick
      bridge.bodyHostName = system.star.name;
      bridge.activeBodyHostId = hostId;
      const maxPeriodYears = Math.max(...system.planets.map((p) => p.period_days)) / 365.25;
      bodyRate = maxPeriodYears / (12 * 60); // outer planet ≈ 12 s per orbit at 60 fps
      camRMin = fr * 0.2;
      camRMax = fr * 4;
      camera.far = BODY_FAR;
      camera.near = 0.05;
      camera.updateProjectionMatrix();
      closeStarPanel();
      bridge.anonStar = null;
      cue('select');
      if (deps.getReducedMotion()) {
        camR = fr * 2.2;
      } else {
        camR = fr * 3.6;
        startCrossDolly(fr * 3.6, fr * 2.0, 1300);
        bridge.crossingFlashId++;
        showWarpCaption(
          `${(system.star.dist_pc * 3.2615638).toFixed(2)} ${m.explore_light_years()} · ${system.star.name}`,
        );
      }
      updateCam();
      if (planetId) selectExoplanet(planetId);
    }

    function exitBodyScene(): void {
      if (!inBodyScene()) return;
      dollyActive = false;
      if (!deps.getReducedMotion()) bridge.crossingFlashId++;
      const hid = bodyHostIdLocal;
      contextGraph.setActive('neighborhood');
      bridge.contextId = 'neighborhood'; // flip chrome immediately, ahead of the HUD tick
      if (hid) contextGraph.remove(bodyContextId(hid));
      if (bodyScene) {
        bodyScene.dispose();
        bodyScene = null;
      }
      bodyHostIdLocal = null;
      bridge.bodyHostName = '';
      bridge.activeBodyHostId = null;
      bridge.massPeriodOpen = false;
      currentBodySystem = null;
      bridge.selectedExoplanet = null;
      bridge.panelState.exoplanet = false;
      camRMin = NB_CAM_R_MIN;
      camRMax = NB_CAM_R_MAX;
      camera.far = NB_FAR;
      camera.near = 0.001;
      camera.updateProjectionMatrix();
      camR = 0.32;
      updateCam();
    }
    enterSystemFn = (hostId: string, planetId?: string) => void enterBodyScene(hostId, planetId);
    exitBodySceneFn = exitBodyScene;

    function selectExoplanet(planetId: string): void {
      const planet = currentBodySystem?.planets.find((p) => p.id === planetId);
      if (!planet || !currentBodySystem) return;
      cue('select');
      bridge.selectedExoplanet = { planet, hostName: currentBodySystem.star.name, overlay: null };
      bridge.panelState.exoplanet = true;
      bridge.panelState.star = false;
      bridge.panelState.planet = false;
      bridge.panelState.sun = false;
      bridge.panelState.smallBody = false;
      bridge.panelState.satellite = false;
      bridge.panelState.belt = false;
      bodyScene?.highlightPlanet(planetId);
      const forId = planetId;
      void getExoplanetI18n(getLocale(), planetId, fetch).then((overlay) => {
        if (bridge.selectedExoplanet?.planet.id === forId) {
          bridge.selectedExoplanet = { ...bridge.selectedExoplanet, overlay };
        }
      });
      bridge.exoCultureDoors = [];
      void getCultureDoors(planetId, getLocale(), fetch).then((d) => {
        if (bridge.selectedExoplanet?.planet.id === forId) bridge.exoCultureDoors = d;
      });
    }
    closeExoplanetFn = () => {
      bridge.panelState.exoplanet = false;
      bridge.selectedExoplanet = null;
      bodyScene?.highlightPlanet(null);
    };

    function pickBodyScene(e: { clientX: number; clientY: number }): void {
      if (!bodyScene) return;
      const rect = el3d.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray3d.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const hits = ray3d.intersectObjects(bodyScene.planetPickables, false);
      const id = hits[0]?.object.userData.planetId as string | undefined;
      if (id) selectExoplanet(id);
    }

    // ── Named-star selection (Slice 1) ──────────────────────────────────────
    async function selectStar(id: string): Promise<void> {
      const base = bridge.namedStarById.get(id);
      if (!base) return;
      cue('select');
      bridge.selectedStarId = id;
      bridge.starCultureDoors = [];
      void getCultureDoors(id, getLocale(), fetch).then((d) => {
        if (bridge.selectedStarId === id) bridge.starCultureDoors = d;
      });
      bridge.panelState.star = true;
      bridge.panelState.planet = false;
      bridge.panelState.sun = false;
      bridge.panelState.smallBody = false;
      bridge.panelState.satellite = false;
      bridge.panelState.belt = false;
      bridge.anonStar = null;
      nbScene?.highlightStar(id);
      trackItemClick('star', id, '/explore');
      const overlay = await getNamedStarI18n(getLocale(), id, fetch);
      // Guard against a race if the user picked another star meanwhile.
      if (bridge.selectedStarId === id) bridge.localizedStar = { ...base, ...(overlay ?? {}) };
    }
    function closeStarPanel(): void {
      bridge.panelState.star = false;
      bridge.selectedStarId = null;
      bridge.localizedStar = null;
      nbScene?.highlightStar(null);
    }
    // ── Deep-sky approach + immersion (Slice 4, Parts 3–4) ──────────────────
    // Selecting a photo-backed object warps you in: the glint blooms in 3D
    // (approach ramp) while a full-frame photo fades in (thumb → full-res via
    // the LOD hysteresis), landing on an immersive destination with a panel and,
    // for star-forming regions, a "forming-system" gateway into a BodyScene.
    const deepSkyPhoto = (obj: DeepSkyObject, rung: DeepSkyRung): string =>
      `${assetOrigin}/images/deep-sky/${obj.photoKey}${rung === 'full' ? '.jpg' : '.thumb.jpg'}`;
    function loadDeepSkyFull(obj: DeepSkyObject): void {
      if (!obj.photoKey) return;
      const full = deepSkyPhoto(obj, 'full');
      const img = new Image();
      img.onload = () => {
        if (bridge.activeDeepSky?.id === obj.id) bridge.deepSkyPhotoUrl = full;
      };
      img.src = full;
    }
    function orientToDeepSky(obj: DeepSkyObject): void {
      // Point the view down the object's sky direction (unit vector), like frameStar.
      camP = Math.acos(Math.max(-1, Math.min(1, obj.y)));
      camT = Math.atan2(obj.x, obj.z);
      dollyActive = false;
      updateCam();
    }
    function enterDeepSky(id: string): void {
      const obj = bridge.deepSkyObjects.find((o: any) => o.id === id);
      if (!obj) return;
      bridge.selectedDeepSkyId = id;
      nbScene?.highlightDeepSky(id);
      // Catalogue-only dots (no photo) don't immerse — just a highlighted label.
      if (!obj.photoKey) {
        cue('select');
        return;
      }
      cue('select');
      trackItemClick('deep-sky', id, '/explore');
      bridge.activeDeepSky = obj;
      nbScene?.focusDeepSky(id);
      closeStarPanel();
      bridge.anonStar = null;
      dsRung = 'thumb';
      bridge.deepSkyPhotoUrl = deepSkyPhoto(obj, 'thumb');
      orientToDeepSky(obj);
      if (deps.getReducedMotion()) {
        nbScene?.setDeepSkyApproach(1);
        bridge.deepSkyImmersed = true;
        bridge.deepSkyPanelOpen = true;
        loadDeepSkyFull(obj);
      } else {
        bridge.crossingFlashId++;
        if (obj.dist_label) showWarpCaption(`${obj.dist_label} · ${obj.name}`);
        dsApproachActive = true;
        dsApproachStart = performance.now();
      }
    }
    function exitDeepSky(): void {
      if (!bridge.activeDeepSky) return;
      if (!deps.getReducedMotion()) bridge.crossingFlashId++;
      dsApproachActive = false;
      dsRung = 'none';
      nbScene?.setDeepSkyApproach(0);
      nbScene?.focusDeepSky(null);
      nbScene?.highlightDeepSky(null);
      bridge.deepSkyImmersed = false;
      bridge.deepSkyPanelOpen = false;
      bridge.activeDeepSky = null;
      bridge.selectedDeepSkyId = null;
    }
    function deepSkyGateway(hostId: string): void {
      exitDeepSky();
      void enterBodyScene(hostId);
    }
    // Per-frame ramp of the approach (0 → 1): blooms the focused glint in 3D,
    // upgrades the photo rung (thumb → full via LOD hysteresis), and fades the
    // full-frame immersion in over the final stretch.
    function stepDeepSkyApproach(): void {
      if (!dsApproachActive) return;
      const t = Math.min(1, (performance.now() - dsApproachStart) / DS_APPROACH_MS);
      const eased = t * t * (3 - 2 * t);
      nbScene?.setDeepSkyApproach(eased);
      const rung = deepSkyRung(eased, dsRung);
      if (rung !== dsRung) {
        dsRung = rung;
        if (rung === 'full' && bridge.activeDeepSky) loadDeepSkyFull(bridge.activeDeepSky);
      }
      if (!bridge.deepSkyImmersed && eased >= 0.4) bridge.deepSkyImmersed = true;
      if (t >= 1) {
        dsApproachActive = false;
        bridge.deepSkyImmersed = true;
        bridge.deepSkyPanelOpen = true;
      }
    }
    // ?deepsky=<designation> deep-link: cross into the neighborhood if needed,
    // load it, then immerse. Bound to a top-level fn for the URL resolver effect.
    async function resolveDeepSkyDeepLink(designation: string): Promise<void> {
      if (!inNeighborhood()) await crossOutToNeighborhood();
      await ensureNeighborhood();
      const obj = bridge.deepSkyObjects.find((o: any) => o.designation === designation || o.id === designation);
      if (obj) enterDeepSky(obj.id);
    }
    // Orient the camera to face a star (index / ?goto= landing). The camera orbits
    // the Sun; we point the view down the star's direction and pull to a framing
    // distance. Canvas picks don't frame (the star is already under the cursor).
    function frameStar(id: string): void {
      const s = bridge.namedStarById.get(id);
      if (!s || !inNeighborhood()) return;
      const len = Math.hypot(s.x, s.y, s.z) || 1;
      const dx = -s.x / len;
      const dy = -s.y / len;
      const dz = -s.z / len;
      camP = Math.acos(Math.max(-1, Math.min(1, dy)));
      camT = Math.atan2(dx, dz);
      // Frame at a comfortable distance, capped so distant stars don't zoom the
      // whole neighborhood out into a crowded label cluster.
      camR = Math.max(camRMin, Math.min(18, s.dist_pc * 0.6 + 3));
      dollyActive = false;
      updateCam();
    }
    async function gotoStar(id: string): Promise<void> {
      if (!inNeighborhood()) await crossOutToNeighborhood();
      if (!bridge.namedStarById.has(id)) return;
      await selectStar(id);
      frameStar(id);
    }
    gotoStarFn = gotoStar;
    indexSelectStarFn = (id: string) => {
      void selectStar(id);
      frameStar(id);
    };
    // Resolve a cold-load ?goto=<starId> now that the handlers exist.
    {
      const params0 = new URL(window.location.href).searchParams;
      const g0 = params0.get('goto');
      if (g0) {
        bridge.lastGoto = g0;
        void gotoStar(g0);
      }
      // Cold-load ?system=<hostId>[&planet=<planetId>] → descend into the BodyScene.
      const sys0 = params0.get('system');
      if (sys0) {
        bridge.lastSystem = sys0;
        void enterBodyScene(sys0, params0.get('planet') ?? undefined);
      }
      // Cold-load ?deepsky=<designation> → cross into the neighborhood + immerse.
      const ds0 = params0.get('deepsky');
      if (ds0) {
        bridge.lastDeepSky = ds0;
        void resolveDeepSkyDeepLink(ds0);
      }
      // Cold-load ?galaxy=<pinId> → cross into the Milky Way + select the pin.
      const gx0 = params0.get('galaxy');
      if (gx0) {
        bridge.lastGalaxy = gx0;
        void resolveGalaxyDeepLink(gx0);
      }
      // Cold-load ?bh=<id> → open the black hole's lensing render.
      const bh0 = params0.get('bh');
      if (bh0) {
        bridge.lastBh = bh0;
        void enterBlackHole(bh0);
      }
    }
    // Exposed to the template (index / ?goto=) via a top-level binding.
    selectStarFn = selectStar;
    closeStarFn = closeStarPanel;
    setConstellationsFn = (on: boolean) => nbScene?.setConstellationsVisible(on);
    setDeepSkyFn = (on: boolean) => nbScene?.setDeepSkyVisible(on);
    selectDeepSkyFn = enterDeepSky;
    // Slice 7 — HR-diagram lens: sample the real star field + re-project it.
    toggleHrFn = () => {
      bridge.hrLensOpen = !bridge.hrLensOpen;
      if (bridge.hrLensOpen) bridge.hrStars = nbScene?.hrStars(2000) ?? [];
    };
    // Slice 7 — causality lens: pull the named stars + light-cone shells for the map.
    openCausalityFn = () => {
      const d = nbScene?.causalityData(92);
      bridge.causalityShells = d?.shells ?? [];
      bridge.causalityField = d?.field ?? [];
      bridge.causalityNamed = d?.named ?? [];
    };
    exitDeepSkyFn = exitDeepSky;
    deepSkyGatewayFn = deepSkyGateway;
    deepSkyDeepLinkFn = resolveDeepSkyDeepLink;
    // Dev/e2e hook for canvas star pickability + BodyScene entry (no shipped effect).
    if (import.meta.env.DEV) {
      (window as unknown as { __exploreSelectStar?: (id: string) => void }).__exploreSelectStar = (
        id: string,
      ) => void selectStar(id);
      (window as unknown as { __exploreEnterSystem?: (id: string) => void }).__exploreEnterSystem =
        (id: string) => void enterBodyScene(id);
      (
        window as unknown as { __exploreSelectExoplanet?: (id: string) => void }
      ).__exploreSelectExoplanet = (id: string) => selectExoplanet(id);
      (
        window as unknown as { __exploreEnterDeepSky?: (id: string) => void }
      ).__exploreEnterDeepSky = (id: string) => enterDeepSky(id);
      (
        window as unknown as { __exploreEnterMilkyWay?: () => Promise<void> }
      ).__exploreEnterMilkyWay = async () => {
        if (!inNeighborhood()) await crossOutToNeighborhood();
        await crossOutToMilkyWay();
      };
      (
        window as unknown as { __exploreSelectMilkyWay?: (id: string) => Promise<void> }
      ).__exploreSelectMilkyWay = (id: string) => resolveGalaxyDeepLink(id);
      (
        window as unknown as { __exploreEnterLocalGroup?: () => Promise<void> }
      ).__exploreEnterLocalGroup = async () => {
        if (inLocalGroup()) return;
        if (!inNeighborhood()) await crossOutToNeighborhood();
        if (!inMilkyWay()) await crossOutToMilkyWay();
        await crossOutToLocalGroup();
      };
      (
        window as unknown as { __exploreSelectLocalGroup?: (id: string) => void }
      ).__exploreSelectLocalGroup = (id: string) => selectLocalGroup(id);
      (
        window as unknown as { __exploreEnterBlackHole?: (id: string) => Promise<void> }
      ).__exploreEnterBlackHole = (id: string) => enterBlackHole(id);
    }

    // Camera distance → canonical AU, for the scale HUD (solar camR is AU,
    // neighborhood camR is pc).
    const camDistAu = () => (inNeighborhood() ? camR * AU_PER_PC : camR);
    let scaleHudTick = 0;
    const updateScaleHud = () => {
      // Throttle the reactive push — the read loop runs at frame rate but the
      // HUD only needs a few updates a second.
      if ((scaleHudTick++ & 7) !== 0) return;
      const au = camDistAu();
      bridge.scaleReadout = describeDistanceAu(au);
      bridge.contextId = inBodyScene()
        ? 'body-scene'
        : inLocalGroup()
          ? 'local-group'
          : inMilkyWay()
            ? 'milky-way'
            : inNeighborhood()
              ? 'neighborhood'
              : 'solar-system';
      const vh = bridge.container?.clientHeight ?? 1;
      const worldPerPx = (2 * Math.tan((camera.fov * Math.PI) / 180 / 2) * camR) / vh;
      const unitToAu = inNeighborhood() ? AU_PER_PC : 1;
      const bar = niceScaleBar(worldPerPx * unitToAu);
      if (bar) {
        bridge.scaleBarPx = bar.px;
        const desc = describeDistanceAu(bar.au).primary;
        bridge.scaleBarLabel = `${fmtScale(desc.value)} ${desc.unit}`;
      }
    };

    // ── Fly-to-body tween (#287 polish) ───────────────────────────────
    // Tweens focusOrigin from current to the target body's world
    // position + camR/camP/camT to a close-orbit pose around it. Pass
    // null to fly back to the heliocentric default. Ease-out cubic
    // over 600 ms; cancelled by any subsequent fly-to call. Read by
    // the animate loop below (`if (flyActive) ...`).
    const FLY_DURATION_MS = 600;
    let flyActive = false;
    let flyStart = 0;
    const flyFromOrigin = new THREE.Vector3();
    const flyToOrigin = new THREE.Vector3();
    let flyFromR = 0;
    let flyToR = 0;
    let flyFromP = 0;
    let flyToP = 0;
    let flyFromT = 0;
    let flyToT = 0;
    let flyToMinR = 60;
    let flyToMaxR = 1400;

    let focusedPlanetObj: (typeof planetObjs)[number] | null = null;

    function focusOnBody(bodyId: string | null): void {
      const next = bodyId ? (planetObjs.find((o: any) => o.planet.id === bodyId) ?? null) : null;
      flyFromOrigin.copy(focusOrigin);
      flyFromR = camR;
      flyFromP = camP;
      flyFromT = camT;
      if (next) {
        const target = new THREE.Vector3();
        next.mesh.getWorldPosition(target);
        flyToOrigin.copy(target);
        // Land at 8× planet radius (was 3, bumped to 6 was still too
        // close per user feedback). For Earth (size3=5.2) that's
        // ~41.6 units of camR; Moon at orbitUnits=24 means the
        // camera-to-Moon distance stays in the 17.6 → 65.6 range
        // at every orbital phase, with both Earth + Moon comfortably
        // in frame and headroom to wheel-zoom in further. Still
        // inside the 15× LOD-in ratio so the 4K texture is in by
        // tween end.
        flyToR = next.planet.size3 * 8;
        flyToMinR = next.planet.size3 * 1.5;
        flyToMaxR = next.planet.size3 * 50;
        // Pose: look at the planet from roughly the same angle the user
        // had before (camP/camT carry over). For very oblique entries
        // we clamp camP into the legal envelope to avoid flipping.
        flyToP = Math.max(0.08, Math.min(Math.PI * 0.48, camP));
        flyToT = camT;
        focusedPlanetObj = next;
        bridge.cameraState.focusedOnPlanet = true;
      } else {
        flyToOrigin.set(0, 0, 0);
        flyToR = HELIO_DEFAULT_CAMR;
        flyToP = HELIO_DEFAULT_CAMP;
        flyToT = HELIO_DEFAULT_CAMT;
        flyToMinR = 60;
        flyToMaxR = 1400;
        focusedPlanetObj = null;
        bridge.cameraState.focusedOnPlanet = false;
      }
      flyStart = performance.now();
      flyActive = true;
    }

    // Exposed to the top-level selectPlanet / selectSun handlers.
    flyToBodyFn = focusOnBody;

    // ─── Audio-tour camera demos (PRD-016 §S11 / RFC-019 §12) ─────
    // The audio-tour executor dispatches `audio-stage-drag` and
    // `audio-stage-zoom` CustomEvents at scheduled positions so the
    // Curator narration "Drag to rotate" / "Scroll to zoom" beats
    // actually show camera motion, not just text overlays. Listeners
    // animate camT (azimuth) / camR (radius) over the requested ms.
    const exploreRoot = bridge.container?.parentElement; // .explore wrapper
    function easeInOut(t: number): number {
      return t * t * (3 - 2 * t);
    }
    function animateCamera(
      get: () => number,
      set: (v: number) => void,
      to: number,
      durationMs: number,
    ): void {
      const start = get();
      const startTime = performance.now();
      const step = (): void => {
        const t = Math.min(1, (performance.now() - startTime) / durationMs);
        set(start + (to - start) * easeInOut(t));
        updateCam();
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    const onTourDrag = (e: Event): void => {
      const d = (e as CustomEvent).detail as
        { durationMs?: number; rotateRad?: number } | undefined;
      const rotate = d?.rotateRad ?? Math.PI / 3; // default ~60° azimuth swing
      animateCamera(
        () => camT,
        (v) => (camT = v),
        camT + rotate,
        d?.durationMs ?? 1500,
      );
    };
    const onTourZoom = (e: Event): void => {
      const d = (e as CustomEvent).detail as { durationMs?: number; factor?: number } | undefined;
      const factor = d?.factor ?? 0.55; // default zoom in to ~55% radius
      const target = Math.max(60, Math.min(1400, camR * factor));
      animateCamera(
        () => camR,
        (v) => (camR = v),
        target,
        d?.durationMs ?? 1500,
      );
    };
    exploreRoot?.addEventListener('audio-stage-drag', onTourDrag);
    exploreRoot?.addEventListener('audio-stage-zoom', onTourZoom);
    tourCameraTeardown = () => {
      exploreRoot?.removeEventListener('audio-stage-drag', onTourDrag);
      exploreRoot?.removeEventListener('audio-stage-zoom', onTourZoom);
    };

    const el3d = renderer.domElement;
    let isDrag3d = false;
    let isPan3d = false;
    let lmx3d = 0;
    let lmy3d = 0;
    let dragMoved3d = false;
    let downX3d = 0;
    let downY3d = 0;
    // Reused per-frame to avoid allocations inside the pan code path.
    const camRight = new THREE.Vector3();
    const camUp = new THREE.Vector3();
    const camForward = new THREE.Vector3();

    const ray3d = new THREE.Raycaster();
    const planetMeshes = planetObjs.map((o: any) => o.mesh);
    const planetPickAids = planetObjs.map((o: any) => o.pickAid);
    const smallBodyMeshes = smallBodyObjs.map((o: any) => o.mesh);
    const smallBodyPickAids = smallBodyObjs.map((o: any) => o.pickAid);
    // Flatten satellite meshes across all planets — each moon mesh
    // already carries its own (invisible, larger-radius) pickAid as
    // a child, so adding the mesh alone is sufficient: ray.intersectObjects
    // with `recursive=true` would over-pick, but we use false everywhere,
    // so we collect both the satMesh + its pickAid explicitly. #304 Slice 1.
    const satelliteMeshes: THREE.Object3D[] = [];
    const satellitePickAids: THREE.Object3D[] = [];
    for (const po of planetObjs) {
      for (const sat of po.satellites) {
        satelliteMeshes.push(sat.mesh);
        for (const child of sat.mesh.children) {
          if (child instanceof THREE.Mesh && typeof child.userData?.satelliteId === 'string') {
            satellitePickAids.push(child);
          }
        }
      }
    }
    // Pickables: Sun (never selected planet), all planets, all small
    // bodies (visible mesh + invisible pickAid), all natural satellites
    // (visible mesh + invisible pickAid). The pickAid widens the click
    // target for tiny bodies so they're not effectively unclickable
    // at wide zoom. Raycaster respects `.visible: false`; the LAYERS
    // panel toggles both `mesh.visible` and `pickAid.visible` for
    // hidden bodies so they can't be selected when filtered out.
    const pickables: THREE.Object3D[] = [
      ...planetMeshes,
      ...planetPickAids,
      sunMesh,
      ...smallBodyMeshes,
      ...smallBodyPickAids,
      ...satelliteMeshes,
      ...satellitePickAids,
      // Belt pick-aids appended LAST so a planet/body always wins the
      // raycast tie-break — the asteroid belt overlaps the inner orbit
      // ribbon for Vesta + Ceres, and the Kuiper Belt overlaps Pluto's
      // orbit. Belts are the fallback target, not the primary.
      asteroidBeltPick,
      kuiperBeltPick,
    ];

    // ── Iconic spacecraft trajectories (#306 A+B+C) ──────────────────
    // Voyager 1+2 (A, B), Pioneer 10+11 + New Horizons (C), plus the
    // beyond-Mars catalog rounds (Galileo, Juno, Cassini, Dawn) all
    // fetched async; built once each JSON resolves; groups hidden by
    // default per layers.paths default. The $effect at component scope
    // binds visibility to the PATHS chip toggle. The Today marker on
    // each handle is the click target — opens the matching mission
    // record on /missions when picked.
    const ICONIC_TRAJECTORY_IDS = [
      'voyager-1',
      'voyager-2',
      'pioneer-10',
      'pioneer-11',
      'new-horizons',
      'galileo',
      'juno',
      'cassini',
      'dawn',
      // Global expansion 2026-06-07 (#306) — ESA / Roscosmos / JAXA
      // iconic-mission roster across comet / asteroid / Sun + en-route
      // Mercury / Jupiter destinations.
      'rosetta',
      'vega-1',
      'vega-2',
      'venera-13',
      'giotto',
      'hayabusa2',
      'juice',
      'bepicolombo',
      'ulysses',
    ] as const;
    // Trajectory build is the worst init long task on /explore — each
    // call creates ~5-20 sprites + CanvasTextures, and the 18-trajectory
    // roster (vetted via perf-explore-iconic-clicks.spec.ts on 2026-06-19,
    // baseline_5s.worstMs ≈ 1.5 s before this fix) was firing all the
    // builds back-to-back inside a single microtask queue → ~1.5 s
    // synchronous block. Fetches still go out in parallel (network is
    // cheap + concurrent) but the SYNC build calls are interleaved with
    // frame yields, so each frame stays under the 16 ms budget instead
    // of one frame eating the whole roster.
    const trajectoryDataPromises = ICONIC_TRAJECTORY_IDS.map((id) =>
      fetch(`${base}/data/trajectories/${id}.json`)
        .then((r) => (r.ok ? (r.json() as Promise<IconicTrajectoryData>) : null))
        .catch(() => null),
    );
    void (async () => {
      for (let i = 0; i < ICONIC_TRAJECTORY_IDS.length; i++) {
        const data = await trajectoryDataPromises[i];
        if (!data) continue;
        const handle = buildIconicTrajectory({
          data,
          auToPx,
          width: bridge.container?.clientWidth ?? window.innerWidth,
          height: bridge.container?.clientHeight ?? window.innerHeight,
          visible: bridge.layers.paths,
        });
        scene.add(handle.group);
        iconicTrajectoryHandles.push(handle);
        pickables.push(handle.clickTarget);
        // Yield to the event loop — separates each build into its own
        // macrotask so the browser can render + process input between
        // builds instead of starving for the whole roster's duration.
        await new Promise((r) => setTimeout(r, 0));
      }
    })();

    // Orbiter-tour loops (cassini-tour, galileo-tour, juno-tour)
    // intentionally NOT loaded. The planet-anchored orbital rings made
    // the PATHS layer hard to read — too many concentric loops crowding
    // the giants. Heliocentric polylines alone tell the story; the
    // user can deep-link into a mission's panel for the orbital tour
    // detail. Keep buildOrbiterTour module around if we want to bring
    // them back behind a separate chip later.

    const tryPick3d = (e: MouseEvent) => {
      const rect = el3d.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray3d.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      // First: solar-system pickables (planets / Sun / small bodies)
      const hits = ray3d.intersectObjects(pickables, false);
      // Two-pass selection: a planet's wide pick-aid (sized 2.5× the
      // visible body for wide-zoom click forgiveness) can swallow the
      // inner moons of giant planets — Io + Europa orbit inside
      // Jupiter's pick-aid sphere, Enceladus inside Saturn's, Miranda
      // inside Uranus's. The raycaster's nearest hit was always the
      // pick-aid, so the inner moons were unclickable. Prefer "real"
      // hits (visible mesh / explicit marker / non-pickAid) over the
      // wide pickAid spheres; fall back to a pickAid hit if nothing
      // specific was hit (preserving wide-zoom forgiveness).
      const isSelectable = (ud: Record<string, unknown>): boolean =>
        typeof ud.planetId === 'string' ||
        typeof ud.smallBodyId === 'string' ||
        typeof ud.satelliteId === 'string' ||
        typeof ud.beltId === 'string' ||
        ud.kind === 'iconic-trajectory-today' ||
        ud.kind === 'orbiter-tour-flyby';
      const hit =
        hits.find((h) => isSelectable(h.object.userData) && !h.object.userData.isPickAid) ??
        hits.find((h) => isSelectable(h.object.userData));
      if (hit) {
        const planetId = hit.object.userData.planetId as string | undefined;
        const smallBodyId = hit.object.userData.smallBodyId as string | undefined;
        const satelliteId = hit.object.userData.satelliteId as string | undefined;
        const parentPlanetId = hit.object.userData.parentPlanetId as string | undefined;
        const beltId = hit.object.userData.beltId as string | undefined;
        const trajectoryMissionId = hit.object.userData.missionId as string | undefined;
        if (planetId === '__sun__') selectSun();
        else if (planetId) selectPlanet(planetId);
        else if (smallBodyId) selectSmallBody(smallBodyId);
        else if (satelliteId && parentPlanetId) selectSatellite(parentPlanetId, satelliteId);
        else if (beltId) selectBelt(beltId);
        else if (
          (hit.object.userData.kind === 'iconic-trajectory-today' ||
            hit.object.userData.kind === 'orbiter-tour-flyby') &&
          trajectoryMissionId
        ) {
          // Iconic trajectory Today marker + orbiter-tour flyby marker
          // both open the mission's detail panel inline on /explore
          // instead of navigating away to /missions, so the camera +
          // scene state survives the click. Same MissionPanel surface
          // used by the PATHS legend rows.
          void iconic.openMission(trajectoryMissionId, localeFromPage(deps.getPage()));
        }
        return;
      }
      // Second: galaxy sprites (only pickable when the layer is on,
      // since group.visible gates them). Deep-link to the matching
      // /science/observation article rather than opening an in-app
      // panel — the article is the canonical place to read about it.
      if (localGroup.group.visible) {
        const galaxyHits = ray3d.intersectObjects(localGroup.group.children, false);
        const galaxyHit = galaxyHits.find(
          (h) => typeof h.object.userData.galaxyScienceSection === 'string',
        );
        if (galaxyHit) {
          const section = galaxyHit.object.userData.galaxyScienceSection as string;
          goto(`${base}/science/observation/${section}`);
        }
      }
    };

    // ── 3D hover tooltip — mean orbital velocity (vis-viva at r=a) ──
    // The /explore visualisation uses circular orbits at compressed
    // radii (orbitR), not Keplerian r(t), so the live r is constant
    // per planet. Vis-viva at r=a simplifies to sqrt(μ/a). When we
    // ship a true Kepler simulation (slice 4+ for /fly), we'll plumb
    // the current r through to this tooltip so it varies in real time
    // along the orbit. Until then the value matches the panel's
    // MEAN VELOCITY cell — which is intentional, not a bug.
    const ray3dHover = new THREE.Raycaster();
    // Hover targets mirror click pickables minus the Sun (Sun has its
    // own hover handling via SunPanel) so dwarfs / comets / interstellar
    // bodies get the same vis-viva velocity tooltip as planets.
    const lagrangeMeshes: THREE.Object3D[] = [];
    for (const po of planetObjs) {
      lagrangeMeshes.push(po.lagrangeL1, po.lagrangeL2);
    }
    const hoverTargets: THREE.Object3D[] = [
      ...planetMeshes,
      ...smallBodyMeshes,
      ...smallBodyPickAids,
      ...lagrangeMeshes,
    ];
    const onHover = (e: MouseEvent) => {
      if (bridge.view !== '3d' || isDrag3d) {
        if (bridge.hoverData) bridge.hoverData = null;
        if (iconic.state.hoveredId) iconic.state.hoveredId = null;
        return;
      }
      const rect = el3d.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray3dHover.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      // Slice 5 — in the Milky Way, hover highlights the Sun / Sag A* pins.
      if (inMilkyWay()) {
        const mh = mwScene ? ray3dHover.intersectObjects(mwScene.pickables, false) : [];
        const id = (mh[0]?.object.userData.mwObjectId as string | undefined) ?? null;
        mwScene?.highlight(id ?? bridge.selectedMwId);
        el3d.style.cursor = id ? 'pointer' : 'grab';
        if (bridge.hoverData) bridge.hoverData = null;
        return;
      }
      // Slice 8 — in the Local Group, hover highlights + names a member galaxy.
      if (inLocalGroup()) {
        const mh = lgScene ? ray3dHover.intersectObjects(lgScene.pickables, false) : [];
        const id = (mh[0]?.object.userData.lgId as string | undefined) ?? null;
        lgScene?.highlight(id ?? bridge.selectedLgMember?.id ?? null);
        el3d.style.cursor = id ? 'pointer' : 'grab';
        if (bridge.hoverData) bridge.hoverData = null;
        return;
      }
      // v2: in the stellar neighborhood, hover highlights + names the nearest
      // named star; nothing else is hoverable there.
      if (inNeighborhood()) {
        const mh = nbScene ? ray3dHover.intersectObjects(nbScene.namedStarPickables, false) : [];
        const id = (mh[0]?.object.userData.starId as string | undefined) ?? null;
        nbScene?.highlightStar(id ?? bridge.selectedStarId);
        // Deep-sky hover (layer on, no star under cursor) reveals the glint's label.
        let dsHoverId: string | null = null;
        if (bridge.showDeepSky && !id && nbScene && nbScene.deepSkyPickables.length) {
          const dh = ray3dHover.intersectObjects(nbScene.deepSkyPickables, false);
          dsHoverId = (dh[0]?.object.userData.deepSkyId as string | undefined) ?? null;
        }
        nbScene?.highlightDeepSky(dsHoverId ?? bridge.selectedDeepSkyId);
        el3d.style.cursor = id || dsHoverId ? 'pointer' : 'grab';
        if (bridge.hoverData) bridge.hoverData = null;
        return;
      }
      // Trajectory-marker hover — set hoveredId so the matching path
      // goes bright. Independent of the tooltip hover path below:
      // trajectories don't surface a vis-viva tooltip, only a color-
      // brighten cue.
      if (bridge.layers.paths && iconicTrajectoryHandles.length > 0) {
        // All hover-able trajectory objects — Today markers + every
        // encounter sprite. Hover on any one of them brightens the
        // mission's full path + reveals every waypoint label.
        const trajTargets: THREE.Object3D[] = [];
        for (const h of iconicTrajectoryHandles) trajTargets.push(...h.hoverTargets);
        const trajHits = ray3dHover.intersectObjects(trajTargets, false);
        const newId = (trajHits[0]?.object.userData.missionId as string | undefined) ?? null;
        if (newId !== iconic.state.hoveredId) iconic.state.hoveredId = newId;
      } else if (iconic.state.hoveredId) {
        iconic.state.hoveredId = null;
      }
      const hits = ray3dHover.intersectObjects(hoverTargets, false);
      if (hits.length === 0) {
        if (bridge.hoverData) bridge.hoverData = null;
        return;
      }
      const planetId = hits[0].object.userData.planetId as string | undefined;
      const smallBodyId = hits[0].object.userData.smallBodyId as string | undefined;
      const lagrangeKind = hits[0].object.userData.lagrangeKind as 'L1' | 'L2' | undefined;
      const lagrangePlanetId = hits[0].object.userData.lagrangePlanetId as string | undefined;
      // Mean velocity via vis-viva at r=a; collapses to sqrt(μ/a).
      // μ ≈ 4π² in AU³/yr², 4.7404 km/s per AU/yr (IAU 2012).
      if (lagrangeKind && lagrangePlanetId) {
        // Lagrange-point tooltip — co-orbits with the parent planet, so
        // no independent velocity. Distance from the parent planet is
        // the Hill radius (rendered at) — sunward for L1, anti-sunward
        // for L2. Notable occupant string is only populated for the
        // points spaceflight has actually used (Sun–Earth L1 + L2).
        const planet = bridge.planetById.get(lagrangePlanetId);
        if (!planet) return;
        const planetName = planet.name;
        const hillMkm = planet.a * 149.5978707 * Math.cbrt(3e-6); // ~1.5 Mkm at Earth
        bridge.hoverData = {
          name: `${planetName} ${lagrangeKind}`,
          velocity: '',
          distance: '',
          extras: '',
          velocityKms: 0,
          distanceAU: planet.a,
          eccentricity: planet.e,
          inclinationDeg: planet.incl,
          kind: 'lagrange',
          lagrangeTitle:
            lagrangeKind === 'L1'
              ? m.explore_tt_lagrange_l1_title({ planet: planetName })
              : m.explore_tt_lagrange_l2_title({ planet: planetName }),
          lagrangeBlurb:
            lagrangeKind === 'L1'
              ? m.explore_tt_lagrange_l1_blurb({
                  planet: planetName,
                  mkm: hillMkm.toFixed(2),
                })
              : m.explore_tt_lagrange_l2_blurb({
                  planet: planetName,
                  mkm: hillMkm.toFixed(2),
                }),
          lagrangeNotable:
            lagrangePlanetId === 'earth'
              ? lagrangeKind === 'L1'
                ? m.explore_tt_lagrange_l1_notable_earth()
                : m.explore_tt_lagrange_l2_notable_earth()
              : '',
          x: e.clientX,
          y: e.clientY,
        };
      } else if (planetId) {
        const planet = bridge.planetById.get(planetId);
        if (!planet) return;
        const v = Math.sqrt((4 * Math.PI ** 2) / planet.a) * 4.7404;
        bridge.hoverData = {
          name: planet.name,
          velocity: m.explore_tt_velocity_planet({ value: v.toFixed(2) }),
          distance: m.explore_tt_distance_sun({
            mkm: (planet.a * 149.5978707).toFixed(0),
          }),
          extras: m.explore_tt_extras_planet({
            e: planet.e.toFixed(3),
            i: planet.incl.toFixed(1),
            tilt: planet.axialTilt.toFixed(1),
          }),
          velocityKms: v,
          distanceAU: planet.a,
          eccentricity: planet.e,
          inclinationDeg: planet.incl,
          x: e.clientX,
          y: e.clientY,
        };
      } else if (smallBodyId) {
        const body = smallBodyById.get(smallBodyId);
        if (!body) return;
        const v = Math.sqrt((4 * Math.PI ** 2) / body.a) * 4.7404;
        const typeLabel =
          body.type === 'dwarf'
            ? m.explore_tt_kind_dwarf()
            : body.type === 'comet'
              ? m.explore_tt_kind_comet()
              : m.explore_tt_kind_interstellar();
        bridge.hoverData = {
          name: body.name,
          velocity: m.explore_tt_velocity_small({ value: v.toFixed(2) }),
          distance: m.explore_tt_distance_small({
            mkm: (body.a * 149.5978707).toFixed(0),
            kind: typeLabel,
          }),
          extras: m.explore_tt_extras_small({
            e: body.e.toFixed(3),
            i: body.incl.toFixed(1),
          }),
          velocityKms: v,
          distanceAU: body.a,
          eccentricity: body.e,
          inclinationDeg: body.incl,
          x: e.clientX,
          y: e.clientY,
        };
      }
    };
    const onHoverLeave = () => {
      bridge.hoverData = null;
      iconic.state.hoveredId = null;
    };

    let mouseDownOnCanvas = false;
    const on3dMouseDown = (e: MouseEvent) => {
      mouseDownOnCanvas = true;
      isDrag3d = true;
      dragMoved3d = false;
      // Right-click OR Shift+left-click → pan instead of orbit
      // (2026-06-06 user note: "either we do not support moving things
      // left/right or I don't know how to do it"). Standard 3D-scene
      // convention used by Three.js OrbitControls, Blender, Unity etc.
      isPan3d = e.button === 2 || e.shiftKey;
      lmx3d = e.clientX;
      lmy3d = e.clientY;
      downX3d = e.clientX;
      downY3d = e.clientY;
      el3d.style.cursor = isPan3d ? 'move' : 'grabbing';
    };
    const on3dMouseMove = (e: MouseEvent) => {
      if (!isDrag3d) return;
      const dx = e.clientX - lmx3d;
      const dy = e.clientY - lmy3d;
      if (Math.abs(e.clientX - downX3d) + Math.abs(e.clientY - downY3d) > 4) {
        dragMoved3d = true;
      }
      if (isPan3d) {
        // Translate focusOrigin in the screen-aligned plane. Build the
        // camera's right + up basis from its world matrix so panning
        // tracks the user's view regardless of current orbit pose.
        // Speed proportional to camR (and tan(fov/2)) so a finger-
        // width of mouse motion shifts the scene by ~one finger-width
        // of world distance at every zoom level.
        //
        // 2026-06-15 bugfix: clear focusedPlanetObj at the start of
        // any pan. The animate-loop steady-state branch re-glues
        // focusOrigin to the focused planet's world position every
        // frame, which silently overwrote panning while a planet was
        // selected (user note: "I click shift, mouse icon does change
        // to move, but I am not moving the canvas"). A pan is an
        // explicit "I'm leaving this body" gesture — drop the focus so
        // the new focusOrigin sticks.
        if (focusedPlanetObj) {
          focusedPlanetObj = null;
          flyActive = false;
        }
        const scale = (camR * 2 * Math.tan((camera.fov * Math.PI) / 360)) / window.innerHeight;
        camera.matrixWorld.extractBasis(camRight, camUp, camForward);
        focusOrigin.addScaledVector(camRight, -dx * scale);
        focusOrigin.addScaledVector(camUp, dy * scale);
      } else {
        camT -= dx * 0.006;
        camP = Math.max(0.08, Math.min(Math.PI * 0.48, camP + dy * 0.005));
      }
      lmx3d = e.clientX;
      lmy3d = e.clientY;
      updateCam();
    };
    // v2 neighborhood pick: named-star markers first (open the Panel), else the
    // nearest background star (a lightweight anonymous readout).
    function pickNeighborhood(e: { clientX: number; clientY: number }): void {
      if (!nbScene) return;
      // While immersed in a deep-sky destination, the photo fills the view — a
      // canvas click shouldn't pick a star behind it. Exit is via panel / crumb.
      if (bridge.activeDeepSky) return;
      const rect = el3d.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray3d.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const markerHits = ray3d.intersectObjects(nbScene.namedStarPickables, false);
      if (markerHits.length) {
        const id = markerHits[0].object.userData.starId as string | undefined;
        if (id === 'sol') {
          // Our Solar System — open the Sun panel but STAY in the neighborhood
          // (unlike selectSun(), which crosses back out).
          cue('select');
          bridge.panelState.sun = true;
          bridge.panelState.star = false;
          bridge.panelState.planet = false;
          bridge.panelState.smallBody = false;
          bridge.panelState.satellite = false;
          bridge.panelState.belt = false;
          bridge.anonStar = null;
          nbScene.highlightStar('sol');
          trackItemClick('star', 'sol', '/explore');
          return;
        }
        if (id) {
          void selectStarFn?.(id);
          return;
        }
      }
      // Deep-sky glints (only when the layer is on). Selecting one warps in +
      // opens the DeepSkyPanel (Part 4); Part 2 highlights + records selection.
      if (bridge.showDeepSky && nbScene.deepSkyPickables.length) {
        const dsHits = ray3d.intersectObjects(nbScene.deepSkyPickables, false);
        if (dsHits.length) {
          const id = dsHits[0].object.userData.deepSkyId as string | undefined;
          if (id) {
            selectDeepSkyFn?.(id);
            return;
          }
        }
      }
      // Anonymous background star — the Points threshold scales with zoom so a
      // tap lands on the nearest star. Generous so a tap in a starry area registers.
      ray3d.params.Points = { threshold: Math.max(0.05, camR * 0.06) };
      const pf = ray3d.intersectObject(nbScene.fieldObject, false);
      ray3d.params.Points = { threshold: 1 };
      if (pf.length && pf[0].index != null) {
        const info = nbScene.anonymousStarAt(pf[0].index);
        if (info) {
          bridge.anonStar = { ...info, shownAt: performance.now() };
          return;
        }
      }
      bridge.anonStar = null; // empty space — dismiss the tag
    }

    // Slice 5 — pick a Milky Way pin (Sun / Sag A*) → open the MilkyWayPanel.
    function pickMilkyWay(e: { clientX: number; clientY: number }): void {
      if (!mwScene) return;
      const rect = el3d.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray3d.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const hits = ray3d.intersectObjects(mwScene.pickables, false);
      if (hits.length) {
        const id = hits[0].object.userData.mwObjectId as string | undefined;
        if (id) selectMilkyWay(id);
      }
    }
    function selectMilkyWay(id: string): void {
      if (!bridge.mwObjects.some((o: any) => o.id === id)) return;
      // Slice 6 — Sagittarius A* upgrades from a flat pin to the lensed black-hole
      // render when you select it (the S5 pin becomes an S6 destination).
      if (id === 'sagittarius-a-star') {
        void enterBlackHole('sagittarius-a-star');
        return;
      }
      cue('select');
      bridge.selectedMwId = id;
      bridge.mwPanelOpen = true;
      mwScene?.highlight(id);
      trackItemClick('marker', id, '/explore');
    }
    function closeMwPanel(): void {
      bridge.mwPanelOpen = false;
      bridge.selectedMwId = null;
      mwScene?.highlight(null);
    }

    // Slice 8 — pick a Local Group member galaxy → open the LocalGroupPanel.
    function pickLocalGroup(e: { clientX: number; clientY: number }): void {
      if (!lgScene) return;
      const rect = el3d.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray3d.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const hits = ray3d.intersectObjects(lgScene.pickables, false);
      if (hits.length) {
        const id = hits[0].object.userData.lgId as string | undefined;
        if (id) selectLocalGroup(id);
      }
    }
    function selectLocalGroup(id: string): void {
      const member = lgMembers.find((mm) => mm.id === id);
      if (!member) return;
      cue('select');
      bridge.selectedLgMember = member;
      bridge.lgPanelOpen = true;
      lgScene?.highlight(id);
      trackItemClick('marker', id, '/explore');
    }
    function closeLgPanel(): void {
      bridge.lgPanelOpen = false;
      bridge.selectedLgMember = null;
      lgScene?.highlight(null);
    }
    closeLgFn = closeLgPanel;
    async function resolveGalaxyDeepLink(id: string): Promise<void> {
      if (!inMilkyWay()) {
        if (!inNeighborhood()) await crossOutToNeighborhood();
        await crossOutToMilkyWay();
      }
      selectMilkyWay(id);
    }
    closeMwFn = closeMwPanel;
    mwDeepLinkFn = resolveGalaxyDeepLink;
    exitBlackHoleFn = exitBlackHole;
    bhDeepLinkFn = (id: string) => void enterBlackHole(id);
    setBhCurvatureFn = (on: boolean) => bhScene?.setCurvature(on ? 1 : 0);

    // Nav shortcuts jump straight to a scale-shell. Climb OUT (cross-out) or back
    // IN (cross-in) one level at a time until the active context is the target.
    // Ladder + level math live in scale-shell-controller (RFC-036 WS-C/C1, tested).
    const curCtxLevel = () =>
      contextLevel(
        inLocalGroup()
          ? 'local-group'
          : inMilkyWay()
            ? 'milky-way'
            : inNeighborhood()
              ? 'neighborhood'
              : 'solar-system',
      );
    contextDeepLinkFn = async (target: string) => {
      const t = contextLevel(target);
      if (t < 0) return;
      let guard = 0;
      while (curCtxLevel() < t && guard++ < 6) {
        const cur = curCtxLevel();
        if (cur === 0) await crossOutToNeighborhood();
        else if (cur === 1) await crossOutToMilkyWay();
        else if (cur === 2) await crossOutToLocalGroup();
      }
      while (curCtxLevel() > t && guard++ < 6) {
        const cur = curCtxLevel();
        if (cur === 3) crossInToMilkyWay();
        else if (cur === 2) crossInToNeighborhood();
        else if (cur === 1) crossInToSolarSystem();
      }
    };
    // Resolve a cold-load ?context=<...> now that the crossing fns exist (the
    // reactive $effect above only catches later in-session URL changes).
    {
      const ctx0 = new URL(window.location.href).searchParams.get('context');
      if (isValidShellTarget(ctx0)) {
        bridge.lastContextJump = ctx0;
        void contextDeepLinkFn(ctx0).then(() => {
          const url = new URL(window.location.href);
          if (url.searchParams.get('context') === ctx0) {
            url.searchParams.delete('context');
            replaceState(url, deps.getPage().state);
          }
        });
      }
    }

    const on3dMouseUp = (e: MouseEvent) => {
      const wasDrag = dragMoved3d;
      const wasPan = isPan3d;
      const wasOnCanvas = mouseDownOnCanvas;
      isDrag3d = false;
      isPan3d = false;
      mouseDownOnCanvas = false;
      el3d.style.cursor = 'grab';
      // Pan release shouldn't open a panel — only orbit-mode mouseup that didn't
      // reach drag-threshold counts as a pick. Also require the mousedown to have
      // started on the canvas — otherwise clicks on overlay buttons bubble to the
      // window-level listener and raycast through to whatever sits behind.
      if (wasOnCanvas && !wasDrag && !wasPan && bridge.view === '3d') {
        // v2: in the stellar neighborhood pick named stars / anonymous stars
        // instead of the (unrendered) solar bodies.
        if (inBodyScene()) pickBodyScene(e);
        else if (inMilkyWay()) pickMilkyWay(e);
        else if (inLocalGroup()) pickLocalGroup(e);
        else if (inNeighborhood()) pickNeighborhood(e);
        else tryPick3d(e);
      }
    };
    // Right-click on the canvas would otherwise pop the browser's
    // context menu; suppress so right-drag pan stays usable.
    const onContextMenu3d = (e: MouseEvent) => e.preventDefault();
    const on3dWheel = (e: WheelEvent) => {
      // Trackpad pinch on macOS dispatches a synthetic wheel event
      // with ctrlKey=true; without preventDefault the browser zooms
      // the whole page (nav + chrome) instead of the canvas. Same
      // for Ctrl+scroll on desktop. preventDefault keeps the gesture
      // bound to the 3D camera. Listener also needs `passive: false`
      // — see the addEventListener call below.
      e.preventDefault();
      const zoomingOut = e.deltaY > 0;
      // Slice 8 — the Local Group is the outermost context: multiplicative zoom;
      // scroll-in past the inner edge drops back into the Milky Way.
      if (inLocalGroup()) {
        dollyActive = false;
        const ratio = zoomingOut ? 1.07 : 1 / 1.07;
        const next = camR * ratio;
        if (!zoomingOut && next <= camRMin) {
          crossInToMilkyWay();
          return;
        }
        camR = Math.max(camRMin, Math.min(camRMax, next));
        updateCam();
        return;
      }
      // Slice 5 — the Milky Way: multiplicative zoom; scroll-in past the inner edge
      // returns to the neighborhood, scroll-out past the ceiling crosses to the Local Group.
      if (inMilkyWay()) {
        dollyActive = false;
        const ratio = zoomingOut ? 1.07 : 1 / 1.07;
        const next = camR * ratio;
        if (!zoomingOut && next <= camRMin) {
          crossInToNeighborhood();
          return;
        }
        if (zoomingOut && camR >= camRMax - 0.5) {
          void crossOutToLocalGroup();
          return;
        }
        camR = Math.max(camRMin, Math.min(camRMax, next));
        updateCam();
        return;
      }
      // v2 boundary: past the heliocentric ceiling, one more scroll-out leaves
      // the solar system; inside the neighborhood, scroll-in past the edge
      // returns and scroll-out past the ceiling crosses into the Milky Way.
      // Neighborhood uses multiplicative zoom (the pc scale spans orders of magnitude).
      if (!inNeighborhood() && zoomingOut && camR >= camRMax - 0.5) {
        void crossOutToNeighborhood();
        return;
      }
      if (inNeighborhood()) {
        dollyActive = false; // user took over the zoom
        const ratio = zoomingOut ? 1.07 : 1 / 1.07;
        const next = camR * ratio;
        if (!zoomingOut && next <= camRMin) {
          if (descendFromNeighborhood()) return;
          camR = camRMin; // focused star has no known system — hold at the floor.
          updateCam();
          return;
        }
        if (zoomingOut && camR >= camRMax - 0.5) {
          void crossOutToMilkyWay();
          return;
        }
        camR = Math.max(camRMin, Math.min(camRMax, next));
        updateCam();
        return;
      }
      camR = Math.max(camRMin, Math.min(camRMax, camR + e.deltaY * 0.7));
      updateCam();
    };
    let touchActive3d = false;
    let touchMoved3d = false;
    let touchDownX3d = 0;
    let touchDownY3d = 0;
    let pinchPrev3d = 0; // Previous two-finger distance for pinch-zoom.

    const touchDist = (a: Touch, b: Touch) =>
      Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

    const on3dTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchActive3d = true;
        touchMoved3d = false;
        lmx3d = e.touches[0].clientX;
        lmy3d = e.touches[0].clientY;
        touchDownX3d = lmx3d;
        touchDownY3d = lmy3d;
      } else if (e.touches.length === 2) {
        // Switching to pinch — clear single-touch state so subsequent
        // pinch deltas don't get treated as orbit drag.
        touchActive3d = false;
        pinchPrev3d = touchDist(e.touches[0], e.touches[1]);
      }
    };
    const on3dTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch-zoom on the camera radius. Per CLAUDE.md mobile rules:
        // 3D screens are single-finger orbit + two-finger zoom.
        const dist = touchDist(e.touches[0], e.touches[1]);
        if (pinchPrev3d > 0) {
          const ratio = pinchPrev3d / dist; // >1 = zoom out, <1 = zoom in
          // v2 boundary crossing (mirrors the wheel handler).
          if (inLocalGroup()) {
            if (ratio < 1 && camR * ratio <= camRMin) {
              crossInToMilkyWay();
              pinchPrev3d = dist;
              return;
            }
            dollyActive = false;
            camR = Math.max(camRMin, Math.min(camRMax, camR * ratio));
            updateCam();
            pinchPrev3d = dist;
            return;
          }
          if (inMilkyWay()) {
            if (ratio < 1 && camR * ratio <= camRMin) {
              crossInToNeighborhood();
              pinchPrev3d = dist;
              return;
            }
            if (ratio > 1 && camR >= camRMax - 0.5) {
              void crossOutToLocalGroup();
              pinchPrev3d = dist;
              return;
            }
            dollyActive = false;
            camR = Math.max(camRMin, Math.min(camRMax, camR * ratio));
            updateCam();
            pinchPrev3d = dist;
            return;
          }
          if (!inNeighborhood() && ratio > 1 && camR >= camRMax - 0.5) {
            void crossOutToNeighborhood();
            pinchPrev3d = dist;
            return;
          }
          if (inNeighborhood() && ratio < 1 && camR * ratio <= camRMin) {
            if (!descendFromNeighborhood()) {
              camR = camRMin; // focused star has no known system — hold at the floor.
              updateCam();
            }
            pinchPrev3d = dist;
            return;
          }
          if (inNeighborhood() && ratio > 1 && camR >= camRMax - 0.5) {
            void crossOutToMilkyWay();
            pinchPrev3d = dist;
            return;
          }
          if (inNeighborhood()) dollyActive = false; // user took over the zoom
          camR = Math.max(camRMin, Math.min(camRMax, camR * ratio));
          updateCam();
        }
        pinchPrev3d = dist;
        return;
      }
      if (!touchActive3d || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - lmx3d;
      const dy = e.touches[0].clientY - lmy3d;
      if (
        Math.abs(e.touches[0].clientX - touchDownX3d) +
          Math.abs(e.touches[0].clientY - touchDownY3d) >
        6
      ) {
        touchMoved3d = true;
      }
      camT -= dx * 0.006;
      camP = Math.max(0.08, Math.min(Math.PI * 0.48, camP + dy * 0.005));
      lmx3d = e.touches[0].clientX;
      lmy3d = e.touches[0].clientY;
      updateCam();
    };
    const on3dTouchEnd = (e: TouchEvent) => {
      // Reset pinch state when fingers lift below 2.
      if (e.touches.length < 2) pinchPrev3d = 0;
      const wasMoved = touchMoved3d;
      const wasActive = touchActive3d;
      if (e.touches.length === 0) touchActive3d = false;
      // T-B: pause + re-home gyro for 200ms after a drag (RFC-020 §6).
      gyro.recordTouchEnd();
      if (
        wasActive &&
        !wasMoved &&
        bridge.view === '3d' &&
        e.changedTouches.length === 1 &&
        e.touches.length === 0
      ) {
        const t = e.changedTouches[0];
        if (inNeighborhood()) pickNeighborhood({ clientX: t.clientX, clientY: t.clientY });
        else tryPick3d({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
      }
    };

    el3d.style.cursor = 'grab';
    lifecycle.on(el3d, 'mousedown', on3dMouseDown);
    lifecycle.on(el3d, 'contextmenu', onContextMenu3d);
    lifecycle.on(window, 'mousemove', on3dMouseMove);
    lifecycle.on(window, 'mouseup', on3dMouseUp);
    // passive: false so on3dWheel can preventDefault against trackpad
    // pinch (macOS Ctrl+wheel) hijacking browser zoom.
    lifecycle.on(el3d, 'wheel', on3dWheel, { passive: false });
    lifecycle.on(el3d, 'touchstart', on3dTouchStart, { passive: true });
    lifecycle.on(el3d, 'touchmove', on3dTouchMove, { passive: true });
    lifecycle.on(el3d, 'touchend', on3dTouchEnd);
    lifecycle.on(el3d, 'mousemove', onHover);
    lifecycle.on(el3d, 'mouseleave', onHoverLeave);

    // ──────────────────────────────────────────────────────────────
    // 2D — Canvas top-down view (pan + zoom)
    // ──────────────────────────────────────────────────────────────

    const c2 = bridge.canvas2d;
    const ctx2 = c2.getContext('2d');
    if (!ctx2) throw new Error('2D canvas context unavailable');

    let zoom2d = 1;
    let zx2d = 0;
    let zy2d = 0;
    let isDrag2d = false;
    let drag2dX = 0;
    let drag2dY = 0;
    let drag2dMoved = false;
    let drag2dDownX = 0;
    let drag2dDownY = 0;

    // World-space planet positions, updated by draw2d each frame.
    const planet2dPos = new Map<string, { x: number; y: number }>();
    const smallBody2dPos = new Map<string, { x: number; y: number }>();

    // Test-only hook (#351 Layer 2-A): bodies no longer start at a fixed
    // angle — `a0` is overwritten with each planet's real J2000 mean
    // longitude — so e2e can't assume Earth sits at (W/2 + orbitR, H/2).
    // Expose the live 2D offset (canvas-centre-relative, CSS px) so a click
    // test can resolve a body's actual on-screen position deterministically:
    // screen = (canvas.width/2 + off.x, canvas.height/2 + off.y).
    if (typeof window !== 'undefined') {
      (
        window as Window & {
          __explore2dBodyOffset?: (id: string) => { x: number; y: number } | null;
        }
      ).__explore2dBodyOffset = (id) => planet2dPos.get(id) ?? smallBody2dPos.get(id) ?? null;
    }

    const resize2d = () => {
      c2.width = c2.clientWidth;
      c2.height = c2.clientHeight;
    };
    resize2d();

    const on2dWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = c2.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      const W = c2.width;
      const H = c2.height;
      const f = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      zx2d = (mx - W / 2) * (1 - f) + zx2d * f;
      zy2d = (my - H / 2) * (1 - f) + zy2d * f;
      zoom2d = Math.max(0.12, Math.min(5, zoom2d * f));
    };
    const tryPick2d = (clientX: number, clientY: number) => {
      const rect = c2.getBoundingClientRect();
      const W = c2.width;
      const H = c2.height;
      // Inverse of the canvas transform: world = (screen - centre) / zoom
      const wx = (clientX - rect.left - (W / 2 + zx2d)) / zoom2d;
      const wy = (clientY - rect.top - (H / 2 + zy2d)) / zoom2d;

      // Sun first — sits at world origin, draw radius 14 + glow halo.
      if (Math.hypot(wx, wy) < Math.max(20, 14 / zoom2d)) {
        selectSun();
        return;
      }

      // Generous hit radius — Mercury sweeps ~54 px/s in screen space at
      // default sim speed, so a tight pixel-perfect click radius makes
      // the inner planets effectively unclickable. The 18 px floor (in
      // world units after the zoom inverse) gives a ~330 ms aim window
      // on the fastest body without overlapping neighbouring orbits.
      const FLOOR = 18;
      let best: { id: string; d: number; kind: 'planet' | 'small' } | null = null;
      for (const p of PLANETS) {
        const pos = planet2dPos.get(p.id);
        if (!pos) continue;
        const dx = wx - pos.x;
        const dy = wy - pos.y;
        const d = Math.hypot(dx, dy);
        const hitR = Math.max(p.size2 * 3.5, FLOOR / zoom2d);
        if (d < hitR && (!best || d < best.d)) best = { id: p.id, d, kind: 'planet' };
      }
      // Small bodies (dwarfs, comets, interstellar) — same generous
      // floor. They're drawn as 1.6/2.2px dots and tend to sit alone
      // on their orbit rings, so a wide hit radius is safe.
      for (const b of SMALL_BODIES) {
        const pos = smallBody2dPos.get(b.id);
        if (!pos) continue;
        const dx = wx - pos.x;
        const dy = wy - pos.y;
        const d = Math.hypot(dx, dy);
        const drawR = b.type === 'comet' ? 1.6 : 2.2;
        const hitR = Math.max(drawR * 4, FLOOR / zoom2d);
        if (d < hitR && (!best || d < best.d)) best = { id: b.id, d, kind: 'small' };
      }
      if (!best) return;
      if (best.kind === 'planet') selectPlanet(best.id);
      else selectSmallBody(best.id);
    };

    const on2dMouseDown = (e: MouseEvent) => {
      isDrag2d = true;
      drag2dMoved = false;
      drag2dX = e.clientX;
      drag2dY = e.clientY;
      drag2dDownX = e.clientX;
      drag2dDownY = e.clientY;
      c2.style.cursor = 'grabbing';
    };
    const on2dMouseUp = (e: MouseEvent) => {
      const wasMoved = drag2dMoved;
      isDrag2d = false;
      if (bridge.view === '2d') c2.style.cursor = 'grab';
      if (!wasMoved && bridge.view === '2d') tryPick2d(e.clientX, e.clientY);
    };
    const on2dMouseMove = (e: MouseEvent) => {
      if (!isDrag2d || bridge.view !== '2d') return;
      if (Math.abs(e.clientX - drag2dDownX) + Math.abs(e.clientY - drag2dDownY) > 4) {
        drag2dMoved = true;
      }
      zx2d += e.clientX - drag2dX;
      zy2d += e.clientY - drag2dY;
      drag2dX = e.clientX;
      drag2dY = e.clientY;
    };
    let touchActive2d = false;
    let touch2dMoved = false;
    let touch2dDownX = 0;
    let touch2dDownY = 0;
    let pinchPrev2d = 0;
    let pinchCenter2d: { x: number; y: number } | null = null;

    const on2dTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchActive2d = true;
        touch2dMoved = false;
        drag2dX = e.touches[0].clientX;
        drag2dY = e.touches[0].clientY;
        touch2dDownX = drag2dX;
        touch2dDownY = drag2dY;
      } else if (e.touches.length === 2) {
        touchActive2d = false;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        pinchPrev2d = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        pinchCenter2d = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
      }
    };
    const on2dTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchCenter2d) {
        // Pinch-zoom on the 2D canvas, anchored at the gesture centre
        // so the world point under the fingers stays put. Mirrors the
        // wheel-zoom math in on2dWheel.
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        if (pinchPrev2d > 0) {
          const f = pinchPrev2d / dist;
          const rect = c2.getBoundingClientRect();
          const mx = pinchCenter2d.x - rect.left;
          const my = pinchCenter2d.y - rect.top;
          const W = c2.width;
          const H = c2.height;
          zx2d = (mx - W / 2) * (1 - f) + zx2d * f;
          zy2d = (my - H / 2) * (1 - f) + zy2d * f;
          zoom2d = Math.max(0.12, Math.min(5, zoom2d / f));
        }
        pinchPrev2d = dist;
        pinchCenter2d = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
        return;
      }
      if (!touchActive2d || e.touches.length !== 1) return;
      if (
        Math.abs(e.touches[0].clientX - touch2dDownX) +
          Math.abs(e.touches[0].clientY - touch2dDownY) >
        6
      ) {
        touch2dMoved = true;
      }
      zx2d += e.touches[0].clientX - drag2dX;
      zy2d += e.touches[0].clientY - drag2dY;
      drag2dX = e.touches[0].clientX;
      drag2dY = e.touches[0].clientY;
    };
    const on2dTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchPrev2d = 0;
        pinchCenter2d = null;
      }
      const wasMoved = touch2dMoved;
      const wasActive = touchActive2d;
      if (e.touches.length === 0) touchActive2d = false;
      if (
        wasActive &&
        !wasMoved &&
        bridge.view === '2d' &&
        e.changedTouches.length === 1 &&
        e.touches.length === 0
      ) {
        const t = e.changedTouches[0];
        tryPick2d(t.clientX, t.clientY);
      }
    };

    c2.style.cursor = 'grab';
    lifecycle.on(c2, 'wheel', on2dWheel, { passive: false });
    lifecycle.on(c2, 'mousedown', on2dMouseDown);
    lifecycle.on(window, 'mouseup', on2dMouseUp);
    lifecycle.on(window, 'mousemove', on2dMouseMove);
    lifecycle.on(c2, 'touchstart', on2dTouchStart, { passive: true });
    lifecycle.on(c2, 'touchmove', on2dTouchMove, { passive: true });
    lifecycle.on(c2, 'touchend', on2dTouchEnd);

    // ──────────────────────────────────────────────────────────────
    // 2D draw — ported from P01 lines 393–533
    // Deferred to later checkpoints: SMALL bodies, comets, Kuiper Belt,
    // Planet Nine ring, selection ring, tooltip (3a-5/3a-6).
    // ──────────────────────────────────────────────────────────────

    const draw2d = () => {
      // Defensive sync: the canvas is `display: none` while view='3d',
      // so its clientWidth/clientHeight are 0 at onMount and resize2d()
      // sets c2.width=c2.height=0. When the user toggles to 2D the
      // canvas's layout size becomes non-zero again — re-pick it up
      // here so the very first frame after the toggle isn't blank.
      // Cheap: a single property compare on the hot path.
      if (c2.width !== c2.clientWidth || c2.height !== c2.clientHeight) {
        c2.width = c2.clientWidth;
        c2.height = c2.clientHeight;
      }
      const W = c2.width;
      const H = c2.height;
      if (W === 0 || H === 0) return; // Layout still pending; skip frame.
      ctx2.fillStyle = '#04040c';
      ctx2.fillRect(0, 0, W, H);

      // Stars in screen space (deterministic positions)
      for (let i = 0; i < 200; i++) {
        const sx = (i * 137.5 * 31 + i * 71) % W;
        const sy = (i * 137.5 * 17 + i * 53) % H;
        ctx2.beginPath();
        ctx2.arc(sx, sy, i % 8 === 0 ? 1.2 : 0.5, 0, Math.PI * 2);
        ctx2.fillStyle = `rgba(210,215,255,${0.06 + (i % 5) * 0.04})`;
        ctx2.fill();
      }

      ctx2.save();
      ctx2.translate(W / 2 + zx2d, H / 2 + zy2d);
      ctx2.scale(zoom2d, zoom2d);

      // Orbit rings (highlighted for the selected planet). Tonal
      // balance matches the 3D LineBasicMaterial (white opacity 0.06,
      // 1u line) so the two views read with the same emphasis. The
      // previous 0.05 opacity at 0.5 lineWidth was nearly invisible
      // on most monitors due to subpixel anti-aliasing.
      PLANETS.forEach((p) => {
        const isSel = bridge.selectedId === p.id;
        ctx2.beginPath();
        ctx2.arc(0, 0, p.orbitR, 0, Math.PI * 2);
        ctx2.strokeStyle = isSel ? 'rgba(68,102,255,0.55)' : 'rgba(255,255,255,0.18)';
        ctx2.lineWidth = isSel ? 1.5 : 1;
        ctx2.stroke();
      });

      // Mission overlay arc (Theme A.A1) — drawn after orbit rings
      // but before planets so the arc sits behind the planet dots.
      if (bridge.overlayArcPx.length > 1 && bridge.overlayMission) {
        const accent = bridge.overlayMission.color || '#4ecdc4';
        ctx2.save();
        ctx2.beginPath();
        ctx2.moveTo(bridge.overlayArcPx[0].x, bridge.overlayArcPx[0].z);
        for (let i = 1; i < bridge.overlayArcPx.length; i++) {
          ctx2.lineTo(bridge.overlayArcPx[i].x, bridge.overlayArcPx[i].z);
        }
        ctx2.strokeStyle = accent;
        ctx2.lineWidth = 1.6;
        ctx2.shadowColor = accent;
        ctx2.shadowBlur = 6;
        ctx2.stroke();
        // Departure node (teal) + arrival node (gold) per UXS-001 §Extension.
        ctx2.shadowBlur = 4;
        ctx2.fillStyle = '#4ecdc4';
        ctx2.beginPath();
        ctx2.arc(bridge.overlayArcPx[0].x, bridge.overlayArcPx[0].z, 4, 0, Math.PI * 2);
        ctx2.fill();
        if (bridge.overlayArrivalPx) {
          ctx2.fillStyle = '#ffc850';
          ctx2.beginPath();
          ctx2.arc(bridge.overlayArrivalPx.x, bridge.overlayArrivalPx.z, 4, 0, Math.PI * 2);
          ctx2.fill();
        }
        ctx2.restore();
      }

      // Small-body orbit paths — closed dashed ellipses for dwarfs and
      // comets, open hyperbola for interstellar (Oumuamua). Uses
      // sampleOrbitPoints so the math stays consistent with 3D mode.
      // Each type gated by its layer flag (issue #32).
      SMALL_BODIES.forEach((b: any) => {
        if (b.type === 'dwarf' && !bridge.layers.dwarfs) return;
        if (b.type === 'comet' && !bridge.layers.comets) return;
        if (b.type === 'interstellar' && !bridge.layers.interstellar) return;
        const pts = sampleOrbitPoints(b, 96);
        ctx2.save();
        ctx2.beginPath();
        for (let i = 0; i < pts.length; i++) {
          if (i === 0) ctx2.moveTo(pts[i].x, pts[i].z);
          else ctx2.lineTo(pts[i].x, pts[i].z);
        }
        if (b.type === 'interstellar') {
          ctx2.strokeStyle = 'rgba(255,136,102,0.45)';
          ctx2.lineWidth = 0.8;
        } else {
          ctx2.strokeStyle =
            b.type === 'comet' ? 'rgba(136,221,255,0.18)' : 'rgba(200,180,140,0.14)';
          ctx2.lineWidth = 0.6;
          ctx2.setLineDash([3, 6]);
          ctx2.closePath();
        }
        ctx2.stroke();
        ctx2.setLineDash([]);
        ctx2.restore();
      });

      // Asteroid belt
      for (let i = 0; i < 280; i++) {
        const a = (i / 280) * Math.PI * 2 + simT * 0.016;
        const r = 192 + (i % 38) * 1.1;
        ctx2.beginPath();
        ctx2.arc(Math.cos(a) * r, Math.sin(a) * r, 0.85, 0, Math.PI * 2);
        ctx2.fillStyle = `rgba(185,162,110,${0.05 + (i % 7) * 0.03})`;
        ctx2.fill();
      }

      // Kuiper Belt — icy bodies beyond Neptune (30–50 AU).
      for (let i = 0; i < 500; i++) {
        const a = (i / 500) * Math.PI * 2 + simT * 0.003;
        const r = 438 + (i % 44) * 0.9;
        ctx2.beginPath();
        ctx2.arc(Math.cos(a) * r, Math.sin(a) * r, 0.75, 0, Math.PI * 2);
        ctx2.fillStyle = `rgba(140,160,210,${0.035 + (i % 9) * 0.018})`;
        ctx2.fill();
      }

      // Planet Nine — hypothetical, ~600 AU. Drawn as a dashed ring with
      // a small caption that floats above. Visible only at moderate zoom.
      const pnR = Math.min(W, H) * 0.49;
      ctx2.beginPath();
      ctx2.arc(0, 0, pnR, 0, Math.PI * 2);
      ctx2.strokeStyle = 'rgba(160,120,220,0.14)';
      ctx2.lineWidth = 1;
      ctx2.setLineDash([4, 9]);
      ctx2.stroke();
      ctx2.setLineDash([]);
      ctx2.save();
      ctx2.font = "7px 'Space Mono',monospace";
      ctx2.fillStyle = 'rgba(160,120,220,0.32)';
      ctx2.textAlign = 'center';
      ctx2.fillText('PLANET NINE? · HYPOTHETICAL · ~600 AU', 0, -pnR - 6);
      ctx2.restore();

      // Sun glow + core
      for (let r = 90; r > 0; r -= 6) {
        const sg = ctx2.createRadialGradient(0, 0, 0, 0, 0, r);
        sg.addColorStop(0, `rgba(255,228,130,${0.012 * (90 / r)})`);
        sg.addColorStop(1, 'rgba(255,120,0,0)');
        ctx2.beginPath();
        ctx2.arc(0, 0, r, 0, Math.PI * 2);
        ctx2.fillStyle = sg;
        ctx2.fill();
      }
      ctx2.beginPath();
      ctx2.arc(0, 0, 14, 0, Math.PI * 2);
      ctx2.fillStyle = '#fff8e7';
      ctx2.fill();
      ctx2.save();
      ctx2.font = "7px 'Space Mono',monospace";
      ctx2.fillStyle = 'rgba(255,220,100,0.5)';
      ctx2.textAlign = 'center';
      ctx2.fillText('SUN', 0, 22);
      ctx2.restore();

      // Planets — gated by the PLANETS layer (issue #32). When the
      // layer is off we skip drawing AND populating planet2dPos so
      // the pick logic ignores invisible bodies too.
      if (!bridge.layers.planets) planet2dPos.clear();
      if (bridge.layers.planets)
        PLANETS.forEach((p) => {
          const ang = p.a0 + simT * ((2 * Math.PI) / p.period);
          const pr = Math.max(3, p.size2);
          const px = Math.cos(ang) * p.orbitR;
          const py = Math.sin(ang) * p.orbitR;
          planet2dPos.set(p.id, { x: px, y: py });

          const isSel = bridge.selectedId === p.id;

          // Selection ring (pulsing) — drawn before sphere so it sits behind glow
          if (isSel) {
            const pulse = 0.5 + 0.5 * Math.sin(simT * 80);
            ctx2.beginPath();
            ctx2.arc(px, py, pr + 10 + pulse * 3, 0, Math.PI * 2);
            ctx2.strokeStyle = `rgba(68,102,255,${0.55 + pulse * 0.3})`;
            ctx2.lineWidth = 1.5;
            ctx2.stroke();
          }

          // Outer glow
          const gl = ctx2.createRadialGradient(px, py, 0, px, py, pr * 4);
          gl.addColorStop(0, p.css + '55');
          gl.addColorStop(1, 'rgba(0,0,0,0)');
          ctx2.beginPath();
          ctx2.arc(px, py, pr * 4, 0, Math.PI * 2);
          ctx2.fillStyle = gl;
          ctx2.fill();

          // Saturn rings (behind sphere)
          if (p.id === 'saturn') {
            ctx2.save();
            ctx2.translate(px, py);
            ctx2.scale(1, 0.3);
            ctx2.beginPath();
            ctx2.ellipse(0, 0, pr + 14, pr + 14, 0, 0, Math.PI * 2);
            ctx2.strokeStyle = 'rgba(228,209,145,0.22)';
            ctx2.lineWidth = 7;
            ctx2.stroke();
            ctx2.restore();
          }

          // Planet sphere with per-planet shading
          ctx2.beginPath();
          ctx2.arc(px, py, pr, 0, Math.PI * 2);
          const sg = ctx2.createRadialGradient(px - pr * 0.3, py - pr * 0.3, pr * 0.1, px, py, pr);
          if (p.id === 'earth') {
            sg.addColorStop(0, '#6ab8e8');
            sg.addColorStop(1, '#0d3050');
          } else if (p.id === 'mars') {
            sg.addColorStop(0, '#e0704a');
            sg.addColorStop(1, '#7a2000');
          } else if (p.id === 'jupiter') {
            sg.addColorStop(0, '#deb878');
            sg.addColorStop(1, '#6a3a0e');
          } else if (p.id === 'saturn') {
            sg.addColorStop(0, '#ece8b0');
            sg.addColorStop(1, '#9a8830');
          } else if (p.id === 'venus') {
            sg.addColorStop(0, '#f0e0a0');
            sg.addColorStop(1, '#9a7820');
          } else if (p.id === 'uranus') {
            sg.addColorStop(0, '#a8f0f0');
            sg.addColorStop(1, '#207878');
          } else if (p.id === 'neptune') {
            sg.addColorStop(0, '#6080d8');
            sg.addColorStop(1, '#101858');
          } else if (p.id === 'mercury') {
            sg.addColorStop(0, '#d0c8c0');
            sg.addColorStop(1, '#504840');
          } else {
            sg.addColorStop(0, p.css);
            sg.addColorStop(1, p.css + '88');
          }
          ctx2.fillStyle = sg;
          ctx2.fill();

          // Jupiter bands
          if (p.id === 'jupiter' && pr > 6) {
            ctx2.save();
            ctx2.beginPath();
            ctx2.arc(px, py, pr, 0, Math.PI * 2);
            ctx2.clip();
            const bands: Array<[number, string]> = [
              [pr * 0.22, 'rgba(160,90,40,0.28)'],
              [pr * 0.65, 'rgba(140,80,30,0.28)'],
            ];
            for (const [dy, col] of bands) {
              ctx2.fillStyle = col;
              ctx2.fillRect(px - pr, py - dy - pr * 0.07, pr * 2, pr * 0.14);
            }
            ctx2.restore();
          }

          // Saturn rings (front)
          if (p.id === 'saturn') {
            ctx2.save();
            ctx2.translate(px, py);
            ctx2.scale(1, 0.3);
            ctx2.beginPath();
            ctx2.ellipse(0, 0, pr + 14, pr + 14, 0, 0, Math.PI * 2);
            ctx2.strokeStyle = 'rgba(228,209,145,0.5)';
            ctx2.lineWidth = 3.5;
            ctx2.stroke();
            ctx2.restore();
          }

          // Specular highlight
          ctx2.beginPath();
          ctx2.arc(px - pr * 0.28, py - pr * 0.28, pr * 0.2, 0, Math.PI * 2);
          ctx2.fillStyle = 'rgba(255,255,255,0.18)';
          ctx2.fill();

          // Label
          ctx2.save();
          ctx2.font = "8px 'Space Mono',monospace";
          ctx2.shadowColor = 'rgba(0,0,0,0.9)';
          ctx2.shadowBlur = 6;
          ctx2.fillStyle = p.css + 'cc';
          ctx2.textAlign = 'left';
          ctx2.fillText(p.name, px + pr + 5, py + 3);
          ctx2.restore();
        });

      // Small bodies — dots + labels. Closed-orbit bodies advance with
      // simT; interstellar visitors stay pinned at perihelion (since
      // they passed through once and are gone). Gated per-type by
      // the dwarfs/comets/interstellar layer flags (issue #32).
      smallBody2dPos.clear();
      SMALL_BODIES.forEach((b: any) => {
        if (b.type === 'dwarf' && !bridge.layers.dwarfs) return;
        if (b.type === 'comet' && !bridge.layers.comets) return;
        if (b.type === 'interstellar' && !bridge.layers.interstellar) return;
        // #287 Slice E — Pluto rendered as a planet, skip the 2D
        // small-body draw to avoid duplicate dot + orbit ring.
        if (b.id === 'pluto') return;
        const { x: px, z: py } = smallBodyPosition(b, simT);
        smallBody2dPos.set(b.id, { x: px, y: py });

        // Glow
        const gl = ctx2.createRadialGradient(px, py, 0, px, py, 6);
        gl.addColorStop(0, b.color + '88');
        gl.addColorStop(1, 'rgba(0,0,0,0)');
        ctx2.beginPath();
        ctx2.arc(px, py, 6, 0, Math.PI * 2);
        ctx2.fillStyle = gl;
        ctx2.fill();

        // Comet tail — simple line pointing away from Sun.
        if (b.type === 'comet') {
          const distFromSun = Math.hypot(px, py);
          if (distFromSun > 0) {
            const tailLen = 18;
            const tx = px + (px / distFromSun) * tailLen;
            const ty = py + (py / distFromSun) * tailLen;
            ctx2.beginPath();
            ctx2.moveTo(px, py);
            ctx2.lineTo(tx, ty);
            ctx2.strokeStyle = `${b.color}88`;
            ctx2.lineWidth = 1.5;
            ctx2.stroke();
          }
        }

        // Body dot
        ctx2.beginPath();
        ctx2.arc(px, py, b.type === 'comet' ? 1.6 : 2.2, 0, Math.PI * 2);
        ctx2.fillStyle = b.color;
        ctx2.fill();

        // Label
        ctx2.save();
        ctx2.font = "7px 'Space Mono',monospace";
        ctx2.shadowColor = 'rgba(0,0,0,0.9)';
        ctx2.shadowBlur = 5;
        ctx2.fillStyle = b.color + 'aa';
        ctx2.textAlign = 'left';
        ctx2.fillText(b.name, px + 5, py + 2);
        ctx2.restore();
      });

      ctx2.restore();

      // Bottom hint in screen space
      ctx2.save();
      ctx2.font = "8px 'Space Mono',monospace";
      ctx2.fillStyle = 'rgba(255,255,255,0.08)';
      ctx2.fillText('ECLIPTIC PLANE · TOP-DOWN · SCROLL TO ZOOM · DRAG TO PAN', 22, H - 10);
      ctx2.restore();
    };

    // ──────────────────────────────────────────────────────────────
    // Resize
    // ──────────────────────────────────────────────────────────────

    const onResize = () => {
      if (!bridge.container) return;
      camera.aspect = bridge.container.clientWidth / bridge.container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(bridge.container.clientWidth, bridge.container.clientHeight);
      composer.setSize(bridge.container.clientWidth, bridge.container.clientHeight);
      bloomPass?.setSize(bridge.container.clientWidth, bridge.container.clientHeight);
      mwScene?.setSize(bridge.container.clientWidth, bridge.container.clientHeight);
      lgScene?.setSize(bridge.container.clientWidth, bridge.container.clientHeight);
      nbScene?.setSize(bridge.container.clientWidth, bridge.container.clientHeight);
      bhScene?.setSize(bridge.container.clientWidth, bridge.container.clientHeight, renderer.getPixelRatio());
      resize2d();
      // Iconic trajectories use Line2 with screen-pixel-aware
      // LineMaterial — push the new resolution so the stroke width
      // stays crisp after a viewport change.
      for (const h of iconicTrajectoryHandles) {
        h.onResize(bridge.container.clientWidth, bridge.container.clientHeight);
      }
      // Selection ring shares the same screen-pixel-width semantics —
      // push the new resolution so the 1.2px stroke stays exact after
      // a viewport resize / device-rotation.
      selRingMat.resolution.set(bridge.container.clientWidth, bridge.container.clientHeight);
      // Re-fit the iconic-mission legend to the new viewport height.
      sizePathsLegend();
    };
    lifecycle.on(window, 'resize', onResize);

    // ──────────────────────────────────────────────────────────────
    // Animation loop — dispatches by `view`
    // ──────────────────────────────────────────────────────────────

    let simT = 0;
    // #351 Layer 2-B — simT=0 anchors to the page-load day so the date
    // chip reads a real calendar date. The date label is reformatted only
    // when the integer day (or locale) actually changes, to avoid churn.
    const simEpochMs = Date.now();
    // #351 Layer 2-A — anchor the planet start-angles to the REAL sky.
    // Overwrite the artistic a0 with each planet's real heliocentric
    // ecliptic longitude for the page-load day: J2000 mean longitude +
    // mean motion (circular 2-body — approximate, a few degrees off for
    // the eccentric ones, consistent with the stylized orrery). simT=0
    // stays "today"; small bodies / starfield are untouched. Reverting
    // this whole block falls back to Layer 2-B's decorative angles.
    {
      const J2000_MS = Date.UTC(2000, 0, 1, 12);
      const MEAN_LON_J2000_DEG: Record<string, number> = {
        mercury: 252.25,
        venus: 181.98,
        earth: 100.46,
        mars: 355.43,
        jupiter: 34.4,
        saturn: 49.94,
        uranus: 313.23,
        neptune: 304.88,
        pluto: 238.93,
      };
      const yrSinceJ2000 = (simEpochMs - J2000_MS) / (DAYS_PER_YEAR * 86_400_000);
      for (const p of PLANETS) {
        const L0 = MEAN_LON_J2000_DEG[p.id];
        if (L0 === undefined) continue;
        const deg = (((L0 + (360 * yrSinceJ2000) / p.period) % 360) + 360) % 360;
        p.a0 = deg * (Math.PI / 180);
      }
    }
    let lastSimDayIndex = Number.NaN;
    let lastDateLocale = '';
    resetSimToToday = () => {
      simT = 0;
    };
    let lastTime = performance.now();

    // raf pump with the TA.md document.hidden contract baked in. The
    // local `reducedMotion` flag still gates the per-frame sim-time
    // advance (ADR-025) — we don't hand it to createAnimateLoop's
    // deps.getReducedMotion() option because user-initiated camera drag still
    // needs to update the render even when sim time is frozen.
    // Render-loop throttle counter — composer.render() is skipped on
    // 3 of every 4 frames when a right-side detail panel covers most
    // of the canvas. Positions + arc-highlight + selection halo all
    // update every frame; only the WebGL submission is skipped, so
    // the visible image holds for ~33 ms on a 120 Hz display and
    // ~67 ms on 60 Hz (below the perceptual flicker threshold for
    // /explore's slow orbital motion). The GPU bill drops to 25% and
    // the freed main-thread budget routes to MissionPanel re-renders
    // + the Svelte reactive cascade during the click-heavy mission-
    // browsing window. Verified by perf-explore-iconic-clicks.spec.ts
    // on 2026-06-20: hero-image-loaded validation 42 → 49 / 50,
    // panel-title-match 48 → 49 / 50 (both at the ceiling).
    let frameThrottleCount = 0;
    const loop = createAnimateLoop({
      onFrame: () => {
        frameMonitor.tick();
        const now = performance.now();
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        // ADR-025: when prefers-reduced-motion is set we freeze sim
        // time. User-initiated camera drag still works. #351 Layer 1:
        // `simPaused` is the user-facing pause; `simSpeed` (days/sec)
        // sets the rate. simT is years → divide by DAYS_PER_YEAR.
        if (!deps.getReducedMotion() && !bridge.simPaused) simT += (dt * bridge.simSpeed) / DAYS_PER_YEAR;

        // #351 Layer 2-B — surface the simulated calendar date. Reformat
        // only when the day index or locale changes (cheap guard; the
        // formatter is the only per-change cost, never per-frame).
        const simDayIndex = Math.floor(
          (simEpochMs + simT * DAYS_PER_YEAR * 86_400_000) / 86_400_000,
        );
        const dateLocale = getLocale();
        if (simDayIndex !== lastSimDayIndex || dateLocale !== lastDateLocale) {
          lastSimDayIndex = simDayIndex;
          lastDateLocale = dateLocale;
          bridge.simDateLabel = new Intl.DateTimeFormat(dateLocale, {
            year: 'numeric',
            month: 'short',
            // 2-digit day so the string never changes length as the day
            // ticks 9 → 10 (#351 Layer 2-B) — keeps the chip width stable.
            day: '2-digit',
          }).format(new Date(simDayIndex * 86_400_000));
        }

        // Fly-to-body tween (#287 polish). When focused on a planet, the
        // target world position drifts with the planet's own orbital
        // motion — re-read it each frame so the tween lands on the
        // planet's current position, not where it was when focus() fired.
        if (flyActive) {
          if (focusedPlanetObj) {
            focusedPlanetObj.mesh.getWorldPosition(flyToOrigin);
          }
          const t = Math.min(1, (now - flyStart) / FLY_DURATION_MS);
          const e = 1 - Math.pow(1 - t, 3); // ease-out cubic
          focusOrigin.lerpVectors(flyFromOrigin, flyToOrigin, e);
          camR = flyFromR + (flyToR - flyFromR) * e;
          camP = flyFromP + (flyToP - flyFromP) * e;
          camT = flyFromT + (flyToT - flyFromT) * e;
          if (t >= 1) {
            flyActive = false;
            camRMin = flyToMinR;
            camRMax = flyToMaxR;
          }
          updateCam();
        } else if (focusedPlanetObj) {
          // Steady-state planet focus — keep focusOrigin glued to the
          // planet's drifting world position so wheel-zoom and drag
          // stay planet-relative across orbital motion.
          focusedPlanetObj.mesh.getWorldPosition(focusOrigin);
          updateCam();
        }

        // Gyro tilt-to-look (RFC-020 §6). Consume every frame to keep the
        // service synced; apply only when idle (not fly-tweening, not dragging).
        const gy = gyro.consume();
        if (!flyActive && !isDrag3d && !touchActive3d && (gy.dAz !== 0 || gy.dEl !== 0)) {
          camT += gy.dAz;
          camP = Math.max(0.08, Math.min(Math.PI * 0.48, camP + gy.dEl));
          updateCam();
        }

        // Exhibit Mode (#215): a slow cinematic auto-orbit for the unattended
        // kiosk (no user drives the camera). Surface scenes auto-rotate the body
        // and /iss + /tiangong spin; /explore's camera is otherwise static.
        if (exhibit.active && !flyActive && !isDrag3d && !touchActive3d) {
          camT += dt * 0.05;
          updateCam();
        }

        // #287 per-planet 4K LOD swap. Cheap per-frame — a single
        // distance check + threshold compare per planet. Active in 3D
        // only (2D top-down view doesn't sample texture pixels in a
        // way that benefits from 4K). Same loop now also gates moon
        // visibility on the same threshold so satellites appear at
        // the moment the parent's detail kicks in.
        if (bridge.view === '3d') {
          updateSunLod(camera.position.length());
          updatePlanetLods();
          updateSatellites(dt);
        }

        if (bridge.view === '3d') {
          // Apply layer visibility (issue #32). Cheap — just sets the
          // .visible flag on the existing scene refs each frame so
          // toggling the LAYERS panel takes effect on the very next
          // tick without rebuilding any geometry.
          for (const line of planetOrbitLines) line.visible = bridge.layers.planets;
          for (const o of planetObjs) o.group.visible = bridge.layers.planets;
          for (const o of smallBodyObjs) {
            const on =
              o.body.type === 'dwarf'
                ? bridge.layers.dwarfs
                : o.body.type === 'comet'
                  ? bridge.layers.comets
                  : bridge.layers.interstellar;
            o.mesh.visible = on;
            o.pickAid.visible = on;
            o.orbit.visible = on;
            if (o.tail) o.tail.visible = on;
          }

          planetObjs.forEach(({ group, mesh, planet }: any, idx: number) => {
            const angle = planet.a0 + (2 * Math.PI * simT) / planet.period;
            const inc = (planet.inc * Math.PI) / 180;
            const x = Math.cos(angle) * planet.orbitR;
            const zf = Math.sin(angle) * planet.orbitR;
            group.position.set(x, zf * Math.sin(inc), zf * Math.cos(inc));
            // ADR-025: gate the per-frame axial spin under reduced-motion
            // alongside the orbit advance. The audit caught this bypass
            // in v1.0 — planets kept spinning even with simT frozen.
            if (!deps.getReducedMotion()) mesh.rotation.y += 0.005;

            // PRD-023 Slice B — position L1 + L2 markers along the planet→
            // Sun line. Sun is at origin, planet at group.position; the
            // unit vector from planet to Sun in WORLD space is
            // -group.position.normalize(). L1 sits inside the planet's
            // orbit (toward Sun); L2 outside (away from Sun). Distance
            // from planet matches the stylised Hill-sphere radius
            // (6 × planet size3). Markers + labels are parented to the
            // planet's group (translation only) so the local position
            // equals the world direction.
            const obj = planetObjs[idx];
            // PRD-023 Slice B + D — bodies needing the planet→Sun unit
            // vector each frame: L1/L2 markers, sub-solar marker on the
            // sunlit surface, magnetosphere orientation (stretches
            // along anti-sun axis).
            if (
              obj.hillSphere.visible ||
              obj.lagrangeL1.visible ||
              obj.lagrangeL2.visible ||
              obj.subSolar.visible ||
              (obj.magnetosphere?.visible ?? false)
            ) {
              const sunDir = group.position.length();
              if (sunDir > 0.0001) {
                const ux = -group.position.x / sunDir;
                const uy = -group.position.y / sunDir;
                const uz = -group.position.z / sunDir;
                if (obj.lagrangeL1.visible || obj.lagrangeL2.visible) {
                  const lagrangeDist = planet.size3 * 6;
                  obj.lagrangeL1.position.set(
                    ux * lagrangeDist,
                    uy * lagrangeDist,
                    uz * lagrangeDist,
                  );
                  obj.lagrangeL2.position.set(
                    -ux * lagrangeDist,
                    -uy * lagrangeDist,
                    -uz * lagrangeDist,
                  );
                  obj.lagrangeL1Label.position.copy(obj.lagrangeL1.position).multiplyScalar(1.18);
                  obj.lagrangeL2Label.position.copy(obj.lagrangeL2.position).multiplyScalar(1.18);
                }
                if (obj.subSolar.visible) {
                  // Sub-solar point on the planet surface, at the
                  // longitude where the Sun is directly overhead.
                  obj.subSolar.position.set(
                    ux * planet.size3,
                    uy * planet.size3,
                    uz * planet.size3,
                  );
                }
                if (obj.magnetosphere?.visible) {
                  // Orient the magnetotail along the anti-sun axis —
                  // the ellipsoid's long axis (scale Z=2.4) points
                  // AWAY from the Sun. lookAt() points the local Z
                  // toward the given world coordinate; passing planet
                  // position - sun-direction = planet position +
                  // anti-sun-direction gives the right orientation.
                  obj.magnetosphere.lookAt(
                    group.position.x - ux,
                    group.position.y - uy,
                    group.position.z - uz,
                  );
                }
              }
            }

            // Phase H — overlay arrow updates. Group is at planet's world
            // pos; arrows live in the group's local frame, so directions
            // need transforming back from world space.
            //
            // Close-zoom polish (2026-06-03): at heliocentric framing the
            // arrows use log-scaled lengths optimised for cross-system
            // comparison. When the camera focuses on a single planet
            // those same lengths overshoot the planet sphere with the
            // base hidden INSIDE the silhouette and labels sitting on
            // top of the planet's body. The `closeZoom` lerp below
            // smoothly transitions to a planet-relative pose: arrow
            // base offset just outside the selection halo, length
            // compacted to ~1.5× planet radius, labels follow the new
            // tip.
            const ov = overlayPerPlanet[idx];
            if (!ov) return;
            if (ov.gravity.visible || ov.centripetal.visible || ov.velocity.visible) {
              // World vector pointing planet → Sun (origin), normalised.
              const worldToSun = new THREE.Vector3(
                -group.position.x,
                -group.position.y,
                -group.position.z,
              );
              const dist = worldToSun.length();
              if (dist > 0.0001) {
                worldToSun.divideScalar(dist);

                // Distance ratio drives the wide→close lerp. Same
                // threshold the moon-reveal + 4K LOD already use.
                mesh.getWorldPosition(tmpWorldPos);
                const camRatio = camera.position.distanceTo(tmpWorldPos) / planet.size3;
                const tWide = Math.max(
                  0,
                  Math.min(
                    1,
                    (camRatio - PLANET_LOD_IN_RATIO) / (PLANET_LOD_OUT_RATIO - PLANET_LOD_IN_RATIO),
                  ),
                );
                // Close-zoom presentation: base just past the selection
                // halo (1.18× radius), length ~1.5× planet radius — so
                // the whole arrow sits in the empty space between the
                // planet's silhouette and the inner moon ring.
                const closeBase = planet.size3 * 1.3;
                const closeLen = planet.size3 * 1.5;
                // Label sprites are built at worldScale=14 (constant
                // world units). At close zoom that's wider than the
                // planet itself; lerp scale down so labels stay
                // readable but proportional. Aspect 4:1 preserved.
                const labelScale = 4 + (14 - 4) * tWide;
                // Arrow head ratios — at close zoom the default
                // 0.22 / 0.13 made the cone ~1/5 of planet diameter.
                // Halve them at close zoom.
                const headRatio = 0.11 + (0.22 - 0.11) * tWide;
                const headWidthRatio = 0.065 + (0.13 - 0.065) * tWide;

                // Group has only translation (no rotation), so world dir
                // == local dir — pass directly to setDirection.
                if (ov.gravity.visible) {
                  // Acceleration in m/s² at this orbit radius (use a as proxy
                  // for r — circular). Length log-scaled to fit the 1/r²
                  // dynamic range across Mercury → Pluto.
                  const aAU = Math.pow(planet.period, 2 / 3);
                  const aG = gravityAccel(BODY_MASS_KG.sun, aAU * 149_597_870.7);
                  const wideLen = logScaleLength(aG, 6, 26, 1e-7, 1e-2);
                  const len = closeLen + (wideLen - closeLen) * tWide;
                  const base = closeBase * (1 - tWide);
                  ov.gravity.setDirection(worldToSun);
                  ov.gravity.position.copy(worldToSun).multiplyScalar(base);
                  ov.gravity.setLength(len, len * headRatio, len * headWidthRatio);
                  // Label sits past the arrow tip = base + length, +20%
                  // overshoot so the arrow head doesn't occlude the text.
                  ov.gravityLabel.position.copy(worldToSun).multiplyScalar(base + len * 1.2);
                  ov.gravityLabel.scale.set(labelScale, labelScale * 0.25, 1);
                }
                if (ov.centripetal.visible) {
                  // Same direction (inward) as gravity — for a circular
                  // orbit, gravity provides exactly the centripetal
                  // acceleration (F = ma). Y-offset prevents overlap.
                  const aAU = Math.pow(planet.period, 2 / 3);
                  const aG = gravityAccel(BODY_MASS_KG.sun, aAU * 149_597_870.7);
                  const wideLen = logScaleLength(aG, 5, 22, 1e-7, 1e-2);
                  const len = closeLen + (wideLen - closeLen) * tWide;
                  const base = closeBase * (1 - tWide);
                  ov.centripetal.setDirection(worldToSun);
                  ov.centripetal.position.copy(worldToSun).multiplyScalar(base);
                  ov.centripetal.setLength(len, len * headRatio, len * headWidthRatio);
                  ov.centripetalLabel.position.copy(worldToSun).multiplyScalar(base + len * 1.2);
                  // Lift label by the same Y offset as the arrow base so
                  // it tracks the arrow's offset position. At close zoom
                  // the offset is smaller (proportional to the now
                  // shorter overall length).
                  ov.centripetalLabel.position.y += planet.size3 * (0.6 + tWide * 1.0);
                  ov.centripetalLabel.scale.set(labelScale, labelScale * 0.25, 1);
                }
                if (ov.velocity.visible) {
                  // Tangent to orbit, in the planet's orbital plane. Cross
                  // (worldToSun, orbital plane normal) gives the prograde
                  // direction; for the small inclinations used here, we
                  // approximate the plane normal as world-Y.
                  const tangent = _velTangent.crossVectors(_orbitUp, worldToSun).normalize();
                  // Speed in km/s via vis-viva at r = a (circular).
                  const aAU = Math.pow(planet.period, 2 / 3);
                  const v = Math.sqrt((4 * Math.PI * Math.PI) / aAU) * 4.7404; // km/s
                  // Linear scale on velocity, clamped for visibility.
                  const wideLen = Math.min(20, Math.max(4, v * 0.3));
                  const len = closeLen + (wideLen - closeLen) * tWide;
                  const base = closeBase * (1 - tWide);
                  ov.velocity.setDirection(tangent);
                  ov.velocity.position.copy(tangent).multiplyScalar(base);
                  ov.velocity.setLength(len, len * headRatio, len * headWidthRatio);
                  ov.velocityLabel.position.copy(tangent).multiplyScalar(base + len * 1.2);
                  ov.velocityLabel.scale.set(labelScale, labelScale * 0.25, 1);
                }
              }
            }
          });

          // Small bodies — closed ellipse advance for dwarfs/comets,
          // pinned-to-perihelion for interstellar visitors (Oumuamua).
          // Comet tails recompute per-frame pointing anti-solar.
          smallBodyObjs.forEach(({ mesh, pickAid, tail, body }: any) => {
            const { x: px, y: py, z: pz } = smallBodyPosition(body, simT);
            mesh.position.set(px, py, pz);
            pickAid.position.set(px, py, pz);

            if (tail) {
              // 3D anti-solar tail: take the body's heliocentric position
              // vector, normalise it, and extend by tailLen so the comet
              // tail points away from the Sun in full 3D — important now
              // that y is non-zero for inclined orbits.
              const dist = Math.hypot(px, py, pz);
              if (dist > 0) {
                const tailLen = 12;
                const ux = px / dist;
                const uy = py / dist;
                const uz = pz / dist;
                const tx = px + ux * tailLen;
                const ty = py + uy * tailLen;
                const tz = pz + uz * tailLen;
                // Mutate the 2-vertex position attribute in place instead of
                // dispose()+new BufferGeometry() every frame (a per-frame GPU
                // re-upload + 3 allocations per comet). The tail geometry is
                // built once with 2 points at creation (see smallBodyObjs).
                const pos = tail.geometry.attributes.position as THREE.BufferAttribute;
                pos.setXYZ(0, px, py, pz);
                pos.setXYZ(1, tx, ty, tz);
                pos.needsUpdate = true;
              }
            }
          });

          // Track selected planet with the 3D selection halo — a thin
          // BackSide sphere that reads as a soft glow on the silhouette.
          // Sized just outside the per-planet atmospheric halo (1.06×
          // size3) so the two don't overlap at close zoom; at wide
          // heliocentric framing it's still visually distinct against
          // the starfield. Opacity pulses to communicate "selected".
          // Selection halo prefers the satellite when one is picked —
          // ring follows the moon mesh instead of staying on the parent
          // planet (#304 follow-up, 2026-06-04). Falls back to the
          // planet halo when no satellite is selected.
          // Selection-ring placement. The ring's *radius* (set via
          // mesh.scale) tracks the body's size so the circle wraps the
          // silhouette at any zoom. The line *stroke* stays constant
          // (linewidth is in screen pixels via Line2). Billboarded
          // with lookAt(camera.position) so the ring reads as a clean
          // circle outline regardless of view angle.
          if (bridge.selectedSatelliteKey) {
            const [parentId, satId] = bridge.selectedSatelliteKey.split(':');
            const parentObj = planetObjs.find((o: any) => o.planet.id === parentId);
            const satObj = parentObj?.satellites.find((s: any) => s.def.id === satId);
            if (satObj) {
              satObj.mesh.getWorldPosition(tmpWorldPos);
              const r = satObj.def.sizeUnits * 1.25;
              selHalo.scale.set(r, r, r);
              selHalo.position.copy(tmpWorldPos);
              selHalo.lookAt(camera.position);
              // Gentle pulse: 0.30 → 0.55 opacity. "Barely visible"
              // floor with a soft heartbeat to confirm aliveness; no
              // strong flash.
              const pulse = 0.5 + 0.5 * Math.sin(simT * 80);
              selRingMat.opacity = 0.3 + pulse * 0.25;
              selHalo.visible = true;
            } else {
              selHalo.visible = false;
            }
          } else if (bridge.selectedId) {
            const selObj = planetObjs.find((o: any) => o.planet.id === bridge.selectedId);
            if (selObj) {
              const r = selObj.planet.size3 * 1.25;
              selHalo.scale.set(r, r, r);
              selHalo.position.copy(selObj.group.position);
              selHalo.lookAt(camera.position);
              const pulse = 0.5 + 0.5 * Math.sin(simT * 80);
              selRingMat.opacity = 0.3 + pulse * 0.25;
              selHalo.visible = true;
            } else {
              selHalo.visible = false;
            }
          } else {
            selHalo.visible = false;
          }

          // Iconic-trajectory encounter labels — per-frame screen-space
          // declutter so clustered waypoints (Rosetta has 3 Earth + Mars
          // + 2 asteroid flybys in the inner solar system) don't stack
          // into one unreadable blob on hover. Each handle early-returns
          // when its labelGroup is hidden, so cost is ~10 cheap ifs.
          if (iconicTrajectoryHandles.length > 0) {
            const ch = bridge.container?.clientHeight ?? 1;
            for (const h of iconicTrajectoryHandles) h.relayoutLabels(camera, ch);
          }

          // v2 scale ruler — keep the HUD's distance/unit readout live across
          // both contexts.
          updateScaleHud();

          // v2: inside the stellar neighborhood, render its own scene (the real
          // HYG field fading in as the camera pulls back, Sun collapsed to a
          // dot) with the shared camera, bypassing the solar composer + panel
          // throttle. v1's render path below is untouched.
          // v2 Slice 2: inside an exoplanet BodyScene, render its mini-orrery
          // (host star + planets on real Keplerian orbits) with the shared camera.
          // v2 Slice 6: a black hole takes over the whole view (geodesic lensing
          // fullscreen quad on its own ortho scene), rendered by the shared renderer.
          if (bridge.activeBlackHole && bhScene) {
            const now = performance.now();
            if (!deps.getReducedMotion()) bhScene.update(Math.min(0.05, (now - bhLastFrame) / 1000));
            bhLastFrame = now;
            // The shared renderer keeps autoClear off for the solar composer; the
            // black-hole quad is a full takeover, so clear + draw it each frame.
            const prevAutoClear = renderer.autoClear;
            renderer.autoClear = true;
            renderer.setClearColor(0x020309, 1);
            renderer.render(bhScene.scene, bhScene.camera);
            renderer.autoClear = prevAutoClear;
            return;
          }
          if (inBodyScene() && bodyScene) {
            stepCrossDolly();
            if (!bridge.simPaused && !deps.getReducedMotion()) bodySimYears += bodyRate;
            bodyScene.update(bodySimYears);
            renderer.render(bodyScene.scene, camera);
            return;
          }
          if (inNeighborhood() && nbScene) {
            stepCrossDolly();
            stepDeepSkyApproach();
            nbScene.update(camR, camera);
            renderer.render(nbScene.scene, camera);
            // Sun-compass: project the Sun (origin) to screen ~10×/s and steer the
            // "home" needle. On-screen → the gold marker speaks for itself; off-
            // screen → the needle points the way back.
            if ((sunCompassTick = (sunCompassTick + 1) % 6) === 0) {
              _sunNdc.set(0, 0, 0).project(camera);
              const on = _sunNdc.z < 1 && Math.abs(_sunNdc.x) <= 1 && Math.abs(_sunNdc.y) <= 1;
              const ang = (Math.atan2(-_sunNdc.y, _sunNdc.x) * 180) / Math.PI;
              bridge.sunCompass = { ang, on, ly: camera.position.length() * 3.2615638 };
            }
            return;
          }
          if (inMilkyWay() && mwScene) {
            stepCrossDolly();
            mwScene.update(camera);
            mwScene.render(renderer, camera); // cinematic bloom composer
            return;
          }
          if (inLocalGroup() && lgScene) {
            stepCrossDolly();
            lgScene.update(camera);
            lgScene.render(renderer, camera); // cinematic bloom composer
            return;
          }

          // Frame throttle — render 1 of every 4 frames when a right-
          // side detail panel covers the canvas. See module-level
          // declaration above for the why.
          const aRightPanelOpen =
            iconic.state.panelOpen ||
            bridge.panelState.planet ||
            bridge.panelState.sun ||
            bridge.panelState.smallBody ||
            bridge.panelState.satellite ||
            bridge.panelState.belt;
          if (aRightPanelOpen) {
            frameThrottleCount = (frameThrottleCount + 1) & 3;
            if (frameThrottleCount !== 0) return;
          } else {
            frameThrottleCount = 0;
          }
          composer.render();
        } else {
          draw2d();
        }
      },
    });
    lifecycle.add(loop.cleanup);
    lifecycle.add(() => nbScene?.dispose());
    lifecycle.add(() => mwScene?.dispose());
    lifecycle.add(() => lgScene?.dispose());
    lifecycle.add(() => bhScene?.dispose());
    lifecycle.add(() => bodyScene?.dispose());
    loop.start();

    // Disposables that aren't a listener live in the same chain. LIFO
    // drain so the most recently added run first; layer-stop callbacks
    // are non-null only when the corresponding overlay registered.
    if (stopLensWatch) lifecycle.add(stopLensWatch);
    if (stopHoverLayerWatch) lifecycle.add(stopHoverLayerWatch);
    if (stopExploreGravityLayer) lifecycle.add(stopExploreGravityLayer);
    if (stopExploreVelocityLayer) lifecycle.add(stopExploreVelocityLayer);
    if (stopExploreCentripetalLayer) lifecycle.add(stopExploreCentripetalLayer);
    if (stopExploreGalaxiesLayer) lifecycle.add(stopExploreGalaxiesLayer);
    if (stopExploreHillSphereLayer) lifecycle.add(stopExploreHillSphereLayer);
    if (stopExploreLagrangeLayer) lifecycle.add(stopExploreLagrangeLayer);
    if (stopExploreMagnetosphereLayer) lifecycle.add(stopExploreMagnetosphereLayer);
    if (stopExploreSubSolarLayer) lifecycle.add(stopExploreSubSolarLayer);
    lifecycle.add(() => localGroup.dispose());
    lifecycle.add(() => disposeScene(scene));
    // #287 — dispose lazy-loaded 4K textures that are held in
    // closures / per-planet state. disposeScene walks the scene
    // graph, but a planet's `lod.tex4k` may have been loaded
    // without ever being assigned to material.map (user zoomed
    // close but the texture finished loading after the camera
    // pulled back), and the Sun's 4K texture lives outside the
    // PLANETS loop. Without these explicit disposes those
    // textures stay resident in GPU memory after route teardown.
    lifecycle.add(() => sunMap4k?.dispose());
    lifecycle.add(() => {
      for (const obj of planetObjs) {
        obj.lod?.tex4k?.dispose();
      }
    });
    lifecycle.add(() => bloomPass?.dispose());
    lifecycle.add(() => renderer.dispose());
    // Force immediate WebGL context release (#363) — dispose() alone keeps
    // the context (and its GPU memory) resident until lazy GC, piling up
    // across navigations. Mirrors disposeSceneRenderer.
    lifecycle.add(() => renderer.forceContextLoss());
    lifecycle.add(() => el3d.remove());


  return {
    closeExoplanetFn,
    resetSimToToday,
    enterSystemFn,
    setConstellationsFn,
    setDeepSkyFn,
    toggleHrFn,
    openCausalityFn,
    exitDeepSkyFn,
    deepSkyGatewayFn,
    deepSkyDeepLinkFn,
    flyToBodyFn,
    exitNeighborhoodFn,
    resetNeighborhoodFn,
    resetMilkyWayFn,
    resetLocalGroupFn,
    exitBodySceneFn,
    exitMilkyWayFn,
    closeMwFn,
    mwDeepLinkFn,
    contextDeepLinkFn,
    exitLocalGroupFn,
    closeLgFn,
    exitBlackHoleFn,
    bhDeepLinkFn,
    setBhCurvatureFn,
    selectStarFn,
    closeStarFn,
    selectDeepSkyFn,
    gotoStarFn,
    indexSelectStarFn,
    tourCameraTeardown,
    iconicTrajectoryHandles,
  };
}
