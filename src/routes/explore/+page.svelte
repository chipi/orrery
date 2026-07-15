<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte';
  import { page } from '$app/stores';
  import { afterNavigate, goto, replaceState } from '$app/navigation';
  import { setCurrentCard, trackCardNavigation } from '$lib/card-chain.svelte';
  import { base } from '$app/paths';
  import * as THREE from 'three';
  import { createLayeredStarField } from '$lib/three/star-field';
  import { PLANETS, type PlanetVisual, type SatelliteDef } from '$lib/explore-scene';
  import { trackItemClick, trackViewToggle, trackLayerToggle } from '$lib/analytics';
  import { createSceneRenderer } from '$lib/three/scene-renderer';
  import {
    resolveQualitySync,
    kickOffBackgroundDetect,
    resolveQualitySource,
    type QualityConfig,
    type QualityTier,
  } from '$lib/quality/quality-tier';
  import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
  import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
  import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
  import { Line2 } from 'three/examples/jsm/lines/Line2.js';
  import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
  import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
  import RenderingDebugRegistrar from '$lib/components/RenderingDebugRegistrar.svelte';
  import QualitySettingsModal from '$lib/components/QualitySettingsModal.svelte';
  import type { QualitySource } from '$lib/components/debug-panel-context';
  import { disposeScene } from '$lib/three/dispose-object3d';
  import { createAnimateLoop } from '$lib/three/animate-loop';
  import { attachFrameMonitor, type FrameMonitorHandle } from '$lib/quality/frame-monitor';
  import { createRouteLifecycle } from '$lib/three/route-lifecycle';
  // /explore v2 "The Known Universe" (PRD-030 / RFC-032). The neighborhood scene
  // is dynamically imported at the boundary so v1's bundle + first paint stay
  // untouched (RFC C-F).
  import {
    ContextGraph,
    SOLAR_SYSTEM_CONTEXT,
    NEIGHBORHOOD_CONTEXT,
    MILKY_WAY_CONTEXT,
    LOCAL_GROUP_CONTEXT,
    makeBodyContext,
    bodyContextId,
  } from '$lib/universe/context-graph';
  import type { NeighborhoodScene } from '$lib/universe/neighborhood-scene';
  import type { BodyScene } from '$lib/universe/body-scene';
  import {
    describeDistanceAu,
    niceScaleBar,
    AU_PER_PC,
    RUNG_LADDER,
    type ScaleReadout,
    type ScaleRung,
  } from '$lib/universe/scale-readout';
  import {
    buildIconicTrajectory,
    type IconicTrajectoryData,
    type IconicTrajectoryHandle,
  } from '$lib/three/iconic-trajectory';
  import {
    getPlanets,
    getSun,
    getMissionIndex,
    getMission,
    getNamedStars,
    getNamedStarI18n,
    getExoplanetSystems,
    getExoplanetSystem,
    getExoplanetI18n,
    getCultureDoors,
    getDeepSkyObjects,
    getDeepSkyGallery,
    getMilkyWaySchematic,
    getLocalGroup,
    getBlackHole,
    type MilkyWayObject,
    type LocalGroupMember,
    type BlackHole,
    type NamedStar,
    type LocalizedNamedStar,
    type ExoplanetPlanet,
    type ExoplanetSystem,
    type ExoplanetOverlay,
    type LocalizedCultureDoor,
    type DeepSkyObject,
  } from '$lib/data';
  import { findDeepSkyImage, type DeepSkyImage } from '$lib/deep-sky';
  import { assetOrigin } from '$lib/asset-url';
  import { deepSkyRung, type DeepSkyRung } from '$lib/universe/deep-sky-lod';
  import StarPanel from '$lib/components/StarPanel.svelte';
  import ExoplanetPanel from '$lib/components/ExoplanetPanel.svelte';
  import MassPeriodChart from '$lib/components/MassPeriodChart.svelte';
  import DeepSkyPanel from '$lib/components/DeepSkyPanel.svelte';
  import HrDiagram from '$lib/components/HrDiagram.svelte';
  import CausalityMap from '$lib/components/CausalityMap.svelte';
  import MilkyWayPanel from '$lib/components/MilkyWayPanel.svelte';
  import LocalGroupPanel from '$lib/components/LocalGroupPanel.svelte';
  import BlackHolePanel from '$lib/components/BlackHolePanel.svelte';
  import CultureDoorCard from '$lib/components/CultureDoorCard.svelte';
  import StarIndex from '$lib/components/StarIndex.svelte';
  import type { AnonymousStar } from '$lib/universe/anonymous-star';
  import { localeFromPage } from '$lib/locale';
  import { createIconicSelectionService } from './iconic-selection.svelte';
  import { auToPx } from '$lib/scale';
  import { cue } from '$lib/sensory/feedback';
  import { gyro } from '$lib/sensory/device-orientation';
  import { sensory } from '$lib/sensory/state.svelte';
  import { keplerChord } from '$lib/sensory/sonify/kepler-chord';
  import { exhibit } from '$lib/exhibit.svelte';
  import EnterArButton from '$lib/components/EnterArButton.svelte';
  import EnterSkyButton from '$lib/components/EnterSkyButton.svelte';
  import { launchArScene, launchSkyScene } from '$lib/ar/launch-ar';
  import { earthPos, outboundArc, type Vec2 } from '$lib/orbital/mission-arc';
  import { PLANET_STATS, auLightTime } from '$lib/planet-stats';
  import TacticalScan from '$lib/components/TacticalScan.svelte';
  import { missionDestToHeliocentricDestinationId } from '$lib/mission-dest';
  import { dateToSimDay } from '$lib/sim-day';
  import { DESTINATIONS, type DestinationId } from '$lib/lambert-grid.constants';
  import smallBodiesData from '$data/small-bodies.json';
  import exploreOrbitersData from '$data/explore-orbiters.json';
  import { onReducedMotionChange } from '$lib/reduced-motion';
  import type { LocalizedPlanet } from '$types/planet';
  import type { LocalizedSun } from '$types/sun';
  import type { Mission } from '$types/mission';
  import PlanetPanel from '$lib/components/PlanetPanel.svelte';
  import SunPanel from '$lib/components/SunPanel.svelte';
  import ExploreBodyIndex from '$lib/components/ExploreBodyIndex.svelte';
  import SizesCanvas from '$lib/components/SizesCanvas.svelte';
  import SmallBodyPanel from '$lib/components/SmallBodyPanel.svelte';
  import SatellitePanel from '$lib/components/SatellitePanel.svelte';
  import BeltPanel from '$lib/components/BeltPanel.svelte';
  import MissionPanel from '$lib/components/MissionPanel.svelte';
  import OrbitRuler from '$lib/components/OrbitRuler.svelte';
  import RegimePanel from '$lib/components/RegimePanel.svelte';
  import { getOrbitRegimesExplore } from '$lib/data';
  import type { OrbitRegime } from '$types/orbit-regime';
  import { agencyToLogoPaths } from '$lib/agency-logo';
  import ScienceLayersPanel from '$lib/components/ScienceLayersPanel.svelte';
  import { audio } from '$lib/audio-state.svelte';
  import {
    gravityAccel,
    logScaleLength,
    BODY_MASS_KG,
    buildArrowTipLabel,
  } from '$lib/orbit-overlays';
  import { buildLocalGroupLayer } from '$lib/galaxies-layer';
  import { onLayerChange } from '$lib/science-layers';
  import { onScienceLensChange } from '$lib/science-lens';
  import * as m from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import MobileDrawerGroup from '$lib/components/MobileDrawerGroup.svelte';

  // Localised label for an anonymous star's catalogue colour (enum → message).
  const anonColorLabel = (c: string): string => {
    switch (c) {
      case 'blue-white':
        return m.star_color_blue_white();
      case 'white':
        return m.star_color_white();
      case 'yellow-white':
        return m.star_color_yellow_white();
      case 'yellow':
        return m.star_color_yellow();
      case 'orange':
        return m.star_color_orange();
      case 'red':
        return m.star_color_red();
      default:
        return c;
    }
  };

  // Planet visual config (PlanetVisual / SatelliteDef / PLANETS) now lives in
  // $lib/explore-scene as the single source of truth, shared with the AR
  // renderer — imported at the top of this <script>.

  // Small bodies: dwarf planets, comets, the one known interstellar
  // visitor. Clickable on the 2D view since v0.x.x — same data drives
  // the SmallBodyPanel's overview/technical/learn tabs.
  type SmallBody = {
    id: string;
    name: string;
    type: 'dwarf' | 'comet' | 'interstellar' | 'asteroid' | 'kbo';
    a: number;
    e: number;
    T: number;
    L0: number;
    incl: number;
    color: string;
    radius_km?: number;
    discovered?: string;
    mission_visited?: string | null;
    next_perihelion?: string;
    description?: string;
    wiki?: string;
    note?: string;
  };
  const SMALL_BODIES: SmallBody[] = smallBodiesData.bodies as SmallBody[];
  const smallBodyById = new Map(SMALL_BODIES.map((b) => [b.id, b]));

  /**
   * Sample points along a body's trajectory in heliocentric AU-pixel
   * coordinates. Closed elliptic orbits return a full ring; hyperbolic
   * (interstellar) trajectories return an open curve over the valid
   * true-anomaly interval (where 1 + e·cos ν > 0).
   *
   * Used by both 2D and 3D rendering. Pure function — `auToPx` is the
   * only side-input.
   */
  function sampleOrbitPoints(b: SmallBody, steps: number): { x: number; y: number; z: number }[] {
    // Build the orbit in two stages so inclination renders correctly
    // in 3D: (1) generate points in the orbit's local plane (xL, 0, zL)
    // — closed ellipse for dwarfs/comets, open hyperbola for
    // interstellar visitors. (2) tilt out of the ecliptic by `incl`
    // around the local X-axis (line of nodes is arbitrary without Ω,
    // which we don't carry — visually this still gives Pluto its
    // 17° lift, ʻOumuamua its 122° plunge, etc.). (3) rotate the
    // tilted plane about Y by L0 so the perihelion direction sits
    // where the data wants it. The 2D top-down view consumes only
    // {x, z} and ignores y, so a flat ecliptic projection still
    // works for 2D mode.
    const pts: { x: number; y: number; z: number }[] = [];
    const cosL = Math.cos(b.L0);
    const sinL = Math.sin(b.L0);
    const incRad = ((b.incl ?? 0) * Math.PI) / 180;
    const cosI = Math.cos(incRad);
    const sinI = Math.sin(incRad);
    function pushTilted(xL: number, zL: number) {
      // Tilt around local X: (xL, 0, zL) → (xL, -zL·sinI, zL·cosI)
      const yT = -zL * sinI;
      const zT = zL * cosI;
      // Rotate about world Y by L0.
      pts.push({ x: xL * cosL - zT * sinL, y: yT, z: xL * sinL + zT * cosL });
    }
    if (b.type === 'interstellar') {
      const absA = Math.abs(b.a);
      const semiLatus = absA * (b.e * b.e - 1);
      const nuMax = Math.acos(-1 / b.e) * 0.985;
      for (let i = 0; i <= steps; i++) {
        const nu = -nuMax + (2 * nuMax * i) / steps;
        const rAu = semiLatus / (1 + b.e * Math.cos(nu));
        pushTilted(Math.cos(nu) * auToPx(rAu), Math.sin(nu) * auToPx(rAu));
      }
    } else {
      const semiMajor = auToPx(b.a);
      const semiMinor = semiMajor * Math.sqrt(1 - b.e * b.e);
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        pushTilted(Math.cos(a) * semiMajor - semiMajor * b.e, Math.sin(a) * semiMinor);
      }
    }
    return pts;
  }

  /**
   * Body position for a given simT (years from epoch). Interstellar
   * bodies pin to perihelion (no time evolution — they passed through
   * once in 2017 and are gone). Closed orbits advance with simT.
   */
  function smallBodyPosition(b: SmallBody, simT: number): { x: number; y: number; z: number } {
    // Mirrors the same tilt-then-rotate transform as sampleOrbitPoints
    // so the body sits exactly on the rendered orbit ring in 3D. 2D
    // callers ignore y (top-down ecliptic projection).
    const cosL = Math.cos(b.L0);
    const sinL = Math.sin(b.L0);
    const incRad = ((b.incl ?? 0) * Math.PI) / 180;
    const cosI = Math.cos(incRad);
    const sinI = Math.sin(incRad);
    if (b.type === 'interstellar') {
      // Pin at perihelion (ν=0). zL=0 at perihelion under our
      // line-of-nodes-along-X convention, so y=0 here too.
      const absA = Math.abs(b.a);
      const semiLatus = absA * (b.e * b.e - 1);
      const rAu = semiLatus / (1 + b.e);
      const xL = auToPx(rAu);
      return { x: xL * cosL, y: 0, z: xL * sinL };
    }
    const semiMajor = auToPx(b.a);
    const semiMinor = semiMajor * Math.sqrt(1 - b.e * b.e);
    const Tyr = b.T / 365.25;
    const ang = b.L0 + simT * ((2 * Math.PI) / Tyr);
    const xL = Math.cos(ang) * semiMajor - semiMajor * b.e;
    const zL = Math.sin(ang) * semiMinor;
    const yT = -zL * sinI;
    const zT = zL * cosI;
    return { x: xL * cosL - zT * sinL, y: yT, z: xL * sinL + zT * cosL };
  }

  let container: HTMLDivElement | undefined = $state();
  let canvas2d: HTMLCanvasElement | undefined = $state();
  let view: '3d' | '2d' = $state('3d');
  let localizedPlanets: LocalizedPlanet[] = $state([]);
  let localizedSun: LocalizedSun | null = $state(null);
  let selectedId: string | null = $state(null);

  // Keyboard / screen-reader / TV body index (RFC-031 S2): the accessible way
  // to reach every selectable body without the pointer-only canvas.
  let bodyIndexOpen = $state(false);
  let bodyIndexList = $derived.by(() => {
    const list: { kind: 'sun' | 'planet' | 'small'; id: string; name: string }[] = [];
    // Dedupe by id: Pluto was promoted SMALL_BODIES → PLANETS (#287) but lingers
    // in both lists, so it would otherwise appear twice. Planets are pushed first,
    // so Pluto keeps its (correct) planet kind + selectPlanet handler.
    const seen = new Set<string>();
    const add = (item: (typeof list)[number]) => {
      if (seen.has(item.id)) return;
      seen.add(item.id);
      list.push(item);
    };
    if (localizedSun) add({ kind: 'sun', id: 'sun', name: localizedSun.name });
    for (const p of localizedPlanets) add({ kind: 'planet', id: p.id, name: p.name });
    for (const b of SMALL_BODIES) add({ kind: 'small', id: b.id, name: b.name });
    return list;
  });

  // ─── Consolidated panel / layer / camera state (Action 7, #326) ──
  // Replaced 11 standalone $state bools previously scattered between
  // lines 699..1205. Three typed bags + a single reset funnel make
  // the surface easier to scan and impossible to half-reset on
  // route exit or canvas-clear.

  /** Detail-panel toggles — closed all-at-once by `resetExplorePanelState`. */
  let panelState = $state({
    planet: false,
    sun: false,
    sizes: false,
    smallBody: false,
    satellite: false,
    belt: false,
    star: false,
    exoplanet: false,
  });

  // /explore v2 Slice 1 — named-star selection + the anonymous-star tap readout.
  let namedStars = $state<NamedStar[]>([]);
  // Slice 2 — the exoplanet selected inside a BodyScene (drives ExoplanetPanel).
  let selectedExoplanet = $state<{
    planet: ExoplanetPlanet;
    hostName: string;
    overlay: ExoplanetOverlay | null;
  } | null>(null);
  let closeExoplanetFn: (() => void) | null = null;
  let namedStarById = $derived(new Map(namedStars.map((s) => [s.id, s])));
  let selectedStarId = $state<string | null>(null);
  let localizedStar = $state<LocalizedNamedStar | null>(null);
  let anonStar = $state<(AnonymousStar & { shownAt: number }) | null>(null);

  // Heliocentric scale ruler + zone panel state (#357). Mirrors the
  // /earth /moon /mars rulers — Sun → terrestrial → belt → giants →
  // Kuiper → scattered → heliopause → Oort. Residents click → deep-
  // link via `?id=<body-id>` to the existing /explore body resolver.
  let exploreRegimes: OrbitRegime[] = $state([]);
  let exploreRegimePanelOpen = $state(false);
  let selectedExploreRegimeId = $state<string | null>(null);
  let selectedExploreRegime = $derived(
    selectedExploreRegimeId
      ? (exploreRegimes.find((r) => r.id === selectedExploreRegimeId) ?? null)
      : null,
  );
  let exploreSelectableIds = $derived(
    new Set(exploreRegimes.flatMap((r) => r.residents?.map((res) => res.id) ?? [])),
  );

  function openExploreRegime(id: string) {
    selectedExploreRegimeId = id;
    exploreRegimePanelOpen = true;
    const url = new URL(window.location.href);
    url.searchParams.set('regime', id);
    goto(url.pathname + url.search, { replaceState: true, noScroll: true, keepFocus: true });
  }
  function closeExploreRegime() {
    exploreRegimePanelOpen = false;
    const url = new URL(window.location.href);
    url.searchParams.delete('regime');
    goto(url.pathname + (url.search ? url.search : ''), {
      replaceState: true,
      noScroll: true,
      keepFocus: true,
    });
  }
  function onExploreResidentClick(id: string) {
    // Call /explore's existing select* functions DIRECTLY — mirrors
    // how /earth /moon /mars wire their residents through the
    // `__surfaceSceneSelectSite` window hook (no URL mutation,
    // no deep-link resolver bounce). 2026-06-22 user direction:
    // "we update url with planet we open from belt panel and that
    // confuses system and not working well. we dont have that in
    // earth, moon and mars. we also dont need this here since just
    // creating issues". Resolves to the right panel by type, same
    // lookup ladder the `?id=` deep-link resolver uses.
    if (id === 'sun') {
      selectSun();
    } else if (id === 'pluto' && smallBodyById.has(id)) {
      // Pluto exists in both planets.json + small-bodies.json;
      // prefer the small-body panel (richer science_sections).
      selectSmallBody(id);
    } else if (planetById.has(id)) {
      selectPlanet(id);
    } else if (smallBodyById.has(id)) {
      selectSmallBody(id);
    } else if (id === 'asteroid-belt' || id === 'belt:asteroid') {
      selectBelt('asteroid');
    } else if (id === 'kuiper-belt' || id === 'belt:kuiper') {
      selectBelt('kuiper');
    } else if (id.includes(':')) {
      const [parent, sat] = id.split(':', 2);
      if (parent && sat && planetById.has(parent)) selectSatellite(parent, sat);
    }
    // Unknown id → no-op; regime panel stays open underneath either way.
  }

  // Load /explore zones — must be browser-only (relative-URL fetch
  // breaks during SSR per @sveltejs/kit; same pattern /moon and /mars
  // use). The deep-link `?regime=` resolver fires once the regimes
  // land.
  onMount(async () => {
    exploreRegimes = await getOrbitRegimesExplore(getLocale());
  });
  $effect(() => {
    void exploreRegimes;
    if (exploreRegimes.length === 0) return;
    const id = $page.url.searchParams.get('regime');
    if (id && exploreRegimes.some((r) => r.id === id)) {
      selectedExploreRegimeId = id;
      exploreRegimePanelOpen = true;
    }
  });

  // Iconic-mission selection — service factory consolidates the old
  // `pathsLegendSelectedId` / `pathsLegendMission` / `highlightedMissionId`
  // / `panelState.pathsLegend` quartet into a single $state object with
  // action methods. See `./iconic-selection.svelte.ts` for the contract.
  // Idiomatic Svelte 5 pattern (per docs §"$state in classes / modules":
  // mutate-not-reassign on the shared object).
  const iconic = createIconicSelectionService();

  /** Visibility-layer master toggles (NOT the per-body layer flags —
   *  those live in `layers` further down). */
  let layerState = $state({
    lens: false,
    hover: false,
  });

  /** `focusedOnPlanet` flips true when the camera transition into a
   *  selected planet completes — gates gravity / atmo / temp overlay
   *  rows so they only paint after the camera settles. */
  let cameraState = $state({
    focusedOnPlanet: false,
  });

  /** Close every detail panel in one call. */
  function resetExplorePanelState(): void {
    panelState.planet = false;
    panelState.sun = false;
    panelState.sizes = false;
    panelState.smallBody = false;
    panelState.satellite = false;
    panelState.belt = false;
    // Iconic-mission selection (panel + selectedId + hoveredId + pending
    // debounce timer) is owned by the service — single reset() call.
    iconic.reset();
  }

  // Roving keyboard nav for the iconic-mission legend — mirrors /iss.
  // Up/Down move the highlight (wrapping at both ends), Home/End jump to
  // first/last, Esc clears.
  //
  // Arrows move DOM FOCUS ONLY — the committed selection (is-selected)
  // and the open panel stay put while you traverse. Each focused row's
  // onfocus sets hoveredId so the arc + tagline preview where you are
  // without committing. Enter/Space commit via the native button onclick
  // → selectMission.
  let legendRowEls: HTMLButtonElement[] = [];

  function onLegendKeydown(e: KeyboardEvent, i: number): void {
    if (e.key === 'Escape') {
      iconic.reset();
      return;
    }
    const n = PATHS_LEGEND.length;
    if (n === 0) return;
    let next: number;
    if (e.key === 'ArrowDown') next = (i + 1) % n;
    else if (e.key === 'ArrowUp') next = (i - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else return;
    e.preventDefault();
    // Focus only — selection is committed on Enter/click, not on move.
    legendRowEls[next]?.focus();
  }

  let selectedSmallBodyId: string | null = $state(null);

  // Tour / single-episode collaboration (PRD-016 §S11 / RFC-019 §12):
  // when a detail panel opens during ACTIVE audio playback (full tour
  // OR a single-episode play), collapse the audio overlay to compact
  // mode so the panel the narrator just opened is fully visible.
  // 2026-06-19 — was gated on `audio.tourActive` only, so single-
  // episode previews (the most common entry point) kept the overlay
  // at full width and the panel sat behind it. User report: "tour does
  // not go to compact mode and overlays details panel".
  $effect(() => {
    if (
      audio.currentEpisode &&
      audio.open &&
      (panelState.planet || panelState.sun || panelState.smallBody) &&
      !audio.compact
    ) {
      audio.compact = true;
    }
  });
  let selectedSmallBody = $derived(
    selectedSmallBodyId ? (smallBodyById.get(selectedSmallBodyId) ?? null) : null,
  );

  // Natural-satellite selection (#304 Slice 1). Each satellite is
  // uniquely keyed by `${parentPlanetId}:${satelliteId}` to keep
  // collisions impossible if two parents ever share a moon name.
  let selectedSatelliteKey: string | null = $state(null);

  // Belt selection (v0.7.x — user feedback 2026-06-06). One of
  // 'asteroid' | 'kuiper'; opens the BeltPanel via the same pickAid
  // raycast path the planets / small bodies use.
  let selectedBeltId: string | null = $state(null);

  // ─── Layers (issue #32) ──────────────────────────────────────────
  // Four toggleable visibility layers — Sun is always on (centre of
  // the scene). All default to true so first paint matches today.
  // Runtime-only state per CLAUDE.md (no localStorage).
  let layers = $state({
    planets: true,
    dwarfs: true,
    comets: true,
    interstellar: true,
    // PATHS — iconic spacecraft trajectories (#306). Default OFF so the
    // heliocentric view doesn't open visually busy; user opts in via
    // the chip, or the Curator Tour toggles it on at the relevant beat.
    paths: false,
  });

  // Analytics: which visibility layers people toggle on /explore. Diff
  // against the prior state so we emit one layer-toggle per actual change.
  const _prevLayers: Record<string, boolean> = { ...layers };
  $effect(() => {
    for (const k of Object.keys(layers) as (keyof typeof layers)[]) {
      if (layers[k] !== _prevLayers[k]) {
        trackLayerToggle('explore', k, layers[k]);
        _prevLayers[k] = layers[k];
      }
    }
  });

  // Iconic-mission legend (#306) — sized in JS so it never overflows the
  // viewport. It hangs off the bottom of the fixed .hud-controls column
  // (position:absolute; top:100%), so its real distance from the viewport
  // top = nav + the dynamic chip-stack height; a static CSS calc can't
  // know that. Measure the legend's actual top and cap its height to the
  // remaining space (16px tail), letting the roster scroll internally.
  let pathsLegendEl: HTMLDivElement | undefined = $state();
  function sizePathsLegend(): void {
    const el = pathsLegendEl;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    el.style.maxHeight = Math.max(140, window.innerHeight - top - 16) + 'px';
  }
  $effect(() => {
    // Re-measure whenever the legend is shown — after the DOM commits so
    // getBoundingClientRect().top reflects the rendered chip stack.
    if (layers.paths) requestAnimationFrame(sizePathsLegend);
  });

  // Time playback (#351 Layer 1) — user control over the live `simT`
  // clock that propagates planets, moons, and small bodies. The pills
  // are days-per-second (matching the guide-explore narration: "one day
  // per second, ten days, a hundred"); 1× ≡ 1 day/sec. This layer
  // governs the EXISTING synthetic clock only — real-calendar anchoring
  // (date readout, "Today") is Layer 2. prefers-reduced-motion still
  // wins as the hard freeze (ADR-025), independent of `simPaused`.
  const SIM_SPEEDS = [1, 10, 100] as const; // days per second
  const DAYS_PER_YEAR = 365.25; // simT is in years; pills are days/sec
  let simSpeed = $state(10);
  let simPaused = $state(false);
  // Mobile speed popover state — collapses 3 pills into one tap-to-reveal slot.
  let speedPopoverOpen = $state(false);
  // #351 Layer 2-B — give the clock a real calendar meaning WITHOUT
  // touching the (artistic) a0 start angles. Convention: simT=0 ≡ the
  // page-load day. The chip shows the running simulated date; clicking it
  // resets the clock to today. Layer 2-A (real J2000 longitudes) is a
  // separate, revertible swap of the 8 a0 constants on top of this.
  let simDateLabel = $state('');
  let resetSimToToday: (() => void) | null = null;
  // ESC closes the sizes overlay. Using a window listener here (gated
  // by panelState.sizes) so the dialog is keyboard-dismissible without a
  // svelte:window element inside the {#if} block, which prettier
  // doesn't like nested.
  $effect(() => {
    if (!panelState.sizes) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') panelState.sizes = false;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  let hoverData: {
    name: string;
    velocity: string;
    distance: string;
    extras: string;
    /** Live numeric values used by the lens-mode expanded card. */
    velocityKms: number;
    distanceAU: number;
    eccentricity: number;
    inclinationDeg: number;
    /** Discriminator: planets + small bodies use vis-viva tooltip; the
     *  Lagrange-points layer uses a different schema (no orbital speed
     *  of its own — it co-orbits with the planet). When set, the
     *  template renders the lagrange-specific layout. */
    kind?: 'planet' | 'small-body' | 'lagrange';
    /** Lagrange-only — short physics blurb + notable occupants. */
    lagrangeTitle?: string;
    lagrangeBlurb?: string;
    lagrangeNotable?: string;
    x: number;
    y: number;
  } | null = $state(null);
  // Hover-card lens state: when both the master lens AND the 'hover'
  // layer are on, the tooltip expands with click-through chips into
  // /science. When the lens is off, the tooltip behaves as it always
  // did (always-on terse text). When the lens is on but the 'hover'
  // layer is off, the tooltip is hidden — letting users opt for a
  // fully clean view of the scene.
  let stopLensWatch: (() => void) | undefined;
  let stopHoverLayerWatch: (() => void) | undefined;
  let tooltipVisible = $derived(hoverData !== null && (!layerState.lens || layerState.hover));
  let tooltipExpanded = $derived(layerState.lens && layerState.hover);
  let cleanup: (() => void) | undefined;
  // Audio-tour camera-control listener teardown — set inside onMount
  // where camR / camT closures live, called from the main cleanup
  // block at unmount so we don't leak listeners on route change.
  let tourCameraTeardown: (() => void) | undefined;
  // Iconic trajectory handles (#306 Slice A). Populated inside onMount
  // after the scene mounts; exposed at component scope so the layers
  // toggle effect can flip visibility without touching the scene
  // directly.
  let iconicTrajectoryHandles: IconicTrajectoryHandle[] = [];
  // PATHS layer visibility binding.
  $effect(() => {
    const visible = layers.paths;
    for (const h of iconicTrajectoryHandles) h.setVisible(visible);
  });

  // PATHS legend roster — color + display name + mission_id for each
  // iconic trajectory. Hard-coded (mirrors ICONIC_TRAJECTORY_IDS +
  // colors in static/data/trajectories/<id>.json) to avoid a second
  // fetch round-trip just for the legend swatches. The orbiter-tour
  // variants (cassini-tour, galileo-tour, juno-tour) share colors +
  // mission with the main entry, so they don't get separate rows.
  // Sorted oldest → newest by launch date. Entries are paired with the
  // mission's primary agency so the legend renders the same logo
  // affordance as /missions cards (via agencyToLogoPaths). Voyager 2
  // (Aug 1977) shipped ~2 weeks before Voyager 1 (Sep 1977) — same
  // year, ordered by actual launch date so the chronology reads
  // cleanly top-to-bottom.
  const PATHS_LEGEND = [
    {
      mission_id: 'pioneer-10',
      color: '#f97583',
      name: 'Pioneer 10',
      launch_year: 1972,
      agency: 'NASA',
    },
    {
      mission_id: 'pioneer-11',
      color: '#ff7b72',
      name: 'Pioneer 11',
      launch_year: 1973,
      agency: 'NASA',
    },
    {
      mission_id: 'voyager-2',
      color: '#4ecdc4',
      name: 'Voyager 2',
      launch_year: 1977,
      agency: 'NASA',
    },
    {
      mission_id: 'voyager-1',
      color: '#ffa657',
      name: 'Voyager 1',
      launch_year: 1977,
      agency: 'NASA',
    },
    {
      mission_id: 'venera-13',
      color: '#da4453',
      name: 'Venera 13',
      launch_year: 1981,
      agency: 'Roscosmos',
    },
    {
      mission_id: 'vega-1',
      color: '#ed5565',
      name: 'Vega 1',
      launch_year: 1984,
      agency: 'Roscosmos / ESA',
    },
    {
      mission_id: 'vega-2',
      color: '#ec87c0',
      name: 'Vega 2',
      launch_year: 1984,
      agency: 'Roscosmos / ESA',
    },
    {
      mission_id: 'giotto',
      color: '#5d9cec',
      name: 'Giotto',
      launch_year: 1985,
      agency: 'ESA',
    },
    {
      mission_id: 'galileo',
      color: '#a5d6a7',
      name: 'Galileo',
      launch_year: 1989,
      agency: 'NASA',
    },
    {
      mission_id: 'ulysses',
      color: '#aab2bd',
      name: 'Ulysses',
      launch_year: 1990,
      agency: 'ESA / NASA',
    },
    {
      mission_id: 'cassini',
      color: '#d2a8ff',
      name: 'Cassini-Huygens',
      launch_year: 1997,
      agency: 'NASA / ESA',
    },
    {
      mission_id: 'rosetta',
      color: '#fc6e51',
      name: 'Rosetta',
      launch_year: 2004,
      agency: 'ESA',
    },
    {
      mission_id: 'new-horizons',
      color: '#ffd33d',
      name: 'New Horizons',
      launch_year: 2006,
      agency: 'NASA',
    },
    {
      mission_id: 'dawn',
      color: '#b392f0',
      name: 'Dawn',
      launch_year: 2007,
      agency: 'NASA',
    },
    {
      mission_id: 'juno',
      color: '#79c0ff',
      name: 'Juno',
      launch_year: 2011,
      agency: 'NASA',
    },
    {
      mission_id: 'hayabusa2',
      color: '#b2e066',
      name: 'Hayabusa2',
      launch_year: 2014,
      agency: 'JAXA',
    },
    {
      mission_id: 'bepicolombo',
      color: '#fcbb6d',
      name: 'BepiColombo',
      launch_year: 2018,
      agency: 'ESA / JAXA',
    },
    {
      mission_id: 'juice',
      color: '#967bdc',
      name: 'JUICE',
      launch_year: 2023,
      agency: 'ESA',
    },
  ];
  // Iconic-mission tagline lookup — one-line "why it's iconic" copy
  // surfaced as an italic subtitle under each legend row. Keys are in
  // messages/*.json under `explore_iconic_tagline_<mission_id>`. The
  // mapping is hand-rolled because Paraglide's tree-shake only sees
  // statically-referenced message functions.
  function iconicTagline(missionId: string): string {
    switch (missionId) {
      case 'pioneer-10':
        return m.explore_iconic_tagline_pioneer_10();
      case 'pioneer-11':
        return m.explore_iconic_tagline_pioneer_11();
      case 'voyager-2':
        return m.explore_iconic_tagline_voyager_2();
      case 'voyager-1':
        return m.explore_iconic_tagline_voyager_1();
      case 'venera-13':
        return m.explore_iconic_tagline_venera_13();
      case 'vega-1':
        return m.explore_iconic_tagline_vega_1();
      case 'vega-2':
        return m.explore_iconic_tagline_vega_2();
      case 'giotto':
        return m.explore_iconic_tagline_giotto();
      case 'galileo':
        return m.explore_iconic_tagline_galileo();
      case 'ulysses':
        return m.explore_iconic_tagline_ulysses();
      case 'cassini':
        return m.explore_iconic_tagline_cassini();
      case 'rosetta':
        return m.explore_iconic_tagline_rosetta();
      case 'new-horizons':
        return m.explore_iconic_tagline_new_horizons();
      case 'dawn':
        return m.explore_iconic_tagline_dawn();
      case 'juno':
        return m.explore_iconic_tagline_juno();
      case 'hayabusa2':
        return m.explore_iconic_tagline_hayabusa2();
      case 'bepicolombo':
        return m.explore_iconic_tagline_bepicolombo();
      case 'juice':
        return m.explore_iconic_tagline_juice();
      default:
        return '';
    }
  }

  // Arc-highlight effect — pushes the live "highlighted trajectory" id
  // into each iconic-trajectory handle's setHighlight. The id is the
  // hovered mission when one is hovered, falling back to the selected
  // mission so the user always sees which path the open panel is for.
  // setHighlight is a Three.js side effect (third-party library write),
  // which is the canonical $effect use case per the Svelte 5 docs.
  $effect(() => {
    const id = iconic.state.hoveredId ?? iconic.state.selectedId;
    for (const h of iconicTrajectoryHandles) h.setHighlight(h.missionId === id);
  });

  // ─── Mission overlay (Theme A.A1 — v0.1.10 / issue #16) ──────────
  // When `/explore?mission=ID` is loaded, fetch the mission and
  // compute its outbound arc once. Rendered as a 2D Canvas line in
  // draw2d (3D rendering is stretch — deferred to a follow-up).
  let overlayMission: Mission | null = $state(null);
  let overlayArcPx: { x: number; z: number }[] = $state([]);
  let overlayArrivalPx: { x: number; z: number } | null = $state(null);

  // DebugPanel "Rendering" tab bridge (#334). Filled in onMount after
  // the renderer + composer + bloom pass are built; null until then.
  let liveRenderer: THREE.WebGLRenderer | null = $state(null);
  let liveQuality: QualityConfig | null = $state(null);
  let liveQualitySource: QualitySource = $state('fallback');
  let liveBloomPass: UnrealBloomPass | null = $state(null);
  let liveFrameMonitor: FrameMonitorHandle | null = $state(null);
  // QualitySettingsModal bridge (#339). Shown from first paint with a
  // 'medium' default; onMount updates it to the actually-resolved tier.
  let activeQualityTier: QualityTier = $state('medium');
  $effect(() => {
    const id = $page.url.searchParams.get('mission');
    if (!id) {
      overlayMission = null;
      overlayArcPx = [];
      overlayArrivalPx = null;
      return;
    }
    let cancelled = false;
    void (async () => {
      const idx = await getMissionIndex();
      const entry = idx.find((m) => m.id === id);
      if (!entry || cancelled) return;
      const mission = await getMission(id, entry.dest, localeFromPage($page));
      if (!mission || cancelled) return;
      const depDay = dateToSimDay(mission.departure_date) ?? 0;
      const earthDep = earthPos(depDay);
      const helioId = missionDestToHeliocentricDestinationId(entry.dest);
      const arcBodyId: DestinationId = helioId ?? 'mars';
      const destA = DESTINATIONS[arcBodyId].a;
      const vInf = mission.flight?.arrival?.v_infinity_km_s;
      const arc: Vec2[] = outboundArc(earthDep, 120, destA, vInf);
      overlayMission = mission;
      overlayArcPx = arc.map((p) => ({ x: auToPx(p.x), z: auToPx(p.z) }));
      const arr = arc[arc.length - 1];
      overlayArrivalPx = { x: auToPx(arr.x), z: auToPx(arr.z) };
    })();
    return () => {
      cancelled = true;
    };
  });

  // Lookup keyed by id; reactive to localizedPlanets.
  let planetById = $derived(new Map(localizedPlanets.map((p) => [p.id, p])));
  let selectedPlanet = $derived(selectedId ? (planetById.get(selectedId) ?? null) : null);

  // /explore v2 (PRD-030 / RFC-032) — scale-ruler HUD + boundary state, pushed
  // from the render loop. `scaleReadout` is the fitting distance measure for the
  // current zoom; `scaleBarPx`/`scaleBarLabel` the map-style bar; `contextId`
  // which scale-shell we're in (solar system vs stellar neighborhood).
  let scaleReadout = $state<ScaleReadout | null>(null);
  let scaleBarPx = $state(0);
  let scaleBarLabel = $state('');
  let contextId = $state<
    'solar-system' | 'neighborhood' | 'milky-way' | 'local-group' | 'body-scene'
  >('solar-system');
  // Slice 2: the exoplanet host whose BodyScene is active (breadcrumb crumb) + the
  // set of host ids that have a system to descend into (drives "Enter system").
  let bodyHostName = $state('');
  let exoplanetHostIds = $state<Set<string>>(new Set());
  // A distance caption shown during a Navigator warp into/out of a system.
  let warpCaption = $state('');
  let enterSystemFn: ((hostId: string, planetId?: string) => void) | null = null;
  // The exoplanet host id whose BodyScene is active (for the ?system= URL sync).
  let activeBodyHostId = $state<string | null>(null);
  // Bumped on each boundary crossing to replay the warp-flash overlay.
  let crossingFlashId = $state(0);
  // Constellation-line overlay toggle (neighborhood only).
  let showConstellations = $state(false);
  // Slice 3 — optional "culture layer" (off by default): badged fiction / message
  // story cards on objects that have them. Doors are fetched on selection; the
  // panels show them only while this is on.
  let showCulture = $state(false);
  let starCultureDoors = $state<LocalizedCultureDoor[]>([]);
  let exoCultureDoors = $state<LocalizedCultureDoor[]>([]);
  let setConstellationsFn: ((on: boolean) => void) | null = null;
  // Slice 4 — deep-sky glint layer (off by default). The Messier + gallery
  // objects render as faint glints; a photo blooms only as you approach.
  let showDeepSky = $state(false);
  let setDeepSkyFn: ((on: boolean) => void) | null = null;
  // Slice 7 — the HR-diagram (property-space) lens: re-project the star field.
  let hrLensOpen = $state(false);
  let hrStars = $state<Array<{ bv: number; absMag: number }>>([]);
  let toggleHrFn: (() => void) | null = null;
  // Slice 7 — the causality (light-cone) lens: a top-down light-horizon map.
  let causalityOpen = $state(false);
  let causalityShells = $state<import('$lib/universe/causality').LightShell[]>([]);
  let causalityField = $state<Array<{ x: number; z: number; bv: number }>>([]);
  let causalityNamed = $state<
    Array<{ name: string; distPc: number; x: number; z: number; bv: number }>
  >([]);
  let openCausalityFn: (() => void) | null = null;
  // Slice 7 — the exoplanet mass–period property-space plot (shown inside a system).
  let massPeriodOpen = $state(false);
  let allExoplanetPlanets = $state<
    Array<{ name: string; periodDays: number; massEarth: number; hostId: string }>
  >([]);
  let deepSkyObjects = $state<DeepSkyObject[]>([]);
  let selectedDeepSkyId = $state<string | null>(null);
  // Deep-sky immersion (Part 4): the full-frame photo destination. `activeDeepSky`
  // is the immersed object; `deepSkyImmersed` fades the fullscreen photo in;
  // `deepSkyPhotoUrl` swaps thumb → full-res as the LOD blooms.
  let deepSkyGallery = $state<DeepSkyImage[]>([]);
  let activeDeepSky = $state<DeepSkyObject | null>(null);
  let deepSkyImmersed = $state(false);
  let deepSkyPhotoUrl = $state('');
  let deepSkyPanelOpen = $state(false);
  let exitDeepSkyFn: (() => void) | null = null;
  let deepSkyGatewayFn: ((hostId: string) => void) | null = null;
  let deepSkyDeepLinkFn: ((designation: string) => void) | null = null;
  let activeDeepSkyImage = $derived(
    activeDeepSky ? findDeepSkyImage(deepSkyGallery, activeDeepSky.photoKey) : undefined,
  );
  // Named-star index (search + list) open state.
  let starIndexOpen = $state(false);
  const rungLadder: ScaleRung[] = RUNG_LADDER;
  const fmtScale = (value: number): string =>
    value >= 1000 || value < 0.01
      ? value.toLocaleString(undefined, { maximumSignificantDigits: 3 })
      : String(value);
  // Localize the light-travel unit words emitted by scale-readout (the km/AU/ly/pc
  // symbols stay universal).
  const lightUnitLabel = (unit: string): string => {
    switch (unit) {
      case 'light-seconds':
        return m.explore_light_seconds();
      case 'light-minutes':
        return m.explore_light_minutes();
      case 'light-hours':
        return m.explore_light_hours();
      case 'light-days':
        return m.explore_light_days();
      default:
        return m.explore_light_years();
    }
  };
  const contextLabel = (): string =>
    contextId === 'body-scene'
      ? bodyHostName
      : contextId === 'neighborhood'
        ? m.explore_ctx_stellar_neighborhood()
        : contextId === 'milky-way'
          ? m.explore_ctx_milky_way()
          : contextId === 'local-group'
            ? m.explore_ctx_local_group()
            : m.explore_ctx_solar_system();

  // PRD-023 Slice E.2/E.4 — script-level state for the close-zoom HUD
  // overlays. `cameraState.focusedOnPlanet` is set true when the camera
  // completes a fly-to a planet, false on Reset View / Sun selection.
  // Drives the Earth-comparison ghost (E.2, always-on at focus) and
  // the tactical stats overlay (E.4, lens-gated). See `cameraState`
  // declaration near the top of the script.

  // Per-planet stats + the PlanetStats type now live in
  // `$lib/planet-stats` (single source of truth, shared with the
  // surface Tactical Scan — PRD-023 amendment / #382). Imported above.
  // SATELLITE_STATS below stays local: it feeds the Earth-comparison
  // ghost (E.2), which is /explore-only.
  let focusedStats = $derived(selectedId ? (PLANET_STATS[selectedId] ?? null) : null);

  // Satellite stats for the Earth-for-scale widget when a moon is
  // selected. Real diameters in km. Keyed by satellite id (without
  // the parent-planet prefix used in selectedSatelliteKey). Only
  // diameter info is needed today — the tactical-scan overlay still
  // gates on `cameraState.focusedOnPlanet` so the gravity / atmo / temp rows
  // stay planet-only. Earth = 12 742 km.
  const SATELLITE_STATS: Record<string, { diameterKm: number; diameterRatioEarth: number }> = {
    moon: { diameterKm: 3474, diameterRatioEarth: 0.273 },
    phobos: { diameterKm: 22.4, diameterRatioEarth: 0.00176 },
    deimos: { diameterKm: 12.4, diameterRatioEarth: 0.00097 },
    io: { diameterKm: 3643, diameterRatioEarth: 0.286 },
    europa: { diameterKm: 3122, diameterRatioEarth: 0.245 },
    ganymede: { diameterKm: 5268, diameterRatioEarth: 0.413 },
    callisto: { diameterKm: 4821, diameterRatioEarth: 0.378 },
    titan: { diameterKm: 5150, diameterRatioEarth: 0.404 },
    enceladus: { diameterKm: 504, diameterRatioEarth: 0.04 },
    miranda: { diameterKm: 471, diameterRatioEarth: 0.037 },
    ariel: { diameterKm: 1158, diameterRatioEarth: 0.091 },
    umbriel: { diameterKm: 1169, diameterRatioEarth: 0.092 },
    titania: { diameterKm: 1577, diameterRatioEarth: 0.124 },
    oberon: { diameterKm: 1523, diameterRatioEarth: 0.12 },
    triton: { diameterKm: 2706, diameterRatioEarth: 0.212 },
  };
  let focusedSatelliteStats = $derived.by(() => {
    if (!selectedSatelliteKey) return null;
    const satId = selectedSatelliteKey.split(':')[1] ?? '';
    return SATELLITE_STATS[satId] ?? null;
  });
  let focusedRotationHours = $derived(
    selectedId ? (PLANETS.find((p) => p.id === selectedId)?.rotationHours ?? null) : null,
  );
  // PRD-023 Slice E.1 — light-time from Sun + coarse Earth distance,
  // via the shared helper (single source of truth with the surface
  // Tactical Scan, #382). Semi-major axes come from `planetById` (the
  // localised catalogue) — same source the velocity tooltip uses.
  let focusedLightTime = $derived.by(() => {
    if (!selectedId) return null;
    const planet = planetById.get(selectedId);
    if (!planet) return null;
    const earth = planetById.get('earth');
    return auLightTime(planet.a, earth?.a ?? 1);
  });

  // Plumbed into the 3D scene's RAF tween from inside onMount once
  // the planetObjs array is built. Top-level selectPlanet / selectSun
  // wrappers call through so the camera flies to the target body when
  // the user picks one — without this the camera was stuck looking at
  // the Sun, and per-planet 4K LOD swaps (#287) never fired for
  // anything past Mercury. See `focusOnBody` inside onMount.
  let flyToBodyFn: ((bodyId: string | null) => void) | null = null;
  // Set in onMount; called by Reset View so resetting while out in the stellar
  // neighborhood first crosses back to the solar system (no-op when already there).
  let exitNeighborhoodFn: (() => void) | null = null;
  // Slice 2: leave an exoplanet BodyScene back out to the neighborhood.
  let exitBodySceneFn: (() => void) | null = null;
  // Slice 5: leave the Milky Way context back in to the neighborhood.
  let exitMilkyWayFn: (() => void) | null = null;
  // Slice 5: the selected Milky Way pin (Sun / Sag A*) → MilkyWayPanel.
  let mwObjects = $state<MilkyWayObject[]>([]);
  let selectedMwId = $state<string | null>(null);
  let mwPanelOpen = $state(false);
  let closeMwFn: (() => void) | null = null;
  let mwDeepLinkFn: ((id: string) => void) | null = null;
  // Slice 8: the Local Group context — leave it back in to the Milky Way; the
  // selected member galaxy → LocalGroupPanel.
  let exitLocalGroupFn: (() => void) | null = null;
  let selectedLgMember = $state<LocalGroupMember | null>(null);
  let lgPanelOpen = $state(false);
  let closeLgFn: (() => void) | null = null;
  // Slice 6 — the black hole currently rendered full-screen (geodesic lensing).
  let activeBlackHole = $state<BlackHole | null>(null);
  let bhPanelOpen = $state(false);
  let exitBlackHoleFn: (() => void) | null = null;
  let bhDeepLinkFn: ((id: string) => void) | null = null;
  // Slice 6 physics lenses (curvature grid + time-dilation readout), on the BH view.
  let bhCurvatureLens = $state(false);
  let bhTimeLens = $state(false);
  let setBhCurvatureFn: ((on: boolean) => void) | null = null;
  let bhCultureDoors = $state<LocalizedCultureDoor[]>([]);
  let bhLearnHref = $derived(
    activeBlackHole ? `${base}/science/observation/${activeBlackHole.science_section}` : base,
  );
  // Time-dilation readout: √(1 − rₛ/r) at r = k·rₛ, as a percentage of a far clock.
  const dilationPct = (k: number): string => `${Math.round(Math.sqrt(1 - 1 / k) * 100)}%`;
  let selectedMwObject = $derived(mwObjects.find((o) => o.id === selectedMwId) ?? null);
  let mwLearnHref = $derived(
    selectedMwObject ? `${base}/science/observation/${selectedMwObject.science_section}` : base,
  );
  // Set in onMount; lets the star index / ?goto= resolver select a named star.
  let selectStarFn: ((id: string) => void) | null = null;
  let closeStarFn: (() => void) | null = null;
  // Slice 4 — select a deep-sky object (highlight; Part 4 adds warp + panel).
  let selectDeepSkyFn: ((id: string) => void) | null = null;
  // ?goto= deep-link (crosses + selects + frames) and index selection (selects + frames).
  let gotoStarFn: ((id: string) => void) | null = null;
  let indexSelectStarFn: ((id: string) => void) | null = null;

  // Panel mutex: each select* below opens its own panel and explicitly
  // closes the four other planet/sun/smallBody/satellite/belt panels.
  // The full `resetExplorePanelState()` funnel is deliberately NOT used
  // here — it would also close the iconic-mission panel + the sizes
  // overlay, which should remain open across a body selection so the
  // user can pick a body while the legend / sizes overlay stays up.

  function selectPlanet(id: string) {
    cue('select');
    selectedId = id;
    panelState.planet = true;
    panelState.sun = false;
    panelState.smallBody = false;
    panelState.satellite = false;
    panelState.belt = false;
    flyToBodyFn?.(id);
    trackItemClick('planet', id, '/explore');
  }

  // Hero sonification — the Kepler chord (PRD-017). Plays a soft, consonant bed
  // while AUDIO is on, tuned to the planets' orbital order. Ducks under narration
  // via the shared master gain. Stops on leave / when AUDIO is turned off.
  $effect(() => {
    if (sensory.active('audio')) keplerChord.start(PLANETS.map((p) => p.period));
    else keplerChord.stop();
    return () => keplerChord.stop();
  });

  function selectSun() {
    cue('select');
    panelState.sun = true;
    panelState.planet = false;
    panelState.smallBody = false;
    panelState.satellite = false;
    panelState.belt = false;
    exitNeighborhoodFn?.();
    flyToBodyFn?.(null);
  }

  function selectSmallBody(id: string) {
    cue('select');
    selectedSmallBodyId = id;
    panelState.smallBody = true;
    panelState.planet = false;
    panelState.sun = false;
    panelState.satellite = false;
    panelState.belt = false;
    trackItemClick('small-body', id, '/explore');
  }

  // Natural-satellite selection (#304 Slice 1). Compound key
  // `${parentPlanetId}:${satelliteId}` so e.g. selecting Charon
  // reads as `"pluto:charon"` — the data layer can split on `:`
  // when looking up the parent body. Same panel-mutex pattern as
  // the other select* — only one detail panel is ever open.
  function selectSatellite(parentPlanetId: string, satelliteId: string) {
    cue('select');
    selectedSatelliteKey = `${parentPlanetId}:${satelliteId}`;
    panelState.satellite = true;
    panelState.planet = false;
    panelState.sun = false;
    panelState.smallBody = false;
    panelState.belt = false;
    trackItemClick('satellite', selectedSatelliteKey, '/explore');
  }

  // Belt selection (v0.7.x). Same panel-mutex pattern.
  function selectBelt(id: string) {
    cue('select');
    selectedBeltId = id;
    panelState.belt = true;
    panelState.planet = false;
    panelState.sun = false;
    panelState.smallBody = false;
    panelState.satellite = false;
    trackItemClick('belt', id, '/explore');
  }

  // ?id=<planetId|sun|smallBodyId> deep-link → opens the matching panel
  // directly, mirroring the /mars?site= and /fly?mission= patterns.
  // Bookmarkable + share-friendly; also lets e2e tests open a planet
  // panel without depending on canvas-pixel pick math (which is fragile
  // under mobile-chromium DPR + animation timing).
  $effect(() => {
    // Force re-run when planetById / smallBodyById populate async —
    // both are $derived from localizedPlanets / SMALL_BODIES which
    // load after mount. Without these explicit reads, the effect's
    // dep tree is shaped only by the FIRST branch the if-ladder took,
    // and mars (which lives in planetById only) wouldn't re-trigger
    // when planetById updates from empty Map → 9 entries.
    void planetById;
    void smallBodyById;
    const id = $page.url.searchParams.get('id');
    if (!id) return;
    if (id === 'sun') {
      selectSun();
    } else if (id === 'pluto' && smallBodyById.has(id)) {
      // Pluto is in BOTH planets.json (legacy orbital ring) and
      // small-bodies.json (IAU 2006 dwarf-planet classification).
      // The small-body panel carries the curated science_sections
      // with body-specific `why` prefixes; the planet panel has
      // only the minimal name/type/fact/bio overlay. Prefer the
      // richer surface for deep-link landings.
      selectSmallBody(id);
    } else if (planetById.has(id)) {
      selectPlanet(id);
    } else if (smallBodyById.has(id)) {
      selectSmallBody(id);
    } else if (id === 'asteroid-belt' || id === 'belt:asteroid') {
      selectBelt('asteroid');
    } else if (id === 'kuiper-belt' || id === 'belt:kuiper') {
      selectBelt('kuiper');
    } else if (id.includes(':')) {
      const [parent, sat] = id.split(':', 2);
      if (parent && sat && planetById.has(parent)) selectSatellite(parent, sat);
    }
    // Unknown id → no-op; do not crash.
  });

  // #29 back-chain — mirror the open body panel into ?id= so mission
  // cross-links can chain back here (the resolver above reopens it on
  // back-nav). Shallow replaceState keeps canvas picks a fresh grid-style
  // selection (no history entry / no chain step); only real navigations to
  // other cards get chained by trackCardNavigation.
  let openBodyUrlId = $derived.by(() => {
    if (panelState.planet && selectedId) return selectedId;
    if (panelState.sun) return 'sun';
    if (panelState.smallBody && selectedSmallBodyId) return selectedSmallBodyId;
    if (panelState.satellite && selectedSatelliteKey) return selectedSatelliteKey;
    if (panelState.belt && selectedBeltId)
      return selectedBeltId === 'asteroid'
        ? 'asteroid-belt'
        : selectedBeltId === 'kuiper'
          ? 'kuiper-belt'
          : selectedBeltId;
    return null;
  });
  let everOpenedBody = false;
  $effect(() => {
    const id = openBodyUrlId;
    if (id) everOpenedBody = true;
    untrack(() => {
      const url = new URL($page.url);
      const cur = url.searchParams.get('id') ?? null;
      if (cur !== id && (id || everOpenedBody)) {
        // Never clobber a fresh ?id= deep-link before the resolver opens it —
        // only clear once a body has actually been open (a real user close).
        if (id) url.searchParams.set('id', id);
        else url.searchParams.delete('id');
        replaceState(url, $page.state);
      }
      // Record which card is on screen for the back-chain (the shallow
      // replaceState above doesn't reach SvelteKit's nav.from).
      if (everOpenedBody) setCurrentCard(id ? url : null);
    });
  });
  afterNavigate((nav) => {
    if (nav.to?.url) trackCardNavigation(nav.to.url, nav.type);
  });

  // v2 ?goto=<starId> — deep-link into the neighborhood + select + frame a named
  // star. Resolves each distinct value once (the URL-sync below re-writes the same
  // value, which must not re-fire the resolver).
  let lastGoto: string | null = null;
  $effect(() => {
    const g = $page.url.searchParams.get('goto');
    // gotoStarFn is set in onMount and isn't reactive, so a cold-load ?goto= is
    // resolved directly in onMount; this handles later in-session URL changes.
    if (g && g !== lastGoto && gotoStarFn) {
      lastGoto = g;
      gotoStarFn(g);
    }
  });
  // Mirror the open star panel into ?goto= (shallow, no history), like ?id= above.
  let openStarUrlId = $derived(panelState.star && selectedStarId ? selectedStarId : null);
  let everOpenedStar = false;
  $effect(() => {
    const id = openStarUrlId;
    if (id) everOpenedStar = true;
    untrack(() => {
      const url = new URL($page.url);
      const cur = url.searchParams.get('goto') ?? null;
      if (cur !== id && (id || everOpenedStar)) {
        if (id) url.searchParams.set('goto', id);
        else url.searchParams.delete('goto');
        lastGoto = id; // keep the resolver from re-firing on our own write
        replaceState(url, $page.state);
      }
    });
  });

  // v2 Slice 2 — ?system=<hostId>[&planet=<planetId>] deep-links into a BodyScene.
  let lastSystem: string | null = null;
  $effect(() => {
    const s = $page.url.searchParams.get('system');
    const pl = $page.url.searchParams.get('planet');
    if (s && s !== lastSystem && enterSystemFn) {
      lastSystem = s;
      untrack(() => enterSystemFn?.(s, pl ?? undefined));
    }
  });
  // Mirror the active BodyScene + selected planet into ?system / ?planet (shallow).
  let bodySysUrl = $derived(contextId === 'body-scene' ? activeBodyHostId : null);
  let everEnteredSystem = false;
  $effect(() => {
    const host = bodySysUrl;
    const planet = panelState.exoplanet && selectedExoplanet ? selectedExoplanet.planet.id : null;
    if (host) everEnteredSystem = true;
    untrack(() => {
      const url = new URL($page.url);
      const curSys = url.searchParams.get('system') ?? null;
      const curPl = url.searchParams.get('planet') ?? null;
      if (curSys !== host || curPl !== planet) {
        if (host) url.searchParams.set('system', host);
        else url.searchParams.delete('system');
        if (host && planet) url.searchParams.set('planet', planet);
        else url.searchParams.delete('planet');
        lastSystem = host; // don't re-fire the resolver on our own write
        if (host || everEnteredSystem) replaceState(url, $page.state);
      }
    });
  });

  // v2 Slice 4 — ?deepsky=<designation> deep-links into the immersive view.
  let lastDeepSky: string | null = null;
  $effect(() => {
    const d = $page.url.searchParams.get('deepsky');
    if (d && d !== lastDeepSky && deepSkyDeepLinkFn) {
      lastDeepSky = d;
      untrack(() => deepSkyDeepLinkFn?.(d));
    }
  });
  // Mirror the active deep-sky immersion into ?deepsky (shallow, no history).
  let deepSkyUrlDesignation = $derived(activeDeepSky ? activeDeepSky.designation : null);
  let everImmersedDeepSky = false;
  $effect(() => {
    const d = deepSkyUrlDesignation;
    if (d) everImmersedDeepSky = true;
    untrack(() => {
      const url = new URL($page.url);
      const cur = url.searchParams.get('deepsky') ?? null;
      if (cur !== d && (d || everImmersedDeepSky)) {
        if (d) url.searchParams.set('deepsky', d);
        else url.searchParams.delete('deepsky');
        // Only advance the resolver guard on entry; never reset it to null on
        // clear, or a transient URL write (e.g. the gateway's ?system write
        // racing our ?deepsky removal) would re-fire the resolver + re-immerse.
        if (d) lastDeepSky = d;
        replaceState(url, $page.state);
      }
    });
  });

  // v2 Slice 5 — ?galaxy=<pinId> deep-links into the Milky Way + selects a pin.
  let lastGalaxy: string | null = null;
  $effect(() => {
    const g = $page.url.searchParams.get('galaxy');
    if (g && g !== lastGalaxy && mwDeepLinkFn) {
      lastGalaxy = g;
      untrack(() => mwDeepLinkFn?.(g));
    }
  });
  // Mirror the selected Milky Way pin into ?galaxy (shallow, no history).
  let galaxyUrlId = $derived(contextId === 'milky-way' && selectedMwId ? selectedMwId : null);
  let everEnteredGalaxy = false;
  $effect(() => {
    const g = galaxyUrlId;
    if (g) everEnteredGalaxy = true;
    untrack(() => {
      const url = new URL($page.url);
      const cur = url.searchParams.get('galaxy') ?? null;
      if (cur !== g && (g || everEnteredGalaxy)) {
        if (g) url.searchParams.set('galaxy', g);
        else url.searchParams.delete('galaxy');
        if (g) lastGalaxy = g; // don't re-fire the resolver on our own write
        replaceState(url, $page.state);
      }
    });
  });

  // v2 Slice 6 — ?bh=<id> deep-links into a black hole's lensing render.
  let lastBh: string | null = null;
  $effect(() => {
    const v = $page.url.searchParams.get('bh');
    if (v && v !== lastBh && bhDeepLinkFn) {
      lastBh = v;
      untrack(() => bhDeepLinkFn?.(v));
    }
  });
  // Mirror the active black hole into ?bh (shallow, no history).
  let bhUrlId = $derived(activeBlackHole ? activeBlackHole.id : null);
  let everEnteredBh = false;
  $effect(() => {
    const v = bhUrlId;
    if (v) everEnteredBh = true;
    untrack(() => {
      const url = new URL($page.url);
      const cur = url.searchParams.get('bh') ?? null;
      if (cur !== v && (v || everEnteredBh)) {
        if (v) url.searchParams.set('bh', v);
        else url.searchParams.delete('bh');
        if (v) lastBh = v;
        replaceState(url, $page.state);
      }
    });
  });

  // #306 deep-link from MissionPanel "See path on /explore" — `?paths=1`
  // auto-activates the PATHS layer so users land with the iconic
  // trajectories already visible. `?focus=saturn` additionally selects
  // Saturn so the Cassini orbital tour is in view at panel zoom.
  $effect(() => {
    const paths = $page.url.searchParams.get('paths');
    const focus = $page.url.searchParams.get('focus');
    if (paths === '1') layers.paths = true;
    if (focus && planetById.has(focus)) selectPlanet(focus);
  });

  function closePanel() {
    panelState.planet = false;
  }

  function closeSunPanel() {
    panelState.sun = false;
  }

  function onPlanMission() {
    if (selectedPlanet?.missionable) {
      goto(`${base}/plan`);
    }
  }

  onMount(() => {
    if (!container || !canvas2d) return;

    // Single registry for every listener + disposable this scene
    // owns. The bottom-of-onMount cleanup block drains it LIFO. See
    // $lib/three/route-lifecycle.
    const lifecycle = createRouteLifecycle();

    // Hover-card lens subscriptions. Both signals start in browser only,
    // so they're safe inside onMount. When either flips we re-derive
    // tooltip visibility / expansion via the existing $derived above.
    stopLensWatch = onScienceLensChange((on) => {
      layerState.lens = on;
    });
    stopHoverLayerWatch = onLayerChange('hover', (on) => {
      layerState.hover = on;
    });

    // Async-load localised planet + sun data; safe to run alongside scene setup.
    const initialLocale = localeFromPage($page);
    getPlanets(initialLocale)
      .then((p) => {
        localizedPlanets = p;
      })
      .catch((err) => console.error('Failed to load planets:', err));
    getSun(initialLocale)
      .then((s) => {
        localizedSun = s;
      })
      .catch((err) => console.error('Failed to load sun:', err));

    // ──────────────────────────────────────────────────────────────
    // 3D — Three.js scene
    // ──────────────────────────────────────────────────────────────

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.5,
      8000,
    );
    // Quality tier (URL ?quality=… > user choice > cached detect-gpu >
    // medium fallback). Sync resolver so the scene builds without
    // awaiting the GPU benchmark; the background detect updates the
    // cache for the next visit. See lib/quality/quality-tier.ts.
    // Resolved BEFORE createSceneRenderer so the pixel-ratio cap is
    // threaded in at construction (single set, no post-hoc override).
    const url = new URL(window.location.href);
    const quality = resolveQualitySync(url);
    void kickOffBackgroundDetect();
    // Gate the per-planet 4K texture LOD on tier — on minimal/low (mobile,
    // weak GPU) the 4K fetch + GPU upload cost outweighs the visual win, so
    // those tiers stay at 2K throughout. Mirrors SurfaceScene's tex4kAllowed.
    // __MOBILE__: the Capacitor build ships 2K only (4K planet textures are
    // pruned off-device, ADR-079 D3) — force 2K regardless of resolved tier.
    const tex4kAllowed = quality.tier !== 'minimal' && quality.tier !== 'low' && !__MOBILE__;
    const renderer = createSceneRenderer(container, {
      pixelRatioCap: quality.pixelRatioCap,
      // Pure black surrounding space (matches /earth /moon /mars) rather than the
      // default dark-indigo clear (0x04040c).
      clearColor: 0x000000,
    });

    // Per-frame scratch vectors for the velocity-arrow overlay — reused
    // each frame instead of allocating `new THREE.Vector3()` per visible
    // planet (the animate loop runs these every frame). Safe to share:
    // each is written then consumed within a single loop iteration.
    const _orbitUp = new THREE.Vector3(0, 1, 0);
    const _velTangent = new THREE.Vector3();
    // ACES filmic tone mapping — HDR Sun → SDR roll-off so bright
    // highlights (bloomed Sun + lit planet sides) don't clip to flat
    // white. Matches the /fly helio scene's stack (#322).
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    // PRD-023 Slice A — enable shadow maps for Saturn's ring-shadow
    // effect. PCFSoftShadowMap is the cheap default; we scope the
    // perf cost by setting castShadow only on the ring mesh and
    // receiveShadow only on Saturn's planet mesh. Other planets +
    // moons + small bodies don't participate so the 6 cube-map
    // passes the PointLight shadow pipeline does each frame render
    // ~2 objects total. The sun's PointLight is the shadow caster
    // since its position is the physical Sun in the scene.
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Uniform sunlight from origin (distance=0 + decay=0). The r0.185 upgrade's
    // physically-correct lighting made the prior (…, 2500, 1.2) point light fall
    // off to near-zero across the planets' 50–430u orbits, so every planet
    // rendered black ("lost textures"). Match /fly's helio fix: treat the Sun as
    // a uniform source — still a point light at origin so Saturn's ring shadow
    // casts correctly.
    const sunLight = new THREE.PointLight(0xfff4d0, 3.5, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.1;
    sunLight.shadow.bias = -0.001;
    scene.add(sunLight);
    // HemisphereLight replaces the prior AmbientLight(0x111133, 0.8) —
    // ambient at 0.8 was flattening shadow contrast (the #1 amateur-CG
    // tell per the shot-language guide). Hemisphere at 0.08 keeps the
    // shadow side legible without erasing the single-Sun direction.
    // Sky-side faint deep-space tint; ground-side near-black so the
    // underside doesn't pick up an unphysical glow.
    scene.add(new THREE.HemisphereLight(0x08101a, 0x000000, 0.08));
    const fill = new THREE.DirectionalLight(0x223366, 0.3);
    fill.position.set(-200, 100, -200);
    scene.add(fill);

    const textureLoader = new THREE.TextureLoader();
    // PBR migration (2026-06-15): MeshStandardMaterial expects albedo
    // textures to be tagged with `colorSpace = SRGBColorSpace` so the
    // engine de-gammas the sRGB-encoded JPGs into linear before
    // lighting math, then the renderer re-gammas at output. Without
    // this tag the texture is treated as already-linear, lighting
    // operates on the wrong values, and the output gamma pass produces
    // washed-out / desaturated colors. Applies to every albedo + every
    // emissive map; normal/roughness maps (which we don't have yet)
    // would stay Linear.
    const loadTexture = (file: string): THREE.Texture => {
      const tex = textureLoader.load(`${base}/textures/${file}`);
      // r128 API — colorSpace property was added in r152. The earlier
      // `tex.colorSpace = THREE.SRGBColorSpace` lines were silent no-ops
      // here (typeof THREE.SRGBColorSpace === 'undefined' in r128).
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    // Per-planet texture LOD swap (#287). 2K base loads eagerly so
    // the first paint of /explore stays cheap. 4K lazy-loads when the
    // camera approaches a planet (per-body distance threshold). Sun
    // gets the same treatment via its own pair below. Uranus +
    // Neptune skip LOD because SSS doesn't publish a 4K source for
    // either; they stay 2K eagerly.
    const SUN_RADIUS = 18;
    const PLANET_LOD_IN_RATIO = 15; // distance / planet_size ≤ this → swap to 4K + reveal moons
    const PLANET_LOD_OUT_RATIO = 20; // distance / planet_size ≥ this → swap back to 2K + hide moons
    type LodState = {
      currentLevel: '2k' | '4k';
      tex2k: THREE.Texture;
      tex4k: THREE.Texture | null;
      loadStarted: boolean;
    };

    const sunMap2k = loadTexture('2k_sun.jpg');
    let sunMap4k: THREE.Texture | null = null;
    let sun4kLoadStarted = false;
    let sunLodLevel: '2k' | '4k' = '2k';
    const sunMaterial = new THREE.MeshBasicMaterial({ map: sunMap2k, color: 0xfff0a0 });
    const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(SUN_RADIUS, 32, 32), sunMaterial);
    sunMesh.userData = { planetId: '__sun__' };
    scene.add(sunMesh);
    function ensureSun4kLoaded(): void {
      // __MOBILE__: 4k_sun.jpg is pruned off-device (ADR-079 D3) — stay at 2K.
      if (sun4kLoadStarted || __MOBILE__) return;
      sun4kLoadStarted = true;
      textureLoader.load(
        `${base}/textures/4k_sun.jpg`,
        (tex) => {
          // Sun map is rendered via MeshBasicMaterial (unlit) but
          // still benefits from sRGB tagging so the texture's
          // mid-tones don't shift when output gamma is applied.
          tex.colorSpace = THREE.SRGBColorSpace;
          sunMap4k = tex;
        },
        undefined,
        () => {
          sun4kLoadStarted = false; // allow retry next threshold cross
        },
      );
    }
    function updateSunLod(distanceToSun: number): void {
      const ratio = distanceToSun / SUN_RADIUS;
      if (ratio <= PLANET_LOD_IN_RATIO) {
        ensureSun4kLoaded();
        if (sunMap4k && sunLodLevel !== '4k') {
          sunMaterial.map = sunMap4k;
          sunMaterial.needsUpdate = true;
          sunLodLevel = '4k';
        }
      } else if (ratio >= PLANET_LOD_OUT_RATIO && sunLodLevel !== '2k') {
        sunMaterial.map = sunMap2k;
        sunMaterial.needsUpdate = true;
        sunLodLevel = '2k';
      }
    }
    const glowConfigs: Array<{ r: number; color: number; opacity: number }> = [
      { r: 22, color: 0xffdd66, opacity: 0.18 },
      { r: 40, color: 0xff9922, opacity: 0.08 },
      { r: 58, color: 0xff6600, opacity: 0.04 },
      { r: 76, color: 0xff4400, opacity: 0.02 },
    ];
    for (const g of glowConfigs) {
      scene.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(g.r, 16, 16),
          new THREE.MeshBasicMaterial({
            color: g.color,
            transparent: true,
            opacity: g.opacity,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        ),
      );
    }

    // Layered cinematic star field — dim background + bright sparkle +
    // Milky Way band, counts gated by quality tier so low-end devices
    // render fewer points. Shared with /fly + /iss + /tiangong; shell
    // radius matches /explore's wide stellar outer shell.
    scene.add(
      createLayeredStarField({
        counts: {
          dim: quality.starsDim,
          bright: quality.starsBright,
          milkyWay: quality.starsMilkyWay,
        },
        shellRadius: 3000,
      }),
    );

    // Post-processing — EffectComposer + RenderPass + (optional)
    // UnrealBloomPass. Bloom is tier-gated (medium+) so minimal/low
    // skips the extra blit on weaker GPUs. Sun glow is the marquee
    // beneficiary (already textured emissive — bloom amplifies it
    // without changing the underlying material). Selection halo +
    // material-based outline still work because the composer just
    // wraps the same scene.render call.
    const composer = new EffectComposer(renderer);
    composer.setSize(container.clientWidth, container.clientHeight);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatioCap));
    composer.addPass(new RenderPass(scene, camera));
    let bloomPass: UnrealBloomPass | null = null;
    if (quality.bloomEnabled) {
      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight),
        quality.bloomStrength,
        quality.bloomRadius,
        quality.bloomThreshold,
      );
      composer.addPass(bloomPass);
    }

    // Expose to the DebugPanel "Rendering" tab (#334) — the template-
    // mounted <RenderingDebugRegistrar> picks these up reactively.
    liveRenderer = renderer;
    liveQuality = quality;
    liveQualitySource = resolveQualitySource(url);
    liveBloomPass = bloomPass;
    activeQualityTier = quality.tier;
    // Drive the DebugPanel Rendering tab's frame-monitor readout uniformly
    // with the other 3D routes (#89). Observability only — onStruggle no-op.
    const frameMonitor = attachFrameMonitor({ onStruggle: () => {} });
    liveFrameMonitor = frameMonitor;
    lifecycle.add(() => frameMonitor.stop());

    // Belt geometry helper — fills a Float32 position buffer with `count`
    // particles uniformly distributed across an annulus between `inner`
    // and `outer` scene radii with a small vertical jitter `slab`.
    // Reused for the asteroid belt + Kuiper Belt so both share the same
    // sampling shape (different radii + colors + densities).
    const sampleBelt = (count: number, inner: number, outer: number, slab: number) => {
      const arr = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = inner + Math.random() * (outer - inner);
        arr[i * 3] = Math.cos(a) * r;
        arr[i * 3 + 1] = (Math.random() - 0.5) * slab;
        arr[i * 3 + 2] = Math.sin(a) * r;
      }
      return arr;
    };

    // Asteroid Belt — 2.2–3.2 AU compressed to scene 195–237 (between
    // Mars at 155 and Jupiter at 248). Warm sandy palette.
    const asteroidBeltGeo = new THREE.BufferGeometry();
    asteroidBeltGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(sampleBelt(1800, 195, 237, 8), 3),
    );
    const asteroidBelt = new THREE.Points(
      asteroidBeltGeo,
      new THREE.PointsMaterial({
        color: 0xb8a470,
        size: 1.0,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.5,
      }),
    );
    scene.add(asteroidBelt);

    // Kuiper Belt — real bounds 30–50 AU. In the compressed outer-system
    // scale (Neptune at 430, Pluto at 580) we map that to scene 460–620,
    // a wider, cooler band beyond Neptune (2026-06-06 user direction:
    // "is there another comet belt further out? I think there is").
    // Cooler bluish palette to read as icy rather than rocky; sparser
    // density (smaller particle count over a much larger area).
    const kuiperBeltGeo = new THREE.BufferGeometry();
    kuiperBeltGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(sampleBelt(2200, 460, 620, 14), 3),
    );
    const kuiperBelt = new THREE.Points(
      kuiperBeltGeo,
      new THREE.PointsMaterial({
        color: 0x9fc6e3,
        size: 1.1,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.4,
      }),
    );
    scene.add(kuiperBelt);

    // Invisible pick-aid rings — wide flat tori the raycaster can hit
    // for the otherwise-unhittable particle clouds. visible:true with
    // opacity:0 keeps them in the raycaster path but invisible to the
    // user (same trick as the planet pickAids elsewhere). Tilted to
    // the ecliptic so they stay coplanar with the particles.
    const buildBeltPickAid = (id: string, inner: number, outer: number) => {
      // TorusGeometry expects (radius, tube, radialSegments, tubularSegments).
      // Use a flat disk-like torus: radius = mid, tube = (outer-inner)/2,
      // tubularSegments high so the ring is smooth at heliocentric framing.
      const radius = (inner + outer) / 2;
      const tube = (outer - inner) / 2;
      const geo = new THREE.TorusGeometry(radius, tube, 2, 96);
      const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = Math.PI / 2; // align to ecliptic plane
      mesh.userData = { beltId: id };
      return mesh;
    };
    const asteroidBeltPick = buildBeltPickAid('asteroid', 195, 237);
    const kuiperBeltPick = buildBeltPickAid('kuiper', 460, 620);
    scene.add(asteroidBeltPick);
    scene.add(kuiperBeltPick);

    // Planet orbit rings — refs kept so the LAYERS panel can toggle
    // the entire planets layer (rings + bodies) in lockstep.
    const planetOrbitLines: THREE.LineLoop[] = [];
    PLANETS.forEach((p) => {
      const inc = (p.inc * Math.PI) / 180;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        const x = Math.cos(a) * p.orbitR;
        const zf = Math.sin(a) * p.orbitR;
        pts.push(new THREE.Vector3(x, zf * Math.sin(inc), zf * Math.cos(inc)));
      }
      // 2026-06-03 user direction: "Make planet orbits look more
      // like moon orbits (more visible)." Bumped opacity 0.06 → 0.25
      // and tinted the line pale-blue to match the moon-orbit style.
      const mat = new THREE.LineBasicMaterial({
        color: 0xc0d0ff,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      });
      const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat);
      planetOrbitLines.push(line);
      scene.add(line);
    });

    type SatelliteObj = {
      def: SatelliteDef;
      mesh: THREE.Mesh;
      /** Dashed orbit ring — gated on close zoom via PLANET_LOD_IN_RATIO
       *  in the per-frame loop so the rings only reveal alongside the
       *  spin axis + atmospheric halo. */
      orbitLine: THREE.LineLoop;
      /** Per-frame angular phase (radians) — incremented from simT
       *  scaled by 1 / periodDays. */
      angle: number;
      /** Cached inclination radians so the per-frame loop avoids the
       *  per-call deg→rad multiply. */
      inclRad: number;
    };
    type PlanetObj = {
      group: THREE.Group;
      mesh: THREE.Mesh;
      pickAid: THREE.Mesh;
      planet: PlanetVisual;
      material: THREE.MeshStandardMaterial;
      lod?: LodState;
      /** Optional natural-satellite layer. Each satellite is a child
       *  of this PlanetObj's `group` so it inherits the parent's
       *  orbital motion; per-frame code positions it relative to the
       *  parent and gates visibility on camera→parent distance. */
      satellites: SatelliteObj[];
      /** Group holding all satellites — hidden until the camera
       *  zooms close. Single visibility flip per planet per frame. */
      satellitesGroup: THREE.Group;
      /** Optional atmospheric halo shell — same reveal gating as
       *  the satellite layer. null when the planet's halo field is
       *  absent (Mercury / Mars / Uranus / Neptune). */
      haloMesh: THREE.Mesh | null;
      haloMaterial: THREE.MeshBasicMaterial | null;
      /** PRD-023 Slice A — spin-axis indicator. Thin line through
       *  the planet at its real obliquity. Universal across planets
       *  (every body has a tilt); revealed at close zoom only. */
      spinAxis: THREE.Line;
      /** PRD-023 Slice A.3 — active orbiters as 3D glyphs (MRO, Juno,
       *  Akatsuki, etc). Per-orbiter angular phase + cached
       *  inclination radians for the per-frame motion update. */
      orbiters: OrbiterObj[];
      /** Group holding all orbiter glyphs; flipped visible at close
       *  zoom alongside moons + halo + spin axis. */
      orbitersGroup: THREE.Group;
      /** PRD-023 Slice B — Hill-sphere wireframe (gravity dominance
       *  boundary). Sized 6× planet radius — stylised, not real-scale
       *  (real Hill spheres can exceed the planet's orbit). Lens-
       *  gated by 'hill-sphere' layer. */
      hillSphere: THREE.LineSegments;
      /** PRD-023 Slice B — L1 + L2 markers along the planet-Sun line.
       *  L3 / L4 / L5 are off-frame at planet-focus zoom; skipped. */
      lagrangeL1: THREE.Mesh;
      lagrangeL2: THREE.Mesh;
      lagrangeL1Label: THREE.Sprite;
      lagrangeL2Label: THREE.Sprite;
      /** PRD-023 Slice D — stylised magnetosphere shell. Only planets
       *  with substantial magnetic fields get one (Earth + the gas
       *  giants); rocky bodies sans dynamo skip. Null when absent. */
      magnetosphere: THREE.Mesh | null;
      /** PRD-023 Slice D — sub-solar point marker. Small bright sprite
       *  at the planet's surface noon longitude. Universal. */
      subSolar: THREE.Mesh;
      /** PRD-023 Slice E.3a — N + S badges at the ends of the spin
       *  axis line + a curved arrow on the equator showing rotation
       *  direction. Always-on with the spin axis. */
      northBadge: THREE.Sprite;
      southBadge: THREE.Sprite;
      rotationArrow: THREE.Line;
      /** PRD-023 Slice E.3b — magnetic dipole axis (cyan line). Null
       *  when the planet has no intrinsic dipole (Venus, Mars, Pluto).
       *  Gated by the magnetosphere lens layer. */
      magneticAxis: THREE.Line | null;
    };
    type OrbiterObj = {
      group: THREE.Group;
      fleetId: string | null;
      orbitU: number;
      phase: number;
      inclRad: number;
      nodeRad: number;
      periodFrac: number;
    };
    const planetObjs: PlanetObj[] = PLANETS.map((p) => {
      const group = new THREE.Group();
      const tex2k = loadTexture(p.texture);
      // PRD-023 Slice A — optional emissive (night-side) texture for
      // Earth's city lights. MeshStandardMaterial adds emission on
      // top of the lighting calculation; emission isn't multiplied
      // by light direction, so on the day side the bright day texture
      // overwhelms the city lights, and on the night side the lit-up
      // cities glow against the dark surface. emissiveIntensity is
      // bumped from the default 0.06 (faint planet-tint glow) to 1.0
      // when an emissiveMap is supplied so the cities read.
      //
      // 2026-06-15 — migrated MeshPhongMaterial → MeshStandardMaterial
      // (three.js PBR default). No envMap (nothing in the scene is
      // reflective enough to justify the PMREMGenerator cost).
      // roughness 1.0 + metalness 0 ≈ pure Lambertian: kills the broad
      // white specular hotspot the prior shininess: 25 + specular:
      // 0x222222 setup produced on gas-giant cloud-tops and rocky
      // surfaces. Per-planet tuning (e.g. an ocean roughness map for
      // Earth glint) can layer on top of this base without changing
      // the material type.
      const emissiveMapTex = p.emissiveMap ? loadTexture(p.emissiveMap) : undefined;
      const mat = new THREE.MeshStandardMaterial({
        map: tex2k,
        // 0xb0b0b0 (~69% gray) — multiplies the texture's albedo
        // before lighting. Real-world Bond-albedo values (Saturn ~0.34,
        // Jupiter ~0.34, Earth ~0.30, Mars ~0.25) sit well below 1.0,
        // but our public-domain equirectangular textures are baked at
        // ~0.8–0.95 brightness so the Sun-side image is recognisable
        // on unlit reference renders. Scaling color down here brings
        // the effective albedo into a range where the diffuse term
        // (color × NdotL) doesn't clip to white at sub-solar even on
        // bright bodies (Saturn cream cloud-tops, Jupiter bright belts).
        color: 0xb0b0b0,
        emissive: p.emissiveMap ? 0xffffff : p.color3,
        emissiveMap: emissiveMapTex,
        // emissive floor 0.10 (was 0.06) — gives each planet a faint
        // self-illumination tint of its own characteristic color (red
        // for Mars, blue-grey for Neptune, etc.) so heliocentric-zoom
        // views read as "colourful solar system" rather than "black
        // dots arranged around a Sun." Still tiny relative to the
        // diffuse term on the day side, so it doesn't lift the night
        // side enough to wash out the single-Sun direction cue.
        emissiveIntensity: p.emissiveMap ? 1.0 : 0.1,
        roughness: 1.0,
        metalness: 0,
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.size3, 32, 32), mat);
      mesh.userData = { planetId: p.id };
      // PRD-023 Slice A — Saturn's planet mesh receives the ring-cast
      // shadow. Limited to Saturn because no other planet has a ring
      // system in the catalogue today, and `receiveShadow` adds a per-
      // pixel shadow-map sample that we don't need elsewhere.
      if (p.id === 'saturn') mesh.receiveShadow = true;
      group.add(mesh);
      // Pick-aid: invisible larger sphere co-located with the visible
      // mesh so hover-pick is forgiving on small / fast-moving planets.
      // Mercury's visible size3 is 2.8 units — without the aid users
      // have to land the cursor in a sub-degree window; with a 2.5×
      // pick radius the target is much more reachable. Material is
      // transparent + opacity 0 so it doesn't render but the raycaster
      // still hits it (visible:true is the magic — opacity 0 with
      // visible:true keeps geometry pickable while invisible).
      const pickAid = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(p.size3 * 2.5, 6), 16, 16),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      );
      pickAid.userData = { planetId: p.id, isPickAid: true };
      group.add(pickAid);
      if (p.hasRings) {
        // Saturn's ring system rendered as concentric bands rather than
        // a single flat disk (2026-06-06 user direction: "Saturn rings
        // are rendered in explore as flat disk, let's try to bring some
        // texture/color and make them more realistic"). Mapped to the
        // canonical C / B / A ring + Cassini Division boundaries
        // (Cassini ratio ~2.025–2.07 in Saturn radii). Inner/outer radii
        // scaled to the existing 1.4–2.6 size3 envelope so the visual
        // footprint is unchanged.
        const r0 = p.size3 * 1.4;
        const rOuter = p.size3 * 2.6;
        const span = rOuter - r0;
        const ringsGroup = new THREE.Group();
        const ringBands: Array<{
          inner: number;
          outer: number;
          color: number;
          opacity: number;
        }> = [
          // C ring — inner, dusky, semi-transparent.
          { inner: 0.0, outer: 0.18, color: 0x8a7858, opacity: 0.35 },
          // B ring — densest + brightest band.
          { inner: 0.18, outer: 0.55, color: 0xf1d7a3, opacity: 0.62 },
          // Cassini Division — sharp dark gap visible from Earth.
          { inner: 0.55, outer: 0.6, color: 0x4a3f2c, opacity: 0.18 },
          // A ring — slightly cooler tone than B.
          { inner: 0.6, outer: 0.92, color: 0xddc497, opacity: 0.5 },
          // Encke Gap — narrow dark sliver near A-ring outer.
          { inner: 0.92, outer: 0.94, color: 0x4a3f2c, opacity: 0.15 },
          // F ring outer halo — diffuse.
          { inner: 0.94, outer: 1.0, color: 0xe4d191, opacity: 0.28 },
        ];
        for (const b of ringBands) {
          const rg = new THREE.RingGeometry(r0 + b.inner * span, r0 + b.outer * span, 96);
          const rm = new THREE.MeshBasicMaterial({
            color: b.color,
            transparent: true,
            opacity: b.opacity,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const ringMesh = new THREE.Mesh(rg, rm);
          // PRD-023 Slice A — ring bands cast the shadow that lands on
          // Saturn's cloud tops. The Cassini Division + Encke Gap bands
          // also cast, but their low opacity means the shadow they
          // produce reads as a faint break in the main ring shadow —
          // matches the real photographic look.
          ringMesh.castShadow = true;
          ringsGroup.add(ringMesh);
        }
        ringsGroup.rotation.x = Math.PI / 2.2;
        group.add(ringsGroup);
      }
      // Satellites — built up-front (no lazy load) since their
      // textures share the same lazy 4K LOD philosophy as the parent
      // planet: only loaded once but only revealed when the camera
      // 2026-06-03: visible at construction (was hidden default) per
      // user direction — moons should appear at heliocentric framing
      // as well, not only after fly-to. Their small size (Moon at 0.9
      // vs Earth at 5.2) keeps the wide-zoom view uncluttered.
      const satellitesGroup = new THREE.Group();
      satellitesGroup.visible = true;
      const satellites: SatelliteObj[] = (p.satellites ?? []).map((s) => {
        // Texture optional: bodies without a sourced equirectangular
        // map (e.g. Uranus + Neptune moons today) fall back to a flat
        // colour. #304 Slice 3 — texture sourcing tracked separately.
        const satMat = s.texture
          ? new THREE.MeshStandardMaterial({
              map: loadTexture(s.texture),
              color: 0xffffff,
              roughness: 1.0,
              metalness: 0,
            })
          : new THREE.MeshStandardMaterial({
              color: s.fallbackColor ?? 0xc8c8c8,
              roughness: 1.0,
              metalness: 0,
            });
        const satMesh = new THREE.Mesh(new THREE.SphereGeometry(s.sizeUnits, 32, 32), satMat);
        satMesh.userData = { satelliteId: s.id, parentPlanetId: p.id };
        satellitesGroup.add(satMesh);
        // Invisible pick aid — co-located child of satMesh so it
        // inherits world position automatically. Sized 3× the visible
        // radius (floor at 4 units) so the moon stays clickable at
        // wide zoom where the visible body is sub-pixel (#304 Slice
        // 1, 2026-06-03).
        const satPickAid = new THREE.Mesh(
          new THREE.SphereGeometry(Math.max(s.sizeUnits * 3, 4), 12, 12),
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
        );
        satPickAid.userData = { satelliteId: s.id, parentPlanetId: p.id, isPickAid: true };
        satMesh.add(satPickAid);

        // 2026-06-03 user direction: "When we zoom in to Earth that
        // [it] is normal with texture with orbit around it and that
        // it all makes sense." Per-satellite orbit line — thin
        // LineLoop circle at radius orbitUnits, inclined by inclRad
        // around the local X axis. Parented to the satellitesGroup
        // so it inherits the same visibility + parent transform as
        // the moons themselves; opacity dialled low so the line
        // reads as a guide, not a competing visual element.
        const orbitPts: THREE.Vector3[] = [];
        const inclRad = ((s.inclDeg ?? 0) * Math.PI) / 180;
        const cosI = Math.cos(inclRad);
        const sinI = Math.sin(inclRad);
        const segments = 96;
        for (let i = 0; i <= segments; i++) {
          const a = (i / segments) * 2 * Math.PI;
          orbitPts.push(
            new THREE.Vector3(
              Math.cos(a) * s.orbitUnits,
              Math.sin(a) * s.orbitUnits * sinI,
              Math.sin(a) * s.orbitUnits * cosI,
            ),
          );
        }
        const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
        // 2026-06-06 user direction: "I would like to see some kind of
        // orbit of natural satellites around planet draw, maybe
        // different kind of line." Switched to a dashed white line at
        // moderate opacity so moon orbits read as a distinct visual
        // grammar from planet orbits (solid pale-blue) — dashed = sub-
        // orbit, solid = heliocentric. Requires computeLineDistances()
        // on the geometry for the dash pattern to register.
        const orbitMat = new THREE.LineDashedMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
          dashSize: s.orbitUnits * 0.06,
          gapSize: s.orbitUnits * 0.035,
        });
        const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat);
        orbitLine.computeLineDistances();
        satellitesGroup.add(orbitLine);

        // Hide the dashed orbit ring at default zoom — only reveals at
        // the same PLANET_LOD_IN_RATIO threshold as the spin axis +
        // atmospheric halo (2026-06-06 user direction: "show natural
        // satellite orbits only when zoomed in"). Gated in the per-
        // frame loop alongside halo/spinAxis visibility.
        orbitLine.visible = false;
        return {
          def: s,
          mesh: satMesh,
          orbitLine,
          // Initial angle deterministically spread by id-hash so
          // multiple moons around a single parent don't pile up at
          // phase 0 when the page first loads.
          angle:
            ([...s.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0) % 360) *
            (Math.PI / 180),
          inclRad,
        };
      });
      group.add(satellitesGroup);

      // Active orbiters as 3D glyphs (PRD-023 Slice A.3) — small
      // spacecraft markers around the parent planet, sourced from
      // static/data/explore-orbiters.json. Each glyph is a tiny
      // colored cylinder + solar panel; not photo-realistic but
      // identifiable as "active spacecraft" + clickable for fleet
      // cross-link in a follow-up sub-slice. Altitude_km is
      // compressed via a planet-relative scale so multi-orbiter
      // systems (Mars has 7) read with visible spread instead of
      // piling up on one altitude band.
      const orbitersGroup = new THREE.Group();
      orbitersGroup.visible = false;
      const orbiterDefs = exploreOrbitersData.orbiters.filter((o) => o.parent === p.id);
      const orbiters: OrbiterObj[] = orbiterDefs.map((o, i) => {
        // Scale altitude into scene units. Linear: scale so the lowest
        // orbiter (~300 km MRO) sits 0.4 × planet size3 above the
        // surface and the highest (~76 000 km Mangalyaan) sits 4.0 ×
        // planet size3 above. Logarithmic feels more honest given
        // the range, but planet-size scale stays read at this view.
        const km = o.altitude_km;
        const lowKm = 300;
        const highKm = 76000;
        const lowU = p.size3 * 1.4;
        const highU = p.size3 * 5;
        const tAlt = Math.max(
          0,
          Math.min(
            1,
            (Math.log10(km) - Math.log10(lowKm)) / (Math.log10(highKm) - Math.log10(lowKm)),
          ),
        );
        const orbitU = lowU + (highU - lowU) * tAlt;

        // Simple glyph: small cylinder bus + flat solar panel. Color
        // from the JSON entry (agency-tinted).
        const orbGroup = new THREE.Group();
        const colorInt = parseInt(o.color.slice(1), 16);
        const bus = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.18, 0.45, 8),
          new THREE.MeshBasicMaterial({ color: 0xeeeeee }),
        );
        bus.rotation.z = Math.PI / 2;
        orbGroup.add(bus);
        const panel = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.6, 0.9),
          new THREE.MeshBasicMaterial({ color: colorInt }),
        );
        orbGroup.add(panel);
        orbGroup.userData = { orbiterId: o.fleet_id, parentPlanet: o.parent };
        orbitersGroup.add(orbGroup);

        // Initial angular spread — hash-deterministic so multiple
        // orbiters per planet don't pile up at phase 0.
        const phaseHash = [...(o.fleet_id ?? o.name)].reduce(
          (h, c) => (h * 31 + c.charCodeAt(0)) >>> 0,
          0,
        );
        return {
          group: orbGroup,
          fleetId: o.fleet_id,
          orbitU,
          phase: ((phaseHash % 360) / 360) * Math.PI * 2,
          inclRad: (o.inclination_deg * Math.PI) / 180,
          // Random-ish per-orbiter period offset so they visibly
          // separate over time. Roughly: 1 + i/4 orbital periods per
          // sim-time cycle. Not real Kepler — visualization motion.
          nodeRad: (((phaseHash >> 4) % 360) / 360) * Math.PI * 2,
          periodFrac: 1 + i * 0.25,
        };
      });
      group.add(orbitersGroup);

      // Hill sphere (PRD-023 Slice B) — stylised wireframe sphere
      // marking the planet's gravity-dominance boundary. Real Hill
      // spheres can be larger than the planet's orbit (Earth's is
      // ~236 Earth radii); at /explore's compressed scene scale we
      // render at 6× planet radius for legibility. Lens-gated by
      // the 'hill-sphere' layer.
      const hillGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(p.size3 * 6, 16, 12));
      const hillMat = new THREE.LineBasicMaterial({
        color: 0xff66cc,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      });
      const hillSphere = new THREE.LineSegments(hillGeo, hillMat);
      hillSphere.userData.layerKey = 'hill-sphere';
      hillSphere.visible = false;
      group.add(hillSphere);

      // Lagrange L1 + L2 markers (PRD-023 Slice B) — two small dots
      // along the planet-Sun line, at ~Hill-radius distance. L1 sits
      // between planet and Sun; L2 on the far side (where JWST
      // orbits Earth's L2). Lens-gated by 'lagrange-points'.
      const lagrangeMat = new THREE.MeshBasicMaterial({
        color: 0xffd766,
        transparent: true,
        opacity: 0.95,
      });
      const lagrangeL1 = new THREE.Mesh(
        new THREE.SphereGeometry(p.size3 * 0.18, 16, 16),
        lagrangeMat,
      );
      lagrangeL1.userData.layerKey = 'lagrange-points';
      lagrangeL1.userData.lagrangeKind = 'L1';
      lagrangeL1.userData.lagrangePlanetId = p.id;
      lagrangeL1.visible = false;
      group.add(lagrangeL1);
      const lagrangeL2 = new THREE.Mesh(
        new THREE.SphereGeometry(p.size3 * 0.18, 16, 16),
        lagrangeMat,
      );
      lagrangeL2.userData.layerKey = 'lagrange-points';
      lagrangeL2.userData.lagrangeKind = 'L2';
      lagrangeL2.userData.lagrangePlanetId = p.id;
      lagrangeL2.visible = false;
      group.add(lagrangeL2);
      const lagrangeL1Label = buildArrowTipLabel('L1', '#ffd766', 3.2);
      lagrangeL1Label.userData.layerKey = 'lagrange-points';
      lagrangeL1Label.visible = false;
      group.add(lagrangeL1Label);
      const lagrangeL2Label = buildArrowTipLabel('L2', '#ffd766', 3.2);
      lagrangeL2Label.userData.layerKey = 'lagrange-points';
      lagrangeL2Label.visible = false;
      group.add(lagrangeL2Label);

      // Magnetosphere shell (PRD-023 Slice D) — stylised emissive
      // ellipsoid stretched along the planet→anti-sun axis (the
      // direction the magnetotail extends). Real magnetospheres are
      // teardrop-shaped + scaled wildly (Jupiter's tail reaches past
      // Saturn's orbit); we render a compact 4× planet radius
      // ellipsoid as a sci-fi-flavoured indicator. Only planets with
      // significant dynamos get one: Earth + the four gas giants.
      let magnetosphere: THREE.Mesh | null = null;
      if (
        p.id === 'earth' ||
        p.id === 'jupiter' ||
        p.id === 'saturn' ||
        p.id === 'uranus' ||
        p.id === 'neptune'
      ) {
        const magGeo = new THREE.SphereGeometry(p.size3 * 4, 24, 16);
        const magMat = new THREE.MeshBasicMaterial({
          color: p.id === 'jupiter' ? 0xff66dd : 0x66ddff,
          transparent: true,
          opacity: 0.08,
          side: THREE.BackSide,
          depthWrite: false,
        });
        magnetosphere = new THREE.Mesh(magGeo, magMat);
        magnetosphere.scale.set(1, 0.7, 2.4); // stretched along Z
        magnetosphere.userData.layerKey = 'magnetosphere';
        magnetosphere.visible = false;
        group.add(magnetosphere);
      }

      // Sub-solar point marker (PRD-023 Slice D) — small bright dot
      // at the planet's surface where the Sun is directly overhead
      // (i.e. the noon longitude). Per-frame the position is set
      // from the planet→Sun unit vector × planet radius.
      const subSolar = new THREE.Mesh(
        new THREE.SphereGeometry(p.size3 * 0.08, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.95 }),
      );
      subSolar.userData.layerKey = 'sub-solar';
      subSolar.visible = false;
      group.add(subSolar);

      // Spin-axis indicator (PRD-023 Slice A) — a thin line through
      // the planet's centre at the real obliquity. Rendered along
      // (sin(tilt), cos(tilt), 0) so the tilt is visible from the
      // default camera azimuth. Extends 1.5× planet radius past each
      // pole. Hidden by default; reveals at close zoom alongside the
      // moon + halo layers.
      const spinAxisLen = p.size3 * 1.5;
      const spinTiltRad = (p.axialTiltDeg * Math.PI) / 180;
      const spinAxisPts = [
        new THREE.Vector3(
          Math.sin(spinTiltRad) * spinAxisLen,
          Math.cos(spinTiltRad) * spinAxisLen,
          0,
        ),
        new THREE.Vector3(
          -Math.sin(spinTiltRad) * spinAxisLen,
          -Math.cos(spinTiltRad) * spinAxisLen,
          0,
        ),
      ];
      const spinAxisGeo = new THREE.BufferGeometry().setFromPoints(spinAxisPts);
      const spinAxisMat = new THREE.LineBasicMaterial({
        color: 0xffd766,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      });
      const spinAxis = new THREE.Line(spinAxisGeo, spinAxisMat);
      spinAxis.visible = false;
      group.add(spinAxis);

      // PRD-023 Slice E.3a — N + S badges at the spin-axis endpoints.
      // The labels make N pole position explicit at a glance — critical
      // for Venus (177° tilt = N "down") and Uranus (97° tilt = N
      // pointing toward the orbit). Plus a curved arrow on the equator
      // showing rotation direction (counterclockwise viewed from N for
      // prograde rotation; flipped for Venus + Uranus's negative
      // rotation period). Always-on at close zoom alongside the spin
      // axis itself.
      const northBadge = buildArrowTipLabel('N', '#ffd766', 1.6);
      northBadge.position.copy(spinAxisPts[0]).multiplyScalar(1.15);
      northBadge.visible = false;
      group.add(northBadge);
      const southBadge = buildArrowTipLabel('S', '#9aa6b8', 1.6);
      southBadge.position.copy(spinAxisPts[1]).multiplyScalar(1.15);
      southBadge.visible = false;
      group.add(southBadge);

      // Rotation-direction arrow — a small arc on the equator (in the
      // tilted equatorial plane) with a chevron at one end. Direction
      // (forward / backward) tracks the sign of rotationHours so Venus
      // + Uranus visibly curl the other way.
      const isRetrograde = p.rotationHours < 0;
      const rotArcPts: THREE.Vector3[] = [];
      const rotArcR = p.size3 * 1.1;
      const arcSpan = Math.PI / 1.5; // about 120° of arc
      // Equatorial plane = perpendicular to the spin axis. Spin axis
      // points along (sin(tilt), cos(tilt), 0); the equator lies in
      // the plane containing the Z-axis + the tilted-X-direction.
      // For visual clarity we sweep a fixed arc + flip its direction
      // based on retrograde sign.
      for (let i = 0; i <= 24; i++) {
        const t = (i / 24) * arcSpan * (isRetrograde ? -1 : 1);
        const ex = Math.cos(t) * rotArcR;
        const ez = Math.sin(t) * rotArcR;
        // Rotate the (ex, 0, ez) point into the planet's equatorial
        // plane (perpendicular to the tilted spin axis). For now we
        // approximate by tilting around Z by spinTiltRad.
        rotArcPts.push(
          new THREE.Vector3(ex * Math.cos(spinTiltRad), -ex * Math.sin(spinTiltRad), ez),
        );
      }
      const rotArcGeo = new THREE.BufferGeometry().setFromPoints(rotArcPts);
      const rotArcMat = new THREE.LineBasicMaterial({
        color: 0xffd766,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      });
      const rotationArrow = new THREE.Line(rotArcGeo, rotArcMat);
      rotationArrow.visible = false;
      group.add(rotationArrow);

      // PRD-023 Slice E.3b — magnetic dipole axis. Only planets with
      // an intrinsic dipole get one (Venus + Mars + Pluto skip). Color
      // is cyan to distinguish from the yellow spin axis. Length
      // matches the spin axis so the two read as parallel structures.
      // Tilted from the rotation axis by magneticTiltDeg — Saturn's
      // perfect alignment (0°), Earth's 10.5°, Uranus's 58.6° all
      // show up directly. Gated by the magnetosphere lens layer.
      let magneticAxis: THREE.Line | null = null;
      if (p.magneticTiltDeg !== undefined) {
        const magTilt = ((p.axialTiltDeg + p.magneticTiltDeg) * Math.PI) / 180;
        const magPts = [
          new THREE.Vector3(Math.sin(magTilt) * spinAxisLen, Math.cos(magTilt) * spinAxisLen, 0),
          new THREE.Vector3(-Math.sin(magTilt) * spinAxisLen, -Math.cos(magTilt) * spinAxisLen, 0),
        ];
        const magGeo = new THREE.BufferGeometry().setFromPoints(magPts);
        const magMat = new THREE.LineBasicMaterial({
          color: 0x66ddff,
          transparent: true,
          opacity: 0.65,
          depthWrite: false,
        });
        magneticAxis = new THREE.Line(magGeo, magMat);
        magneticAxis.userData.layerKey = 'magnetosphere';
        magneticAxis.visible = false;
        group.add(magneticAxis);
      }

      // Atmospheric halo (#287 Slice F) — thin emissive shell ~6% larger
      // than the planet sphere, BackSide so the limb glow appears as a
      // soft halo on the silhouette rather than a colored sphere
      // covering the planet. Hidden by default; same reveal gating as
      // the satellite layer flips it on at close zoom.
      let haloMesh: THREE.Mesh | null = null;
      let haloMaterial: THREE.MeshBasicMaterial | null = null;
      if (p.halo) {
        haloMaterial = new THREE.MeshBasicMaterial({
          color: p.halo.color,
          transparent: true,
          opacity: p.halo.opacityMax,
          side: THREE.BackSide,
          depthWrite: false,
        });
        haloMesh = new THREE.Mesh(new THREE.SphereGeometry(p.size3 * 1.06, 32, 32), haloMaterial);
        haloMesh.visible = false;
        group.add(haloMesh);
      }

      scene.add(group);
      const lod: LodState | undefined = p.texture4k
        ? { currentLevel: '2k', tex2k, tex4k: null, loadStarted: false }
        : undefined;
      return {
        group,
        mesh,
        pickAid,
        planet: p,
        material: mat,
        lod,
        satellites,
        satellitesGroup,
        haloMesh,
        haloMaterial,
        spinAxis,
        orbiters,
        orbitersGroup,
        hillSphere,
        lagrangeL1,
        lagrangeL2,
        lagrangeL1Label,
        lagrangeL2Label,
        magnetosphere,
        subSolar,
        northBadge,
        southBadge,
        rotationArrow,
        magneticAxis,
      };
    });

    /**
     * Per-frame LOD swap — for each planet whose `texture4k` is set,
     * measure the camera-to-planet distance and compare to a
     * planet-size-normalised ratio. When the camera gets close enough
     * (≤ PLANET_LOD_IN_RATIO × size3), kick off the 4K fetch + swap
     * material.map once it lands. Hysteresis (PLANET_LOD_OUT_RATIO)
     * keeps the swap from thrashing at the boundary. Mirrors the
     * single-planet pattern shipped on /earth in #284 Layer B.
     */
    const tmpWorldPos = new THREE.Vector3();
    function updatePlanetLods(): void {
      for (let idx = 0; idx < planetObjs.length; idx++) {
        const obj = planetObjs[idx];
        obj.mesh.getWorldPosition(tmpWorldPos);
        const dist = camera.position.distanceTo(tmpWorldPos);
        const ratio = dist / obj.planet.size3;

        // 4K texture swap (#287). Skip when the planet has no 4K
        // variant (Uranus, Neptune today).
        const lod = obj.lod;
        if (lod && obj.planet.texture4k && tex4kAllowed) {
          if (ratio <= PLANET_LOD_IN_RATIO) {
            if (!lod.loadStarted) {
              lod.loadStarted = true;
              const file = obj.planet.texture4k;
              textureLoader.load(
                `${base}/textures/${file}`,
                (tex) => {
                  // PBR — tag as sRGB (matches the 2K load above) so
                  // the 4K swap doesn't shift hue/saturation when LOD
                  // crosses the in-threshold.
                  tex.colorSpace = THREE.SRGBColorSpace;
                  lod.tex4k = tex;
                },
                undefined,
                () => {
                  lod.loadStarted = false; // allow retry next cross
                },
              );
            }
            if (lod.tex4k && lod.currentLevel !== '4k') {
              obj.material.map = lod.tex4k;
              obj.material.needsUpdate = true;
              lod.currentLevel = '4k';
            }
          } else if (ratio >= PLANET_LOD_OUT_RATIO && lod.currentLevel !== '2k') {
            obj.material.map = lod.tex2k;
            obj.material.needsUpdate = true;
            lod.currentLevel = '2k';
          }
        }

        // Natural-satellite reveal — 2026-06-03 user direction:
        // "Honestly maybe we can [show moons] at start as well, small
        // enough to be well visible." Satellites now always visible
        // at any zoom level — sized small enough (Moon at 0.9 vs
        // Earth at 5.2) to read as a tiny dot at heliocentric framing
        // and a clearly-smaller-than-parent body at fly-to framing.
        // No zoom gate; the natural perspective scaling handles the
        // reveal.
        if (obj.satellites.length > 0 && !obj.satellitesGroup.visible) {
          obj.satellitesGroup.visible = true;
        }
        // Atmospheric halo reveal — keeps the original LOD-in gating
        // (Earth's blue limb tint at close zoom only). Suppressed when
        // a satellite of THIS planet is selected so only the moon's
        // selection ring reads as the active halo (#304 follow-up,
        // 2026-06-04: user saw earth's atmospheric halo + moon's
        // selection ring simultaneously and read both as "selected").
        const shouldShow = ratio <= PLANET_LOD_IN_RATIO;
        const satOfThisPlanetSelected =
          selectedSatelliteKey !== null && selectedSatelliteKey.startsWith(obj.planet.id + ':');
        const haloVisible = shouldShow && !satOfThisPlanetSelected;
        if (obj.haloMesh && obj.haloMesh.visible !== haloVisible) {
          obj.haloMesh.visible = haloVisible;
        }
        // Spin-axis indicator (PRD-023 Slice A) — same gating.
        if (obj.spinAxis.visible !== shouldShow) {
          obj.spinAxis.visible = shouldShow;
        }
        // Natural-satellite orbit rings (2026-06-06 user direction:
        // "show satellite orbits only when zoomed in"). Hide at default
        // zoom so the dashed rings don't compete with planet orbits in
        // the heliocentric view; reveal alongside spin axis + halo
        // when the user flies in to a planet.
        for (const sat of obj.satellites) {
          if (sat.orbitLine.visible !== shouldShow) {
            sat.orbitLine.visible = shouldShow;
          }
        }
        // PRD-023 Slice E.3a — N/S badges + rotation arrow ride
        // alongside the spin axis itself (always-on at close zoom).
        if (obj.northBadge.visible !== shouldShow) {
          obj.northBadge.visible = shouldShow;
        }
        if (obj.southBadge.visible !== shouldShow) {
          obj.southBadge.visible = shouldShow;
        }
        if (obj.rotationArrow.visible !== shouldShow) {
          obj.rotationArrow.visible = shouldShow;
        }
        // Orbiters group (PRD-023 Slice A.3) permanently hidden per
        // 2026-06-03 user direction: "Drop all orbiters from explore
        // and keep focus on natural bodies only." Group stays in the
        // scene graph (visibility flipped at construction time) so
        // we can flip it back on if the decision is reversed; the
        // per-frame motion code below short-circuits when invisible.
        if (obj.orbiters.length > 0 && obj.orbitersGroup.visible) {
          obj.orbitersGroup.visible = false;
        }
      }
    }

    /**
     * Per-frame satellite motion — advances each moon's angular phase
     * at its real sidereal rate (scaled by the global simT clock) and
     * positions the mesh on a circle of radius `orbitUnits` inclined
     * by `inclRad`. Skipped entirely on planets with no satellites.
     * Cheap: at most a handful of trig ops per frame per moon.
     */
    function updateSatellites(dt: number): void {
      if (reducedMotion || simPaused) return;
      // Same per-second time-compression as the planets (#351 Layer 1):
      // simSpeed days/sec → years/sec, so moons stay phase-locked to the
      // planet clock at every speed and freeze together on pause.
      const yrPerSec = simSpeed / DAYS_PER_YEAR;
      for (const obj of planetObjs) {
        if (obj.satellites.length > 0) {
          for (const s of obj.satellites) {
            // Sidereal rate — the moon's angular velocity scales as
            // 1 / periodDays so a sidereal month plays out in the same
            // compressed window as the parent's orbital year.
            s.angle += (dt * yrPerSec * (2 * Math.PI)) / s.def.periodDays;
            const ca = Math.cos(s.angle);
            const sa = Math.sin(s.angle);
            const ci = Math.cos(s.inclRad);
            const si = Math.sin(s.inclRad);
            s.mesh.position.set(
              ca * s.def.orbitUnits,
              sa * s.def.orbitUnits * si,
              sa * s.def.orbitUnits * ci,
            );
          }
        }
        // Active orbiters (PRD-023 Slice A.3) — same orbital-circle
        // motion as moons, but with the additional node-rotation so
        // multi-orbiter planets (Mars has 7) don't collapse onto a
        // single equatorial plane. Rate is `periodFrac × dt` —
        // visualization motion, not real Kepler.
        if (obj.orbiters.length > 0) {
          for (const o of obj.orbiters) {
            o.phase += dt * 0.2 * o.periodFrac;
            const ca = Math.cos(o.phase);
            const sa = Math.sin(o.phase);
            const ci = Math.cos(o.inclRad);
            const si = Math.sin(o.inclRad);
            const lx = ca * o.orbitU;
            const ly = sa * o.orbitU * si;
            const lz = sa * o.orbitU * ci;
            const cn = Math.cos(o.nodeRad);
            const sn = Math.sin(o.nodeRad);
            o.group.position.set(lx * cn + lz * sn, ly, -lx * sn + lz * cn);
          }
        }
      }
    }

    // ── Phase H — per-planet science overlay arrows ────────────────
    // Each planet gets three ArrowHelpers parented to its group so they
    // travel with the planet automatically. Direction + length update
    // per frame in the planet animation block. Hidden by default; the
    // layer subscription flips visibility on opt-in.
    const overlayPerPlanet = planetObjs.map(({ group, planet }) => {
      // Pre-compute the constant per-planet values used by both the
      // arrow lengths and the new tip labels. Circular orbit means
      // gravity == centripetal magnitude (F = ma).
      const aAU = Math.pow(planet.period, 2 / 3);
      const aG = gravityAccel(BODY_MASS_KG.sun, aAU * 149_597_870.7);
      const v = Math.sqrt((4 * Math.PI * Math.PI) / aAU) * 4.7404; // km/s

      // Gravity arrow — blue, points toward Sun (origin in world).
      const gravity = new THREE.ArrowHelper(
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 0, 0),
        12,
        0x6aa9ff,
        2.5,
        1.4,
      );
      gravity.userData.layerKey = 'gravity';
      gravity.visible = false;
      group.add(gravity);

      // Velocity arrow — teal, tangent to orbit (perpendicular to
      // gravity in the planet's orbital plane).
      const velocity = new THREE.ArrowHelper(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, 0),
        12,
        0x4ecdc4,
        2.5,
        1.4,
      );
      velocity.userData.layerKey = 'velocity';
      velocity.visible = false;
      group.add(velocity);

      // Centripetal arrow — red, also points toward Sun. Offset
      // slightly above the planet (along Y) so it doesn't visually
      // collide with the gravity arrow; equal magnitude on a circular
      // orbit teaches F = ma.
      const centripetal = new THREE.ArrowHelper(
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, planet.size3 * 1.6, 0),
        10,
        0xff6b6b,
        2.2,
        1.2,
      );
      centripetal.userData.layerKey = 'centripetal';
      centripetal.visible = false;
      group.add(centripetal);

      // Arrow-tip value labels. Static text per planet (circular orbit
      // → constant values) so we build once. Position updates per frame
      // from the arrow's current length. Format gravity in mm/s² for
      // outer planets so Neptune doesn't read "0.000 m/s²".
      const formatG = (g: number) =>
        g >= 1 ? `${g.toFixed(2)} m/s²` : `${(g * 1000).toFixed(g >= 0.001 ? 1 : 2)} mm/s²`;
      const gravityLabel = buildArrowTipLabel(formatG(aG), '#aac6ff', 14);
      const velocityLabel = buildArrowTipLabel(`${v.toFixed(1)} km/s`, '#92e8df', 14);
      const centripetalLabel = buildArrowTipLabel(formatG(aG), '#ffb1b1', 14);
      gravityLabel.userData.layerKey = 'gravity';
      velocityLabel.userData.layerKey = 'velocity';
      centripetalLabel.userData.layerKey = 'centripetal';
      gravityLabel.visible = false;
      velocityLabel.visible = false;
      centripetalLabel.visible = false;
      group.add(gravityLabel);
      group.add(velocityLabel);
      group.add(centripetalLabel);

      return {
        gravity,
        velocity,
        centripetal,
        gravityLabel,
        velocityLabel,
        centripetalLabel,
        planet,
      };
    });

    // Local Group galaxies — billboard sprites on celestial sphere
    // (GH #86 Lite). Sky-overlay only, not true scale. Hidden by
    // default; toggled by the 'galaxies' science-layer.
    const localGroup = buildLocalGroupLayer();
    localGroup.group.visible = false;
    scene.add(localGroup.group);
    const stopExploreGalaxiesLayer = onLayerChange('galaxies', (on) => {
      localGroup.group.visible = on;
    });

    const stopExploreGravityLayer = onLayerChange('gravity', (on) => {
      overlayPerPlanet.forEach((o) => {
        o.gravity.visible = on;
        o.gravityLabel.visible = on;
      });
    });
    const stopExploreVelocityLayer = onLayerChange('velocity', (on) => {
      overlayPerPlanet.forEach((o) => {
        o.velocity.visible = on;
        o.velocityLabel.visible = on;
      });
    });
    const stopExploreCentripetalLayer = onLayerChange('centripetal', (on) => {
      overlayPerPlanet.forEach((o) => {
        o.centripetal.visible = on;
        o.centripetalLabel.visible = on;
      });
    });
    // PRD-023 Slice B — Hill sphere + Lagrange points. Universal across
    // planets (every body has both); reveal gated on the lens layer
    // sub-toggle. Per-frame positions in the animate loop position L1
    // + L2 along the live planet→Sun vector + 6× planet radius.
    const stopExploreHillSphereLayer = onLayerChange('hill-sphere', (on) => {
      planetObjs.forEach((o) => {
        o.hillSphere.visible = on;
      });
    });
    const stopExploreLagrangeLayer = onLayerChange('lagrange-points', (on) => {
      planetObjs.forEach((o) => {
        o.lagrangeL1.visible = on;
        o.lagrangeL2.visible = on;
        o.lagrangeL1Label.visible = on;
        o.lagrangeL2Label.visible = on;
      });
    });
    // PRD-023 Slice D — Magnetosphere shell. Only the 5 bodies with
    // significant dynamos get one (Earth + the 4 gas giants); the
    // .magnetosphere ref is null on the rest so the visibility flip
    // skips them.
    const stopExploreMagnetosphereLayer = onLayerChange('magnetosphere', (on) => {
      planetObjs.forEach((o) => {
        if (o.magnetosphere) o.magnetosphere.visible = on;
        // PRD-023 Slice E.3b — magnetic axis is the same physics as
        // the magnetosphere shell; they toggle together.
        if (o.magneticAxis) o.magneticAxis.visible = on;
      });
    });
    // PRD-023 Slice D — Sub-solar point marker. Universal.
    const stopExploreSubSolarLayer = onLayerChange('sub-solar', (on) => {
      planetObjs.forEach((o) => {
        o.subSolar.visible = on;
      });
    });
    // ── Small bodies (3D) ─────────────────────────────────────────
    // Mirrors the 2D treatment: eccentric ellipse + foci offset + L0
    // rotation, plus a small sphere mesh per body. Comets get a faint
    // anti-solar tail line that updates each frame.
    type SmallBodyObj = {
      mesh: THREE.Mesh;
      /** Invisible larger sphere co-located with `mesh` for raycaster
       *  pick assistance — small bodies are 1.2-1.8 unit spheres next
       *  to Earth's 2.6, so a tight pixel-perfect click radius makes
       *  them effectively unclickable in 3D. The pickAid widens the
       *  hit target without bloating the visible body. */
      pickAid: THREE.Mesh;
      tail?: THREE.Line;
      orbit: THREE.Object3D;
      body: SmallBody;
    };
    // #287 Slice E — Pluto promoted to PLANETS so the planet-relative
    // camera + Charon satellite pick it up. Filter from the small-body
    // render path so Pluto doesn't render twice. SMALL_BODIES keeps
    // the original entry so any code that lookups via smallBodyById
    // still resolves (no current call-site does though — selection
    // routes via planet path now).
    const SMALL_BODIES_RENDERED = SMALL_BODIES.filter((b) => b.id !== 'pluto');
    const smallBodyObjs: SmallBodyObj[] = SMALL_BODIES_RENDERED.map((b) => {
      // Orbit path — closed ellipse for dwarf/comet, open hyperbola
      // for interstellar bodies. Use Line (open) for interstellar so
      // the trajectory doesn't visually close back on itself. Ref
      // captured so the LAYERS panel can hide it with the body.
      const orbitPts = sampleOrbitPoints(b, 128).map((p) => new THREE.Vector3(p.x, p.y, p.z));
      const trajColor =
        b.type === 'interstellar' ? 0xff8866 : b.type === 'comet' ? 0x88ddff : 0xc8b48c;
      const TrajCtor = b.type === 'interstellar' ? THREE.Line : THREE.LineLoop;
      const orbit = new TrajCtor(
        new THREE.BufferGeometry().setFromPoints(orbitPts),
        new THREE.LineBasicMaterial({
          color: trajColor,
          transparent: true,
          opacity: b.type === 'interstellar' ? 0.4 : 0.22,
          depthWrite: false,
        }),
      );
      scene.add(orbit);

      // Body mesh — tiny coloured sphere.
      const colorInt = parseInt(b.color.slice(1), 16);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(b.type === 'comet' ? 1.2 : 1.8, 12, 12),
        new THREE.MeshStandardMaterial({
          color: colorInt,
          emissive: colorInt,
          emissiveIntensity: 0.5,
          roughness: 1.0,
          metalness: 0,
        }),
      );
      mesh.userData = { smallBodyId: b.id };
      scene.add(mesh);

      // Pick aid — invisible sphere ~3× the body's visible radius.
      // Carries the same userData so a raycast hit routes through the
      // existing selectSmallBody() flow. Visibility tracks the body's
      // layer toggle so hidden bodies stay unselectable.
      const pickAid = new THREE.Mesh(
        new THREE.SphereGeometry(b.type === 'comet' ? 4 : 5, 8, 8),
        new THREE.MeshBasicMaterial({ visible: false, depthWrite: false }),
      );
      pickAid.userData = { smallBodyId: b.id, isPickAid: true };
      scene.add(pickAid);

      // Comet tail (line, recomputed per frame in animate).
      let tail: THREE.Line | undefined;
      if (b.type === 'comet') {
        const tailGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(),
          new THREE.Vector3(),
        ]);
        tail = new THREE.Line(
          tailGeo,
          new THREE.LineBasicMaterial({ color: colorInt, transparent: true, opacity: 0.6 }),
        );
        scene.add(tail);
      }

      return { mesh, pickAid, tail, orbit, body: b };
    });

    // Selection ring (3D) — single torus reused for whichever planet is
    // selected. Hidden when nothing is selected. Pulses by modulating
    // material opacity in the animation loop.
    // Selection cue — camera-facing thin ring sprite. The previous
    // BackSide spherical halo (1.18×) read as a second translucent
    // shell stacked outside the atmospheric halo (1.06×); user
    // feedback 2026-06-03: "selected halo on planets when zoomed in
    // is too thin and like there are 2 of them. Can we trim this
    // down and be more sophisticated."
    //
    // Selection ring — a Line2 circle around the selected body.
    // 2026-06-15 user direction: "thin, barely visible, like orbital,
    // and don't scale it up as we zoom — it always retains thin
    // appearance." Line2 + LineMaterial gives screen-pixel-constant
    // stroke width (linewidth is in screen pixels regardless of camera
    // distance), so the ring stays the same thickness whether the
    // camera is at heliocentric framing or flown in close. The ring's
    // radius scales with planet size each frame, but the line stroke
    // does not. Billboarded per-frame so the ring always reads as a
    // clean circle outline against the body silhouette.
    const SEL_RING_SEGMENTS = 96;
    const selRingPositions: number[] = [];
    for (let i = 0; i <= SEL_RING_SEGMENTS; i++) {
      const theta = (i / SEL_RING_SEGMENTS) * Math.PI * 2;
      selRingPositions.push(Math.cos(theta), Math.sin(theta), 0);
    }
    const selRingGeo = new LineGeometry();
    selRingGeo.setPositions(selRingPositions);
    const selRingMat = new LineMaterial({
      color: 0xa8c8ff, // pale-blue, same family as orbit lines
      linewidth: 1.2, // screen pixels — Line2 holds this regardless of zoom
      transparent: true,
      opacity: 0.45,
      depthTest: false,
      dashed: false,
    });
    selRingMat.resolution.set(window.innerWidth, window.innerHeight);
    const selHalo = new Line2(selRingGeo, selRingMat);
    selHalo.computeLineDistances();
    selHalo.visible = false;
    // Render order high so the ring is drawn on top of the planet
    // sphere even when oriented away — combined with depthTest:false
    // the ring outline is never occluded by the body itself.
    selHalo.renderOrder = 999;
    scene.add(selHalo);

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
    // Per-mode zoom envelope. Heliocentric is the original [60, 1400].
    // When focused on a planet, the floor drops to ~1.5 × planet
    // radius (close enough that the camera grazes the LOD threshold
    // at 4 × radius and digs well inside it for the 4K view) and the
    // ceiling caps at 50× radius so the user can pan outward without
    // accidentally re-entering heliocentric framing.
    let camRMin = 60;
    let camRMax = 1400;
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
    const NB_CAM_R_MIN = 0.03; // pc
    const NB_CAM_R_MAX = 60; // pc
    const NB_FAR = 1500; // pc — neighborhood far plane
    const SOLAR_FAR = camera.far; // 8000 AU

    // Slice 5 — the Milky Way schematic (nominal scene units; not to scale).
    let mwScene: import('$lib/universe/milky-way-scene').MilkyWayScene | null = null;
    let mwLoading = false;
    const MW_SCENE_RADIUS = 340; // matches MW_DISK_RADIUS_SCENE
    const MW_ENTRY_CAM_R = MW_SCENE_RADIUS * 1.7; // framing just outside the disk
    const MW_CAM_R_MIN = MW_SCENE_RADIUS * 0.35; // zoom-in floor → cross back to neighborhood
    const MW_CAM_R_MAX = MW_SCENE_RADIUS * 4; // zoom-out ceiling
    const MW_FAR = MW_SCENE_RADIUS * 12;
    const MW_ENTRY_CAM_P = 0.95; // polar angle — a tilted face-on 3/4 view of the disk

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
          container?.clientWidth ?? 1,
          container?.clientHeight ?? 1,
          renderer.getPixelRatio(),
        );
        bhScene.setCurvature(bhCurvatureLens ? 1 : 0);
        bhLastFrame = performance.now();
        activeBlackHole = hole;
        bhPanelOpen = true;
        bhCultureDoors = [];
        if (hole.culture_door) {
          void getCultureDoors(hole.id, getLocale(), fetch).then((d) => {
            if (activeBlackHole?.id === hole.id) bhCultureDoors = d;
          });
        }
        closeStarPanel();
        anonStar = null;
        cue('select');
        trackItemClick('marker', id, '/explore');
        if (!reducedMotion) crossingFlashId++;
      } catch (err) {
        console.error('[explore v2] black hole load failed', err);
      } finally {
        bhLoading = false;
      }
    }
    function exitBlackHole(): void {
      if (!activeBlackHole) return;
      if (!reducedMotion) crossingFlashId++;
      bhScene?.dispose();
      bhScene = null;
      activeBlackHole = null;
      bhPanelOpen = false;
      bhCurvatureLens = false;
      bhTimeLens = false;
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
        mwObjects = data.objects;
        // Cinematic bloom — reuse the device quality tier's bloom budget so it
        // scales gracefully (disabled on minimal/low, stronger on cinematic).
        mwScene = mod.createMilkyWayScene(data, {
          enabled: quality.bloomEnabled,
          strength: Math.min(0.5, Math.max(0.32, quality.bloomStrength)),
          radius: 0.6,
          threshold: 0.62,
        });
        const w = container?.clientWidth ?? 1;
        const h = container?.clientHeight ?? 1;
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
    const LG_ENTRY_CAM_P = 1.05; // tilted 3/4 view of the group plane
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
        LG_ENTRY_CAM_R = LG_SCENE_RADIUS * 2.04;
        LG_ENTRY_CAM_R_MOBILE = LG_SCENE_RADIUS * 3.3;
        LG_CAM_R_MIN = LG_SCENE_RADIUS * 1.3; // zoom-in floor → cross back to the galaxy
        LG_CAM_R_MAX = LG_SCENE_RADIUS * 6; // zoom-out ceiling (outermost for now)
        LG_FAR = LG_SCENE_RADIUS * 40;
        lgScene = mod.createLocalGroupScene(data, {
          enabled: quality.bloomEnabled,
          strength: Math.min(0.36, Math.max(0.28, quality.bloomStrength)),
          radius: 0.62,
          threshold: 0.7,
        });
        lgScene.setSize(container?.clientWidth ?? 1, container?.clientHeight ?? 1);
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
        const [shells, stars, constellations, exoSystems, deepSky, dsGallery] = await Promise.all([
          mod.loadNeighborhoodShells(fetch, base),
          getNamedStars(fetch),
          mod.loadConstellationLines(fetch, base),
          getExoplanetSystems(fetch),
          getDeepSkyObjects(fetch),
          getDeepSkyGallery(fetch),
        ]);
        namedStars = stars;
        exoplanetHostIds = new Set(exoSystems.map((s) => s.hostId));
        // Slice 7 — flatten every planet with a known mass for the mass–period plot.
        allExoplanetPlanets = exoSystems.flatMap((s) =>
          s.planets
            .filter((p) => p.mass_earth != null && p.period_days > 0)
            .map((p) => ({
              name: p.name,
              periodDays: p.period_days,
              massEarth: p.mass_earth as number,
              hostId: s.hostId,
            })),
        );
        deepSkyObjects = deepSky;
        deepSkyGallery = dsGallery;
        nbScene = mod.createNeighborhoodScene({
          shells,
          tier: quality.tier,
          pixelRatio: renderer.getPixelRatio(),
          namedStars: stars,
          constellations,
          deepSkyObjects: deepSky,
        });
        nbScene.setConstellationsVisible(showConstellations);
        nbScene.setDeepSkyVisible(showDeepSky);
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
      if (reducedMotion) {
        camR = NB_ENTRY_CAM_R;
      } else {
        // Enter close (Sun still large), then dolly out so the field fades in
        // with motion.
        camR = 0.035;
        startCrossDolly(0.035, 0.32, 1100);
        crossingFlashId++;
      }
      updateCam();
    }

    function crossInToSolarSystem(): void {
      if (!inNeighborhood()) return;
      dollyActive = false;
      if (!reducedMotion) crossingFlashId++;
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
      anonStar = null;
    }
    exitNeighborhoodFn = crossInToSolarSystem;

    // ── Milky Way context (Slice 5) — zoom out of the neighborhood into the
    // galaxy. The schematic is not to scale, so this is a warp framing (nominal
    // units), mirroring the BodyScene entry rather than a physical re-base. ──
    async function crossOutToMilkyWay(): Promise<void> {
      if (inMilkyWay()) return;
      const scene = await ensureMilkyWay();
      if (!scene) return; // load failed — stay in the neighborhood
      contextGraph.setActive('milky-way');
      contextId = 'milky-way'; // flip chrome immediately, ahead of the HUD tick
      camRMin = MW_CAM_R_MIN;
      camRMax = MW_CAM_R_MAX;
      camera.far = MW_FAR;
      camera.near = 1;
      camera.updateProjectionMatrix();
      camP = MW_ENTRY_CAM_P; // tilt to a face-on 3/4 view of the disk
      closeStarPanel();
      anonStar = null;
      if (reducedMotion) {
        camR = MW_ENTRY_CAM_R;
      } else {
        camR = MW_SCENE_RADIUS * 2.6;
        startCrossDolly(MW_SCENE_RADIUS * 2.6, MW_ENTRY_CAM_R, 1300);
        crossingFlashId++;
        showWarpCaption(`${(26700).toLocaleString()} ${m.explore_light_years()} · Sagittarius A*`);
      }
      updateCam();
    }

    function crossInToNeighborhood(): void {
      if (!inMilkyWay()) return;
      dollyActive = false;
      if (!reducedMotion) crossingFlashId++;
      mwPanelOpen = false;
      selectedMwId = null;
      mwScene?.highlight(null);
      contextGraph.setActive('neighborhood');
      contextId = 'neighborhood'; // flip chrome immediately
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
      mwPanelOpen = false;
      selectedMwId = null;
      mwScene?.highlight(null);
      contextGraph.setActive('local-group');
      contextId = 'local-group'; // flip chrome immediately
      camRMin = LG_CAM_R_MIN;
      camRMax = LG_CAM_R_MAX;
      camera.far = LG_FAR;
      camera.near = 1;
      camera.updateProjectionMatrix();
      camP = LG_ENTRY_CAM_P;
      const portrait = (container?.clientHeight ?? 0) > (container?.clientWidth ?? 1);
      const entryR = portrait ? LG_ENTRY_CAM_R_MOBILE : LG_ENTRY_CAM_R;
      if (reducedMotion) {
        camR = entryR;
      } else {
        camR = entryR * 1.3;
        startCrossDolly(entryR * 1.3, entryR, 1300);
        crossingFlashId++;
        showWarpCaption(`${(2540000).toLocaleString()} ${m.explore_light_years()} · Andromeda`);
      }
      updateCam();
    }

    function crossInToMilkyWay(): void {
      if (!inLocalGroup()) return;
      dollyActive = false;
      if (!reducedMotion) crossingFlashId++;
      lgPanelOpen = false;
      selectedLgMember = null;
      lgScene?.highlight(null);
      contextGraph.setActive('milky-way');
      contextId = 'milky-way'; // flip chrome immediately
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
      warpCaption = text;
      if (warpCaptionTimer) clearTimeout(warpCaptionTimer);
      warpCaptionTimer = setTimeout(() => (warpCaption = ''), 1800);
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
      contextId = 'body-scene'; // flip chrome immediately, ahead of the throttled HUD tick
      bodyHostName = system.star.name;
      activeBodyHostId = hostId;
      const maxPeriodYears = Math.max(...system.planets.map((p) => p.period_days)) / 365.25;
      bodyRate = maxPeriodYears / (12 * 60); // outer planet ≈ 12 s per orbit at 60 fps
      camRMin = fr * 0.2;
      camRMax = fr * 4;
      camera.far = BODY_FAR;
      camera.near = 0.05;
      camera.updateProjectionMatrix();
      closeStarPanel();
      anonStar = null;
      cue('select');
      if (reducedMotion) {
        camR = fr * 2.2;
      } else {
        camR = fr * 3.6;
        startCrossDolly(fr * 3.6, fr * 2.0, 1300);
        crossingFlashId++;
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
      if (!reducedMotion) crossingFlashId++;
      const hid = bodyHostIdLocal;
      contextGraph.setActive('neighborhood');
      contextId = 'neighborhood'; // flip chrome immediately, ahead of the HUD tick
      if (hid) contextGraph.remove(bodyContextId(hid));
      if (bodyScene) {
        bodyScene.dispose();
        bodyScene = null;
      }
      bodyHostIdLocal = null;
      bodyHostName = '';
      activeBodyHostId = null;
      massPeriodOpen = false;
      currentBodySystem = null;
      selectedExoplanet = null;
      panelState.exoplanet = false;
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
      selectedExoplanet = { planet, hostName: currentBodySystem.star.name, overlay: null };
      panelState.exoplanet = true;
      panelState.star = false;
      panelState.planet = false;
      panelState.sun = false;
      panelState.smallBody = false;
      panelState.satellite = false;
      panelState.belt = false;
      bodyScene?.highlightPlanet(planetId);
      const forId = planetId;
      void getExoplanetI18n(getLocale(), planetId, fetch).then((overlay) => {
        if (selectedExoplanet?.planet.id === forId) {
          selectedExoplanet = { ...selectedExoplanet, overlay };
        }
      });
      exoCultureDoors = [];
      void getCultureDoors(planetId, getLocale(), fetch).then((d) => {
        if (selectedExoplanet?.planet.id === forId) exoCultureDoors = d;
      });
    }
    closeExoplanetFn = () => {
      panelState.exoplanet = false;
      selectedExoplanet = null;
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
      const base = namedStarById.get(id);
      if (!base) return;
      cue('select');
      selectedStarId = id;
      starCultureDoors = [];
      void getCultureDoors(id, getLocale(), fetch).then((d) => {
        if (selectedStarId === id) starCultureDoors = d;
      });
      panelState.star = true;
      panelState.planet = false;
      panelState.sun = false;
      panelState.smallBody = false;
      panelState.satellite = false;
      panelState.belt = false;
      anonStar = null;
      nbScene?.highlightStar(id);
      trackItemClick('star', id, '/explore');
      const overlay = await getNamedStarI18n(getLocale(), id, fetch);
      // Guard against a race if the user picked another star meanwhile.
      if (selectedStarId === id) localizedStar = { ...base, ...(overlay ?? {}) };
    }
    function closeStarPanel(): void {
      panelState.star = false;
      selectedStarId = null;
      localizedStar = null;
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
        if (activeDeepSky?.id === obj.id) deepSkyPhotoUrl = full;
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
      const obj = deepSkyObjects.find((o) => o.id === id);
      if (!obj) return;
      selectedDeepSkyId = id;
      nbScene?.highlightDeepSky(id);
      // Catalogue-only dots (no photo) don't immerse — just a highlighted label.
      if (!obj.photoKey) {
        cue('select');
        return;
      }
      cue('select');
      trackItemClick('deep-sky', id, '/explore');
      activeDeepSky = obj;
      nbScene?.focusDeepSky(id);
      closeStarPanel();
      anonStar = null;
      dsRung = 'thumb';
      deepSkyPhotoUrl = deepSkyPhoto(obj, 'thumb');
      orientToDeepSky(obj);
      if (reducedMotion) {
        nbScene?.setDeepSkyApproach(1);
        deepSkyImmersed = true;
        deepSkyPanelOpen = true;
        loadDeepSkyFull(obj);
      } else {
        crossingFlashId++;
        if (obj.dist_label) showWarpCaption(`${obj.dist_label} · ${obj.name}`);
        dsApproachActive = true;
        dsApproachStart = performance.now();
      }
    }
    function exitDeepSky(): void {
      if (!activeDeepSky) return;
      if (!reducedMotion) crossingFlashId++;
      dsApproachActive = false;
      dsRung = 'none';
      nbScene?.setDeepSkyApproach(0);
      nbScene?.focusDeepSky(null);
      nbScene?.highlightDeepSky(null);
      deepSkyImmersed = false;
      deepSkyPanelOpen = false;
      activeDeepSky = null;
      selectedDeepSkyId = null;
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
        if (rung === 'full' && activeDeepSky) loadDeepSkyFull(activeDeepSky);
      }
      if (!deepSkyImmersed && eased >= 0.4) deepSkyImmersed = true;
      if (t >= 1) {
        dsApproachActive = false;
        deepSkyImmersed = true;
        deepSkyPanelOpen = true;
      }
    }
    // ?deepsky=<designation> deep-link: cross into the neighborhood if needed,
    // load it, then immerse. Bound to a top-level fn for the URL resolver effect.
    async function resolveDeepSkyDeepLink(designation: string): Promise<void> {
      if (!inNeighborhood()) await crossOutToNeighborhood();
      await ensureNeighborhood();
      const obj = deepSkyObjects.find((o) => o.designation === designation || o.id === designation);
      if (obj) enterDeepSky(obj.id);
    }
    // Orient the camera to face a star (index / ?goto= landing). The camera orbits
    // the Sun; we point the view down the star's direction and pull to a framing
    // distance. Canvas picks don't frame (the star is already under the cursor).
    function frameStar(id: string): void {
      const s = namedStarById.get(id);
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
      if (!namedStarById.has(id)) return;
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
        lastGoto = g0;
        void gotoStar(g0);
      }
      // Cold-load ?system=<hostId>[&planet=<planetId>] → descend into the BodyScene.
      const sys0 = params0.get('system');
      if (sys0) {
        lastSystem = sys0;
        void enterBodyScene(sys0, params0.get('planet') ?? undefined);
      }
      // Cold-load ?deepsky=<designation> → cross into the neighborhood + immerse.
      const ds0 = params0.get('deepsky');
      if (ds0) {
        lastDeepSky = ds0;
        void resolveDeepSkyDeepLink(ds0);
      }
      // Cold-load ?galaxy=<pinId> → cross into the Milky Way + select the pin.
      const gx0 = params0.get('galaxy');
      if (gx0) {
        lastGalaxy = gx0;
        void resolveGalaxyDeepLink(gx0);
      }
      // Cold-load ?bh=<id> → open the black hole's lensing render.
      const bh0 = params0.get('bh');
      if (bh0) {
        lastBh = bh0;
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
      hrLensOpen = !hrLensOpen;
      if (hrLensOpen) hrStars = nbScene?.hrStars(2000) ?? [];
    };
    // Slice 7 — causality lens: pull the named stars + light-cone shells for the map.
    openCausalityFn = () => {
      const d = nbScene?.causalityData(92);
      causalityShells = d?.shells ?? [];
      causalityField = d?.field ?? [];
      causalityNamed = d?.named ?? [];
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
      scaleReadout = describeDistanceAu(au);
      contextId = inBodyScene()
        ? 'body-scene'
        : inLocalGroup()
          ? 'local-group'
          : inMilkyWay()
            ? 'milky-way'
            : inNeighborhood()
              ? 'neighborhood'
              : 'solar-system';
      const vh = container?.clientHeight ?? 1;
      const worldPerPx = (2 * Math.tan((camera.fov * Math.PI) / 180 / 2) * camR) / vh;
      const unitToAu = inNeighborhood() ? AU_PER_PC : 1;
      const bar = niceScaleBar(worldPerPx * unitToAu);
      if (bar) {
        scaleBarPx = bar.px;
        const desc = describeDistanceAu(bar.au).primary;
        scaleBarLabel = `${fmtScale(desc.value)} ${desc.unit}`;
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
      const next = bodyId ? (planetObjs.find((o) => o.planet.id === bodyId) ?? null) : null;
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
        cameraState.focusedOnPlanet = true;
      } else {
        flyToOrigin.set(0, 0, 0);
        flyToR = HELIO_DEFAULT_CAMR;
        flyToP = HELIO_DEFAULT_CAMP;
        flyToT = HELIO_DEFAULT_CAMT;
        flyToMinR = 60;
        flyToMaxR = 1400;
        focusedPlanetObj = null;
        cameraState.focusedOnPlanet = false;
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
    const exploreRoot = container?.parentElement; // .explore wrapper
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
    const planetMeshes = planetObjs.map((o) => o.mesh);
    const planetPickAids = planetObjs.map((o) => o.pickAid);
    const smallBodyMeshes = smallBodyObjs.map((o) => o.mesh);
    const smallBodyPickAids = smallBodyObjs.map((o) => o.pickAid);
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
          width: container?.clientWidth ?? window.innerWidth,
          height: container?.clientHeight ?? window.innerHeight,
          visible: layers.paths,
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
          void iconic.openMission(trajectoryMissionId, localeFromPage($page));
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
      if (view !== '3d' || isDrag3d) {
        if (hoverData) hoverData = null;
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
        mwScene?.highlight(id ?? selectedMwId);
        el3d.style.cursor = id ? 'pointer' : 'grab';
        if (hoverData) hoverData = null;
        return;
      }
      // Slice 8 — in the Local Group, hover highlights + names a member galaxy.
      if (inLocalGroup()) {
        const mh = lgScene ? ray3dHover.intersectObjects(lgScene.pickables, false) : [];
        const id = (mh[0]?.object.userData.lgId as string | undefined) ?? null;
        lgScene?.highlight(id ?? selectedLgMember?.id ?? null);
        el3d.style.cursor = id ? 'pointer' : 'grab';
        if (hoverData) hoverData = null;
        return;
      }
      // v2: in the stellar neighborhood, hover highlights + names the nearest
      // named star; nothing else is hoverable there.
      if (inNeighborhood()) {
        const mh = nbScene ? ray3dHover.intersectObjects(nbScene.namedStarPickables, false) : [];
        const id = (mh[0]?.object.userData.starId as string | undefined) ?? null;
        nbScene?.highlightStar(id ?? selectedStarId);
        // Deep-sky hover (layer on, no star under cursor) reveals the glint's label.
        let dsHoverId: string | null = null;
        if (showDeepSky && !id && nbScene && nbScene.deepSkyPickables.length) {
          const dh = ray3dHover.intersectObjects(nbScene.deepSkyPickables, false);
          dsHoverId = (dh[0]?.object.userData.deepSkyId as string | undefined) ?? null;
        }
        nbScene?.highlightDeepSky(dsHoverId ?? selectedDeepSkyId);
        el3d.style.cursor = id || dsHoverId ? 'pointer' : 'grab';
        if (hoverData) hoverData = null;
        return;
      }
      // Trajectory-marker hover — set hoveredId so the matching path
      // goes bright. Independent of the tooltip hover path below:
      // trajectories don't surface a vis-viva tooltip, only a color-
      // brighten cue.
      if (layers.paths && iconicTrajectoryHandles.length > 0) {
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
        if (hoverData) hoverData = null;
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
        const planet = planetById.get(lagrangePlanetId);
        if (!planet) return;
        const planetName = planet.name;
        const hillMkm = planet.a * 149.5978707 * Math.cbrt(3e-6); // ~1.5 Mkm at Earth
        hoverData = {
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
        const planet = planetById.get(planetId);
        if (!planet) return;
        const v = Math.sqrt((4 * Math.PI ** 2) / planet.a) * 4.7404;
        hoverData = {
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
        hoverData = {
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
      hoverData = null;
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
      if (activeDeepSky) return;
      const rect = el3d.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray3d.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const markerHits = ray3d.intersectObjects(nbScene.namedStarPickables, false);
      if (markerHits.length) {
        const id = markerHits[0].object.userData.starId as string | undefined;
        if (id) {
          void selectStarFn?.(id);
          return;
        }
      }
      // Deep-sky glints (only when the layer is on). Selecting one warps in +
      // opens the DeepSkyPanel (Part 4); Part 2 highlights + records selection.
      if (showDeepSky && nbScene.deepSkyPickables.length) {
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
          anonStar = { ...info, shownAt: performance.now() };
          return;
        }
      }
      anonStar = null; // empty space — dismiss the tag
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
      if (!mwObjects.some((o) => o.id === id)) return;
      // Slice 6 — Sagittarius A* upgrades from a flat pin to the lensed black-hole
      // render when you select it (the S5 pin becomes an S6 destination).
      if (id === 'sagittarius-a-star') {
        void enterBlackHole('sagittarius-a-star');
        return;
      }
      cue('select');
      selectedMwId = id;
      mwPanelOpen = true;
      mwScene?.highlight(id);
      trackItemClick('marker', id, '/explore');
    }
    function closeMwPanel(): void {
      mwPanelOpen = false;
      selectedMwId = null;
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
      selectedLgMember = member;
      lgPanelOpen = true;
      lgScene?.highlight(id);
      trackItemClick('marker', id, '/explore');
    }
    function closeLgPanel(): void {
      lgPanelOpen = false;
      selectedLgMember = null;
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
      if (wasOnCanvas && !wasDrag && !wasPan && view === '3d') {
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
          crossInToSolarSystem();
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
            crossInToSolarSystem();
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
        view === '3d' &&
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

    const c2 = canvas2d;
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
      if (view === '2d') c2.style.cursor = 'grab';
      if (!wasMoved && view === '2d') tryPick2d(e.clientX, e.clientY);
    };
    const on2dMouseMove = (e: MouseEvent) => {
      if (!isDrag2d || view !== '2d') return;
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
        view === '2d' &&
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
        const isSel = selectedId === p.id;
        ctx2.beginPath();
        ctx2.arc(0, 0, p.orbitR, 0, Math.PI * 2);
        ctx2.strokeStyle = isSel ? 'rgba(68,102,255,0.55)' : 'rgba(255,255,255,0.18)';
        ctx2.lineWidth = isSel ? 1.5 : 1;
        ctx2.stroke();
      });

      // Mission overlay arc (Theme A.A1) — drawn after orbit rings
      // but before planets so the arc sits behind the planet dots.
      if (overlayArcPx.length > 1 && overlayMission) {
        const accent = overlayMission.color || '#4ecdc4';
        ctx2.save();
        ctx2.beginPath();
        ctx2.moveTo(overlayArcPx[0].x, overlayArcPx[0].z);
        for (let i = 1; i < overlayArcPx.length; i++) {
          ctx2.lineTo(overlayArcPx[i].x, overlayArcPx[i].z);
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
        ctx2.arc(overlayArcPx[0].x, overlayArcPx[0].z, 4, 0, Math.PI * 2);
        ctx2.fill();
        if (overlayArrivalPx) {
          ctx2.fillStyle = '#ffc850';
          ctx2.beginPath();
          ctx2.arc(overlayArrivalPx.x, overlayArrivalPx.z, 4, 0, Math.PI * 2);
          ctx2.fill();
        }
        ctx2.restore();
      }

      // Small-body orbit paths — closed dashed ellipses for dwarfs and
      // comets, open hyperbola for interstellar (Oumuamua). Uses
      // sampleOrbitPoints so the math stays consistent with 3D mode.
      // Each type gated by its layer flag (issue #32).
      SMALL_BODIES.forEach((b) => {
        if (b.type === 'dwarf' && !layers.dwarfs) return;
        if (b.type === 'comet' && !layers.comets) return;
        if (b.type === 'interstellar' && !layers.interstellar) return;
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
      if (!layers.planets) planet2dPos.clear();
      if (layers.planets)
        PLANETS.forEach((p) => {
          const ang = p.a0 + simT * ((2 * Math.PI) / p.period);
          const pr = Math.max(3, p.size2);
          const px = Math.cos(ang) * p.orbitR;
          const py = Math.sin(ang) * p.orbitR;
          planet2dPos.set(p.id, { x: px, y: py });

          const isSel = selectedId === p.id;

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
      SMALL_BODIES.forEach((b) => {
        if (b.type === 'dwarf' && !layers.dwarfs) return;
        if (b.type === 'comet' && !layers.comets) return;
        if (b.type === 'interstellar' && !layers.interstellar) return;
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
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      composer.setSize(container.clientWidth, container.clientHeight);
      bloomPass?.setSize(container.clientWidth, container.clientHeight);
      mwScene?.setSize(container.clientWidth, container.clientHeight);
      lgScene?.setSize(container.clientWidth, container.clientHeight);
      bhScene?.setSize(container.clientWidth, container.clientHeight, renderer.getPixelRatio());
      resize2d();
      // Iconic trajectories use Line2 with screen-pixel-aware
      // LineMaterial — push the new resolution so the stroke width
      // stays crisp after a viewport change.
      for (const h of iconicTrajectoryHandles) {
        h.onResize(container.clientWidth, container.clientHeight);
      }
      // Selection ring shares the same screen-pixel-width semantics —
      // push the new resolution so the 1.2px stroke stays exact after
      // a viewport resize / device-rotation.
      selRingMat.resolution.set(container.clientWidth, container.clientHeight);
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
    let reducedMotion = false;
    const stopReducedMotionWatch = onReducedMotionChange((r) => {
      reducedMotion = r;
    });
    lifecycle.add(stopReducedMotionWatch);

    // raf pump with the TA.md document.hidden contract baked in. The
    // local `reducedMotion` flag still gates the per-frame sim-time
    // advance (ADR-025) — we don't hand it to createAnimateLoop's
    // reducedMotion option because user-initiated camera drag still
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
        if (!reducedMotion && !simPaused) simT += (dt * simSpeed) / DAYS_PER_YEAR;

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
          simDateLabel = new Intl.DateTimeFormat(dateLocale, {
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
        if (view === '3d') {
          updateSunLod(camera.position.length());
          updatePlanetLods();
          updateSatellites(dt);
        }

        if (view === '3d') {
          // Apply layer visibility (issue #32). Cheap — just sets the
          // .visible flag on the existing scene refs each frame so
          // toggling the LAYERS panel takes effect on the very next
          // tick without rebuilding any geometry.
          for (const line of planetOrbitLines) line.visible = layers.planets;
          for (const o of planetObjs) o.group.visible = layers.planets;
          for (const o of smallBodyObjs) {
            const on =
              o.body.type === 'dwarf'
                ? layers.dwarfs
                : o.body.type === 'comet'
                  ? layers.comets
                  : layers.interstellar;
            o.mesh.visible = on;
            o.pickAid.visible = on;
            o.orbit.visible = on;
            if (o.tail) o.tail.visible = on;
          }

          planetObjs.forEach(({ group, mesh, planet }, idx) => {
            const angle = planet.a0 + (2 * Math.PI * simT) / planet.period;
            const inc = (planet.inc * Math.PI) / 180;
            const x = Math.cos(angle) * planet.orbitR;
            const zf = Math.sin(angle) * planet.orbitR;
            group.position.set(x, zf * Math.sin(inc), zf * Math.cos(inc));
            // ADR-025: gate the per-frame axial spin under reduced-motion
            // alongside the orbit advance. The audit caught this bypass
            // in v1.0 — planets kept spinning even with simT frozen.
            if (!reducedMotion) mesh.rotation.y += 0.005;

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
          smallBodyObjs.forEach(({ mesh, pickAid, tail, body }) => {
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
          if (selectedSatelliteKey) {
            const [parentId, satId] = selectedSatelliteKey.split(':');
            const parentObj = planetObjs.find((o) => o.planet.id === parentId);
            const satObj = parentObj?.satellites.find((s) => s.def.id === satId);
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
          } else if (selectedId) {
            const selObj = planetObjs.find((o) => o.planet.id === selectedId);
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
            const ch = container?.clientHeight ?? 1;
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
          if (activeBlackHole && bhScene) {
            const now = performance.now();
            if (!reducedMotion) bhScene.update(Math.min(0.05, (now - bhLastFrame) / 1000));
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
            if (!simPaused && !reducedMotion) bodySimYears += bodyRate;
            bodyScene.update(bodySimYears);
            renderer.render(bodyScene.scene, camera);
            return;
          }
          if (inNeighborhood() && nbScene) {
            stepCrossDolly();
            stepDeepSkyApproach();
            nbScene.update(camR, camera);
            renderer.render(nbScene.scene, camera);
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
            panelState.planet ||
            panelState.sun ||
            panelState.smallBody ||
            panelState.satellite ||
            panelState.belt;
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

    cleanup = () => lifecycle.cleanup();
  });

  onDestroy(() => {
    cleanup?.();
    tourCameraTeardown?.();
    for (const h of iconicTrajectoryHandles) h.dispose();
    iconicTrajectoryHandles = [];
  });

  function toggleView() {
    view = view === '3d' ? '2d' : '3d';
    trackViewToggle('explore', view);
  }
</script>

<svelte:head><title>{m.explore_page_title()}</title></svelte:head>

{#if liveRenderer && liveQuality}
  <RenderingDebugRegistrar
    renderer={liveRenderer}
    quality={liveQuality}
    qualitySource={liveQualitySource}
    bloomPass={liveBloomPass}
    frameMonitor={liveFrameMonitor}
  />
{/if}
<QualitySettingsModal {activeQualityTier} />

<div class="explore" data-audio-stage="explore-scene">
  <div
    class="layer"
    bind:this={container}
    class:hidden={view !== '3d'}
    role="region"
    aria-label={m.explore_canvas_aria_3d()}
  ></div>
  <canvas
    class="layer"
    bind:this={canvas2d}
    class:hidden={view !== '2d'}
    aria-label={m.explore_canvas_aria_2d()}
  ></canvas>

  <!-- v2 breadcrumb (UXS-014 "you always know where you are"): shown out in the
       stellar neighborhood + inside a system; each crumb warps to that level. -->
  {#if view === '3d' && activeBlackHole}
    <!-- Slice 6: a black hole takes over the view — a single back crumb exits it. -->
    <nav class="context-crumbs" aria-label={m.explore_location_aria()}>
      <button type="button" class="crumb home" onclick={() => exitBlackHoleFn?.()}>
        ‹ {m.explore_ctx_back()}
      </button>
      <span class="crumb-sep">›</span>
      <span class="crumb current" aria-current="page">{activeBlackHole.name}</span>
    </nav>
  {:else if view === '3d' && (contextId === 'neighborhood' || contextId === 'milky-way' || contextId === 'local-group' || contextId === 'body-scene')}
    <nav class="context-crumbs" aria-label={m.explore_location_aria()}>
      <button
        type="button"
        class="crumb home"
        onclick={() => {
          if (contextId === 'body-scene') exitBodySceneFn?.();
          if (contextId === 'local-group') exitLocalGroupFn?.();
          if (contextId === 'milky-way' || contextId === 'local-group') exitMilkyWayFn?.();
          exitNeighborhoodFn?.();
        }}
      >
        ‹ {m.explore_ctx_solar_system()}
      </button>
      <span class="crumb-sep">›</span>
      {#if contextId === 'body-scene'}
        <button type="button" class="crumb" onclick={() => exitBodySceneFn?.()}>
          {m.explore_ctx_stellar_neighborhood()}
        </button>
        <span class="crumb-sep">›</span>
        <span class="crumb current" aria-current="page">{bodyHostName}</span>
      {:else if activeDeepSky}
        <button type="button" class="crumb" onclick={() => exitDeepSkyFn?.()}>
          {m.explore_ctx_stellar_neighborhood()}
        </button>
        <span class="crumb-sep">›</span>
        <span class="crumb current" aria-current="page">{activeDeepSky.name}</span>
      {:else if contextId === 'milky-way'}
        <button type="button" class="crumb" onclick={() => exitMilkyWayFn?.()}>
          {m.explore_ctx_stellar_neighborhood()}
        </button>
        <span class="crumb-sep">›</span>
        <span class="crumb current" aria-current="page">{m.explore_ctx_milky_way()}</span>
      {:else if contextId === 'local-group'}
        <button type="button" class="crumb" onclick={() => exitLocalGroupFn?.()}>
          {m.explore_ctx_milky_way()}
        </button>
        <span class="crumb-sep">›</span>
        <span class="crumb current" aria-current="page">{m.explore_ctx_local_group()}</span>
      {:else}
        <span class="crumb current" aria-current="page">{m.explore_ctx_stellar_neighborhood()}</span
        >
      {/if}
    </nav>
  {/if}

  <!-- Slice 5/8: honesty badge — the Milky Way + Local Group views are labelled
       schematics, not to scale (PRD-030 principle 2). -->
  {#if view === '3d' && contextId === 'milky-way' && !activeBlackHole}
    <div class="mw-badge" role="note">{m.explore_mw_schematic_badge()}</div>
  {/if}
  {#if view === '3d' && contextId === 'local-group' && !activeBlackHole}
    <div class="mw-badge" role="note">{m.explore_lg_schematic_badge()}</div>
  {/if}

  <!-- Slice 6: the black-hole render is a geodesic GR ray-trace — label it. -->
  {#if view === '3d' && activeBlackHole}
    <div class="mw-badge" role="note">{m.explore_bh_lensing_badge()}</div>

    <!-- Physics lenses (curvature grid + time dilation) — toggles bottom-left. -->
    <div class="nb-controls">
      <button
        type="button"
        class="nb-chip"
        class:active={bhCurvatureLens}
        aria-pressed={bhCurvatureLens}
        onclick={() => {
          bhCurvatureLens = !bhCurvatureLens;
          setBhCurvatureFn?.(bhCurvatureLens);
        }}
      >
        {m.explore_lens_curvature()}
      </button>
      <button
        type="button"
        class="nb-chip"
        class:active={bhTimeLens}
        aria-pressed={bhTimeLens}
        onclick={() => (bhTimeLens = !bhTimeLens)}
      >
        {m.explore_lens_time()}
      </button>
    </div>

    {#if bhCurvatureLens}
      <div class="lens-note" role="note">{m.explore_lens_curvature_note()}</div>
    {/if}

    {#if bhTimeLens}
      <div class="time-lens" role="note">
        <div class="tl-title">{m.explore_lens_time_title()}</div>
        <div class="tl-row">
          <span>{m.explore_lens_time_photon()}</span><b>{dilationPct(1.5)}</b>
        </div>
        <div class="tl-row"><span>{m.explore_lens_time_isco()}</span><b>{dilationPct(3)}</b></div>
        <div class="tl-row"><span>{m.explore_lens_time_ten()}</span><b>{dilationPct(10)}</b></div>
        <div class="tl-foot">{m.explore_lens_time_note()}</div>
      </div>
    {/if}
  {/if}

  <!-- Slice 7: the mass–period property-space plot — a lens inside an exoplanet
       system (body-scene). Off by default. -->
  {#if view === '3d' && contextId === 'body-scene' && !activeBlackHole && activeBodyHostId && exoplanetHostIds.has(activeBodyHostId)}
    <div class="nb-controls">
      <button
        type="button"
        class="nb-chip"
        class:active={massPeriodOpen}
        aria-pressed={massPeriodOpen}
        onclick={() => (massPeriodOpen = !massPeriodOpen)}
      >
        {m.explore_lens_mass_period()}
      </button>
    </div>
  {/if}

  <!-- v2 neighborhood layer toggles (Slice 1): constellation lines. -->
  {#if view === '3d' && contextId === 'neighborhood' && !activeBlackHole}
    <div class="nb-controls">
      <button
        type="button"
        class="nb-chip"
        class:active={starIndexOpen}
        aria-pressed={starIndexOpen}
        onclick={() => (starIndexOpen = !starIndexOpen)}
      >
        {m.explore_stars_toggle()}
      </button>
      <button
        type="button"
        class="nb-chip"
        class:active={showConstellations}
        aria-pressed={showConstellations}
        onclick={() => {
          showConstellations = !showConstellations;
          setConstellationsFn?.(showConstellations);
        }}
      >
        {m.explore_constellations_toggle()}
      </button>
      <button
        type="button"
        class="nb-chip"
        class:active={showCulture}
        aria-pressed={showCulture}
        onclick={() => (showCulture = !showCulture)}
      >
        {m.explore_culture_toggle()}
      </button>
      <button
        type="button"
        class="nb-chip"
        class:active={showDeepSky}
        aria-pressed={showDeepSky}
        onclick={() => {
          showDeepSky = !showDeepSky;
          setDeepSkyFn?.(showDeepSky);
        }}
      >
        {m.explore_deep_sky_toggle()}
      </button>
      <button
        type="button"
        class="nb-chip"
        class:active={hrLensOpen}
        aria-pressed={hrLensOpen}
        onclick={() => toggleHrFn?.()}
      >
        {m.explore_lens_hr()}
      </button>
      <button
        type="button"
        class="nb-chip"
        class:active={causalityOpen}
        aria-pressed={causalityOpen}
        onclick={() => {
          causalityOpen = !causalityOpen;
          if (causalityOpen) openCausalityFn?.();
        }}
      >
        {m.explore_lens_causality()}
      </button>
    </div>
    <StarIndex
      stars={namedStars}
      open={starIndexOpen}
      selectedId={selectedStarId}
      onSelect={(id) => {
        indexSelectStarFn?.(id);
        starIndexOpen = false;
      }}
      onClose={() => (starIndexOpen = false)}
    />
  {/if}

  <!-- v2 scale ruler (PRD-030 / RFC-032): the fitting distance measure for the
       current zoom — km → AU → light-year → parsec — plus light-travel time and
       a map-style scale bar. Teaches which unit fits which scale as you zoom.
       English chrome for now; i18n before the slice ships. -->
  {#if view === '3d' && scaleReadout && contextId !== 'body-scene' && contextId !== 'milky-way'}
    <div class="scale-hud" class:neighborhood={contextId === 'neighborhood'} aria-hidden="true">
      <div class="scale-ladder">
        {#each rungLadder as rung (rung)}
          <span
            class="rung"
            class:active={scaleReadout.rung === rung ||
              (scaleReadout.rung === 'ly' && rung === 'pc')}
          >
            {rung === 'au' ? 'AU' : rung}
          </span>
        {/each}
      </div>
      <!-- Numeric distance + light-time only where the Orbit Ruler (solar
           system) isn't already showing them — keeps the two rulers complementary,
           not redundant. -->
      {#if contextId === 'neighborhood'}
        <div class="scale-readout">
          <span class="primary"
            >{fmtScale(scaleReadout.primary.value)} {scaleReadout.primary.unit}</span
          >
          {#if scaleReadout.companion}
            <span class="companion"
              >≈ {fmtScale(scaleReadout.companion.value)} {scaleReadout.companion.unit}</span
            >
          {/if}
        </div>
        <div class="scale-light">
          {m.explore_scale_light_prefix()}: {fmtScale(scaleReadout.lightTravel.value)}
          {lightUnitLabel(scaleReadout.lightTravel.unit)}
        </div>
      {/if}
      {#if scaleBarPx > 0}
        <div class="scale-bar-wrap">
          <span class="scale-bar" style="width:{Math.round(Math.min(scaleBarPx, 220))}px"></span>
          <span class="scale-bar-label">{scaleBarLabel}</span>
        </div>
      {/if}
      <div class="scale-context">{contextLabel()}</div>
    </div>
  {/if}

  <!-- v2 anonymous-star tag (Slice 1 Hybrid): tapping a background star shows the
       honest facts from the catalogue — no Panel, no invented name. -->
  {#if view === '3d' && contextId === 'neighborhood' && anonStar}
    <div class="anon-star" role="status">
      <span class="anon-title">{m.explore_anon_unnamed()}</span>
      <span class="anon-facts">
        {anonStar.distLy.toLocaleString(undefined, { maximumFractionDigits: 1 })} ly · mag {anonStar.mag.toFixed(
          1,
        )} · {anonColorLabel(anonStar.colorName)} (~{anonStar.kelvin.toLocaleString()} K)
      </span>
      <button
        type="button"
        class="anon-close"
        aria-label={m.explore_anon_dismiss()}
        onclick={() => (anonStar = null)}>×</button
      >
    </div>
  {/if}

  <!-- v2 Slice 4: full-frame deep-sky immersion. The curated photo fills the
       viewport (thumb → full-res) with a soft vignette — the destination you fly
       into from a glint. Sits above the canvas; the warp flash + panel render on
       top. -->
  {#if view === '3d' && activeDeepSky && deepSkyPhotoUrl}
    <div class="deep-sky-immersion" class:visible={deepSkyImmersed} aria-hidden={!deepSkyImmersed}>
      <img src={deepSkyPhotoUrl} alt={activeDeepSkyImage?.caption ?? activeDeepSky.name} />
      <div class="ds-vignette"></div>
    </div>
  {/if}

  <!-- Slice 7: the HR-diagram (property-space) lens overlay — the real star field
       re-projected onto temperature/luminosity axes. -->
  {#if view === '3d'}
    <HrDiagram stars={hrStars} open={hrLensOpen && contextId === 'neighborhood'} />
    <CausalityMap
      field={causalityField}
      named={causalityNamed}
      shells={causalityShells}
      open={causalityOpen && contextId === 'neighborhood'}
    />
    <MassPeriodChart
      planets={allExoplanetPlanets}
      activeHostId={activeBodyHostId}
      open={massPeriodOpen && contextId === 'body-scene'}
    />
  {/if}

  <!-- Warp flash — masks the scene cut at a boundary crossing. Replays whenever
       crossingFlashId changes (skipped under reduced motion, which never bumps it). -->
  {#if view === '3d' && crossingFlashId > 0}
    {#key crossingFlashId}
      <div class="cross-flash" aria-hidden="true"></div>
    {/key}
  {/if}

  <!-- v2 Slice 2: distance caption shown during a Navigator warp into a system,
       teaching the distance it just crossed (UXS-014 §4 signature moment). -->
  {#if view === '3d' && warpCaption}
    {#key warpCaption}
      <div class="warp-caption" role="status">{warpCaption}</div>
    {/key}
  {/if}

  <!-- PRD-023 Slice E.2 — Earth-comparison ghost, doubling as the
       REFERENCES launcher (2026-06-06 user direction: move the
       REFERENCES chip from the top HUD to the Earth-for-scale slot;
       click → open the planet-scales overlay). Always visible at the
       bottom-left so it's a stable affordance; the ratio line only
       shows when focused on a non-Earth planet. -->
  <button
    type="button"
    class="earth-compare"
    class:context-hidden={contextId !== 'solar-system' || !!activeBlackHole}
    aria-label={m.explore_sizes_toggle()}
    onclick={() => (panelState.sizes = !panelState.sizes)}
    data-testid="sizes-toggle"
  >
    <img src="{base}/textures/2k_earth_daymap.1x1.jpg" alt="" loading="lazy" decoding="async" />
    <span class="earth-compare-label">
      {#if cameraState.focusedOnPlanet && selectedId && selectedId !== 'earth' && focusedStats}
        EARTH FOR SCALE<br />
        <span class="ratio">{focusedStats.diameterRatioEarth.toFixed(2)}× diameter</span>
      {:else if focusedSatelliteStats}
        EARTH FOR SCALE<br />
        <span class="ratio"
          >{focusedSatelliteStats.diameterRatioEarth < 0.01
            ? focusedSatelliteStats.diameterRatioEarth.toFixed(4)
            : focusedSatelliteStats.diameterRatioEarth.toFixed(2)}× diameter</span
        >
      {:else}
        {m.explore_sizes_toggle()}<br />
        <span class="ratio">{m.explore_planet_scales()}</span>
      {/if}
    </span>
  </button>

  <!-- Time playback (#351 Layer 1) — pause + days-per-second speed over
       the live orbital clock. Pinned bottom-left beside the PLANET SCALES
       button (user direction 2026-06-21). Pills mirror the guide-explore
       narration ("one day per second, ten days, a hundred"). -->
  <div
    class="time-controls"
    class:context-hidden={contextId !== 'solar-system' || !!activeBlackHole}
    data-audio-stage="explore-time"
  >
    <!-- Mobile-only compact REFERENCES button — the standalone .earth-compare
         is hidden on mobile (z-20 behind footer); this keeps the affordance
         accessible in the scrubber row (z-40). -->
    <button
      type="button"
      class="earth-compact"
      onclick={() => (panelState.sizes = !panelState.sizes)}
      aria-label={m.explore_sizes_toggle()}
      title={m.explore_sizes_toggle()}
      data-testid="sizes-toggle-compact"
    >
      <img src="{base}/textures/2k_earth_daymap.1x1.jpg" alt="" loading="lazy" decoding="async" />
      <span class="earth-compact-label">
        {#if cameraState.focusedOnPlanet && selectedId && selectedId !== 'earth' && focusedStats}
          {focusedStats.diameterRatioEarth.toFixed(2)}×
        {:else if focusedSatelliteStats}
          {focusedSatelliteStats.diameterRatioEarth < 0.01
            ? focusedSatelliteStats.diameterRatioEarth.toFixed(4)
            : focusedSatelliteStats.diameterRatioEarth.toFixed(2)}×
        {:else}
          SCALE
        {/if}
      </span>
    </button>
    <button
      type="button"
      class="toggle play-btn"
      onclick={() => (simPaused = !simPaused)}
      aria-pressed={simPaused}
      aria-label={simPaused ? m.fly_play() : m.fly_pause()}
      title={simPaused ? m.fly_play() : m.fly_pause()}
      data-testid="explore-time-play"
      data-audio-stage="explore-time-pause"
    >
      {simPaused ? '▶' : '⏸'}
    </button>
    <div class="speed-group" role="group" aria-label={m.fly_speed_label()}>
      <!-- Mobile: single active-speed slot; tap to reveal all 3 above. -->
      <div class="speed-slot">
        <button
          type="button"
          class="speed-pill"
          class:active={!simPaused}
          aria-expanded={speedPopoverOpen}
          aria-haspopup="listbox"
          aria-label="{simSpeed}× — {m.fly_speed_label()}"
          onclick={() => (speedPopoverOpen = !speedPopoverOpen)}>{simSpeed}×</button
        >
        {#if speedPopoverOpen}
          <div class="speed-popover" role="listbox" aria-label={m.fly_speed_label()}>
            {#each SIM_SPEEDS as sp (sp)}
              {@const speedTip =
                sp === 1
                  ? m.explore_speed_tip_1()
                  : sp === 100
                    ? m.explore_speed_tip_100()
                    : m.explore_speed_tip_10()}
              <button
                type="button"
                class="speed-pill"
                class:active={!simPaused && simSpeed === sp}
                role="option"
                aria-selected={!simPaused && simSpeed === sp}
                aria-label={speedTip}
                title={speedTip}
                onclick={() => {
                  simSpeed = sp;
                  simPaused = false;
                  speedPopoverOpen = false;
                }}
                data-testid="explore-speed-{sp}"
                data-audio-stage="explore-speed-{sp}">{sp}×</button
              >
            {/each}
          </div>
        {/if}
      </div>
      <!-- Desktop: all 3 pills visible. -->
      {#each SIM_SPEEDS as sp (sp)}
        {@const speedTip =
          sp === 1
            ? m.explore_speed_tip_1()
            : sp === 100
              ? m.explore_speed_tip_100()
              : m.explore_speed_tip_10()}
        <button
          type="button"
          class="speed-pill speed-desktop-pill"
          class:active={!simPaused && simSpeed === sp}
          aria-pressed={!simPaused && simSpeed === sp}
          aria-label={speedTip}
          title={speedTip}
          onclick={() => {
            simSpeed = sp;
            simPaused = false;
          }}
          data-testid="explore-speed-{sp}"
          data-audio-stage="explore-speed-{sp}"
        >
          {sp}×
        </button>
      {/each}
    </div>
    <!-- Date readout + reset (#351 Layer 2-B) — the running simulated date,
         with a dedicated reset-to-today button sized like play/pause. -->
    <span class="time-date" data-testid="explore-sim-date" data-audio-stage="explore-sim-date"
      >{simDateLabel}</span
    >
    <button
      type="button"
      class="play-btn reset-btn"
      onclick={() => resetSimToToday?.()}
      title={m.explore_time_today()}
      aria-label={m.explore_time_today()}
      data-testid="explore-time-today"
      data-audio-stage="explore-time-today"
    >
      ⟲
    </button>
  </div>

  <!-- PRD-023 Slice E.4 — Tactical Scan overlay (shared component,
       #382). Self-gates on the 'planet-stats' lens layer; `focusGate`
       additionally requires the camera to have settled on a planet. -->
  <TacticalScan
    stats={focusedStats}
    bodyLabel={selectedId?.toUpperCase() ?? ''}
    rotationHours={focusedRotationHours}
    lightTime={focusedLightTime}
    focusGate={cameraState.focusedOnPlanet}
  />

  <!-- Secondary HUD controls: 2D/3D toggle + layer chips + paths-legend.
       Defined once as a snippet; rendered inline on desktop, inside
       MobileDrawerGroup accordion on mobile (≤767 px). -->
  {#snippet exploreControls()}
    <div class="ctrl-row">
      <button
        class="toggle"
        type="button"
        onclick={toggleView}
        aria-pressed={view === '2d'}
        data-testid="explore-view-toggle"
      >
        {view === '3d' ? m.ui_view_2d() : m.ui_view_3d()}
      </button>
      {#if selectedId || selectedSmallBodyId || selectedSatelliteKey || selectedBeltId || panelState.sun}
        <button
          class="toggle"
          type="button"
          onclick={() => {
            selectedId = null;
            selectedSmallBodyId = null;
            selectedSatelliteKey = null;
            selectedBeltId = null;
            resetExplorePanelState();
            exitNeighborhoodFn?.();
            flyToBodyFn?.(null);
          }}
          data-testid="explore-reset-view"
          data-audio-stage="explore-reset-view"
        >
          {m.ui_reset_view()}
        </button>
      {/if}
      <EnterArButton onEnter={() => void launchArScene('explore')} />
      <EnterSkyButton onEnter={() => void launchSkyScene()} />
    </div>
    <!-- Inline chips rather than LayerChipRow: the PATHS chip carries
         data-audio-stage which LayerChipRow's interface doesn't expose. -->
    <div class="ctrl-row chips" role="group" aria-label={m.ui_visibility_layers()}>
      <button
        type="button"
        class="chip"
        class:active={layers.planets}
        aria-pressed={layers.planets}
        onclick={() => (layers.planets = !layers.planets)}
        data-testid="layer-planets"
        title={m.explore_layer_tip_planets()}
      >
        {m.ui_layer_planets()}
      </button>
      <button
        type="button"
        class="chip"
        class:active={layers.dwarfs}
        aria-pressed={layers.dwarfs}
        onclick={() => (layers.dwarfs = !layers.dwarfs)}
        data-testid="layer-dwarfs"
        title={m.explore_layer_tip_dwarfs()}
      >
        {m.ui_layer_dwarfs()}
      </button>
      <button
        type="button"
        class="chip"
        class:active={layers.comets}
        aria-pressed={layers.comets}
        onclick={() => (layers.comets = !layers.comets)}
        data-testid="layer-comets"
        title={m.explore_layer_tip_comets()}
      >
        {m.ui_layer_comets()}
      </button>
      <button
        type="button"
        class="chip"
        class:active={layers.interstellar}
        aria-pressed={layers.interstellar}
        onclick={() => (layers.interstellar = !layers.interstellar)}
        data-testid="layer-interstellar"
        title={m.explore_layer_tip_interstellar()}
      >
        {m.ui_layer_interstellar_short()}
      </button>
      <button
        type="button"
        class="chip"
        class:active={layers.paths}
        aria-pressed={layers.paths}
        onclick={() => (layers.paths = !layers.paths)}
        data-audio-stage="explore-layer-paths"
        data-testid="layer-paths"
        title={m.explore_layer_tip_paths()}
      >
        {m.ui_layer_paths()}
      </button>
    </div>
    {#if layers.paths}
      <div
        class="paths-legend"
        bind:this={pathsLegendEl}
        role="group"
        aria-label={m.explore_trajectory_legend_aria()}
      >
        <a
          class="paths-legend-why"
          href="{base}/science/transfers/coplanar-trajectories"
          data-testid="paths-legend-why"
        >
          ⓘ Why are they all in one plane?
        </a>
        <!-- Hover brightens the arc + swaps the tagline but does NOT open
             the panel — click commits. Intentional after the 2026-06-19
             render-storm from async getMission() on every mouseenter. -->
        <div class="paths-legend-tagline" aria-live="polite">
          {#if iconic.state.hoveredId}
            {iconicTagline(iconic.state.hoveredId)}
          {:else if iconic.state.selectedId}
            {iconicTagline(iconic.state.selectedId)}
          {:else}
            {m.explore_iconic_tagline_placeholder()}
          {/if}
        </div>
        {#each PATHS_LEGEND as entry, i (entry.mission_id)}
          <button
            type="button"
            class="paths-legend-row"
            bind:this={legendRowEls[i]}
            class:is-selected={iconic.state.selectedId === entry.mission_id}
            class:is-hovered={iconic.state.hoveredId === entry.mission_id}
            aria-pressed={iconic.state.selectedId === entry.mission_id}
            onclick={() => iconic.selectMission(entry.mission_id, localeFromPage($page))}
            onkeydown={(e) => onLegendKeydown(e, i)}
            onmouseenter={() => {
              iconic.state.hoveredId = entry.mission_id;
            }}
            onfocus={() => {
              iconic.state.hoveredId = entry.mission_id;
            }}
            onblur={() => {
              if (iconic.state.hoveredId === entry.mission_id) {
                iconic.state.hoveredId = null;
              }
            }}
            onmouseleave={() => {
              iconic.state.hoveredId = null;
            }}
            data-testid="paths-legend-row-{entry.mission_id}"
            data-audio-stage="iconic-mission-{entry.mission_id}"
          >
            <span class="swatch" style="background-color: {entry.color};" aria-hidden="true"></span>
            <span class="name">{entry.name}</span>
            <span class="logos" aria-hidden="true">
              {#each agencyToLogoPaths(entry.agency) as logoPath (logoPath)}
                <img src={logoPath} alt="" loading="lazy" />
              {/each}
            </span>
            <span class="year">{entry.launch_year}</span>
          </button>
        {/each}
      </div>
    {/if}
  {/snippet}
  <!-- Desktop cluster — hidden on mobile (≤767 px) via CSS. -->
  <div
    class="hud-controls"
    class:context-hidden={contextId !== 'solar-system' || !!activeBlackHole}
    data-audio-stage="explore-hud"
    role="group"
    aria-label={m.ui_view_controls()}
  >
    {@render exploreControls()}
  </div>
  <!-- Mobile-only: 2D/3D toggle + Reset View fixed at top-left (mirrors
       desktop .hud-controls corner; .hud-controls itself is desktop-only). -->
  <div
    class="hud-top-mobile"
    class:context-hidden={contextId !== 'solar-system' || !!activeBlackHole}
    role="group"
    aria-label={m.ui_view_controls()}
  >
    <button
      class="toggle"
      type="button"
      onclick={toggleView}
      aria-pressed={view === '2d'}
      data-testid="explore-view-toggle-mobile"
    >
      {view === '3d' ? m.ui_view_2d() : m.ui_view_3d()}
    </button>
    {#if selectedId || selectedSmallBodyId || selectedSatelliteKey || selectedBeltId || panelState.sun}
      <button
        class="toggle"
        type="button"
        onclick={() => {
          selectedId = null;
          selectedSmallBodyId = null;
          selectedSatelliteKey = null;
          selectedBeltId = null;
          resetExplorePanelState();
          exitNeighborhoodFn?.();
          flyToBodyFn?.(null);
        }}
        data-testid="explore-reset-view-mobile"
        data-audio-stage="explore-reset-view"
      >
        {m.ui_reset_view()}
      </button>
    {/if}
    <EnterArButton onEnter={() => void launchArScene('explore')} />
    <EnterSkyButton onEnter={() => void launchSkyScene()} />
  </div>
  <!-- Mobile-only: 3-tab accordion — Orbit Ruler | Controls | Iconic Missions.
       Desktop uses .hud-controls (above) + .ruler-desktop-only (below). -->
  {#snippet mobileRulerContent(close: () => void)}
    {#if exploreRegimes.length > 0 && contextId === 'solar-system' && !activeBlackHole}
      <OrbitRuler
        regimes={exploreRegimes}
        highlightRegime={null}
        onSelect={(id) => {
          openExploreRegime(id);
          close();
        }}
        surfaceAnchor={null}
      />
    {/if}
  {/snippet}
  {#snippet mobileControlsContent(close: () => void)}
    <div class="ctrl-row chips" role="group" aria-label={m.ui_visibility_layers()}>
      <button
        type="button"
        class="chip"
        class:active={layers.planets}
        aria-pressed={layers.planets}
        onclick={() => {
          layers.planets = !layers.planets;
          close();
        }}
        data-testid="layer-planets"
        title={m.explore_layer_tip_planets()}
      >
        {m.ui_layer_planets()}
      </button>
      <button
        type="button"
        class="chip"
        class:active={layers.dwarfs}
        aria-pressed={layers.dwarfs}
        onclick={() => {
          layers.dwarfs = !layers.dwarfs;
          close();
        }}
        data-testid="layer-dwarfs"
        title={m.explore_layer_tip_dwarfs()}
      >
        {m.ui_layer_dwarfs()}
      </button>
      <button
        type="button"
        class="chip"
        class:active={layers.comets}
        aria-pressed={layers.comets}
        onclick={() => {
          layers.comets = !layers.comets;
          close();
        }}
        data-testid="layer-comets"
        title={m.explore_layer_tip_comets()}
      >
        {m.ui_layer_comets()}
      </button>
      <button
        type="button"
        class="chip"
        class:active={layers.interstellar}
        aria-pressed={layers.interstellar}
        onclick={() => {
          layers.interstellar = !layers.interstellar;
          close();
        }}
        data-testid="layer-interstellar"
        title={m.explore_layer_tip_interstellar()}
      >
        {m.ui_layer_interstellar_short()}
      </button>
    </div>
  {/snippet}
  {#snippet mobileIconicContent(close: () => void)}
    <!-- Compact trajectory on/off — a much smaller stand-in for the desktop
         chip. onOpen enables the layer when the drawer opens; this toggle lets
         you switch the arcs off without closing the drawer. -->
    <button
      type="button"
      class="iconic-toggle"
      class:active={layers.paths}
      aria-pressed={layers.paths}
      onclick={() => (layers.paths = !layers.paths)}
      data-testid="layer-paths"
      title={m.explore_layer_tip_paths()}
    >
      <span class="iconic-toggle-dot" class:on={layers.paths} aria-hidden="true"></span>
      {m.ui_layer_paths()}
    </button>
    <div class="paths-legend" role="group" aria-label={m.explore_trajectory_legend_aria()}>
      <a
        class="paths-legend-why"
        href="{base}/science/transfers/coplanar-trajectories"
        data-testid="paths-legend-why"
      >
        ⓘ Why are they all in one plane?
      </a>
      <div class="paths-legend-tagline" aria-live="polite">
        {#if iconic.state.hoveredId}
          {iconicTagline(iconic.state.hoveredId)}
        {:else if iconic.state.selectedId}
          {iconicTagline(iconic.state.selectedId)}
        {:else}
          {m.explore_iconic_tagline_placeholder()}
        {/if}
      </div>
      {#each PATHS_LEGEND as entry, i (entry.mission_id)}
        <button
          type="button"
          class="paths-legend-row"
          class:is-selected={iconic.state.selectedId === entry.mission_id}
          class:is-hovered={iconic.state.hoveredId === entry.mission_id}
          aria-pressed={iconic.state.selectedId === entry.mission_id}
          onclick={() => {
            iconic.selectMission(entry.mission_id, localeFromPage($page));
            close();
          }}
          onkeydown={(e) => onLegendKeydown(e, i)}
          onmouseenter={() => {
            iconic.state.hoveredId = entry.mission_id;
          }}
          onfocus={() => {
            iconic.state.hoveredId = entry.mission_id;
          }}
          onblur={() => {
            if (iconic.state.hoveredId === entry.mission_id) {
              iconic.state.hoveredId = null;
            }
          }}
          onmouseleave={() => {
            iconic.state.hoveredId = null;
          }}
          data-testid="paths-legend-row-{entry.mission_id}"
          data-audio-stage="iconic-mission-{entry.mission_id}"
        >
          <span class="swatch" style="background-color: {entry.color};" aria-hidden="true"></span>
          <span class="name">{entry.name}</span>
          <span class="logos" aria-hidden="true">
            {#each agencyToLogoPaths(entry.agency) as logoPath (logoPath)}
              <img src={logoPath} alt="" loading="lazy" />
            {/each}
          </span>
          <span class="year">{entry.launch_year}</span>
        </button>
      {/each}
    </div>
  {/snippet}
  {#snippet mobileIndexContent(close: () => void)}
    <ExploreBodyIndex
      inline
      bodies={bodyIndexList}
      {selectedId}
      open
      onClose={close}
      onSelect={(b) => {
        if (b.kind === 'sun') selectSun();
        else if (b.kind === 'planet') selectPlanet(b.id);
        else selectSmallBody(b.id);
        close();
      }}
    />
  {/snippet}
  <!-- Mobile solar-system drawers (ruler/controls/missions/index) — solar-system
       only; the neighborhood + BodyScenes have their own chrome. -->
  {#if contextId === 'solar-system' && !activeBlackHole}
    <MobileDrawerGroup
      tabs={[
        { id: 'ruler', label: 'Ruler', icon: '◎', content: mobileRulerContent },
        { id: 'controls', label: 'Controls', icon: '▤', content: mobileControlsContent },
        { id: 'missions', label: 'Missions', icon: '➤', content: mobileIconicContent },
        { id: 'index', label: 'Index', icon: '☰', content: mobileIndexContent },
      ]}
      onOpen={(id) => {
        if (id === 'missions') layers.paths = true;
      }}
      bottomInline
      --mcd-bottom="calc(56px + env(safe-area-inset-bottom, 0px))"
    />
  {/if}

  {#if panelState.sizes}
    <!-- Size comparison overlay — modal-style, mirrors selected planet
         (if any) so the user keeps context. ESC + backdrop click close. -->
    <button
      type="button"
      class="sizes-backdrop"
      aria-label={m.explore_sizes_close()}
      onclick={() => (panelState.sizes = false)}
    ></button>
    <div class="sizes-card" role="dialog" aria-modal="true" aria-label={m.explore_sizes_toggle()}>
      <button
        type="button"
        class="sizes-close"
        aria-label={m.explore_sizes_close()}
        onclick={() => (panelState.sizes = false)}>×</button
      >
      <div class="sizes-canvas-wrap">
        <SizesCanvas highlightId={selectedId} />
      </div>
    </div>
  {/if}

  {#if hoverData && view === '3d' && tooltipVisible}
    <div
      class="tooltip"
      class:expanded={tooltipExpanded}
      role="status"
      aria-live="polite"
      aria-label="{hoverData.name} — {hoverData.velocity}, {hoverData.distance}, {hoverData.extras}"
      style:left="{Math.min(hoverData.x + 14, (container?.clientWidth ?? 0) - 220)}px"
      style:top="{Math.max(hoverData.y - 60, 60)}px"
    >
      {#if hoverData.kind === 'lagrange'}
        <!-- Lagrange-point tooltip — co-orbits with the parent planet,
             so no orbital velocity. Title + physics blurb + (for the
             Sun–Earth points) notable spacecraft hosting that point. -->
        <div class="tt-eyebrow">{hoverData.lagrangeTitle}</div>
        <div class="tt-line dim">{hoverData.lagrangeBlurb}</div>
        {#if hoverData.lagrangeNotable}
          <div class="tt-line dim">{hoverData.lagrangeNotable}</div>
        {/if}
      {:else if tooltipExpanded}
        <!-- Lens-on expanded card. The cursor-tracking tooltip can't be
             clicked-through (mouse leaves the planet immediately on
             entry into the card area), so we drop the ScienceChip info
             icons and surface only the live numbers. Users navigate to
             /science via the lens banner instead. -->
        <div class="tt-eyebrow">{hoverData.name.toUpperCase()}</div>
        <div class="tt-row">
          <span class="tt-key">{m.explore_tt_speed()}</span>
          <span class="tt-val">{hoverData.velocityKms.toFixed(2)} km/s</span>
        </div>
        <div class="tt-row">
          <span class="tt-key">{m.explore_tt_dist()}</span>
          <span class="tt-val">
            {hoverData.distanceAU.toFixed(3)} AU ·
            {(hoverData.distanceAU * 8.317).toFixed(1)} l-min
          </span>
        </div>
        <div class="tt-row">
          <span class="tt-key">{m.explore_tt_ecc()}</span>
          <span class="tt-val">{hoverData.eccentricity.toFixed(3)}</span>
        </div>
        <div class="tt-row">
          <span class="tt-key">{m.explore_tt_incl()}</span>
          <span class="tt-val">{hoverData.inclinationDeg.toFixed(1)}°</span>
        </div>
      {:else}
        <div class="tt-line">{hoverData.velocity}</div>
        <div class="tt-line dim">{hoverData.distance}</div>
        <div class="tt-line dim">{hoverData.extras}</div>
      {/if}
    </div>
  {/if}
</div>

<PlanetPanel
  planet={selectedPlanet}
  open={panelState.planet}
  onClose={closePanel}
  onPlanMission={selectedPlanet?.missionable ? onPlanMission : undefined}
/>

<SunPanel sun={localizedSun} open={panelState.sun} onClose={closeSunPanel} />

<!-- v2 named-star detail (Slice 1). closeStarFn set in onMount. -->
<StarPanel
  star={localizedStar}
  open={panelState.star}
  hasSystem={selectedStarId ? exoplanetHostIds.has(selectedStarId) : false}
  onEnterSystem={() => selectedStarId && enterSystemFn?.(selectedStarId)}
  cultureDoors={showCulture ? starCultureDoors : []}
  onClose={() => closeStarFn?.()}
/>

<ExoplanetPanel
  planet={selectedExoplanet?.planet ?? null}
  hostName={selectedExoplanet?.hostName ?? ''}
  overlay={selectedExoplanet?.overlay ?? null}
  cultureDoors={showCulture ? exoCultureDoors : []}
  open={panelState.exoplanet}
  onClose={() => closeExoplanetFn?.()}
/>

<DeepSkyPanel
  object={activeDeepSky}
  image={activeDeepSkyImage}
  galleryHref="{base}/gallery/deep-sky"
  open={deepSkyPanelOpen}
  onClose={() => exitDeepSkyFn?.()}
  onGateway={(hostId) => deepSkyGatewayFn?.(hostId)}
/>

<MilkyWayPanel
  object={selectedMwObject}
  learnHref={mwLearnHref}
  open={mwPanelOpen}
  onClose={() => closeMwFn?.()}
/>

<LocalGroupPanel member={selectedLgMember} open={lgPanelOpen} onClose={() => closeLgFn?.()} />

<BlackHolePanel
  hole={activeBlackHole}
  learnHref={bhLearnHref}
  open={bhPanelOpen}
  onClose={() => exitBlackHoleFn?.()}
>
  {#each bhCultureDoors as door (door.id)}
    <CultureDoorCard {door} />
  {/each}
</BlackHolePanel>

<SmallBodyPanel
  body={selectedSmallBody}
  open={panelState.smallBody}
  onClose={() => (panelState.smallBody = false)}
/>

<SatellitePanel
  satelliteKey={selectedSatelliteKey}
  open={panelState.satellite}
  onClose={() => (panelState.satellite = false)}
/>

<BeltPanel
  beltId={selectedBeltId}
  open={panelState.belt}
  onClose={() => (panelState.belt = false)}
/>

<MissionPanel
  mission={iconic.state.mission}
  open={iconic.state.panelOpen}
  onClose={() => iconic.reset()}
  onFly={(id) => goto(`${base}/fly?mission=${id}`)}
/>

<!-- Heliocentric scale ruler + zone panel (#357). Lower-left, always
     visible. Bands run from the Sun out to the Oort cloud; click a
     band to teach the zone, click a resident body to deep-link via
     ?id=<body-id> (the existing /explore deep-link resolver picks it
     up). RegimePanel sits at zIndex=28 so any body panel that opens
     stacks on top — closing the body panel reveals the zone panel. -->
<!-- Solar-system regime ruler — hidden past the boundary (its AU regimes are
     meaningless in the stellar neighborhood, which has its own scale ruler). -->
{#if exploreRegimes.length > 0 && contextId === 'solar-system' && !activeBlackHole}
  <div class="ruler-desktop-only">
    <OrbitRuler
      regimes={exploreRegimes}
      highlightRegime={null}
      onSelect={openExploreRegime}
      surfaceAnchor={null}
    />
  </div>
{/if}

<RegimePanel
  regime={selectedExploreRegime}
  open={exploreRegimePanelOpen}
  onClose={closeExploreRegime}
  selectableIds={exploreSelectableIds}
  onResidentClick={onExploreResidentClick}
/>

<!-- Hidden tour anchors (PRD-016 §S11 / RFC-019 §12). Programmatic
     triggers used by the audio executor's `click` action so the tour
     can demonstrate planet-selection on a canvas-driven scene where
     there's no clickable DOM element for a planet. These buttons are
     visually offscreen but click()-able. -->
<!-- Body index (RFC-031 S2): the desktop edge-handle "little side tab" (mirrors
     the surface index handle) toggles the searchable side panel — master → detail,
     stays open on select. Mobile uses the Index drawer tab. The accessible
     counterpart to canvas picking. -->
<button
  type="button"
  class="body-index-handle body-index-toggle"
  data-testid="explore-body-index-toggle"
  aria-pressed={bodyIndexOpen}
  aria-label={m.explore_body_index_aria()}
  title={m.explore_body_index_aria()}
  onclick={() => (bodyIndexOpen = !bodyIndexOpen)}
>
  <span class="bih-label">{m.explore_body_index_toggle()}</span>
</button>
<ExploreBodyIndex
  bodies={bodyIndexList}
  {selectedId}
  open={bodyIndexOpen}
  onClose={() => (bodyIndexOpen = false)}
  onSelect={(b) => {
    if (b.kind === 'sun') selectSun();
    else if (b.kind === 'planet') selectPlanet(b.id);
    else selectSmallBody(b.id);
    // Desktop master → detail: keep the index open on select (matches surface).
  }}
/>

<div class="tour-anchors" aria-hidden="true">
  {#each ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'] as planetId (planetId)}
    <button
      type="button"
      data-audio-stage="explore-select-{planetId}"
      tabindex="-1"
      onclick={() => selectPlanet(planetId)}>select {planetId}</button
    >
  {/each}
  <button
    type="button"
    data-audio-stage="explore-select-sun"
    tabindex="-1"
    onclick={() => selectSun()}>select sun</button
  >
</div>

<!-- Unified Science Lens panel — lens story + layer toggles in one
     collapse. Replaces the previous two-panel arrangement (banner +
     layers) per the v0.6 Science-Lens UX pass. /explore wires four
     layers: hover-cards (lens-on tooltip expansion), gravity (per-
     planet arrow toward Sun), velocity (tangent), centripetal (paired
     inward arrow). SoI and apsides are omitted — planets render on
     circular orbits at this visual scale, so apsides degenerate to
     single points and SoIs are sub-pixel. -->
<ScienceLayersPanel
  title={m.explore_2d_view_title()}
  body="Every planet's orbit is an ellipse with the Sun at one focus. Same five Keplerian numbers (size, shape, tilt, orientation, position) describe each one — same six laws move them."
  tab="orbits"
  section="keplerian-orbit"
  available={[
    'hover',
    'gravity',
    'velocity',
    'centripetal',
    'galaxies',
    'hill-sphere',
    'lagrange-points',
    'magnetosphere',
    'sub-solar',
    'planet-stats',
  ]}
  historicalFoundations={[
    { tab: 'history', section: 'keplers-laws-1609', label: "Kepler's three laws, 1609" },
    { tab: 'history', section: 'newton-principia-1687', label: 'Newton · Principia, 1687' },
  ]}
/>

<style>
  .explore {
    position: absolute;
    inset: var(--nav-height) 0 0 0;
    overflow: hidden;
  }
  .layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    /* Disable native touch gestures (scroll, pinch-zoom of the page) so
       the canvas owns single-finger orbit + two-finger pinch. */
    touch-action: none;
  }
  .layer.hidden {
    display: none;
  }

  /* v2 scale ruler HUD (PRD-030 / RFC-032). Bottom-left, unobtrusive. */
  .scale-hud {
    position: absolute;
    right: 12px;
    bottom: 46px;
    z-index: 6;
    padding: 9px 11px;
    background: rgba(6, 10, 22, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    backdrop-filter: blur(5px);
    font-family: 'Space Mono', monospace;
    color: #dde4ff;
    pointer-events: none;
    max-width: 260px;
  }
  .scale-hud.neighborhood {
    border-color: rgba(78, 205, 196, 0.35);
  }
  .scale-ladder {
    display: flex;
    gap: 4px;
    margin-bottom: 6px;
  }
  .scale-ladder .rung {
    font-size: 9px;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 1px 5px;
    border-radius: 3px;
    color: rgba(255, 255, 255, 0.35);
    background: rgba(255, 255, 255, 0.04);
  }
  .scale-ladder .rung.active {
    color: #04121a;
    background: #4ecdc4;
    font-weight: 700;
  }
  .scale-readout {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
  }
  .scale-readout .primary {
    font-size: 15px;
    color: #fff;
  }
  .scale-readout .companion {
    font-size: 11px;
    color: #9fe8e2;
  }
  .scale-light {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 2px;
  }
  .scale-bar-wrap {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 7px;
  }
  .scale-bar {
    display: inline-block;
    height: 3px;
    background: rgba(255, 255, 255, 0.8);
    border-left: 1px solid rgba(255, 255, 255, 0.8);
    border-right: 1px solid rgba(255, 255, 255, 0.8);
    box-sizing: border-box;
    min-width: 12px;
  }
  .scale-bar-label {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.7);
  }
  .scale-context {
    font-size: 9px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.4);
    margin-top: 6px;
  }

  /* Solar-system chrome hidden out in the stellar neighborhood. */
  .context-hidden {
    display: none !important;
  }

  /* v2 neighborhood layer toggles — bottom-left (solar chrome is hidden here). */
  .nb-controls {
    position: absolute;
    left: 12px;
    bottom: 16px;
    z-index: 6;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    /* Cap to the viewport so the 4-chip row wraps instead of overflowing the
       right edge on narrow screens (bottom-anchored → wrapped rows stack up). */
    max-width: calc(100vw - 24px);
  }
  .nb-chip {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.7);
    background: rgba(6, 10, 22, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 5px;
    padding: 7px 12px;
    cursor: pointer;
    backdrop-filter: blur(5px);
    min-height: 34px;
  }
  .nb-chip.active {
    color: #04121a;
    background: #4ecdc4;
    border-color: #4ecdc4;
    font-weight: 700;
  }
  .nb-chip:hover:not(.active) {
    border-color: rgba(78, 205, 196, 0.5);
  }
  /* Mobile: the bottom band is shared with the scale-HUD (bottom-right), so keep
     the toggles compact + capped to the left column — they wrap into a tidy block
     clear of the HUD instead of sliding underneath it. */
  @media (max-width: 600px) {
    .nb-controls {
      max-width: 50vw;
    }
    .nb-chip {
      font-size: 10px;
      letter-spacing: 0.5px;
      padding: 6px 9px;
      min-height: 30px;
    }
  }

  /* Slice 5 — Milky Way honesty badge (bottom-centre pill). */
  .mw-badge {
    position: absolute;
    bottom: 26px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 6;
    padding: 6px 14px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #cdd4e6;
    background: rgba(10, 14, 26, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 20px;
    backdrop-filter: blur(5px);
    pointer-events: none;
  }

  /* Slice 6 — physics-lens overlays (curvature note + time-dilation readout). */
  .lens-note {
    position: absolute;
    bottom: 70px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 6;
    max-width: 380px;
    padding: 7px 14px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    line-height: 1.4;
    text-align: center;
    color: #cdd4e6;
    background: rgba(10, 14, 26, 0.6);
    border: 1px solid rgba(78, 205, 196, 0.3);
    border-radius: 8px;
    backdrop-filter: blur(5px);
    pointer-events: none;
  }
  .time-lens {
    position: absolute;
    top: 84px;
    left: 12px;
    z-index: 6;
    width: 240px;
    padding: 12px 14px;
    font-family: 'Space Mono', monospace;
    background: rgba(8, 11, 20, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    backdrop-filter: blur(8px);
    pointer-events: none;
  }
  .time-lens .tl-title {
    font-size: 12px;
    font-weight: 700;
    color: #e9eefc;
    margin-bottom: 8px;
  }
  .time-lens .tl-row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 11px;
    color: #9aa4bf;
    margin-bottom: 4px;
  }
  .time-lens .tl-row b {
    color: #4ecdc4;
  }
  .time-lens .tl-foot {
    margin-top: 8px;
    font-size: 10px;
    line-height: 1.4;
    color: #7a8299;
  }

  /* v2 breadcrumb — top-left orientation + tap-back to the solar system. */
  .context-crumbs {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 6;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: rgba(6, 10, 22, 0.6);
    border: 1px solid rgba(78, 205, 196, 0.3);
    border-radius: 6px;
    backdrop-filter: blur(5px);
    font-family: 'Space Mono', monospace;
    font-size: 12px;
  }
  .crumb.home {
    background: none;
    border: none;
    color: #4ecdc4;
    cursor: pointer;
    font: inherit;
    padding: 4px 2px;
    min-height: 32px;
  }
  .crumb.home:hover,
  .crumb.home:focus-visible {
    color: #7ddfd8;
    outline: none;
  }
  .crumb-sep {
    color: rgba(255, 255, 255, 0.3);
  }
  .crumb.current {
    color: #fff;
  }

  /* Compact the scale HUD on phones so it doesn't crowd the bottom edge. */
  @media (max-width: 767px) {
    .scale-hud {
      bottom: 12px;
      padding: 7px 9px;
      max-width: 190px;
    }
    .scale-readout .primary {
      font-size: 13px;
    }
    .context-crumbs {
      font-size: 11px;
    }
    .crumb.home {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
    }
  }

  /* v2 anonymous-star tag — top-centre, dismissible. */
  .anon-star {
    position: absolute;
    top: 64px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 6;
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: min(92vw, 420px);
    padding: 8px 10px 8px 12px;
    background: rgba(6, 10, 22, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    backdrop-filter: blur(5px);
    font-family: 'Space Mono', monospace;
    color: #dde4ff;
  }
  .anon-title {
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.55);
    flex: 0 0 auto;
  }
  .anon-facts {
    font-size: 12px;
    color: #eaf6ff;
    min-width: 0;
  }
  .anon-close {
    flex: 0 0 auto;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    padding: 2px 4px;
    min-height: 28px;
  }
  .anon-close:hover {
    color: #fff;
  }

  /* Warp flash overlay — a soft radial bloom that masks the boundary cut. */
  .cross-flash {
    position: absolute;
    inset: 0;
    z-index: 7;
    pointer-events: none;
    background: radial-gradient(
      circle at 50% 50%,
      rgba(220, 235, 255, 0.55),
      rgba(120, 180, 255, 0.12) 45%,
      transparent 70%
    );
    animation: crossFlash 720ms ease-out forwards;
  }
  @keyframes crossFlash {
    0% {
      opacity: 0;
    }
    22% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
  /* v2 Slice 4 — full-frame deep-sky immersion. Sits above the canvas (z 6),
     below the warp flash (7) + HUD + panel. Fades in as the approach completes. */
  .deep-sky-immersion {
    position: absolute;
    inset: 0;
    z-index: 6;
    pointer-events: none;
    opacity: 0;
    transition: opacity 900ms ease-out;
    background: #05070f;
  }
  .deep-sky-immersion.visible {
    opacity: 1;
  }
  .deep-sky-immersion img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .ds-vignette {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(
      ellipse at 50% 45%,
      transparent 42%,
      rgba(3, 4, 12, 0.55) 82%,
      rgba(3, 4, 12, 0.9) 100%
    );
  }
  @media (prefers-reduced-motion: reduce) {
    .deep-sky-immersion {
      transition: none;
    }
  }
  .warp-caption {
    position: absolute;
    top: 38%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 8;
    pointer-events: none;
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(230, 240, 255, 0.92);
    text-shadow: 0 0 12px rgba(120, 180, 255, 0.7);
    white-space: nowrap;
    animation: warpCaption 1800ms ease-out forwards;
  }
  @keyframes warpCaption {
    0% {
      opacity: 0;
      transform: translate(-50%, calc(-50% + 8px));
    }
    18% {
      opacity: 1;
      transform: translate(-50%, -50%);
    }
    80% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
  :global(.explore canvas) {
    display: block;
  }
  /* PRD-023 Slice E.2 — Earth comparison ghost. Bottom-right corner.
     #342 Phase 30 — mobile-first: phone values are the defaults below;
     desktop values get layered back at @min-width: 601. */
  .earth-compare {
    position: fixed;
    bottom: 8px;
    left: 8px;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 8px 4px 4px;
    background: rgba(8, 10, 22, 0.6);
    border: 1px solid rgba(75, 156, 211, 0.25);
    border-radius: 6px;
    backdrop-filter: blur(4px);
    pointer-events: auto;
    cursor: pointer;
    color: inherit;
    text-align: left;
    transition:
      border-color 120ms,
      background 120ms;
    /* Width-aligned to the orbit ruler that sits directly above
       (#357 — 2026-06-22 user direction "expand that reference panel
       to match width of this one"). 188 px is the ruler's default
       desktop width; box-sizing ensures padding stays inside. */
    box-sizing: border-box;
    min-width: 188px;
  }
  .earth-compare:hover,
  .earth-compare:focus-visible {
    border-color: rgba(75, 156, 211, 0.7);
    background: rgba(12, 16, 32, 0.78);
    outline: none;
  }
  .earth-compare img {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: block;
  }
  .earth-compare-label {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 1.4px;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1.4;
  }
  .earth-compare-label .ratio {
    color: rgba(255, 255, 255, 0.9);
    font-size: 10px;
    letter-spacing: 1.2px;
  }
  /* Tactical Scan overlay styles now live in TacticalScan.svelte
     (shared with the surface routes, #382). */
  /* HUD controls cluster — top-left, opposite the detail panel.
     Two rows (mode toggles + visibility chips). Stays under the nav
     but always above the canvas. Pinned to the left so it never
     collides with the right-drawer detail panel on desktop.
     Phone (≤767 px): hidden — MobileDrawerGroup replaces it.
     @min-width: 501 + @min-width: 769 layer desktop spacing + chip
     stretch column back. */
  .hud-controls {
    position: fixed;
    /* Mobile: tucked at left:8 / top:nav+8 / gap:6 to fit a 375 px
       viewport. Relaxed at @min-width: 501. */
    top: calc(var(--nav-height) + 8px);
    left: 8px;
    /* Above .time-controls (z-index 40) so the iconic-mission legend that
       hangs off this cluster sits over the time scrubber, not under it.
       Stays below the sizes modal / backdrop (60/61). */
    z-index: 45;
    display: none;
    flex-direction: column;
    /* Mobile: flex-start so each row takes its natural width (the chip
       row wraps; the toggle row hugs left). align-items: stretch is
       restored at @min-width: 769 so the chip column inherits the
       top-row's computed width — 2026-06-06 user direction: "resize
       those 4 filter chips to fit new width of remaining 2 buttons
       on top". */
    align-items: flex-start;
    gap: 6px;
    pointer-events: none; /* children re-enable */
  }
  .ctrl-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    pointer-events: auto;
  }
  .ctrl-row.chips {
    /* Mobile: chip row wraps horizontally so 4 chips fit on a 375 px
       viewport without scroll. At @min-width: 769 the rail returns to
       a vertical column matching the toggle row's stretch width. */
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    max-width: calc(100vw - 24px);
  }
  .toggle {
    min-width: 44px;
    min-height: 44px;
    /* Mobile: 12 px font, 0/10 padding. Desktop bumps to 13 / 0 14. */
    padding: 0 10px;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid rgba(68, 102, 255, 0.4);
    color: #dde4ff;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.06em;
    border-radius: 4px;
    cursor: pointer;
    backdrop-filter: blur(6px);
    transition:
      border-color 120ms,
      background 120ms;
  }
  .toggle:hover,
  .toggle:focus-visible {
    border-color: #4466ff;
    background: rgba(20, 26, 50, 0.95);
    outline: none;
  }

  /* Layer chips — always-visible visibility toggles. Inactive chips
     are dim outlines; active chips are filled with the teal accent
     so the on-state is obvious. 44 px tall preserves the ADR-018
     touch-target floor.
     #342 Phase 30 — mobile-first: phone values default; desktop
     bumps padding/font/letter-spacing at @min-width: 501 and
     width:100% + chip-stretch column at @min-width: 769. */
  .chip {
    min-height: 44px;
    /* Mobile: chips flow side-by-side, natural width. width: 100%
       (chip-stretch column) reinstated at @min-width: 769. */
    width: auto;
    min-width: 110px;
    padding: 0 8px;
    background: rgba(8, 10, 22, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: rgba(255, 255, 255, 0.55);
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1.2px;
    text-align: center;
    border-radius: 999px;
    cursor: pointer;
    backdrop-filter: blur(6px);
    transition:
      border-color 120ms,
      background 120ms,
      color 120ms;
  }
  .chip:hover,
  .chip:focus-visible {
    color: #fff;
    border-color: rgba(78, 205, 196, 0.6);
    outline: none;
  }
  .chip.active {
    background: rgba(78, 205, 196, 0.18);
    border-color: rgba(78, 205, 196, 0.7);
    color: #4ecdc4;
  }
  .chip.active:hover,
  .chip.active:focus-visible {
    color: #fff;
    background: rgba(78, 205, 196, 0.32);
    border-color: #4ecdc4;
  }

  /* Time playback mini-panel (#351 Layer 1) — pinned bottom-left, styled
     to match the PLANET SCALES button (.earth-compare): same translucent
     navy card, blue hairline border, blur, and matching height. Holds a
     play toggle + a segmented 1×/10×/100× day-per-second speed control.
     Mobile-first: STACKED directly above the scales card (no room to sit
     beside it on a 375 px viewport). At @min-width: 601 it moves to sit
     side-by-side, right of the (larger) scales card. */
  .time-controls {
    position: fixed;
    /* Stacked above .earth-compare (bottom:8 + its ~36px height + gap). */
    bottom: 50px;
    left: 8px;
    /* Above the global .site-footer (z-index 35): on narrow mobile the
       footer's wide link strip (Gallery|Credits|…|ABOUT) overlaps this
       bottom-left control and intercepts taps on the reset / play
       buttons. The interactive control must out-stack the footer. */
    z-index: 40;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 6px;
    background: rgba(8, 10, 22, 0.6);
    border: 1px solid rgba(75, 156, 211, 0.25);
    border-radius: 6px;
    backdrop-filter: blur(4px);
    pointer-events: auto;
  }
  /* Touch: the two things this 50px clears — the footer and .earth-compare —
     are both hidden on touch, so the scale strip drops to the bottom edge and
     the drawer (--mcd-bottom) sits just above it, closing the gap the removed
     footer used to fill. Desktop keeps the 50px stack. */
  :global(html[data-touch]) .time-controls {
    bottom: max(8px, env(safe-area-inset-bottom, 0px));
  }
  /* Play toggle — overrides .toggle's 44px floor to match the panel's
     footprint (consistent with .earth-compare, which also runs a sub-44
     affordance in this bottom-left zone). */
  .time-controls .play-btn {
    min-width: 32px;
    min-height: 32px;
    width: 32px;
    height: 32px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    line-height: 1;
    border-radius: 5px;
    background: rgba(15, 18, 35, 0.55);
    border: 1px solid rgba(75, 156, 211, 0.3);
    color: #cfe0ff;
  }
  .time-controls .play-btn:hover,
  .time-controls .play-btn:focus-visible {
    border-color: #4ecdc4;
    background: rgba(20, 26, 50, 0.85);
    color: #fff;
  }
  .time-controls .play-btn[aria-pressed='true'] {
    color: #4ecdc4;
    border-color: rgba(78, 205, 196, 0.5);
  }
  /* Segmented speed control — one rounded track, hairline dividers, the
     active step glows teal. */
  .speed-group {
    display: flex;
    align-items: stretch;
    pointer-events: auto;
    border: 1px solid rgba(75, 156, 211, 0.3);
    border-radius: 5px;
    overflow: hidden;
  }
  .speed-pill {
    min-width: 32px;
    min-height: 32px;
    padding: 0 10px;
    border: none;
    border-right: 1px solid rgba(75, 156, 211, 0.18);
    background: rgba(15, 18, 35, 0.4);
    color: rgba(207, 224, 255, 0.55);
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition:
      background 120ms,
      color 120ms;
  }
  .speed-pill:last-child {
    border-right: none;
  }
  .speed-pill:hover,
  .speed-pill:focus-visible {
    color: #fff;
    background: rgba(20, 26, 50, 0.7);
    outline: none;
  }
  .speed-pill.active {
    background: rgba(78, 205, 196, 0.22);
    color: #4ecdc4;
    box-shadow: inset 0 0 8px rgba(78, 205, 196, 0.18);
  }
  /* Date readout (#351 Layer 2-B) — non-interactive chip showing the
     running simulated date, in the panel's mono/teal language. */
  .time-date {
    display: inline-flex;
    align-items: center;
    /* Right-align the date in a fixed-width box so the chip (and the
       reset button beside it) never shift as the date ticks (#351
       Layer 2-B). Sized for the widest double-digit string. */
    justify-content: flex-end;
    text-align: right;
    min-width: 108px;
    min-height: 32px;
    padding: 0 9px;
    border: 1px solid rgba(75, 156, 211, 0.25);
    border-radius: 5px;
    background: rgba(15, 18, 35, 0.35);
    color: rgba(207, 224, 255, 0.82);
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }
  /* Reset-to-today — same icon-button footprint as play/pause (inherits
     .time-controls .play-btn), teal tint, slightly larger glyph so the ⟲
     reads clearly. Defined after .play-btn so it wins the font-size. */
  .time-controls .reset-btn {
    font-size: 20px;
    color: #4ecdc4;
  }

  /* Compact trajectory on/off inside the Iconic Missions drawer (mobile). */
  .iconic-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
    padding: 4px 10px;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.08em;
    color: rgba(207, 224, 255, 0.6);
    background: rgba(15, 18, 35, 0.55);
    border: 1px solid rgba(75, 156, 211, 0.3);
    border-radius: 12px;
    cursor: pointer;
  }
  .iconic-toggle.active {
    color: #4ecdc4;
    border-color: rgba(78, 205, 196, 0.5);
  }
  .iconic-toggle-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(207, 224, 255, 0.25);
    flex-shrink: 0;
  }
  .iconic-toggle-dot.on {
    background: #4ecdc4;
    box-shadow: 0 0 6px rgba(78, 205, 196, 0.7);
  }
  .paths-legend {
    pointer-events: auto;
    /* Hidden by default on phones; shown at @min-width: 769 (desktop
       always-on) and inside the MobileDrawerGroup via :global below. */
    display: none;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid rgba(68, 102, 255, 0.4);
    border-radius: 4px;
    /* Cap height so the 18-row roster doesn't spill off the bottom on
       short viewports (laptop 13" landscape ≈ 720 px; chips row above
       eats ~140 px). Scroll inside the panel when it exceeds the
       available chrome-budget instead of clipping invisibly past the
       footer. The viewport units leave room for nav + the chips
       cluster + a 24 px breathing tail at the bottom. */
    max-height: calc(100vh - var(--nav-height, 60px) - 180px);
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  /* Inside the mobile drawer the legend flows naturally; no fixed
     positioning needed — the drawer handles its own scroll. */
  :global(.mdg-body) .paths-legend {
    display: flex;
  }
  .paths-legend::-webkit-scrollbar {
    width: 6px;
  }
  .paths-legend::-webkit-scrollbar-thumb {
    background: rgba(68, 102, 255, 0.5);
    border-radius: 3px;
  }
  /* Single-line row — name + logos + year. Slightly more compact
     than the pre-tagline original (44 px → 36 px min-height) per
     2026-06-17 user feedback; the "why it's iconic" copy lives in
     the .paths-legend-tagline strip above so individual rows stay
     stable-width regardless of tagline length. */
  .paths-legend-row {
    display: flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    color: #dde4ff;
    padding: 5px 6px;
    border-radius: 3px;
    cursor: pointer;
    text-align: left;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.04em;
    min-height: 36px;
    width: 100%;
  }
  /* Hovered-mission tagline strip. Always rendered (with a placeholder
     when no row is hovered) so the legend's vertical footprint is
     stable; only the strip's text changes. Italic + dim by default,
     full-opacity when a row is hovered. Sized generously (2026-06-17
     user note: "text is so small for description I cannot read, be
     generous and use few rows if needed there somehow") — 13.5 px
     italic Crimson Pro with 1.45 line-height, min-height reserves
     ~3 lines so short and long taglines both render without a
     vertical layout shift. */
  .paths-legend-tagline {
    margin: 4px 0 8px;
    padding: 8px 8px 10px;
    font-family: 'Crimson Pro', 'Space Mono', serif;
    font-style: italic;
    font-size: 13.5px;
    line-height: 1.45;
    color: rgba(221, 228, 255, 0.78);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    min-height: 76px;
    background: rgba(8, 10, 22, 0.4);
    border-radius: 3px;
  }
  .paths-legend-row:hover,
  .paths-legend-row:focus-visible,
  /* is-hovered mirrors :hover but is driven by iconic.state.hoveredId, so
     hovering a trajectory in the 3D scene highlights its legend row too
     (reverse of row-hover → arc highlight). #306 follow-up. */
  .paths-legend-row.is-hovered {
    background: rgba(68, 102, 255, 0.15);
    color: #fff;
    outline: none;
  }
  .paths-legend-row.is-selected {
    background: rgba(68, 102, 255, 0.28);
    color: #fff;
    box-shadow: inset 2px 0 0 rgba(140, 170, 255, 0.95);
  }
  .paths-legend-row.is-selected .logos img {
    opacity: 1;
    filter: none;
  }
  .paths-legend-row.is-selected .year {
    color: rgba(255, 255, 255, 0.95);
  }
  .paths-legend-why {
    display: block;
    padding: 4px 6px 6px;
    margin-bottom: 4px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(221, 228, 255, 0.65);
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.02em;
    text-decoration: none;
  }
  .paths-legend-why:hover,
  .paths-legend-why:focus-visible {
    color: #fff;
    background: rgba(68, 102, 255, 0.12);
    outline: none;
  }
  .paths-legend-row .swatch {
    display: inline-block;
    width: 18px;
    height: 3px;
    border-radius: 2px;
    flex-shrink: 0;
  }
  .paths-legend-row .name {
    flex: 1;
  }
  .paths-legend-row .logos {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    margin-left: 6px;
  }
  .paths-legend-row .logos img {
    height: 14px;
    width: auto;
    max-width: 24px;
    opacity: 0.7;
    filter: grayscale(0.4);
    object-fit: contain;
  }
  .paths-legend-row:hover .logos img,
  .paths-legend-row:focus-visible .logos img,
  .paths-legend-row.is-hovered .logos img {
    opacity: 1;
    filter: none;
  }
  .paths-legend-row .year {
    color: rgba(221, 228, 255, 0.55);
    font-size: 11px;
    letter-spacing: 0.02em;
    margin-left: 8px;
  }
  .paths-legend-row:hover .year,
  .paths-legend-row:focus-visible .year,
  .paths-legend-row.is-hovered .year {
    color: rgba(255, 255, 255, 0.85);
  }

  /* ─── ≥ 501 px — relax phone-tight cluster spacing ─────────────── */
  @media (min-width: 501px) {
    .hud-controls {
      left: 16px;
      top: calc(var(--nav-height) + 12px);
      gap: 8px;
    }
    .toggle {
      padding: 0 14px;
      font-size: 13px;
    }
    .chip {
      padding: 0 10px;
      font-size: 10px;
      letter-spacing: 1.5px;
    }
  }

  /* ─── ≥ 601 px — overlays + earth-compare desktop sizing ───────── */
  @media (min-width: 601px) {
    .earth-compare {
      bottom: 16px;
      left: 16px;
      padding: 6px 10px 6px 6px;
    }
    .earth-compare img {
      width: 32px;
      height: 32px;
    }
    /* Desktop: unstack — sit side-by-side, right of the reference card
       (left:16 + width:188 → right edge 204). Add a 5px gap (matching the
       scrubber's internal button `gap`) so the two boxes don't kiss edges
       (2026-06-28 user direction "put some minimal spacing in between, like
       spacing between buttons inside time scrubber"). */
    .time-controls {
      bottom: 16px;
      left: 209px;
    }
  }

  /* ─── ≥ 769 px — chip-stretch column + always-on paths legend ──── */
  @media (hover: hover) and (pointer: fine) {
    .paths-legend {
      display: flex;
      /* position: absolute, anchored to the fixed-positioned
         .hud-controls parent. Removed from the flex-column flow so
         its intrinsic content width can no longer drive the chip
         column wider via the parent's align-items: stretch.
         top:100% places it just below the in-flow children (toggle
         row + chip column). (2026-06-17 iteration 2: align-self
         + width was insufficient — the legend still expanded the
         flex container's natural width because flex items
         participate in max-content sizing. Absolute positioning
         fully decouples.) */
      position: absolute;
      top: 100%;
      left: 0;
      right: auto;
      bottom: auto;
      margin-top: 8px;
      width: 280px;
      box-sizing: border-box;
      max-height: calc(100vh - var(--nav-height, 60px) - 220px);
      z-index: 36;
    }
    .ctrl-row.chips {
      /* Layer chips stack vertically so their on/off state reads as a
         compact left-edge column rather than a wide horizontal strip.
         Individual chips set width: 100% so they stretch to match the
         top toggle row via .hud-controls align-items: stretch. */
      flex-direction: column;
      flex-wrap: nowrap;
      align-items: stretch;
      max-width: none;
    }
    .hud-controls {
      display: flex;
      align-items: stretch;
    }
    .chip {
      width: 100%;
    }
  }

  .sizes-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(2, 4, 12, 0.78);
    backdrop-filter: blur(4px);
    z-index: 60;
    border: 0;
    cursor: pointer;
    /* Reset button defaults so it behaves as a click target only. */
    padding: 0;
    margin: 0;
  }
  .sizes-card {
    position: fixed;
    z-index: 61;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(8, 10, 22, 0.96);
    border: 1px solid rgba(68, 102, 255, 0.4);
    border-radius: 8px;
    padding: 18px 18px 14px;
    width: min(640px, calc(100vw - 48px));
    max-height: calc(100vh - 48px);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55);
  }
  .sizes-close {
    position: absolute;
    top: 8px;
    right: 10px;
    background: transparent;
    border: 0;
    color: rgba(255, 255, 255, 0.6);
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
    width: 32px;
    height: 32px;
    border-radius: 4px;
  }
  .sizes-close:hover,
  .sizes-close:focus-visible {
    color: #fff;
    background: rgba(255, 255, 255, 0.06);
    outline: none;
  }
  .sizes-canvas-wrap {
    width: 100%;
    /* The diorama renders Jupiter at maxVR ≈ 70 px tall; total
       content fills ~320 px (header + bodies + 2 label rows + source).
       A rectangular 16:9-ish frame avoids the bottom-half emptiness
       that came with the previous 540 px container. */
    aspect-ratio: 16 / 7;
    max-height: calc(100vh - 110px);
  }
  .sizes-canvas-wrap :global(canvas) {
    width: 100%;
    height: 100%;
  }

  .tooltip {
    position: absolute;
    z-index: 24;
    min-width: 170px;
    pointer-events: none;
    background: rgba(8, 10, 22, 0.92);
    border: 1px solid rgba(68, 102, 255, 0.5);
    border-radius: 4px;
    padding: 8px 12px;
    font-family: 'Space Mono', monospace;
    backdrop-filter: blur(6px);
  }
  /* Lens-on expanded card: gold border (matches the lens family) +
     pointer-events enabled so users can click the science chips
     into /science. */
  .tooltip.expanded {
    pointer-events: auto;
    min-width: 220px;
    border-color: rgba(255, 200, 80, 0.6);
    padding: 10px 12px 8px;
  }
  .tt-line {
    font-size: 9px;
    line-height: 1.5;
    color: rgba(230, 235, 255, 0.85);
  }
  .tt-line.dim {
    color: rgba(255, 255, 255, 0.5);
    font-size: 8px;
  }
  .tt-eyebrow {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 13px;
    letter-spacing: 2px;
    color: rgba(255, 200, 80, 0.92);
    margin-bottom: 6px;
    border-bottom: 1px solid rgba(255, 200, 80, 0.18);
    padding-bottom: 4px;
  }
  .tt-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
    font-size: 9px;
    line-height: 1.55;
  }
  .tt-row + .tt-row {
    border-top: 1px solid rgba(255, 255, 255, 0.04);
    padding-top: 2px;
  }
  .tt-key {
    color: rgba(255, 255, 255, 0.55);
    letter-spacing: 1px;
    font-size: 8px;
    display: inline-flex;
    align-items: baseline;
  }
  .tt-val {
    color: rgba(255, 255, 255, 0.92);
  }

  /* Hidden tour-anchor buttons (PRD-016 §S11 / RFC-019 §12). Visually
     offscreen but click()-able so the audio executor can drive planet
     selection without a DOM hit on the 3D canvas. */
  /* Desktop object-index edge-handle "little side tab" — mirrors the surface
     index handle. Hidden on touch (mobile uses the Index drawer tab); a fine
     pointer gets the left-edge vertical handle that toggles the side panel. */
  .body-index-handle {
    display: none;
  }
  @media (hover: hover) and (pointer: fine) {
    .body-index-handle {
      display: flex;
      align-items: center;
      justify-content: center;
      position: fixed;
      left: 0;
      /* Vertically centred on the left edge — away from the top-left control
         chips, matching the /iss + /tiangong module handles (.handle-left). */
      top: 50%;
      z-index: 44;
      writing-mode: vertical-rl;
      transform: translateY(-50%) rotate(180deg);
      padding: 12px 6px;
      background: rgba(8, 10, 22, 0.85);
      border: 1px solid var(--border-subtle, #23232e);
      border-left: none;
      border-radius: 0 6px 6px 0;
      color: rgba(255, 255, 255, 0.8);
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      cursor: pointer;
      backdrop-filter: blur(6px);
    }
    .body-index-handle:hover,
    .body-index-handle[aria-pressed='true'] {
      color: #4ecdc4;
      border-color: rgba(78, 205, 196, 0.5);
    }
  }

  .tour-anchors {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
    pointer-events: none;
  }
  .tour-anchors button {
    pointer-events: auto;
  }
  /* FB5 — controls drawer: chips wrap two-per-row inside the full-width
     accordion panel. flex-grow lets a lone chip (the Iconic-Missions PATHS
     toggle, which lives in its own drawer) stretch to full width, while the
     four Controls chips settle into a tidy 2x2 grid. Scoped to .mdg-body. */
  @media (hover: none), (pointer: coarse) {
    :global(.mdg-body) .ctrl-row.chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    :global(.mdg-body) .ctrl-row.chips .chip {
      flex: 1 1 calc(50% - 3px);
      text-align: center;
    }
  }

  /* Desktop ruler wrapper — hidden on mobile (drawer replaces it). */
  .ruler-desktop-only {
    display: contents;
  }
  @media (hover: none), (pointer: coarse) {
    .ruler-desktop-only {
      display: none;
    }
    /* OrbitRuler inside the left drawer: static flow, full width.
       Overrides OrbitRuler's own position:absolute which is only
       meaningful when rendered standalone on desktop. */
    :global(.mdg-body .ruler) {
      position: static;
      width: 100%;
      max-height: 32vh;
      left: auto;
      bottom: auto;
      box-sizing: border-box;
      /* FB4 — flush inside the drawer: no box-in-a-box card chrome. */
      background: none;
      border: none;
      border-radius: 0;
      box-shadow: none;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      padding: 0;
    }
    /* FB4 — the drawer tab already reads ORBIT RULER; drop the inner title. */
    :global(.mdg-body .ruler-title) {
      display: none;
    }
  }

  /* FB2 — mobile-only top cluster: 2D/3D toggle + Reset View, mirroring the
     desktop .hud-controls top-left corner (.hud-controls itself is desktop-only). */
  .hud-top-mobile {
    display: none;
  }
  @media (hover: none), (pointer: coarse) {
    .hud-top-mobile {
      display: flex;
      position: fixed;
      top: calc(var(--nav-height) + 8px);
      left: 8px;
      gap: 6px;
      z-index: 45;
    }
  }

  /* Compact REFERENCES button inside .time-controls — mobile only. */
  .earth-compact {
    display: none;
    height: 32px;
    padding: 2px 9px 2px 2px;
    background: rgba(15, 18, 35, 0.55);
    border: 1px solid rgba(75, 156, 211, 0.3);
    border-radius: 16px;
    cursor: pointer;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
    color: inherit;
  }
  .earth-compact-label {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.5px;
    line-height: 1;
    color: rgba(255, 255, 255, 0.82);
    white-space: nowrap;
  }
  .earth-compact img {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: block;
  }
  .earth-compact:hover,
  .earth-compact:focus-visible {
    border-color: rgba(75, 156, 211, 0.7);
    outline: none;
  }
  @media (hover: none), (pointer: coarse) {
    .earth-compact {
      display: flex;
    }
    /* Hide standalone .earth-compare on mobile — affordance lives inside
       .time-controls as .earth-compact. */
    .earth-compare {
      display: none;
    }
  }

  /* Mobile speed slot — single pill showing current speed, reveals a
     stacked popover above on tap. */
  .speed-slot {
    display: none;
    position: relative;
  }
  .speed-popover {
    position: absolute;
    bottom: calc(100% + 4px);
    left: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: rgba(8, 10, 22, 0.95);
    border: 1px solid rgba(75, 156, 211, 0.35);
    border-radius: 5px;
    padding: 3px;
    min-width: 48px;
    z-index: 50;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  }
  .speed-popover .speed-pill {
    border-right: none;
    border-radius: 3px;
  }
  @media (hover: none), (pointer: coarse) {
    .speed-slot {
      display: block;
    }
    .speed-desktop-pill {
      display: none;
    }
    /* Let the tap-to-reveal popover escape the desktop pill-group's
       overflow:hidden clip (that clip only exists for the segmented look). */
    .speed-group {
      overflow: visible;
    }
  }
</style>
