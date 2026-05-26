<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { syncHotspotsModeUrl } from '$lib/surface-map/hotspots-url-sync';
  import { base } from '$app/paths';
  import * as THREE from 'three';
  import { createOutlinePassSetup } from '$lib/three/outline-pass-setup';
  import { createMarkerHalo } from '$lib/three/marker-halo';
  import { attachPickableHit } from '$lib/three/pickable-hit';
  import { disposeObject3d } from '$lib/three/dispose-object3d';
  import { dimMaterials } from '$lib/three/dim-materials';
  import {
    applyOrbiterLayerVisibility,
    buildOrbiterGroup,
    tickOrbiterDot,
    type OrbiterMarker,
  } from '$lib/three/orbiter-group';
  import { placeOnSphereTangent } from '$lib/three/place-on-sphere';
  import { addSurfaceLights } from '$lib/three/surface-lights';
  import { bindPanoramaEscape } from '$lib/three/panorama-keys';
  import { pickClosest2d } from '$lib/three/pick-closest-2d';
  import { createStarField } from '$lib/three/star-field';
  import { createSceneRenderer, disposeSceneRenderer } from '$lib/three/scene-renderer';
  import { createCanvasResizer } from '$lib/three/canvas-resizer';
  import { bindCanvasInputs } from '$lib/three/canvas-input-listeners';
  import PanelTabRow from '$lib/components/PanelTabRow.svelte';
  import LayerChipRow from '$lib/components/LayerChipRow.svelte';
  import PanelLightbox from '$lib/components/PanelLightbox.svelte';
  import PanelHeroImage from '$lib/components/PanelHeroImage.svelte';
  import PanoramaOverlay from '$lib/components/PanoramaOverlay.svelte';
  import ViewToggleButton from '$lib/components/ViewToggleButton.svelte';
  import View3dControls from '$lib/components/View3dControls.svelte';
  import HotspotsLodChip from '$lib/components/HotspotsLodChip.svelte';
  import PanoramaToggleButton from '$lib/components/PanoramaToggleButton.svelte';
  import TierContextCard from '$lib/components/TierContextCard.svelte';
  import type { TierContext, TierLayer } from '$lib/surface-map/tier-context';
  import { NATION_COLORS, colorFor, nationChipFor } from '$lib/surface-map/nation-palette';
  import { computeTierScale } from '$lib/surface-map/tier-scale';
  import { missionContextFor } from '$lib/surface-map/site-formatters';
  import { resolveInitialHotspotsMode, nextHotspotsMode } from '$lib/surface-map/hotspots-mode';
  import { groupLinksByTier, siteHasLinks } from '$lib/surface-map/link-tiers';
  import type { PanelTab } from '$lib/surface-map/panel-tabs';
  import { createStoryAutopromoteTracker } from '$lib/surface-map/story-autopromote';
  import { buildSurfacePanelTabs } from '$lib/surface-map/build-panel-tabs';
  import { drawNationLegend2d } from '$lib/surface-map/draw-nation-legend-2d';
  import { loadPanelData } from '$lib/surface-map/load-panel-data';
  import { getMarsSites, getMarsTraverse, getMarsSiteGallery, type SiteStory } from '$lib/data';
  import type { Traverse } from '$types/mars-site';
  import { localeFromPage } from '$lib/locale';
  import { onReducedMotionChange } from '$lib/reduced-motion';
  import { latLonToUnitSphere } from '$lib/moon-projection';
  import { buildMarsLanderModel } from '$lib/mars-lander-models';
  import {
    createHotspotEntry,
    getHotspotModelBuilder,
    getHotspotMode,
    registerHotspotModelBuilder,
    setHotspotMode,
    updateHotspotLOD,
    type HotspotEntry,
    type HotspotMode,
  } from '$lib/hotspot-lod-dispatcher';
  import { buildVikingTripodHotspot } from '$lib/hotspot-models/viking-tripod';
  import { buildPathfinderSojournerHotspot } from '$lib/hotspot-models/pathfinder-sojourner';
  import { buildMERRoverHotspot } from '$lib/hotspot-models/mer-rover';
  import { buildCuriosityClassHotspot } from '$lib/hotspot-models/curiosity-class';
  import { buildPhoenixClassHotspot } from '$lib/hotspot-models/phoenix-class';
  import { buildMars3PetalHotspot } from '$lib/hotspot-models/mars-3-petal';
  import { buildTianwenZhurongHotspot } from '$lib/hotspot-models/tianwen-zhurong';
  import { buildSchiaparelliHotspot } from '$lib/hotspot-models/schiaparelli';
  import { buildBeagle2Hotspot } from '$lib/hotspot-models/beagle-2';
  import { buildHotspotSurfacePatch } from '$lib/hotspot-surface-patch';
  import {
    createSkybox,
    teardownPanoramaSkybox,
    type SkyboxHandle,
  } from '$lib/hotspot-tier3-skybox';
  import { loadImageVisionManifest, getImageEntry, pickVariant } from '$lib/image-vision';
  import { buildLabel } from '$lib/three-label';
  import { STAR_FIELD } from '$lib/three-constants';
  import * as m from '$lib/paraglide/messages';
  import type { MarsSite } from '$types/mars-site';
  import Panel from '$lib/components/Panel.svelte';
  import ScienceChip from '$lib/components/ScienceChip.svelte';
  import SiteStoryPanel from '$lib/components/SiteStoryPanel.svelte';
  import WhyPopover from '$lib/components/WhyPopover.svelte';
  import ScienceLayersPanel from '$lib/components/ScienceLayersPanel.svelte';
  import { onLayerChange } from '$lib/science-layers';
  import LearnLink from '$lib/components/LearnLink.svelte';

  // ─── Nation palette (PRD-009 / RFC-012) ──────────────────────────
  // Mirrors /moon's palette + adds Europe (ESA-led missions like Mars
  // Express, Schiaparelli, ExoMars) and UAE (Hope orbiter). USSR + Russia
  // collapse onto one entry: Roscosmos is the legal continuation of the
  // Soviet space programme, so on a Mars map their landers belong to
  // the same lineage. Inline (not from --color-*) because the 2D canvas
  // legend can't read CSS custom properties cheaply.
  // NATION_COLORS + nationKey + colorFor extracted to
  // $lib/surface-map/nation-palette.ts (#42).

  // ─── State ───────────────────────────────────────────────────────
  let view: '3d' | '2d' = $state('3d');
  let container: HTMLDivElement | undefined = $state();
  let canvas2d: HTMLCanvasElement | undefined = $state();
  let sites: MarsSite[] = $state([]);
  let loadFailed = $state(false);
  let selected: MarsSite | null = $state(null);
  let panelOpen = $state(false);
  let cleanup: (() => void) | undefined;

  // Layer toggles. SURFACE = lander/rover markers; ORBITERS = dots
  // on inclined rings; TRAVERSES = rover-track polylines clamped to
  // the surface (Curiosity, Perseverance, Opportunity, Spirit).
  // All default-on. Traverses fade in past a zoom threshold so the
  // global view stays clean — the toggle is a "show even at far zoom"
  // override.
  let layerSurface = $state(true);
  let layerOrbiters = $state(true);
  let layerOrbits = $state(true);
  let layerTraverses = $state(true);
  let autoSpin = $state(true);
  let resetMarsCamera: () => void = () => {};

  // Surface Hotspots dev-debug overlay (enable with ?debug=1) —
  // surfaces current LOD state without round-tripping through
  // DevTools. Removed once Tier 2 ships clean.
  let debugInfo = $state<{
    sidecarStatus: string;
    siteCount: number;
    hotspotCount: number;
    maxTierAcrossSites: number;
    currentTopTier: number;
    targetTopTier: number;
    pageMode: string;
    dispatcherMode: string;
    camR: number;
    projectedPxSample: string;
    tier2Status: string;
    patchDetail: string;
  }>({
    sidecarStatus: 'pending',
    siteCount: 0,
    hotspotCount: 0,
    maxTierAcrossSites: 0,
    currentTopTier: 0,
    targetTopTier: 0,
    pageMode: 'auto',
    dispatcherMode: 'auto',
    camR: 0,
    projectedPxSample: '',
    tier2Status: '',
    patchDetail: '',
  });
  let showDebug = $state(false);
  // Current camera altitude above Mars surface, in km — surfaced in
  // the corner overlay so the user has a sense of "how zoomed am I"
  // (Google Maps shows it as a scale bar; we show altitude in km).
  let altitudeKm = $state(0);

  /**
   * Contextual info card state (PRD-014 §v0.7.x + RFC-017 §OQ-12).
   * When the camera is in the Tier 2 zoom band on a hotspot, the
   * card surfaces (a) site context — name, agency, brief mission
   * tagline — and (b) the dominant imagery layer's source +
   * attribution + resolution. Honest disclosure of where each
   * pixel came from, in-context with the imagery itself.
   */
  let tierContext = $state<TierContext | null>(null);

  /**
   * Nation chip label + colour for the info card's site header.
   * Maps the site's agency / nation to a one-word label + the
   * NATION_COLORS palette used elsewhere on /mars. Used by the
   * info card and (transitively) by the photo gallery in #PE.
   */
  // nationChipFor extracted to $lib/surface-map/nation-palette.ts (#42).

  /**
   * Compact mission-context tagline: "Mars Science Laboratory rover ·
   * landed 2012-08-06" — feeds the info card's second line. Pulls
   * mission_type + landing_date from the site's MarsSite record.
   */
  // missionContextFor extracted to $lib/surface-map/site-formatters.ts (#42).

  /**
   * Great-circle distance on the Mars sphere (R = 3389 km). Inputs in
   * decimal degrees, output in km. Used to convert a rover traverse
   * polyline into a "traversed N km" number for the info card.
   */
  function greatCircleKmMars(a: [number, number], b: [number, number]): number {
    const R = 3389;
    const lat1 = (a[0] * Math.PI) / 180;
    const lat2 = (b[0] * Math.PI) / 180;
    const dlat = lat2 - lat1;
    const dlon = ((b[1] - a[1]) * Math.PI) / 180;
    const h = Math.sin(dlat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  /** Sum of great-circle segments along a polyline. */
  function traversePathKm(points: Array<[number, number]>): number {
    let total = 0;
    for (let i = 1; i < points.length; i++) total += greatCircleKmMars(points[i - 1], points[i]);
    return total;
  }

  /** Whole-day count between two ISO dates (or ISO + Date). */
  function daysBetween(startIso: string, endIso: string): number {
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
    return Math.floor((end - start) / (1000 * 60 * 60 * 24));
  }

  /**
   * Linear taper from full editorial scale at the overview to a
   * smaller "fits on the surface patch" scale at the closest zoom.
   * camR ≥ 60 → 1.0 (overview)
   * camR ≤ 30.6 → 0.2 (closest zoom — rover sits readably on the HiRISE patch)
   * Linear between. Per-frame; cheap.
   */
  // computeTierScale extracted to $lib/surface-map/tier-scale.ts (#42).

  // Surface Hotspots mode — see /moon for the full pattern.
  let hotspotsMode: HotspotMode = $state('auto');
  let panoramaActive = $state(false);
  let panoramaSkybox: SkyboxHandle | null = null;
  let enterPanorama: (textureUrl: string, siteId: string) => void = $state(() => {});
  let exitPanorama: () => void = $state(() => {});
  // resolveInitialHotspotsMode + nextHotspotsMode extracted to
  // $lib/surface-map/hotspots-mode.ts (#42).
  const cycleHotspotsMode = () => (hotspotsMode = nextHotspotsMode(hotspotsMode));
  onMount(() => {
    hotspotsMode = resolveInitialHotspotsMode($page.url);
    showDebug = $page.url.searchParams.get('debug') === '1';
    // Sidecar fetch probe — fills the overlay's sidecarStatus.
    fetch('/data/surface-hotspots.json')
      .then((r) => r.json())
      .then((d) => {
        debugInfo.sidecarStatus = `ok ${Object.keys(d.entries || {}).length} entries · curiosity tier ${d.entries?.curiosity?.hotspot_tier_max ?? '?'}`;
      })
      .catch((e) => {
        debugInfo.sidecarStatus = `FAIL ${(e as Error).message}`;
      });
  });
  $effect(() => {
    setHotspotMode(hotspotsMode);
    syncHotspotsModeUrl($page.url, hotspotsMode);
  });
  // Per-rover traverses keyed by rover_id, populated after fetch.
  let traverses: Record<string, Traverse> = $state({});

  // ─── Detail-panel tabs (mirrors /moon pattern v0.1.10) ───────────
  let panelTab: PanelTab = $state('overview');
  let lastSelectedId = $state<string | null>(null);
  let panelGallery: string[] = $state([]);
  let panelGalleryGrid = $derived(panelGallery.length <= 1 ? panelGallery : panelGallery.slice(1));
  let panelLightbox = $state<string | null>(null);
  // #PE path-B: optional rich multi-agency narrative (the "STORY"
  // tab). Distinct from GALLERY — chapter-grouped, per-image captions,
  // agency badges. Loaded from static/data/site-stories/<id>.json on
  // demand. Null when the site has no story yet → tab is hidden.
  let panelStory: SiteStory | null = $state(null);
  // Track previous tierContext so we can detect the null → Tier-2
  // transition (when the info card first appears) and auto-promote
  // the user from OVERVIEW → STORY. Once they've manually picked a
  // different tab (e.g. clicked GALLERY) we leave them alone — the
  // auto-switch only fires on the first promotion per site.
  const storyAutopromote = createStoryAutopromoteTracker();
  $effect(() => {
    if (selected && selected.id !== lastSelectedId) {
      panelTab = 'overview';
      lastSelectedId = selected.id;
      panelGallery = [];
      panelStory = null;
      panelLightbox = null;
      loadPanelData({
        siteId: selected.id,
        missionId: selected.mission_id,
        locale: localeFromPage($page),
        fetchGallery: getMarsSiteGallery,
        isStillCurrent: () => selected != null && selected.id === lastSelectedId,
        onGallery: (urls) => (panelGallery = urls),
        onStory: (story) => (panelStory = story),
      });
    }
  });
  // Auto-promote OVERVIEW → STORY the first time tierContext flips on
  // for a site (≈ user has zoomed in to Tier 2 and the info card has
  // just appeared). Only when (a) a story exists, (b) the user hasn't
  // manually picked another tab, (c) we haven't already auto-switched
  // for THIS site (so a tab change followed by a re-zoom doesn't undo
  // the user's choice). 2026-05-22 feedback.
  $effect(() => {
    if (
      storyAutopromote.check({
        tierContextActive: tierContext !== null,
        selectedId: selected?.id ?? null,
        hasStory: panelStory != null,
        currentTab: panelTab,
      })
    ) {
      panelTab = 'story';
    }
  });
  let panelLinksByTier = $derived(
    groupLinksByTier<MarsSite['links'][number]>((selected as MarsSite | null)?.links),
  );
  let panelHasLinks = $derived(siteHasLinks(selected as MarsSite | null));

  // `face: true` is set by the URL-deep-link path so Mars rotates
  // to bring the selected site to camera-facing. Click handlers
  // don't pass `face` so picking a marker on screen doesn't lurch
  // the camera off whatever the user was looking at. (Issue #227,
  // mirrors the same fix in /moon.)
  let faceMarsAtSite: ((site: MarsSite) => void) | undefined;
  function selectSite(id: string, options: { face?: boolean } = {}) {
    const s = sites.find((x) => x.id === id);
    if (s) {
      selected = s;
      panelOpen = true;
      // Pause Mars auto-spin on any site selection — clicking a marker,
      // hovering a region, deep-linking via URL. Without this the
      // chosen site keeps rotating away under the camera while the user
      // is trying to read the detail panel (2026-05-22 feedback).
      // The fly-in path (faceMarsAtSite) also pauses spin, so this is
      // belt-and-braces for the non-fly selection paths.
      autoSpin = false;
      if (options.face) faceMarsAtSite?.(s);
    }
  }
  function toggleView() {
    view = view === '3d' ? '2d' : '3d';
  }

  // 2D hit-test — site id → screen position
  const sitePos2d = new Map<string, { x: number; y: number }>();

  // Status badge tone for the OVERVIEW header.
  function statusTone(s: string): { label: string; color: string } {
    if (s === 'ACTIVE') return { label: 'ACTIVE', color: '#4ecdc4' };
    if (s === 'CRASHED') return { label: 'CRASHED', color: '#ff6b6b' };
    if (s === 'LOST') return { label: 'LOST', color: '#ff8c42' };
    if (s === 'PLANNED') return { label: 'PLANNED', color: '#7b9cff' };
    if (s === 'ENDED') return { label: 'ENDED', color: 'rgba(255,255,255,0.5)' };
    return { label: 'FLOWN', color: 'rgba(255,255,255,0.5)' };
  }

  onMount(() => {
    if (!container || !canvas2d) return;

    getMarsSites(localeFromPage($page))
      .then((list) => {
        sites = list;
        // Apply ?site= deep-link directly after data lands (deterministic
        // timing, no $effect ordering surprises). selectSite is a no-op
        // when the id is unknown. `face: true` rotates Mars to bring
        // the site to camera-facing (issue #227).
        const siteParam = $page.url.searchParams.get('site');
        if (siteParam) selectSite(siteParam, { face: true });
      })
      .catch((err) => {
        console.error('Failed to load Mars sites:', err);
        loadFailed = true;
      });

    // Fetch the four rover traverses in parallel. Each lands as a
    // Traverse object indexed by rover_id and triggers the rebuild
    // effect downstream. Failures are silent — if a JSON file is
    // missing the rover simply has no rendered track.
    Promise.all(
      ['curiosity', 'perseverance', 'opportunity', 'spirit'].map((id) =>
        getMarsTraverse(id).then((t) => (t ? [id, t] : null)),
      ),
    ).then((entries) => {
      const next: Record<string, Traverse> = {};
      for (const e of entries) if (e) next[e[0] as string] = e[1] as Traverse;
      traverses = next;
    });

    // ──────────────────────────────────────────────────────────────
    // 3D — Mars sphere with surface texture, 25° axial tilt
    // ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      // Near plane lowered from 0.5 → 0.05 so the camera can fly
      // close (camR≈30.15, ~0.15u above surface) to inspect Tier 2
      // HiRISE patches without the near-hemisphere getting clipped
      // and the user seeing through the planet to the far side.
      0.05,
      400,
    );
    const renderer = createSceneRenderer(container);

    // EffectComposer for hover-outline (matches /iss post-V1 pattern).
    const { composer, outlinePass } = createOutlinePassSetup({
      renderer,
      scene,
      camera,
      width: container.clientWidth,
      height: container.clientHeight,
    });

    addSurfaceLights({ scene, ambientColor: 0x886655, ambientIntensity: 0.8 });

    scene.add(createStarField({ count: STAR_FIELD.planet }));

    const textureLoader = new THREE.TextureLoader();
    const marsMap = textureLoader.load(`${base}/textures/2k_mars.jpg`);
    const marsRadius = 30;
    // Mars's actual obliquity is 25.19° — set the rotation axis on a
    // Group wrapping the sphere so the axial tilt is real and visible
    // (orbital rings tilt with it for educational-honesty consistency).
    const marsAxis = new THREE.Group();
    marsAxis.rotation.z = (25.19 * Math.PI) / 180;
    scene.add(marsAxis);
    const marsMesh = new THREE.Mesh(
      new THREE.SphereGeometry(marsRadius, 64, 64),
      new THREE.MeshPhongMaterial({ map: marsMap, color: 0xffffff, shininess: 4 }),
    );
    marsAxis.add(marsMesh);

    // Issue #227 — face-the-site deep-link. Orbits the camera through
    // the planet centre to align the screen-centre ray with the site's
    // world position (factors in both the 25.19° axial tilt and any
    // current marsMesh.rotation.y), then pulls the camera in to a
    // near-orbit distance so the user lands "on" the site instead of
    // looking at it from afar. Replaces the previous mesh-rotation
    // approach which only handled longitude and left high-latitude
    // sites off-screen-centre vertically.
    faceMarsAtSite = (site: MarsSite) => {
      if (site.lat == null || site.lon == null) return;
      const v = latLonToUnitSphere(site.lat, site.lon);
      marsMesh.updateMatrixWorld(true);
      const worldPos = new THREE.Vector3(v.x, v.y, v.z).applyMatrix4(marsMesh.matrixWorld);
      const dir = worldPos.clone().normalize();
      // Set up the fly-in tween — RAF interpolates camP/camT/camR
      // over FLY_DURATION_MS with ease-out cubic. The camera lands at
      // a Tier-1-friendly distance (50u) so the lander model resolves;
      // user can scroll-zoom further to reach Tier 2.
      flyFromP = camP;
      flyFromT = camT;
      flyFromR = camR;
      flyToP = Math.acos(Math.max(-1, Math.min(1, dir.y)));
      // Shortest-path interpolation around the longitude circle:
      // adjust target so |to - from| ≤ π and lerp goes through the
      // shorter arc instead of the long way around.
      let to = Math.atan2(dir.z, dir.x);
      while (to - flyFromT > Math.PI) to -= 2 * Math.PI;
      while (to - flyFromT < -Math.PI) to += 2 * Math.PI;
      flyToT = to;
      flyToR = 50;
      flyStart = performance.now();
      flyActive = true;
      autoSpin = false;
    };

    // J.3 — Atmosphere shell at ~120 km altitude. Mars's atmosphere is
    // 1% Earth's pressure but reaches similar altitude before fading.
    // Scene scale: marsRadius=30 → real 3389 km, so 1 unit ≈ 113 km;
    // 120 km ≈ 1.06 units → shell radius ≈ 31.1.
    const marsAtmosphereR = marsRadius + 120 / 113;
    const marsAtmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(marsAtmosphereR, 48, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffaa66,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    );
    const marsAtmoRing = new THREE.Mesh(
      new THREE.RingGeometry(marsAtmosphereR * 0.999, marsAtmosphereR * 1.002, 64),
      new THREE.MeshBasicMaterial({
        color: 0xffaa66,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    marsAtmoRing.rotation.x = Math.PI / 2;
    marsAtmosphere.userData.layerKey = 'atmosphere';
    marsAtmoRing.userData.layerKey = 'atmosphere';
    marsAtmosphere.visible = false;
    marsAtmoRing.visible = false;
    scene.add(marsAtmosphere);
    scene.add(marsAtmoRing);
    const stopMarsAtmosphereLayer = onLayerChange('atmosphere', (on) => {
      marsAtmosphere.visible = on;
      marsAtmoRing.visible = on;
    });

    type SurfaceMarker = {
      group: THREE.Group;
      siteId: string;
      halo?: THREE.Mesh;
      labelGroup?: THREE.Group;
      /** Reference to the Tier-0 silhouette sub-group, so the
       *  hover OutlinePass can target the lander mesh-tree directly
       *  instead of the wrapper group (the wrapper includes the
       *  label sprite + invisible hit sphere, which makes the
       *  outline read as nothing on surface markers). */
      tier0Group?: THREE.Group;
    };

    // Surface Hotspots LOD dispatcher entries (PRD-014 / RFC-017 S4).
    // One entry per /mars surface site whose surface-hotspots.json
    // sidecar gives hotspot_tier_max >= 1. Per-frame update happens
    // in the animate loop; data-hotspot-tier attribute is published
    // on the canvas for e2e assertions.
    const hotspots: HotspotEntry[] = [];
    // siteId → the sidecar's hotspot_tier_max — the *capability* ceiling.
    // The dispatcher reads entry.maxTier each frame, so we mutate
    // that field down to 1 for non-selected sites (in the render
    // loop) to suppress Tier-2 discs on sites that aren't the user's
    // focus. Two nearby sites both promoting to Tier 2 simultaneously
    // gave a "discs overlapping in weird ways" appearance — only the
    // selected site's CTX + HiRISE should occupy that real estate.
    const originalMaxTier = new Map<string, 0 | 1 | 2 | 3>();
    // Tier 2 (HiRISE) "delayed reveal" set — traverse polylines + the
    // end-of-track red/amber dots + traverse captions. These ride the
    // same opacity ramp as the HiRISE detail patch: invisible while
    // the user is in overview / CTX-regional zoom, then fade in as
    // the camera dollies into HiRISE-readable distance. They're high-
    // frequency surface annotations whose detail isn't legible until
    // you're close enough to read the HiRISE patch underneath them.
    // Populated as traverses are built (right after the construction
    // of each line + dot + caption sprite, ~line 1019 onward).
    const tier2DelayedReveal: Array<THREE.Line | THREE.Mesh | THREE.Sprite | THREE.Group> = [];
    registerHotspotModelBuilder('viking-tripod', buildVikingTripodHotspot);
    registerHotspotModelBuilder('pathfinder-sojourner', buildPathfinderSojournerHotspot);
    registerHotspotModelBuilder('mer-rover', buildMERRoverHotspot);
    registerHotspotModelBuilder('curiosity-class', buildCuriosityClassHotspot);
    registerHotspotModelBuilder('curiosity-class-with-ingenuity', (accent) =>
      buildCuriosityClassHotspot(accent, { withIngenuity: true }),
    );
    registerHotspotModelBuilder('phoenix-class', buildPhoenixClassHotspot);
    registerHotspotModelBuilder('mars-3-petal', buildMars3PetalHotspot);
    registerHotspotModelBuilder('tianwen-zhurong', buildTianwenZhurongHotspot);
    registerHotspotModelBuilder('schiaparelli', buildSchiaparelliHotspot);
    registerHotspotModelBuilder('beagle-2', buildBeagle2Hotspot);
    void loadImageVisionManifest();

    // Selection-halo helper — small camera-facing ring rendered around
    // a marker so users can tell at a glance which one they picked.
    // Returns an invisible mesh; visibility flips via $effect tied to
    // the `selected` state below.
    const surfaceMarkers: SurfaceMarker[] = [];
    const orbitalMarkers: OrbiterMarker[] = [];
    type TraverseLine = {
      line: THREE.Line;
      startDot: THREE.Mesh;
      endDot: THREE.Mesh;
      roverId: string;
      isActive: boolean;
      /** In-scene caption groups next to the start (landing date)
       *  and end (km · days) dots — same visibility gate as the dots
       *  themselves. Disposed alongside dots in rebuildTraverses. */
      startLabel?: THREE.Group;
      endLabel?: THREE.Group;
      startLabelTexture?: THREE.Texture;
      endLabelTexture?: THREE.Texture;
    };
    const traverseLines: TraverseLine[] = [];

    function rebuildSurfaceMarkers() {
      for (const mk of surfaceMarkers) {
        disposeObject3d(mk.group);
        marsMesh.remove(mk.group);
      }
      surfaceMarkers.length = 0;
      hotspots.length = 0;
      for (const site of sites) {
        if (site.kind !== 'surface') continue;
        if (site.lat == null || site.lon == null) continue;
        const { x, y, z } = latLonToUnitSphere(site.lat, site.lon);
        const r = marsRadius;
        const color = colorFor(site);
        // Per-mission hand-coded silhouette (Vikings, Pathfinder + Sojourner,
        // MER twins, MSL-class with Ingenuity for Perseverance, Phoenix-class,
        // Soviet petals, Beagle 2 partial-deploy, Schiaparelli crash bus).
        // Unknown ids fall back to a category silhouette (rover / lander /
        // Soviet petal) via the agency + mission-type strings. Same pattern
        // /moon uses with moon-lander-models.ts.
        const isFailed = site.status === 'CRASHED' || site.status === 'LOST';
        // Wrapper group — positions + orients on the planet surface.
        // Contains the Tier 0 silhouette sub-group (always present),
        // any lazy-built Tier 1+ sub-groups added by the hotspot LOD
        // dispatcher, plus hit-sphere + label + halo as siblings.
        const group = new THREE.Group();
        const tier0Group = buildMarsLanderModel(site.id, site.mission_type, site.agency, color);
        group.add(tier0Group);
        // Crashed/lost markers get reduced opacity so the wreckage is
        // visually de-emphasised vs. operational hardware. The 2D
        // dashed-outline marker carries the same info on the flat map.
        if (isFailed) dimMaterials(tier0Group, 0.55);
        // Anchor on surface; orient so +Y points outward.
        placeOnSphereTangent(group, { x, y, z }, r);
        attachPickableHit({ dotGroup: group, siteId: site.id });

        // Label with leader-line (same component as /earth + /moon) —
        // 2026-05-22 feedback: offset moved from straight-up
        // (0, 2.2, 0) to side-and-slightly-up (2.6, 1.4, 0). Straight-
        // up labels were sitting on the centre of the disc / 3D lander
        // model at close zoom, obscuring the very content they were
        // labelling. Side offset keeps the label clear of the disc.
        const label = buildLabel({
          text: site.name ?? site.id,
          color: color,
          offset: new THREE.Vector3(2.6, 1.4, 0),
          size: 1.4,
        });
        group.add(label.group);

        // Selection halo — flat ring around the marker base. Visible
        // only while this site === selected (toggled by $effect).
        const halo = createMarkerHalo(color, 1.4, { lay: true });
        group.add(halo);

        // Surface Hotspot LOD enrolment (PRD-014 / RFC-017 S4).
        // Sites whose surface-hotspots.json sidecar gives
        // hotspot_tier_max >= 1 + a known hotspot_model id get a
        // dispatcher entry. Tier 1 + Tier 2 meshes are built lazily
        // on first promotion as the user zooms in.
        const maxTier = (site.hotspot_tier_max ?? 0) as 0 | 1 | 2 | 3;
        const builderId = site.hotspot_model;
        if (maxTier >= 1 && builderId) {
          const builder = getHotspotModelBuilder(builderId);
          if (builder) {
            const accent = color;
            const tier2Source = site.hotspot_tier2_source;
            const tier2RegionalSource = site.hotspot_tier2_regional_source;
            const annotations = site.hotspot_annotations;
            const tier2Builder =
              maxTier >= 2 && tier2Source
                ? () => {
                    // Prefer the layout-specific variant URL from
                    // image-vision.json when present. If the sidecar
                    // hasn't been generated yet (operator hasn't run
                    // images:score on hotspots), fall back to the
                    // base 2048² JPEG at the sidecar's
                    // hotspot_tier2_source path — soft-fail keeps
                    // Tier 2 visible during development.
                    const entry = getImageEntry(tier2Source);
                    const textureUrl =
                      (entry ? pickVariant(entry, 'thumbnail', false) : undefined) ?? tier2Source;
                    // Same resolution chain for the regional CTX
                    // layer if the operator has fetched it. Sites
                    // without a regional layer pass undefined and
                    // the patch builder skips the regional disc.
                    let regionalTextureUrl: string | undefined;
                    if (tier2RegionalSource) {
                      const rEntry = getImageEntry(tier2RegionalSource);
                      regionalTextureUrl =
                        (rEntry ? pickVariant(rEntry, 'thumbnail', false) : undefined) ??
                        tier2RegionalSource;
                    }
                    return buildHotspotSurfacePatch({
                      textureUrl,
                      regionalTextureUrl,
                      accentColor: accent,
                      siteId: site.id,
                      annotations,
                    });
                  }
                : undefined;
            hotspots.push(
              createHotspotEntry({
                siteId: site.id,
                maxTier,
                group,
                tier0Group,
                tier1Builder: () => builder(accent),
                tier2Builder,
              }),
            );
            originalMaxTier.set(site.id, maxTier);
          }
        }

        marsMesh.add(group);
        surfaceMarkers.push({
          group,
          siteId: site.id,
          halo,
          labelGroup: label.group,
          tier0Group,
        });
      }
    }

    function rebuildOrbitalMarkers() {
      for (const om of orbitalMarkers) {
        disposeObject3d(om.group);
        marsAxis.remove(om.group);
      }
      orbitalMarkers.length = 0;
      let phase = 0;
      for (const site of sites) {
        if (site.kind !== 'orbiter') continue;
        if (site.altitude_km == null || site.inclination_deg == null) continue;
        const color = colorFor(site);
        // Visual altitude — scale altitude in km to scene units. Real
        // altitudes range from ~50 (LRO) to ~80,000 (Mangalyaan apoapsis).
        // Compress with log scale so all rings are readable on screen.
        // Ring radius: marsRadius + log-scaled offset.
        // Visual altitude — scale altitude in km to scene units. Real
        // altitudes range from ~50 (LRO) to ~80,000 (Mangalyaan apoapsis).
        // Compress with log scale so all rings are readable on screen.
        const ringRadius = marsRadius + 4 + Math.log10(1 + site.altitude_km / 100) * 5;
        const dimmed = site.status !== 'ACTIVE';
        const marker = buildOrbiterGroup({
          site,
          color,
          ringRadius,
          inclinationRad: (site.inclination_deg * Math.PI) / 180,
          dimmed,
          orbitPhase: phase,
          activeRingOpacity: 0.35,
          dimmedRingOpacity: 0.18,
          label: {},
        });
        marsAxis.add(marker.group);
        orbitalMarkers.push(marker);
        phase += Math.PI / 5;
      }
    }

    /**
     * Mini caption sprite for the traverse start/end dots. Same idea
     * as buildLabel but: wider canvas (text doesn't crop), smaller
     * font, no leader line, and a translucent dark backplate so the
     * coloured text stays readable against the HiRISE / CTX patch
     * underneath. Returns a Group so the caller can position +
     * orient it like any Object3D.
     */
    function buildTraverseCaption(
      text: string,
      color: string,
      worldSize: number,
    ): { group: THREE.Group; texture: THREE.Texture } {
      const canvas = document.createElement('canvas');
      // 512×96 is enough for "LANDED 2012-08-06" + "10.2 KM · DAY 5,037"
      // at the bold 22 px font below, with side padding.
      canvas.width = 512;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Backplate — rounded translucent black, gives any colour text
        // enough contrast against bright HiRISE swatches.
        ctx.fillStyle = 'rgba(8, 10, 22, 0.72)';
        const radius = 12;
        const w = canvas.width;
        const h = canvas.height;
        const inset = 6;
        ctx.beginPath();
        ctx.moveTo(inset + radius, inset);
        ctx.arcTo(w - inset, inset, w - inset, inset + radius, radius);
        ctx.arcTo(w - inset, h - inset, w - inset - radius, h - inset, radius);
        ctx.arcTo(inset, h - inset, inset, h - inset - radius, radius);
        ctx.arcTo(inset, inset, inset + radius, inset, radius);
        ctx.closePath();
        ctx.fill();

        // Text — bold mono so digits + letters line up cleanly.
        ctx.font = "bold 38px 'Space Mono', monospace";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 4;
        ctx.fillStyle = color;
        ctx.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2);
      }
      const texture = new THREE.Texture(canvas);
      texture.needsUpdate = true;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
      const sprite = new THREE.Sprite(mat);
      // Aspect 512:96 ≈ 5.33:1; preserve that in world units so the
      // backplate isn't squashed.
      sprite.scale.set(worldSize, worldSize * (96 / 512), 1);
      const group = new THREE.Group();
      group.add(sprite);
      return { group, texture };
    }

    function rebuildTraverses() {
      for (const tl of traverseLines) {
        disposeObject3d(tl.line);
        marsMesh.remove(tl.line);
        disposeObject3d(tl.endDot);
        marsMesh.remove(tl.endDot);
        disposeObject3d(tl.startDot);
        marsMesh.remove(tl.startDot);
        if (tl.startLabel) {
          disposeObject3d(tl.startLabel);
          marsMesh.remove(tl.startLabel);
        }
        if (tl.endLabel) {
          disposeObject3d(tl.endLabel);
          marsMesh.remove(tl.endLabel);
        }
        tl.startLabelTexture?.dispose();
        tl.endLabelTexture?.dispose();
      }
      traverseLines.length = 0;
      for (const tr of Object.values(traverses)) {
        if (!tr.points || tr.points.length < 2) continue;
        // Prepend the rover's published landing-site lat/lon (from
        // mars-sites.json) if the traverse's first waypoint isn't
        // already at that exact coordinate. Without this the green
        // patch-centre pin (which sits at the published landing
        // coords) hovers visibly off the polyline's first point —
        // not by much for Curiosity/Perseverance whose traverses
        // start within a few metres of the lander, but the visual
        // disconnect was the complaint on 2026-05-21. Threshold
        // ~0.001° ≈ 60 m on Mars — looser than that and we'd hide
        // a real handoff (e.g. an egress traverse that doesn't
        // start at the lander deck).
        const trSite = sites.find((s) => s.id === tr.rover_id);
        const points = tr.points.slice();
        if (trSite?.lat != null && trSite?.lon != null) {
          const [firstLat, firstLon] = points[0];
          const dLat = Math.abs(firstLat - trSite.lat);
          const dLon = Math.abs(firstLon - trSite.lon);
          if (dLat > 1e-3 || dLon > 1e-3) {
            points.unshift([trSite.lat, trSite.lon]);
          }
        }
        // Map each [lat, lon] waypoint onto the unit sphere, scale to
        // marsRadius + 0.05u so the line sits visibly above the
        // surface without z-fighting.
        const verts: number[] = [];
        const r = marsRadius + 0.05;
        for (const [lat, lon] of points) {
          const { x, y, z } = latLonToUnitSphere(lat, lon);
          verts.push(x * r, y * r, z * r);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        // Match the rover's surface-marker colour by looking up its
        // mission_id site (Curiosity, Perseverance, etc. are surface
        // sites with the same id as their rover_id).
        const site = sites.find((s) => s.id === tr.rover_id);
        const color = site ? colorFor(site) : '#ffffff';
        const isActive = tr.status === 'ACTIVE';
        const line = new THREE.Line(
          geo,
          new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity: isActive ? 0.95 : 0.7,
          }),
        );
        line.userData = { roverId: tr.rover_id, kind: 'traverse' };
        marsMesh.add(line);
        tier2DelayedReveal.push(line);
        // (No separate start dot — the green patch-centre pin in
        // buildHotspotSurfacePatch sits at the same lat/lon as the
        // traverse origin and serves as the "start / landing site"
        // marker. We still keep a `startDot` object so the
        // TraverseLine bookkeeping stays consistent, but it's an
        // invisible zero-radius placeholder.)
        const TRAVERSE_END_ACTIVE_COLOR = 0xef4444; // red — current rover
        const TRAVERSE_END_FINISHED_COLOR = 0xf59e0b; // amber — last point reached
        const first = tr.points[0];
        const firstPos = latLonToUnitSphere(first[0], first[1]);
        const startDot = new THREE.Mesh(
          new THREE.BufferGeometry(),
          new THREE.MeshBasicMaterial({ visible: false }),
        );
        startDot.visible = false;
        startDot.position.set(firstPos.x * r, firstPos.y * r, firstPos.z * r);
        marsMesh.add(startDot);
        tier2DelayedReveal.push(startDot);
        // End-of-track dot — current position for ACTIVE rovers (red),
        // last point reached for ENDED missions (amber). Solid sphere
        // so it reads as a discrete marker at distance, sized the same
        // as the start ring so the two visually pair as path endpoints.
        const last = tr.points[tr.points.length - 1];
        const lastPos = latLonToUnitSphere(last[0], last[1]);
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.022, 12, 12),
          new THREE.MeshBasicMaterial({
            color: isActive ? TRAVERSE_END_ACTIVE_COLOR : TRAVERSE_END_FINISHED_COLOR,
            transparent: true,
            opacity: 0.95,
            depthWrite: false,
          }),
        );
        dot.position.set(lastPos.x * r, lastPos.y * r, lastPos.z * r);
        marsMesh.add(dot);
        tier2DelayedReveal.push(dot);

        // In-scene captions next to each dot. Same green/red/amber
        // colour as the dot they describe — the dot supplies the
        // visual cue, the caption supplies the data (landing date /
        // km · days). Sprites billboard to the camera, so the 3D
        // position determines where they land in screen space.
        //
        // Position each caption ALONG the path tangent, AWAY from the
        // other endpoint, so labels sit beyond the dots rather than
        // covering them or the connecting line:
        //
        //   [start label] ← 🟢 ───────── 🔴 → [end label]
        //
        // TANGENT_OFFSET is in world units (≈ 1 u = 113 km on Mars
        // at this scale). The dots are 0.022 u radius, so 0.025 u
        // is just past the dot edge — close enough that each caption
        // reads as labelling THIS dot, without sitting on top of the
        // dot itself or the path line between the two.
        const startPosWorld = new THREE.Vector3(firstPos.x * r, firstPos.y * r, firstPos.z * r);
        const endPosWorld = new THREE.Vector3(lastPos.x * r, lastPos.y * r, lastPos.z * r);
        const tangent = new THREE.Vector3().subVectors(endPosWorld, startPosWorld).normalize();
        const TANGENT_OFFSET = 0.025;
        const RADIAL_OFFSET = 0.03;

        function placeCaption(at: THREE.Vector3, awayFromOther: THREE.Vector3): THREE.Vector3 {
          // Slide AWAY from the other endpoint along the path tangent,
          // then re-project to a small radial bump above the surface so
          // the caption clears the patch / dot in z.
          const out = at.clone().addScaledVector(awayFromOther, TANGENT_OFFSET);
          return out.normalize().multiplyScalar(r + RADIAL_OFFSET);
        }

        const startLabelText = site?.landing_date ? `LANDED ${site.landing_date}` : 'LANDING SITE';
        const startBuilt = buildTraverseCaption(startLabelText, '#22c55e', 0.32);
        startBuilt.group.position.copy(
          placeCaption(startPosWorld, tangent.clone().negate()), // away from end
        );
        marsMesh.add(startBuilt.group);
        tier2DelayedReveal.push(startBuilt.group);

        const pathKm = traversePathKm(tr.points);
        const endIso = isActive ? new Date().toISOString() : tr.snapshot_date;
        const days = site?.landing_date ? daysBetween(site.landing_date, endIso) : 0;
        const kmText = pathKm >= 100 ? pathKm.toFixed(0) : pathKm.toFixed(1);
        const endLabelText = isActive
          ? `${kmText} KM · DAY ${days.toLocaleString()}`
          : `${kmText} KM · ${days.toLocaleString()} D`;
        const endBuilt = buildTraverseCaption(endLabelText, isActive ? '#ef4444' : '#f59e0b', 0.34);
        endBuilt.group.position.copy(
          placeCaption(endPosWorld, tangent), // away from start
        );
        marsMesh.add(endBuilt.group);
        tier2DelayedReveal.push(endBuilt.group);

        traverseLines.push({
          line,
          startDot,
          endDot: dot,
          roverId: tr.rover_id,
          isActive,
          startLabel: startBuilt.group,
          endLabel: endBuilt.group,
          startLabelTexture: startBuilt.texture,
          endLabelTexture: endBuilt.texture,
        });
      }
    }

    // Apply current layer visibility to freshly-rebuilt markers.
    // Without this, newly-created groups default to .visible=true
    // even when the user has already toggled a layer off.
    function applyLayerVisibility() {
      for (const sm of surfaceMarkers) sm.group.visible = layerSurface;
      for (const om of orbitalMarkers) {
        applyOrbiterLayerVisibility(om, { showOrbiters: layerOrbiters, showOrbits: layerOrbits });
      }
      for (const tl of traverseLines) {
        tl.line.visible = layerTraverses;
        tl.endDot.visible = layerTraverses;
        tl.startDot.visible = layerTraverses;
        if (tl.startLabel) tl.startLabel.visible = layerTraverses;
        if (tl.endLabel) tl.endLabel.visible = layerTraverses;
      }
    }

    // Reactive: rebuild markers whenever the sites array updates.
    $effect(() => {
      if (sites.length === 0) return;
      rebuildSurfaceMarkers();
      rebuildOrbitalMarkers();
      applyLayerVisibility();
    });

    // Selection halo — flip visibility on every marker so only the
    // selected one shows. Cheap enough to walk both arrays on every
    // selection change.
    $effect(() => {
      const sel = selected?.id ?? null;
      for (const sm of surfaceMarkers) if (sm.halo) sm.halo.visible = sm.siteId === sel;
      for (const om of orbitalMarkers) if (om.halo) om.halo.visible = om.siteId === sel;
    });
    // Reactive: rebuild traverses when their data lands (independent
    // of sites — they fetch in parallel).
    $effect(() => {
      void traverses;
      if (sites.length === 0) return;
      rebuildTraverses();
      applyLayerVisibility();
    });

    // Visibility toggles wired to layer state. Read the layer flags
    // OUTSIDE the for-loops so Svelte 5 tracks them as deps even when
    // the marker arrays are empty at the effect's first fire (which
    // they are — sites haven't loaded yet). Reading inside an
    // empty-array for-loop short-circuits and the dep never registers,
    // so subsequent layer-flag changes don't re-trigger the effect.
    $effect(() => {
      const surf = layerSurface;
      const orb = layerOrbiters;
      const orbR = layerOrbits;
      const trav = layerTraverses;
      for (const sm of surfaceMarkers) sm.group.visible = surf;
      for (const om of orbitalMarkers) {
        applyOrbiterLayerVisibility(om, { showOrbiters: orb, showOrbits: orbR });
      }
      for (const tl of traverseLines) {
        tl.line.visible = trav;
        tl.endDot.visible = trav;
        tl.startDot.visible = trav;
        if (tl.startLabel) tl.startLabel.visible = trav;
        if (tl.endLabel) tl.endLabel.visible = trav;
      }
    });

    // ──────────────────────────────────────────────────────────────
    // Camera — spherical (θ,φ,r) controls (drag to orbit, pinch/wheel to zoom)
    // ──────────────────────────────────────────────────────────────
    let camR = 90;
    let camP = (45 * Math.PI) / 180;
    let camT = 0;
    const camR0 = camR;
    const camP0 = camP;
    const camT0 = camT;
    // Smooth zoom: wheel pixels update camRTarget; RAF lerps camR
    // toward it each frame so fast scrolls settle gracefully instead
    // of stepping.
    let camRTarget = camR;
    // Drag inertia: track angular velocity (radians per ms) and apply
    // an exponential decay after the user releases the mouse so the
    // planet keeps rotating briefly. Industry-standard "feels alive".
    let camTVelocity = 0;
    let camPVelocity = 0;
    // Animated faceMarsAtSite fly-in. Set when a deep-link or
    // selection triggers the camera to move to a specific site;
    // RAF interpolates camP/camT/camR with ease-out over flyDuration.
    let flyActive = false;
    let flyStart = 0;
    const FLY_DURATION_MS = 800;
    let flyFromP = 0,
      flyFromT = 0,
      flyFromR = 0;
    let flyToP = 0,
      flyToT = 0,
      flyToR = 0;
    function applyCamera() {
      camera.position.x = camR * Math.sin(camP) * Math.cos(camT);
      camera.position.y = camR * Math.cos(camP);
      camera.position.z = camR * Math.sin(camP) * Math.sin(camT);
      camera.lookAt(0, 0, 0);
    }
    applyCamera();
    resetMarsCamera = () => {
      camR = camR0;
      camRTarget = camR0;
      camP = camP0;
      camT = camT0;
      camTVelocity = 0;
      camPVelocity = 0;
      flyActive = false;
      applyCamera();
    };

    // Phase 6 (#118) — panorama enter/exit hooks. Same pattern as
    // /moon: skybox at scene origin + camera pulled in close.
    // Isolation: hide EVERY direct child of `scene` except the
    // skybox itself + lights. Without this, marsAtmosphere /
    // marsAtmoRing / any orbital ring still render through the
    // skybox geometry, and the user perceives a "planet stuck across
    // the panorama" smear when looking past the horizon.
    let savedCamR = camR;
    let savedCamP = camP;
    let savedCamT = camT;
    const hiddenForPanorama: THREE.Object3D[] = [];
    enterPanorama = (textureUrl: string, siteId: string) => {
      if (panoramaActive) return;
      panoramaSkybox = createSkybox({ textureUrl, siteId });
      scene.add(panoramaSkybox.group);
      panoramaSkybox.activate();
      hiddenForPanorama.length = 0;
      for (const child of scene.children) {
        if (child === panoramaSkybox.group) continue;
        if (child instanceof THREE.Light) continue; // ambient + sun stay on
        if (child.visible) {
          hiddenForPanorama.push(child);
          child.visible = false;
        }
      }
      // Save orbital camera so we can restore exactly where the user
      // left off when they exit. Reset panorama camera to a neutral
      // "horizon centred" pose: camP = π/2 puts the horizon line at
      // the middle of the view (the equator of the skybox sphere);
      // camT = 0 picks an azimuth in the panorama's native frame —
      // the source was downloaded as a full 360° wrap so any starting
      // azimuth shows landscape, and 0 keeps the entry deterministic
      // regardless of which lat/lon the user had clicked. Without
      // this reset the panorama opened at whatever pitch/yaw the
      // orbital camera happened to be at — typically an oblique
      // angle that looked broken (2026-05-22 feedback).
      savedCamR = camR;
      savedCamP = camP;
      savedCamT = camT;
      camR = 0.5;
      camRTarget = camR;
      camP = Math.PI / 2;
      camT = 0;
      flyActive = false;
      applyCamera();
      panoramaActive = true;
    };
    exitPanorama = () => {
      if (!panoramaActive) return;
      panoramaActive = false;
      teardownPanoramaSkybox(panoramaSkybox);
      panoramaSkybox = null;
      // Restore everything we hid. Note: we ONLY restore objects we
      // explicitly hid — anything that was already invisible (layer
      // toggle, dispatcher tier mask) stays as it was.
      for (const obj of hiddenForPanorama) obj.visible = true;
      hiddenForPanorama.length = 0;
      camR = savedCamR;
      camRTarget = savedCamR;
      camP = savedCamP;
      camT = savedCamT;
      applyCamera();
    };
    const stopPanoramaEscape = bindPanoramaEscape({
      isActive: () => panoramaActive,
      onExit: () => exitPanorama(),
    });

    let dragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragMoved = false;

    function onMouseDown(e: MouseEvent) {
      dragging = true;
      dragMoved = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
    }
    function onMouseMove(e: MouseEvent) {
      if (!dragging) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      if (Math.abs(dx) + Math.abs(dy) > 4) dragMoved = true;
      // Drag sensitivity scales with how close the camera is to the
      // surface. Floor at 0.0005 so even at the closest zoom drag
      // still moves the view (was clamping to 0 at camR=30, made
      // close-zoom controls feel dead).
      // In panorama mode the camera is at radius ≈ 0.5 (inside the
      // skybox); the planet-surface dragK formula evaluates to the
      // 0.0005 floor — too sluggish for the look-around use case.
      // Use a fixed sensitivity (~3× the planet-close value) so a
      // single drag sweep covers a comfortable arc of the panorama.
      const dragK = panoramaActive
        ? 0.0025
        : Math.max(0.0005, 0.005 * Math.min(1, (camR - 30) / 60));
      const dT = -dx * dragK;
      const dP = -dy * dragK;
      camT += dT;
      // Panorama-mode tilt clamp (2026-05-21 feedback, round 2):
      // tightened to ±20° from horizon — the intersection of every
      // shipped source's vertical coverage (Viking 1 covers only +5°
      // above horizon, so anything looser exposes the sky pad for
      // that site; symmetrically Curiosity goes only -25° down).
      // ±20° gives a comfortable look-around within imagery on
      // every site without per-site bookkeeping. Outside panorama
      // mode the existing [0.15, π − 0.15] near-poles clamp applies.
      if (panoramaActive) {
        const tiltClamp = 0.349; // ≈ 20° in radians
        camP = Math.max(Math.PI / 2 - tiltClamp, Math.min(Math.PI / 2 + tiltClamp, camP + dP));
      } else {
        camP = Math.max(0.15, Math.min(Math.PI - 0.15, camP + dP));
      }
      // Track velocity for the inertia decay after release. Per-event
      // delta is close to per-frame at 60Hz, good enough for feel.
      camTVelocity = dT;
      camPVelocity = dP;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      // Any user drag cancels an in-flight fly-in animation so the
      // operator stays in control.
      flyActive = false;
      applyCamera();
    }
    function onMouseUp(e: MouseEvent) {
      const wasDragging = dragging;
      dragging = false;
      if (wasDragging && !dragMoved) handlePick(e.clientX, e.clientY);
    }
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      // Panorama mode owns its own (zero) zoom range — the user is
      // INSIDE the skybox sphere at the origin; wheel-scroll would
      // jerk the camera back out to the planet surface and the
      // skybox texture would project as a smear across the (now-
      // visible) planet. Hard no-op while panoramaActive.
      if (panoramaActive) return;
      // Wheel updates the SMOOTH target — RAF lerps camR toward it.
      // Multiplicative scaling keeps the feel consistent across the
      // overview-to-close zoom range. Lower bound 30.2 (camera
      // ≈ 0.2u from surface) keeps the user comfortably above the
      // surface — closer than that and the HiRISE patch's edge
      // clipping at the horizon becomes objectionable. The wider CTX
      // ring (now 3.0u — doubled from 1.5u per 2026-05-21 feedback)
      // also benefits from a slightly higher floor so its edge stays
      // inside the camera frustum.
      const factor = 1 + e.deltaY * 0.0008;
      camRTarget = Math.max(30.2, Math.min(180, camRTarget * factor));
    }

    // Touch
    let touchStart: { x: number; y: number } | null = null;
    let pinchDist: number | null = null;
    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 1) {
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        dragMoved = false;
        dragStartX = e.touches[0].clientX;
        dragStartY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchDist = Math.hypot(dx, dy);
        touchStart = null;
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 1 && touchStart) {
        const t = e.touches[0];
        const dx = t.clientX - dragStartX;
        const dy = t.clientY - dragStartY;
        if (Math.abs(dx) + Math.abs(dy) > 4) dragMoved = true;
        camT -= dx * 0.005;
        camP = Math.max(0.15, Math.min(Math.PI - 0.15, camP - dy * 0.005));
        dragStartX = t.clientX;
        dragStartY = t.clientY;
        applyCamera();
        e.preventDefault();
      } else if (e.touches.length === 2 && pinchDist) {
        // Panorama mode: same no-op as wheel — pinch would translate
        // the camera off the skybox centre.
        if (panoramaActive) {
          e.preventDefault();
          return;
        }
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const d = Math.hypot(dx, dy);
        camR = Math.max(30.2, Math.min(180, camR * (pinchDist / d)));
        camRTarget = camR;
        pinchDist = d;
        applyCamera();
        e.preventDefault();
      }
    }
    function onTouchEnd(e: TouchEvent) {
      if (touchStart && !dragMoved) {
        handlePick(touchStart.x, touchStart.y);
      }
      touchStart = null;
      pinchDist = null;
      void e;
    }

    function pickSiteAt(clientX: number, clientY: number): string | null {
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((clientY - rect.top) / rect.height) * 2 + 1;
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(x, y), camera);
      const targets: THREE.Object3D[] = [];
      for (const sm of surfaceMarkers) if (sm.group.visible) targets.push(sm.group);
      for (const om of orbitalMarkers) if (om.group.visible) targets.push(om.dotGroup);
      const hits = ray.intersectObjects(targets, true);
      for (const h of hits) {
        let obj: THREE.Object3D | null = h.object;
        while (obj && !obj.userData.siteId) obj = obj.parent;
        if (obj?.userData.siteId) return obj.userData.siteId as string;
      }
      return null;
    }

    function handlePick(clientX: number, clientY: number) {
      const id = pickSiteAt(clientX, clientY);
      if (id) selectSite(id);
    }

    let hoveredSiteId: string | null = null;
    // Texture pre-fetch on hover: when the user hovers a lander, kick
    // off a background load of its Tier 2 HiRISE patch. By the time
    // they zoom in past the threshold the texture is already in the
    // browser cache so the patch renders instantly instead of going
    // through the "blank → load → appear" beat.
    const preloadedHotspotIds = new Set<string>();
    function preloadHotspotTexture(siteId: string) {
      if (preloadedHotspotIds.has(siteId)) return;
      const site = sites.find((s) => s.id === siteId);
      if (!site?.hotspot_tier2_source) return;
      preloadedHotspotIds.add(siteId);
      const loader = new THREE.TextureLoader();
      // Detail (HiRISE) layer.
      const dEntry = getImageEntry(site.hotspot_tier2_source);
      const dUrl =
        (dEntry ? pickVariant(dEntry, 'thumbnail', false) : undefined) ?? site.hotspot_tier2_source;
      if (dUrl) loader.load(dUrl);
      // Regional (CTX) layer — preload if the site has it.
      if (site.hotspot_tier2_regional_source) {
        const rEntry = getImageEntry(site.hotspot_tier2_regional_source);
        const rUrl =
          (rEntry ? pickVariant(rEntry, 'thumbnail', false) : undefined) ??
          site.hotspot_tier2_regional_source;
        if (rUrl) loader.load(rUrl);
      }
    }
    function handleHover(e: MouseEvent) {
      if (dragging) return;
      const id = pickSiteAt(e.clientX, e.clientY);
      if (id && id !== hoveredSiteId) preloadHotspotTexture(id);
      hoveredSiteId = id;
    }
    renderer.domElement.addEventListener('mousemove', handleHover);
    renderer.domElement.addEventListener('mouseleave', () => {
      hoveredSiteId = null;
    });

    const stopCanvasInputs = bindCanvasInputs({
      el: renderer.domElement,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onWheel,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    });

    // ──────────────────────────────────────────────────────────────
    // Animation loop
    // ──────────────────────────────────────────────────────────────
    let reduced = false;
    const stopRm = onReducedMotionChange((r) => (reduced = r));
    let raf = 0;
    let lastT = performance.now();
    function frame() {
      raf = requestAnimationFrame(frame);
      const now = performance.now();
      const dt = (now - lastT) / 1000;
      lastT = now;
      // ── Camera smoothing pipeline ────────────────────────────────
      // (a) Fly-in tween (deep-link or selectSite{face:true}). When
      //     active, drives camP/camT/camR directly with ease-out
      //     cubic over FLY_DURATION_MS. Cancelled by user drag.
      let cameraChanged = false;
      if (flyActive) {
        const t = (now - flyStart) / FLY_DURATION_MS;
        if (t >= 1) {
          camP = flyToP;
          camT = flyToT;
          camR = flyToR;
          camRTarget = flyToR;
          flyActive = false;
        } else {
          // Ease-out cubic: 1 - (1-t)^3 — fast start, gentle landing.
          const e = 1 - Math.pow(1 - t, 3);
          camP = flyFromP + (flyToP - flyFromP) * e;
          camT = flyFromT + (flyToT - flyFromT) * e;
          camR = flyFromR + (flyToR - flyFromR) * e;
          camRTarget = camR;
        }
        cameraChanged = true;
      } else {
        // (b) Smooth zoom: lerp camR toward camRTarget at 15%/frame
        //     (~250 ms half-life at 60 Hz). Stops when within 0.001u.
        if (Math.abs(camR - camRTarget) > 0.001) {
          camR += (camRTarget - camR) * 0.15;
          cameraChanged = true;
          // While the zoom is actively interpolating AND the user has a
          // selected site AND isn't dragging, lerp camP/camT toward
          // the site's direction at the same 15%/frame rate. The
          // effect is: zooming in re-centres the site under the cursor
          // even if the user had drifted slightly off after fly-in.
          // Only applies on planet zoom (panorama mode never reaches
          // here because applyCamera there uses radius 0.5).
          // (2026-05-22 feedback: site drifts off-screen as user zooms.)
          if (selected?.lat != null && selected?.lon != null && !dragging) {
            const v = latLonToUnitSphere(selected.lat, selected.lon);
            const local = new THREE.Vector3(v.x, v.y, v.z);
            marsMesh.updateMatrixWorld(true);
            const world = local.applyMatrix4(marsMesh.matrixWorld).normalize();
            const siteP = Math.acos(Math.max(-1, Math.min(1, world.y)));
            const siteT = Math.atan2(world.z, world.x);
            // Lerp camP directly. camT is angular — handle wraparound
            // by picking the shortest direction.
            camP += (siteP - camP) * 0.15;
            let dT = siteT - camT;
            if (dT > Math.PI) dT -= 2 * Math.PI;
            if (dT < -Math.PI) dT += 2 * Math.PI;
            camT += dT * 0.15;
          }
        }
        // (c) Drag inertia: after release, decay angular velocity
        //     ~92%/frame (~200 ms to half) and apply to camT/camP
        //     until below threshold. Skips while user is actively
        //     dragging (velocity is being set fresh each move event).
        if (!dragging && (Math.abs(camTVelocity) > 0.0001 || Math.abs(camPVelocity) > 0.0001)) {
          camT += camTVelocity;
          camP = Math.max(0.15, Math.min(Math.PI - 0.15, camP + camPVelocity));
          camTVelocity *= 0.92;
          camPVelocity *= 0.92;
          cameraChanged = true;
        } else if (dragging) {
          // While dragging, velocity is recomputed per move event;
          // the value sitting here represents the last frame's drag.
          // Clear it so release doesn't double-fire the inertia.
          // (The move-handler will reset on next move.)
          camTVelocity *= 0.5;
          camPVelocity *= 0.5;
        }
      }
      if (cameraChanged) applyCamera();
      // Altitude indicator + contextual info card derivation — both
      // throttled to ~10 Hz to avoid Svelte 5 reactivity churn per
      // frame.
      if (Math.floor(now / 100) !== Math.floor((now - dt * 1000) / 100)) {
        altitudeKm = Math.max(0, (camR - 30) * (3389 / 30));
        // Info card: find the hotspot most likely being looked at
        // (highest currentTier; if tie, smallest camera→site
        // distance). Only show when a hotspot reaches Tier 2+ —
        // otherwise the existing label + Panel are sufficient.
        let bestH: HotspotEntry | null = null;
        let bestDist = Infinity;
        for (const h of hotspots) {
          if (h.currentTier < 2) continue;
          const wp = new THREE.Vector3();
          h.group.getWorldPosition(wp);
          const d = camera.position.distanceTo(wp);
          if (d < bestDist) {
            bestDist = d;
            bestH = h;
          }
        }
        if (bestH) {
          const site = sites.find((s) => s.id === bestH.siteId);
          if (site) {
            // Show every layer that's actually on-screen — when both
            // CTX and HiRISE are loaded for a site, both get an
            // attribution row in the card, regardless of which one
            // "dominates" the frame. The user can see both layers
            // rendered, so both deserve credit.
            const hasRegional = !!site.hotspot_tier2_regional_source;
            const hasDetail = !!site.hotspot_tier2_source;
            const agencyChip = nationChipFor(site);
            const layers: TierLayer[] = [];
            if (hasRegional) {
              layers.push({
                layerLabel: 'Regional view',
                sourceTitle: 'Murray Lab Global CTX Mosaic V01',
                sourceAuthor:
                  'Caltech Murray Lab (Dickson et al. 2024) · CTX from NASA / JPL / MSSS',
                resolutionText: '5 m/px',
                sourceUrl: 'https://murray-lab.caltech.edu/CTX/',
                licenseShort: 'CC-BY-Murray-Lab',
              });
            }
            if (hasDetail) {
              layers.push({
                layerLabel: 'Detail view',
                sourceTitle: `HiRISE ${site.hotspot_tier2_force_product_id ?? ''}`.trim(),
                sourceAuthor: 'NASA / JPL-Caltech / University of Arizona',
                resolutionText: '25 cm/px',
                sourceUrl: site.hotspot_tier2_force_product_id
                  ? `https://www.uahirise.org/${site.hotspot_tier2_force_product_id}`
                  : undefined,
                licenseShort: 'PD-NASA',
              });
            }
            tierContext = {
              siteId: site.id,
              siteName: site.name ?? site.id,
              nation: agencyChip.label,
              nationColor: agencyChip.color,
              missionContext: missionContextFor(site),
              layers,
              uncertaintyM: site.location_uncertainty_m,
            };
          }
        } else if (tierContext !== null) {
          tierContext = null;
        }
      }
      // Mars rotation gated on autoSpin so the user can pause/resume
      // from the HUD. Reduced-motion users always pause.
      if (!reduced && autoSpin) marsMesh.rotation.y += dt * 0.05;
      // Traverse end-dot pulse + zoom-gated visibility. The dot marks
      // the rover's CURRENT position on its traverse polyline; with
      // marsRadius=30u and Curiosity's traverse spanning ~10 km
      // (≈0.09u), the polyline only reads as a path at close zoom.
      // Above that (overview), the polyline is a near-pixel squiggle
      // and the end-dot just plops a blob on top of the lander marker
      // for no information gain. So gate both end+start dots on
      // zoomScale < 0.45 (≈ camR < 40), where the polyline curves are
      // legible. Pulse uses sine-wave scale (0.85 → 1.25) at ~1 Hz,
      // multiplied by the zoom factor so the dot stays proportional to
      // the lander model rather than dominating it.
      const pulse = 1.05 + 0.2 * Math.sin(now * 0.006);
      const dotZoomScale = computeTierScale(camR);
      const traverseDotsVisible = layerTraverses && dotZoomScale < 0.45;
      // Labels should stay readable at close zoom — the original
      // "labels follow dot zoom taper" rule shrank them to 0.2× by
      // camR=30.5, where the start/end caption sprites became
      // unreadable. Floor bumped from 0.55 → 0.85 (2026-05-22 round
      // 2 — the 0.55 floor was still too small to read on the
      // HiRISE patch at last-3 zoom levels). Dots stay at
      // dotZoomScale (proportional to the lander model).
      const labelZoomScale = Math.max(0.85, dotZoomScale);
      for (const tl of traverseLines) {
        tl.endDot.visible = traverseDotsVisible;
        tl.startDot.visible = traverseDotsVisible;
        if (tl.startLabel) tl.startLabel.visible = traverseDotsVisible;
        if (tl.endLabel) tl.endLabel.visible = traverseDotsVisible;
        if (!tl.endDot.visible) continue;
        // Dot scale also floored — at camR=30.5 the unfloored
        // dotZoomScale was 0.2, which made the green/red dots
        // essentially vanish on the HiRISE patch underneath. 0.35
        // keeps them small enough not to dominate but legible.
        const dotScale = Math.max(0.35, dotZoomScale);
        if (tl.isActive && !reduced) {
          tl.endDot.scale.setScalar(dotScale * pulse);
        } else {
          tl.endDot.scale.setScalar(dotScale);
        }
        // Start dot (landing site) — same zoom taper, no pulse.
        if (tl.startDot.visible) tl.startDot.scale.setScalar(dotScale);
        // Labels use the FLOORED scale so they remain readable at
        // close zoom even when the dots are tiny.
        if (tl.startLabel) tl.startLabel.scale.setScalar(labelZoomScale);
        if (tl.endLabel) tl.endLabel.scale.setScalar(labelZoomScale);
      }
      // Orbital dot motion — perception-scaled; one ring per ~30s.
      for (const om of orbitalMarkers) {
        if (!om.group.visible) continue;
        tickOrbiterDot(om, dt, reduced);
      }

      // Outline-on-hover: pass the hovered marker group to OutlinePass.
      const outlineMeshes: THREE.Object3D[] = [];
      const selectedId = selected?.id;
      if (hoveredSiteId && hoveredSiteId !== selectedId) {
        const sm = surfaceMarkers.find((s) => s.siteId === hoveredSiteId);
        // Target the Tier-0 silhouette rather than the wrapper group:
        // OutlinePass traverses children, so passing the wrapper would
        // outline the label sprite + halo + invisible hit sphere too,
        // which reads as a blurry rectangle / nothing on screen. The
        // tier0 sub-group is just the lander mesh-tree.
        if (sm?.tier0Group) outlineMeshes.push(sm.tier0Group);
        const om = orbitalMarkers.find((o) => o.dotGroup.userData.siteId === hoveredSiteId);
        if (om) outlineMeshes.push(om.dotGroup);
      }
      outlinePass.selectedObjects = outlineMeshes;

      // Scale-pulse on selected marker group. Strength tapers with
      // camera zoom: full ±6 % at overview (find-the-site cue) and
      // hard-zero by camR ≈ 50 (zoomScale ≤ 0.5) — once the user has
      // zoomed in, they know where the lander is and the pulse just
      // jiggles the surface patch + halo unhelpfully.
      const zoomScalePulse = computeTierScale(camR);
      const pulseStrength = Math.max(0, (zoomScalePulse - 0.5) / 0.5);
      const pulseScale = 1 + Math.sin(now * 0.0026) * 0.06 * pulseStrength;
      // Selection halo opacity: full at overview (find-the-site cue),
      // fully hidden BEFORE the Tier-2 patch + green pin appear so the
      // two cues don't overlap. Tier-2 promotion kicks in around camR
      // ≈ 38 (zoomScale ≈ 0.4); we end the fade at zoomScale = 0.5
      // (camR ≈ 42), one full step earlier, leaving a clean handoff.
      // Full opacity at zoomScale ≥ 0.8 (camR ≥ ~53), linear between.
      const haloFade = Math.max(0, Math.min(1, (zoomScalePulse - 0.5) / 0.3));
      for (const sm of surfaceMarkers) {
        sm.group.scale.setScalar(sm.siteId === selectedId ? pulseScale : 1);
        // Selection halo: shrink with zoom AND fade out as the user
        // commits to the site. Geometry still scales (radius 1.4u
        // would dome over the view at close zoom) but the opacity
        // taper means the halo is gone before its shrunk size would
        // overlap with the patch elements anyway.
        if (sm.halo) {
          sm.halo.scale.setScalar(zoomScalePulse);
          const mat = sm.halo.material as THREE.Material & { opacity?: number };
          if ('opacity' in mat) mat.opacity = 0.9 * haloFade;
          sm.halo.visible = haloFade > 0.02 && sm.siteId === selectedId;
        }
      }
      for (const om of orbitalMarkers) {
        const id = om.dotGroup.userData.siteId as string | undefined;
        om.dotGroup.scale.setScalar(id === selectedId ? pulseScale : 1);
      }

      // Surface Hotspots LOD (PRD-014 / RFC-017 S4).
      if (hotspots.length) {
        // Selected-site clamp: only the user's currently-selected
        // hotspot is allowed to promote past Tier 1. Sites without
        // a selection use their full data-driven maxTier (overview
        // behaviour unchanged). With a selection, non-selected sites
        // clamp to min(originalMaxTier, 1) so their CTX + HiRISE
        // discs don't render and overlap weirdly when adjacent
        // landing sites are both visible. Dispatcher reads
        // entry.maxTier each frame, so mutating it here is safe.
        const selectedId = selected?.id;
        for (const h of hotspots) {
          const orig = originalMaxTier.get(h.siteId) ?? (h.maxTier as 0 | 1 | 2 | 3);
          if (selectedId == null || selectedId === h.siteId) {
            h.maxTier = orig;
          } else {
            h.maxTier = Math.min(1, orig) as 0 | 1;
          }
        }
        const canvasH = renderer.domElement.clientHeight || 1;
        updateHotspotLOD(hotspots, camera, canvasH, now, dt * 1000);
        let topTier = 0;
        for (const h of hotspots) if (h.currentTier > topTier) topTier = h.currentTier;
        const target = renderer.domElement;
        const attr = target.getAttribute('data-hotspot-tier');
        const next = String(topTier);
        if (attr !== next) target.setAttribute('data-hotspot-tier', next);
        // Zoom-aware tier scaling. The hand-authored tier-0 markers
        // and tier-1 lander models are sized for overview-level reading.
        // As the camera zooms in (camR shrinks toward marsRadius=30),
        // those models become disproportionately huge against the
        // HiRISE patch underneath. Shrink them toward 0.2× at the
        // closest zoom (camR≈30.6) so the rover sits readably on the
        // patch rather than dominating it. Tier 2 patches stay at
        // world scale — they're sized in surface metres and shouldn't
        // shrink with camera.
        const zoomScale = computeTierScale(camR);
        for (const h of hotspots) {
          if (h.tier0Group) h.tier0Group.scale.setScalar(zoomScale);
          if (h.tier1Group) h.tier1Group.scale.setScalar(zoomScale);
        }
        // Site labels: shrink with zoomScale AND hide entirely once the
        // camera is close enough to read the HiRISE patch (zoomScale ≤
        // 0.3 ≈ camR ≤ 38). At that range labels cover more of the
        // patch than they're worth.
        for (const sm of surfaceMarkers) {
          if (sm.labelGroup) {
            // Labels need to stay readable at close zoom — earlier
            // logic hid them when zoomScale ≤ 0.3 (camR ≈ 38) which
            // killed the label at the very moment the user was
            // closest to the site they cared about. Floor at 0.65
            // (still smaller than overview, never unreadable) and
            // keep visible at every zoom.
            const labelScale = Math.max(0.65, zoomScale);
            sm.labelGroup.scale.setScalar(labelScale);
            sm.labelGroup.visible = true;
          }
        }
        // Tier 2 detail-layer reveal ramp (2026-05-21 feedback). Two
        // groups of geometry share this ramp:
        //   1. The HiRISE inner disc inside each tier2Group (tagged
        //      userData.layer === 'detail' by the patch builder).
        //   2. The "delayed-reveal" surface annotations — rover
        //      traverse polylines, start/end dots, traverse caption
        //      sprites. These are high-frequency annotations whose
        //      detail is illegible at CTX-regional zoom and clutter
        //      the overview view.
        // Both stay hidden until camR drops below 33 (just past the
        // dispatcher's Tier 1→2 promotion), then ramp to fully
        // visible at camR ≤ 30.5 — the last ~2.5u of dolly-in.
        // Earlier values (40 → 33) had HiRISE already at 80% opacity
        // by the time tier2 became visible, defeating the "later
        // than CTX" effect; the new range delays HiRISE strictly
        // until after the CTX disc has settled.
        const detailFadeStart = 33;
        const detailFadeEnd = 30.5;
        const detailOpacity =
          camR >= detailFadeStart
            ? 0
            : camR <= detailFadeEnd
              ? 1
              : 1 - (camR - detailFadeEnd) / (detailFadeStart - detailFadeEnd);
        for (const h of hotspots) {
          if (!h.tier2Group) continue;
          h.tier2Group.traverse((obj) => {
            if (!(obj instanceof THREE.Mesh)) return;
            if (obj.userData?.layer !== 'detail') return;
            const mat = obj.material as THREE.Material & { opacity: number };
            mat.opacity = detailOpacity;
            mat.transparent = detailOpacity < 0.99;
          });
        }
        for (const obj of tier2DelayedReveal) {
          obj.visible = detailOpacity > 0.01;
          // Lines + dots + caption sprites all carry a `material`
          // ref with opacity. Walk meshes/groups uniformly.
          if (obj instanceof THREE.Group) {
            obj.traverse((child) => {
              if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
                const mat = child.material as THREE.Material & { opacity: number };
                if (mat && 'opacity' in mat) {
                  mat.opacity = detailOpacity;
                  mat.transparent = detailOpacity < 0.99;
                }
              }
            });
          } else {
            const mat = (obj as { material?: THREE.Material & { opacity: number } }).material;
            if (mat && 'opacity' in mat) {
              mat.opacity = detailOpacity;
              mat.transparent = detailOpacity < 0.99;
            }
          }
        }
      }
      if (showDebug) {
        let maxAcross = 0;
        for (const h of hotspots) if (h.maxTier > maxAcross) maxAcross = h.maxTier;
        let curTop = 0;
        for (const h of hotspots) if (h.currentTier > curTop) curTop = h.currentTier;
        let tgtTop = 0;
        for (const h of hotspots) if (h.targetTier > tgtTop) tgtTop = h.targetTier;
        debugInfo.siteCount = sites.length;
        debugInfo.hotspotCount = hotspots.length;
        debugInfo.maxTierAcrossSites = maxAcross;
        debugInfo.currentTopTier = curTop;
        debugInfo.targetTopTier = tgtTop;
        debugInfo.pageMode = hotspotsMode;
        debugInfo.dispatcherMode = getHotspotMode();
        debugInfo.camR = camR;
        // Sample the projected px radius for the first hotspot — sanity
        // check that the auto-mode math is reaching tier thresholds.
        if (hotspots.length > 0) {
          const h = hotspots[0];
          const wp = new THREE.Vector3();
          h.group.getWorldPosition(wp);
          const canvasH = renderer.domElement.clientHeight || 1;
          const distance = camera.position.distanceTo(wp);
          const halfH = distance * Math.tan((camera.fov * Math.PI) / 360);
          const pxPerUnit = canvasH / (2 * halfH);
          debugInfo.projectedPxSample = `${h.siteId} dist=${distance.toFixed(1)}u px/u=${pxPerUnit.toFixed(0)}`;
        }
        // Survey: how many hotspots have a built tier2Group + how many are visible?
        let t2built = 0,
          t2visible = 0;
        for (const h of hotspots) {
          if (h.tier2Group) {
            t2built++;
            if (h.tier2Group.visible) t2visible++;
          }
        }
        debugInfo.tier2Status = `${t2built} built / ${t2visible} visible`;
        // Drill into the first hotspot's tier2Group: child count, first
        // mesh visibility, material opacity, world position.
        const h0 = hotspots[0];
        if (h0?.tier2Group) {
          const tg = h0.tier2Group;
          // Single-element array sidesteps TS's flow analysis narrowing
          // callback-mutated closure scalars to `never` after the
          // initial null.
          const fmRef: Array<THREE.Mesh> = [];
          tg.traverse((o) => {
            if (fmRef.length === 0 && o instanceof THREE.Mesh) fmRef.push(o);
          });
          const firstMesh: THREE.Mesh | null = fmRef[0] ?? null;
          // Mesh world position, not group's — the patch mesh sits at
          // group + (Z_FIGHT_OFFSET in outward direction), so this
          // reflects what actually gets rendered.
          const wp = new THREE.Vector3();
          if (firstMesh) firstMesh.getWorldPosition(wp);
          else tg.getWorldPosition(wp);
          let reachable = false;
          // Walk parent chain to see if any ancestor is hidden.
          let cur: THREE.Object3D | null = tg as THREE.Object3D;
          let hidden = false;
          while (cur) {
            if (!cur.visible) {
              hidden = true;
              break;
            }
            cur = cur.parent;
          }
          reachable = !hidden;
          const m = firstMesh
            ? (firstMesh.material as THREE.Material & { opacity?: number })
            : null;
          debugInfo.patchDetail = `tg.children=${tg.children.length} tg.visible=${tg.visible} reachable=${reachable} meshVis=${firstMesh?.visible ?? '?'} matOp=${m?.opacity ?? '?'} worldR=${wp.length().toFixed(2)}`;
        }
      }

      // 2D draw on each frame so rotation + dots stay live.
      if (view === '2d') draw2d();
      composer.render();
    }
    frame();

    // ──────────────────────────────────────────────────────────────
    // 2D — equirectangular projection of Mars surface
    // ──────────────────────────────────────────────────────────────
    const c2 = canvas2d;
    const ctx2 = c2.getContext('2d')!;
    const marsImage = new Image();
    let marsImageLoaded = false;
    marsImage.onload = () => {
      marsImageLoaded = true;
      if (view === '2d') draw2d();
    };
    marsImage.src = `${base}/textures/2k_mars.jpg`;

    function size2d() {
      if (!canvas2d) return { W: 0, H: 0 };
      // Read from the canvas's own bounding box rather than the 3D
      // container — when view='2d' the 3D container has display:none,
      // so its clientWidth/Height collapse to 0 and the canvas would
      // size to 0×0. The canvas itself, with width:100% / height:100%
      // anchored to .mars (position:absolute inset:nav 0 0 0), gets
      // proper dimensions from its containing block.
      const rect = canvas2d.getBoundingClientRect();
      const W = Math.max(1, Math.round(rect.width));
      const H = Math.max(1, Math.round(rect.height));
      const ratio = window.devicePixelRatio || 1;
      canvas2d.width = W * ratio;
      canvas2d.height = H * ratio;
      canvas2d.style.width = `${W}px`;
      canvas2d.style.height = `${H}px`;
      ctx2.setTransform(ratio, 0, 0, ratio, 0, 0);
      return { W, H };
    }

    function draw2d() {
      const { W, H } = size2d();
      ctx2.clearRect(0, 0, W, H);
      ctx2.fillStyle = '#04040c';
      ctx2.fillRect(0, 0, W, H);

      // Equirectangular map: full-bleed, 2:1 aspect → fit within container.
      const mapW = Math.min(W - 40, (H - 80) * 2);
      const mapH = mapW / 2;
      const mapX = (W - mapW) / 2;
      const mapY = (H - mapH) / 2;

      if (marsImageLoaded) {
        ctx2.drawImage(marsImage, mapX, mapY, mapW, mapH);
      } else {
        const gr = ctx2.createLinearGradient(mapX, mapY, mapX, mapY + mapH);
        gr.addColorStop(0, '#3a1a0e');
        gr.addColorStop(1, '#2a0e06');
        ctx2.fillStyle = gr;
        ctx2.fillRect(mapX, mapY, mapW, mapH);
      }

      // Subtle frame
      ctx2.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx2.lineWidth = 1;
      ctx2.strokeRect(mapX, mapY, mapW, mapH);

      // Lat/lon graticule — every 30°
      ctx2.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx2.lineWidth = 0.5;
      for (let lat = -60; lat <= 60; lat += 30) {
        const y = mapY + ((90 - lat) / 180) * mapH;
        ctx2.beginPath();
        ctx2.moveTo(mapX, y);
        ctx2.lineTo(mapX + mapW, y);
        ctx2.stroke();
      }
      for (let lon = 30; lon < 360; lon += 30) {
        const x = mapX + (lon / 360) * mapW;
        ctx2.beginPath();
        ctx2.moveTo(x, mapY);
        ctx2.lineTo(x, mapY + mapH);
        ctx2.stroke();
      }

      // Traverse polylines — drawn beneath the markers so site dots
      // remain on top. Each traverse is a connected polyline tinted
      // by the rover's agency colour with reduced opacity for ENDED
      // missions.
      if (layerTraverses) {
        for (const tr of Object.values(traverses)) {
          if (!tr.points || tr.points.length < 2) continue;
          const site = sites.find((s) => s.id === tr.rover_id);
          ctx2.strokeStyle = site ? colorFor(site) : '#ffffff';
          ctx2.globalAlpha = tr.status === 'ACTIVE' ? 0.95 : 0.7;
          ctx2.lineWidth = 1.6;
          ctx2.beginPath();
          for (let i = 0; i < tr.points.length; i++) {
            let pLon = tr.points[i][1];
            if (pLon < 0) pLon += 360;
            const px = mapX + (pLon / 360) * mapW;
            const py = mapY + ((90 - tr.points[i][0]) / 180) * mapH;
            if (i === 0) ctx2.moveTo(px, py);
            else ctx2.lineTo(px, py);
          }
          ctx2.stroke();
          ctx2.globalAlpha = 1;
        }
      }

      // Surface markers
      sitePos2d.clear();
      if (layerSurface) {
        for (const site of sites) {
          if (site.kind !== 'surface') continue;
          if (site.lat == null || site.lon == null) continue;
          // Normalise lon to [0, 360) for east-positive convention used
          // by NASA's Mars Trek and the ESA Mars Express atlas.
          let lon = site.lon;
          if (lon < 0) lon += 360;
          const x = mapX + (lon / 360) * mapW;
          const y = mapY + ((90 - site.lat) / 180) * mapH;
          sitePos2d.set(site.id, { x, y });
          const isFailed = site.status === 'CRASHED' || site.status === 'LOST';
          // Glow when selected
          if (selected?.id === site.id) {
            ctx2.fillStyle = colorFor(site);
            ctx2.shadowColor = colorFor(site);
            ctx2.shadowBlur = 12;
            ctx2.beginPath();
            ctx2.arc(x, y, 7, 0, Math.PI * 2);
            ctx2.fill();
            ctx2.shadowBlur = 0;
          }
          ctx2.fillStyle = colorFor(site);
          ctx2.beginPath();
          ctx2.arc(x, y, 4, 0, Math.PI * 2);
          ctx2.fill();
          // Outline (dashed for failures)
          ctx2.strokeStyle = '#ffffff';
          ctx2.lineWidth = 1;
          if (isFailed) ctx2.setLineDash([2, 2]);
          ctx2.beginPath();
          ctx2.arc(x, y, 4.5, 0, Math.PI * 2);
          ctx2.stroke();
          ctx2.setLineDash([]);
        }
      }

      // Orbiter "presence indicator" along top of the map — just shows
      // they exist; clicking any opens the panel. 2D view is primarily
      // about the surface but we don't want to hide orbiters entirely.
      if (layerOrbiters) {
        let strip = mapY - 16;
        let x = mapX;
        ctx2.font = "bold 7px 'Space Mono', monospace";
        ctx2.fillStyle = 'rgba(255,255,255,0.5)';
        ctx2.textAlign = 'left';
        ctx2.fillText('IN ORBIT', x, strip);
        x += 60;
        const orbiters = sites.filter((s) => s.kind === 'orbiter');
        for (const o of orbiters) {
          ctx2.fillStyle = colorFor(o);
          ctx2.beginPath();
          ctx2.arc(x, strip - 3, 4, 0, Math.PI * 2);
          ctx2.fill();
          // Click target — same map registers in sitePos2d.
          sitePos2d.set(o.id, { x, y: strip - 3 });
          x += 14;
        }
        void strip;
      }

      // Legend
      const legendY = H - 24;
      ctx2.font = "bold 7px 'Space Mono', monospace";
      ctx2.textAlign = 'left';
      drawNationLegend2d(ctx2, { startX: 36, y: legendY, palette: NATION_COLORS });
    }

    function on2dClick(e: MouseEvent) {
      const id = pickClosest2d({
        canvas: c2,
        clientX: e.clientX,
        clientY: e.clientY,
        positions: sitePos2d,
        tolerance: 18,
      });
      if (id) selectSite(id);
    }
    c2.addEventListener('click', on2dClick);

    // ──────────────────────────────────────────────────────────────
    // Resize
    // ──────────────────────────────────────────────────────────────
    const onResize = createCanvasResizer({
      container,
      camera,
      renderer,
      composer,
      outlinePass,
      onResize: () => {
        if (view === '2d') draw2d();
      },
    });
    window.addEventListener('resize', onResize);

    // Re-draw 2D on view toggle.
    $effect(() => {
      if (view === '2d') draw2d();
    });

    cleanup = () => {
      cancelAnimationFrame(raf);
      stopPanoramaEscape();
      panoramaSkybox?.dispose();
      stopRm();
      stopMarsAtmosphereLayer?.();
      window.removeEventListener('resize', onResize);
      stopCanvasInputs();
      c2.removeEventListener('click', on2dClick);
      for (const sm of surfaceMarkers) disposeObject3d(sm.group);
      for (const om of orbitalMarkers) disposeObject3d(om.group);
      marsMesh.geometry.dispose();
      (marsMesh.material as THREE.Material).dispose();
      disposeSceneRenderer({ renderer, outlinePass });
    };
  });

  onDestroy(() => cleanup?.());
</script>

<svelte:head>
  <title>{m.mars_page_title()}</title>
  <meta name="description" content={m.mars_meta_description()} />
</svelte:head>

<div class="mars">
  <!-- Non-visual parallel mode (PRD-007 / GH #256 / ADR-025 v0.7.0).
       Screen-reader-only mirror of the 3D-canvas site markers. Each
       button fires the same selectSite handler that a canvas click
       does, so a screen-reader user can navigate to any landing
       site without sighted help. Visually hidden via .sr-only;
       always present in the DOM + tab order. -->
  <ul class="sr-only sr-site-list" aria-label={m.a11y_mars_sites_list_aria()}>
    {#each sites as site (site.id)}
      <li>
        <button
          type="button"
          onclick={() => selectSite(site.id, { face: true })}
          aria-current={selected?.id === site.id ? 'true' : undefined}
        >
          {m.a11y_select_site_template({
            name: site.name ?? site.site_name ?? site.id,
            agency: site.agency ?? '',
          })}
        </button>
      </li>
    {/each}
  </ul>

  <!-- 3D layer -->
  <div
    bind:this={container}
    class="layer"
    class:hidden={view !== '3d'}
    aria-label={m.mars_globe_aria()}
  ></div>
  <!-- 2D layer -->
  <canvas
    bind:this={canvas2d}
    class="layer"
    class:hidden={view !== '2d'}
    aria-label={m.mars_map_aria()}
    data-sites-count={sites.length}
  ></canvas>

  <!-- Top-left HUD (matches /explore convention) -->
  <div class="hud-controls" role="group" aria-label={m.ui_view_controls()}>
    <div class="ctrl-row">
      <ViewToggleButton
        is2d={view === '2d'}
        label={view === '3d' ? m.ui_view_2d() : m.ui_view_3d()}
        onToggle={toggleView}
      />
      {#if view === '3d'}
        <View3dControls
          onReset={() => resetMarsCamera()}
          {autoSpin}
          onToggleSpin={() => (autoSpin = !autoSpin)}
        />
      {/if}
    </div>
    <div class="ctrl-row chips" role="group" aria-label={m.ui_visibility_layers()}>
      <LayerChipRow
        chips={[
          {
            testid: 'layer-surface',
            label: m.ui_layer_surface(),
            title: m.mars_layer_tip_surface(),
            active: () => layerSurface,
            toggle: () => (layerSurface = !layerSurface),
          },
          {
            testid: 'layer-orbiters',
            label: m.ui_layer_orbiters(),
            title: m.mars_layer_tip_orbiters(),
            active: () => layerOrbiters,
            toggle: () => (layerOrbiters = !layerOrbiters),
          },
          {
            testid: 'layer-orbits',
            label: m.ui_layer_orbits(),
            title: m.mars_layer_tip_orbit_rings(),
            active: () => layerOrbits,
            toggle: () => (layerOrbits = !layerOrbits),
          },
          {
            testid: 'layer-traverses',
            label: m.ui_layer_traverses(),
            title: m.mars_layer_tip_traverses(),
            active: () => layerTraverses,
            toggle: () => (layerTraverses = !layerTraverses),
          },
        ]}
      />
      <HotspotsLodChip mode={hotspotsMode} onCycle={cycleHotspotsMode} />
    </div>
  </div>

  {#if loadFailed}
    <div class="load-failed" role="alert">{m.mars_load_failed()}</div>
  {/if}

  <PanoramaOverlay
    active={panoramaActive}
    description="You are standing at the landing site on Mars. The lander is in front of you. Drag to look around. Press ESC, or use the Exit panorama view button in the detail panel, to return."
  />

  <!-- Legend overlay (3D view; 2D paints its own legend on the canvas) -->
  {#if view === '3d'}
    <div class="legend-3d" aria-label={m.mars_legend_nation_aria()}>
      {#each Object.entries(NATION_COLORS) as [nation, color] (nation)}
        <span class="legend-item">
          <span class="legend-dot" style:background={color}></span>
          {nation}
        </span>
      {/each}
    </div>
  {/if}

  {#if view === '3d'}
    <div class="altitude-indicator" aria-hidden="true">
      {altitudeKm >= 1000
        ? `${(altitudeKm / 1000).toFixed(1)} Mm`
        : altitudeKm >= 1
          ? `${altitudeKm.toFixed(0)} km`
          : `${(altitudeKm * 1000).toFixed(0)} m`} altitude
    </div>
  {/if}
  {#if view === '3d' && tierContext && !panoramaActive}
    <TierContextCard
      {tierContext}
      scaleNote={'Discs are not drawn to scale. CTX covers ~10 km × 10 km of ground; HiRISE ~500 m × 500 m at the centre. The 3:1 visual ratio is a stylized "you are HERE" callout — at true scale HiRISE would be a sub-pixel speck inside the CTX disc.'}
    />
  {/if}
  {#if showDebug}
    {@const debugText = `hotspots debug
sidecar     ${debugInfo.sidecarStatus}
sites       ${debugInfo.siteCount}
hotspots    ${debugInfo.hotspotCount}
maxTier     ${debugInfo.maxTierAcrossSites}  (sidecar joined to sites)
targetTier  ${debugInfo.targetTopTier}  (dispatcher's intended top tier)
curTier     ${debugInfo.currentTopTier}  (dispatcher's settled top tier)
pageMode    ${debugInfo.pageMode}
dispMode    ${debugInfo.dispatcherMode}  (currentMode in dispatcher module)
tier2       ${debugInfo.tier2Status}
patch[0]    ${debugInfo.patchDetail}
camR        ${debugInfo.camR.toFixed(1)}
sample      ${debugInfo.projectedPxSample}`}
    <div
      style="position:fixed;top:80px;left:12px;z-index:9999;background:rgba(0,0,0,0.85);color:#0f0;font:11px/1.4 ui-monospace,SFMono-Regular,monospace;padding:8px 10px;border:1px solid #0f0;border-radius:4px;user-select:text;-webkit-user-select:text;"
    >
      <pre
        style="margin:0;color:inherit;font:inherit;white-space:pre;user-select:text;">{debugText}</pre>
      <button
        type="button"
        style="margin-top:6px;background:#0f0;color:#000;border:0;padding:2px 8px;font:inherit;cursor:pointer;border-radius:2px;"
        onclick={() => {
          void navigator.clipboard?.writeText(debugText);
        }}>copy</button
      >
    </div>
  {/if}
</div>

<Panel
  open={panelOpen}
  title={selected?.name ?? selected?.id ?? ''}
  onClose={() => (panelOpen = false)}
>
  {#if selected}
    {@const tone = statusTone(selected.status)}
    {#if panelGallery.length > 0}
      <PanelHeroImage
        src={panelGallery[0]!}
        name={selected.name ?? selected.id}
        onOpen={() => (panelLightbox = panelGallery[0]!)}
      />
    {/if}
    <PanelTabRow
      rowClass="panel-tabs"
      buttonClass="tab-btn"
      tabs={buildSurfacePanelTabs({
        hasGallery: panelGallery.length > 0,
        hasStory: !!panelStory,
        hasLinks: panelHasLinks,
      })}
      bind:active={panelTab}
    />

    {#if panelTab === 'overview'}
      <div class="panel-body">
        <div class="badges">
          <span class="badge agency" style:background={colorFor(selected)}>{selected.agency}</span>
          <span class="badge status" style:color={tone.color} style:border-color={tone.color}>
            {tone.label}
          </span>
          <span class="badge kind">{selected.kind === 'orbiter' ? 'IN ORBIT' : 'ON SURFACE'}</span>
        </div>
        <PanoramaToggleButton
          panoramaUrl={selected.hotspot_tier3_panorama}
          siteId={selected.id}
          {panoramaActive}
          onEnter={enterPanorama}
          onExit={exitPanorama}
        />
        {#if selected.mission_type}
          <p class="mission-type">
            {selected.mission_type}<ScienceChip
              tab="mission-phases"
              section="mission-types"
              label={m.chip_label_mission_types()}
            />
          </p>
        {/if}
        <dl class="meta-grid">
          <dt>Year</dt>
          <dd>{selected.year}</dd>
          {#if selected.landing_date}
            <dt>Landing</dt>
            <dd>{selected.landing_date}</dd>
          {/if}
          {#if selected.kind === 'surface' && selected.lat != null && selected.lon != null}
            <dt>
              Coordinates<WhyPopover
                title={m.why_landing_site_title()}
                body={m.why_landing_site_body()}
              />
            </dt>
            <dd>{selected.lat.toFixed(2)}°, {selected.lon.toFixed(2)}°</dd>
          {/if}
          {#if selected.kind === 'orbiter'}
            <dt>Altitude</dt>
            <dd>{selected.altitude_km?.toLocaleString()} km</dd>
            <dt>
              Inclination<WhyPopover
                title={m.why_arrival_inclination_title()}
                body={m.why_arrival_inclination_body()}
                tab="orbits"
                section="inclination"
              />
            </dt>
            <dd>{selected.inclination_deg?.toFixed(1)}°</dd>
          {/if}
          {#if selected.site_name}
            <dt>{selected.kind === 'orbiter' ? 'Orbit' : 'Site'}</dt>
            <dd>{selected.site_name}</dd>
          {/if}
          {#if selected.surface_duration_days}
            <dt>
              Duration<WhyPopover
                title={m.why_surface_time_title()}
                body={m.why_surface_time_body()}
              />
            </dt>
            <dd>{selected.surface_duration_days.toLocaleString()} days</dd>
          {/if}
        </dl>
        {#if selected.fact}
          <p class="fact">{selected.fact}</p>
        {/if}
        {#if selected.capability}
          <p class="capability"><em>{selected.capability}</em></p>
        {/if}
        {#if selected.mission_id}
          <a class="mission-link" href="{base}/missions?id={selected.mission_id}">
            FULL MISSION CARD →
          </a>
        {/if}
        <p class="credit">{selected.credit}</p>
      </div>
    {:else if panelTab === 'gallery'}
      <div class="panel-body">
        <div class="gallery-grid">
          {#each panelGalleryGrid as src (src)}
            <button
              type="button"
              class="gallery-thumb"
              onclick={() => (panelLightbox = src)}
              aria-label={m.mars_lightbox_open_aria()}
            >
              <img {src} alt="" loading="lazy" />
            </button>
          {/each}
        </div>
        {#if panelGalleryGrid.length > 0}
          <p class="gallery-credit">{m.panel_gallery_credit()}</p>
        {/if}
      </div>
    {:else if panelTab === 'story' && panelStory}
      <div class="panel-body">
        <SiteStoryPanel story={panelStory} onLightbox={(src) => (panelLightbox = src)} />
      </div>
    {:else if panelTab === 'learn'}
      <div class="panel-body">
        {#if panelLinksByTier.intro.length}
          <h4 class="learn-tier intro">INTRO</h4>
          <ul class="learn-links">
            {#each panelLinksByTier.intro as link (link.u)}
              <li><LearnLink entityId={selected.id} url={link.u} label={link.l} /></li>
            {/each}
          </ul>
        {/if}
        {#if panelLinksByTier.core.length}
          <h4 class="learn-tier core">CORE</h4>
          <ul class="learn-links">
            {#each panelLinksByTier.core as link (link.u)}
              <li><LearnLink entityId={selected.id} url={link.u} label={link.l} /></li>
            {/each}
          </ul>
        {/if}
        {#if panelLinksByTier.deep.length}
          <h4 class="learn-tier deep">DEEP</h4>
          <ul class="learn-links">
            {#each panelLinksByTier.deep as link (link.u)}
              <li><LearnLink entityId={selected.id} url={link.u} label={link.l} /></li>
            {/each}
          </ul>
        {/if}
      </div>
    {/if}
  {/if}
</Panel>

<PanelLightbox src={panelLightbox} onClose={() => (panelLightbox = null)} />

<!-- J.2 — Science Lens banner on /mars. Top-center, lens-gated;
     links into the EDL chapter — the seven-minute gauntlet every
     Mars surface mission has to survive. -->
<!-- Unified Science Lens panel — lens story + atmosphere shell in one
     collapse. -->
<ScienceLayersPanel
  title="Mars · cold, thin air, half-Earth gravity"
  body="Atmosphere is 1% of Earth's — too thin to brake on alone, too thick to ignore. EDL (entry, descent, landing) compresses 6 km/s of arrival speed into 7 minutes of choreographed parachutes, retrorockets, and skycranes."
  tab="mission-phases"
  section="edl"
  available={['atmosphere']}
/>

<style>
  .mars {
    position: absolute;
    inset: var(--nav-height) 0 0 0;
    overflow: hidden;
  }
  .layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    touch-action: none;
  }
  .layer.hidden {
    display: none;
  }

  .hud-controls {
    position: fixed;
    top: calc(var(--nav-height) + 12px);
    left: 16px;
    z-index: 35;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
  }
  .ctrl-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    pointer-events: auto;
  }
  .panel-body :global(.stand-at-site) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 10px 14px;
    margin-top: 12px;
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 2px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease;
  }
  .panel-body :global(.stand-at-site::before) {
    content: '◐';
    font-size: 13px;
    line-height: 1;
    color: var(--accent, #cc7a55);
  }
  .panel-body :global(.stand-at-site--exit::before) {
    content: '✕';
    color: var(--accent, #cc7a55);
  }
  .panel-body :global(.stand-at-site:hover),
  .panel-body :global(.stand-at-site:focus-visible) {
    background: rgba(255, 255, 255, 0.08);
    border-color: var(--accent, #cc7a55);
    color: #fff;
    outline: none;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .ctrl-row.chips {
    flex-direction: column;
    /* Explicit width keeps chips a consistent size that's NOT inherited
       from the toggle row above. */
    width: 140px;
    align-items: stretch;
  }
  .hud-controls :global(.toggle) {
    min-width: 44px;
    min-height: 36px;
    max-width: 70px;
    padding: 4px 8px;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid rgba(193, 68, 14, 0.45);
    color: #ffd2c0;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    line-height: 1.15;
    letter-spacing: 0.04em;
    text-align: center;
    white-space: normal;
    border-radius: 4px;
    cursor: pointer;
    backdrop-filter: blur(6px);
    transition:
      border-color 120ms,
      background 120ms;
  }
  .hud-controls :global(.toggle:hover),
  .hud-controls :global(.toggle:focus-visible) {
    border-color: #c1440e;
    background: rgba(60, 18, 8, 0.95);
    outline: none;
  }
  .hud-controls :global(.chip) {
    min-height: 32px;
    min-width: 110px;
    padding: 0 10px;
    background: rgba(8, 10, 22, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: rgba(255, 255, 255, 0.55);
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1.5px;
    text-align: center;
    border-radius: 999px;
    cursor: pointer;
    backdrop-filter: blur(6px);
    transition:
      border-color 120ms,
      background 120ms,
      color 120ms;
  }
  .hud-controls :global(.chip:hover),
  .hud-controls :global(.chip:focus-visible) {
    color: #fff;
    border-color: rgba(193, 68, 14, 0.65);
    outline: none;
  }
  .hud-controls :global(.chip.active) {
    background: rgba(193, 68, 14, 0.18);
    border-color: rgba(193, 68, 14, 0.7);
    color: #ffb799;
  }
  /* Drop hud-controls below the detail panel on mobile so the panel
     can fully cover its background; on desktop hud-controls stay above. */
  @media (max-width: 768px) {
    .hud-controls {
      z-index: 25;
    }
    /* Chip rail wraps as soon as we leave desktop. Was gated on 500 px
       which only kicked in for phone-narrow widths — anyone resizing a
       desktop browser between 501–768 still saw the vertical column. */
    .ctrl-row.chips {
      flex-direction: row;
      flex-wrap: wrap;
      width: auto;
      max-width: calc(100vw - 24px);
      align-items: center;
    }
  }

  @media (max-width: 500px) {
    .hud-controls {
      left: 8px;
      gap: 6px;
    }
    .hud-controls :global(.toggle) {
      padding: 3px 5px;
      font-size: 9px;
      max-width: 54px;
      min-height: 32px;
    }
    .hud-controls :global(.chip) {
      padding: 0 6px;
      font-size: 8.5px;
      min-width: 78px;
      min-height: 28px;
    }
  }

  .altitude-indicator {
    position: absolute;
    right: 12px;
    bottom: 56px;
    z-index: 5;
    pointer-events: none;
    padding: 4px 10px;
    background: rgba(8, 10, 22, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    backdrop-filter: blur(4px);
  }
  .legend-3d {
    position: fixed;
    bottom: 14px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 16px;
    padding: 8px 14px;
    background: rgba(8, 10, 22, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    backdrop-filter: blur(6px);
    z-index: 30;
  }
  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1.5px;
    color: rgba(255, 255, 255, 0.7);
  }
  .legend-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .load-failed {
    position: fixed;
    top: calc(var(--nav-height) + 12px);
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 14px;
    background: rgba(193, 68, 14, 0.15);
    border: 1px solid #c1440e;
    color: #ffb799;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    border-radius: 4px;
    z-index: 40;
  }

  /* Panel internals — :global because the .panel-tabs / .tab-btn DOM
     is rendered inside <PanelTabRow> which has its own scoped CSS. */
  :global(.panel-tabs) {
    display: flex;
    gap: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 12px;
  }
  :global(.tab-btn) {
    background: transparent;
    border: 0;
    padding: 8px 4px;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.45);
    cursor: pointer;
    border-bottom: 2px solid transparent;
  }
  :global(.tab-btn.active) {
    color: #fff;
    border-bottom-color: #c1440e;
  }
  .panel-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .badge {
    padding: 3px 8px;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1.5px;
    border-radius: 3px;
    text-transform: uppercase;
  }
  .badge.agency {
    color: #fff;
  }
  .badge.status {
    background: transparent;
    border: 1px solid;
  }
  .badge.kind {
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.7);
  }
  .mission-type {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1.5px;
    color: rgba(255, 255, 255, 0.65);
    margin: 0;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 4px 12px;
    margin: 0;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
  }
  .meta-grid dt {
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 1px;
    text-transform: uppercase;
    font-size: 9px;
  }
  .meta-grid dd {
    margin: 0;
    color: rgba(255, 255, 255, 0.85);
  }
  .fact {
    font-family: 'Crimson Pro', serif;
    font-size: 14px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.85);
    margin: 0;
  }
  .capability {
    font-family: 'Crimson Pro', serif;
    font-size: 13px;
    color: rgba(255, 200, 80, 0.88);
    border-left: 2px solid rgba(255, 200, 80, 0.45);
    padding-left: 10px;
    margin: 0;
  }
  .mission-link {
    align-self: flex-start;
    padding: 6px 10px;
    background: rgba(68, 102, 255, 0.18);
    border: 1px solid rgba(68, 102, 255, 0.55);
    color: #fff;
    text-decoration: none;
    border-radius: 3px;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    font-weight: 700;
    transition: all 0.15s;
  }
  .mission-link:hover,
  .mission-link:focus-visible {
    background: rgba(68, 102, 255, 0.32);
    border-color: #4466ff;
    outline: none;
  }
  .credit {
    font-family: 'Crimson Pro', serif;
    font-size: 11px;
    font-style: italic;
    color: rgba(255, 255, 255, 0.5);
    margin: 0;
  }
  .learn-tier {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    margin: 8px 0 4px;
  }
  .learn-tier.intro {
    color: var(--color-tier-intro);
  }
  .learn-tier.core {
    color: var(--color-tier-core);
  }
  .learn-tier.deep {
    color: var(--color-tier-deep);
  }
  .learn-links {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .learn-links li {
    padding: 4px 0;
  }
  /* `:global(a)` so the route-level styling reaches the anchor inside
     <LearnLink/> (whose CSS is scoped to that component). */
  .learn-links :global(a) {
    color: rgba(255, 255, 255, 0.85);
    text-decoration: none;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    border-bottom: 1px dotted rgba(255, 255, 255, 0.3);
  }
  .learn-links :global(a:hover),
  .learn-links :global(a:focus-visible) {
    color: #fff;
    border-bottom-color: #fff;
    outline: none;
  }

  /* GALLERY tab */
  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .gallery-thumb {
    background: transparent;
    border: 0;
    padding: 0;
    cursor: pointer;
    border-radius: 4px;
    overflow: hidden;
    aspect-ratio: 4 / 3;
  }
  .gallery-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 200ms;
  }
  .gallery-thumb:hover img,
  .gallery-thumb:focus-visible img {
    transform: scale(1.04);
  }
  .gallery-thumb:focus-visible {
    outline: 2px solid #c1440e;
    outline-offset: 2px;
  }
</style>
