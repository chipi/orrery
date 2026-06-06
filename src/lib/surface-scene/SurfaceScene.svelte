<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { audio } from '$lib/audio-state.svelte';
  import { syncHotspotsModeUrl } from '$lib/surface-map/hotspots-url-sync';
  import { syncPanoramaUrl, readPanoramaUrlState } from '$lib/surface-map/panorama-url-sync';
  import { base } from '$app/paths';
  import * as THREE from 'three';
  import { Line2 } from 'three/examples/jsm/lines/Line2.js';
  import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
  import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
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
  // Earth-orbital layer helpers (#290) — used only when
  // config.earthOrbitalLayers is set. /moon and /mars omit the field.
  import {
    buildKarmanLineShell,
    buildOzoneOverlay,
  } from '$lib/surface-scene/earth-atmosphere-layer';
  import { buildMoonGhost, buildOrbitRings } from '$lib/surface-scene/earth-orbital-rings-layer';
  import { buildSatelliteLayer } from '$lib/surface-scene/earth-satellite-layer';
  import EarthObjectPanel from '$lib/surface-scene/EarthObjectPanel.svelte';
  import { getMissionIndex } from '$lib/data';
  import type { EarthObject } from '$types/earth-object';
  import { createSceneRenderer, disposeSceneRenderer } from '$lib/three/scene-renderer';
  import { createCanvasResizer } from '$lib/three/canvas-resizer';
  import { bindCanvasInputs } from '$lib/three/canvas-input-listeners';
  import PanelTabRow from '$lib/components/PanelTabRow.svelte';
  import LayerChipRow from '$lib/components/LayerChipRow.svelte';
  import PanelLightbox from '$lib/components/PanelLightbox.svelte';
  import PanelHeroImage from '$lib/components/PanelHeroImage.svelte';
  import PanoramaOverlay from '$lib/components/PanoramaOverlay.svelte';
  import PanoramaCaptionOverlay from '$lib/components/PanoramaCaptionOverlay.svelte';
  import PanoramaCompassRose from '$lib/components/PanoramaCompassRose.svelte';
  import PanoramaSyntheticRegionMicrocopy from '$lib/components/PanoramaSyntheticRegionMicrocopy.svelte';
  import PanoramaAnnotationCard from '$lib/components/PanoramaAnnotationCard.svelte';
  import PanoramaCycler from '$lib/components/PanoramaCycler.svelte';
  import PanoramaCrossLink from '$lib/components/PanoramaCrossLink.svelte';
  import PanoramaFullscreenToggle from '$lib/components/PanoramaFullscreenToggle.svelte';
  import PanoramaAutoTour from '$lib/components/PanoramaAutoTour.svelte';
  import type { PanoramaAnnotation, PanoramaSetEntry } from '$types/surface-site';
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
  import { statusTone } from '$lib/surface-scene/status-tone';
  import SurfaceFlatPatch from '$lib/surface-scene/SurfaceFlatPatch.svelte';
  import { dimMaterials } from '$lib/three/dim-materials';
  import { buildHotspotSurfacePatch, aspectFromRegion } from '$lib/hotspot-surface-patch';
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
  import LauncherFlightsWidget from '$lib/components/launches/LauncherFlightsWidget.svelte';

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
  // Audio-tour teardown — set inside onMount where camR/camT closures
  // live; called from the main cleanup so listeners don't leak on
  // route change.
  let tourCameraTeardown: (() => void) | undefined;

  // Tour collaboration (PRD-016 §S8 / RFC-019 §12): when the surface
  // site panel opens during an active Curator Tour, collapse the audio
  // overlay to compact mode so the panel is fully visible. Mirrors the
  // pattern wired into /explore for planet panels.
  $effect(() => {
    if (audio.tourActive && panelOpen && !audio.compact) {
      audio.compact = true;
    }
  });
  // Deep-link bridge: when the URL carries ?traverse_stop=<id>, we
  // capture it here at site-load time, then resolve it after
  // traverses load by flying the camera to the stop's lat/lon.
  // Cleared once consumed so it only fires once per URL.
  let pendingTraverseStopFocus: { siteId: string; stopId: string } | null = null;

  // Layer toggles. SURFACE = lander/rover markers; ORBITERS = dots
  // on inclined rings around the Moon (LRO, Clementine, Chandrayaan-1,
  // Chang'e 1/2, SMART-1, Lunar Prospector, Luna 10). Both default-on.
  let layerSurface = $state(true);
  let layerOrbiters = $state(true);
  let layerOrbits = $state(true);
  // TRAVERSES chip — visible only when route passes loadTraverses
  // (rover-path data exists for this body). Defaults on.
  let layerTraverses = $state(true);

  // Earth satellite-category chips (#290 Slice 6). Only surfaced when
  // config.earthOrbitalLayers.satellites is configured. Sub-gating on
  // top of the master layerOrbiters toggle — each category can be hid
  // independently. Defaults come from the route config.
  let layerStations = $state(true);
  let layerObservatories = $state(true);
  let layerConstellations = $state(true);
  let layerComsats = $state(true);
  let layerMoonOrbiters = $state(true);
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

  // Earth-orbital handles (#290 Slice 6) — populated async inside
  // onMount once eol.satellites.loadObjects resolves. The animate loop
  // reads these to apply chip-row visibility per frame. Each SatObj
  // carries its category so the per-frame loop can sub-gate against
  // the relevant layer{Stations,Observatories,...} flag.
  let earthSats: Array<import('$lib/surface-scene/earth-satellite-layer').SatObj> = [];
  let earthRingsGroup: THREE.Group | null = null;
  // EarthObject cache + selection state (#290 Slice 6b). Cached for the
  // pointer-click handler to look up the clicked sat. selectedSat
  // drives EarthObjectPanel; nulled out when the user selects a
  // surface site instead (mutual selection — site OR sat, not both).
  let earthObjectsCache: import('$types/earth-object').EarthObject[] = [];
  let selectedSat = $state<import('$types/earth-object').EarthObject | null>(null);
  let earthMissionIds = $state<Set<string>>(new Set());

  // Flat-patch view state (ADR-062 / #283 Slice 4). Four-phase machine
  // drives the 600 ms ease-in-out cross-fade between sphere and flat
  // patch:
  //   'hidden'   — sphere fully visible, flat patch unmounted (default)
  //   'entering' — both mounted; sphere fading out, flat patch fading in
  //   'visible'  — flat patch fully visible, sphere hidden
  //   'leaving'  — both mounted; reverse fade (back to sphere)
  // The flat patch stays mounted during 'entering' / 'visible' / 'leaving'
  // so CSS opacity transitions can run; only 'hidden' unmounts.
  type FlatPatchPhase = 'hidden' | 'entering' | 'visible' | 'leaving';
  let flatPatchPhase: FlatPatchPhase = $state('hidden');
  let flatPatchActive = $derived(flatPatchPhase !== 'hidden');
  // Phase transitions are timestamped via setTimeout. Track the pending
  // timeout so we can cancel mid-transition (e.g. user clicks back
  // while still fading in).
  let flatPatchTransitionTimer: ReturnType<typeof setTimeout> | null = null;
  const FLAT_PATCH_FADE_MS = 600;
  // Close handler — assigned inside onMount so it can bump camRTarget
  // back up past the trigger threshold (otherwise the patch would
  // immediately re-open on the next frame).
  let closeFlatPatch: () => void = $state(() => {});

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

  // Panorama v2 HUD state (PRD-022 / ADR-074, #286 Phase 2).
  // panoramaYawDeg / panoramaPitchDeg are updated per-frame from
  // animate() when panoramaActive — drive the compass rose + the
  // synthetic-region microcopy. panoramaActiveAnnotation is non-null
  // when a clicked annotation's caption card is open.
  // panoramaCurrentEntryId tracks the active panorama-set entry for
  // multi-pano sites; null = use the site root's single panorama.
  let panoramaYawDeg = $state(0);
  let panoramaPitchDeg = $state(0);
  let panoramaActiveAnnotation = $state<PanoramaAnnotation | null>(null);
  let panoramaCurrentEntryId = $state<string | null>(null);
  // Throttle timer for the Phase 3B URL state write — populated by
  // the per-frame yaw/pitch readout in animate(). Reset implicitly on
  // panorama exit (next entry's first frame writes fresh).
  let panoramaUrlLastWriteMs = 0;
  // Phase 3C — function pointer the AutoTour component calls to pan
  // the camera to a target yaw/pitch. Assigned inside onMount once
  // the fly-tween state exists. Reduced-motion path snaps instantly.
  let panAutoTourTo: (yawDeg: number, pitchDeg: number, reducedMotion: boolean) => void = $state(
    () => {},
  );

  function resolveSetEntry(
    set: PanoramaSetEntry[] | undefined,
    id: string | null,
  ): PanoramaSetEntry | null {
    if (!set || set.length === 0) return null;
    if (id) {
      const byId = set.find((e) => e.id === id);
      if (byId) return byId;
    }
    return set.find((e) => e.default) ?? set[0] ?? null;
  }

  let currentPanoramaEntry = $derived.by(() => {
    const s = selected;
    if (!s) return null;
    return resolveSetEntry(s.panorama_set, panoramaCurrentEntryId);
  });
  let activePanoramaMetadata = $derived.by(() => {
    return currentPanoramaEntry?.metadata ?? selected?.panorama_metadata ?? null;
  });

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
   * Hover-tooltip for the traverse-stop balloon pins. When the pointer
   * is over a pin sprite, surface its sol + label in a small panel
   * floating near the cursor. Cleared on hover-leave or any non-pin
   * frame. Position is page-space (clientX/clientY) so the template
   * can render via fixed positioning.
   */
  let hoveredStopInfo = $state<{
    title: string;
    sol?: number;
    label?: string;
    lat?: number;
    lon?: number;
    clientX: number;
    clientY: number;
  } | null>(null);

  /**
   * Distance scale bar (image 21 ask, 2026-06-03). Bottom-right
   * overlay: a horizontal line at a "nice" round-number width that
   * tells the user the on-screen kilometer scale at the current
   * zoom. Visible whenever Tier-2 content is fading in (so the
   * scale only appears when the planet is rendered at a zoom that
   * has a meaningful local scale). Width in CSS px + the label
   * are computed per frame from worldPerPx × kmPerWorldUnit.
   */
  let scaleBar = $state<{ widthPx: number; label: string } | null>(null);

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
  /**
   * "Zoom to detail" — fly the camera in to the close range where the
   * HiRISE / LROC NAC detail patch is fully visible (camR ≈ 31, just
   * above the SPHERE_TO_FLAT_CAM_R = 30.3 flat-patch trigger). Same
   * tween primitive as faceCameraAtSite, just a closer landing R.
   * Wired to a button in the detail panel so the user has a direct
   * "see the actual surface imagery" affordance instead of having to
   * scroll-wheel-hunt for it.
   */
  let flyToDetail: ((site: SurfaceSite) => void) | undefined;
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

    // Expose programmatic site-selection for the audio-tour executor
    // (PRD-016 §S11 / RFC-019 §12). Hidden tour-anchor buttons in
    // each surface route call this so the tour can demo "Click
    // Curiosity" / "Find Tranquillity Base" without raycasting a
    // canvas pixel.
    if (typeof window !== 'undefined') {
      (
        window as Window & { __surfaceSceneSelectSite?: (id: string) => void }
      ).__surfaceSceneSelectSite = (id: string) => selectSite(id, { face: true });
    }

    loadSites(localeFromPage($page))
      .then((list) => {
        sites = list;
        // Deep-link: ?site=<id> opens the panel pre-selected. The
        // `face: true` flag also rotates the moon so the site faces
        // the camera (issue #227) — otherwise the halo opens but the
        // site itself can be on the far side, invisible until the
        // user manually drags.
        const siteParam = $page.url.searchParams.get('site');
        const traverseStopParam = $page.url.searchParams.get('traverse_stop');
        if (siteParam) {
          // Deep-link with ?traverse_stop=<id> — select the site but
          // defer the camera fly-in until traverses load so we can
          // target the stop's lat/lon instead of the site's. The
          // traverse JSON has stops with stable sol-based ids (added
          // 2026-06-01 to wire the panorama cross-link chip).
          if (traverseStopParam) {
            selectSite(siteParam);
            pendingTraverseStopFocus = { siteId: siteParam, stopId: traverseStopParam };
          } else {
            selectSite(siteParam, { face: true });
          }
        }
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
    const planetMap2k = textureLoader.load(config.textureUrl);
    const planetRadius = 30;
    // Axial-tilt group wraps the planet mesh so Mars's 25.19° obliquity
    // is visible (no-op rotation for Moon's ~0°). Orbital markers
    // attach to scene (NOT planetAxis) per ADR-072 §Drift 22 — orbits
    // are inertial, they don't inherit the planet's tilt.
    const planetAxis = new THREE.Group();
    planetAxis.rotation.z = (config.axialTiltDeg * Math.PI) / 180;
    scene.add(planetAxis);
    const planetMaterial = new THREE.MeshPhongMaterial({
      map: planetMap2k,
      color: 0xffffff,
      shininess: 4,
    });
    const planetMesh = new THREE.Mesh(
      new THREE.SphereGeometry(planetRadius, 64, 64),
      planetMaterial,
    );
    planetAxis.add(planetMesh);

    // ADR-073 Layer B — lazy 2K → 4K base swap on camera approach. The
    // 4K texture loads on the first threshold cross (camR ≤ 50, i.e.
    // ~1.67× planet radius). Hysteresis at camR ≥ 62 prevents per-frame
    // thrashing at the boundary. Mirrors EarthOrbitalScene.svelte's
    // pattern from #284; per-body wiring for the SurfaceScene
    // consumers /moon, /mars, /earth?mode=surface lands with this
    // commit. Thresholds expressed in absolute scene units (planet
    // radius = 30) so the same numbers apply across all three bodies;
    // the user-relative "feel" of when the swap fires is determined by
    // the per-route initial camera distance and zoom range, both of
    // which are already body-consistent inside SurfaceScene.
    const SURFACE_LOD_4K_IN = 50;
    const SURFACE_LOD_2K_OUT = 62;
    let planetMap4k: THREE.Texture | null = null;
    let planetLodLevel: '2k' | '4k' = '2k';
    let planet4kLoadStarted = false;
    function ensurePlanet4kLoaded(): void {
      if (planet4kLoadStarted || !config.textureUrl4k) return;
      planet4kLoadStarted = true;
      textureLoader.load(
        config.textureUrl4k,
        (tex) => {
          planetMap4k = tex;
        },
        undefined,
        () => {
          planet4kLoadStarted = false; // allow retry next threshold cross
        },
      );
    }
    function updatePlanetTextureLod(camR: number): void {
      if (!config.textureUrl4k) return; // body has no 4K source
      if (camR <= SURFACE_LOD_4K_IN) {
        ensurePlanet4kLoaded();
        if (planetMap4k && planetLodLevel !== '4k') {
          planetMaterial.map = planetMap4k;
          planetMaterial.needsUpdate = true;
          planetLodLevel = '4k';
        }
      } else if (camR >= SURFACE_LOD_2K_OUT && planetLodLevel !== '2k') {
        planetMaterial.map = planetMap2k;
        planetMaterial.needsUpdate = true;
        planetLodLevel = '2k';
      }
    }

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

    // Earth-specific orbital subsystems (#290 Slice 4). Mounts only
    // when the route's config carries earthOrbitalLayers — /moon and
    // /mars omit the field, so this branch is dead code on those
    // routes. Each helper handles its own visibility lensing /
    // texture loading; SurfaceScene only owns the mount + dispose
    // wiring. Slice 5 will add panel polymorphism for satellite
    // clicks; Slice 6 will surface chip-row visibility toggles.
    const earthLayerHandles: Array<{ dispose: () => void }> = [];
    if (config.earthOrbitalLayers) {
      const eol = config.earthOrbitalLayers;
      if (eol.karmanLineShell) {
        const k = buildKarmanLineShell({ ...eol.karmanLineShell, planetRadius });
        scene.add(k.shell);
        scene.add(k.ring);
        earthLayerHandles.push(k);
      }
      if (eol.ozoneOverlay) {
        const o = buildOzoneOverlay({ ...eol.ozoneOverlay, planetRadius });
        scene.add(o.south);
        scene.add(o.north);
        earthLayerHandles.push(o);
      }
      let earthMoonR = 0;
      if (eol.moonGhost) {
        const mg = buildMoonGhost({
          textureUrl: eol.moonGhost.textureUrl,
          radiusUnits: eol.moonGhost.radiusUnits,
          distanceKm: eol.moonGhost.distanceKm,
          textureLoader,
          planetRadius,
        });
        scene.add(mg.mesh);
        earthMoonR = mg.moonR;
        earthLayerHandles.push(mg);
      }

      // Mission-index — populates the "FULL MISSION CARD →" cross-link
      // inside EarthObjectPanel. Fire-and-forget; the panel renders
      // with the empty Set until this resolves.
      void getMissionIndex().then((idx) => {
        earthMissionIds = new Set(idx.map((mi) => mi.id));
      });

      // Satellites + orbit rings — both depend on the EarthObject set
      // returned by the route's loadObjects callback. Loaded async then
      // the helpers materialise scene meshes. Chip-row visibility +
      // panel polymorphism for satellite selection land in Slice 6.
      if (eol.satellites) {
        const satCfg = eol.satellites;
        const ringsCfg = eol.orbitRings;
        satCfg
          .loadObjects(localeFromPage($page))
          .then((raw) => {
            const objects = raw as EarthObject[];

            if (ringsCfg) {
              const repAlt: Record<string, number> = {};
              for (const o of objects) {
                const alt = o.altitude_km ?? o.earth_distance_km;
                if (!(o.regime in repAlt)) repAlt[o.regime] = alt;
              }
              const regimes = Object.entries(repAlt).map(([regime, altitude_km]) => ({
                regime,
                altitude_km,
              }));
              const rings = buildOrbitRings({
                regimeColors: ringsCfg.regimeColors,
                regimes,
                planetRadius,
              });
              rings.group.visible = ringsCfg.visibleByDefault;
              scene.add(rings.group);
              earthRingsGroup = rings.group;
              earthLayerHandles.push({
                dispose: () => {
                  rings.dispose();
                  scene.remove(rings.group);
                  earthRingsGroup = null;
                },
              });
            }

            // Apply route-provided per-category defaults before the
            // animate loop's first sub-gating pass.
            const defaults = satCfg.categoryDefaultVisible;
            layerStations = defaults.station;
            layerObservatories = defaults.observatory;
            layerConstellations = defaults.constellation;
            layerComsats = defaults.comsat;
            layerMoonOrbiters = defaults.moonOrbiter;

            const satLayer = buildSatelliteLayer({
              scene,
              objects,
              moonR: earthMoonR,
              planetRadius,
            });
            earthSats = satLayer.sats;
            earthObjectsCache = objects;
            earthLayerHandles.push({
              dispose: () => {
                satLayer.dispose();
                earthSats = [];
                earthObjectsCache = [];
              },
            });

            // Deep-link: ?object=<id> opens the panel pre-selected.
            // Same param name as the legacy EarthOrbitalScene.
            const objParam = $page.url.searchParams.get('object');
            if (objParam) {
              const o = objects.find((x) => x.id === objParam);
              if (o) selectedSat = o;
            }
          })
          .catch((err) => {
            console.error('SurfaceScene: failed to load earth objects', err);
          });
      }
    }

    // Issue #227 — `faceCameraAtSite(site)` orbits the camera through
    // the planet centre to align the screen-centre ray with the site's
    // world position (accounting for axial tilt + any current
    // planetMesh.rotation.y), then pulls the camera in to a near-orbit
    // distance so the user lands "on" the site. Replaces Moon's older
    // longitude-flip-only behavior with Mars's full 3D fly-in tween
    // (ADR-072 §Drift 14 consolidation — Moon adopts the smoother UX).
    // RAF interpolates camP/camT/camR over FLY_DURATION_MS with ease-
    // out cubic. User drag cancels mid-flight.
    faceCameraAtSite = (site: SurfaceSite) => {
      if (site.lat == null || site.lon == null) return;
      const v = latLonToUnitSphere(site.lat, site.lon);
      planetMesh.updateMatrixWorld(true);
      const worldPos = new THREE.Vector3(v.x, v.y, v.z).applyMatrix4(planetMesh.matrixWorld);
      const dir = worldPos.clone().normalize();
      flyFromP = camP;
      flyFromT = camT;
      flyFromR = camR;
      flyToP = Math.acos(Math.max(-1, Math.min(1, dir.y)));
      // Camera position formula: x = sin(P)*sin(T), z = sin(P)*cos(T).
      // Solving for T given a target dir: T = atan2(dir.x, dir.z).
      // The previous atan2(dir.z, dir.x) call coincidentally landed
      // close to the right azimuth for Curiosity (lat -4.6°, lon
      // 137.4° — both x and z components similar magnitude) but
      // landed ~245° off for Perseverance, which surfaced as the
      // marker showing on the planet's near-left edge instead of
      // dead-centre on a fresh ?site=perseverance deep-link.
      let to = Math.atan2(dir.x, dir.z);
      // Shortest-path interpolation around the longitude circle.
      while (to - flyFromT > Math.PI) to -= 2 * Math.PI;
      while (to - flyFromT < -Math.PI) to += 2 * Math.PI;
      flyToT = to;
      // Land at a Tier-1-friendly distance (50u) so the lander model
      // resolves; user can scroll-zoom further to reach Tier 2.
      flyToR = 50;
      flyStart = performance.now();
      flyActive = true;
      autoSpin = false;
    };

    // Zoom-to-detail variant: same lat/lon facing math, but lands at
    // camR ≈ 31 so the HiRISE detail patch is fully visible (just
    // above the flat-patch trigger). Skips the fly if the user is
    // already at deep zoom so the button doesn't bounce on click.
    flyToDetail = (site: SurfaceSite) => {
      if (site.lat == null || site.lon == null) return;
      if (camR < 32) return;
      const v = latLonToUnitSphere(site.lat, site.lon);
      planetMesh.updateMatrixWorld(true);
      const worldPos = new THREE.Vector3(v.x, v.y, v.z).applyMatrix4(planetMesh.matrixWorld);
      const dir = worldPos.clone().normalize();
      flyFromP = camP;
      flyFromT = camT;
      flyFromR = camR;
      flyToP = Math.acos(Math.max(-1, Math.min(1, dir.y)));
      let to = Math.atan2(dir.x, dir.z);
      while (to - flyFromT > Math.PI) to -= 2 * Math.PI;
      while (to - flyFromT < -Math.PI) to += 2 * Math.PI;
      flyToT = to;
      flyToR = 31;
      camRTarget = 31;
      flyStart = performance.now();
      flyActive = true;
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
      halo?: THREE.Object3D;
      labelGroup?: THREE.Group;
    };
    const markers: MarkerObj[] = [];

    // ─── Traverses (Mars rover paths today, Moon EVA paths future) ───
    type TraverseLine = {
      line: Line2;
      lineMaterial: LineMaterial;
      startDot: THREE.Mesh;
      endDot: THREE.Mesh;
      roverId: string;
      isActive: boolean;
      startLabel?: THREE.Group;
      endLabel?: THREE.Group;
      startLabelTexture?: THREE.Texture;
      endLabelTexture?: THREE.Texture;
      stopPins: THREE.Sprite[];
      stopPinTextures: THREE.Texture[];
      /** Anchor positions for screen-pixel-stable caption placement. */
      startAnchor: THREE.Vector3;
      endAnchor: THREE.Vector3;
      tangent: THREE.Vector3;
      /** Patch radius — used to renormalise caption positions to surface. */
      surfaceRadius: number;
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

    // ── Traverse-stop balloon-pin marker (NASA-map style) ───────────
    // Tear-drop balloon with kind-tinted body, thin white outline,
    // soft drop shadow, small white centre dot. Sol info is surfaced
    // only via the hover tooltip so the pin face doesn't duplicate
    // it — duplicate text was illegible at close zoom anyway (image
    // 19 feedback, 2026-06-02). Anchored at the tip via
    // sprite.center=(0.5, 0). Base scale is 1.0 here because the
    // animate loop computes a screen-pixel-stable target size and
    // sets sprite.scale per frame.
    function buildTraverseStopPin(hexColor: number): {
      sprite: THREE.Sprite;
      texture: THREE.Texture;
    } {
      const hex = `#${hexColor.toString(16).padStart(6, '0')}`;
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 96;
      const cx = 32;
      const headR = 22;
      const headY = 28;
      const tipY = 86;
      const ctx2 = canvas.getContext('2d');
      if (ctx2) {
        ctx2.shadowColor = 'rgba(0, 0, 0, 0.55)';
        ctx2.shadowBlur = 5;
        ctx2.shadowOffsetY = 2;
        ctx2.beginPath();
        ctx2.arc(cx, headY, headR, Math.PI * 0.78, Math.PI * 0.22, false);
        ctx2.lineTo(cx, tipY);
        ctx2.closePath();
        ctx2.fillStyle = hex;
        ctx2.fill();
        ctx2.shadowColor = 'transparent';
        ctx2.shadowBlur = 0;
        ctx2.shadowOffsetY = 0;
        ctx2.lineWidth = 3;
        ctx2.strokeStyle = '#ffffff';
        ctx2.stroke();
        ctx2.fillStyle = '#ffffff';
        ctx2.beginPath();
        ctx2.arc(cx, headY, 6, 0, Math.PI * 2);
        ctx2.fill();
      }
      const texture = new THREE.Texture(canvas);
      texture.needsUpdate = true;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      const mat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(1, 1.5, 1);
      sprite.center.set(0.5, 0);
      return { sprite, texture };
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
        for (const sp of tl.stopPins) {
          planetMesh.remove(sp);
          (sp.material as THREE.SpriteMaterial).dispose();
        }
        for (const t of tl.stopPinTextures) t.dispose();
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
        const site = sites.find((s) => s.id === tr.rover_id);
        const color = site ? colorFor(site) : '#ffffff';
        const isActive = tr.status === 'ACTIVE';
        // Thick rover path — THREE.Line is hard-capped at 1 px on most
        // WebGL platforms, so the traverse polyline disappeared next to
        // the kind-coloured stop dots (image 11, 2026-06-01). Line2 +
        // LineMaterial render a screen-pixel-sized extruded ribbon,
        // honouring `linewidth` reliably. Resolution is set here and
        // refreshed in the resize hook below.
        const lineGeo = new LineGeometry();
        lineGeo.setPositions(verts);
        const lineMaterial = new LineMaterial({
          color: new THREE.Color(color).getHex(),
          // 3 → 4: with the smaller balloon pins + endDot the line
          // now reads as the primary trail with the markers
          // anchored along it, rather than the markers floating
          // above a hairline (image 19 proportion feedback).
          linewidth: 4,
          transparent: true,
          opacity: isActive ? 0.95 : 0.7,
          dashed: false,
        });
        lineMaterial.resolution.set(
          container?.clientWidth || window.innerWidth,
          container?.clientHeight || window.innerHeight,
        );
        const line = new Line2(lineGeo, lineMaterial);
        line.computeLineDistances();
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
        // Compute the sol number at the current rover position —
        // for active rovers, days alive since landing; for ended,
        // days between landing and snapshot.
        const endIsoForUserData = isActive ? new Date().toISOString() : tr.snapshot_date;
        const endSol = site?.landing_date ? daysBetween(site.landing_date, endIsoForUserData) : 0;
        endDot.userData = {
          siteId: tr.rover_id,
          kind: 'traverse-end',
          stopLat: last[0],
          stopLon: last[1],
          stopSol: endSol,
          stopLabel: isActive ? 'Current rover position' : 'Final rover position',
        };
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

        // Curated traverse stops (Slice 5b — sample sites, drill sites,
        // notable sols). NASA-style balloon-pin sprites with the sol
        // number painted inside the head. Joining tier2DelayedReveal
        // lets them fade in lockstep with the line + dots.
        const stopPins: THREE.Sprite[] = [];
        const stopPinTextures: THREE.Texture[] = [];
        if (tr.stops) {
          const STOP_KIND_COLOR: Record<string, number> = {
            sample: 0xfb923c,
            drill: 0xf97316,
            panorama: 0x22d3ee,
            helicopter: 0xe879f9,
            feature: 0xfde047,
          };
          for (const stop of tr.stops) {
            const stopPos = latLonToUnitSphere(stop.lat, stop.lon);
            const { sprite: pinSprite, texture: pinTexture } = buildTraverseStopPin(
              STOP_KIND_COLOR[stop.kind] ?? 0xfde047,
            );
            pinSprite.position.set(stopPos.x * r, stopPos.y * r, stopPos.z * r);
            pinSprite.userData = {
              roverId: tr.rover_id,
              kind: 'traverse-stop',
              stopKind: stop.kind,
              stopSol: stop.sol,
              stopLabel: stop.label,
            };
            planetMesh.add(pinSprite);
            tier2DelayedReveal.push(pinSprite);
            stopPins.push(pinSprite);
            stopPinTextures.push(pinTexture);
          }
        }

        traverseLines.push({
          line,
          lineMaterial,
          startDot,
          endDot,
          roverId: tr.rover_id,
          isActive,
          startLabel: startBuilt.group,
          endLabel: endBuilt.group,
          startLabelTexture: startBuilt.texture,
          endLabelTexture: endBuilt.texture,
          stopPins,
          stopPinTextures,
          startAnchor: startPosWorld.clone(),
          endAnchor: endPosWorld.clone(),
          tangent: tangent.clone(),
          surfaceRadius: r,
        });
      }
    }

    // Initial traverse load + reactive rebuild on data change.
    // Defer rebuildTraverses until `sites` is populated — the build
    // closure reads site?.landing_date to compute the rover "DAY N"
    // counter and the "LANDED YYYY-MM-DD" green caption; if the
    // sites loader hasn't resolved yet, both labels stamp out as
    // "LANDING SITE" + "DAY 0" instead of the real values (image 20
    // feedback, 2026-06-02). RAF-poll until sites are in.
    if (loadTraverses != null && loadTraverses) {
      loadTraverses().then((data) => {
        traverses = data;
        const tryBuild = () => {
          if (sites.length === 0) {
            requestAnimationFrame(tryBuild);
            return;
          }
          rebuildTraverses();
          // Deep-link consumption: ?site=<rover>&traverse_stop=<sol-id>
          // — find the named stop in the rover's traverse and fly the
          // camera to its lat/lon. Falls back to a regular site-face
          // fly-in if the stop id doesn't resolve (typo'd link, stale
          // bookmark, etc.) so the deep-link still does something
          // useful instead of silently no-op-ing.
          if (pendingTraverseStopFocus) {
            const { siteId, stopId } = pendingTraverseStopFocus;
            pendingTraverseStopFocus = null;
            const traverse = data[siteId];
            const stop = traverse?.stops?.find((s) => s.id === stopId);
            const site = sites.find((s) => s.id === siteId);
            if (stop && faceCameraAtSite) {
              faceCameraAtSite({
                ...(site ?? ({ id: siteId } as unknown as SurfaceSite)),
                lat: stop.lat,
                lon: stop.lon,
              } as SurfaceSite);
            } else if (site && faceCameraAtSite) {
              // Stop not found — graceful fallback to facing the site.
              faceCameraAtSite(site);
            }
          }
        };
        tryBuild();
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
        const tier0Group = config.landerModelBuilder(
          site.id,
          site.mission_type,
          colorFor(site),
          site.agency,
        );
        // Dim crashed/lost markers — the wreckage still has a site but
        // the mission ended on impact, so the marker reads as a fainter
        // historical reference rather than competing for attention with
        // ACTIVE missions. ADR-072 §"True body differences" / lifecycle.
        if (site.status === 'CRASHED' || site.status === 'LOST') {
          dimMaterials(tier0Group, 0.55);
        }
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
        // ADR-061 / ADR-072 Slice 3 §"selection halo as bounding rect":
        // when the site has region_bounds, the halo renders as a thin
        // rectangular outline matching the region's aspect ratio (long
        // for traverse_bbox, square-ish for landing_ellipse near
        // equator, wide for polar ROI). Otherwise falls back to the
        // legacy circular ring.
        const haloAspect = aspectFromRegion(site.region_bounds);
        const halo = createMarkerHalo(colorFor(site), 1.4, {
          lay: true,
          aspect: haloAspect,
        });
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
                      // ADR-061: when region_bounds is set on the site,
                      // the Tier-2 patch geometry switches from circle
                      // to a stylized rectangle whose aspect matches
                      // the region's lon-extent vs lat-extent ratio.
                      regionBounds: site.region_bounds,
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
    // 45° Mars; Mars's angled view is more inviting). /earth overrides
    // via config.initialCamR so the lens-gated layers (Karman shell,
    // ozone caps, satellite belt) sit on screen at toggle-on.
    let camR = config.initialCamR ?? 85;
    let camP = Math.PI / 4;
    let camT = 0;
    const camR0 = camR;
    const camP0 = camP;
    const camT0 = camT;

    // ─── Audio-tour camera demos (PRD-016 §S11 / RFC-019 §12) ─────
    // Dispatched by the audio executor when narration says "Drag to
    // rotate" / "Rotate the sphere" / "Zoom in to Curiosity". Drives
    // camT (azimuth) and camRTarget (smooth-zoom) over the requested
    // duration. Anchored to the .surface container so all three rocky-
    // body routes share the same handler.
    function easeInOutTour(t: number): number {
      return t * t * (3 - 2 * t);
    }
    function animateCamTour(
      get: () => number,
      set: (v: number) => void,
      to: number,
      durationMs: number,
    ): void {
      const start = get();
      const startTime = performance.now();
      const step = (): void => {
        const t = Math.min(1, (performance.now() - startTime) / durationMs);
        set(start + (to - start) * easeInOutTour(t));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    const onTourDragSurface = (e: Event): void => {
      const d = (e as CustomEvent).detail as
        | { durationMs?: number; rotateRad?: number }
        | undefined;
      const rotate = d?.rotateRad ?? Math.PI / 3;
      animateCamTour(
        () => camT,
        (v) => (camT = v),
        camT + rotate,
        d?.durationMs ?? 1500,
      );
    };
    const onTourZoomSurface = (e: Event): void => {
      const d = (e as CustomEvent).detail as { durationMs?: number; factor?: number } | undefined;
      const factor = d?.factor ?? 0.55;
      const target = Math.max(10, Math.min(800, camR * factor));
      animateCamTour(
        () => camRTarget,
        (v) => (camRTarget = v),
        target,
        d?.durationMs ?? 1500,
      );
    };
    container?.addEventListener('audio-stage-drag', onTourDragSurface);
    container?.addEventListener('audio-stage-zoom', onTourZoomSurface);
    tourCameraTeardown = () => {
      container?.removeEventListener('audio-stage-drag', onTourDragSurface);
      container?.removeEventListener('audio-stage-zoom', onTourZoomSurface);
    };

    // Smooth-zoom target (Drift 13 consolidation). Wheel/pinch update
    // camRTarget; RAF lerps camR toward it at 15%/frame so zoom feels
    // viscous rather than snapping. Initialised to current camR so the
    // first frame is a no-op.
    let camRTarget = camR;

    // Wire the flat-patch close handler — bump camRTarget back above
    // the sphere→flat trigger threshold so the smooth-zoom lerp
    // animates the camera back out and the trigger doesn't re-fire
    // on the next frame. Drive the 'leaving' phase (sphere fading
    // back in, flat patch fading out over 600 ms) before unmounting.
    closeFlatPatch = () => {
      if (flatPatchTransitionTimer) clearTimeout(flatPatchTransitionTimer);
      flatPatchPhase = 'leaving';
      camRTarget = 50;
      flatPatchTransitionTimer = setTimeout(() => {
        flatPatchPhase = 'hidden';
        flatPatchTransitionTimer = null;
      }, FLAT_PATCH_FADE_MS);
    };

    // Drag-inertia velocities (Drift 12 consolidation). On mouse-up /
    // touch-end, the move handler's last frame velocity stays in these;
    // RAF decays them at 0.92/frame until below threshold. Cancelled
    // when the user starts a new drag (velocity reset on first move).
    let camTVelocity = 0;
    let camPVelocity = 0;

    // Fly-in tween (Drift 14 consolidation). Deep-link or
    // selectSite({face:true}) initialises the tween; RAF interpolates
    // camP/camT/camR with ease-out cubic over FLY_DURATION_MS. User
    // drag cancels mid-flight.
    const FLY_DURATION_MS = 800;
    let flyActive = false;
    let flyStart = 0;
    let flyFromP = 0;
    let flyFromT = 0;
    let flyFromR = 0;
    let flyToP = 0;
    let flyToT = 0;
    let flyToR = 0;

    // Phase 3C — Auto-tour camera pan implementation. Reuses the
    // existing fly-tween primitive (ease-out cubic over FLY_DURATION_MS).
    // Keeps camR fixed (we're inside the panorama at 0.5); only camP +
    // camT change. Reduced-motion users get an instant snap.
    panAutoTourTo = (yawDeg, pitchDeg, reducedMotion) => {
      const targetT = (yawDeg * Math.PI) / 180;
      const targetP = Math.PI / 2 - (pitchDeg * Math.PI) / 180;
      if (reducedMotion) {
        camT = targetT;
        camP = targetP;
        flyActive = false;
        updateCam();
        return;
      }
      flyFromP = camP;
      flyFromT = camT;
      flyFromR = camR;
      // Shortest-path yaw interpolation — same wrap math as faceCameraAtSite.
      let to = targetT;
      while (to - flyFromT > Math.PI) to -= 2 * Math.PI;
      while (to - flyFromT < -Math.PI) to += 2 * Math.PI;
      flyToT = to;
      flyToP = targetP;
      flyToR = camR; // keep panorama distance fixed
      flyStart = performance.now();
      flyActive = true;
    };

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
      camRTarget = camR0;
      camP = camP0;
      camT = camT0;
      camTVelocity = 0;
      camPVelocity = 0;
      flyActive = false;
      updateCam();
    };

    // Phase 6 (#118) — panorama enter/exit hooks. Closure over
    // planetMesh + camR + scene; exposed to the route's outer state
    // via the enterPanorama / exitPanorama function pointers.
    let savedCamR = camR;
    // Visibility snapshot of scene-parented siblings of planetMesh,
    // captured on panorama enter so we can restore exactly on exit.
    // planetMesh children (surface site markers, traverses, tidal-
    // lock overlay) inherit planetMesh.visible so they don't need
    // tracking. Orbital ring/dot markers + atmosphere shell + atm
    // ring are scene children and would otherwise float around the
    // camera inside the panorama skybox (user-reported "I see orbits
    // in panorama mode").
    const panoramaHiddenVisibility = new Map<THREE.Object3D, boolean>();
    enterPanorama = (textureUrl: string, siteId: string) => {
      if (panoramaActive) return;
      // PRD-022 / ADR-074 Phase 3B — read deep-link URL state if present.
      // ?pano=<entry-id> picks the panorama-set entry; ?yaw=&pitch=
      // restore camera orientation. Defaults: null entry → default,
      // 0/0 → looking forward at horizon.
      const urlState = readPanoramaUrlState($page.url);
      panoramaCurrentEntryId = urlState?.entryId ?? null;
      // saveData users get a heads-up affordance handled outside; if
      // we reach here, the user explicitly opted in.
      panoramaSkybox = createSkybox({ textureUrl, siteId });
      scene.add(panoramaSkybox.group);
      panoramaSkybox.activate();
      // Mount panorama annotations (PRD-022 / ADR-074 Phase 2E/2F).
      // Resolve set entry to the URL-picked id when present (or default).
      const site = sites.find((s) => s.id === siteId);
      if (site) {
        const entry = resolveSetEntry(site.panorama_set, panoramaCurrentEntryId);
        const annotations = entry?.annotations ?? site.panorama_annotations ?? [];
        if (annotations.length > 0) {
          panoramaSkybox.mountAnnotations(annotations, colorFor(site));
        }
        if (entry && `${base}${entry.url}` !== textureUrl) {
          void panoramaSkybox.swapTexture(`${base}${entry.url}`);
        }
      }
      planetMesh.visible = false;
      // Hide scene-parented siblings of planetMesh (orbital markers,
      // atmosphere shell + ring, any future scene-direct overlay) so
      // they don't render inside the panorama skybox. Snapshot the
      // pre-panorama visibility into panoramaHiddenVisibility so
      // exitPanorama can restore it exactly (e.g. an orbital marker
      // hidden via the ORBITERS chip stays hidden after exit).
      panoramaHiddenVisibility.clear();
      for (const child of scene.children) {
        if (panoramaSkybox && child === panoramaSkybox.group) continue;
        if (child === planetAxis) continue;
        // Lights stay on — they're scene-parented but don't render
        // geometry. createStarField adds a THREE.Points; we hide that
        // too since the panorama skybox provides the sky.
        if (child instanceof THREE.Light) continue;
        panoramaHiddenVisibility.set(child, child.visible);
        child.visible = false;
      }
      savedCamR = camR;
      // Move camera close to origin so the user's drag-to-rotate
      // feels like spinning their head inside the skybox.
      camR = 0.5;
      // Restore yaw/pitch from URL on deep-link entry — Phase 3B.
      if (urlState) {
        camT = (urlState.yawDeg * Math.PI) / 180;
        // pitch +90 = up, 0 = horizon → camP = π/2 - pitch_rad
        camP = Math.PI / 2 - (urlState.pitchDeg * Math.PI) / 180;
      }
      updateCam();
      panoramaActive = true;
    };
    exitPanorama = () => {
      if (!panoramaActive) return;
      panoramaActive = false;
      panoramaActiveAnnotation = null;
      panoramaCurrentEntryId = null;
      // PRD-022 / ADR-074 Phase 3B — strip pano/yaw/pitch from URL so
      // the bar doesn't carry stale state back to the orbital view.
      syncPanoramaUrl($page.url, null);
      teardownPanoramaSkybox(panoramaSkybox);
      panoramaSkybox = null;
      planetMesh.visible = true;
      // Restore visibility of every scene-parented object that
      // enterPanorama hid. Use the snapshot so chip-driven hides
      // (orbital markers hidden via the ORBITERS chip, atmosphere
      // hidden because the Science Lens layer wasn't toggled on)
      // are preserved through the panorama round-trip.
      for (const [obj, wasVisible] of panoramaHiddenVisibility) {
        obj.visible = wasVisible;
      }
      panoramaHiddenVisibility.clear();
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

    // #290 Slice 6b — Earth-satellite picker. Raycasts against the
    // sat-layer hit spheres (3u radius around each spacecraft) so the
    // user can grab moving satellites without millimetre-perfect
    // pointer accuracy. Returns the EarthObject id when a satellite
    // is hit, or null. Empty no-op on /moon and /mars (earthSats [] ).
    function pickSatAt(clientX: number, clientY: number): string | null {
      if (earthSats.length === 0) return null;
      const rect = el3d.getBoundingClientRect();
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const targets: THREE.Object3D[] = [];
      for (const s of earthSats) if (s.group.visible) targets.push(s.group);
      const hits = ray.intersectObjects(targets, true);
      const hit = hits.find((h) => typeof h.object.userData.id === 'string');
      return hit ? (hit.object.userData.id as string) : null;
    }

    function tryPick3d(clientX: number, clientY: number) {
      // Panorama mode: raycast annotation sprites first (PRD-022 / ADR-074
      // Phase 2E). Hit → open annotation card; miss → fall through.
      if (panoramaActive && panoramaSkybox) {
        const rect = el3d.getBoundingClientRect();
        const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
        const hit = panoramaSkybox.raycastAnnotation(ndcX, ndcY, camera);
        if (hit) {
          panoramaActiveAnnotation = hit;
          return;
        }
      }
      // #290 Slice 6b — Earth satellites win over surface sites. Sat
      // hit-spheres are 3u radius and lie outside the planet, so a
      // click landing on both means the user is targeting the
      // satellite. Mutual selection: opening a sat clears the surface-
      // site selection, and selectSite clears selectedSat above.
      const satId = pickSatAt(clientX, clientY);
      if (satId) {
        const o = earthObjectsCache.find((x) => x.id === satId);
        if (o) {
          selectedSat = o;
          selected = null;
          return;
        }
      }
      const id = pickSiteAt(clientX, clientY);
      if (id) {
        selectedSat = null;
        selectSite(id);
      }
    }

    let hoveredSiteId: string | null = null;
    // Raycast against every traverse-stop pin sprite, the
    // traverse-end dot, and the patch-pin landing marker across
    // all loaded rovers / hotspots. Returns a compact tooltip
    // payload (title + optional sol + optional lat/lon).
    function pickStopAt(
      clientX: number,
      clientY: number,
    ): { title: string; sol?: number; label?: string; lat?: number; lon?: number } | null {
      const rect = el3d.getBoundingClientRect();
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const targets: THREE.Object3D[] = [];
      // (a) in-between traverse-stop pin sprites
      for (const tl of traverseLines) {
        for (const sp of tl.stopPins) targets.push(sp);
        targets.push(tl.endDot);
      }
      // (b) per-hotspot patch-pin (landing marker, green flat disc)
      for (const h of hotspots) {
        if (!h.tier2Group || !h.tier2Group.visible) continue;
        h.tier2Group.traverse((obj) => {
          if (obj instanceof THREE.Mesh && obj.userData?.kind === 'patch-pin') {
            targets.push(obj);
          }
        });
      }
      if (targets.length === 0) return null;
      const hits = ray.intersectObjects(targets, false);
      const hit = hits.find((h) => h.object.userData?.kind);
      if (!hit) return null;
      const ud = hit.object.userData;
      if (ud.kind === 'traverse-stop') {
        return {
          title: `Sol ${ud.stopSol}`,
          sol: ud.stopSol,
          label: ud.stopLabel,
        };
      }
      if (ud.kind === 'traverse-end') {
        return {
          title: ud.stopLabel ?? 'Current position',
          sol: ud.stopSol,
          lat: ud.stopLat,
          lon: ud.stopLon,
        };
      }
      if (ud.kind === 'patch-pin') {
        const site = sites.find((s) => s.id === ud.siteId);
        if (!site) return null;
        return {
          title: 'Landing site',
          label: site.landing_date ? `Landed ${site.landing_date}` : undefined,
          lat: site.lat,
          lon: site.lon,
        };
      }
      return null;
    }
    const onHover = (e: MouseEvent) => {
      if (isDrag) return;
      hoveredSiteId = pickSiteAt(e.clientX, e.clientY);
      const stopHit = pickStopAt(e.clientX, e.clientY);
      hoveredStopInfo = stopHit ? { ...stopHit, clientX: e.clientX, clientY: e.clientY } : null;
    };
    const onHoverLeave = () => {
      hoveredSiteId = null;
      hoveredStopInfo = null;
    };

    // Tracked so the window-level mouseup listener can distinguish
    // "user clicked the canvas" from "user clicked a panel button and
    // mouseup bubbled up to window". Without this, a click on a tab
    // button reaches the window mouseup, raycasts at the button's
    // coordinates, and accidentally selects whatever hotspot/site
    // sits behind the cursor in 3D space.
    let mouseDownOnCanvas = false;
    const onMouseDown = (e: MouseEvent) => {
      mouseDownOnCanvas = true;
      isDrag = true;
      dragMoved = false;
      lmx = e.clientX;
      lmy = e.clientY;
      downX = e.clientX;
      downY = e.clientY;
      // Cancel an in-flight fly-in if the user grabs the planet.
      flyActive = false;
      // Reset inertia velocities — fresh drag starts from rest.
      camTVelocity = 0;
      camPVelocity = 0;
      el3d.style.cursor = 'grabbing';
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDrag) return;
      if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 4) dragMoved = true;
      // Zoom-relative drag sensitivity. Original 0.005 was right at
      // wide zoom but threw the view across the patch on a single
      // mouse twitch at camR ≈ 30. Curve: linear (camR/100) was too
      // soft at close zoom (still lost the traverse on light touch
      // — image 19 feedback). Power 1.8 makes it 8× slower at
      // camR=30 vs the wide-zoom feel (was ~3× with linear).
      const dragK = 0.005 * Math.min(1, Math.pow(camR / 100, 1.8));
      const dT = -(e.clientX - lmx) * dragK;
      const dP = (e.clientY - lmy) * dragK;
      camTVelocity = dT;
      camPVelocity = dP;
      camT += dT;
      // Panorama-mode tilt clamp (±20°); normal mode has near-pole clamp.
      if (panoramaActive) {
        // ±85° free pitch (PRD-022 / ADR-074 Phase 2D, was ±20°).
        // Synthetic-region microcopy honest-discloses gaps.
        const tiltClamp = 1.484;
        camP = Math.max(Math.PI / 2 - tiltClamp, Math.min(Math.PI / 2 + tiltClamp, camP + dP));
      } else {
        camP = Math.max(0.15, Math.min(Math.PI - 0.15, camP + dP));
      }
      lmx = e.clientX;
      lmy = e.clientY;
      updateCam();
    };
    const onMouseUp = (e: MouseEvent) => {
      const wasOnCanvas = mouseDownOnCanvas;
      mouseDownOnCanvas = false;
      const wasDrag = dragMoved;
      isDrag = false;
      el3d.style.cursor = 'grab';
      if (wasOnCanvas && !wasDrag && view === '3d') tryPick3d(e.clientX, e.clientY);
    };
    const onWheel = (e: WheelEvent) => {
      // preventDefault prevents trackpad pinch-zoom from triggering
      // browser-level zoom (Cmd-scroll). Registered with passive:false
      // below so this works.
      e.preventDefault();
      // Update camRTarget instead of camR directly — RAF lerps toward
      // the target at 15%/frame for a smooth viscous-zoom feel.
      // ADR-072 §Drift 13 consolidation.
      // Zoom-relative wheel sensitivity — same curve as the drag
      // sensitivity so a wheel notch is proportional to current
      // zoom (one notch at camR=200 zooms a lot; at camR=30 zooms a
      // little). Avoids over-shooting through the patch on a single
      // scroll click.
      const wheelK = 0.05 * Math.min(1, Math.pow(camR / 100, 1.8));
      camRTarget = Math.max(30.08, Math.min(200, camRTarget + e.deltaY * wheelK));
      flyActive = false; // wheel cancels any in-flight fly-in
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
        flyActive = false;
        camTVelocity = 0;
        camPVelocity = 0;
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
        // Update camRTarget — smooth-zoom lerp picks it up in RAF.
        camRTarget = Math.max(30.2, Math.min(200, camRTarget * (pinchPrev / d)));
        flyActive = false;
        pinchPrev = d;
        return;
      }
      if (!touchActive || e.touches.length !== 1) return;
      if (
        Math.abs(e.touches[0].clientX - touchDownX) + Math.abs(e.touches[0].clientY - touchDownY) >
        6
      )
        touchMoved = true;
      // Mirror the mouse drag's zoom-relative curve so touch users
      // get the same close-zoom calm-down.
      const touchDragK = 0.005 * Math.min(1, Math.pow(camR / 100, 1.8));
      const dT = -(e.touches[0].clientX - lmx) * touchDragK;
      const dP = (e.touches[0].clientY - lmy) * touchDragK;
      camTVelocity = dT;
      camPVelocity = dP;
      camT += dT;
      // Panorama-mode ±85° free pitch (PRD-022 / ADR-074 Phase 2D),
      // same as the mouse path.
      if (panoramaActive) {
        const tiltClamp = 1.484;
        camP = Math.max(Math.PI / 2 - tiltClamp, Math.min(Math.PI / 2 + tiltClamp, camP + dP));
      } else {
        camP = Math.max(0.15, Math.min(Math.PI - 0.15, camP + dP));
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

    // 2D context + body-specific raster source. Two projection modes:
    //   - 'lunar-polar-discs' (Moon): near + far hemispheres as separate
    //     orthographic discs. Loads two moon_near/_far.jpg assets.
    //   - 'equirectangular' (Mars, future Earth): single 2:1 flat map.
    //     Loads config.textureUrl directly into an HTMLImageElement.
    // Per ADR-038 / ADR-072 — Moon is tidally locked so two-disc is
    // the only honest projection; Mars rotates so equirectangular fits.
    const c2 = canvas2d;
    const _maybeCtx = c2.getContext('2d');
    if (!_maybeCtx) throw new Error('2D context unavailable');
    const ctx2: CanvasRenderingContext2D = _maybeCtx;

    const moonNearImg = new Image();
    const moonFarImg = new Image();
    const equirectImg = new Image();
    let nearReady = false;
    let farReady = false;
    let equirectReady = false;
    if (config.twoDMode === 'lunar-polar-discs') {
      moonNearImg.src = `${base}/textures/moon_near.jpg`;
      moonFarImg.src = `${base}/textures/moon_far.jpg`;
      moonNearImg.onload = () => {
        nearReady = true;
        if (view === '2d') draw2d();
      };
      moonFarImg.onload = () => {
        farReady = true;
        if (view === '2d') draw2d();
      };
    } else {
      equirectImg.src = config.textureUrl;
      equirectImg.onload = () => {
        equirectReady = true;
        if (view === '2d') draw2d();
      };
    }

    function draw2d() {
      // Defensive resize
      if (c2.width !== c2.clientWidth || c2.height !== c2.clientHeight) {
        c2.width = c2.clientWidth;
        c2.height = c2.clientHeight;
      }
      const W = c2.width;
      const H = c2.height;
      if (W === 0 || H === 0) return;
      if (config.twoDMode === 'equirectangular') {
        drawEquirectangular(W, H);
        return;
      }

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

    // Equirectangular 2D mode — Mars (and future Earth-surface). Single
    // 2:1 flat map with optional graticule + traverses + markers +
    // orbiter strip. Port of /mars's draw2d (per ADR-038 / ADR-072
    // Drift 18 — 2D pick tolerance set to 20 in on2dClick below).
    function drawEquirectangular(W: number, H: number) {
      ctx2.clearRect(0, 0, W, H);
      ctx2.fillStyle = '#04040c';
      ctx2.fillRect(0, 0, W, H);

      // Equirectangular map: 2:1 aspect → fit within container.
      const mapW = Math.min(W - 40, (H - 80) * 2);
      const mapH = mapW / 2;
      const mapX = (W - mapW) / 2;
      const mapY = (H - mapH) / 2;

      if (equirectReady) {
        ctx2.drawImage(equirectImg, mapX, mapY, mapW, mapH);
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

      // Traverse polylines beneath markers (active = bright, ended = muted).
      if (layerTraverses && loadTraverses != null) {
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
          let lon = site.lon;
          if (lon < 0) lon += 360;
          const x = mapX + (lon / 360) * mapW;
          const y = mapY + ((90 - site.lat) / 180) * mapH;
          sitePos2d.set(site.id, { x, y });
          const isFailed = site.status === 'CRASHED' || site.status === 'LOST';
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
          ctx2.strokeStyle = '#ffffff';
          ctx2.lineWidth = 1;
          if (isFailed) ctx2.setLineDash([2, 2]);
          ctx2.beginPath();
          ctx2.arc(x, y, 4.5, 0, Math.PI * 2);
          ctx2.stroke();
          ctx2.setLineDash([]);
        }
      }

      // Orbiter "presence indicator" strip along the top.
      if (layerOrbiters) {
        const strip = mapY - 16;
        let x = mapX;
        ctx2.font = "bold 7px 'Space Mono',monospace";
        ctx2.fillStyle = 'rgba(255,255,255,0.5)';
        ctx2.textAlign = 'left';
        ctx2.fillText('IN ORBIT', x, strip);
        x += 60;
        for (const o of sites.filter((s) => s.kind === 'orbiter')) {
          ctx2.fillStyle = colorFor(o);
          ctx2.beginPath();
          ctx2.arc(x, strip - 3, 4, 0, Math.PI * 2);
          ctx2.fill();
          sitePos2d.set(o.id, { x, y: strip - 3 });
          x += 14;
        }
      }

      // Legend
      const legendY = H - 24;
      ctx2.font = "bold 7px 'Space Mono',monospace";
      ctx2.textAlign = 'left';
      drawNationLegend2d(ctx2, { startX: 36, y: legendY, palette: NATION_COLORS });
    }

    function on2dClick(e: MouseEvent) {
      const id = pickClosest2d({
        canvas: c2,
        clientX: e.clientX,
        clientY: e.clientY,
        positions: sitePos2d,
        tolerance: 20,
      });
      if (id) selectSite(id);
    }
    c2.addEventListener('click', on2dClick);

    // Resize + animation loop
    const onResize = createCanvasResizer({
      container,
      camera,
      renderer,
      composer,
      outlinePass,
      onResize: () => {
        // Line2 LineMaterials need their resolution synced with the
        // rendered canvas size, otherwise the screen-pixel linewidth
        // drifts on viewport changes (window resize, sidebar open).
        const w = container?.clientWidth || window.innerWidth;
        const h = container?.clientHeight || window.innerHeight;
        for (const tl of traverseLines) {
          tl.lineMaterial.resolution.set(w, h);
        }
      },
    });
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

      // RAF pause: when the flat patch is fully visible, the sphere is
      // hidden behind it (opacity 0 via the CSS cross-fade) and the
      // entire scene render is wasted CPU/battery. Short-circuit the
      // per-frame body — RAF still queues so we resume cleanly on the
      // 'leaving' phase. Per ADR-062 §"Animation timing" — pause is
      // gated on 'visible' specifically (the entering / leaving phases
      // still need the sphere rendered so the cross-fade reads as a
      // cross-fade rather than a flicker).
      if (flatPatchPhase === 'visible') return;

      // Panorama HUD yaw + pitch readouts (PRD-022 / ADR-074 Phase 2C/2D).
      // camT/camP are in radians; convert + normalise for compass-rose
      // and synthetic-region-microcopy consumption. Cheap when active,
      // skipped entirely otherwise.
      if (panoramaActive) {
        const yawDeg = (camT * 180) / Math.PI;
        panoramaYawDeg = ((yawDeg % 360) + 360) % 360;
        // camP π/2 = horizon → pitch 0; camP 0 = top → +90; camP π = bottom → -90.
        panoramaPitchDeg = 90 - (camP * 180) / Math.PI;

        // Phase 3B — throttled URL state write. Update at most once
        // every 300 ms so dragging the camera doesn't fire goto() per
        // frame. Compares against last-written values to skip no-op
        // writes (e.g. when the user holds the camera still).
        if (now - panoramaUrlLastWriteMs > 300) {
          panoramaUrlLastWriteMs = now;
          syncPanoramaUrl($page.url, {
            entryId: panoramaCurrentEntryId,
            yawDeg: panoramaYawDeg,
            pitchDeg: panoramaPitchDeg,
          });
        }
      }

      // Camera smoothing pipeline (ADR-072 Drifts 12-14 consolidations):
      //   (a) Fly-in tween — ease-out cubic interpolation of camP/T/R.
      //   (b) Smooth zoom — lerp camR toward camRTarget at 15%/frame.
      //   (c) Drag inertia — angular velocity decay 92%/frame.
      // All three are mutually exclusive per-frame: fly-in supersedes
      // zoom + inertia; zoom + inertia run together when fly isn't.
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
          const e = 1 - Math.pow(1 - t, 3); // ease-out cubic
          camP = flyFromP + (flyToP - flyFromP) * e;
          camT = flyFromT + (flyToT - flyFromT) * e;
          camR = flyFromR + (flyToR - flyFromR) * e;
          camRTarget = camR;
        }
        cameraChanged = true;
      } else {
        // (b) Smooth zoom: lerp camR toward camRTarget at 15%/frame.
        if (Math.abs(camR - camRTarget) > 0.001) {
          camR += (camRTarget - camR) * 0.15;
          cameraChanged = true;
        }
        // (c) Drag inertia: after release, decay velocity ~92%/frame
        // and apply to camT/camP until below threshold. Skips while
        // user is actively dragging.
        const dragging = isDrag || touchActive;
        if (!dragging && (Math.abs(camTVelocity) > 0.0001 || Math.abs(camPVelocity) > 0.0001)) {
          camT += camTVelocity;
          camP = Math.max(0.15, Math.min(Math.PI - 0.15, camP + camPVelocity));
          camTVelocity *= 0.92;
          camPVelocity *= 0.92;
          cameraChanged = true;
        } else if (dragging) {
          // While dragging, the move handler resets velocity each move;
          // decay the residual so release doesn't double-fire inertia.
          camTVelocity *= 0.5;
          camPVelocity *= 0.5;
        }
      }
      if (cameraChanged) updateCam();

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
          // Keep the selection halo visible at all tiers — previously
          // hidden at tier ≥ 2 to avoid competing with the surface
          // patch, but that left the user with no visible selection
          // marker once they zoomed in (the panel opened, the camera
          // flew in, but the rectangle disappeared). Now the rect
          // stays visible throughout, with the semi-transparent fill
          // providing the visual anchor that the thin-line outline
          // alone didn't.
          mk.halo.visible = layerSurface && mk.siteId === selId;
        }
      }
      for (const om of orbitalMarkers) {
        applyOrbiterLayerVisibility(om, { showOrbiters: layerOrbiters, showOrbits: layerOrbits });
        if (om.halo) om.halo.visible = layerOrbiters && om.siteId === selId;
      }

      // Earth satellites — gated by master layerOrbiters + per-category
      // chips. Per-spacecraft orbit rings track the master toggle since
      // the regime rings (earthRingsGroup) carry the layerOrbits chip.
      // Empty loop on /moon and /mars (earthSats stays []).
      if (earthSats.length > 0) {
        for (const s of earthSats) {
          const catVisible =
            s.category === 'station'
              ? layerStations
              : s.category === 'telescope'
                ? layerObservatories
                : s.category === 'constellation'
                  ? layerConstellations
                  : s.category === 'comsat'
                    ? layerComsats
                    : s.category === 'moon-orbiter'
                      ? layerMoonOrbiters
                      : true;
          const on = layerOrbiters && catVisible;
          s.group.visible = on;
          if (s.ringMesh) s.ringMesh.visible = on;
        }
      }
      if (earthRingsGroup) earthRingsGroup.visible = layerOrbits;

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

      // Selection state is communicated by the bounding-rect outline +
      // panel state; no scale pulsing (removed per ADR-072 Slice 3
      // §"Remove disc pulse animation"). Markers stay at constant
      // scale 1 — the halo + outline already convey "selected".
      // (Orbiter dot scale also stays constant; the orbital ring +
      // halo do the selection signalling.)

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

        // ADR-073 Layer B per-frame check. Cheap — a single number
        // comparison + a material.map reassignment that only fires on
        // threshold cross. camR is the orbital distance in scene units
        // (planet radius = 30u inside SurfaceScene).
        updatePlanetTextureLod(camR);
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
        // 30.5 → 30.32 (2026-06-01): hold detail fully visible right
        // up to the new SPHERE_TO_FLAT_CAM_R floor, instead of
        // peaking and then having a dead band before flat-patch.
        const detailFadeEnd = 30.32;
        const detailOpacity =
          camR >= detailFadeStart
            ? 0
            : camR <= detailFadeEnd
              ? 1
              : 1 - (camR - detailFadeEnd) / (detailFadeStart - detailFadeEnd);
        // Regional CTX patch reveals EARLIER than the HiRISE detail
        // patch — the user wants to see the wider CTX context first
        // (~30km bbox) and only commit to the inner HiRISE area
        // (~5km bbox) when zoomed deeper. Until 2026-06-01 both
        // layers shared the detailFade window and revealed
        // simultaneously, which made the "level up" zoom look like
        // no progressive detail at all (image 14-17 screenshot
        // sequence — regional + detail both popping in at the same
        // camR). Regional ramp: 50 → 33 (starts at the same camR
        // Tier-2 promotion fires for the detail layer, fully
        // visible by the time detail starts ramping).
        const regionalFadeStart = 50;
        const regionalFadeEnd = 33;
        const regionalOpacity =
          camR >= regionalFadeStart
            ? 0
            : camR <= regionalFadeEnd
              ? 1
              : 1 - (camR - regionalFadeEnd) / (regionalFadeStart - regionalFadeEnd);
        for (const h of hotspots) {
          if (!h.tier2Group) continue;
          // Visible when either ramp has anything to show — regional
          // is the gating signal at wide zoom, detail picks up later.
          h.tier2Group.visible = regionalOpacity > 0.01 || detailOpacity > 0.01;
          h.tier2Group.traverse((obj) => {
            if (!(obj instanceof THREE.Mesh)) return;
            const layer = obj.userData?.layer;
            if (layer !== 'detail' && layer !== 'regional') return;
            const mat = obj.material as THREE.Material & { opacity: number };
            // Split ramps: regional CTX fades in earlier (wider
            // zoom), detail HiRISE fades in later (closer zoom).
            mat.opacity = layer === 'regional' ? regionalOpacity : detailOpacity;
            mat.transparent = mat.opacity < 0.99;
          });
          // ADR-072 Slice 3 §"Hide 3D engineering model when rect region
          // is active": once the rectangular Tier-2 patch is the active
          // representation (ramp > ~0.5), the Tier-1 engineering mesh
          // would compete visually with the region polygon + its photo
          // content. Cross-fade the Tier-1 group opacity inversely to
          // the patch's ramp so they swap cleanly. Engineering model
          // resurfaces at Tier 3 panorama / "stand at site" entry.
          // Tier 0 silhouette + Tier 1 engineering model both cross-
          // fade against the REGIONAL CTX ramp (camR 50 → 33), not the
          // detail HiRISE ramp (33 → 30.32). This means by the time
          // the HiRISE detail patch starts revealing (camR < 33) the
          // 3D lander glyphs are already fully gone — they don't
          // linger on top of the HiRISE imagery. User feedback
          // 2026-06-03: "Tier 1 — 3d model of lander needs to be gone
          // by the time we noticed tier 3 (HiRISE). Now it is there
          // way too long into the zoomed-in region." Engineering
          // model resurfaces when the user pulls back past camR=33
          // and re-mounts at panorama entry as before.
          const lander3dFade = Math.max(0, 1 - regionalOpacity);
          if (h.tier1Group) {
            h.tier1Group.visible = lander3dFade > 0.01;
            h.tier1Group.traverse((obj) => {
              if (!(obj instanceof THREE.Mesh)) return;
              const mat = obj.material as THREE.Material & { opacity: number };
              if ('opacity' in mat) {
                mat.opacity = lander3dFade;
                mat.transparent = lander3dFade < 0.99;
              }
            });
          }
          if (h.tier0Group) {
            h.tier0Group.visible = lander3dFade > 0.01;
            h.tier0Group.traverse((obj) => {
              if (!(obj instanceof THREE.Mesh)) return;
              const mat = obj.material as THREE.Material & { opacity: number };
              if ('opacity' in mat) {
                mat.opacity = lander3dFade;
                mat.transparent = lander3dFade < 0.99;
              }
            });
          }
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
          // Screen-pixel-stable sizing for every traverse marker
          // (pins, end-dot, captions). World-fixed sizes turned the
          // markers into screen-filling blobs at deep zoom and into
          // invisible dots at wide zoom — neither read as a useful
          // map. Compute the world units that correspond to ONE
          // screen pixel at the camera's current distance to the
          // patch, then size each marker for a fixed screen-pixel
          // target (image 19 feedback, 2026-06-02).
          //
          // worldPerPx = (2 * d * tan(fovY/2)) / viewportH
          // where d ≈ distance from camera to surface (camR - 30).
          const surfaceDistance = Math.max(0.05, camR - 30);
          const viewportH = renderer.domElement.clientHeight || window.innerHeight;
          const worldPerPx =
            (2 * surfaceDistance * Math.tan((camera.fov * Math.PI) / 360)) / viewportH;
          // Target screen sizes (px). Smaller pin head reads as a
          // map marker rather than a road sign; caption is large
          // enough to scan-read; end-dot is a tight punctuation mark.
          const pinHeightPx = 26;
          const endDotPx = 8;
          const captionWidthPx = 140;
          // Pin sprite has base scale (1, 1.5, 1) and canvas 64×96,
          // so the visible-height-to-base-Y-scale ratio is 1 (=> the
          // base Y scale IS the world height when stopScale is 1).
          const pinWorldH = pinHeightPx * worldPerPx;
          const pinWorldW = (64 / 96) * pinWorldH;
          // End-dot sphere geometry has radius 0.022u (diameter 0.044u).
          // Target diameter in world units = endDotPx * worldPerPx.
          const endDotScale = (endDotPx * worldPerPx) / 0.044;
          // Patch-pin (green landing disc) has geometry radius 0.005u
          // (diameter 0.01u). Per-frame scale to the same screen-px
          // size as endDot so green + red read as a matched pair.
          const patchPinScale = (endDotPx * worldPerPx) / 0.01;
          for (const h of hotspots) {
            if (!h.tier2Group) continue;
            h.tier2Group.traverse((obj) => {
              if (obj instanceof THREE.Mesh && obj.userData?.kind === 'patch-pin') {
                obj.scale.set(patchPinScale, patchPinScale, 1);
              }
            });
          }
          // Caption inner sprite scale is (0.32 wide, 0.32*(96/512)
          // tall) when buildTraverseCaption is called with worldSize
          // 0.32 — so a group.scale multiplier of (target / 0.32)
          // yields the requested screen width.
          const captionScale = (captionWidthPx * worldPerPx) / 0.32;
          // Caption position offsets — kept tight to the anchor so
          // labels stick close to the start/end dots rather than
          // floating off (caps-lock feedback after image 20).
          const captionTangentOffsetPx = 30;
          const captionRadialOffsetPx = 10;
          const tangentOffsetWorld = captionTangentOffsetPx * worldPerPx;
          const radialOffsetWorld = captionRadialOffsetPx * worldPerPx;
          for (const tl of traverseLines) {
            tl.line.visible = travVisible;
            tl.endDot.visible = travVisible;
            if (tl.startLabel) tl.startLabel.visible = travVisible;
            if (tl.endLabel) tl.endLabel.visible = travVisible;
            tl.lineMaterial.opacity = detailOpacity * (tl.isActive ? 0.95 : 0.7);
            const dotMat = tl.endDot.material as THREE.MeshBasicMaterial;
            // No pulse — flat 95% opacity for active rovers, 85% for ended (was
            // `tl.isActive ? pulse : 0.85` with pulse = sin(now*0.006)*0.25+0.7).
            dotMat.opacity = detailOpacity * (tl.isActive ? 0.95 : 0.85);
            tl.endDot.scale.setScalar(endDotScale);
            // Reposition captions each frame so they sit ~70 px
            // tangentially + ~30 px outward from the anchor dot
            // regardless of zoom level. World-fixed offsets either
            // overlapped the dot at wide zoom or floated 1000 px
            // away at close zoom.
            if (tl.startLabel) {
              tl.startLabel.scale.setScalar(captionScale);
              const startTangent = tl.tangent.clone().negate();
              const startCaptionPos = tl.startAnchor
                .clone()
                .addScaledVector(startTangent, tangentOffsetWorld)
                .normalize()
                .multiplyScalar(tl.surfaceRadius + radialOffsetWorld);
              tl.startLabel.position.copy(startCaptionPos);
              tl.startLabel.traverse((o) => {
                if (o instanceof THREE.Sprite) {
                  const m2 = o.material as THREE.SpriteMaterial;
                  m2.opacity = detailOpacity;
                }
              });
            }
            if (tl.endLabel) {
              tl.endLabel.scale.setScalar(captionScale);
              const endCaptionPos = tl.endAnchor
                .clone()
                .addScaledVector(tl.tangent, tangentOffsetWorld)
                .normalize()
                .multiplyScalar(tl.surfaceRadius + radialOffsetWorld);
              tl.endLabel.position.copy(endCaptionPos);
              tl.endLabel.traverse((o) => {
                if (o instanceof THREE.Sprite) {
                  const m2 = o.material as THREE.SpriteMaterial;
                  m2.opacity = detailOpacity;
                }
              });
            }
            // Gate the in-between stop pins on a tighter threshold
            // than the line — pins only make sense once HiRISE detail
            // is substantially in (detailOpacity > 0.6 ≈ camR < ~31.5),
            // otherwise they read as confetti scattered across an
            // un-textured rectangle (image 21 feedback, 2026-06-03).
            // Line + start/end + captions stay on the wider gate so
            // the user gets a path-preview earlier in the zoom.
            const stopPinsVisible = travVisible && detailOpacity > 0.6;
            for (const sp of tl.stopPins) {
              sp.visible = stopPinsVisible;
              sp.scale.set(pinWorldW, pinWorldH, 1);
              (sp.material as THREE.SpriteMaterial).opacity = detailOpacity;
            }
          }
        }

        // Distance scale bar — visible whenever either tier-2 layer
        // is fading in (regional CTX or detail HiRISE). Picks a
        // "nice" 1 / 2 / 5 × 10ⁿ round-number km value whose pixel
        // width is closest to TARGET_BAR_PX (≈ 110 px); the bar
        // overlay below the canvas renders at the resolved width.
        if (regionalOpacity > 0.01 || detailOpacity > 0.01) {
          const surfaceDistanceForBar = Math.max(0.05, camR - 30);
          const viewportHForBar = renderer.domElement.clientHeight || window.innerHeight;
          const worldPerPxForBar =
            (2 * surfaceDistanceForBar * Math.tan((camera.fov * Math.PI) / 360)) / viewportHForBar;
          const kmPerWorldUnit = config.radiusKm / planetRadius;
          const kmPerPx = worldPerPxForBar * kmPerWorldUnit;
          const TARGET_BAR_PX = 110;
          const targetKm = kmPerPx * TARGET_BAR_PX;
          const exp = Math.floor(Math.log10(targetKm));
          const base = targetKm / Math.pow(10, exp);
          let mantissa: number;
          if (base < 1.5) mantissa = 1;
          else if (base < 3.5) mantissa = 2;
          else if (base < 7.5) mantissa = 5;
          else mantissa = 10;
          const niceKm = mantissa * Math.pow(10, exp);
          const widthPx = niceKm / kmPerPx;
          const label =
            niceKm >= 1
              ? `${niceKm} km`
              : niceKm >= 0.001
                ? `${Math.round(niceKm * 1000)} m`
                : `${(niceKm * 1000).toFixed(1)} m`;
          // Skip the assignment if values are unchanged — keeps
          // Svelte from re-rendering the overlay every frame.
          if (!scaleBar || Math.abs(scaleBar.widthPx - widthPx) > 0.5 || scaleBar.label !== label) {
            scaleBar = { widthPx, label };
          }
        } else if (scaleBar !== null) {
          scaleBar = null;
        }

        // TierContext info card (PRD-014 §v0.7.x). Surfaces
        // attribution for the layers currently composed on the
        // patch. Trigger condition changed 2026-06-01: show the
        // card whenever EITHER the regional ramp OR the detail
        // ramp has anything visible, not only when the dispatcher
        // has promoted a hotspot to Tier 2 (which fires at
        // ~camR=38). Before this, the CTX context layer would
        // fade in at camR 50-38 with no on-screen explanation of
        // what the user was looking at (image 18 feedback).
        // Prefer the user-selected site whenever it has any tier
        // promotion — multiple hotspots can be at the same Tier 2
        // simultaneously (e.g. Viking 2 + Perseverance both
        // visible at this zoom), and letting array-order win the
        // tie surfaced the wrong card text on the wrong patch
        // (image 21 feedback: card said "Viking 2 lander" while
        // the highlighted rectangle was Perseverance).
        let bestH: { siteId: string } | null = null;
        if (selected) {
          const selectedH = hotspots.find((h) => h.siteId === selected!.id);
          if (selectedH && selectedH.currentTier > 0) {
            bestH = { siteId: selectedH.siteId };
          }
        }
        if (!bestH) {
          let bestTier = 0;
          for (const h of hotspots) {
            if (h.currentTier > bestTier) {
              bestTier = h.currentTier;
              bestH = { siteId: h.siteId };
            }
          }
        }
        // Final fallback to the selected site when no hotspot is
        // promoted yet — needed for the wider-zoom CTX window.
        if (!bestH && selected) {
          bestH = { siteId: selected.id };
        }
        const anyLayerVisible = regionalOpacity > 0.01 || detailOpacity > 0.01;
        if (bestH && anyLayerVisible) {
          const site = sites.find((s) => s.id === bestH!.siteId);
          if (site) {
            const hasRegional = !!site.hotspot_tier2_regional_source;
            const hasDetail = !!site.hotspot_tier2_source;
            const agencyChip = nationChipFor(site);
            const layers: TierLayer[] = [];
            // Regional layer — honest per-planet attribution. Mars
            // patches are 2048² JPEG crops of MRO CTX (Context
            // Camera) mosaics: ~5-6 m/px native, served over a
            // ~30 km square = ~15 m/px effective. Moon will fill
            // with Chang'e 2 / LROC WAC when Phase 2 lands; until
            // then it stays as a "placeholder" labelled row so
            // the disagreement is visible.
            if (hasRegional) {
              if (config.planet === 'mars') {
                layers.push({
                  layerLabel: 'Regional view',
                  sourceTitle: 'MRO CTX context mosaic',
                  sourceAuthor: 'NASA / JPL / MSSS / Murray Lab',
                  resolutionText: '~15 m/px (from CTX ~5 m/px native)',
                  sourceUrl: 'https://www.msss.com/mars_images/moc/MENU.html',
                  licenseShort: 'PD-NASA',
                  // CTX absolute georeferencing — typically ~100 m on
                  // Mars (better in regions tied to HRSC / MOLA, worse
                  // where it isn't). Honest middle estimate.
                  uncertaintyM: 100,
                });
              } else {
                layers.push({
                  layerLabel: 'Regional view',
                  sourceTitle: 'Regional mosaic',
                  sourceAuthor: 'TBD — placeholder until Phase 2 lands',
                  resolutionText: 'TBD',
                  licenseShort: 'TBD',
                });
              }
            }
            if (hasDetail) {
              // Per-planet detail-tier source attribution. Until 2026-06
              // this was hardcoded to LROC NAC across all planets, which
              // surfaced "LROC NAC ROI mosaic / NASA / GSFC / ASU LROC
              // team" on Mars Tier-2 patches — false provenance, since
              // the patches actually come from MRO HiRISE / CTX. Dispatch
              // by config.planet so each route reads honest credit.
              if (config.planet === 'mars') {
                layers.push({
                  layerLabel: 'Detail view',
                  sourceTitle: 'HiRISE detail patch',
                  sourceAuthor: 'NASA / JPL / UArizona / HiRISE team',
                  // We serve 2048² JPEG crops of HiRISE products, which
                  // works out to ~7 m/px on a typical landing-region
                  // bounding box. Source HiRISE is ~0.25 m/px native;
                  // raising the patch resolution is fetch-pipeline work
                  // tracked separately.
                  resolutionText: '~7 m/px (from HiRISE 0.25 m/px native)',
                  sourceUrl: 'https://www.uahirise.org/',
                  licenseShort: 'PD-NASA',
                });
              } else {
                layers.push({
                  layerLabel: 'Detail view',
                  sourceTitle: 'LROC NAC ROI mosaic',
                  sourceAuthor: 'NASA / GSFC / Arizona State University LROC team',
                  resolutionText: '5 m/px',
                  sourceUrl: 'https://pds.lroc.im-ldi.com/',
                  licenseShort: 'PD-NASA',
                });
              }
            }
            tierContext = buildTierContext({ site, agencyChip, layers });
          }
        } else if (tierContext !== null) {
          tierContext = null;
        }

        // Debug overlay write — guarded by showDebug (?debug=1).
        // Same shape as /mars's debugInfo block.
        // Live altitude (km above surface). camR is in scene units;
        // multiply by `radiusKm/planetRadius` km/unit to get real km.
        // Updated every frame regardless of ?debug=1 so the HUD chip
        // (altitude indicator) stays correct.
        altitudeKm = Math.max(0, (camR - planetRadius) * (config.radiusKm / planetRadius));

        // Sphere → flat-patch transition trigger (ADR-062). Once the
        // camera crosses SPHERE_TO_FLAT_CAM_R = 30.3 with a region
        // selected, start the entering-fade (sphere out, flat-patch
        // in over 600 ms ease-in-out). Only TRIGGERS the entering
        // phase — the back gesture reverses it.
        //
        // 2026-06-03 — bug fix: this trigger was previously nested
        // INSIDE `if (showDebug)` along with the debug-only readouts.
        // Without `?debug=1` the user could wheel-zoom all the way
        // to the sphere camR floor (30.08) and flat-patch never
        // fired — stuck at near-tangent camera with only the green
        // patch-pin visible. Trigger lifted to top-level so it runs
        // every frame; debug block below now contains only debug
        // overlay state.
        const SPHERE_TO_FLAT_CAM_R = 30.3;
        if (
          flatPatchPhase === 'hidden' &&
          selected != null &&
          selected.region_bounds != null &&
          camR < SPHERE_TO_FLAT_CAM_R
        ) {
          if (flatPatchTransitionTimer) clearTimeout(flatPatchTransitionTimer);
          flatPatchPhase = 'entering';
          flatPatchTransitionTimer = setTimeout(() => {
            flatPatchPhase = 'visible';
            flatPatchTransitionTimer = null;
          }, FLAT_PATCH_FADE_MS);
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
      for (const h of earthLayerHandles) h.dispose();
      stopPanoramaEscape();
      panoramaSkybox?.dispose();
      stopCanvasInputs();
      c2.removeEventListener('click', on2dClick);
      window.removeEventListener('resize', onResize);
      disposeScene(scene);
      // ADR-073 Layer B — explicitly dispose the lazy-loaded 4K
      // texture. disposeScene only walks the scene graph; when the
      // active LOD is 2K, the 4K texture is held in this closure but
      // not attached to anything reachable through the scene tree.
      // Without this dispose the 4K texture stays resident in GPU
      // memory after route teardown.
      planetMap4k?.dispose();
      disposeSceneRenderer({ renderer, outlinePass });
    };
  });

  onDestroy(() => {
    cleanup?.();
    tourCameraTeardown?.();
  });
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

  <div
    class="layer"
    bind:this={container}
    class:hidden={view !== '3d'}
    class:flat-patch-fading={flatPatchPhase !== 'hidden'}
  ></div>
  <!-- 2D fallback canvas — equirectangular for /mars, lunar-polar-discs
       for /moon. On /earth (config.disable2D) the toggle button + view
       state are suppressed so the canvas stays permanently hidden;
       it's still mounted so the 2D-setup code in onMount can read
       canvas2d without conditional plumbing. -->
  <canvas
    class="layer"
    bind:this={canvas2d}
    class:hidden={view !== '2d' || config.disable2D}
    aria-label={m.moon_canvas_label()}
    data-sites-count={sites.length}
  ></canvas>

  <!-- Top-left HUD cluster (matches /explore + /mars convention from v0.4).
       Hidden in panorama mode — the 2D / Surface / Orbiters / Hotspots
       chips control the planet sphere view and don't apply to the
       ground-view skybox, and their stack visually buried the
       Exit-panorama floating button (image 21 feedback, 2026-06-03). -->
  {#if !panoramaActive}
    <div
      class="hud-controls"
      data-audio-stage="surface-hud"
      role="group"
      aria-label={m.ui_view_controls()}
    >
      <div class="ctrl-row">
        {#if !config.disable2D}
          <ViewToggleButton
            is2d={view === '2d'}
            label={view === '3d' ? m.moon_label_view_2d() : m.moon_label_view_3d()}
            onToggle={toggleView}
          />
        {/if}
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
            // Earth-only satellite-category chips (#290 Slice 6). Sub-
            // gating on top of the master ORBITERS chip — visible only
            // when earthOrbitalLayers.satellites is configured. Labels
            // mirror EarthOrbitalScene's existing strings (STATIONS /
            // OBSERVATORIES are intentional untranslated literals; the
            // others use the shared ui_layer_* bundle).
            ...(config.earthOrbitalLayers?.satellites != null
              ? [
                  {
                    testid: 'layer-stations',
                    label: 'STATIONS',
                    title: m.earth_layer_tip_habitats(),
                    active: () => layerStations,
                    toggle: () => (layerStations = !layerStations),
                  },
                  {
                    testid: 'layer-observatories',
                    label: 'OBSERVATORIES',
                    title: m.earth_layer_tip_telescopes(),
                    active: () => layerObservatories,
                    toggle: () => (layerObservatories = !layerObservatories),
                  },
                  {
                    testid: 'layer-constellations',
                    label: m.ui_layer_constellations(),
                    title: m.earth_layer_tip_nav(),
                    active: () => layerConstellations,
                    toggle: () => (layerConstellations = !layerConstellations),
                  },
                  {
                    testid: 'layer-comsats',
                    label: m.ui_layer_comsats(),
                    title: m.earth_layer_tip_geo(),
                    active: () => layerComsats,
                    toggle: () => (layerComsats = !layerComsats),
                  },
                  {
                    testid: 'layer-moon-orbiters',
                    label: m.ui_layer_moon_orbiters(),
                    title: m.earth_layer_tip_lunar(),
                    active: () => layerMoonOrbiters,
                    toggle: () => (layerMoonOrbiters = !layerMoonOrbiters),
                  },
                ]
              : []),
          ]}
        />
        <HotspotsLodChip mode={hotspotsMode} onCycle={cycleHotspotsMode} />
      </div>
    </div>
  {/if}

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
  {#if view === '3d' && !flatPatchActive}
    <div class="altitude-indicator" aria-hidden="true">
      {altitudeKm >= 1000
        ? `${(altitudeKm / 1000).toFixed(1)} Mm`
        : altitudeKm >= 1
          ? `${altitudeKm.toFixed(0)} km`
          : `${(altitudeKm * 1000).toFixed(0)} m`} altitude
    </div>
  {/if}

  <!-- Flat ground-patch view (ADR-062 / #283 Slice 4). Materialises
       when the user zooms past the threshold with a region selected.
       Owns the viewport fully while active; back gesture dismisses
       and returns to the sphere at the saved camR/camP/camT. -->
  {#if flatPatchActive && selected && selected.region_bounds}
    <div
      class="flat-patch-wrapper"
      class:entering={flatPatchPhase === 'entering'}
      class:visible={flatPatchPhase === 'visible'}
      class:leaving={flatPatchPhase === 'leaving'}
    >
      <SurfaceFlatPatch {selected} {config} {traverses} onClose={closeFlatPatch} />
    </div>
  {/if}

  <!-- TierContext info card — same shape as /mars. Visible only at
       Tier 2+ when not in panorama mode. aria-live so screen-readers
       announce the layer changes as the user zooms in/out. -->
  {#if view === '3d' && tierContext && !panoramaActive}
    <TierContextCard
      {tierContext}
      scaleNote={'Tier-2 rectangles on the sphere are stylized — true ground extent is sub-pixel at this zoom. Zoom further in to enter the flat-patch view (true scale).'}
    />
  {/if}

  <!-- Hover tooltip — small floating card beside the cursor.
       Renders for: (a) in-between traverse-stop pins (Sol + curated
       label), (b) the red traverse-end dot (current/final position +
       sol + lat/lon), (c) the green patch-pin landing marker
       (landing date + lat/lon). Pointer-events: none so it doesn't
       break the marker's own pickability. -->
  {#if hoveredStopInfo && !panoramaActive}
    <div
      class="traverse-stop-tooltip"
      style="left: {hoveredStopInfo.clientX + 16}px; top: {hoveredStopInfo.clientY + 18}px"
      data-testid="traverse-stop-tooltip"
    >
      <span class="sol mono">{hoveredStopInfo.title}</span>
      {#if hoveredStopInfo.label}
        <span class="label">{hoveredStopInfo.label}</span>
      {/if}
      {#if typeof hoveredStopInfo.sol === 'number'}
        <span class="label mono">Sol {hoveredStopInfo.sol.toLocaleString()}</span>
      {/if}
      {#if typeof hoveredStopInfo.lat === 'number' && typeof hoveredStopInfo.lon === 'number'}
        <span class="label mono">
          {hoveredStopInfo.lat.toFixed(3)}°{hoveredStopInfo.lat >= 0 ? 'N' : 'S'} ·
          {hoveredStopInfo.lon.toFixed(3)}°{hoveredStopInfo.lon >= 0 ? 'E' : 'W'}
        </span>
      {/if}
    </div>
  {/if}

  <!-- Distance scale bar — appears in the bottom-right corner of the
       3D canvas whenever a tier-2 layer is fading in. Width + label
       reflect the on-screen km scale at the current camera zoom
       (image 21 ask, 2026-06-03). Hidden during panorama since
       ground distance is meaningless inside the inverted skybox. -->
  {#if scaleBar && view === '3d' && !panoramaActive}
    <div class="distance-scale" data-testid="distance-scale">
      <div class="distance-scale-bar" style="width: {scaleBar.widthPx}px"></div>
      <div class="distance-scale-label mono">{scaleBar.label}</div>
    </div>
  {/if}

  <!-- Panorama mode overlay (Phase 6 / #118). The "Return to orbit"
       button is the visible exit; ESC also exits. Hidden-text desc
       is read by screen readers for vision-impaired users. -->
  <PanoramaOverlay
    active={panoramaActive}
    description="You are standing at the landing site. The lander is in front of you. Drag to look around. Press the Exit panorama view button in the detail panel, or press Esc, to return to orbit."
    annotations={currentPanoramaEntry?.annotations ?? selected?.panorama_annotations ?? []}
    onAnnotationActivate={(ann) => (panoramaActiveAnnotation = ann)}
  />

  <!-- Panorama caption overlay (PRD-022 / ADR-074, #286 Phase 2B). -->
  {#if selected}
    <PanoramaCaptionOverlay
      active={panoramaActive}
      metadata={activePanoramaMetadata}
      agency={selected.agency}
      agencyColor={colorFor(selected)}
      fallbackCaption={`Surface panorama at ${selected.name ?? selected.id}.`}
    />
  {/if}

  <!-- Panorama compass rose (PRD-022 / ADR-074, #286 Phase 2C). -->
  <PanoramaCompassRose
    active={panoramaActive}
    yawDeg={panoramaYawDeg}
    compassZeroDirection={activePanoramaMetadata?.compass_zero_direction ?? null}
  />

  <!-- Honest synthetic-region microcopy (PRD-022 / ADR-074, #286 Phase 2D). -->
  <PanoramaSyntheticRegionMicrocopy
    active={panoramaActive}
    pitchDeg={panoramaPitchDeg}
    syntheticRegions={activePanoramaMetadata?.synthetic_regions ?? null}
  />

  <!-- Annotation caption card (PRD-022 / ADR-074, #286 Phase 2E). -->
  <PanoramaAnnotationCard
    annotation={panoramaActiveAnnotation}
    onDismiss={() => (panoramaActiveAnnotation = null)}
  />

  <!-- Multi-panorama cycler (PRD-022 / ADR-074, #286 Phase 2F). -->
  {#if selected}
    <PanoramaCycler
      active={panoramaActive}
      set={selected.panorama_set}
      currentId={panoramaCurrentEntryId}
      onCycle={(entry) => {
        if (!panoramaSkybox || !selected) return;
        panoramaCurrentEntryId = entry.id;
        panoramaActiveAnnotation = null;
        void panoramaSkybox.swapTexture(`${base}${entry.url}`).then(() => {
          if (!panoramaSkybox || !selected) return;
          panoramaSkybox.mountAnnotations(entry.annotations ?? [], colorFor(selected));
        });
      }}
    />
  {/if}

  <!-- Cross-link footer (PRD-022 / ADR-074, #286 Phase 2G). -->
  {#if selected}
    <PanoramaCrossLink
      active={panoramaActive}
      routeBase={config.planet === 'mars' ? '/mars' : config.planet === 'moon' ? '/moon' : '/earth'}
      missionId={selected.id}
      traverseStopLink={selected.traverse_stop_link ?? null}
      fleetEntryId={selected.id}
      audioEpisodeId={null}
    />
  {/if}

  <!-- Fullscreen toggle (PRD-022 / ADR-074, #286 Phase 3A). F key
       shortcut while panorama active. Falls back gracefully when
       the browser doesn't support requestFullscreen(). -->
  <PanoramaFullscreenToggle active={panoramaActive} />

  <!-- Floating Exit-Panorama chip — only renders when the right-side
       detail panel is closed (the canonical Exit button lives inside
       the panel, so if it's open the user has that path). When the
       panel is closed the chip lands top-left, occupying the now-
       empty corner. Esc remains the keyboard shortcut. -->
  {#if panoramaActive && !panelOpen}
    <button
      type="button"
      class="panorama-floating-exit"
      onclick={() => exitPanorama()}
      data-testid="panorama-floating-exit"
      title="Exit panorama view (Esc)"
    >
      <span class="x mono" aria-hidden="true">✕</span>
      <span>Exit panorama</span>
    </button>
  {/if}

  <!-- Auto-tour guided mode (PRD-022 / ADR-074, #286 Phase 3C).
       'Play tour' pans through panorama annotations one-by-one,
       opening the caption card at each stop. Reduced-motion users
       get a manual stepper instead. Hidden when < 2 annotations. -->
  <PanoramaAutoTour
    active={panoramaActive}
    annotations={currentPanoramaEntry?.annotations ?? selected?.panorama_annotations ?? []}
    onStep={(ann, reducedMotion) => {
      panAutoTourTo(ann.yaw_deg, ann.pitch_deg, reducedMotion);
      panoramaActiveAnnotation = ann;
    }}
    onStop={() => {
      // Tour finished or stopped — leave the last caption card open
      // unless user dismisses it explicitly. No state cleanup beyond
      // what the AutoTour component already does.
    }}
  />

  <!-- Nation legend overlay. The 2D view paints this directly into
       the canvas (line 617 of the 2D draw); the 3D view is a Three.js
       scene that can't host text reliably, so we mirror the legend as
       a CSS overlay. Same NATION_COLORS keep the two views in sync. -->
  {#if view === '3d' && !panoramaActive}
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
      {@const tone = statusTone(selected.status, selected.kind)}
      <div class="head" style:--accent={colorFor(selected)}>
        <div class="agency-row">
          <span class="agency-badge" style:background-color={colorFor(selected)}>
            {selected.nation} · {selected.agency}
          </span>
          <span class="status" style="color: {tone.color}; border-color: {tone.color}">
            {tone.label}
          </span>
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
        <!-- "Zoom to detail" — flies the camera in to the close range
             where the HiRISE/LROC detail patch is fully visible. Only
             rendered when the site declares a Tier-2 source (otherwise
             the patch wouldn't load and the button would be a no-op).
             Hidden during panorama mode — you're already there. -->
        {#if selected.hotspot_tier2_source && !panoramaActive}
          <button
            type="button"
            class="zoom-to-detail-button"
            data-testid="zoom-to-detail"
            onclick={() => selected && flyToDetail?.(selected)}
          >
            <span class="icon" aria-hidden="true">⤓</span>
            <span>Zoom to detail</span>
          </button>
        {/if}
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

        <!-- Historic-milestone cross-link to /science/history. Issue #303
             follow-up: closes Apollo 11 orphan. Per-site map keeps the
             feature inline (no schema change) and naturally extends as
             more landmark sites land. -->
        {#if selected.id === 'apollo11'}
          <a class="mission-link" href="{base}/science/history/apollo-11-1969">
            {m.surface_panel_historic_milestone()}
          </a>
        {/if}

        {#if selected.linked_missions && selected.linked_missions.length > 0}
          <section
            class="launches-from-here"
            aria-label={m.surface_panel_launches_from_here_title()}
          >
            <h3>{m.surface_panel_launches_from_here_title()}</h3>
            <ul class="launches-from-here-chips">
              {#each selected.linked_missions as missionId (missionId)}
                <li>
                  <a
                    class="launches-chip"
                    href="{base}/missions?id={missionId}"
                    data-testid="launches-from-here-chip"
                  >
                    {missionId.replace(/([a-z])(\d)/g, '$1 $2').toUpperCase()}
                  </a>
                </li>
              {/each}
            </ul>
          </section>
        {/if}

        {#if selected.credit}
          <div class="credit">{selected.credit}</div>
        {/if}

        <!-- /earth launch-complex overview gets the same next/recent
             flights widget the fleet panels use. The widget self-hides
             when there are no manifest matches, so /moon and /mars
             surface sites stay clean — this is effectively earth-only
             without a per-route gate. -->
        {#if config.planet === 'earth'}
          <LauncherFlightsWidget launcherId={selected.id} />
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

  <!-- #290 Slice 6b — Earth-satellite info panel. Mounted only when
       the route configured earthOrbitalLayers; on /moon and /mars the
       block renders open=false. selectedSat is mutually exclusive
       with `selected` (the surface-site panel) — click handlers null
       one when setting the other. -->
  {#if config.earthOrbitalLayers}
    <EarthObjectPanel
      selected={selectedSat}
      open={selectedSat != null}
      onClose={() => (selectedSat = null)}
      missionIds={earthMissionIds}
    />
  {/if}
</div>

<!-- Unified Science Lens panel — lens story + per-route layer toggles.
     Pre-#303 this was hardcoded with /moon's title/body/available
     for every route mounting SurfaceScene (#290 unification artifact:
     /earth + /mars inherited /moon's lens copy and a single dead
     `tidal-lock` chip). config.lensPanel now drives per-route content;
     /moon kept its prior values as the explicit fallback so any caller
     that forgets to set lensPanel still gets the original behaviour. -->
<ScienceLayersPanel
  title={config.lensPanel?.title ?? 'The Moon · 384 000 km out, three days each way'}
  body={config.lensPanel?.body ??
    "Lunar surface gravity is 1/6 g; a vacuum-thin exosphere offers no aerobraking, so every mission has to carry full ∆v for the descent. Apollo's free-return trajectory let the Earth-Moon-Earth figure-8 act as a built-in abort path."}
  tab={config.lensPanel?.tab ?? 'transfers'}
  section={config.lensPanel?.section ?? 'free-return'}
  available={config.lensPanel?.available ?? ['tidal-lock']}
/>

<style>
  .surface-scene {
    position: absolute;
    inset: var(--nav-height) 0 0 0;
    overflow: hidden;
  }

  /* Cross-fade between sphere (3D canvas in .layer) and flat-patch
   * wrapper. 600 ms ease-in-out cubic per ADR-062.
   * 'entering': sphere → 0 over first 60% (360 ms); flat patch 0 → 1
   *   over the full 600 ms with the 40 % tail when sphere is gone.
   * 'leaving': reverse. */
  .layer.flat-patch-fading {
    transition: opacity 600ms cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0;
  }
  .flat-patch-wrapper {
    position: absolute;
    inset: 0;
    z-index: 4;
    opacity: 0;
    transition: opacity 600ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .flat-patch-wrapper.visible,
  .flat-patch-wrapper.entering {
    opacity: 1;
  }
  .flat-patch-wrapper.leaving {
    opacity: 0;
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
  /* "Zoom to detail" button — sibling of stand-at-site, same dark-
     glass chrome but with a downward-arrow glyph instead of the
     panorama half-moon. Stacks below stand-at-site when both render. */
  .head .zoom-to-detail-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 10px 14px;
    margin-top: 8px;
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
  .head .zoom-to-detail-button .icon {
    color: var(--accent, #4ecdc4);
    font-size: 13px;
    line-height: 1;
  }
  .head .zoom-to-detail-button:hover,
  .head .zoom-to-detail-button:focus-visible {
    background: rgba(255, 255, 255, 0.08);
    border-color: var(--accent, #4ecdc4);
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
    /* Raised above the global footer bar (Gallery / Credits /
       Library / etc.) so the two strips don't overlap. */
    bottom: 48px;
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
  /* .status-completed / -ongoing / -planned removed per ADR-072
   * §Drift 17 — colors now come from statusTone() applied inline as
   * style="color: ...; border-color: ..." so the badge can render the
   * full status enum (FLOWN/PLANNED/ACTIVE/ENDED/CRASHED/LOST) without
   * needing a CSS class per state. */
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

  .launches-from-here {
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
  .launches-from-here h3 {
    margin: 0 0 8px;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 2.5px;
    color: rgba(255, 255, 255, 0.45);
    font-weight: 700;
  }
  .launches-from-here-chips {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .launches-chip {
    display: inline-block;
    padding: 5px 10px;
    background: rgba(78, 205, 196, 0.1);
    border: 1px solid rgba(78, 205, 196, 0.4);
    color: #4ecdc4;
    text-decoration: none;
    border-radius: 999px;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1.5px;
    font-weight: 700;
    transition: all 0.15s;
  }
  .launches-chip:hover,
  .launches-chip:focus-visible {
    background: rgba(78, 205, 196, 0.22);
    border-color: rgba(78, 205, 196, 0.75);
    color: #fff;
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

  /* Floating Exit-Panorama chip — only renders when the right-side
     detail panel is closed. Lands top-left in the now-empty corner
     so the user has a discoverable exit even without the panel
     open. (#286 audit — moved out of the bottom-row controls stack
     to fix the sizing/overlap with the cross-link chips.) */
  /* Distance scale bar — fixed in the canvas bottom-right corner.
     Above the legend strip but below z-index 60 floating exits. */
  .distance-scale {
    position: fixed;
    right: 24px;
    bottom: 56px;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 6px 10px;
    background: rgba(5, 5, 20, 0.78);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    backdrop-filter: blur(4px);
    z-index: 40;
  }
  .distance-scale-bar {
    height: 4px;
    background: rgba(255, 255, 255, 0.85);
    border-left: 2px solid rgba(255, 255, 255, 0.95);
    border-right: 2px solid rgba(255, 255, 255, 0.95);
    box-sizing: content-box;
  }
  .distance-scale-label {
    font-family: 'Space Mono', 'Courier New', monospace;
    font-size: 11px;
    letter-spacing: 0.04em;
    color: rgba(255, 255, 255, 0.92);
  }
  @media (max-width: 767px) {
    .distance-scale {
      right: 12px;
      bottom: 72px;
    }
  }

  .traverse-stop-tooltip {
    position: fixed;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px 10px;
    background: rgba(5, 5, 20, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 4px;
    color: var(--color-text-on-dark, #ffffff);
    font-family: 'Space Mono', 'Courier New', monospace;
    font-size: 11px;
    letter-spacing: 0.02em;
    backdrop-filter: blur(4px);
    z-index: 70;
    max-width: 240px;
  }
  .traverse-stop-tooltip .sol {
    font-size: 10px;
    letter-spacing: 0.08em;
    color: rgba(255, 220, 140, 0.95);
    text-transform: uppercase;
  }
  .traverse-stop-tooltip .label {
    color: rgba(255, 255, 255, 0.92);
  }

  .panorama-floating-exit {
    position: fixed;
    top: calc(var(--nav-height, 64px) + 18px);
    left: 24px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: rgba(5, 5, 20, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: var(--color-text-on-dark, #ffffff);
    font-family: 'Space Mono', 'Courier New', monospace;
    font-size: 12px;
    letter-spacing: 0.02em;
    cursor: pointer;
    backdrop-filter: blur(6px);
    z-index: 60;
  }
  .panorama-floating-exit:hover,
  .panorama-floating-exit:focus-visible {
    border-color: rgba(255, 255, 255, 0.4);
    outline: none;
  }
  .panorama-floating-exit .x {
    color: rgba(255, 255, 255, 0.65);
    font-size: 11px;
  }
</style>
