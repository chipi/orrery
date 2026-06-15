<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount, onDestroy } from 'svelte';
  import { audio } from '$lib/audio-state.svelte';
  import { get } from 'svelte/store';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import { createSpinAccumulator } from '$lib/three/spin-accumulator';
  import { createLayeredStarField } from '$lib/three/star-field';
  import { tickSunTrackingArrays } from '$lib/three/sun-tracking';
  import { createAnimateLoop } from '$lib/three/animate-loop';
  import { createRouteLifecycle } from '$lib/three/route-lifecycle';
  import { syncStationUrl } from '$lib/routes/sync-station-url';
  import { refreshStationSelectionStyling } from '$lib/three/station-selection-styling';
  import { createOutlinePassSetup } from '$lib/three/outline-pass-setup';
  import {
    resolveQualitySync,
    kickOffBackgroundDetect,
    resolveQualitySource,
    type QualityConfig,
    type QualityTier,
  } from '$lib/quality/quality-tier';
  import RenderingDebugRegistrar from '$lib/components/RenderingDebugRegistrar.svelte';
  import QualitySettingsModal from '$lib/components/QualitySettingsModal.svelte';
  import type { QualitySource } from '$lib/components/debug-panel-context';
  import type { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
  import { disposeScene } from '$lib/three/dispose-object3d';
  import { gmstRadians } from '$lib/earth-sidereal';
  import HoverLabel from '$lib/components/HoverLabel.svelte';
  import { getTiangongModules, getTiangongVisitors, getTiangongModuleGallery } from '$lib/data';
  import { localeFromPage } from '$lib/locale';
  import { buildTiangongProxyStation } from '$lib/tiangong-proxy-model';
  import { buildMicrogravityAxes } from '$lib/microgravity-axes';
  import { onLayerChange } from '$lib/science-layers';
  import MicrogravityAxesLegend from '$lib/components/MicrogravityAxesLegend.svelte';
  import ScienceLayersPanel from '$lib/components/ScienceLayersPanel.svelte';
  import type { TiangongModule } from '$types/tiangong-module';
  import StationModulePanel from '$lib/components/StationModulePanel.svelte';
  import StationOrbitBanner from '$lib/components/StationOrbitBanner.svelte';
  import StationBlueprint from '$lib/components/StationBlueprint.svelte';
  import AgencyBadge from '$lib/components/AgencyBadge.svelte';
  import StationTimelineStrip from '$lib/components/StationTimelineStrip.svelte';
  import StationAssemblyControl from '$lib/components/StationAssemblyControl.svelte';
  import {
    type AssemblyState,
    ANIM_WINDOW_MS,
    captureHomes,
    applyAssembly,
    currentChip,
    buildPiecewiseMapping,
  } from '$lib/station-assembly-anim';
  import { createAssemblyRef, syncAssemblyRef } from '$lib/station-assembly-state';
  import type { BlueprintModule } from '$lib/station-blueprint';
  import * as m from '$lib/paraglide/messages';
  import {
    type RemoteData,
    loading,
    success,
    error as rdError,
    isSuccess,
    isError,
  } from '$lib/types/remote-data';

  let container: HTMLDivElement | undefined = $state();

  // DebugPanel "Rendering" tab bridge (#334).
  let liveRenderer: THREE.WebGLRenderer | null = $state(null);
  let liveQuality: QualityConfig | null = $state(null);
  let liveQualitySource: QualitySource = $state('fallback');
  let liveBloomPass: UnrealBloomPass | null = $state(null);
  // QualitySettingsModal bridge (#339).
  let activeQualityTier: QualityTier = $state('medium');

  // RemoteData migration (#8). Internal state holds the discriminated
  // union; the legacy field names stay as $derived shims so read sites
  // don't need to be rewritten.
  let modulesRD = $state<RemoteData<Error, TiangongModule[]>>(loading());
  let visitorsRD = $state<RemoteData<Error, TiangongModule[]>>(loading());
  const modules = $derived(isSuccess(modulesRD) ? modulesRD.data : ([] as TiangongModule[]));
  const visitors = $derived(isSuccess(visitorsRD) ? visitorsRD.data : ([] as TiangongModule[]));
  const loadFailed = $derived(isError(modulesRD) || isError(visitorsRD));
  let viewMode: '3d' | '2d-top' | '2d-side' | '2d-front' | 'list' = $state('3d');
  let selected: TiangongModule | null = $state(null);
  let panelOpen = $state(false);

  // Auto-compact the Curator Tour overlay when a module panel opens
  // during an active tour (PRD-016 §S8 / RFC-019 §12).
  $effect(() => {
    if (audio.tourActive && panelOpen && !audio.compact) {
      audio.compact = true;
    }
  });
  let ignoreModuleParamUntilClear = $state(false);
  let perfBanner = $state(false);
  let lowMemBanner = $state(false);
  let autoSpin = $state(true);
  let indexOpen = $state(false);
  let timelineOpen = $state(false);
  let assemblyOpen = $state(false);
  let assemblyPlaying = $state(false);
  /** Scrub progress 0..1 mapped onto [startEpoch, endEpoch]. */
  let assemblyProgress = $state(0);
  const ASSEMBLY_DURATION_MS = 24_000;

  // Synthetic phases for the 3 spacecraft docks — each dock fly-in is
  // tied to a real CMSA mission so the chip narrative can name it.
  // dockEventId values mirror the userData.animModuleId set in
  // src/lib/tiangong-proxy-model.ts (see buildTiangongProxyStation).
  type DockEvent = {
    id: string;
    name: string;
    launcher: string;
    launch_date: string;
  };
  const DOCK_EVENTS: DockEvent[] = [
    {
      id: 'dock-tianzhou-2',
      name: 'Tianzhou 2 — first cargo to Tianhe',
      launcher: 'Long March 7 · Wenchang',
      launch_date: '2021-05-29',
    },
    {
      id: 'dock-shenzhou-12',
      name: 'Shenzhou 12 — first crew aboard Tianhe',
      launcher: 'Long March 2F · Nie Haisheng + Liu Boming + Tang Hongbo',
      launch_date: '2021-06-17',
    },
    {
      id: 'dock-shenzhou-15',
      name: 'Shenzhou 15 — first 3-spacecraft handover (6 crew aboard)',
      launcher: 'Long March 2F · Fei Junlong + Deng Qingming + Zhang Lu',
      launch_date: '2022-11-29',
    },
  ];
  let hoverLabel: HoverLabel | undefined = $state();

  /** Reactive mirror of the 3D scene's hovered module id so the
   *  sidebar list can visually echo the canvas hover. */
  let canvasHoveredId: string | null = $state(null);

  let cleanupThree: (() => void) | undefined;
  let perfCheckPending = true;

  const viewBag = { mode: '3d' as '3d' | '2d-top' | '2d-side' | '2d-front' | 'list' };

  const moduleListRef: { list: TiangongModule[] } = { list: [] };
  $effect(() => {
    moduleListRef.list = [...modules, ...visitors];
    viewBag.mode = viewMode;
  });

  const visualRef: {
    selectedId: string | null;
    panelOpen: boolean;
    hoveredId: string | null;
  } = { selectedId: null, panelOpen: false, hoveredId: null };

  // Shared between Svelte state + the Three.js animate() closure. Updating
  // any field on the next frame applies it in-scene — no event plumbing.
  // See `$lib/station-assembly-state` for the type + helpers shared with
  // /iss.
  const assemblyRef = createAssemblyRef();

  $effect(() => {
    syncAssemblyRef(assemblyRef, {
      open: assemblyOpen,
      playing: assemblyPlaying,
      progress: assemblyProgress,
    });
  });

  let requestMaterialRefresh: () => void = () => {};
  let resetCamera: () => void = () => {};

  $effect(() => {
    visualRef.selectedId = selected?.id ?? null;
    visualRef.panelOpen = panelOpen;
    requestMaterialRefresh();
  });

  const loc = $derived(localeFromPage($page));

  $effect(() => {
    const L = loc;
    let cancelled = false;
    void getTiangongModules(L)
      .then((list) => {
        if (!cancelled) modulesRD = success(list);
      })
      .catch((e) => {
        if (!cancelled) modulesRD = rdError(e instanceof Error ? e : new Error(String(e)));
      });
    void getTiangongVisitors(L)
      .then((list) => {
        if (!cancelled) visitorsRD = success(list);
      })
      .catch((e) => {
        if (!cancelled) visitorsRD = rdError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      cancelled = true;
    };
  });

  // Assembly playback bounds derived from the module list PLUS the
  // synthetic dock events. Chinarm rode up pre-installed on Tianhe
  // (same launch date) so it isn't given its own chip — the existing
  // Tianhe chip covers both, the chinarm mesh still flies in via
  // launchEpochOf('chinarm') in the animate loop.
  const assemblyPhases = $derived.by(() => {
    const moduleEntries = modules
      .filter((m) => m.launch_date && m.id !== 'chinarm')
      .map((m) => ({
        id: m.id,
        name: m.id === 'tianhe' ? `${m.name} + Chinarm` : m.name,
        launcher: m.launch_vehicle ?? '',
        date: m.launch_date,
        launch_epoch: Date.parse(m.launch_date),
        pickableId: m.id,
      }));
    const dockEntries = DOCK_EVENTS.map((d) => {
      // dock-tianzhou-2 → tianzhou panel; dock-shenzhou-12 → shenzhou.
      const pickableId = d.id.split('-')[1] ?? d.id;
      return {
        id: d.id,
        name: d.name,
        launcher: d.launcher,
        date: d.launch_date,
        launch_epoch: Date.parse(d.launch_date),
        pickableId,
      };
    });
    return [...moduleEntries, ...dockEntries].sort((a, b) => a.launch_epoch - b.launch_epoch);
  });
  const assemblyBounds = $derived.by(() => {
    if (assemblyPhases.length === 0) return { startEpoch: 0, endEpoch: 0 };
    return {
      startEpoch: assemblyPhases[0].launch_epoch,
      endEpoch: assemblyPhases[assemblyPhases.length - 1].launch_epoch,
    };
  });
  const assemblyNowEpoch = $derived.by(() => {
    if (assemblyPhases.length === 0) return 0;
    const map = buildPiecewiseMapping(
      assemblyPhases.map((p) => p.launch_epoch),
      ANIM_WINDOW_MS,
    );
    return map(assemblyProgress);
  });
  const assemblyChip = $derived.by(() => {
    if (!assemblyOpen) return null;
    const c = currentChip(assemblyPhases, assemblyNowEpoch);
    return c
      ? { name: c.name, launcher: c.launcher, date: c.date, pickableId: c.pickableId }
      : null;
  });

  // While assembly is playing, mirror the active phase's pickableId into
  // visualRef.hoveredId so the existing selection-styling outline lights
  // up the corresponding part of the station (modules + visiting craft).
  $effect(() => {
    if (!assemblyOpen) return;
    const hov = assemblyChip?.pickableId ?? null;
    visualRef.hoveredId = hov;
    canvasHoveredId = hov;
    requestMaterialRefresh();
  });

  let sortedModules = $derived(
    [...modules].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
  );
  let sortedVisitors = $derived(
    [...visitors].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
  );

  function urlWantsList(url: URL): boolean {
    return url.searchParams.get('view') === 'list';
  }
  function urlWants2dTop(url: URL): boolean {
    return url.searchParams.get('view') === '2d-top';
  }
  function urlWants2dSide(url: URL): boolean {
    return url.searchParams.get('view') === '2d-side';
  }
  function urlWants2dFront(url: URL): boolean {
    return url.searchParams.get('view') === '2d-front';
  }

  // Tiangong blueprint module list — hardcoded canonical positions
  // (Tianhe along X, Wentian +Y, Mengtian -Y, branches off forward node).
  // Names come from the loaded modules + visitors so they're localised.
  const blueprintModules = $derived.by(() => {
    if (modules.length === 0) return [] as BlueprintModule[];
    const all = [...modules, ...visitors];
    const nameById = new Map(all.map((m) => [m.id, m.name]));
    const layout: BlueprintModule[] = [
      {
        id: 'tianhe',
        name: nameById.get('tianhe') ?? 'Tianhe',
        x: 0,
        y: 0,
        z: 0,
        len: 2.6,
        radius: 0.22,
        axis: 'x',
      },
      // Wentian + Mengtian: long axis along Y, branching from Tianhe forward node
      {
        id: 'wentian',
        name: nameById.get('wentian') ?? 'Wentian',
        x: 1.44,
        y: 1.2,
        z: 0,
        len: 2.4,
        radius: 0.24,
        axis: 'y',
      },
      {
        id: 'mengtian',
        name: nameById.get('mengtian') ?? 'Mengtian',
        x: 1.44,
        y: -1.2,
        z: 0,
        len: 2.4,
        radius: 0.24,
        axis: 'y',
      },
      // Chinarm — small box rendered as a short cylinder
      {
        id: 'chinarm',
        name: nameById.get('chinarm') ?? 'Chinarm',
        x: 1.44,
        y: 0.55,
        z: 0.7,
        len: 1.1,
        radius: 0.04,
        axis: 'z',
      },
    ];
    if (visitors.length > 0) {
      // Shenzhou docks aft of Tianhe; Tianzhou docks forward of node.
      layout.push(
        {
          id: 'shenzhou',
          name: nameById.get('shenzhou') ?? 'Shenzhou',
          x: -1.95,
          y: 0,
          z: 0,
          len: 1.45,
          radius: 0.21,
          axis: 'x',
          kind: 'visitor',
        },
        {
          id: 'tianzhou',
          name: nameById.get('tianzhou') ?? 'Tianzhou',
          x: 2.55,
          y: 0,
          z: 0,
          len: 1.66,
          radius: 0.27,
          axis: 'x',
          kind: 'visitor',
        },
      );
    }

    // Tiangong solar arrays — gold/bronze gallium-arsenide. 4 wings on
    // Tianhe (2 pairs along ±Z, perpendicular to module long axis X);
    // 2 wings each at the outboard tips of Wentian (+Y end) and Mengtian
    // (−Y end). Arrays extend perpendicular to the module's long axis.
    //
    // Excluded by design: tiny detail bits (truss not present on
    // Tiangong — modules connect via the spherical hub, not a truss);
    // Chinarm-related rails (already shown as the chinarm module);
    // visiting-craft solar panels (would clutter; the visitor rectangles
    // already convey their presence).

    // Tianhe arrays: 4 wings deployed along ±Z from 2 mast positions
    // along Tianhe's X axis (aft half of the core).
    const tianheMastXs = [-tianheLen() * 0.45, -tianheLen() * 0.1];
    function tianheLen() {
      return 2.6;
    }
    for (const mastX of tianheMastXs) {
      for (const zSign of [-1, 1] as const) {
        layout.push({
          id: `tianhe_array_${mastX.toFixed(2)}_${zSign}`,
          name: '',
          x: mastX,
          y: 0,
          z: zSign * 1.2,
          len: 1.6, // wing length along Z (12.6m / 12.7 ≈ 1)
          radius: 0.18, // wing depth perpendicular (4.65m / 12.7 ≈ 0.37, half = 0.18)
          axis: 'z',
          kind: 'solar-gold',
        });
      }
    }

    // Wentian arrays: 2 wings at outboard tip (top of +Y), extending ±X.
    for (const xSign of [-1, 1] as const) {
      layout.push({
        id: `wentian_array_${xSign}`,
        name: '',
        x: xSign * 1.8,
        y: 2.4, // outboard tip of Wentian (z=0, y=1.2 + len/2 + offset)
        z: 0,
        len: 3.6, // 27m / 12.7 ≈ 2.13... using 3.6 to match the 3D model
        radius: 0.18,
        axis: 'x',
        kind: 'solar-gold',
      });
    }

    // Mengtian arrays: mirrored to -Y.
    for (const xSign of [-1, 1] as const) {
      layout.push({
        id: `mengtian_array_${xSign}`,
        name: '',
        x: xSign * 1.8,
        y: -2.4,
        z: 0,
        len: 3.6,
        radius: 0.18,
        axis: 'x',
        kind: 'solar-gold',
      });
    }

    return layout;
  });

  function cycleBlueprintView() {
    if (viewMode === '3d') {
      viewMode = '2d-top';
      stopThree();
      syncUrl({ view: '2d-top' });
    } else if (viewMode === '2d-top') {
      viewMode = '2d-side';
      syncUrl({ view: '2d-side' });
    } else if (viewMode === '2d-side') {
      viewMode = '2d-front';
      syncUrl({ view: '2d-front' });
    } else if (viewMode === '2d-front') {
      viewMode = '3d';
      syncUrl({ view: '3d' });
      void Promise.resolve().then(() => startThree());
    } else {
      viewMode = '2d-top';
      syncUrl({ view: '2d-top' });
    }
  }

  function blueprintModuleClick(id: string) {
    const all = [...modules, ...visitors];
    const mod = all.find((m) => m.id === id);
    if (mod) openModule(mod);
  }

  function deviceLowMemory(): boolean {
    if (!browser) return false;
    const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    return dm != null && dm <= 2;
  }

  const syncUrl = (partial: Parameters<typeof syncStationUrl>[1]) =>
    syncStationUrl('/tiangong', partial);

  function closePanel() {
    ignoreModuleParamUntilClear = true;
    selected = null;
    panelOpen = false;
    syncUrl({ moduleId: null });
  }

  function openModule(mod: TiangongModule) {
    selected = mod;
    panelOpen = true;
    syncUrl({ moduleId: mod.id });
  }

  $effect(() => {
    const id = $page.url.searchParams.get('module');
    if (modules.length === 0 && visitors.length === 0) return;
    if (!id) {
      ignoreModuleParamUntilClear = false;
      if (selected !== null || panelOpen) {
        selected = null;
        panelOpen = false;
      }
      return;
    }
    if (ignoreModuleParamUntilClear) return;
    const mod = modules.find((x) => x.id === id) ?? visitors.find((x) => x.id === id);
    if (mod && selected?.id !== mod.id) {
      selected = mod;
      panelOpen = true;
    }
  });

  function stopThree() {
    cleanupThree?.();
    cleanupThree = undefined;
    container?.replaceChildren();
  }

  // Defer `startThree()` until the container has actually been laid
  // out by the browser. queueMicrotask() / requestAnimationFrame() can
  // both run BEFORE the first layout pass on a cold mount, especially
  // on mobile where font-loading + nav animations delay first paint.
  // The renderer then reads container.clientWidth = 0, sets the canvas
  // to 0×0, and we get a black screen until something else triggers a
  // resize (e.g. navigating away and back). Issue #127.
  function startThreeWhenSized() {
    if (!container) return;
    if (container.clientWidth > 0 && container.clientHeight > 0) {
      startThree();
      return;
    }
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          ro.disconnect();
          startThree();
          return;
        }
      }
    });
    ro.observe(container);
  }

  function startThree() {
    if (!browser || !container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    if (!renderer.getContext()) {
      renderer.dispose();
      viewMode = 'list';
      syncUrl({ view: 'list' });
      return;
    }

    stopThree();

    // Single registry for every listener + disposable this scene
    // owns. Replaces the manual addEventListener/removeEventListener
    // pairs scattered across init + cleanupThree. See $lib/three/route-lifecycle.
    const lifecycle = createRouteLifecycle();

    // Quality tier (URL ?quality=… > user choice > cached detect-gpu >
    // medium fallback). See lib/quality/quality-tier.ts.
    const url = new URL(window.location.href);
    const quality = resolveQualitySync(url);
    void kickOffBackgroundDetect();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      500,
    );
    // T-silhouette: framed slightly off-axis so both Tianhe (along X) and the
    // Wentian/Mengtian cross-bar (along Y) are visible at first paint.
    // Camera doubled-out from the original (2.4, 2.6, 7.2) so the
    // station renders at ~50% apparent size by default — gives more
    // breathing room around the T-silhouette before user zoom.
    camera.position.set(4.2, 5.2, 14.4);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatioCap));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x04040c, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.dataset.testid = 'tiangong-canvas';
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', m.tiangong_canvas_aria());
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0.6, 0.0, 0);
    controls.update();

    // Shift+left-click → pan. OrbitControls handles this NATIVELY
    // when mouseButtons.LEFT === ROTATE (default) and shiftKey is set
    // — same fix story as /iss (see that file for the full note). No
    // mouseButtons swap; just flip the cursor for affordance.
    const onShiftKey = (e: KeyboardEvent, down: boolean) => {
      if (e.key !== 'Shift') return;
      renderer.domElement.style.cursor = down ? 'move' : '';
    };
    const onKeyDown = (e: KeyboardEvent) => onShiftKey(e, true);
    const onKeyUp = (e: KeyboardEvent) => onShiftKey(e, false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const initialCamPos = camera.position.clone();
    const initialTarget = controls.target.clone();
    const initialDistance = camera.position.distanceTo(controls.target);
    controls.minDistance = initialDistance * 0.6;
    controls.maxDistance = initialDistance * 3;

    const { composer, outlinePass, bloomPass } = createOutlinePassSetup({
      renderer,
      scene,
      camera,
      width: container.clientWidth,
      height: container.clientHeight,
      pixelRatioCap: quality.pixelRatioCap,
      bloom: quality.bloomEnabled
        ? {
            strength: quality.bloomStrength,
            radius: quality.bloomRadius,
            // #323 — Earth's lit day side is intrinsically bright;
            // lift the threshold ≥ 0.95 so ONLY the atmospheric limb
            // blooms (not the whole day side becoming a halo). Matches
            // /iss; both routes share the same Earth-from-low-orbit
            // composition problem.
            threshold: Math.max(quality.bloomThreshold, 0.95),
          }
        : null,
    });
    // DebugPanel bridge (#334).
    liveRenderer = renderer;
    liveQuality = quality;
    liveQualitySource = resolveQualitySource(url);
    liveBloomPass = bloomPass;
    activeQualityTier = quality.tier;

    // HemisphereLight for proper terminator contrast — matches the
    // ISS scene and the /fly helio scene's lighting model.
    scene.add(new THREE.HemisphereLight(0x303848, 0x000000, 0.55));
    const key = new THREE.DirectionalLight(0xfff4e8, 1.15);
    key.position.set(40, 24, 18);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 20;
    key.shadow.camera.far = 80;
    key.shadow.camera.left = -10;
    key.shadow.camera.right = 10;
    key.shadow.camera.top = 10;
    key.shadow.camera.bottom = -10;
    key.shadow.bias = -0.0008;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x6688ff, 0.35);
    fill.position.set(-30, -10, -40);
    scene.add(fill);

    // Layered cinematic star field — dim background + bright sparkle +
    // Milky Way band visible on the night side of Earth (#323). Counts
    // gated by quality tier so low-end devices render fewer points.
    scene.add(
      createLayeredStarField({
        counts: {
          dim: quality.starsDim,
          bright: quality.starsBright,
          milkyWay: quality.starsMilkyWay,
        },
        shellRadius: 180,
      }),
    );

    const texLoader = new THREE.TextureLoader();
    // ADR-073 Layer B — 2K Earth backdrop, lazy 4K on close approach.
    // Same mechanism as /iss; default camera frames the station with
    // Earth as far context so the swap rarely fires, but it stays
    // consistent with the surface routes.
    const earthBackdropTex2k = texLoader.load(`${base}/textures/2k_earth_daymap.jpg`);
    let earthBackdropTex4k: THREE.Texture | null = null;
    let earthBackdrop4kLoadStarted = false;
    let earthBackdropLodLevel: '2k' | '4k' = '2k';
    const earthBackdropMaterial = new THREE.MeshPhongMaterial({
      map: earthBackdropTex2k,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });
    const earthBackdrop = new THREE.Mesh(
      new THREE.SphereGeometry(42, 40, 40),
      earthBackdropMaterial,
    );
    earthBackdrop.position.set(0, -48, -120);
    // Rotate the Earth backdrop to its current GMST orientation so
    // page-load shows the actual hemisphere facing the camera at this
    // moment in UTC (#317).
    earthBackdrop.rotation.y = -gmstRadians();
    scene.add(earthBackdrop);
    function updateEarthBackdropLod(cameraToBackdropUnits: number): void {
      if (cameraToBackdropUnits <= 126) {
        if (!earthBackdrop4kLoadStarted) {
          earthBackdrop4kLoadStarted = true;
          texLoader.load(
            `${base}/textures/4k_earth_daymap.jpg`,
            (tex) => {
              earthBackdropTex4k = tex;
            },
            undefined,
            () => {
              earthBackdrop4kLoadStarted = false;
            },
          );
        }
        if (earthBackdropTex4k && earthBackdropLodLevel !== '4k') {
          earthBackdropMaterial.map = earthBackdropTex4k;
          earthBackdropMaterial.needsUpdate = true;
          earthBackdropLodLevel = '4k';
        }
      } else if (cameraToBackdropUnits >= 168 && earthBackdropLodLevel !== '2k') {
        earthBackdropMaterial.map = earthBackdropTex2k;
        earthBackdropMaterial.needsUpdate = true;
        earthBackdropLodLevel = '2k';
      }
    }

    const station = buildTiangongProxyStation();
    scene.add(station);

    // F.3 — microgravity axis overlay. Hidden by default; the lens
    // listener flips visibility. Tiangong's bounding box is similar
    // in scale to the ISS proxy so the same length works.
    const microgravityAxes = buildMicrogravityAxes(4);
    scene.add(microgravityAxes);
    const stopLensWatch = onLayerChange('microgravity', (on) => {
      microgravityAxes.visible = on;
    });

    const meshById = new Map<string, THREE.Mesh[]>();
    // Animation walks Mesh AND Group. Wentian/Mengtian solar pair groups
    // and the docked spacecraft groups (Shenzhou/Tianzhou) are animated
    // as a single unit so their children — including solar panels —
    // ride along with the parent. Skip any descendant whose ancestor is
    // already animatable to avoid the parent + children double-animating
    // out of sync. Selection styling (meshById) still walks every
    // pickable child Mesh.
    const allMeshes: { mesh: THREE.Object3D; id: string; kind: 'body' | 'appendage' | 'deploy' }[] =
      [];
    station.traverse((o) => {
      // Selection-styling registry — every pickable Mesh, regardless of
      // whether an ancestor is the animation root.
      if (o instanceof THREE.Mesh && o.userData.stationPickable && o.userData.moduleId) {
        const mid = o.userData.moduleId as string;
        const arr = meshById.get(mid) ?? [];
        arr.push(o);
        meshById.set(mid, arr);
      }
      const animId = (o.userData.animModuleId ?? o.userData.moduleId) as string | undefined;
      if (!animId) return;
      // Skip if any ancestor already carries an animatable id — the
      // ancestor's animation is responsible for this whole subtree.
      let p: THREE.Object3D | null = o.parent;
      while (p && p !== station) {
        if (p.userData.animModuleId || p.userData.moduleId) return;
        p = p.parent;
      }
      let kind: 'body' | 'appendage' | 'deploy';
      if (o.userData.deployAxis) kind = 'deploy';
      else if (o.userData.stationPickable) kind = 'body';
      else kind = 'appendage';
      allMeshes.push({ mesh: o, id: animId, kind });
    });
    // Cache resting transforms so the assembly animation can interpolate
    // from a "launched-from-above" pose back to home, then restore home
    // exactly when assembly mode exits.
    const meshHomes = captureHomes(allMeshes.map((m) => m.mesh));

    // Map animModuleId → launch epoch (ms). Pulled fresh each frame from
    // the loaded module list + the synthetic DOCK_EVENTS so any change
    // in either flows through without a separate reactive plumb.
    function launchEpochOf(id: string): number {
      const dock = DOCK_EVENTS.find((d) => d.id === id);
      if (dock) return Date.parse(dock.launch_date);
      const item = moduleListRef.list.find((x) => x.id === id);
      if (!item || !item.launch_date) return Number.NaN;
      return Date.parse(item.launch_date);
    }

    let assemblyLastWall = performance.now();
    let assemblyApplied = false;
    function applyAssemblyToScene(_timeSec: number) {
      if (!assemblyRef.active) {
        if (!assemblyApplied) return; // never touched — nothing to restore
        // Restore home transforms once on exit.
        for (const { mesh } of allMeshes) {
          const home = meshHomes.get(mesh);
          if (!home) continue;
          mesh.position.copy(home.pos);
          mesh.scale.copy(home.scale);
          mesh.visible = home.visible;
        }
        assemblyApplied = false;
        assemblyLastWall = performance.now();
        return;
      }
      // Auto-advance progress when playing. Pause holds it where the
      // user dragged it; manual scrub is the parent's responsibility.
      const wall = performance.now();
      const dt = wall - assemblyLastWall;
      assemblyLastWall = wall;
      if (assemblyRef.playing) {
        assemblyProgress = Math.min(1, assemblyRef.progress + dt / ASSEMBLY_DURATION_MS);
        if (assemblyProgress >= 1) assemblyPlaying = false;
      }
      // Combined module + dock-event timeline. Each gets its own slice
      // of playback so the 3 visiting spacecraft join in chronological
      // order with their own narrative chip + fly-in animation.
      const mods = modules.filter((x) => x.launch_date);
      if (mods.length === 0) return;
      const moduleEpochs = mods.map((x) => Date.parse(x.launch_date));
      const dockEpochs = DOCK_EVENTS.map((d) => Date.parse(d.launch_date));
      const epochs = [...moduleEpochs, ...dockEpochs];
      const startEpoch = Math.min(...epochs);
      const endEpoch = Math.max(...epochs);
      // Piecewise mapping: equal screen-time per distinct launch event.
      // Avoids dragging through the 15-month Tianhe→Wentian dead gap.
      const mapEpoch = buildPiecewiseMapping(epochs, ANIM_WINDOW_MS);
      const nowEpoch = mapEpoch(assemblyRef.progress);
      const state: AssemblyState = {
        active: true,
        nowEpoch,
        startEpoch,
        endEpoch,
      };
      // Each mesh's id is either a module id (tianhe, wentian, mengtian,
      // chinarm) or a synthetic dock-event id (dock-tianzhou-2,
      // dock-shenzhou-12, dock-shenzhou-15). All four module ids + all
      // three dock-event ids appear in launchEpochOf.
      for (const { mesh, id, kind } of allMeshes) {
        const home = meshHomes.get(mesh);
        if (!home) continue;
        const launchEpoch = launchEpochOf(id);
        if (Number.isNaN(launchEpoch)) {
          mesh.visible = home.visible;
          continue;
        }
        applyAssembly(mesh, home, state, launchEpoch, kind);
      }
      assemblyApplied = true;
    }

    function refreshMeshMaterials(timeSec: number) {
      refreshStationSelectionStyling({
        meshById,
        selectedId: visualRef.selectedId,
        panelOpen: visualRef.panelOpen,
        timeSec,
      });
      const hov = visualRef.hoveredId;
      const sel = visualRef.selectedId;
      const hoveredMeshes = hov && hov !== sel ? (meshById.get(hov) ?? []) : [];
      outlinePass.selectedObjects = hoveredMeshes;
    }

    const hoverLabelAnchor = new THREE.Vector3();
    function updateHoverLabel() {
      const hov = visualRef.hoveredId;
      if (!hov || !container) return hoverLabel?.hide();
      const mod = moduleListRef.list.find((x) => x.id === hov);
      const meshes = meshById.get(hov);
      if (!mod || !meshes || meshes.length === 0) return hoverLabel?.hide();
      meshes[0].getWorldPosition(hoverLabelAnchor);
      hoverLabelAnchor.project(camera);
      if (hoverLabelAnchor.z > 1 || hoverLabelAnchor.z < -1) return hoverLabel?.hide();
      const x = (hoverLabelAnchor.x * 0.5 + 0.5) * container.clientWidth;
      const y = (-hoverLabelAnchor.y * 0.5 + 0.5) * container.clientHeight;
      hoverLabel?.show(mod.name, x, y);
    }

    requestMaterialRefresh = () => refreshMeshMaterials(performance.now() / 1000);

    resetCamera = () => {
      camera.position.copy(initialCamPos);
      controls.target.copy(initialTarget);
      controls.update();
    };

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let dragSX = 0;
    let dragSY = 0;

    function onPointerDown(e: PointerEvent) {
      dragSX = e.clientX;
      dragSY = e.clientY;
    }

    function onPointerUp(e: PointerEvent) {
      const dx = e.clientX - dragSX;
      const dy = e.clientY - dragSY;
      if (dx * dx + dy * dy > 100) return;
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects([station], true);
      for (const h of hits) {
        let o: THREE.Object3D | null = h.object;
        while (o) {
          const mid = o.userData?.moduleId as string | undefined;
          if (o.userData?.stationPickable && mid) {
            const mod = moduleListRef.list.find((x) => x.id === mid);
            if (mod) openModule(mod);
            return;
          }
          o = o.parent;
        }
      }
    }

    function onPointerMove(e: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hoverHits = raycaster.intersectObjects([station], true);
      let found: string | null = null;
      for (const h of hoverHits) {
        let o: THREE.Object3D | null = h.object;
        while (o) {
          const mid = o.userData?.moduleId as string | undefined;
          if (o.userData?.stationPickable && mid) {
            found = mid;
            break;
          }
          o = o.parent;
        }
        if (found) break;
      }
      if (found !== visualRef.hoveredId) {
        visualRef.hoveredId = found;
        canvasHoveredId = found;
        refreshMeshMaterials(performance.now() / 1000);
      }
    }

    function onPointerLeave() {
      if (visualRef.hoveredId !== null) {
        visualRef.hoveredId = null;
        canvasHoveredId = null;
        refreshMeshMaterials(performance.now() / 1000);
      }
    }

    lifecycle.on(renderer.domElement, 'pointerdown', onPointerDown);
    lifecycle.on(renderer.domElement, 'pointerup', onPointerUp);
    lifecycle.on(renderer.domElement, 'pointermove', onPointerMove);
    lifecycle.on(renderer.domElement, 'pointerleave', onPointerLeave);

    // Test hook: project any pickable module to client-space pixels so
    // playwright can click a deterministic position instead of spiral-
    // searching the canvas (the spiral raced CI's software WebGL).
    //
    // Iterates pickable modules in insertion order, returning the first
    // one whose centre projects inside the canvas (NDC in (-1,1) on x/y
    // and z<1). Mobile viewports are narrow, so the first module is
    // not always on-screen. Forces world-matrix update so the test can
    // call this before the first render frame.
    interface OrreryTestApi {
      __tiangongPickAt(moduleId?: string): { x: number; y: number; moduleId: string } | null;
    }
    (window as unknown as OrreryTestApi).__tiangongPickAt = (moduleId?: string) => {
      camera.updateMatrixWorld(true);
      const tryMesh = (id: string) => {
        const meshes = meshById.get(id);
        if (!meshes || !meshes.length) return null;
        const mesh = meshes[0];
        mesh.updateMatrixWorld(true);
        const v = new THREE.Vector3();
        mesh.getWorldPosition(v);
        v.project(camera);
        if (v.x <= -1 || v.x >= 1 || v.y <= -1 || v.y >= 1 || v.z >= 1) return null;
        const rect = renderer.domElement.getBoundingClientRect();
        return {
          x: rect.x + (v.x * 0.5 + 0.5) * rect.width,
          y: rect.y + (-v.y * 0.5 + 0.5) * rect.height,
          moduleId: id,
        };
      };
      if (moduleId) return tryMesh(moduleId);
      for (const id of meshById.keys()) {
        const hit = tryMesh(id);
        if (hit) return hit;
      }
      return null;
    };

    const perfStart = performance.now();
    let perfFrames = 0;
    const spin = createSpinAccumulator();

    function onResize() {
      if (!container) return;
      camera.aspect = container.clientWidth / Math.max(1, container.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      composer.setSize(container.clientWidth, container.clientHeight);
      outlinePass.resolution.set(container.clientWidth, container.clientHeight);
    }
    lifecycle.on(window, 'resize', onResize);

    // raf pump with the TA.md document.hidden contract baked in —
    // see $lib/three/animate-loop. Replaces the prior hand-rolled
    // animate() + cancelAnimationFrame pair which never paused
    // when the tab backgrounded.
    const loop = createAnimateLoop({
      onFrame: () => {
        if (perfCheckPending) {
          perfFrames++;
          const elapsed = performance.now() - perfStart;
          if (elapsed >= 2000) {
            perfCheckPending = false;
            const fps = (perfFrames / elapsed) * 1000;
            // Skip the perf fallback under Playwright (navigator.webdriver)
            // — software-rasterizer WebGL on CI can't sustain 20 fps and
            // the auto-switch to list mode breaks canvas-click tests.
            // Real users on real hardware still get the fallback.
            const underTest = typeof navigator !== 'undefined' && navigator.webdriver === true;
            if (fps < 20 && viewBag.mode === '3d' && !underTest) {
              perfBanner = true;
              viewMode = 'list';
              stopThree();
              resetCamera = () => {};
              requestMaterialRefresh = () => {};
              syncUrl({ view: 'list' });
              return;
            }
          }
        }
        const t = performance.now() / 1000;
        spin.tick(t, autoSpin);
        station.rotation.y = spin.value() * 0.028;
        applyAssemblyToScene(t);
        // Sun-tracking solar arrays — slow continuous rotation around each
        // array's SADA axis (one full revolution every ~4 minutes).
        tickSunTrackingArrays(station, t);
        refreshMeshMaterials(t);
        controls.update();
        // ADR-073 Layer B — distance from the orbit camera to the
        // backdrop sphere's centre. Drives the 2K → 4K swap.
        const camToBackdrop = camera.position.distanceTo(earthBackdrop.position);
        updateEarthBackdropLod(camToBackdrop);
        composer.render();
        updateHoverLabel();
      },
    });
    lifecycle.add(loop.cleanup);
    loop.start();

    // Disposables that aren't a listener live alongside the lifecycle
    // teardowns. LIFO drain so loop.cleanup (registered earlier) runs
    // after these.
    if (stopLensWatch) lifecycle.add(stopLensWatch);
    lifecycle.add(() => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    });
    lifecycle.add(() => controls.dispose());
    lifecycle.add(() => disposeScene(scene));
    lifecycle.add(() => earthBackdropTex2k.dispose());
    // ADR-073 Layer B — dispose 4K backdrop texture held in closure.
    lifecycle.add(() => earthBackdropTex4k?.dispose());
    lifecycle.add(() => outlinePass.dispose());
    lifecycle.add(() => renderer.dispose());
    lifecycle.add(() => renderer.domElement.remove());

    cleanupThree = () => {
      lifecycle.cleanup();
      visualRef.hoveredId = null;
      hoverLabel?.hide();
      resetCamera = () => {};
      requestMaterialRefresh = () => {};
    };
  }

  function toggleViewMode() {
    if (viewMode === '3d') {
      viewMode = 'list';
      stopThree();
      syncUrl({ view: 'list' });
    } else {
      viewMode = '3d';
      perfCheckPending = true;
      syncUrl({ view: '3d' });
      queueMicrotask(() => startThreeWhenSized());
    }
  }

  onMount(() => {
    if (!browser) return;
    const u = get(page).url;
    if (window.matchMedia('(min-width: 768px)').matches) {
      indexOpen = true;
    }
    if (urlWantsList(u)) {
      viewMode = 'list';
    } else if (urlWants2dTop(u)) {
      viewMode = '2d-top';
    } else if (urlWants2dSide(u)) {
      viewMode = '2d-side';
    } else if (urlWants2dFront(u)) {
      viewMode = '2d-front';
    } else if (deviceLowMemory()) {
      lowMemBanner = true;
      viewMode = 'list';
      if (!urlWantsList(u)) syncUrl({ view: 'list' });
    } else {
      viewMode = '3d';
      queueMicrotask(() => startThreeWhenSized());
    }
  });

  onDestroy(() => stopThree());
</script>

<svelte:head><title>{m.tiangong_page_title()}</title></svelte:head>

{#if liveRenderer && liveQuality}
  <RenderingDebugRegistrar
    renderer={liveRenderer}
    quality={liveQuality}
    qualitySource={liveQualitySource}
    bloomPass={liveBloomPass}
  />
{/if}
<QualitySettingsModal {activeQualityTier} />

<div class="tiangong-root">
  {#if loadFailed}
    <p class="load-banner" role="alert">{m.tiangong_load_failed()}</p>
  {:else}
    <!-- Non-visual parallel mode (PRD-007 / GH #256 / ADR-025 v0.7.0).
         Screen-reader-only mirror of the canvas modules — the in-DOM
         drawer list already exists but aria-hidden flips with viewMode,
         so this is the always-accessible parallel surface. -->
    <ul class="sr-only sr-module-list" aria-label={m.a11y_tiangong_modules_list_aria()}>
      {#each sortedModules as mod (mod.id)}
        <li>
          <button
            type="button"
            onclick={() => openModule(mod)}
            aria-current={selected?.id === mod.id ? 'true' : undefined}
          >
            {m.a11y_select_module_template({ name: mod.name, agency: mod.agency })}
          </button>
        </li>
      {/each}
      {#each sortedVisitors as ship (ship.id)}
        <li>
          <button
            type="button"
            onclick={() => openModule(ship)}
            aria-current={selected?.id === ship.id ? 'true' : undefined}
          >
            {m.a11y_select_module_template({ name: ship.name, agency: ship.agency })}
          </button>
        </li>
      {/each}
    </ul>

    <div
      class="layer canvas-layer"
      bind:this={container}
      class:hidden={viewMode !== '3d'}
      aria-hidden={viewMode !== '3d'}
    ></div>

    {#if viewMode === '2d-top' || viewMode === '2d-side' || viewMode === '2d-front'}
      <div
        class="layer blueprint-layer"
        class:drawer-open={indexOpen}
        data-testid="tiangong-blueprint"
      >
        <StationBlueprint
          modules={blueprintModules}
          view={viewMode === '2d-top' ? 'top' : viewMode === '2d-side' ? 'side' : 'front'}
          selectedId={selected?.id ?? null}
          onModuleClick={blueprintModuleClick}
          ariaLabel="Tiangong blueprint diagram"
        />
      </div>
    {/if}

    <aside
      class="layer list-layer"
      class:drawer-mode={viewMode !== 'list'}
      class:fullscreen-mode={viewMode === 'list'}
      class:hidden={viewMode !== 'list' && !indexOpen}
      data-testid="tiangong-list-view"
      data-audio-stage="tiangong-module-list"
      aria-hidden={viewMode !== 'list' && !indexOpen}
      aria-label={m.tiangong_list_heading()}
    >
      {#if viewMode !== 'list'}
        <button
          type="button"
          class="index-close"
          onclick={() => (indexOpen = false)}
          aria-label={m.tiangong_index_close()}
          data-testid="tiangong-index-close"
        >
          ×
        </button>
      {/if}
      <h2 class="list-heading">{m.tiangong_list_heading()}</h2>
      <ul class="module-list">
        {#each sortedModules as mod (mod.id)}
          <li>
            <button
              type="button"
              class="module-row"
              class:canvas-hovered={canvasHoveredId === mod.id}
              onclick={() => openModule(mod)}
              onmouseenter={() => {
                visualRef.hoveredId = mod.id;
                requestMaterialRefresh();
              }}
              onmouseleave={() => {
                if (visualRef.hoveredId === mod.id) {
                  visualRef.hoveredId = null;
                  requestMaterialRefresh();
                }
              }}
              onfocus={() => {
                visualRef.hoveredId = mod.id;
                requestMaterialRefresh();
              }}
              onblur={() => {
                if (visualRef.hoveredId === mod.id) {
                  visualRef.hoveredId = null;
                  requestMaterialRefresh();
                }
              }}
              aria-current={selected?.id === mod.id ? 'true' : undefined}
            >
              <span class="mod-name-row">
                <span class="mod-name">{mod.name}</span>
                <AgencyBadge agency={mod.agency} />
              </span>
              <span class="mod-meta">{mod.agency}</span>
            </button>
          </li>
        {/each}
      </ul>
      {#if sortedVisitors.length > 0}
        <h2 class="list-heading list-heading-visitors">{m.tiangong_visitors_heading()}</h2>
        <ul class="module-list">
          {#each sortedVisitors as ship (ship.id)}
            <li>
              <button
                type="button"
                class="module-row"
                class:canvas-hovered={canvasHoveredId === ship.id}
                onclick={() => openModule(ship)}
                onmouseenter={() => {
                  visualRef.hoveredId = ship.id;
                  requestMaterialRefresh();
                }}
                onmouseleave={() => {
                  if (visualRef.hoveredId === ship.id) {
                    visualRef.hoveredId = null;
                    requestMaterialRefresh();
                  }
                }}
                onfocus={() => {
                  visualRef.hoveredId = ship.id;
                  requestMaterialRefresh();
                }}
                onblur={() => {
                  if (visualRef.hoveredId === ship.id) {
                    visualRef.hoveredId = null;
                    requestMaterialRefresh();
                  }
                }}
                aria-current={selected?.id === ship.id ? 'true' : undefined}
              >
                <span class="mod-name-row">
                  <span class="mod-name">{ship.name}</span>
                  <AgencyBadge agency={ship.agency} />
                </span>
                <span class="mod-meta">{ship.agency}</span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </aside>

    {#if timelineOpen}
      <div class="timeline-overlay" data-testid="tiangong-timeline">
        <button
          type="button"
          class="timeline-close"
          aria-label="Close timeline"
          title="Close timeline"
          onclick={() => (timelineOpen = false)}
        >
          ×
        </button>
        <StationTimelineStrip
          modules={sortedModules}
          visitors={sortedVisitors}
          selectedId={selected?.id}
          hoveredId={canvasHoveredId}
          heading="Tiangong assembly timeline — modules above, visiting spacecraft below"
          heroDir="tiangong-modules"
          onSelect={(item) => {
            const m = [...sortedModules, ...sortedVisitors].find((x) => x.id === item.id);
            if (m) openModule(m);
          }}
          onHover={(id) => {
            visualRef.hoveredId = id;
            canvasHoveredId = id;
            requestMaterialRefresh();
          }}
        />
      </div>
    {/if}

    {#if assemblyOpen}
      <StationAssemblyControl
        playing={assemblyPlaying}
        progress={assemblyProgress}
        startEpoch={assemblyBounds.startEpoch}
        endEpoch={assemblyBounds.endEpoch}
        durationMs={ASSEMBLY_DURATION_MS}
        latestChip={assemblyChip}
        onTogglePlay={() => {
          // If we're paused at the very end, treat play as "restart"
          // — clicking ▶ on a finished timeline should replay it.
          if (!assemblyPlaying && assemblyProgress >= 0.999) {
            assemblyProgress = 0;
          }
          assemblyPlaying = !assemblyPlaying;
        }}
        onScrub={(p) => {
          assemblyProgress = p;
          assemblyPlaying = false;
        }}
        onReset={() => {
          assemblyProgress = 0;
          assemblyPlaying = true;
        }}
        onClose={() => {
          assemblyOpen = false;
          assemblyPlaying = false;
        }}
        onChipClick={(pickableId) => {
          // Pause playback and open the panel for the active phase's
          // pickable target — exactly the same flow as clicking a row
          // in the MODULES drawer.
          assemblyPlaying = false;
          const target = [...sortedModules, ...sortedVisitors].find((x) => x.id === pickableId);
          if (target) openModule(target);
        }}
      />
    {/if}

    <!-- Edge handles: MODULES on the left edge (the modules drawer
         actually opens at left:12px), TIMELINE on the bottom edge
         (overlay slides up from below). Hidden in list mode where the
         page IS the modules list. -->
    {#if viewMode !== 'list'}
      <button
        type="button"
        class="edge-handle handle-left"
        data-testid="tiangong-view-toggle"
        aria-pressed={indexOpen}
        aria-label={m.tiangong_btn_modules_title()}
        title={m.tiangong_btn_modules_title()}
        onclick={() => (indexOpen = !indexOpen)}
      >
        <span class="handle-label">MODULES</span>
      </button>
      <button
        type="button"
        class="edge-handle handle-bottom"
        data-testid="tiangong-timeline-toggle"
        aria-pressed={timelineOpen}
        aria-label="Toggle Tiangong assembly timeline"
        title="Chronological timeline of when each Tiangong module + visitor joined the station"
        onclick={() => (timelineOpen = !timelineOpen)}
      >
        <span class="handle-label">TIMELINE</span>
      </button>
    {/if}

    <HoverLabel bind:this={hoverLabel} suppressed={viewMode !== '3d'} />

    <div class="hud-controls" role="group" aria-label={m.tiangong_hud_aria()}>
      {#if perfBanner}
        <p class="banner perf">{m.tiangong_fallback_perf()}</p>
      {/if}
      {#if lowMemBanner}
        <p class="banner mem">{m.tiangong_fallback_memory()}</p>
      {/if}
      <!-- Single hint row with min-height so the buttons row underneath
           doesn't jump when content changes between 3D ↔ 2D. The docked
           chip lives inline next to the drag-to-orbit chip in 3D; in
           2D modes it's replaced with view-axis info. -->
      <div class="ctrl-row hint-row">
        <span class="hint">{m.tiangong_hud_hint()}</span>
        {#if viewMode === '3d'}
          <span class="hint hint-docked">{m.tiangong_docked_legend()}</span>
        {:else if viewMode === '2d-top'}
          <span class="hint hint-docked">{m.tiangong_blueprint_view_top()}</span>
        {:else if viewMode === '2d-side'}
          <span class="hint hint-docked">{m.tiangong_blueprint_view_side()}</span>
        {:else if viewMode === '2d-front'}
          <span class="hint hint-docked">{m.tiangong_blueprint_view_front()}</span>
        {/if}
      </div>
      <!-- Single-row HUD: BLUEPRINT + RESET + SPIN + ASSEMBLY. TIMELINE
           and MODULES live on their own edge-handle buttons (bottom and
           right edges respectively) so the playback / view HUD stays
           compact. -->
      {#if viewMode !== 'list'}
        <div class="ctrl-row">
          <button
            type="button"
            class="toggle"
            data-testid="tiangong-blueprint-toggle"
            onclick={cycleBlueprintView}
            title={m.tiangong_btn_blueprint_title()}
          >
            {viewMode === '3d'
              ? m.tiangong_blueprint_label_3d()
              : viewMode === '2d-top'
                ? m.tiangong_blueprint_label_top()
                : viewMode === '2d-side'
                  ? m.tiangong_blueprint_label_side()
                  : m.tiangong_blueprint_label_front()}
          </button>
          <button
            type="button"
            class="toggle"
            data-testid="tiangong-reset-camera"
            onclick={() => resetCamera()}
            disabled={viewMode !== '3d'}
            title={m.tiangong_btn_reset_title()}
          >
            {m.tiangong_btn_reset()}
          </button>
          <button
            type="button"
            class="toggle"
            data-testid="tiangong-spin-toggle"
            aria-pressed={!autoSpin}
            onclick={() => (autoSpin = !autoSpin)}
            disabled={viewMode !== '3d'}
            title={m.tiangong_btn_spin_title()}
          >
            {m.tiangong_btn_spin()}
          </button>
          <button
            type="button"
            class="toggle"
            data-testid="tiangong-assembly-toggle"
            data-audio-stage="tiangong-assembly-toggle"
            aria-pressed={assemblyOpen}
            disabled={viewMode !== '3d'}
            onclick={() => {
              assemblyOpen = !assemblyOpen;
              if (assemblyOpen) {
                assemblyProgress = 0;
                assemblyPlaying = true;
              } else {
                assemblyPlaying = false;
              }
            }}
            title="Watch the station's modules join in chronological order"
          >
            ASSEMBLY
          </button>
        </div>
      {:else}
        <div class="ctrl-row">
          <button
            type="button"
            class="toggle"
            data-testid="tiangong-view-toggle"
            onclick={toggleViewMode}
          >
            {m.iss_view_3d()}
          </button>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Hidden tour anchors (PRD-016 §S11 / RFC-019 §12). -->
  <div class="tour-anchors" aria-hidden="true">
    <button
      type="button"
      data-audio-stage="tiangong-select-tianhe"
      tabindex="-1"
      onclick={() => blueprintModuleClick('tianhe')}>select tianhe</button
    >
    <button
      type="button"
      data-audio-stage="tiangong-select-wentian"
      tabindex="-1"
      onclick={() => blueprintModuleClick('wentian')}>select wentian</button
    >
    <button
      type="button"
      data-audio-stage="tiangong-select-mengtian"
      tabindex="-1"
      onclick={() => blueprintModuleClick('mengtian')}>select mengtian</button
    >
  </div>

  <StationModulePanel
    module={selected}
    open={panelOpen}
    onClose={closePanel}
    galleryFetcher={getTiangongModuleGallery}
  />

  <!-- Orbital regime banner — Tier-1 lens-gated explainer (F.1+F.2). -->
  <StationOrbitBanner
    stationName="Tiangong"
    altitudeKm={385}
    inclinationDeg={41.5}
    periodMin={91.9}
  />

  <!-- Microgravity axes legend — pairs with the 3D ArrowHelpers added
       inside startThree() when the 'microgravity' layer is on. -->
  <MicrogravityAxesLegend />

  <!-- /tiangong Layers panel — only the microgravity layer is
       meaningful on this route today. Default-on. -->
  <ScienceLayersPanel available={['microgravity']} />
</div>

<style>
  .tiangong-root {
    position: absolute;
    inset: var(--nav-height) 0 0 0;
    overflow: hidden;
    background: #04040c;
  }
  /* Screen-reader-only — visually hidden, kept in tab order + a11y tree.
     Used for the non-visual parallel module list (GH #256). */
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
  .layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .canvas-layer {
    touch-action: none;
  }
  .blueprint-layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
  }
  /* When the modules drawer is open in 2D mode, shrink the blueprint
     so the drawer's not covering the diagram. Drawer is at left:12px
     width 300px on desktop, so the blueprint starts at left ~324px. */
  @media (min-width: 768px) {
    .blueprint-layer.drawer-open {
      left: 324px;
      width: calc(100% - 324px);
    }
  }
  .layer.hidden {
    display: none;
  }
  .list-layer.fullscreen-mode {
    overflow: auto;
    padding: 72px 16px 24px;
    -webkit-overflow-scrolling: touch;
  }
  .list-layer.drawer-mode {
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    /* Prevent scroll chaining to the 3D canvas behind the drawer — without
       this, when the user reaches the drawer's scroll boundary, the wheel
       event propagates to OrbitControls and zooms the camera instead. */
    overscroll-behavior: contain;
    position: absolute;
    inset: auto;
    top: 152px;
    left: 12px;
    bottom: 12px;
    /* The base .layer rule sets width:100%;height:100% — explicitly
       reset both here so the absolute top/bottom anchors take effect.
       Without this, drawer height = 100vh (extending past the viewport
       bottom) and the rest of the modules list ends up clipped instead
       of triggering the drawer's own scroll. */
    width: min(300px, calc(100vw - 24px));
    height: auto;
    background: rgba(8, 10, 22, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    backdrop-filter: blur(8px);
    z-index: 5;
    padding: 16px 16px 16px 16px;
  }
  @media (max-width: 767px) {
    .list-layer.drawer-mode {
      top: auto;
      bottom: 0;
      left: 0;
      right: 0;
      width: 100%;
      max-height: 65vh;
      border-radius: 12px 12px 0 0;
      border-bottom: 0;
      padding-top: 24px;
    }
  }
  .index-close {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 36px;
    height: 36px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    z-index: 1;
  }
  .index-close:hover,
  .index-close:focus-visible {
    border-color: rgba(78, 205, 196, 0.55);
    color: #4ecdc4;
    outline: none;
  }
  .list-heading {
    font-family: var(--font-display);
    font-size: 18px;
    letter-spacing: 4px;
    color: rgba(255, 255, 255, 0.85);
    margin: 0 0 16px;
  }
  .list-heading-visitors {
    margin-top: 28px;
    color: rgba(78, 205, 196, 0.85);
  }
  /* Touch devices: no hover, suppress the label entirely.
     Component-side .hover-label lives in $lib/components/HoverLabel.svelte. */
  @media (hover: none) {
    :global(.hover-label) {
      display: none;
    }
  }
  .module-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 560px;
  }
  .module-row {
    width: 100%;
    min-height: 48px;
    padding: 12px 14px;
    text-align: left;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    color: #fff;
    cursor: pointer;
    transition:
      border-color 120ms,
      background 120ms;
  }
  .module-row:hover,
  .module-row:focus-visible,
  .module-row.canvas-hovered {
    border-color: rgba(68, 102, 255, 0.55);
    background: rgba(68, 102, 255, 0.12);
    outline: none;
  }
  .module-row[aria-current='true'] {
    border-color: #4ecdc4;
    background: rgba(78, 205, 196, 0.16);
    color: #fff;
  }
  .module-row[aria-current='true']:hover,
  .module-row[aria-current='true']:focus-visible,
  .module-row[aria-current='true'].canvas-hovered {
    border-color: #4ecdc4;
    background: rgba(78, 205, 196, 0.24);
  }
  .mod-name-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .mod-name {
    display: block;
    font-family: var(--font-display);
    font-size: 15px;
    letter-spacing: 2px;
  }
  .mod-meta {
    display: block;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.4);
    margin-top: 4px;
  }
  .hud-controls {
    position: absolute;
    top: 10px;
    left: 12px;
    z-index: 6;
    display: flex;
    flex-direction: column;
    gap: 8px;
    /* Was 300px (matched drawer width); bumped to 380px so the 5-button
       toggle row (BLUEPRINT / RESET / SPIN / MODULES / TIMELINE) fits
       on a single visual line instead of wrapping TIMELINE underneath. */
    width: min(380px, calc(100vw - 24px));
    pointer-events: none;
  }
  .timeline-overlay {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 5;
    pointer-events: auto;
  }
  .timeline-close {
    position: absolute;
    top: 4px;
    right: 8px;
    z-index: 6;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 50%;
    color: rgba(255, 255, 255, 0.85);
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    transition:
      background 120ms,
      border-color 120ms,
      color 120ms;
  }
  .timeline-close:hover,
  .timeline-close:focus-visible {
    background: rgba(0, 0, 0, 0.75);
    border-color: rgba(255, 255, 255, 0.4);
    color: #fff;
    outline: none;
  }
  .hud-controls :global(button),
  .hud-controls :global(.toggle) {
    pointer-events: auto;
  }
  .ctrl-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  /* Edge handles — pinned to the .tiangong-root edge from which the
     panel they open will appear. Vertical on the left edge for MODULES,
     horizontal at the bottom for TIMELINE. position:absolute (not fixed)
     so they ride below the global nav and don't overlap unrelated UI. */
  .edge-handle {
    position: absolute;
    background: rgba(8, 10, 22, 0.82);
    color: rgba(255, 255, 255, 0.78);
    border: 1px solid rgba(255, 255, 255, 0.18);
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    padding: 0;
    cursor: pointer;
    z-index: 10;
    pointer-events: auto;
    backdrop-filter: blur(4px);
  }
  .edge-handle:hover {
    background: rgba(40, 50, 80, 0.92);
    color: #fff;
  }
  .edge-handle:focus-visible {
    outline: 2px solid #6fb3ff;
    outline-offset: 2px;
  }
  .edge-handle[aria-pressed='true'] {
    background: rgba(60, 110, 200, 0.85);
    color: #fff;
    border-color: rgba(120, 180, 255, 0.55);
  }
  .handle-left {
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 28px;
    height: 110px;
    border-top-right-radius: 6px;
    border-bottom-right-radius: 6px;
    border-left: none;
  }
  .handle-left .handle-label {
    display: inline-block;
    writing-mode: vertical-rl;
  }
  .handle-bottom {
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    height: 24px;
    min-width: 110px;
    padding: 0 14px;
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
    border-bottom: none;
  }
  .handle-bottom .handle-label {
    display: inline-block;
    line-height: 22px;
  }
  .hint {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.45);
    background: rgba(8, 10, 22, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 6px 10px;
    border-radius: 4px;
    pointer-events: none;
  }
  /* Reserve enough vertical space for the longest possible 3D content
     (docked legend can wrap to ~2 lines at 300 px width) so the
     buttons row below doesn't shift when switching between 3D and 2D
     modes. */
  .hint-row {
    min-height: 56px;
    align-content: flex-start;
  }
  .toggle {
    min-width: 44px;
    min-height: 44px;
    padding: 0 8px;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid rgba(68, 102, 255, 0.4);
    color: #dde4ff;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.04em;
    border-radius: 4px;
    cursor: pointer;
    backdrop-filter: blur(6px);
    pointer-events: auto;
    white-space: nowrap;
  }
  .toggle:hover,
  .toggle:focus-visible {
    border-color: #4466ff;
    outline: none;
  }
  .toggle:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    border-color: rgba(68, 102, 255, 0.18);
  }
  .toggle:disabled:hover {
    border-color: rgba(68, 102, 255, 0.18);
  }
  .banner {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.04em;
    line-height: 1.45;
    color: #ffc850;
    background: rgba(255, 200, 80, 0.12);
    border: 1px solid rgba(255, 200, 80, 0.35);
    padding: 8px 10px;
    border-radius: 4px;
    margin: 0;
    pointer-events: none;
  }
  .banner.mem {
    color: #4ecdc4;
    border-color: rgba(78, 205, 196, 0.45);
    background: rgba(78, 205, 196, 0.1);
  }
  .load-banner {
    padding: 24px;
    font-family: 'Space Mono', monospace;
    color: #ff8c8c;
  }
  @media (max-width: 500px) {
    .hud-controls {
      left: 8px;
      top: 8px;
    }
  }
</style>
