<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { syncHotspotsModeUrl } from '$lib/surface-map/hotspots-url-sync';
  import { base } from '$app/paths';
  import * as THREE from 'three';
  import { createOutlinePassSetup } from '$lib/three/outline-pass-setup';
  import { createMarkerHalo } from '$lib/three/marker-halo';
  import { attachPickableHit } from '$lib/three/pickable-hit';
  import { disposeObject3d, disposeScene } from '$lib/three/dispose-object3d';
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
  import {
    buildTierContext,
    type TierContext,
    type TierLayer,
  } from '$lib/surface-map/tier-context';
  import { NATION_COLORS, colorFor, nationChipFor } from '$lib/surface-map/nation-palette';
  import { computeTierScale } from '$lib/surface-map/tier-scale';
  import { resolveInitialHotspotsMode, nextHotspotsMode } from '$lib/surface-map/hotspots-mode';
  import { groupLinksByTier, siteHasLinks } from '$lib/surface-map/link-tiers';
  import type { PanelTab } from '$lib/surface-map/panel-tabs';
  import { createStoryAutopromoteTracker } from '$lib/surface-map/story-autopromote';
  import { buildSurfacePanelTabs } from '$lib/surface-map/build-panel-tabs';
  import { drawNationLegend2d } from '$lib/surface-map/draw-nation-legend-2d';
  import { loadPanelData } from '$lib/surface-map/load-panel-data';
  import { type SiteStory } from '$lib/data';
  import { localeFromPage } from '$lib/locale';
  import { onReducedMotionChange } from '$lib/reduced-motion';
  import { latLonToUnitSphere } from '$lib/moon-projection';
  import {
    createHotspotEntry,
    getHotspotMode,
    getHotspotModelBuilder,
    setHotspotMode,
    updateHotspotLOD,
    type HotspotEntry,
    type HotspotMode,
  } from '$lib/hotspot-lod-dispatcher';
  import { createSurfaceDebugInfo, type SurfaceDebugInfo } from '$lib/surface-scene/debug-info';
  import type { SurfaceSceneConfig } from '$lib/surface-scene/types';
  import { buildHotspotSurfacePatch } from '$lib/hotspot-surface-patch';
  import {
    createSkybox,
    teardownPanoramaSkybox,
    type SkyboxHandle,
  } from '$lib/hotspot-tier3-skybox';
  import { loadImageVisionManifest, getImageEntry, pickVariant } from '$lib/image-vision';
  import { buildLabel } from '$lib/three-label';
  import type { SurfaceSite, Traverse } from '$types/surface-site';
  import Panel from '$lib/components/Panel.svelte';
  import SiteStoryPanel from '$lib/components/SiteStoryPanel.svelte';
  import ScienceChip from '$lib/components/ScienceChip.svelte';
  import WhyPopover from '$lib/components/WhyPopover.svelte';
  import ScienceLayersPanel from '$lib/components/ScienceLayersPanel.svelte';
  import { onLayerChange } from '$lib/science-layers';
  import * as m from '$lib/paraglide/messages';
  import { panelGalleryCredit } from '$lib/image-credits';
  import LearnLink from '$lib/components/LearnLink.svelte';

  // ─── Props (planet-specific config + data loaders) ────────────────
  // The component is generic over body; per-planet behaviour comes in
  // via `config` (textureUrl, atmosphere?, axialTiltDeg, etc.). The
  // route owns the data fetchers (`loadSites`, `loadGallery`) because
  // they import the body-specific JSON catalogue. See ADR-072 +
  // src/lib/surface-scene/README.md for the contract.
  interface Props {
    config: SurfaceSceneConfig;
    loadSites: (locale: string) => Promise<SurfaceSite[]>;
    loadGallery: (siteId: string, missionIdFallback?: string) => Promise<string[]>;
    /** Vendored rover-traverse data, keyed by rover_id. When provided,
     *  SurfaceScene renders traverse polylines + end-of-track captions
     *  and shows the TRAVERSES layer chip. Mars passes a function that
     *  Promise.all's getMarsTraverse for each known rover; Moon omits
     *  this prop today (Apollo/Lunokhod paths future). */
    loadTraverses?: () => Promise<Record<string, Traverse>>;
  }
  let { config, loadSites, loadGallery, loadTraverses }: Props = $props();

  // ─── Nation palette (per IA §shared-tokens) ──────────────────────
  // Mirrors the agency tokens in `src/lib/styles/tokens.css` where the
  // mapping is 1:1 (USA→nasa, China→cnsa, India→isro, Russia→roscosmos,
  // Japan→jaxa). USSR + Russia share a single legend entry/colour
  // because Roscosmos is the legal/programmatic continuation of the
  // Soviet space programme (Roscosmos was founded in 1992 from the
  // Soviet ministry's lunar/Mars assets); their landers belong to the
  // same lineage on a moon map. Inline (not from --color-*) because
  // the 2D canvas legend can't read CSS custom properties cheaply.
  // NATION_COLORS + nationKey extracted to $lib/surface-map/nation-palette.ts (#42).

  let view: '3d' | '2d' = $state('3d');
  let container: HTMLDivElement | undefined = $state();
  let canvas2d: HTMLCanvasElement | undefined = $state();
  let sites: SurfaceSite[] = $state([]);
  let loadFailed = $state(false);
  let selected: SurfaceSite | null = $state(null);
  let panelOpen = $state(false);
  let cleanup: (() => void) | undefined;

  // Layer toggles. SURFACE = lander/rover markers; ORBITERS = dots
  // on inclined rings around the Moon (LRO, Clementine, Chandrayaan-1,
  // Chang'e 1/2, SMART-1, Lunar Prospector, Luna 10). Both default-on.
  let layerSurface = $state(true);
  let layerOrbiters = $state(true);
  let layerOrbits = $state(true);
  // TRAVERSES chip — visible only when route passes loadTraverses
  // (rover-path data exists for this body). Defaults on.
  let layerTraverses = $state(true);
  let autoSpin = $state(true);
  let resetCamera: () => void = () => {};

  // Live altitude readout (km above surface), driven by the camera-distance
  // ↔ km-per-unit ratio. Surfaced in the corner HUD as "how zoomed am
  // I" feedback. ADR-072 §Drift 16 — was Mars-only, now both bodies.
  let altitudeKm = $state(0);

  // Vendored rover-traverse data, populated from the loadTraverses()
  // prop in onMount. Empty record when the route doesn't pass that prop
  // (Moon today). Keyed by rover_id.
  let traverses: Record<string, Traverse> = $state({});

  // Surface Hotspots mode (PRD-014 / RFC-017 §S7). 'auto' = LOD
  // dispatcher picks tier from screen-projected size; 'low' = all
  // sites pinned to Tier 0 silhouette; 'high' = all sites pinned
  // to their hotspot_tier_max. Initial value resolves from the
  // ?hotspots= URL param if present, else falls back to LOW under
  // reduced-motion or saveData, else AUTO.
  let hotspotsMode: HotspotMode = $state('auto');

  /**
   * Tier 3 panorama state (Phase 6 / #118). Only the currently
   * "stood at" site has an active skybox; only one panorama is
   * active at a time. Per RFC-017 §ADR-061, the skybox is created
   * lazily on first activation and disposed when the user exits.
   */
  let panoramaActive = $state(false);
  let panoramaSkybox: SkyboxHandle | null = null;
  // Reactive function pointers — assigned inside onMount once the
  // scene + camera closures exist. $state ensures Svelte re-renders
  // the template handlers when the pointers are updated.
  let enterPanorama: (textureUrl: string, siteId: string) => void = $state(() => {});
  let exitPanorama: () => void = $state(() => {});

  // resolveInitialHotspotsMode + nextHotspotsMode extracted to
  // $lib/surface-map/hotspots-mode.ts (#42).
  const cycleHotspotsMode = () => (hotspotsMode = nextHotspotsMode(hotspotsMode));

  // Resolve initial mode once on mount (needs window for
  // matchMedia + navigator.connection). Subsequent changes go
  // through cycleHotspotsMode + the $effect below.
  onMount(() => {
    hotspotsMode = resolveInitialHotspotsMode($page.url);
    showDebug = $page.url.searchParams.get('debug') === '1';
    // Sidecar fetch probe — fills the overlay's sidecarStatus.
    fetch('/data/surface-hotspots.json')
      .then((r) => r.json())
      .then((d) => {
        debugInfo.sidecarStatus = `ok ${Object.keys(d.entries || {}).length} entries · apollo11 tier ${d.entries?.apollo11?.hotspot_tier_max ?? '?'}`;
      })
      .catch((e) => {
        debugInfo.sidecarStatus = `FAIL ${(e as Error).message}`;
      });
  });

  // Reactive: sync mode → dispatcher + URL.
  $effect(() => {
    setHotspotMode(hotspotsMode);
    syncHotspotsModeUrl($page.url, hotspotsMode);
  });

  // colorFor + computeTierScale extracted to $lib/surface-map/* (#42).

  // Debug overlay state — ?debug=1 surfaces dispatcher internals.
  // Shape + defaults extracted to $lib/surface-scene/debug-info.ts
  // so /moon and /mars share a single source of truth (issue #283).
  let debugInfo: SurfaceDebugInfo = $state(createSurfaceDebugInfo());
  let showDebug = $state(false);

  /**
   * Contextual info card state (PRD-014 §v0.7.x + RFC-017 §OQ-12).
   * Mirrors /mars's TierContext: when the camera is in the Tier 2
   * zoom band on a hotspot, the card surfaces (a) site context —
   * name, agency, brief mission tagline — and (b) the dominant
   * imagery layer's source + attribution + resolution. Two-layer
   * composition (regional + detail) stacks both attribution rows.
   */
  let tierContext = $state<TierContext | null>(null);

  /**
   * Nation chip label + colour for the info card's site header.
   * Same shape as /mars's nationChipFor — Moon includes USSR (Luna)
   * which collapses with Russia for the chip (Roscosmos is the
   * programmatic continuation of the Soviet space programme).
   */
  // nationChipFor extracted to $lib/surface-map/nation-palette.ts (#42).

  /**
   * Compact mission-context tagline: "Apollo 11 crewed lander ·
   * landed 1969-07-20" — feeds the info card's second line.
   */
  // missionContextFor extracted to $lib/surface-map/site-formatters.ts (#42).

  // Auto-switch OVERVIEW → STORY when tierContext flips on for the
  // first time on a site. Same rule as /mars: only when (a) story
  // exists, (b) user hasn't picked a different tab manually,
  // (c) we haven't already auto-switched for THIS site.
  const storyAutopromote = createStoryAutopromoteTracker();
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

  // ─── Detail-panel tabs (v0.1.10) ─────────────────────────────────
  let panelTab: PanelTab = $state('overview');
  let panelGallery: string[] = $state([]);
  let panelGalleryGrid = $derived(panelGallery.length <= 1 ? panelGallery : panelGallery.slice(1));
  let panelLightbox = $state<string | null>(null);
  let lastSelectedId = $state<string | null>(null);
  // #PE path-B: rich multi-agency narrative panel (the STORY tab).
  // Loaded from static/data/site-stories/<id>.json. Null when no
  // story file exists for this site → tab is hidden.
  let panelStory: SiteStory | null = $state(null);
  $effect(() => {
    if (selected && selected.id !== lastSelectedId) {
      panelTab = 'overview';
      panelLightbox = null;
      panelGallery = [];
      panelStory = null;
      lastSelectedId = selected.id;
      loadPanelData({
        siteId: selected.id,
        missionId: selected.mission_id,
        locale: localeFromPage($page),
        fetchGallery: loadGallery,
        isStillCurrent: () => selected != null && selected.id === lastSelectedId,
        onGallery: (urls) => (panelGallery = urls),
        onStory: (story) => (panelStory = story),
      });
    }
  });
  let panelLinksByTier = $derived(
    groupLinksByTier<SurfaceSite['links'][number]>((selected as SurfaceSite | null)?.links),
  );
  let panelHasLinks = $derived(siteHasLinks(selected as SurfaceSite | null));

  // `face: true` is set by the URL-deep-link path so the moon rotates
  // to bring the selected site to camera-facing (otherwise the
  // halo + panel open but the site itself can be on the far side,
  // hidden until the user manually drags the moon — issue #227).
  // Click handlers don't pass `face` so picking a marker on screen
  // doesn't lurch the camera off whatever the user was looking at.
  let faceCameraAtSite: ((site: SurfaceSite) => void) | undefined;
  function selectSite(id: string, options: { face?: boolean } = {}) {
    const s = sites.find((x) => x.id === id);
    if (s) {
      selected = s;
      panelOpen = true;
      if (options.face) faceCameraAtSite?.(s);
    }
  }
  function toggleView() {
    view = view === '3d' ? '2d' : '3d';
  }

  // ─── Traverse helpers (Mars today; Moon EVA/Lunokhod future) ──────
  // Body-agnostic great-circle distance via config.radiusKm. Used to
  // surface "N km traversed" on the end-of-track caption + info card.
  function greatCircleKm(a: [number, number], b: [number, number]): number {
    const R = config.radiusKm;
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
    for (let i = 1; i < points.length; i++) total += greatCircleKm(points[i - 1], points[i]);
    return total;
  }

  /** Whole-day count between two ISO dates (or ISO + Date). */
  function daysBetween(startIso: string, endIso: string): number {
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
    return Math.floor((end - start) / (1000 * 60 * 60 * 24));
  }

  // Site canvas positions for 2D hit-testing.
  const sitePos2d = new Map<string, { x: number; y: number }>();

  onMount(() => {
    if (!container || !canvas2d) return;

    loadSites(localeFromPage($page))
      .then((list) => {
        sites = list;
        // Deep-link: ?site=<id> opens the panel pre-selected. The
        // `face: true` flag also rotates the moon so the site faces
        // the camera (issue #227) — otherwise the halo opens but the
        // site itself can be on the far side, invisible until the
        // user manually drags.
        const siteParam = $page.url.searchParams.get('site');
        if (siteParam) selectSite(siteParam, { face: true });
      })
      .catch((err) => {
        console.error('Failed to load moon sites:', err);
        loadFailed = true;
      });

    // ──────────────────────────────────────────────────────────────
    // 3D — Moon sphere with surface texture
    // ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    // Near plane 0.05 (consolidation per ADR-072 §Drift 1 — was 0.5 on
    // Moon, 0.05 on Mars; Mars's value allows closer Tier-2 zoom).
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.05,
      400,
    );
    const renderer = createSceneRenderer(container);

    // EffectComposer for hover-outline (mirrors /iss + /mars pattern).
    const { composer, outlinePass } = createOutlinePassSetup({
      renderer,
      scene,
      camera,
      width: container.clientWidth,
      height: container.clientHeight,
    });

    // Ambient tint hints at body palette (slight blue for Moon, slight
    // red for Mars). Intensity consolidated to 0.8 per ADR-072 §Drift 5.
    addSurfaceLights({ scene, ambientColor: config.ambientColor, ambientIntensity: 0.8 });

    scene.add(createStarField());

    const textureLoader = new THREE.TextureLoader();
    const planetMap = textureLoader.load(config.textureUrl);
    const planetRadius = 30;
    // Axial-tilt group wraps the planet mesh so Mars's 25.19° obliquity
    // is visible (no-op rotation for Moon's ~0°). Orbital markers
    // attach to scene (NOT planetAxis) per ADR-072 §Drift 22 — orbits
    // are inertial, they don't inherit the planet's tilt.
    const planetAxis = new THREE.Group();
    planetAxis.rotation.z = (config.axialTiltDeg * Math.PI) / 180;
    scene.add(planetAxis);
    const planetMesh = new THREE.Mesh(
      new THREE.SphereGeometry(planetRadius, 64, 64),
      new THREE.MeshPhongMaterial({ map: planetMap, color: 0xffffff, shininess: 4 }),
    );
    planetAxis.add(planetMesh);

    // Body-specific atmosphere shell (Mars: thin CO₂; Moon: vacuum,
    // skip the block). Toggled via the Science Lens 'atmosphere' layer.
    let _stopAtmosphereLayer: (() => void) | undefined;
    if (config.atmosphere) {
      const atm = config.atmosphere;
      // Scene scale: planetRadius=30 → real = config.radiusKm,
      // so 1 unit ≈ radiusKm/30 km. Shell radius scales with altitudeKm.
      const kmPerUnit = config.radiusKm / planetRadius;
      const shellR = planetRadius + atm.altitudeKm / kmPerUnit;
      const atmShell = new THREE.Mesh(
        new THREE.SphereGeometry(shellR, 48, 48),
        new THREE.MeshBasicMaterial({
          color: atm.color,
          transparent: true,
          opacity: atm.meshOpacity,
          side: THREE.BackSide,
          depthWrite: false,
        }),
      );
      const atmRing = new THREE.Mesh(
        new THREE.RingGeometry(shellR * 0.999, shellR * 1.002, 64),
        new THREE.MeshBasicMaterial({
          color: atm.color,
          transparent: true,
          opacity: atm.ringOpacity,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      atmRing.rotation.x = Math.PI / 2;
      atmShell.userData.layerKey = 'atmosphere';
      atmRing.userData.layerKey = 'atmosphere';
      atmShell.visible = false;
      atmRing.visible = false;
      scene.add(atmShell);
      scene.add(atmRing);
      _stopAtmosphereLayer = onLayerChange('atmosphere', (on) => {
        atmShell.visible = on;
        atmRing.visible = on;
      });
    }

    // Issue #227 — `faceCameraAtSite(site)` rotates the moon mesh so
    // the site sits on the +Z hemisphere (camera-facing), and stops
    // autoSpin so the site stays put while the user reads the
    // panel. Only invoked from the URL deep-link path; ordinary
    // click selection doesn't trigger it (would feel jarring to
    // have the moon lurch under the user's cursor). Latitude isn't
    // adjusted — handling that would require moving the camera or
    // tilting the moon, both heavier changes; the longitude flip
    // alone covers the "site is on the far side" cases that
    // motivated the issue.
    faceCameraAtSite = (site: SurfaceSite) => {
      if (site.lat == null || site.lon == null) return;
      const { x, z } = latLonToUnitSphere(site.lat, site.lon);
      // Atan2(x, z) returns the longitude angle of the marker in
      // local frame; negate to rotate that angle TO +Z (the
      // default camera-facing axis).
      planetMesh.rotation.y = -Math.atan2(x, z);
      autoSpin = false;
    };

    // J.4 — Tidal-lock indicator. The Moon is in 1:1 synchronous
    // rotation with Earth, so one hemisphere (the "near side") always
    // faces Earth. We mark that hemisphere with a faint teal tint that
    // PARENTS to planetMesh — so when the user rotates the Moon (autoSpin
    // or drag), the marker rotates with the body, demonstrating that
    // a fixed lunar hemisphere is what stays Earth-facing in real life
    // (the Moon ISN'T idle in this view — autoSpin is purely visual).
    // Convention: lunar longitude 0 is +X in scene; near-side spans
    // -90° to +90° (i.e. +X half-sphere).
    // Body-specific tidal-lock overlay (Moon only — Mars rotates freely
    // and has no analog of "near side"). Per ADR-072 / config.tidalLockOverlay.
    let _stopTidalLockLayer: (() => void) | undefined;
    if (config.tidalLockOverlay) {
      const tl = config.tidalLockOverlay;
      const nearSideGeo = new THREE.SphereGeometry(
        planetRadius * 1.005,
        48,
        32,
        -Math.PI / 2,
        Math.PI, // half-sphere: π radians of azimuth = +X hemisphere
      );
      const nearSideOverlay = new THREE.Mesh(
        nearSideGeo,
        new THREE.MeshBasicMaterial({
          color: tl.color,
          transparent: true,
          opacity: tl.opacity,
          side: THREE.FrontSide,
          depthWrite: false,
        }),
      );
      nearSideOverlay.userData.layerKey = 'tidal-lock';
      nearSideOverlay.visible = false;
      planetMesh.add(nearSideOverlay);
      _stopTidalLockLayer = onLayerChange('tidal-lock', (on) => {
        nearSideOverlay.visible = on;
      });
    }

    // Site markers — per-category geometry, anchored on the surface,
    // parented to planetMesh so they rotate with the sphere (post-v0.1.0
    // fix: previously markers floated in scene-space while the moon
    // spun underneath, breaking spatial reference). Markers are
    // tangent-aligned via lookAt(origin) so they "stand up" from the
    // surface instead of pointing along world axes.
    type MarkerObj = {
      group: THREE.Group;
      siteId: string;
      halo?: THREE.Mesh;
      labelGroup?: THREE.Group;
    };
    const markers: MarkerObj[] = [];

    // ─── Traverses (Mars rover paths today, Moon EVA paths future) ───
    type TraverseLine = {
      line: THREE.Line;
      startDot: THREE.Mesh;
      endDot: THREE.Mesh;
      roverId: string;
      isActive: boolean;
      startLabel?: THREE.Group;
      endLabel?: THREE.Group;
      startLabelTexture?: THREE.Texture;
      endLabelTexture?: THREE.Texture;
    };
    const traverseLines: TraverseLine[] = [];
    // Tier-2 delayed-reveal stack — entries fade in past the Tier-2
    // promotion threshold (camR < detailFadeStart). Lines + dots +
    // captions go in here so they ramp opacity in lockstep with the
    // hotspot detail patches.
    const tier2DelayedReveal: Array<THREE.Line | THREE.Mesh | THREE.Sprite | THREE.Group> = [];

    function buildTraverseCaption(
      text: string,
      color: string,
      worldSize: number,
    ): { group: THREE.Group; texture: THREE.Texture } {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 96;
      const ctx2 = canvas.getContext('2d');
      if (ctx2) {
        ctx2.fillStyle = 'rgba(8, 10, 22, 0.72)';
        const radius = 12;
        const w = canvas.width;
        const h = canvas.height;
        const inset = 6;
        ctx2.beginPath();
        ctx2.moveTo(inset + radius, inset);
        ctx2.arcTo(w - inset, inset, w - inset, inset + radius, radius);
        ctx2.arcTo(w - inset, h - inset, w - inset - radius, h - inset, radius);
        ctx2.arcTo(inset, h - inset, inset, h - inset - radius, radius);
        ctx2.arcTo(inset, inset, inset + radius, inset, radius);
        ctx2.closePath();
        ctx2.fill();
        ctx2.font = "bold 38px 'Space Mono', monospace";
        ctx2.textAlign = 'center';
        ctx2.textBaseline = 'middle';
        ctx2.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx2.shadowBlur = 4;
        ctx2.fillStyle = color;
        ctx2.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2);
      }
      const texture = new THREE.Texture(canvas);
      texture.needsUpdate = true;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(worldSize, worldSize * (96 / 512), 1);
      const group = new THREE.Group();
      group.add(sprite);
      return { group, texture };
    }

    function rebuildTraverses() {
      if (loadTraverses == null) return;
      for (const tl of traverseLines) {
        disposeObject3d(tl.line);
        planetMesh.remove(tl.line);
        disposeObject3d(tl.endDot);
        planetMesh.remove(tl.endDot);
        disposeObject3d(tl.startDot);
        planetMesh.remove(tl.startDot);
        if (tl.startLabel) {
          disposeObject3d(tl.startLabel);
          planetMesh.remove(tl.startLabel);
        }
        if (tl.endLabel) {
          disposeObject3d(tl.endLabel);
          planetMesh.remove(tl.endLabel);
        }
        tl.startLabelTexture?.dispose();
        tl.endLabelTexture?.dispose();
      }
      traverseLines.length = 0;
      for (const tr of Object.values(traverses)) {
        if (!tr.points || tr.points.length < 2) continue;
        // Prepend the rover's published landing lat/lon when the first
        // waypoint isn't already there (~60 m threshold) — keeps the
        // green patch-centre pin lined up with the polyline start.
        const trSite = sites.find((s) => s.id === tr.rover_id);
        const points = tr.points.slice();
        if (trSite?.lat != null && trSite?.lon != null) {
          const [firstLat, firstLon] = points[0];
          if (Math.abs(firstLat - trSite.lat) > 1e-3 || Math.abs(firstLon - trSite.lon) > 1e-3) {
            points.unshift([trSite.lat, trSite.lon]);
          }
        }
        const verts: number[] = [];
        const r = planetRadius + 0.05;
        for (const [lat, lon] of points) {
          const { x, y, z } = latLonToUnitSphere(lat, lon);
          verts.push(x * r, y * r, z * r);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
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
        planetMesh.add(line);
        tier2DelayedReveal.push(line);
        const TRAVERSE_END_ACTIVE_COLOR = 0xef4444;
        const TRAVERSE_END_FINISHED_COLOR = 0xf59e0b;
        const first = tr.points[0];
        const firstPos = latLonToUnitSphere(first[0], first[1]);
        const startDot = new THREE.Mesh(
          new THREE.BufferGeometry(),
          new THREE.MeshBasicMaterial({ visible: false }),
        );
        startDot.visible = false;
        startDot.position.set(firstPos.x * r, firstPos.y * r, firstPos.z * r);
        planetMesh.add(startDot);
        tier2DelayedReveal.push(startDot);
        const last = tr.points[tr.points.length - 1];
        const lastPos = latLonToUnitSphere(last[0], last[1]);
        const endDot = new THREE.Mesh(
          new THREE.SphereGeometry(0.022, 12, 12),
          new THREE.MeshBasicMaterial({
            color: isActive ? TRAVERSE_END_ACTIVE_COLOR : TRAVERSE_END_FINISHED_COLOR,
            transparent: true,
            opacity: 0.95,
            depthWrite: false,
          }),
        );
        endDot.position.set(lastPos.x * r, lastPos.y * r, lastPos.z * r);
        planetMesh.add(endDot);
        tier2DelayedReveal.push(endDot);
        // Captions along path tangent, offset away from each other
        // so labels don't overlap the dots or the line.
        const startPosWorld = new THREE.Vector3(firstPos.x * r, firstPos.y * r, firstPos.z * r);
        const endPosWorld = new THREE.Vector3(lastPos.x * r, lastPos.y * r, lastPos.z * r);
        const tangent = new THREE.Vector3().subVectors(endPosWorld, startPosWorld).normalize();
        const TANGENT_OFFSET = 0.025;
        const RADIAL_OFFSET = 0.03;
        function placeCaption(at: THREE.Vector3, awayFromOther: THREE.Vector3): THREE.Vector3 {
          const out = at.clone().addScaledVector(awayFromOther, TANGENT_OFFSET);
          return out.normalize().multiplyScalar(r + RADIAL_OFFSET);
        }
        const startLabelText = site?.landing_date ? `LANDED ${site.landing_date}` : 'LANDING SITE';
        const startBuilt = buildTraverseCaption(startLabelText, '#22c55e', 0.32);
        startBuilt.group.position.copy(placeCaption(startPosWorld, tangent.clone().negate()));
        planetMesh.add(startBuilt.group);
        tier2DelayedReveal.push(startBuilt.group);
        const pathKm = traversePathKm(tr.points);
        const endIso = isActive ? new Date().toISOString() : tr.snapshot_date;
        const days = site?.landing_date ? daysBetween(site.landing_date, endIso) : 0;
        const kmText = pathKm >= 100 ? pathKm.toFixed(0) : pathKm.toFixed(1);
        const endLabelText = isActive
          ? `${kmText} KM · DAY ${days.toLocaleString()}`
          : `${kmText} KM · ${days.toLocaleString()} D`;
        const endBuilt = buildTraverseCaption(endLabelText, isActive ? '#ef4444' : '#f59e0b', 0.34);
        endBuilt.group.position.copy(placeCaption(endPosWorld, tangent));
        planetMesh.add(endBuilt.group);
        tier2DelayedReveal.push(endBuilt.group);
        traverseLines.push({
          line,
          startDot,
          endDot,
          roverId: tr.rover_id,
          isActive,
          startLabel: startBuilt.group,
          endLabel: endBuilt.group,
          startLabelTexture: startBuilt.texture,
          endLabelTexture: endBuilt.texture,
        });
      }
    }

    // Initial traverse load + reactive rebuild on data change.
    if (loadTraverses != null && loadTraverses) {
      loadTraverses().then((data) => {
        traverses = data;
        rebuildTraverses();
      });
    }

    // Surface Hotspots LOD dispatcher entries (PRD-014 / RFC-017 S1
    // — Apollo 11 Tier 0+1 swap demo). One entry per site whose
    // surface-hotspots.json sidecar gives hotspot_tier_max >= 1.
    // updateHotspotLOD() in the RAF loop swaps Tier 0 silhouette for
    // a hand-authored engineering model when the marker's screen-
    // projected radius exceeds 20 px.
    const hotspots: HotspotEntry[] = [];
    // Selected-site clamp scaffolding (port of /mars). Remember each
    // hotspot's data-driven maxTier so the per-frame clamp can read
    // back the original cap. Selected site keeps full maxTier; others
    // collapse to ≤ Tier 1 so neighbouring discs don't fight.
    const originalMaxTier = new Map<string, 0 | 1 | 2 | 3>();
    // Register the Tier 1 builders for ids the dispatcher might need
    // to lazy-instantiate (bundled in $lib/surface-scene/ for shared
    // route plumbing — issue #283 Slice 2).
    config.registerHotspotBuilders();
    // Preload the Image Pipeline v2 manifest so Tier 2 patch URLs are
    // ready by the time the user zooms in. Soft-fails to an empty
    // manifest if the file isn't deployed yet — patches fall back to
    // the placeholder material.
    void loadImageVisionManifest();

    // Selection-halo helper — small flat ring around a marker so the
    // user can tell which one they picked. Visibility toggled by the
    // $effect tied to `selected`.
    // Per-mission surface markers come from `moon-lander-models.ts`,
    // mirroring the `earth-satellite-models.ts` pattern: each known
    // mission id gets a recognisable silhouette built from primitives
    // (Apollo LM descent stage, Lunokhod bathtub-on-wheels, Chang'e
    // hex bus, SLIM nose-down, Vikram + Pragyan pair, etc.), with
    // category-based fallbacks for ids without a dedicated builder.

    // Orbital ring + dot rendering (lunar orbiters — LRO, Clementine,
    // etc.). Mirrors the /mars pattern from PRD-009 / RFC-012 OQ-7.
    // Parented to scene rather than planetMesh so the dots don't
    // co-rotate with the Moon's tidally-locked-Earth-facing rotation —
    // orbiters track an inertial frame.
    const orbitalMarkers: OrbiterMarker[] = [];

    function rebuildOrbitalMarkers() {
      for (const om of orbitalMarkers) {
        disposeObject3d(om.group);
        scene.remove(om.group);
      }
      orbitalMarkers.length = 0;
      let phase = 0;
      for (const site of sites) {
        if (site.kind !== 'orbiter') continue;
        if (site.altitude_km == null || site.inclination_deg == null) continue;
        const color = colorFor(site);
        // Lunar orbital altitudes range from ~50 km (LRO) to ~470 km
        // (SMART-1). Compress with log scale so all rings fit cleanly
        // around the 30u Moon sphere without overlapping.
        const ringRadius = planetRadius + 4 + Math.log10(1 + site.altitude_km / 50) * 5;
        const dimmed = site.status !== 'ACTIVE';
        const marker = buildOrbiterGroup({
          site,
          color,
          ringRadius,
          inclinationRad: (site.inclination_deg * Math.PI) / 180,
          dimmed,
          orbitPhase: phase,
        });
        scene.add(marker.group);
        orbitalMarkers.push(marker);
        phase += Math.PI / 5;
      }
    }

    function rebuildMarkers() {
      for (const mk of markers) {
        disposeObject3d(mk.group);
        planetMesh.remove(mk.group);
      }
      markers.length = 0;
      hotspots.length = 0;
      for (const site of sites) {
        // Skip orbiter entries — they go through rebuildOrbitalMarkers.
        if (site.kind === 'orbiter') continue;
        // Orbiter entries (kind:'orbiter') are filtered out at fetch
        // time on this route, but TS doesn't know that — guard so
        // surface-only positioning math doesn't deal with undefined.
        if (site.lat == null || site.lon == null) continue;
        const { x, y, z } = latLonToUnitSphere(site.lat, site.lon);
        const r = planetRadius;
        // Wrapper group — positions + orients the entire marker on
        // the planet surface. Contains the Tier 0 silhouette sub-group
        // (always present), plus any lazy-built Tier 1+ sub-groups
        // added by the hotspot LOD dispatcher, plus hit sphere + label
        // + halo as siblings.
        const group = new THREE.Group();
        const tier0Group = config.landerModelBuilder(site.id, site.mission_type, colorFor(site));
        group.add(tier0Group);
        // Anchor on the surface; orient the group so +Y points away from
        // Moon centre (radially outward), so cone-style markers stand up.
        placeOnSphereTangent(group, { x, y, z }, r);
        attachPickableHit({ dotGroup: group, siteId: site.id });
        // Label with leader line, floating radially outward (along the
        // group's local +Y, which is surface-normal away from Moon
        // centre after the tangent-orient quat above).
        const label = buildLabel({
          text: site.name ?? site.id,
          color: colorFor(site),
          offset: new THREE.Vector3(0, 3.2, 0),
          size: 1.6,
        });
        group.add(label.group);

        // Selection halo (visible only while site === selected).
        const halo = createMarkerHalo(colorFor(site), 1.8, { lay: true });
        group.add(halo);

        // Surface Hotspot LOD enrolment (PRD-014 / RFC-017 S1).
        // Sites whose surface-hotspots.json sidecar gives
        // hotspot_tier_max >= 1 + a known hotspot_model id get a
        // dispatcher entry. The Tier 1 mesh is built lazily on first
        // promotion (when the user zooms in past the 20-px screen-
        // radius threshold) and added as a sibling of tier0Group
        // inside the wrapper.
        const maxTier = (site.hotspot_tier_max ?? 0) as 0 | 1 | 2 | 3;
        const builderId = site.hotspot_model;
        if (maxTier >= 1 && builderId) {
          const builder = getHotspotModelBuilder(builderId);
          if (builder) {
            const accent = colorFor(site);
            const tier2Source = site.hotspot_tier2_source;
            const tier2RegionalSource = site.hotspot_tier2_regional_source;
            // Tier 2 builder is wired only when the site declares a
            // tier2 source path. Texture URL is resolved against the
            // image-vision.json manifest (lazy 1:1 variant lookup);
            // if the manifest doesn't have an entry yet, fall back
            // to the raw 2048² JPEG at the sidecar's hotspot_tier2_source
            // path — soft-fail keeps Tier 2 visible during development
            // (same pattern as /mars).
            const annotations = site.hotspot_annotations;
            const tier2Builder =
              maxTier >= 2 && tier2Source
                ? () => {
                    const entry = getImageEntry(tier2Source);
                    const textureUrl =
                      (entry ? pickVariant(entry, 'thumbnail', false) : undefined) ?? tier2Source;
                    // Same resolution chain for the regional layer
                    // (Chang'e 2 mosaic or LROC WAC placeholder when
                    // wired; undefined today on /moon — patch builder
                    // skips the regional disc cleanly).
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
            const entry = createHotspotEntry({
              siteId: site.id,
              maxTier,
              group,
              tier0Group,
              tier1Builder: () => builder(accent),
              tier2Builder,
            });
            // Eager-build the tier2 patch when one is configured so
            // the camR-based opacity ramp has something to fade in
            // even before the dispatcher's Tier 2 promotion threshold
            // (projected radius >= 120 px ≈ camR ~38) fires. Without
            // this, the patch can only start to materialize once the
            // dispatcher decides we've earned Tier 2 — too late for
            // the user-expected "fade starts at camR ~50" smoothness.
            if (tier2Builder) {
              entry.tier2Group = tier2Builder();
              entry.tier2Group.visible = false;
              group.add(entry.tier2Group);
            }
            hotspots.push(entry);
            originalMaxTier.set(site.id, maxTier);
          }
        }

        planetMesh.add(group);
        markers.push({ group, siteId: site.id, halo, labelGroup: label.group });
      }
    }

    // Camera + controls.
    // Initial camR=85 (consolidation per ADR-072 §Drift 2 — was 80
    // Moon / 90 Mars). Initial camP=45° (Drift 3 — was π/2 Moon /
    // 45° Mars; Mars's angled view is more inviting).
    let camR = 85;
    let camP = Math.PI / 4;
    let camT = 0;
    const camR0 = camR;
    const camP0 = camP;
    const camT0 = camT;
    const updateCam = () => {
      camera.position.set(
        camR * Math.sin(camP) * Math.sin(camT),
        camR * Math.cos(camP),
        camR * Math.sin(camP) * Math.cos(camT),
      );
      camera.lookAt(0, 0, 0);
    };
    updateCam();
    resetCamera = () => {
      camR = camR0;
      camP = camP0;
      camT = camT0;
      updateCam();
    };

    // Phase 6 (#118) — panorama enter/exit hooks. Closure over
    // planetMesh + camR + scene; exposed to the route's outer state
    // via the enterPanorama / exitPanorama function pointers.
    let savedCamR = camR;
    enterPanorama = (textureUrl: string, siteId: string) => {
      if (panoramaActive) return;
      // saveData users get a heads-up affordance handled outside; if
      // we reach here, the user explicitly opted in.
      panoramaSkybox = createSkybox({ textureUrl, siteId });
      scene.add(panoramaSkybox.group);
      panoramaSkybox.activate();
      planetMesh.visible = false;
      savedCamR = camR;
      // Move camera close to origin so the user's drag-to-rotate
      // feels like spinning their head inside the skybox.
      camR = 0.5;
      updateCam();
      panoramaActive = true;
    };
    exitPanorama = () => {
      if (!panoramaActive) return;
      panoramaActive = false;
      teardownPanoramaSkybox(panoramaSkybox);
      panoramaSkybox = null;
      planetMesh.visible = true;
      camR = savedCamR;
      updateCam();
    };
    const stopPanoramaEscape = bindPanoramaEscape({
      isActive: () => panoramaActive,
      onExit: () => exitPanorama(),
    });

    const el3d = renderer.domElement;
    let isDrag = false;
    let lmx = 0;
    let lmy = 0;
    let dragMoved = false;
    let downX = 0;
    let downY = 0;

    const ray = new THREE.Raycaster();
    function pickSiteAt(clientX: number, clientY: number): string | null {
      const rect = el3d.getBoundingClientRect();
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const targets: THREE.Object3D[] = [];
      if (layerSurface) for (const mk of markers) targets.push(mk.group);
      if (layerOrbiters) for (const om of orbitalMarkers) targets.push(om.dotGroup);
      const hits = ray.intersectObjects(targets, true);
      const hit = hits.find((h) => typeof h.object.userData.siteId === 'string');
      return hit ? (hit.object.userData.siteId as string) : null;
    }

    function tryPick3d(clientX: number, clientY: number) {
      const id = pickSiteAt(clientX, clientY);
      if (id) selectSite(id);
    }

    let hoveredSiteId: string | null = null;
    const onHover = (e: MouseEvent) => {
      if (isDrag) return;
      hoveredSiteId = pickSiteAt(e.clientX, e.clientY);
    };
    const onHoverLeave = () => {
      hoveredSiteId = null;
    };

    const onMouseDown = (e: MouseEvent) => {
      isDrag = true;
      dragMoved = false;
      lmx = e.clientX;
      lmy = e.clientY;
      downX = e.clientX;
      downY = e.clientY;
      el3d.style.cursor = 'grabbing';
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDrag) return;
      if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 4) dragMoved = true;
      camT -= (e.clientX - lmx) * 0.005;
      // Panorama-mode tilt clamp (±20° around horizon). Same shape
      // as /mars's panorama clamp: skybox padding tops/bottoms only
      // cover ~25° before exposing the sky band — ±20° keeps the
      // user inside published imagery on every site without per-site
      // bookkeeping. Outside panorama the existing near-poles clamp
      // applies.
      if (panoramaActive) {
        const tiltClamp = 0.349; // ≈ 20° in radians
        camP = Math.max(
          Math.PI / 2 - tiltClamp,
          Math.min(Math.PI / 2 + tiltClamp, camP + (e.clientY - lmy) * 0.005),
        );
      } else {
        camP = Math.max(0.05, Math.min(Math.PI - 0.05, camP + (e.clientY - lmy) * 0.005));
      }
      lmx = e.clientX;
      lmy = e.clientY;
      updateCam();
    };
    const onMouseUp = (e: MouseEvent) => {
      const wasDrag = dragMoved;
      isDrag = false;
      el3d.style.cursor = 'grab';
      if (!wasDrag && view === '3d') tryPick3d(e.clientX, e.clientY);
    };
    const onWheel = (e: WheelEvent) => {
      // preventDefault prevents trackpad pinch-zoom from triggering
      // browser-level zoom (Cmd-scroll). Registered with passive:false
      // below so this works (was passive:true → browser zoomed and
      // the moon stayed put).
      e.preventDefault();
      camR = Math.max(30.2, Math.min(200, camR + e.deltaY * 0.05));
      updateCam();
    };

    // Touch — single-finger orbit + two-finger pinch
    let touchActive = false;
    let touchMoved = false;
    let touchDownX = 0;
    let touchDownY = 0;
    let pinchPrev = 0;
    const tDist = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchActive = true;
        touchMoved = false;
        lmx = e.touches[0].clientX;
        lmy = e.touches[0].clientY;
        touchDownX = lmx;
        touchDownY = lmy;
      } else if (e.touches.length === 2) {
        touchActive = false;
        pinchPrev = tDist(e.touches[0], e.touches[1]);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchPrev > 0) {
        // Two-finger pinch — preventDefault so the browser doesn't
        // also do its native pinch-zoom on the page itself.
        e.preventDefault();
        const d = tDist(e.touches[0], e.touches[1]);
        camR = Math.max(30.2, Math.min(200, camR * (pinchPrev / d)));
        updateCam();
        pinchPrev = d;
        return;
      }
      if (!touchActive || e.touches.length !== 1) return;
      if (
        Math.abs(e.touches[0].clientX - touchDownX) + Math.abs(e.touches[0].clientY - touchDownY) >
        6
      )
        touchMoved = true;
      camT -= (e.touches[0].clientX - lmx) * 0.005;
      // Panorama-mode tilt clamp (±20°), same as the mouse path.
      if (panoramaActive) {
        const tiltClamp = 0.349;
        camP = Math.max(
          Math.PI / 2 - tiltClamp,
          Math.min(Math.PI / 2 + tiltClamp, camP + (e.touches[0].clientY - lmy) * 0.005),
        );
      } else {
        camP = Math.max(
          0.05,
          Math.min(Math.PI - 0.05, camP + (e.touches[0].clientY - lmy) * 0.005),
        );
      }
      lmx = e.touches[0].clientX;
      lmy = e.touches[0].clientY;
      updateCam();
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchPrev = 0;
      const wasMoved = touchMoved;
      const wasActive = touchActive;
      if (e.touches.length === 0) touchActive = false;
      if (
        wasActive &&
        !wasMoved &&
        view === '3d' &&
        e.changedTouches.length === 1 &&
        e.touches.length === 0
      ) {
        tryPick3d(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      }
    };

    el3d.style.cursor = 'grab';
    const stopCanvasInputs = bindCanvasInputs({
      el: el3d,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onWheel,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onHover,
      onHoverLeave,
    });

    // 2D context + lunar disc photos for the orthographic discs.
    // Loading async; until ready, draw2d falls back to the gradient.
    const c2 = canvas2d;
    const _maybeCtx = c2.getContext('2d');
    if (!_maybeCtx) throw new Error('2D context unavailable');
    const ctx2: CanvasRenderingContext2D = _maybeCtx;

    const moonNearImg = new Image();
    moonNearImg.src = `${base}/textures/moon_near.jpg`;
    const moonFarImg = new Image();
    moonFarImg.src = `${base}/textures/moon_far.jpg`;
    let nearReady = false;
    let farReady = false;
    moonNearImg.onload = () => {
      nearReady = true;
      if (view === '2d') draw2d();
    };
    moonFarImg.onload = () => {
      farReady = true;
      if (view === '2d') draw2d();
    };

    function draw2d() {
      // Defensive resize
      if (c2.width !== c2.clientWidth || c2.height !== c2.clientHeight) {
        c2.width = c2.clientWidth;
        c2.height = c2.clientHeight;
      }
      const W = c2.width;
      const H = c2.height;
      if (W === 0 || H === 0) return;

      ctx2.fillStyle = '#04040c';
      ctx2.fillRect(0, 0, W, H);

      // v0.1.8 — two side-by-side orthographic moon discs (near + far
      // side) instead of an equirectangular flat map. Each disc shows
      // the moon as a sphere viewed straight-on; sites project via
      // (sin lon · cos lat, -sin lat) and are visible when their
      // hemisphere is the one being shown.
      const stars = 80;
      for (let i = 0; i < stars; i++) {
        const sx = (i * 137.5 * 31 + i * 71) % W;
        const sy = (i * 137.5 * 17 + i * 53) % H;
        ctx2.beginPath();
        ctx2.arc(sx, sy, i % 8 === 0 ? 1.2 : 0.5, 0, Math.PI * 2);
        ctx2.fillStyle = `rgba(210,215,255,${0.06 + (i % 5) * 0.04})`;
        ctx2.fill();
      }

      const discR = Math.min(W * 0.2, H * 0.42);
      const yMid = H * 0.46;
      const nearCx = W * 0.27;
      const farCx = W * 0.73;

      const drawDisc = (
        cx: number,
        cy: number,
        labelText: string,
        labelColor: string,
        isFarSide: boolean,
      ) => {
        // Moon body — real photo of this hemisphere clipped to a circle
        // (v0.1.8). Falls back to grey gradient until images load.
        const img = isFarSide ? moonFarImg : moonNearImg;
        const ready = isFarSide ? farReady : nearReady;
        ctx2.save();
        ctx2.beginPath();
        ctx2.arc(cx, cy, discR, 0, Math.PI * 2);
        ctx2.clip();
        if (ready && img.naturalWidth > 0) {
          ctx2.drawImage(img, cx - discR, cy - discR, discR * 2, discR * 2);
        } else {
          const grad = ctx2.createRadialGradient(
            cx - discR * 0.25,
            cy - discR * 0.25,
            discR * 0.05,
            cx,
            cy,
            discR,
          );
          grad.addColorStop(0, '#cdcdc8');
          grad.addColorStop(0.6, '#7c7a76');
          grad.addColorStop(1, '#28272a');
          ctx2.fillStyle = grad;
          ctx2.fillRect(cx - discR, cy - discR, discR * 2, discR * 2);
        }
        ctx2.restore();

        // Limb shadow ring
        ctx2.beginPath();
        ctx2.arc(cx, cy, discR + 0.5, 0, Math.PI * 2);
        ctx2.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx2.lineWidth = 1;
        ctx2.stroke();

        // Faint latitude bands at ±30, ±60 — visible as horizontal
        // chord arcs across the disc.
        ctx2.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx2.lineWidth = 0.5;
        for (const lat of [-60, -30, 0, 30, 60]) {
          const y = cy - Math.sin((lat * Math.PI) / 180) * discR;
          const halfWidth = Math.cos((lat * Math.PI) / 180) * discR;
          ctx2.beginPath();
          ctx2.moveTo(cx - halfWidth, y);
          ctx2.lineTo(cx + halfWidth, y);
          ctx2.stroke();
        }

        // Disc label
        ctx2.font = "bold 9px 'Space Mono',monospace";
        ctx2.fillStyle = labelColor;
        ctx2.textAlign = 'center';
        ctx2.fillText(labelText, cx, cy + discR + 24);

        // Site markers — only the ones on this hemisphere. Skip
        // orbiter entries (no lat/lon); they're catalogued in
        // moon-sites.json but not yet rendered on /moon — see filter
        // in onMount, and the Mars-first orbiter rollout in PRD-009.
        for (const site of sites) {
          if (site.lat == null || site.lon == null) continue;
          const latRad = (site.lat * Math.PI) / 180;
          const lonRad = (site.lon * Math.PI) / 180;
          const z = Math.cos(latRad) * Math.cos(lonRad);
          const onThisSide = isFarSide ? z < 0 : z > 0;
          if (!onThisSide) continue;

          // Project: x flows with sin(lon); far-side mirrors so
          // longitudes >90 stay readable left-to-right.
          let xLocal = Math.sin(lonRad) * Math.cos(latRad);
          if (isFarSide) xLocal = -xLocal;
          const yLocal = -Math.sin(latRad);
          const px = cx + xLocal * discR;
          const py = cy + yLocal * discR;

          const color = colorFor(site);
          const isSel = selected?.id === site.id;

          // Glow
          const gl = ctx2.createRadialGradient(px, py, 0, px, py, 10);
          gl.addColorStop(0, color + '99');
          gl.addColorStop(1, 'transparent');
          ctx2.beginPath();
          ctx2.arc(px, py, 10, 0, Math.PI * 2);
          ctx2.fillStyle = gl;
          ctx2.fill();

          if (isSel) {
            ctx2.beginPath();
            ctx2.arc(px, py, 9, 0, Math.PI * 2);
            ctx2.strokeStyle = '#fff';
            ctx2.lineWidth = 1.5;
            ctx2.stroke();
          }

          ctx2.beginPath();
          ctx2.arc(px, py, 4, 0, Math.PI * 2);
          ctx2.fillStyle = color;
          ctx2.fill();

          // Site label
          ctx2.font = "7px 'Space Mono',monospace";
          ctx2.fillStyle = color + 'cc';
          ctx2.shadowColor = 'rgba(0,0,0,0.85)';
          ctx2.shadowBlur = 4;
          ctx2.textAlign = 'left';
          ctx2.fillText(site.name ?? site.id, px + 6, py + 3);
          ctx2.shadowBlur = 0;

          sitePos2d.set(site.id, { x: px, y: py });
        }
      };

      sitePos2d.clear();
      drawDisc(nearCx, yMid, 'NEAR SIDE · EARTH-FACING', 'rgba(220,220,200,0.85)', false);
      drawDisc(farCx, yMid, 'FAR SIDE', 'rgba(220,220,200,0.85)', true);

      // Nation legend (bottom)
      const legendY = H - 32;
      ctx2.font = "bold 7px 'Space Mono',monospace";
      ctx2.textAlign = 'left';
      ctx2.shadowBlur = 0;
      drawNationLegend2d(ctx2, { startX: 36, y: legendY, palette: NATION_COLORS });
    }

    function on2dClick(e: MouseEvent) {
      const id = pickClosest2d({
        canvas: c2,
        clientX: e.clientX,
        clientY: e.clientY,
        positions: sitePos2d,
        tolerance: 22,
      });
      if (id) selectSite(id);
    }
    c2.addEventListener('click', on2dClick);

    // Resize + animation loop
    const onResize = createCanvasResizer({ container, camera, renderer, composer, outlinePass });
    window.addEventListener('resize', onResize);

    let lastTime = performance.now();
    let rafId = 0;
    let reducedMotion = false;
    const stopReducedMotionWatch = onReducedMotionChange((r) => {
      reducedMotion = r;
    });
    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Rebuild markers if the site list changed (cheap — happens once
      // when the data loads). Same trigger covers the orbital ring
      // rebuild (8 lunar orbiters added in v0.4 — Issue #40 / PRD-009).
      const surfaceCount = sites.filter((s) => s.kind !== 'orbiter').length;
      const orbitalCount = sites.filter((s) => s.kind === 'orbiter').length;
      if (surfaceCount !== markers.length) rebuildMarkers();
      if (orbitalCount !== orbitalMarkers.length) rebuildOrbitalMarkers();

      // Apply layer visibility every frame so chip toggles take effect
      // immediately (cheap — small static arrays).
      const selId = selected?.id ?? null;
      // Selection-ring hide at Tier 2+ (port of /mars). The halo ring
      // visually fights the LROC disc once the camera is in close —
      // hide it when the site's currently-displayed tier ≥ 2 (or
      // mid-transition with targetTier ≥ 2). Build a quick lookup so
      // the halo loop stays a single pass.
      const tierBySiteId = new Map<string, number>();
      for (const h of hotspots) {
        const t = Math.max(h.currentTier, h.targetTier);
        tierBySiteId.set(h.siteId, t);
      }
      for (const mk of markers) {
        mk.group.visible = layerSurface;
        if (mk.halo) {
          const t = tierBySiteId.get(mk.siteId) ?? 0;
          mk.halo.visible = layerSurface && mk.siteId === selId && t < 2;
        }
      }
      for (const om of orbitalMarkers) {
        applyOrbiterLayerVisibility(om, { showOrbiters: layerOrbiters, showOrbits: layerOrbits });
        if (om.halo) om.halo.visible = layerOrbiters && om.siteId === selId;
      }

      // ADR-025: auto-rotate stops when prefers-reduced-motion is set.
      // Drag-to-orbit still works.
      // v0.1.7+: rotation slowed (was 0.05 rad/s) so users have time
      // to track and click moving labels. ADR-025 reduced-motion gate
      // still applies.
      if (!reducedMotion && autoSpin) planetMesh.rotation.y += dt * 0.015;

      // Orbital dot motion — perception-scaled, ~30 s per ring.
      for (const om of orbitalMarkers) {
        if (!om.group.visible) continue;
        tickOrbiterDot(om, dt, reducedMotion);
      }

      // Outline-on-hover (skipped if hovered === selected).
      const outlineMeshes: THREE.Object3D[] = [];
      const selectedId = selected?.id;
      if (hoveredSiteId && hoveredSiteId !== selectedId) {
        const mk = markers.find((x) => x.siteId === hoveredSiteId);
        if (mk) outlineMeshes.push(mk.group);
        const om = orbitalMarkers.find((x) => x.dotGroup.userData.siteId === hoveredSiteId);
        if (om) outlineMeshes.push(om.dotGroup);
      }
      outlinePass.selectedObjects = outlineMeshes;

      // Scale-pulse on selected marker.
      const pulseScale = 1 + Math.sin(now * 0.0026) * 0.06;
      for (const mk of markers) {
        mk.group.scale.setScalar(mk.siteId === selectedId ? pulseScale : 1);
      }
      for (const om of orbitalMarkers) {
        const id = om.dotGroup.userData.siteId as string | undefined;
        om.dotGroup.scale.setScalar(id === selectedId ? pulseScale : 1);
      }

      // Surface Hotspots LOD (PRD-014 / RFC-017 S1).
      // Per-frame tier selection based on screen-projected marker size.
      // For S1, only Apollo 11 swaps Tier 0 → Tier 1; other hotspots
      // join the dispatcher as their sub-issues land.
      if (hotspots.length) {
        // Selected-site clamp (port of /mars). Without a selection
        // every hotspot uses its data-driven maxTier; with one,
        // non-selected sites clamp to ≤ Tier 1 so adjacent discs
        // don't visually fight. Dispatcher reads entry.maxTier each
        // frame so mutating in-place here is safe.
        const selectedHotspotId = selected?.id;
        for (const h of hotspots) {
          const orig = originalMaxTier.get(h.siteId) ?? (h.maxTier as 0 | 1 | 2 | 3);
          if (selectedHotspotId == null || selectedHotspotId === h.siteId) {
            h.maxTier = orig;
          } else {
            h.maxTier = Math.min(1, orig) as 0 | 1;
          }
        }
        const canvasH = renderer.domElement.clientHeight || 1;
        updateHotspotLOD(hotspots, camera, canvasH, now, dt * 1000);
        // Publish the highest currently-displayed tier on the canvas
        // for e2e assertions (#116 S8).
        let topTier = 0;
        for (const h of hotspots) if (h.currentTier > topTier) topTier = h.currentTier;
        const target = renderer.domElement;
        const attr = target.getAttribute('data-hotspot-tier');
        const next = String(topTier);
        if (attr !== next) target.setAttribute('data-hotspot-tier', next);

        // Zoom-aware model scaling. tier0 marker + tier1 lander shrink
        // toward 0.2× at the closest zoom so they sit readably on the
        // LROC patch rather than dominating it. Same shape as /mars.
        const zoomScale = computeTierScale(camR);
        for (const h of hotspots) {
          if (h.tier0Group) h.tier0Group.scale.setScalar(zoomScale);
          if (h.tier1Group) h.tier1Group.scale.setScalar(zoomScale);
        }

        // Site labels — shrink with zoomScale but floored at 0.65 so
        // they stay readable. Hide entirely when promoted to Tier 2+
        // (the label is at the patch centre and visually crowds the
        // disc; /mars uses the same pattern).
        const tierByIdForLabels = new Map<string, number>();
        for (const h of hotspots) {
          tierByIdForLabels.set(h.siteId, Math.max(h.currentTier, h.targetTier));
        }
        for (const mk of markers) {
          if (!mk.labelGroup) continue;
          const t = tierByIdForLabels.get(mk.siteId) ?? 0;
          if (t >= 2) {
            mk.labelGroup.visible = false;
            continue;
          }
          mk.labelGroup.visible = true;
          mk.labelGroup.scale.setScalar(Math.max(0.65, zoomScale));
        }

        // Tier-2 detail opacity ramp. Patch is eager-built at site
        // creation so tier2Group exists even when curTier < 2; we
        // override the dispatcher's "tier2 hidden when tier<2"
        // decision and control visibility 100% via camR. ADR-072
        // §Drift 7: range consolidated to 33→30.5 (was 50→33 on
        // Moon — Mars's tighter window matches actual Tier-2 patch
        // dimensions). Traverse polylines + end-dots + captions
        // share this ramp via tier2DelayedReveal.
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
          // Force group visible when ramp is > 0 (dispatcher would
          // otherwise hide it whenever currentTier !== 2).
          h.tier2Group.visible = detailOpacity > 0.01;
          h.tier2Group.traverse((obj) => {
            if (!(obj instanceof THREE.Mesh)) return;
            // Apply ramp to the detail layer; regional layer (when
            // wired in Phase 2) follows the same opacity for now.
            const layer = obj.userData?.layer;
            if (layer !== 'detail' && layer !== 'regional') return;
            const mat = obj.material as THREE.Material & { opacity: number };
            mat.opacity = detailOpacity;
            mat.transparent = detailOpacity < 0.99;
          });
        }

        // Apply ramp to traverse layer (lines + dots + captions push
        // themselves into tier2DelayedReveal). Combines with the
        // TRAVERSES layer toggle: invisible if layer off OR camR
        // too far for detail. End-dots pulse (sine wave) when active.
        const travVisible = loadTraverses != null && layerTraverses && detailOpacity > 0.01;
        for (const obj of tier2DelayedReveal) {
          if (
            obj.userData?.kind === 'traverse' ||
            (obj as { userData?: { kind?: string } }).userData?.kind === 'traverse'
          ) {
            obj.visible = travVisible;
            const mat = (obj as THREE.Line).material as THREE.Material & { opacity: number };
            if (mat) {
              mat.opacity = detailOpacity * 0.95;
              mat.transparent = true;
            }
          }
        }
        if (loadTraverses != null) {
          const pulse = 0.7 + Math.sin(now * 0.006) * 0.25;
          for (const tl of traverseLines) {
            tl.line.visible = travVisible;
            tl.endDot.visible = travVisible;
            if (tl.startLabel) tl.startLabel.visible = travVisible;
            if (tl.endLabel) tl.endLabel.visible = travVisible;
            const lineMat = tl.line.material as THREE.LineBasicMaterial;
            lineMat.opacity = detailOpacity * (tl.isActive ? 0.95 : 0.7);
            const dotMat = tl.endDot.material as THREE.MeshBasicMaterial;
            dotMat.opacity = detailOpacity * (tl.isActive ? pulse : 0.85);
            if (tl.startLabel) {
              tl.startLabel.traverse((o) => {
                if (o instanceof THREE.Sprite) {
                  const m2 = o.material as THREE.SpriteMaterial;
                  m2.opacity = detailOpacity;
                }
              });
            }
            if (tl.endLabel) {
              tl.endLabel.traverse((o) => {
                if (o instanceof THREE.Sprite) {
                  const m2 = o.material as THREE.SpriteMaterial;
                  m2.opacity = detailOpacity;
                }
              });
            }
          }
        }

        // TierContext info card (PRD-014 §v0.7.x). When any hotspot
        // is at Tier 2+, surface attribution for the layers currently
        // composed on its disc. Same pattern as /mars.
        let bestH: { siteId: string } | null = null;
        let bestTier = 0;
        for (const h of hotspots) {
          if (h.currentTier >= 2 && h.currentTier > bestTier) {
            bestTier = h.currentTier;
            bestH = { siteId: h.siteId };
          }
        }
        if (bestH) {
          const site = sites.find((s) => s.id === bestH!.siteId);
          if (site) {
            const hasRegional = !!site.hotspot_tier2_regional_source;
            const hasDetail = !!site.hotspot_tier2_source;
            const agencyChip = nationChipFor(site);
            const layers: TierLayer[] = [];
            // Regional layer — undefined on Moon today; Phase 2 with
            // Chang'e 2 mosaic will fill this. The block is wired so
            // the moment a regional source lands, the row appears.
            if (hasRegional) {
              layers.push({
                layerLabel: 'Regional view',
                sourceTitle: 'Regional mosaic',
                sourceAuthor: 'TBD — placeholder until Phase 2 lands',
                resolutionText: 'TBD',
                licenseShort: 'TBD',
              });
            }
            if (hasDetail) {
              layers.push({
                layerLabel: 'Detail view',
                sourceTitle: 'LROC NAC ROI mosaic',
                sourceAuthor: 'NASA / GSFC / Arizona State University LROC team',
                resolutionText: '5 m/px',
                sourceUrl: 'https://pds.lroc.im-ldi.com/',
                licenseShort: 'PD-NASA',
              });
            }
            tierContext = buildTierContext({ site, agencyChip, layers });
          }
        } else if (tierContext !== null) {
          tierContext = null;
        }

        // Debug overlay write — guarded by showDebug (?debug=1).
        // Same shape as /mars's debugInfo block.
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
          // Live altitude (km above surface). camR is in scene units;
          // multiply by `radiusKm/planetRadius` km/unit to get real km.
          altitudeKm = Math.max(0, (camR - planetRadius) * (config.radiusKm / planetRadius));
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
          let t2built = 0;
          let t2visible = 0;
          for (const h of hotspots) {
            if (h.tier2Group) {
              t2built++;
              if (h.tier2Group.visible) t2visible++;
            }
          }
          debugInfo.tier2Status = `${t2built} built / ${t2visible} visible`;
          const h0 = hotspots[0];
          if (h0?.tier2Group) {
            const tg = h0.tier2Group;
            const fmRef: Array<THREE.Mesh> = [];
            tg.traverse((o) => {
              if (fmRef.length === 0 && o instanceof THREE.Mesh) fmRef.push(o);
            });
            const firstMesh: THREE.Mesh | null = fmRef[0] ?? null;
            const wp = new THREE.Vector3();
            if (firstMesh) firstMesh.getWorldPosition(wp);
            else tg.getWorldPosition(wp);
            let cur: THREE.Object3D | null = tg as THREE.Object3D;
            let hidden = false;
            while (cur) {
              if (!cur.visible) {
                hidden = true;
                break;
              }
              cur = cur.parent;
            }
            const reachable = !hidden;
            const m = firstMesh
              ? (firstMesh.material as THREE.Material & { opacity?: number })
              : null;
            debugInfo.patchDetail = `tg.children=${tg.children.length} tg.visible=${tg.visible} reachable=${reachable} meshVis=${firstMesh?.visible ?? '?'} matOp=${m?.opacity ?? '?'} worldR=${wp.length().toFixed(2)}`;
          }
        }
      }

      if (view === '3d') composer.render();
      else draw2d();
    };
    animate(performance.now());

    cleanup = () => {
      cancelAnimationFrame(rafId);
      stopReducedMotionWatch();
      _stopTidalLockLayer?.();
      _stopAtmosphereLayer?.();
      stopPanoramaEscape();
      panoramaSkybox?.dispose();
      stopCanvasInputs();
      c2.removeEventListener('click', on2dClick);
      window.removeEventListener('resize', onResize);
      disposeScene(scene);
      disposeSceneRenderer({ renderer, outlinePass });
    };
  });

  onDestroy(() => cleanup?.());
</script>

<div class="surface-scene">
  <!-- Non-visual parallel mode (PRD-007 / GH #256 / ADR-025 v0.7.0).
       Screen-reader-only mirror of the 3D-canvas site markers. Each
       button fires the same selectSite handler that a canvas click
       does, so a screen-reader user can navigate to any landing
       site without sighted help. Visually hidden via .sr-only;
       always present in the DOM + tab order. -->
  <ul class="sr-only sr-site-list" aria-label={m.a11y_moon_sites_list_aria()}>
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

  <div class="layer" bind:this={container} class:hidden={view !== '3d'}></div>
  <canvas
    class="layer"
    bind:this={canvas2d}
    class:hidden={view !== '2d'}
    aria-label={m.moon_canvas_label()}
    data-sites-count={sites.length}
  ></canvas>

  <!-- Top-left HUD cluster (matches /explore + /mars convention from v0.4). -->
  <div class="hud-controls" role="group" aria-label={m.ui_view_controls()}>
    <div class="ctrl-row">
      <ViewToggleButton
        is2d={view === '2d'}
        label={view === '3d' ? m.moon_label_view_2d() : m.moon_label_view_3d()}
        onToggle={toggleView}
      />
      {#if view === '3d'}
        <View3dControls
          onReset={() => resetCamera()}
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
            title: m.moon_layer_tip_surface(),
            active: () => layerSurface,
            toggle: () => (layerSurface = !layerSurface),
          },
          {
            testid: 'layer-orbiters',
            label: m.ui_layer_orbiters(),
            title: m.moon_layer_tip_orbiters(),
            active: () => layerOrbiters,
            toggle: () => (layerOrbiters = !layerOrbiters),
          },
          {
            testid: 'layer-orbits',
            label: m.ui_layer_orbits(),
            title: m.moon_layer_tip_orbit_rings(),
            active: () => layerOrbits,
            toggle: () => (layerOrbits = !layerOrbits),
          },
          // TRAVERSES chip shows only when this body has vendored
          // rover paths (Mars today; Moon EVA / Lunokhod future).
          ...(loadTraverses != null
            ? [
                {
                  testid: 'layer-traverses',
                  label: m.ui_layer_traverses(),
                  title: m.mars_layer_tip_traverses(),
                  active: () => layerTraverses,
                  toggle: () => (layerTraverses = !layerTraverses),
                },
              ]
            : []),
        ]}
      />
      <HotspotsLodChip mode={hotspotsMode} onCycle={cycleHotspotsMode} />
    </div>
  </div>

  {#if loadFailed}
    <div class="load-banner" role="alert">{m.moon_load_failed()}</div>
  {/if}

  {#if showDebug}
    {@const debugText = `hotspots debug (moon)
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

  <!-- Live altitude readout — "how zoomed am I" feedback for both
       routes (Drift 16 consolidation, was Mars-only). -->
  {#if view === '3d'}
    <div class="altitude-indicator" aria-hidden="true">
      {altitudeKm >= 1000
        ? `${(altitudeKm / 1000).toFixed(1)} Mm`
        : altitudeKm >= 1
          ? `${altitudeKm.toFixed(0)} km`
          : `${(altitudeKm * 1000).toFixed(0)} m`} altitude
    </div>
  {/if}

  <!-- TierContext info card — same shape as /mars. Visible only at
       Tier 2+ when not in panorama mode. aria-live so screen-readers
       announce the layer changes as the user zooms in/out. -->
  {#if view === '3d' && tierContext && !panoramaActive}
    <TierContextCard {tierContext} />
  {/if}

  <!-- Panorama mode overlay (Phase 6 / #118). The "Return to orbit"
       button is the visible exit; ESC also exits. Hidden-text desc
       is read by screen readers for vision-impaired users. -->
  <PanoramaOverlay
    active={panoramaActive}
    description="You are standing at the landing site. The lander is in front of you. Drag to look around. Press the Exit panorama view button in the detail panel, or press Esc, to return to orbit."
  />

  <!-- Nation legend overlay. The 2D view paints this directly into
       the canvas (line 617 of the 2D draw); the 3D view is a Three.js
       scene that can't host text reliably, so we mirror the legend as
       a CSS overlay. Same NATION_COLORS keep the two views in sync. -->
  {#if view === '3d'}
    <div class="legend-3d" aria-label={m.moon_legend_nation_aria()}>
      {#each Object.entries(NATION_COLORS) as [nation, color] (nation)}
        <span class="legend-item">
          <span class="legend-dot" style:background={color}></span>
          {nation}
        </span>
      {/each}
    </div>
  {/if}

  <Panel
    open={panelOpen}
    title={selected?.name ?? selected?.id ?? ''}
    onClose={() => (panelOpen = false)}
  >
    {#if selected}
      <div class="head" style:--accent={colorFor(selected)}>
        <div class="agency-row">
          <span class="agency-badge" style:background-color={colorFor(selected)}>
            {selected.nation} · {selected.agency}
          </span>
          <span class="status status-{selected.surface_status}"
            >{selected.surface_status.toUpperCase()}</span
          >
        </div>
        <h1 class="name">{selected.name ?? selected.id}</h1>
        {#if selected.mission_type || selected.site_name}
          <p class="type">
            {selected.mission_type ?? ''}
            {#if selected.site_name}· {selected.site_name}{/if}
            {#if selected.mission_type}
              <ScienceChip
                tab="mission-phases"
                section="mission-types"
                label={m.chip_label_mission_types()}
              />
            {/if}
          </p>
        {/if}
        <PanoramaToggleButton
          panoramaUrl={selected.hotspot_tier3_panorama}
          siteId={selected.id}
          {panoramaActive}
          onEnter={enterPanorama}
          onExit={exitPanorama}
        />
      </div>

      {#if panelGallery.length > 0}
        <PanelHeroImage
          src={panelGallery[0]!}
          name={selected.name ?? selected.id}
          onOpen={() => (panelLightbox = panelGallery[0]!)}
        />
      {/if}

      <PanelTabRow
        tabs={buildSurfacePanelTabs({
          hasGallery: panelGallery.length > 0,
          hasStory: !!panelStory,
          hasLinks: panelHasLinks,
        })}
        bind:active={panelTab}
      />

      {#if panelTab === 'overview'}
        <div class="grid">
          <div class="cell">
            <div class="cell-label">{m.moon_panel_year()}</div>
            <div class="cell-value">{selected.year}</div>
          </div>
          {#if selected.kind === 'orbiter'}
            <!-- Orbiter cells: altitude + inclination instead of lat/lon. -->
            <div class="cell">
              <div class="cell-label">{m.earth_panel_alt()}</div>
              <div class="cell-value">{selected.altitude_km?.toLocaleString() ?? '—'} km</div>
            </div>
            <div class="cell">
              <div class="cell-label">{m.panel_label_inclination()}</div>
              <div class="cell-value">{selected.inclination_deg?.toFixed(1) ?? '—'}°</div>
            </div>
            <div class="cell">
              <div class="cell-label">{m.moon_panel_status()}</div>
              <div class="cell-value short">{selected.status}</div>
            </div>
          {:else}
            <div class="cell">
              <div class="cell-label">{m.moon_panel_landing()}</div>
              <div class="cell-value">{selected.landing_date ?? '—'}</div>
            </div>
            <div class="cell">
              <div class="cell-label">
                {m.moon_panel_lat()}<WhyPopover
                  title={m.why_landing_site_title()}
                  body={m.why_landing_site_body()}
                />
              </div>
              <div class="cell-value">
                {selected.lat != null ? m.moon_lat_deg({ value: selected.lat.toFixed(2) }) : '—'}
              </div>
            </div>
            <div class="cell">
              <div class="cell-label">{m.moon_panel_lon()}</div>
              <div class="cell-value">
                {selected.lon != null ? m.moon_lon_deg({ value: selected.lon.toFixed(2) }) : '—'}
              </div>
            </div>
            <div class="cell">
              <div class="cell-label">
                {m.moon_panel_duration()}<WhyPopover
                  title={m.why_surface_time_title()}
                  body={m.why_surface_time_body()}
                />
              </div>
              <div class="cell-value">
                {selected.surface_duration_days
                  ? m.moon_days({ value: selected.surface_duration_days.toString() })
                  : '—'}
              </div>
            </div>
            <div class="cell">
              <div class="cell-label">
                {m.moon_panel_eva()}<WhyPopover
                  title={m.why_eva_time_title()}
                  body={m.why_eva_time_body()}
                />
              </div>
              <div class="cell-value">
                {selected.eva_duration_hours
                  ? m.moon_hours({ value: selected.eva_duration_hours.toString() })
                  : '—'}
              </div>
            </div>
            <div class="cell">
              <div class="cell-label">
                {m.moon_panel_samples()}<WhyPopover
                  title={m.why_samples_title()}
                  body={m.why_samples_body()}
                />
              </div>
              <div class="cell-value">
                {m.moon_kg({ value: (selected.samples_kg ?? 0).toString() })}
              </div>
            </div>
            <div class="cell">
              <div class="cell-label">{m.moon_panel_crew()}</div>
              <div class="cell-value short">
                {selected.crew && selected.crew.length > 0 ? selected.crew.join(', ') : '—'}
              </div>
            </div>
          {/if}
        </div>

        {#if selected.left}
          <section class="left-block" style:--accent={colorFor(selected)}>
            <h3>{m.moon_panel_left_title()}</h3>
            <p>{selected.left}</p>
          </section>
        {/if}

        {#if selected.fact}
          <p class="editorial">{selected.fact}</p>
        {/if}

        {#if selected.capability}
          <section class="capability-block">
            <h3>{m.moon_panel_capability_title()}</h3>
            <p>{selected.capability}</p>
          </section>
        {/if}

        {#if selected.mission_id}
          <a
            class="mission-link"
            href="{base}/missions?id={selected.mission_id}"
            data-testid="mission-card-link"
          >
            FULL MISSION CARD →
          </a>
        {/if}

        {#if selected.credit}
          <div class="credit">{selected.credit}</div>
        {/if}
      {:else if panelTab === 'gallery'}
        {#if panelGallery.length === 0}
          <p class="empty-tab">{m.panel_gallery_empty()}</p>
        {:else}
          <div
            class="gallery-grid"
            aria-label={m.panel_gallery_aria({ name: selected.name ?? selected.id })}
          >
            {#each panelGalleryGrid as src (src)}
              <button
                type="button"
                class="gallery-thumb"
                onclick={() => (panelLightbox = src)}
                aria-label={selected.name ?? selected.id}
              >
                <img {src} alt="" loading="lazy" decoding="async" />
              </button>
            {/each}
          </div>
          <p class="gallery-credit">{panelGalleryCredit(selected.agency)}</p>
        {/if}
      {:else if panelTab === 'story' && panelStory}
        <SiteStoryPanel story={panelStory} onLightbox={(src) => (panelLightbox = src)} />
      {:else if panelTab === 'learn'}
        {#if !panelHasLinks}
          <p class="empty-tab">{m.panel_no_links()}</p>
        {:else}
          {#if panelLinksByTier.intro.length > 0}
            <section class="link-tier tier-intro">
              <h3>{m.panel_links_intro()}</h3>
              <ul>
                {#each panelLinksByTier.intro as link (link.u)}
                  <li>
                    <LearnLink entityId={selected.id} url={link.u} label={link.l} />
                  </li>
                {/each}
              </ul>
            </section>
          {/if}
          {#if panelLinksByTier.core.length > 0}
            <section class="link-tier tier-core">
              <h3>{m.panel_links_core()}</h3>
              <ul>
                {#each panelLinksByTier.core as link (link.u)}
                  <li>
                    <LearnLink entityId={selected.id} url={link.u} label={link.l} />
                  </li>
                {/each}
              </ul>
            </section>
          {/if}
          {#if panelLinksByTier.deep.length > 0}
            <section class="link-tier tier-deep">
              <h3>{m.panel_links_deep()}</h3>
              <ul>
                {#each panelLinksByTier.deep as link (link.u)}
                  <li>
                    <LearnLink entityId={selected.id} url={link.u} label={link.l} />
                  </li>
                {/each}
              </ul>
            </section>
          {/if}
        {/if}
      {/if}
    {/if}
  </Panel>

  <PanelLightbox src={panelLightbox} onClose={() => (panelLightbox = null)} />
</div>

<!-- J.2 — Science Lens banner on /moon. Top-center, lens-gated;
     links into the free-return chapter that's central to lunar
     mission architecture. -->
<!-- Unified Science Lens panel — lens story + tidal-lock indicator in
     one collapse. -->
<ScienceLayersPanel
  title="The Moon · 384 000 km out, three days each way"
  body="Lunar surface gravity is 1/6 g; a vacuum-thin exosphere offers no aerobraking, so every mission has to carry full ∆v for the descent. Apollo's free-return trajectory let the Earth-Moon-Earth figure-8 act as a built-in abort path."
  tab="transfers"
  section="free-return"
  available={['tidal-lock']}
/>

<style>
  .surface-scene {
    position: absolute;
    inset: var(--nav-height) 0 0 0;
    overflow: hidden;
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
  :global(.moon canvas) {
    display: block;
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
  /* Port of /mars's stand-at-site button — same slot in the detail
     panel handles both enter + exit states. Glyph + transparent
     dark-glass styling match Mars; enter glyph "◐" (planet at
     night), exit glyph "✕". */
  .head :global(.stand-at-site) {
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
  .head :global(.stand-at-site::before) {
    content: '◐';
    font-size: 13px;
    line-height: 1;
    color: var(--accent, #4ecdc4);
  }
  .head :global(.stand-at-site--exit::before) {
    content: '✕';
    color: var(--accent, #4ecdc4);
  }
  .head :global(.stand-at-site:hover),
  .head :global(.stand-at-site:focus-visible) {
    background: rgba(255, 255, 255, 0.08);
    border-color: var(--accent, #4ecdc4);
    color: #fff;
    outline: none;
  }
  .panorama-exit {
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: auto;
    padding: 8px 16px;
    background: rgba(4, 4, 12, 0.8);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    cursor: pointer;
    backdrop-filter: blur(8px);
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
    border-color: rgba(190, 195, 210, 0.55);
    outline: none;
  }
  .hud-controls :global(.chip.active) {
    background: rgba(190, 195, 210, 0.16);
    border-color: rgba(190, 195, 210, 0.7);
    color: #c8cdda;
  }
  @media (max-width: 500px) {
    .hud-controls :global(.chip) {
      padding: 0 8px;
      font-size: 9px;
      min-width: 92px;
    }
  }
  .hud-controls :global(.toggle) {
    min-width: 44px;
    min-height: 36px;
    max-width: 70px;
    padding: 4px 8px;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid rgba(190, 195, 210, 0.4);
    color: #d6d9e2;
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
    border-color: rgba(220, 225, 240, 0.7);
    background: rgba(34, 38, 56, 0.95);
    outline: none;
  }
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
  .load-banner {
    position: fixed;
    top: calc(var(--nav-height) + 12px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 40;
    padding: 8px 16px;
    background: rgba(193, 68, 14, 0.2);
    border: 1px solid rgba(193, 68, 14, 0.5);
    color: #ffc850;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    border-radius: 4px;
  }

  .legend-3d {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 14px;
    padding: 6px 14px;
    background: rgba(8, 10, 22, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: rgba(255, 255, 255, 0.7);
    pointer-events: none;
    z-index: 5;
  }
  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    box-shadow: 0 0 4px currentColor;
  }

  .head {
    padding: 0 0 12px;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 12px;
  }
  .agency-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-bottom: 8px;
  }
  .agency-badge,
  .status {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 3px;
  }
  .agency-badge {
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
  .status {
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.03);
    color: rgba(255, 255, 255, 0.6);
  }
  .status-completed {
    color: #4ecdc4;
    border-color: rgba(78, 205, 196, 0.4);
    background: rgba(78, 205, 196, 0.08);
  }
  .status-ongoing {
    color: #4466ff;
    border-color: rgba(68, 102, 255, 0.4);
    background: rgba(68, 102, 255, 0.08);
  }
  .status-planned {
    color: #ffc850;
    border-color: rgba(255, 200, 80, 0.4);
    background: rgba(255, 200, 80, 0.08);
  }
  .name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 28px;
    letter-spacing: 3px;
    color: var(--color-text);
    line-height: 1;
    margin: 0 0 4px;
  }
  .type {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.4);
    margin: 0;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
    margin-bottom: 14px;
  }
  .cell {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    padding: 8px 10px;
  }
  .cell-label {
    font-family: 'Space Mono', monospace;
    font-size: 6px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.25);
    margin-bottom: 3px;
  }
  .cell-value {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: var(--color-text);
    font-weight: 700;
  }
  .cell-value.short {
    font-size: 9px;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.7);
  }

  .left-block {
    margin-bottom: 14px;
    padding: 12px 14px;
    border-left: 4px solid var(--accent, #4466ff);
    background: rgb(from var(--accent, #4466ff) r g b / 0.08);
    border-radius: 0 4px 4px 0;
  }
  .left-block h3 {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    margin: 0 0 6px;
    color: var(--accent, #4466ff);
  }
  .left-block p {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.85);
    line-height: 1.5;
    margin: 0;
  }

  .editorial {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.6;
    margin: 0 0 14px;
  }

  .capability-block {
    padding: 10px 12px;
    background: rgba(78, 205, 196, 0.06);
    border: 1px solid rgba(78, 205, 196, 0.25);
    border-radius: 4px;
    margin-bottom: 14px;
  }
  .capability-block h3 {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    color: #4ecdc4;
    margin: 0 0 4px;
  }
  .capability-block p {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.85);
    margin: 0;
    line-height: 1.5;
  }

  .mission-link {
    align-self: flex-start;
    display: inline-block;
    margin-top: 10px;
    padding: 8px 12px;
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
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    color: rgba(255, 255, 255, 0.25);
    line-height: 1.6;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 10px;
  }
</style>
