<script lang="ts">
  import { dataLoadFailed } from '$lib/data/core';
  import { onMount, onDestroy, untrack } from 'svelte';
  import { exploreContext } from '$lib/explore-context';
  import { page } from '$app/state';
  import { afterNavigate, goto } from '$app/navigation';
  import { safeReplaceState } from '$lib/safe-replace-state';
  import { setCurrentCard, trackCardNavigation } from '$lib/card-chain.svelte';
  import { base } from '$app/paths';
  import * as THREE from 'three';
  import { createLayeredStarField } from '$lib/three/star-field';
  import { PLANETS } from '$lib/explore-scene';
  import {
    trackItemClick,
    trackViewToggle,
    trackLayerToggle,
    trackExploreDepth,
  } from '$lib/analytics';
  import { createSceneRenderer, WebGLUnavailableError } from '$lib/three/scene-renderer';
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
  import RenderingDebugRegistrar from '$lib/components/RenderingDebugRegistrar.svelte';
  import QualitySettingsModal from '$lib/components/QualitySettingsModal.svelte';
  import type { QualitySource } from '$lib/components/debug-panel-context';
  import { attachFrameMonitor, type FrameMonitorHandle } from '$lib/quality/frame-monitor';
  import { createRouteLifecycle } from '$lib/three/route-lifecycle';
  // /explore v2 "The Known Universe" (PRD-030 / RFC-032). The neighborhood scene
  // is dynamically imported at the boundary so v1's bundle + first paint stay
  // untouched (RFC C-F).
  import { resolveSolarBodyTarget, type ShellId } from '$lib/explore/scale-shell-controller';
  import { createExploreSolarScene } from '$lib/three/explore-solar-scene';
  import {
    createExploreSceneHost,
    type ExploreContextId,
    type ExploreHoverData,
  } from '$lib/three/explore-scene-host';
  import type { ScaleReadout } from '$lib/universe/scale-readout';
  import { type IconicTrajectoryHandle } from '$lib/three/iconic-trajectory';
  import {
    getPlanets,
    getSun,
    getMissionIndex,
    getMission,
    getBlackHoles,
    type MilkyWayObject,
    type LocalGroupMember,
    type LocalSheetMember,
    type VirgoMember,
    type LaniakeaMember,
    type CosmicWebMember,
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
  import StarPanel from '$lib/components/StarPanel.svelte';
  import ExoplanetPanel from '$lib/components/ExoplanetPanel.svelte';
  import MassPeriodChart from '$lib/components/MassPeriodChart.svelte';
  import DeepSkyPanel from '$lib/components/DeepSkyPanel.svelte';
  import HrDiagram from '$lib/components/HrDiagram.svelte';
  import CausalityMap from '$lib/components/CausalityMap.svelte';
  import MilkyWayPanel from '$lib/components/MilkyWayPanel.svelte';
  import LocalGroupPanel from '$lib/components/LocalGroupPanel.svelte';
  import LocalSheetPanel from '$lib/components/LocalSheetPanel.svelte';
  import VirgoPanel from '$lib/components/VirgoPanel.svelte';
  import LaniakeaPanel from '$lib/components/LaniakeaPanel.svelte';
  import CosmicWebPanel from '$lib/components/CosmicWebPanel.svelte';
  import BlackHolePanel from '$lib/components/BlackHolePanel.svelte';
  import CultureDoorCard from '$lib/components/CultureDoorCard.svelte';
  import StarIndex from '$lib/components/StarIndex.svelte';
  import type { AnonymousStar } from '$lib/universe/anonymous-star';
  import { localeFromPage, localHref } from '$lib/locale';
  import { createIconicSelectionService } from './iconic-selection.svelte';
  import { auToPx } from '$lib/scale';
  import { cue } from '$lib/sensory/feedback';
  import { sensory } from '$lib/sensory/state.svelte';
  import { keplerChord } from '$lib/sensory/sonify/kepler-chord';
  import EnterArButton from '$lib/components/EnterArButton.svelte';
  import EnterSkyButton from '$lib/components/EnterSkyButton.svelte';
  import { launchArScene, launchSkyScene } from '$lib/ar/launch-ar';
  import { earthPos, outboundArc, type Vec2 } from '$lib/physics/transfer/mission-arc';
  import { PLANET_STATS, auLightTime } from '$lib/physics/util/planet-stats';
  import TacticalScan from '$lib/components/TacticalScan.svelte';
  import { missionDestToHeliocentricDestinationId } from '$lib/mission-dest';
  import { dateToSimDay } from '$lib/sim-day';
  import { DESTINATIONS, type DestinationId } from '$lib/physics/transfer/lambert-grid.constants';
  import {
    SMALL_BODIES,
    smallBodyById,
    sampleOrbitPoints,
    smallBodyPosition,
  } from '$lib/explore/small-bodies';
  import { onReducedMotionChange } from '$lib/reduced-motion';
  import type { LocalizedPlanet } from '$types/planet';
  import type { LocalizedSun } from '$types/sun';
  import type { Mission } from '$types/mission';
  import PlanetPanel from '$lib/components/PlanetPanel.svelte';
  import SunPanel from '$lib/components/SunPanel.svelte';
  import ExploreBodyIndex from '$lib/components/ExploreBodyIndex.svelte';
  import MessagePanel from '$lib/components/MessagePanel.svelte';
  import { getInterstellarCraft, type InterstellarCraft } from '$lib/data/interstellar';
  import SizesOverlay from './SizesOverlay.svelte';
  import HoverTooltip from './HoverTooltip.svelte';
  import BlackHoleNotes from './BlackHoleNotes.svelte';
  import AnonStarTag from './AnonStarTag.svelte';
  import DeepSkyImmersion from './DeepSkyImmersion.svelte';
  import WarpOverlays from './WarpOverlays.svelte';
  import ScaleNav from './ScaleNav.svelte';
  import SunCompass from './SunCompass.svelte';
  import ScaleStrip from './ScaleStrip.svelte';
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
  import { onLayerChange, setLayer } from '$lib/science-layers';
  import { onScienceLensChange } from '$lib/science-lens';
  import * as m from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import MobileDrawerGroup from '$lib/components/MobileDrawerGroup.svelte';
  import { INTERSTELLAR_CRAFT, PATHS_LEGEND, iconicTagline } from '$lib/explore/paths-legend';
  import { computeLensPanel, scaleNavBackTarget, type ScaleNavExit } from '$lib/explore/lens-panel';
  import { watchExploreLayers } from '$lib/explore/layer-watchers';
  import { fmtScale, SATELLITE_STATS } from '$lib/explore/format';

  // Planet visual config (PlanetVisual / SatelliteDef / PLANETS) now lives in
  // $lib/explore-scene as the single source of truth, shared with the AR
  // renderer — imported at the top of this <script>.

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
  // 2026-09-11 — black holes in the index rail: before this the lensing
  // takeovers had no in-app entry beyond the Sgr A* pin (?bh= URLs only).
  let blackHoleIndex = $state<Array<{ id: string; name: string }>>([]);
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
    try {
      exploreRegimes = await getOrbitRegimesExplore(getLocale());
    } catch (err) {
      dataLoadFailed(err);
    }
  });
  $effect(() => {
    void exploreRegimes;
    if (exploreRegimes.length === 0) return;
    const id = page.url.searchParams.get('regime');
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

  // #410 — interstellar-craft MessagePanel. A Today-marker click on a
  // Voyager/Pioneer/New Horizons path opens this (the message it carries)
  // instead of the MissionPanel; the panel's "Full mission details" hands
  // off to iconic.openMission. Seq-guarded so the latest click wins.
  let activeCraft = $state<InterstellarCraft | null>(null);
  let craftPanelOpen = $state(false);
  let craftOpenSeq = 0;
  async function openMessageCraft(craftId: string, locale: string): Promise<void> {
    const seq = ++craftOpenSeq;
    const c = await getInterstellarCraft(craftId, locale);
    if (seq !== craftOpenSeq || !c) return;
    activeCraft = c;
    craftPanelOpen = true;
  }
  function openCraftMission(missionId: string): void {
    craftPanelOpen = false;
    void iconic.openMission(missionId, localeFromPage(page));
  }

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
  let hoverData: ExploreHoverData | null = $state(null);
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
    const id = page.url.searchParams.get('mission');
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
      const mission = await getMission(id, entry.dest, localeFromPage(page));
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
  let contextId = $state<ExploreContextId>('solar-system');
  // Publish the live scale context to the global store so the Nav highlights the
  // active scale-shell menu item (the URL ?context is cleared after the jump, so
  // it can't drive the highlight). Reset on leave.
  $effect(() => {
    exploreContext.set(contextId);
    // Scale-shell depth reached. This effect already runs exactly on a context
    // change (not per frame), and trackExploreDepth dedupes per level, so a
    // visitor who walks out to laniakea and back logs each shell once.
    trackExploreDepth(contextId);
  });
  onDestroy(() => exploreContext.set(null));

  let lensPanel = $derived.by(() =>
    computeLensPanel({
      blackHoleActive: !!activeBlackHole,
      contextId,
      activeBodyHostId,
      exoplanetHostIds,
    }),
  );
  // Slice 2: the exoplanet host whose BodyScene is active (breadcrumb crumb) + the
  // set of host ids that have a system to descend into (drives "Enter system").
  let bodyHostName = $state('');
  let exoplanetHostIds = $state<Set<string>>(new Set());
  // Host-id → full system, for the StarPanel "System" tab summary (planet count,
  // sizes, periods) without re-fetching. Populated alongside exoplanetHostIds.
  let exoplanetSystemsById = $state<Map<string, ExoplanetSystem>>(new Map());
  // Object ids carrying a culture door — drives the star-index ◈ badge + filter.
  let cultureObjectIds = $state<Set<string>>(new Set());
  // A distance caption shown during a Navigator warp into/out of a system.
  let warpCaption = $state('');
  let enterSystemFn: ((hostId: string, planetId?: string) => void) | null = null;
  // The exoplanet host id whose BodyScene is active (for the ?system= URL sync).
  let activeBodyHostId = $state<string | null>(null);
  // Bumped on each boundary crossing to replay the warp-flash overlay.
  let crossingFlashId = $state(0);
  // Constellation-line overlay toggle (neighborhood only).
  let showConstellations = $state(false);
  // Slice 3 — "culture layer": badged fiction / message story cards on objects
  // that have them. Doors are fetched on selection and always render inline at the
  // bottom of the detail panel when present (no separate toggle — they're sparse).
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
  // #410 — culture door(s) for the selected deep-sky object (M13 ← Arecibo).
  let deepSkyCultureDoors = $state<LocalizedCultureDoor[]>([]);
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
  // Sun "compass": the needle angle (deg) toward the Sun's on-screen position,
  // whether it's currently in frame, and camera→Sun distance (ly). Drives the
  // persistent "you are here / home" indicator in the neighborhood (item: never
  // get lost). Updated (throttled) from the render loop.
  let sunCompass = $state<{ ang: number; on: boolean; ly: number } | null>(null);
  // Reset-view lives in the breadcrumb row now; visible once the current scale's
  // view is "dirty" (a selection, or the Sun panned out of frame).
  let scaleResetVisible = $derived.by(() => {
    if (contextId === 'neighborhood') return !!(selectedStarId || (sunCompass && !sunCompass.on));
    if (contextId === 'milky-way') return !!selectedMwId;
    if (contextId === 'local-group') return !!selectedLgMember;
    return false;
  });
  function resetCurrentScale(): void {
    if (contextId === 'neighborhood') resetNeighborhoodFn?.();
    else if (contextId === 'milky-way') resetMilkyWayFn?.();
    else if (contextId === 'local-group') resetLocalGroupFn?.();
  }

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
  // Reset the neighborhood view (pan/zoom/selection) to a stable framed pose,
  // staying in the scale — the neighborhood's own "Reset view".
  let resetNeighborhoodFn: (() => void) | null = null;
  // Same, for the Milky Way + Local Group scales.
  let resetMilkyWayFn: (() => void) | null = null;
  let resetLocalGroupFn: (() => void) | null = null;
  // #451 (WS-2) — the Milky Way science lens overlays (rotation curve · dark-matter
  // halo · stellar populations). WS-3 (RFC-039 Contract D) promoted these to
  // standard science-layer keys, so they're driven by the ScienceLayersPanel via
  // onLayerChange rather than a bespoke chip row; this pointer reaches the scene.
  let setMwLensFn: ((key: string, on: boolean) => void) | null = null;
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
  // Nav shortcuts + `?context=` deep-link + the #258 scale picker: jump straight to
  // a scale-shell context (solar-system | neighborhood | milky-way | local-group),
  // climbing out or in. `$state` so the picker's `disabled` gate flips reactively
  // once onMount wires the host handle (it's null until the scene is ready).
  let contextDeepLinkFn = $state<((ctx: string) => Promise<void>) | null>(null);
  // Slice 8: the Local Group context — leave it back in to the Milky Way; the
  // selected member galaxy → LocalGroupPanel.
  let exitLocalGroupFn: (() => void) | null = null;
  let selectedLgMember = $state<LocalGroupMember | null>(null);
  let lgPanelOpen = $state(false);
  let closeLgFn: (() => void) | null = null;
  // #454 (WS-1) — the Local Sheet shell.
  let exitLocalSheetFn: (() => void) | null = null;
  let selectedLsMember = $state<LocalSheetMember | null>(null);
  let lsPanelOpen = $state(false);
  let lsMembers = $state<LocalSheetMember[]>([]);
  let closeLsFn: (() => void) | null = null;
  // #455 (WS-5b) — the Virgo Supercluster shell.
  let exitVirgoFn: (() => void) | null = null;
  let selectedVirgoMember = $state<VirgoMember | null>(null);
  let virgoPanelOpen = $state(false);
  let virgoMembers = $state<VirgoMember[]>([]);
  let closeVirgoFn: (() => void) | null = null;
  // #456 (WS-5c) — the Laniakea Supercluster shell.
  let exitLaniakeaFn: (() => void) | null = null;
  let selectedLaniakeaMember = $state<LaniakeaMember | null>(null);
  let laniakeaPanelOpen = $state(false);
  let laniakeaMembers = $state<LaniakeaMember[]>([]);
  let closeLaniakeaFn: (() => void) | null = null;
  // #457 (WS-5d) — the Cosmic Web shell (outermost).
  let exitCosmicWebFn: (() => void) | null = null;
  let selectedCosmicWebMember = $state<CosmicWebMember | null>(null);
  let cosmicWebPanelOpen = $state(false);
  let cosmicWebMembers = $state<CosmicWebMember[]>([]);
  let closeCosmicWebFn: (() => void) | null = null;
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
    activeBlackHole
      ? localHref(`/science/observation/${activeBlackHole.science_section}`)
      : localHref('/'),
  );
  let selectedMwObject = $derived(mwObjects.find((o) => o.id === selectedMwId) ?? null);
  let mwLearnHref = $derived(
    selectedMwObject
      ? localHref(`/science/observation/${selectedMwObject.science_section}`)
      : localHref('/'),
  );
  // Set in onMount; lets the star index / ?goto= resolver select a named star.
  let closeStarFn: (() => void) | null = null;
  // Slice 4 — select a deep-sky object (highlight; Part 4 adds warp + panel).
  // ?goto= deep-link (crosses + selects + frames) and index selection (selects + frames).
  let gotoStarFn: ((id: string) => void) | null = null;
  let indexSelectStarFn: ((id: string) => void) | null = null;

  // #45 — the top scale-navigator's back affordance. Walks OUT one shell level,
  // or exits the current full-screen takeover (black-hole / body-scene / deep-sky).
  // Returns null at the solar system (innermost shell — nowhere further in). The
  // returned closure reads the exit-fn pointer at click-time, so the plain `let`
  // pointers above don't need to be reactive; only contextId + the takeover flags
  // (all $state) drive which branch is chosen.
  const SCALE_EXITS: Record<ScaleNavExit, () => (() => void) | null> = {
    'black-hole': () => exitBlackHoleFn,
    'body-scene': () => exitBodySceneFn,
    'deep-sky': () => exitDeepSkyFn,
    neighborhood: () => exitNeighborhoodFn,
    'milky-way': () => exitMilkyWayFn,
    'local-group': () => exitLocalGroupFn,
    'local-sheet': () => exitLocalSheetFn,
    virgo: () => exitVirgoFn,
    laniakea: () => exitLaniakeaFn,
    'cosmic-web': () => exitCosmicWebFn,
  };
  let scaleNavBack: { run: () => void; label: string } | null = $derived.by(() => {
    const target = scaleNavBackTarget(contextId, !!activeBlackHole, !!activeDeepSky);
    return target && { run: () => SCALE_EXITS[target.exit]()?.(), label: target.label };
  });

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
    const id = page.url.searchParams.get('id');
    // The ?id= routing ladder — incl. the Pluto-in-two-catalogues nuance (it lives in
    // both planets.json + small-bodies.json; the small-body surface's curated
    // science_sections win for deep-link landings) — lives in scale-shell-controller,
    // pure + unit-tested (RFC-036 WS-C/C1). Unknown id → null → no-op, never crash.
    const target = resolveSolarBodyTarget(id, {
      isPlanet: (x) => planetById.has(x),
      isSmallBody: (x) => smallBodyById.has(x),
    });
    if (!target) return;
    switch (target.kind) {
      case 'sun':
        selectSun();
        break;
      case 'planet':
        selectPlanet(target.id);
        break;
      case 'smallBody':
        selectSmallBody(target.id);
        break;
      case 'belt':
        selectBelt(target.belt);
        break;
      case 'satellite':
        selectSatellite(target.parentId, target.satelliteId);
        break;
    }
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
      const url = new URL(page.url);
      const cur = url.searchParams.get('id') ?? null;
      if (cur !== id && (id || everOpenedBody)) {
        // Never clobber a fresh ?id= deep-link before the resolver opens it —
        // only clear once a body has actually been open (a real user close).
        if (id) url.searchParams.set('id', id);
        else url.searchParams.delete('id');
        safeReplaceState(url, page.state);
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
    const g = page.url.searchParams.get('goto');
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
      const url = new URL(page.url);
      const cur = url.searchParams.get('goto') ?? null;
      if (cur !== id && (id || everOpenedStar)) {
        if (id) url.searchParams.set('goto', id);
        else url.searchParams.delete('goto');
        lastGoto = id; // keep the resolver from re-firing on our own write
        safeReplaceState(url, page.state);
      }
    });
  });

  // v2 Slice 2 — ?system=<hostId>[&planet=<planetId>] deep-links into a BodyScene.
  let lastSystem: string | null = null;
  $effect(() => {
    const s = page.url.searchParams.get('system');
    const pl = page.url.searchParams.get('planet');
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
      const url = new URL(page.url);
      const curSys = url.searchParams.get('system') ?? null;
      const curPl = url.searchParams.get('planet') ?? null;
      if (curSys !== host || curPl !== planet) {
        if (host) url.searchParams.set('system', host);
        else url.searchParams.delete('system');
        if (host && planet) url.searchParams.set('planet', planet);
        else url.searchParams.delete('planet');
        lastSystem = host; // don't re-fire the resolver on our own write
        if (host || everEnteredSystem) safeReplaceState(url, page.state);
      }
    });
  });

  // v2 Slice 4 — ?deepsky=<designation> deep-links into the immersive view.
  let lastDeepSky: string | null = null;
  $effect(() => {
    const d = page.url.searchParams.get('deepsky');
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
      const url = new URL(page.url);
      const cur = url.searchParams.get('deepsky') ?? null;
      if (cur !== d && (d || everImmersedDeepSky)) {
        if (d) url.searchParams.set('deepsky', d);
        else url.searchParams.delete('deepsky');
        // Only advance the resolver guard on entry; never reset it to null on
        // clear, or a transient URL write (e.g. the gateway's ?system write
        // racing our ?deepsky removal) would re-fire the resolver + re-immerse.
        if (d) lastDeepSky = d;
        safeReplaceState(url, page.state);
      }
    });
  });

  // v2 Slice 5 — ?galaxy=<pinId> deep-links into the Milky Way + selects a pin.
  let lastGalaxy: string | null = null;
  $effect(() => {
    const g = page.url.searchParams.get('galaxy');
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
      const url = new URL(page.url);
      const cur = url.searchParams.get('galaxy') ?? null;
      if (cur !== g && (g || everEnteredGalaxy)) {
        if (g) url.searchParams.set('galaxy', g);
        else url.searchParams.delete('galaxy');
        if (g) lastGalaxy = g; // don't re-fire the resolver on our own write
        safeReplaceState(url, page.state);
      }
    });
  });

  // v2 Slice 6 — ?bh=<id> deep-links into a black hole's lensing render.
  let lastBh: string | null = null;
  $effect(() => {
    const v = page.url.searchParams.get('bh');
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
      const url = new URL(page.url);
      const cur = url.searchParams.get('bh') ?? null;
      if (cur !== v && (v || everEnteredBh)) {
        if (v) url.searchParams.set('bh', v);
        else url.searchParams.delete('bh');
        if (v) lastBh = v;
        safeReplaceState(url, page.state);
      }
    });
  });

  // Nav shortcut — ?context=<solar-system|neighborhood|milky-way|local-group>
  // jumps straight to that scale-shell, then clears the param (pure trigger, no
  // staleness once you zoom onward).
  let lastContextJump: string | null = null;
  $effect(() => {
    const c = page.url.searchParams.get('context');
    if (c && c !== lastContextJump && contextDeepLinkFn) {
      lastContextJump = c;
      untrack(() => {
        void contextDeepLinkFn?.(c).then(() => {
          const url = new URL(page.url);
          if (url.searchParams.get('context') === c) {
            url.searchParams.delete('context');
            safeReplaceState(url, page.state);
          }
        });
      });
    }
  });

  // #306 deep-link from MissionPanel "See path on /explore" — `?paths=1`
  // auto-activates the PATHS layer so users land with the iconic
  // trajectories already visible. `?focus=saturn` additionally selects
  // Saturn so the Cassini orbital tour is in view at panel zoom.
  $effect(() => {
    const paths = page.url.searchParams.get('paths');
    const focus = page.url.searchParams.get('focus');
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
      goto(localHref(`/plan`));
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

    watchExploreLayers(
      {
        setConstellations: (on) => {
          showConstellations = on;
          setConstellationsFn?.(on);
        },
        setDeepSky: (on) => {
          showDeepSky = on;
          setDeepSkyFn?.(on);
        },
        hrOpen: () => hrLensOpen,
        toggleHr: () => toggleHrFn?.(),
        causalityOpen: () => causalityOpen,
        setCausalityOpen: (on) => (causalityOpen = on),
        openCausality: () => openCausalityFn?.(),
        setMwLens: (key, on) => setMwLensFn?.(key, on),
        setMassPeriodOpen: (on) => (massPeriodOpen = on),
        setBhCurvature: (on) => {
          bhCurvatureLens = on;
          setBhCurvatureFn?.(on);
        },
        setBhTimeLens: (on) => (bhTimeLens = on),
      },
      (stop) => lifecycle.add(stop),
    );

    // Async-load localised planet + sun data; safe to run alongside scene setup.
    const initialLocale = localeFromPage(page);
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
    // Black holes for the index rail (2026-09-11) — small manifest, no locale.
    getBlackHoles()
      .then((holes) => {
        blackHoleIndex = holes.map((h) => ({ id: h.id, name: h.name }));
      })
      .catch((err) => console.error('Failed to load black holes:', err));

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
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = createSceneRenderer(container, {
        pixelRatioCap: quality.pixelRatioCap,
        // Pure black surrounding space (matches /earth /moon /mars) rather than the
        // default dark-indigo clear (0x04040c).
        clearColor: 0x000000,
      });
    } catch (e) {
      // WebGL unavailable (#474/#470/#430) — the fallback notice is shown in the
      // container; bail the scene init instead of an uncaught crash.
      if (e instanceof WebGLUnavailableError) return;
      throw e;
    }

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

    // Solar-system scene layer (RFC-036 WS-C/C2a) — belts, planets + satellites +
    // orbiters + science overlays, small bodies, the selection ring, the science-layer
    // subscriptions, and the per-frame LOD/satellite updaters, all in
    // $lib/three/explore-solar-scene. Construction only; live reads thread as getters.
    const solarScene = createExploreSolarScene({
      scene,
      camera,
      base,
      loadTexture,
      textureLoader,
      tex4kAllowed,
      PLANET_LOD_IN_RATIO,
      PLANET_LOD_OUT_RATIO,
      sampleOrbitPoints,
      SMALL_BODIES,
      DAYS_PER_YEAR,
      getView: () => view,
      getLayers: () => layers,
      getSimSpeed: () => simSpeed,
      getSimPaused: () => simPaused,
      getReducedMotion: () => reducedMotion,
      getSelectedSatelliteKey: () => selectedSatelliteKey,
    });
    const {
      asteroidBeltPick,
      kuiperBeltPick,
      localGroup,
      overlayPerPlanet,
      planetObjs,
      planetOrbitLines,
      selHalo,
      selRingMat,
      smallBodyObjs,
      stopExploreCentripetalLayer,
      stopExploreGalaxiesLayer,
      stopExploreGravityLayer,
      stopExploreHillSphereLayer,
      stopExploreLagrangeLayer,
      stopExploreMagnetosphereLayer,
      stopExploreSubSolarLayer,
      stopExploreVelocityLayer,
      tmpWorldPos,
      updatePlanetLods,
      updateSatellites,
    } = solarScene;

    // Prefers-reduced-motion gate — page-owned so both the solar-scene updaters and
    // the scene host read the live flag (RFC-020 §6 / ADR-025).
    let reducedMotion = false;
    const stopReducedMotionWatch = onReducedMotionChange((r) => {
      reducedMotion = r;
    });
    lifecycle.add(stopReducedMotionWatch);

    // ──────────────────────────────────────────────────────────────
    // 3D scene host (RFC-036 WS-C/C2b) — camera + per-frame loop + draw2d + all
    // pointer/touch/pick input + the scale-shell orchestration (ensure/cross for every
    // shell, the deep-link cold-load resolvers, causality/HR/deep-sky). The frame +
    // handlers read AND write component $state the template binds to, so those thread
    // through `bridge`; every scene ref / helper passes via `deps`; the fn-pointers the
    // template + URL $effects call return on the handle and assign back here.
    // ──────────────────────────────────────────────────────────────
    const bridge = {
      get view() {
        return view;
      },
      set view(v) {
        view = v;
      },
      get namedStars() {
        return namedStars;
      },
      set namedStars(v) {
        namedStars = v;
      },
      get selectedExoplanet() {
        return selectedExoplanet;
      },
      set selectedExoplanet(v) {
        selectedExoplanet = v;
      },
      get selectedStarId() {
        return selectedStarId;
      },
      set selectedStarId(v) {
        selectedStarId = v;
      },
      get localizedStar() {
        return localizedStar;
      },
      set localizedStar(v) {
        localizedStar = v;
      },
      get anonStar() {
        return anonStar;
      },
      set anonStar(v) {
        anonStar = v;
      },
      get simDateLabel() {
        return simDateLabel;
      },
      set simDateLabel(v) {
        simDateLabel = v;
      },
      get scaleReadout() {
        return scaleReadout;
      },
      set scaleReadout(v) {
        scaleReadout = v;
      },
      get scaleBarPx() {
        return scaleBarPx;
      },
      set scaleBarPx(v) {
        scaleBarPx = v;
      },
      get scaleBarLabel() {
        return scaleBarLabel;
      },
      set scaleBarLabel(v) {
        scaleBarLabel = v;
      },
      get contextId() {
        return contextId;
      },
      set contextId(v) {
        contextId = v;
      },
      get bodyHostName() {
        return bodyHostName;
      },
      set bodyHostName(v) {
        bodyHostName = v;
      },
      get exoplanetHostIds() {
        return exoplanetHostIds;
      },
      set exoplanetHostIds(v) {
        exoplanetHostIds = v;
      },
      get exoplanetSystemsById() {
        return exoplanetSystemsById;
      },
      set exoplanetSystemsById(v) {
        exoplanetSystemsById = v;
      },
      get cultureObjectIds() {
        return cultureObjectIds;
      },
      set cultureObjectIds(v) {
        cultureObjectIds = v;
      },
      get warpCaption() {
        return warpCaption;
      },
      set warpCaption(v) {
        warpCaption = v;
      },
      get activeBodyHostId() {
        return activeBodyHostId;
      },
      set activeBodyHostId(v) {
        activeBodyHostId = v;
      },
      get crossingFlashId() {
        return crossingFlashId;
      },
      set crossingFlashId(v) {
        crossingFlashId = v;
      },
      get starCultureDoors() {
        return starCultureDoors;
      },
      set starCultureDoors(v) {
        starCultureDoors = v;
      },
      get exoCultureDoors() {
        return exoCultureDoors;
      },
      set exoCultureDoors(v) {
        exoCultureDoors = v;
      },
      get hrLensOpen() {
        return hrLensOpen;
      },
      set hrLensOpen(v) {
        hrLensOpen = v;
      },
      get hrStars() {
        return hrStars;
      },
      set hrStars(v) {
        hrStars = v;
      },
      get causalityShells() {
        return causalityShells;
      },
      set causalityShells(v) {
        causalityShells = v;
      },
      get causalityField() {
        return causalityField;
      },
      set causalityField(v) {
        causalityField = v;
      },
      get causalityNamed() {
        return causalityNamed;
      },
      set causalityNamed(v) {
        causalityNamed = v;
      },
      get massPeriodOpen() {
        return massPeriodOpen;
      },
      set massPeriodOpen(v) {
        massPeriodOpen = v;
        // The lens layer drives this state (2026-09-11) — keep the stored
        // layer preference in sync so a scene-exit reset doesn't leave the
        // panel toggle on with the chart closed.
        setLayer('mass-period', v);
      },
      get allExoplanetPlanets() {
        return allExoplanetPlanets;
      },
      set allExoplanetPlanets(v) {
        allExoplanetPlanets = v;
      },
      get deepSkyObjects() {
        return deepSkyObjects;
      },
      set deepSkyObjects(v) {
        deepSkyObjects = v;
      },
      get selectedDeepSkyId() {
        return selectedDeepSkyId;
      },
      set selectedDeepSkyId(v) {
        selectedDeepSkyId = v;
      },
      get deepSkyGallery() {
        return deepSkyGallery;
      },
      set deepSkyGallery(v) {
        deepSkyGallery = v;
      },
      get activeDeepSky() {
        return activeDeepSky;
      },
      set activeDeepSky(v) {
        activeDeepSky = v;
      },
      get deepSkyImmersed() {
        return deepSkyImmersed;
      },
      set deepSkyImmersed(v) {
        deepSkyImmersed = v;
      },
      get deepSkyPhotoUrl() {
        return deepSkyPhotoUrl;
      },
      set deepSkyPhotoUrl(v) {
        deepSkyPhotoUrl = v;
      },
      get deepSkyPanelOpen() {
        return deepSkyPanelOpen;
      },
      set deepSkyPanelOpen(v) {
        deepSkyPanelOpen = v;
      },
      get sunCompass() {
        return sunCompass;
      },
      set sunCompass(v) {
        sunCompass = v;
      },
      get mwObjects() {
        return mwObjects;
      },
      set mwObjects(v) {
        mwObjects = v;
      },
      get selectedMwId() {
        return selectedMwId;
      },
      set selectedMwId(v) {
        selectedMwId = v;
      },
      get mwPanelOpen() {
        return mwPanelOpen;
      },
      set mwPanelOpen(v) {
        mwPanelOpen = v;
      },
      get selectedLgMember() {
        return selectedLgMember;
      },
      set selectedLgMember(v) {
        selectedLgMember = v;
      },
      get lgPanelOpen() {
        return lgPanelOpen;
      },
      set lgPanelOpen(v) {
        lgPanelOpen = v;
      },
      get selectedLsMember() {
        return selectedLsMember;
      },
      set selectedLsMember(v) {
        selectedLsMember = v;
      },
      get lsPanelOpen() {
        return lsPanelOpen;
      },
      set lsPanelOpen(v) {
        lsPanelOpen = v;
      },
      get lsMembers() {
        return lsMembers;
      },
      set lsMembers(v) {
        lsMembers = v;
      },
      get selectedVirgoMember() {
        return selectedVirgoMember;
      },
      set selectedVirgoMember(v) {
        selectedVirgoMember = v;
      },
      get virgoPanelOpen() {
        return virgoPanelOpen;
      },
      set virgoPanelOpen(v) {
        virgoPanelOpen = v;
      },
      get virgoMembers() {
        return virgoMembers;
      },
      set virgoMembers(v) {
        virgoMembers = v;
      },
      get selectedLaniakeaMember() {
        return selectedLaniakeaMember;
      },
      set selectedLaniakeaMember(v) {
        selectedLaniakeaMember = v;
      },
      get laniakeaPanelOpen() {
        return laniakeaPanelOpen;
      },
      set laniakeaPanelOpen(v) {
        laniakeaPanelOpen = v;
      },
      get laniakeaMembers() {
        return laniakeaMembers;
      },
      set laniakeaMembers(v) {
        laniakeaMembers = v;
      },
      get selectedCosmicWebMember() {
        return selectedCosmicWebMember;
      },
      set selectedCosmicWebMember(v) {
        selectedCosmicWebMember = v;
      },
      get cosmicWebPanelOpen() {
        return cosmicWebPanelOpen;
      },
      set cosmicWebPanelOpen(v) {
        cosmicWebPanelOpen = v;
      },
      get cosmicWebMembers() {
        return cosmicWebMembers;
      },
      set cosmicWebMembers(v) {
        cosmicWebMembers = v;
      },
      get activeBlackHole() {
        return activeBlackHole;
      },
      set activeBlackHole(v) {
        activeBlackHole = v;
      },
      get bhPanelOpen() {
        return bhPanelOpen;
      },
      set bhPanelOpen(v) {
        bhPanelOpen = v;
      },
      get bhCurvatureLens() {
        return bhCurvatureLens;
      },
      set bhCurvatureLens(v) {
        bhCurvatureLens = v;
      },
      get bhTimeLens() {
        return bhTimeLens;
      },
      set bhTimeLens(v) {
        bhTimeLens = v;
      },
      get bhCultureDoors() {
        return bhCultureDoors;
      },
      set bhCultureDoors(v) {
        bhCultureDoors = v;
      },
      get deepSkyCultureDoors() {
        return deepSkyCultureDoors;
      },
      set deepSkyCultureDoors(v) {
        deepSkyCultureDoors = v;
      },
      get hoverData() {
        return hoverData;
      },
      set hoverData(v) {
        hoverData = v;
      },
      get lastGoto() {
        return lastGoto;
      },
      set lastGoto(v) {
        lastGoto = v;
      },
      get lastSystem() {
        return lastSystem;
      },
      set lastSystem(v) {
        lastSystem = v;
      },
      get lastDeepSky() {
        return lastDeepSky;
      },
      set lastDeepSky(v) {
        lastDeepSky = v;
      },
      get lastGalaxy() {
        return lastGalaxy;
      },
      set lastGalaxy(v) {
        lastGalaxy = v;
      },
      get lastBh() {
        return lastBh;
      },
      set lastBh(v) {
        lastBh = v;
      },
      get lastContextJump() {
        return lastContextJump;
      },
      set lastContextJump(v) {
        lastContextJump = v;
      },
      get container() {
        return container;
      },
      get canvas2d() {
        return canvas2d;
      },
      get selectedId() {
        return selectedId;
      },
      get panelState() {
        return panelState;
      },
      get namedStarById() {
        return namedStarById;
      },
      get cameraState() {
        return cameraState;
      },
      get selectedSatelliteKey() {
        return selectedSatelliteKey;
      },
      get layers() {
        return layers;
      },
      get simSpeed() {
        return simSpeed;
      },
      get simPaused() {
        return simPaused;
      },
      get overlayMission() {
        return overlayMission;
      },
      get overlayArcPx() {
        return overlayArcPx;
      },
      get overlayArrivalPx() {
        return overlayArrivalPx;
      },
      get planetById() {
        return planetById;
      },
      get showConstellations() {
        return showConstellations;
      },
      get showDeepSky() {
        return showDeepSky;
      },
    };
    const deps = {
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
      getSunMap4k: () => sunMap4k,
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
      openMessageCraft,
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
      getReducedMotion: () => reducedMotion,
      getPage: () => page,
    };
    const exploreHost = createExploreSceneHost(bridge, deps);
    closeExoplanetFn = exploreHost.closeExoplanetFn;
    resetSimToToday = exploreHost.resetSimToToday;
    enterSystemFn = exploreHost.enterSystemFn;
    setConstellationsFn = exploreHost.setConstellationsFn;
    setDeepSkyFn = exploreHost.setDeepSkyFn;
    toggleHrFn = exploreHost.toggleHrFn;
    openCausalityFn = exploreHost.openCausalityFn;
    exitDeepSkyFn = exploreHost.exitDeepSkyFn;
    deepSkyGatewayFn = exploreHost.deepSkyGatewayFn;
    deepSkyDeepLinkFn = exploreHost.deepSkyDeepLinkFn;
    flyToBodyFn = exploreHost.flyToBodyFn;
    exitNeighborhoodFn = exploreHost.exitNeighborhoodFn;
    resetNeighborhoodFn = exploreHost.resetNeighborhoodFn;
    resetMilkyWayFn = exploreHost.resetMilkyWayFn;
    setMwLensFn = exploreHost.setMilkyWayLens;
    resetLocalGroupFn = exploreHost.resetLocalGroupFn;
    exitBodySceneFn = exploreHost.exitBodySceneFn;
    exitMilkyWayFn = exploreHost.exitMilkyWayFn;
    closeMwFn = exploreHost.closeMwFn;
    mwDeepLinkFn = exploreHost.mwDeepLinkFn;
    contextDeepLinkFn = exploreHost.contextDeepLinkFn;
    exitLocalGroupFn = exploreHost.exitLocalGroupFn;
    closeLgFn = exploreHost.closeLgFn;
    exitLocalSheetFn = exploreHost.exitLocalSheetFn;
    closeLsFn = exploreHost.closeLsFn;
    exitVirgoFn = exploreHost.exitVirgoFn;
    closeVirgoFn = exploreHost.closeVirgoFn;
    exitLaniakeaFn = exploreHost.exitLaniakeaFn;
    closeLaniakeaFn = exploreHost.closeLaniakeaFn;
    exitCosmicWebFn = exploreHost.exitCosmicWebFn;
    closeCosmicWebFn = exploreHost.closeCosmicWebFn;
    exitBlackHoleFn = exploreHost.exitBlackHoleFn;
    bhDeepLinkFn = exploreHost.bhDeepLinkFn;
    setBhCurvatureFn = exploreHost.setBhCurvatureFn;
    closeStarFn = exploreHost.closeStarFn;
    gotoStarFn = exploreHost.gotoStarFn;
    indexSelectStarFn = exploreHost.indexSelectStarFn;
    tourCameraTeardown = exploreHost.tourCameraTeardown;
    iconicTrajectoryHandles = exploreHost.iconicTrajectoryHandles;
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

  <!-- #45 top scale-navigator (replaces the v2 breadcrumb + the old bottom-right
       picker; UXS-014 "you always know where you are"). One row under the nav:
       `‹ back` (out one shell, or exit a takeover) · the scale chip (jump to ANY
       shell) · `⟲ reset`. The chip alone names the current scale, so the redundant
       breadcrumb is gone. In a full-screen takeover (black-hole / body-scene /
       deep-sky) only the back arrow shows — the ladder isn't meaningful there. -->
  {#if view === '3d'}
    <ScaleNav
      atSolar={contextId === 'solar-system' && !activeBlackHole}
      back={scaleNavBack}
      showPicker={!activeBlackHole && !activeDeepSky && contextId !== 'body-scene'}
      activeShell={contextId as ShellId}
      pickerDisabled={!contextDeepLinkFn}
      onJump={(shell) => void contextDeepLinkFn?.(shell)}
      showReset={scaleResetVisible}
      onReset={resetCurrentScale}
    />
  {/if}

  <!-- Slice 5/8 honesty badges (Milky Way … Cosmic Web are labelled schematics,
       PRD-030 principle 2) now live in the unified `.scale-strip` below, so the
       scale readout sits in one consistent place on every shell (#45). -->

  <!-- Slice 6: the black-hole render is a geodesic GR ray-trace — label it. -->
  {#if view === '3d' && activeBlackHole}
    <BlackHoleNotes curvature={bhCurvatureLens} time={bhTimeLens} />
  {/if}

  <!-- Slice 7's mass–period plot moved from a bespoke chip here into the
       science-lens layer panel (2026-09-11) — see lensPanel's 'body-scene'
       case + the 'mass-period' layer watch. -->

  <!-- Sun compass — a "find your way home" cue that appears ONLY when the Sun has
       been panned off-screen (when it's in frame, the gold marker + distance rings
       are the reference; showing a needle then just reads as pointing at a Sun
       that's plainly centred). The needle points toward the off-screen Sun. -->
  {#if view === '3d' && contextId === 'neighborhood' && !activeBlackHole && sunCompass && !sunCompass.on}
    <SunCompass ang={sunCompass.ang} ly={sunCompass.ly} />
  {/if}

  <!-- Neighborhood star index — the left INDEX rail. WS-3 (RFC-039 Contract D)
       retired the bespoke .nb-hud chip row: constellations, deep-sky, the H–R
       diagram and light-cones are now standard science layers, surfaced uniformly
       through the ScienceLayersPanel lens (see lensPanel derived + onLayerChange
       subscriptions). -->
  {#if view === '3d' && contextId === 'neighborhood' && !activeBlackHole}
    <StarIndex
      stars={namedStars}
      open={starIndexOpen}
      selectedId={selectedStarId}
      hostIds={exoplanetHostIds}
      cultureIds={cultureObjectIds}
      blackHoles={blackHoleIndex}
      onSelect={(id) => indexSelectStarFn?.(id)}
      onSelectBlackHole={(id) => {
        starIndexOpen = false;
        bhDeepLinkFn?.(id);
      }}
      onClose={() => (starIndexOpen = false)}
    />
  {/if}

  <!-- #451 (WS-2) — the Milky Way science lens (rotation curve / dark-matter halo /
       stellar populations) now lives in the unified ScienceLayersPanel, like every
       other shell's teaching layers. WS-3 (RFC-039 Contract D). -->

  <!-- #45 unified scale strip (PRD-030 / RFC-032): ONE readout in ONE place on
       every shell. Solar System + Neighborhood show the km → AU → ly → pc ruler
       (distance + light-time + map-scale bar); Milky Way … Cosmic Web show the
       schematic honesty note (+ a Learn-more link where an article exists). The
       old bottom-right `.scale-hud` and the scattered `.mw-badge` / `.mw-scale`
       floats collapsed into this single box, so it never fights the picker (now
       up top) and reads the same on every zoom. -->
  {#if view === '3d'}
    <ScaleStrip
      readout={scaleReadout}
      {contextId}
      blackHole={!!activeBlackHole}
      barPx={scaleBarPx}
      barLabel={scaleBarLabel}
      {bodyHostName}
    />
  {/if}

  <!-- v2 anonymous-star tag (Slice 1 Hybrid): tapping a background star shows the
       honest facts from the catalogue — no Panel, no invented name. -->
  {#if view === '3d' && contextId === 'neighborhood' && anonStar}
    <AnonStarTag star={anonStar} onDismiss={() => (anonStar = null)} />
  {/if}

  <!-- v2 Slice 4: full-frame deep-sky immersion. The curated photo fills the
       viewport (thumb → full-res) with a soft vignette — the destination you fly
       into from a glint. Sits above the canvas; the warp flash + panel render on
       top. -->
  {#if view === '3d' && activeDeepSky && deepSkyPhotoUrl}
    <DeepSkyImmersion
      url={deepSkyPhotoUrl}
      alt={activeDeepSkyImage?.caption ?? activeDeepSky.name}
      visible={deepSkyImmersed}
    />
  {/if}

  <!-- Slice 7: the HR-diagram (property-space) lens overlay — the real star field
       re-projected onto temperature/luminosity axes. -->
  {#if view === '3d'}
    <!-- The three property-space charts are screen-space overlays — since the
         2026-09-11 region-wide lens unification they open from ANYWHERE in the
         stellar-neighbourhood region (the neighbourhood field or inside an
         exoplanet system), not just their birth context. Every close button
         writes the layer off so the lens toggles never desync. -->
    <HrDiagram
      stars={hrStars}
      open={hrLensOpen && (contextId === 'neighborhood' || contextId === 'body-scene')}
      onClose={() => {
        hrLensOpen = false;
        setLayer('hr-diagram', false);
      }}
    />
    <CausalityMap
      field={causalityField}
      named={causalityNamed}
      shells={causalityShells}
      open={causalityOpen && (contextId === 'neighborhood' || contextId === 'body-scene')}
      onClose={() => {
        causalityOpen = false;
        setLayer('light-cones', false);
      }}
    />
    <MassPeriodChart
      planets={allExoplanetPlanets}
      activeHostId={activeBodyHostId}
      open={massPeriodOpen && (contextId === 'neighborhood' || contextId === 'body-scene')}
      onClose={() => {
        massPeriodOpen = false;
        setLayer('mass-period', false);
      }}
    />
  {/if}

  <!-- Warp flash — masks the scene cut at a boundary crossing. Replays whenever
       crossingFlashId changes (skipped under reduced motion, which never bumps it). -->
  {#if view === '3d'}
    <WarpOverlays flashId={crossingFlashId} caption={warpCaption} />
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
          href={localHref(`/science/transfers/coplanar-trajectories`)}
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
            onclick={() =>
              INTERSTELLAR_CRAFT.has(entry.mission_id)
                ? openMessageCraft(entry.mission_id, localeFromPage(page))
                : iconic.selectMission(entry.mission_id, localeFromPage(page))}
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
        href={localHref(`/science/transfers/coplanar-trajectories`)}
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
            if (INTERSTELLAR_CRAFT.has(entry.mission_id)) {
              void openMessageCraft(entry.mission_id, localeFromPage(page));
            } else {
              iconic.selectMission(entry.mission_id, localeFromPage(page));
            }
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
  <!-- Mobile "Scan" tab (#49) — the planet-stats tactical scan folded into the
       drawer, mirroring the surface route's Scan tab (#386). The floating overlay
       is desktop-only (too tall for a phone); on mobile this inline copy is the
       readout. Only present when the camera has settled on a planet with stats. -->
  {#snippet mobileScanContent(_close: () => void)}
    <div class="mobile-scan">
      <TacticalScan
        stats={focusedStats}
        bodyLabel={selectedId?.toUpperCase() ?? ''}
        rotationHours={focusedRotationHours}
        lightTime={focusedLightTime}
        inline
      />
    </div>
  {/snippet}
  <!-- Mobile solar-system drawers (ruler/controls/missions/index) — solar-system
       only; the neighborhood + BodyScenes have their own chrome. -->
  {#if contextId === 'solar-system' && !activeBlackHole}
    <MobileDrawerGroup
      tabs={[
        // B3: fixed semantic slot order [Measure][Overlays][Highlight][Scene];
        // empty slots (no Overlays in solar-system) are simply omitted.
        { id: 'ruler', label: 'Ruler', icon: '◎', content: mobileRulerContent },
        { id: 'missions', label: 'Missions', icon: '➤', content: mobileIconicContent },
        { id: 'controls', label: 'Controls', icon: '▤', content: mobileControlsContent },
        // Scan appears only when a focused planet has a tactical readout (#49).
        ...(cameraState.focusedOnPlanet && focusedStats
          ? [{ id: 'scan', label: 'Scan', icon: '◈', content: mobileScanContent }]
          : []),
      ]}
      onOpen={(id) => {
        if (id === 'missions') layers.paths = true;
      }}
      bottomInline
      --mcd-bottom="calc(56px + env(safe-area-inset-bottom, 0px))"
    />
  {/if}

  {#if panelState.sizes}
    <SizesOverlay highlightId={selectedId} onClose={() => (panelState.sizes = false)} />
  {/if}

  {#if hoverData && view === '3d' && tooltipVisible}
    <HoverTooltip {hoverData} expanded={tooltipExpanded} {container} />
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
  system={selectedStarId ? (exoplanetSystemsById.get(selectedStarId) ?? null) : null}
  onEnterSystem={() => selectedStarId && enterSystemFn?.(selectedStarId)}
  cultureDoors={starCultureDoors}
  onClose={() => closeStarFn?.()}
/>

<ExoplanetPanel
  planet={selectedExoplanet?.planet ?? null}
  hostName={selectedExoplanet?.hostName ?? ''}
  overlay={selectedExoplanet?.overlay ?? null}
  cultureDoors={exoCultureDoors}
  open={panelState.exoplanet}
  onClose={() => closeExoplanetFn?.()}
/>

<DeepSkyPanel
  object={activeDeepSky}
  image={activeDeepSkyImage}
  galleryHref={localHref(`/gallery/deep-sky`)}
  open={deepSkyPanelOpen}
  onClose={() => exitDeepSkyFn?.()}
  onGateway={(hostId) => deepSkyGatewayFn?.(hostId)}
>
  {#each deepSkyCultureDoors as door (door.id)}
    <CultureDoorCard {door} />
  {/each}
</DeepSkyPanel>

<MilkyWayPanel
  object={selectedMwObject}
  learnHref={mwLearnHref}
  open={mwPanelOpen}
  onClose={() => closeMwFn?.()}
/>

<LocalGroupPanel member={selectedLgMember} open={lgPanelOpen} onClose={() => closeLgFn?.()} />

<LocalSheetPanel member={selectedLsMember} open={lsPanelOpen} onClose={() => closeLsFn?.()} />
<VirgoPanel member={selectedVirgoMember} open={virgoPanelOpen} onClose={() => closeVirgoFn?.()} />
<CosmicWebPanel
  member={selectedCosmicWebMember}
  open={cosmicWebPanelOpen}
  onClose={() => closeCosmicWebFn?.()}
/>
<LaniakeaPanel
  member={selectedLaniakeaMember}
  open={laniakeaPanelOpen}
  onClose={() => closeLaniakeaFn?.()}
/>

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

<!-- #410 — the message an interstellar craft carries. Opened from its PATHS
     trajectory Today marker; "Full mission details" hands off to MissionPanel. -->
<MessagePanel
  craft={activeCraft}
  open={craftPanelOpen}
  onClose={() => (craftPanelOpen = false)}
  onMissionDetails={openCraftMission}
/>

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
  onFly={(id) => goto(localHref(`/fly?mission=${id}`))}
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
<!-- The body index is the solar-system's INDEX rail. Out in the stellar
     neighborhood the star index (below) takes over the same left rail + handle,
     so gate the body index to the solar-system context (no cross-scale bleed). -->
{#if contextId === 'solar-system'}
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
{/if}
<!-- Neighborhood INDEX handle — same left-edge tab as the body index, toggles the
     star index (the neighborhood's primary index). -->
{#if view === '3d' && contextId === 'neighborhood' && !activeBlackHole}
  <button
    type="button"
    class="star-index-handle"
    aria-pressed={starIndexOpen}
    aria-label={m.star_index_aria()}
    title={m.star_index_aria()}
    onclick={() => (starIndexOpen = !starIndexOpen)}
  >
    <span class="bih-label">{m.explore_body_index_toggle()}</span>
  </button>
{/if}

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

<!-- Unified Science Lens panel — one lens surface for every scale shell (WS-3,
     RFC-039 Contract D). The story + teaching layers are derived from the active
     shell (see `lensPanel`): solar-system keeps its Kepler/Newton foundations;
     the neighbourhood surfaces constellations / deep-sky / H–R / light-cones; the
     Milky Way its rotation-curve / dark-matter / stellar-population overlays; the
     Local Group + Local Sheet carry the lens-story + → science link ahead of their
     per-tier overlays (WS-5). Service chips (planets/dwarfs/comets/…) stay in the
     HUD; only teaching layers live here. -->
<!-- 3D only (2026-09-11 consistency audit): every layer consumer + the three
     property-space charts live in the 3D scenes — in the 2D schematic the
     panel's toggles were dead switches. -->
{#if view === '3d'}
  <ScienceLayersPanel
    title={lensPanel.title}
    body={lensPanel.body}
    tab={lensPanel.tab}
    section={lensPanel.section}
    available={lensPanel.available}
    historicalFoundations={lensPanel.historicalFoundations}
  />
{/if}

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

  /* Solar-system chrome hidden out in the stellar neighborhood. */
  .context-hidden {
    display: none !important;
  }

  /* .nb-hud chip-row styles removed 2026-09-11 — the last bespoke chip
     (mass–period) moved into the science-lens layer panel; WS-3 had
     already retired the rest. */
  /* The neighborhood star-index handle mirrors the body-index tab but stays
     available on touch — the body index falls back to a mobile drawer; the star
     index has no drawer, so its handle must show at every viewport. */
  .star-index-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    left: 0;
    top: 50%;
    z-index: 44;
    writing-mode: vertical-rl;
    transform: translateY(-50%) rotate(180deg);
    padding: 12px 6px;
    background: rgba(8, 10, 22, 0.85);
    border: 1px solid rgba(154, 166, 189, 0.34);
    border-left: none;
    border-radius: 0 6px 6px 0;
    color: rgba(220, 227, 240, 0.82);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    cursor: pointer;
    backdrop-filter: blur(6px);
  }
  .star-index-handle:hover,
  .star-index-handle[aria-pressed='true'] {
    color: #aab6cc;
    border-color: rgba(154, 166, 189, 0.6);
  }
  /* .nb-controls/.nb-chip removed 2026-09-11 — the black-hole curvature/time
     chips (their last consumer) moved into the science-lens layer panel. */

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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
  /* Mobile "Scan" drawer tab body (#49) — stacks the inline tactical scan;
     mirrors the surface route's .mobile-scan. */
  .mobile-scan {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
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
    /* Mobile: chip row is a single horizontally-scrollable line (A3) so it
       never wraps to a second row and crowds the top edge — even when the
       science lens adds its HR/Light-cone chips. At @min-width: 769 the rail
       returns to a vertical column matching the toggle row's stretch width. */
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    max-width: calc(100vw - 24px);
    overflow-x: auto;
    scrollbar-width: none;
  }
  .ctrl-row.chips::-webkit-scrollbar {
    display: none;
  }
  .toggle {
    min-width: 44px;
    min-height: 44px;
    /* Mobile: 12 px font, 0/10 padding. Desktop bumps to 13 / 0 14. */
    padding: 0 10px;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid rgba(68, 102, 255, 0.4);
    color: #dde4ff;
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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

  /* Hidden tour-anchor buttons (PRD-016 §S11 / RFC-019 §12). Visually
     offscreen but click()-able so the audio executor can drive planet
     selection without a DOM hit on the 3D canvas. */
  /* Desktop object-index edge-handle "little side tab" — mirrors the surface
     index handle. Hidden on touch (mobile uses the Index drawer tab); a fine
     pointer gets the left-edge vertical handle that toggles the side panel. */
  /* A1: solar-system object index is a left-edge pullout tab on ALL viewports
     (was desktop-only via a hover gate; mobile used a bottom-drawer tab) —
     matching the stellar-neighborhood .star-index-handle and the body scenes. */
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
