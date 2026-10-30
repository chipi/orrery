<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount, onDestroy } from 'svelte';
  import { audio } from '$lib/audio-state.svelte';
  import { trackItemClick } from '$lib/analytics';
  import { page } from '$app/state';
  import { base } from '$app/paths';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import { createSpinAccumulator } from '$lib/three/spin-accumulator';
  import { createLayeredStarField } from '$lib/three/star-field';
  import { tickSunTrackingArrays } from '$lib/three/sun-tracking';
  import { createAnimateLoop } from '$lib/three/animate-loop';
  import { attachFrameMonitor, type FrameMonitorHandle } from '$lib/quality/frame-monitor';
  import { createRouteLifecycle } from '$lib/three/route-lifecycle';
  import { syncStationUrl } from '$lib/routes/sync-station-url';
  import { createStationSelectionService } from '$lib/station-selection.svelte';
  import { refreshStationSelectionStyling } from '$lib/three/station-selection-styling';
  import HoverLabel from '$lib/components/HoverLabel.svelte';
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
  import EnterArButton from '$lib/components/EnterArButton.svelte';
  import { launchArScene } from '$lib/ar/launch-ar';
  import type { QualitySource } from '$lib/components/debug-panel-context';
  import type { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
  import { disposeScene } from '$lib/three/dispose-object3d';
  import { gmstRadians } from '$lib/physics/ephemeris/earth-sidereal';
  import { heroEnvironment } from '$lib/three/hero-materials';
  import { localeFromPage, localHref } from '$lib/locale';
  import { buildMicrogravityAxes } from '$lib/microgravity-axes';
  import { onLayerChange } from '$lib/science-layers';
  import MicrogravityAxesLegend from '$lib/components/MicrogravityAxesLegend.svelte';
  import type { StationModule, StationRouteConfig } from '$lib/station-route';
  import StationModulePanel from '$lib/components/StationModulePanel.svelte';
  import StationOrbitBanner from '$lib/components/StationOrbitBanner.svelte';
  import ScienceLayersPanel from '$lib/components/ScienceLayersPanel.svelte';
  import StationBlueprint from '$lib/components/StationBlueprint.svelte';
  import AgencyBadge from '$lib/components/AgencyBadge.svelte';
  import StationTimelineStrip from '$lib/components/StationTimelineStrip.svelte';
  import StationAssemblyControl from '$lib/components/StationAssemblyControl.svelte';
  import MobileDrawerGroup from '$lib/components/MobileDrawerGroup.svelte';
  import { viewport } from '$lib/viewport.svelte';
  import {
    type AssemblyState,
    ANIM_WINDOW_MS,
    captureHomes,
    applyAssembly,
    currentChip,
    buildPiecewiseMapping,
  } from '$lib/station-assembly-anim';
  import { createAssemblyRef, syncAssemblyRef } from '$lib/station-assembly-state';
  import * as m from '$lib/paraglide/messages';
  import { cue } from '$lib/sensory/feedback';
  import { gyro } from '$lib/sensory/device-orientation';
  import { applyGyroOrbit } from '$lib/sensory/gyro-orbit';
  import {
    type RemoteData,
    loading,
    success,
    error as rdError,
    isSuccess,
    isError,
  } from '$lib/types/remote-data';

  let { config }: { config: StationRouteConfig } = $props();

  let container: HTMLDivElement | undefined = $state();

  // DebugPanel "Rendering" tab bridge (#334).
  let liveRenderer: THREE.WebGLRenderer | null = $state(null);
  let liveQuality: QualityConfig | null = $state(null);
  let liveQualitySource: QualitySource = $state('fallback');
  let liveBloomPass: UnrealBloomPass | null = $state(null);
  let liveFrameMonitor: FrameMonitorHandle | null = $state(null);
  // QualitySettingsModal bridge (#339).
  let activeQualityTier: QualityTier = $state('medium');
  // RemoteData migration (#8 / #5 Phase F follow-up). Internal state holds
  // the discriminated union; legacy field names (modules, visitors,
  // loadFailed) stay as $derived shims so the ~9 read sites in this
  // file don't need to be rewritten.
  let modulesRD = $state<RemoteData<Error, StationModule[]>>(loading());
  let visitorsRD = $state<RemoteData<Error, StationModule[]>>(loading());
  const modules = $derived(isSuccess(modulesRD) ? modulesRD.data : ([] as StationModule[]));
  const visitors = $derived(isSuccess(visitorsRD) ? visitorsRD.data : ([] as StationModule[]));
  const loadFailed = $derived(isError(modulesRD) || isError(visitorsRD));
  let viewMode: '3d' | '2d-top' | '2d-side' | '2d-front' | 'list' = $state('3d');
  // Module / visiting-vehicle selection — single source of truth in the
  // shared station-selection service (replaces the former `selected` +
  // `panelOpen` + `canvasHoveredId` cells written in lockstep at every
  // consumer). Named `selection` not `station` to avoid shadowing the
  // local Three.js station Group inside startThree(). See
  // $lib/station-selection.
  const selection = createStationSelectionService<StationModule>({
    onCommit: (item) => syncStationUrl(`/${config.id}`, { moduleId: item?.id ?? null }),
  });

  // Auto-compact the audio overlay when a module panel opens during any
  // active playback (PRD-016 §S8 / RFC-019 §12). Gate on currentEpisode +
  // open (not just tourActive) so single-episode plays compact too — else
  // the full-width overlay covers the module panel the narrator opened.
  $effect(() => {
    // Two valid gates: an active multi-episode tour OR a single-episode
    // play with the overlay open. Tests prime only `tourActive` (the
    // older gate); product runtime keeps the newer `currentEpisode &&
    // open` path so single-episode plays still compact too.
    const tourFlow = audio.tourActive;
    const singleEpisodeFlow = audio.currentEpisode != null && audio.open;
    if ((tourFlow || singleEpisodeFlow) && selection.state.panelOpen && !audio.compact) {
      audio.compact = true;
    }
  });
  // Scroll the selected module's row into view in the list — the tour
  // selects modules far down the list (e.g. Zarya at the Russian end), so
  // without this the highlighted row sits off-screen. User direction.
  $effect(() => {
    const id = selection.state.selectedId;
    if (!id || typeof document === 'undefined') return;
    requestAnimationFrame(() => {
      document
        .querySelector(
          `[data-audio-stage="${config.id}-module-list"] .module-row[aria-current="true"]`,
        )
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
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

  let hoverLabel: HoverLabel | undefined = $state();

  // Reactive canvas-hover mirror now lives in `selection.state.hoveredId`
  // (set alongside visualRef.hoveredId in the pointer-move handler) so
  // the sidebar list can visually echo the canvas hover.

  let cleanupThree: (() => void) | undefined;
  let perfCheckPending = true;

  /** Fresh view mode for rAF perf gate (avoids a stale `viewMode` read). */
  const viewBag = { mode: '3d' as '3d' | '2d-top' | '2d-side' | '2d-front' | 'list' };

  /** Pick handler reads latest list (avoids stale closure). */
  const moduleListRef: { list: StationModule[] } = { list: [] };
  $effect(() => {
    moduleListRef.list = [...modules, ...visitors];
    viewBag.mode = viewMode;
  });

  /** Hover + selection styling inside the Three scene (synced from state below). */
  const visualRef: {
    selectedId: string | null;
    panelOpen: boolean;
    hoveredId: string | null;
  } = { selectedId: null, panelOpen: false, hoveredId: null };

  // Shared between Svelte state + the Three.js animate() closure. Updating
  // any field on the next frame applies it in-scene — no event plumbing.
  // See `$lib/station-assembly-state` for the type + helpers shared by
  // both station routes.
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
    visualRef.selectedId = selection.state.selectedId;
    visualRef.panelOpen = selection.state.panelOpen;
    requestMaterialRefresh();
  });

  const loc = $derived(localeFromPage(page));

  $effect(() => {
    const L = loc;
    let cancelled = false;
    void config
      .loadModules(L)
      .then((list) => {
        if (!cancelled) modulesRD = success(list);
      })
      .catch((e) => {
        if (!cancelled) modulesRD = rdError(e instanceof Error ? e : new Error(String(e)));
      });
    void config
      .loadVisitors(L)
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

  let sortedModules = $derived(
    [...modules].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
  );
  let sortedVisitors = $derived(
    [...visitors].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
  );

  // Assembly playback bounds: every module with a launch_date contributes
  // a phase, plus the station's synthetic visitor dock events (first-arrival
  // missions) and truss install phases. Sorted by launch_epoch so the chip
  // narrative replays the real chronology.
  const assemblyPhases = $derived.by(() => {
    const moduleEntries = modules
      .filter((m) => m.launch_date && !config.assembly.skipModuleChip?.(m.id))
      .map((m) => ({
        id: m.id,
        name: config.assembly.moduleChipName?.(m) ?? m.name,
        launcher: m.launch_vehicle ?? '',
        date: m.launch_date,
        launch_epoch: Date.parse(m.launch_date),
        pickableId: m.id,
      }));
    const dockEntries = config.assembly.dockEvents.map((d) => ({
      id: d.id,
      name: d.name,
      launcher: d.launcher,
      date: d.launch_date,
      launch_epoch: Date.parse(d.launch_date),
      pickableId: config.assembly.dockPickableId(d.id),
    }));
    // Truss / iROSA install phases (ISS only) — no module/visitor to highlight,
    // so pickableId is null. Chip stays as a date narrative; click is a
    // no-op (onChipClick falls through when find() returns undefined).
    const trussEntries = config.assembly.trussPhases.map((t) => ({
      id: t.id,
      name: t.name,
      launcher: t.launcher,
      date: t.launch_date,
      launch_epoch: Date.parse(t.launch_date),
      pickableId: null as string | null,
    }));
    return [...moduleEntries, ...dockEntries, ...trussEntries].sort(
      (a, b) => a.launch_epoch - b.launch_epoch,
    );
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
  // visualRef.hoveredId so the existing selection-styling outline
  // lights up the corresponding part of the station (modules + craft).
  $effect(() => {
    if (!assemblyOpen) return;
    const hov = assemblyChip?.pickableId ?? null;
    visualRef.hoveredId = hov;
    selection.state.hoveredId = hov;
    requestMaterialRefresh();
  });

  const blueprintModules = $derived.by(() => config.blueprint.build(modules, visitors));

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
      // Restart 3D scene
      void Promise.resolve().then(() => startThree());
    } else {
      // From list, jump to top
      viewMode = '2d-top';
      syncUrl({ view: '2d-top' });
    }
  }

  function blueprintModuleClick(id: string) {
    const mod = modules.find((m) => m.id === id) ?? visitors.find((v) => v.id === id);
    if (mod) {
      cue('select');
      openModule(mod);
      trackItemClick('module', id, `/${config.id}`);
    }
  }

  function deviceLowMemory(): boolean {
    if (!browser) return false;
    const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    return dm != null && dm <= 2;
  }

  const syncUrl = (partial: Parameters<typeof syncStationUrl>[1]) =>
    syncStationUrl(`/${config.id}`, partial);

  function closePanel() {
    ignoreModuleParamUntilClear = true;
    // reset() fires onCommit(null) → clears ?module.
    selection.reset();
  }

  function openModule(mod: StationModule) {
    // open() fires onCommit(mod) → sets ?module=<id> (no debounce).
    selection.open(mod);
  }

  // Roving keyboard nav across BOTH lists as one continuous sequence:
  // Down from the last module flows into the first visiting vehicle, and
  // the whole run wraps round at the very ends. Home/End jump to the
  // first module / last visitor.
  //
  // Arrows move DOM FOCUS ONLY — the committed selection (teal
  // aria-current) and the open panel stay put while you traverse. Each
  // focused row's onfocus lights the canvas-hover outline so you preview
  // where you are without committing. Enter/Space open the focused row
  // (native button onclick → openModule, immediate); Esc closes.
  //
  // The nav order is read live from the DOM at keypress time — every
  // `.module-row` button inside the list aside, in document order
  // (modules <ul> then visitors <ul>). This deliberately avoids a
  // flattened ref array indexed by `sortedModules.length + j`: modules
  // and visitors load as two independent async fetches, so that index is
  // racy (visitors resolving first bind at the wrong offset). DOM order
  // is always correct once rendered.
  function onRowKeydown(e: KeyboardEvent) {
    const btn = e.currentTarget as HTMLButtonElement;
    if (e.key === 'Escape') {
      closePanel();
      return;
    }
    const root = btn.closest(`[data-testid="${config.id}-list-view"]`);
    if (!root) return;
    const rows = Array.from(root.querySelectorAll<HTMLButtonElement>('button.module-row'));
    const cur = rows.indexOf(btn);
    const n = rows.length;
    if (n === 0 || cur === -1) return;
    let next: number;
    if (e.key === 'ArrowDown') next = (cur + 1) % n;
    else if (e.key === 'ArrowUp') next = (cur - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else return;
    e.preventDefault();
    // Focus only — selection is committed on Enter/click, not on move.
    rows[next]?.focus();
  }

  $effect(() => {
    const id = page.url.searchParams.get('module');
    if (modules.length === 0 && visitors.length === 0) return;
    if (!id) {
      ignoreModuleParamUntilClear = false;
      // URL is canonical source: no `module` param means no open panel.
      if (selection.state.selectedId !== null || selection.state.panelOpen) {
        selection.reset();
      }
      return;
    }
    if (ignoreModuleParamUntilClear) return;
    const mod = modules.find((x) => x.id === id) ?? visitors.find((x) => x.id === id);
    if (mod && selection.state.selectedId !== mod.id) {
      selection.open(mod);
    }
  });

  function stopThree() {
    cleanupThree?.();
    cleanupThree = undefined;
    // Imperative teardown of the Three.js canvas mounted below — not a
    // Svelte-managed node.
    // eslint-disable-next-line svelte/no-dom-manipulating
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
    // Subscribe to the container's first non-zero size. ResizeObserver
    // fires after layout, which is the signal we actually need.
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
    // medium fallback). Sync resolver so the scene builds without
    // awaiting the GPU benchmark; the background detect updates the
    // cache for the next visit. See lib/quality/quality-tier.ts.
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
    camera.position.set(...config.camera.position);
    // Mobile / portrait: the station spans much wider than it is tall, so a
    // portrait viewport (aspect < 1) clips the solar arrays on load. Pull the
    // camera straight back in proportion to how narrow the frame is so the
    // whole station fits — mirrors the planet globe-fit on /moon + /mars.
    // Per-station numbers live in the route config (camera.*).
    {
      const aspect0 = container.clientWidth / Math.max(1, container.clientHeight);
      if (aspect0 < 1) {
        const { portraitMaxScale, portraitMinAspect } = config.camera;
        camera.position.multiplyScalar(
          Math.min(portraitMaxScale, 1 / Math.max(portraitMinAspect, aspect0)),
        );
      }
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatioCap));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x04040c, 1);
    // ACES filmic tone mapping — HDR → SDR roll-off that keeps
    // highlights from clipping flat-white when the bloom pass +
    // bright Earth backdrop stack on the sun-lit side of the station.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    // Hero IBL — the PBR station proxy (MeshStandard) gets real reflections.
    // The Earth backdrop is MeshPhong (unaffected); ACES is already on above.
    scene.environment = heroEnvironment(renderer);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.dataset.testid = `${config.id}-canvas`;
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', config.msg.canvasAria());
    // Mounting the WebGL canvas into its container — the one supported way to
    // attach a Three.js renderer.
    // eslint-disable-next-line svelte/no-dom-manipulating
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(...config.camera.target);
    controls.update();

    // Gyro tilt-to-look (RFC-020 §6): pause while the user is orbiting by hand
    // and re-home for 200ms after (T-B), so a drag-release doesn't snap.
    let gyroOrbiting = false;
    controls.addEventListener('start', () => (gyroOrbiting = true));
    controls.addEventListener('end', () => {
      gyroOrbiting = false;
      gyro.recordTouchEnd();
    });

    // Shift+left-click → pan. OrbitControls handles this NATIVELY:
    // when mouseButtons.LEFT === MOUSE.ROTATE (the default) and the
    // pointerdown carries shiftKey, OrbitControls swaps the action to
    // PAN inside its own switch statement. So no mouseButtons swap is
    // needed — and an earlier attempt that DID swap mouseButtons on
    // Shift down actually BROKE pan, because OrbitControls then saw
    // (mouseButtons.LEFT === PAN) + shiftKey and swapped it BACK to
    // ROTATE per the symmetric branch in its source. Net effect was
    // "cursor changes, no action" (2026-06-15 user report). Now we
    // only flip the cursor for affordance and let OrbitControls do
    // its job.
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
            // blooms (not the whole day side becoming a halo). The
            // base tier value (0.9–0.94) is tuned for /fly's helio
            // scene where bright Sun + dim planets give bloom room
            // to breathe — different here.
            threshold: Math.max(quality.bloomThreshold, 0.95),
          }
        : null,
    });
    // DebugPanel bridge (#334).
    liveRenderer = renderer;
    liveQuality = quality;
    liveQualitySource = resolveQualitySource(url);
    liveBloomPass = bloomPass;
    // Drive the DebugPanel Rendering tab's frame-monitor readout uniformly
    // with the other 3D routes (#89). Observability only — onStruggle no-op.
    const frameMonitor = attachFrameMonitor({ onStruggle: () => {} });
    liveFrameMonitor = frameMonitor;
    lifecycle.add(() => frameMonitor.stop());
    activeQualityTier = quality.tier;

    // HemisphereLight gives a proper sky/ground contrast for the
    // terminator — sun-lit surfaces lean warm, shadowed surfaces sink
    // into deep blue rather than the flat ambient grey. Matches the
    // /fly helio scene's lighting model. Sky tinted faint blue-white;
    // ground is black (no albedo to bounce from in orbital vacuum).
    // Light intensities × Math.PI to restore the r128 look under three r155+'s
    // physically-correct lighting default (#203 / RFC-021 §5).
    scene.add(new THREE.HemisphereLight(0x303848, 0x000000, 0.55 * Math.PI));
    const key = new THREE.DirectionalLight(0xfff4e8, 1.15 * Math.PI);
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
    const fill = new THREE.DirectionalLight(0x6688ff, 0.35 * Math.PI);
    fill.position.set(-30, -10, -40);
    scene.add(fill);

    // Layered cinematic star field — dim background + bright sparkle +
    // Milky Way band visible on the night side of Earth (#323).
    // Counts gated by quality tier so low-end devices render fewer
    // points. shellRadius matches the prior single-layer call.
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
    // The default camera frames the station with Earth as far
    // context so the threshold rarely fires in normal use; the swap
    // exists so a deliberate zoom toward the backdrop reads sharply
    // and stays consistent with the surface routes.
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
    // moment in UTC (#317). The texture's prime-meridian-up default
    // is correct at GMST=0; subtracting the current GMST yaws it so
    // the longitude under the camera matches local time on Earth.
    earthBackdrop.rotation.y = -gmstRadians(new Date());
    scene.add(earthBackdrop);
    function updateEarthBackdropLod(cameraToBackdropUnits: number): void {
      // __MOBILE__: 4k_earth_daymap.jpg is pruned off-device (ADR-079 D3) —
      // stay at 2K.
      if (__MOBILE__) return;
      // Backdrop sphere has radius 42u. Trigger at ~3× radius (≤ 126u)
      // → swap to 4K; revert at ~4× (≥ 168u). Hysteresis prevents
      // boundary thrash.
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

    const station = config.buildStation();
    scene.add(station);

    // F.3 — microgravity axis overlay. Hidden by default; the lens
    // listener below flips visibility. Sized to span the station's
    // bounding box (~4 unit-radius proxy fits comfortably).
    const microgravityAxes = buildMicrogravityAxes(4);
    scene.add(microgravityAxes);
    // Now sub-toggleable via the 'microgravity' layer. Default-on under
    // the lens so existing behaviour is preserved; users who want a
    // clean station view with the lens still on can toggle it off.
    const stopLensWatch = onLayerChange('microgravity', (on) => {
      microgravityAxes.visible = on;
    });

    const meshById = new Map<string, THREE.Mesh[]>();
    // Animation walks Mesh AND Group. Visiting-craft Groups (Soyuz,
    // Progress, Crew/Cargo Dragon, Cygnus, Starliner, HTV-X) are animated
    // as a single unit so their children — including solar panels — ride
    // along with the parent. Skip any descendant whose ancestor is
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
    // the loaded module list + the synthetic dock events + truss phases
    // so any change in either flows through without a separate reactive
    // plumb. Truss / iROSA segments fly in at their real STS / EVA install
    // dates instead of appearing from frame 0.
    function launchEpochOf(id: string): number {
      const dock = config.assembly.dockEvents.find((d) => d.id === id);
      if (dock) return Date.parse(dock.launch_date);
      const truss = config.assembly.trussPhases.find((t) => t.id === id);
      if (truss) return Date.parse(truss.launch_date);
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
        assemblyProgress = Math.min(1, assemblyRef.progress + dt / config.assembly.durationMs);
        if (assemblyProgress >= 1) assemblyPlaying = false;
      }
      // Combined module + dock-event timeline. Each gets its own slice
      // of playback so the visiting spacecraft join in chronological
      // order with their own narrative chip + fly-in animation.
      const mods = modules.filter((x) => x.launch_date);
      if (mods.length === 0) return;
      const moduleEpochs = mods.map((x) => Date.parse(x.launch_date));
      const dockEpochs = config.assembly.dockEvents.map((d) => Date.parse(d.launch_date));
      const trussEpochs = config.assembly.trussPhases.map((t) => Date.parse(t.launch_date));
      const epochs = [...moduleEpochs, ...dockEpochs, ...trussEpochs];
      const startEpoch = Math.min(...epochs);
      const endEpoch = Math.max(...epochs);
      // Piecewise mapping: equal screen-time per distinct launch event.
      // Avoids dragging through multi-year gaps in the assembly timeline.
      const mapEpoch = buildPiecewiseMapping(epochs, ANIM_WINDOW_MS);
      const nowEpoch = mapEpoch(assemblyRef.progress);
      const state: AssemblyState = {
        active: true,
        nowEpoch,
        startEpoch,
        endEpoch,
      };
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
      // Hover + selection feedback on OutlinePass. The SELECTED module is
      // outlined too (not just hover) so the tour — and a normal click —
      // visibly highlights the module on the 3D station, not only in the
      // side panel ("we show nothing on the model" otherwise).
      const hov = visualRef.hoveredId;
      const sel = visualRef.selectedId;
      const hoveredMeshes = hov && hov !== sel ? (meshById.get(hov) ?? []) : [];
      const selectedMeshes = sel ? (meshById.get(sel) ?? []) : [];
      outlinePass.selectedObjects = [...selectedMeshes, ...hoveredMeshes];
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
      // Behind camera or off-screen → hide.
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
            if (mod) {
              cue('select');
              openModule(mod);
            }
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
        selection.state.hoveredId = found;
        refreshMeshMaterials(performance.now() / 1000);
      }
    }

    function onPointerLeave() {
      if (visualRef.hoveredId !== null) {
        visualRef.hoveredId = null;
        selection.state.hoveredId = null;
        refreshMeshMaterials(performance.now() / 1000);
      }
    }

    lifecycle.on(renderer.domElement, 'pointerdown', onPointerDown);
    lifecycle.on(renderer.domElement, 'pointerup', onPointerUp);
    lifecycle.on(renderer.domElement, 'pointermove', onPointerMove);
    lifecycle.on(renderer.domElement, 'pointerleave', onPointerLeave);

    // Test hook: project any pickable module to client-space pixels so
    // playwright can click a deterministic position instead of spiral-
    // searching the canvas. The spiral approach was racing software-
    // rasterizer WebGL in CI and producing 25-minute timeouts.
    //
    // Iterates pickable modules in insertion order, returning the first
    // one whose centre projects inside the canvas (NDC in (-1,1) on x/y
    // and z<1). Mobile viewports are narrow, so the first module is not
    // always on-screen — we pick the first that is. Forces a world-
    // matrix update so the test can call this before the first render.
    window[`__${config.id}PickAt` as '__issPickAt' | '__tiangongPickAt'] = (moduleId?: string) => {
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
        frameMonitor.tick();
        if (perfCheckPending) {
          perfFrames++;
          const elapsed = performance.now() - perfStart;
          if (elapsed >= 2000) {
            perfCheckPending = false;
            const fps = (perfFrames / elapsed) * 1000;
            // navigator.webdriver === true under Playwright; the
            // software-rasterizer WebGL on CI runners can't sustain
            // 20 fps with the full station mesh, so the perf fallback
            // would auto-switch to list mode and the canvas-click test
            // would have nothing to click. Skip the gate when running
            // under WebDriver — real users on real hardware still get
            // the auto-fallback.
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
        // Sun-tracking solar arrays — slow continuous rotation around each
        // array's SADA axis (one full revolution every ~4 minutes).
        if (config.assembly.beforeSunTracking) applyAssemblyToScene(t);
        tickSunTrackingArrays(station, t);
        if (!config.assembly.beforeSunTracking) applyAssemblyToScene(t);
        refreshMeshMaterials(t);
        // Gyro nudge before update: consume every frame (keeps the service
        // synced); apply only when the user isn't hand-orbiting.
        if (gyroOrbiting) gyro.consume();
        else applyGyroOrbit(camera, controls.target);
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
    // teardowns. Order matters — lifecycle drains LIFO so loop.cleanup
    // (registered earlier) runs after these.
    if (stopLensWatch) lifecycle.add(stopLensWatch);
    lifecycle.add(() => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    });
    lifecycle.add(() => controls.dispose());
    lifecycle.add(() => disposeScene(scene));
    lifecycle.add(() => earthBackdropTex2k.dispose());
    // ADR-073 Layer B — dispose 4K backdrop texture held in closure
    // (not reachable through the scene graph when active LOD is 2K).
    lifecycle.add(() => earthBackdropTex4k?.dispose());
    lifecycle.add(() => outlinePass.dispose());
    lifecycle.add(() => renderer.dispose());
    // Force the WebGL context to be released immediately (#363) —
    // renderer.dispose() alone leaves it resident until lazy GC, so
    // navigating in/out of the station route piled up GBs of GPU memory and throttled
    // rendering. Mirrors disposeSceneRenderer on the surface routes.
    lifecycle.add(() => renderer.forceContextLoss());
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
    const u = page.url;
    // Default the index drawer open on pointer/desktop (room for both canvas +
    // sidebar). Closed on touch to keep the canvas unobstructed; user can hit
    // INDEX to peek.
    if (!viewport.isTouch) {
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

<svelte:head><title>{config.msg.pageTitle()}</title></svelte:head>

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

<div class="{config.id}-root">
  {#if loadFailed}
    <p class="load-banner" role="alert">{config.msg.loadFailed()}</p>
  {:else}
    <!-- Non-visual parallel mode (PRD-007 / GH #256 / ADR-025 v0.7.0).
         Screen-reader-only mirror of the canvas modules — the in-DOM
         drawer list already exists but aria-hidden flips with viewMode,
         so this is the always-accessible parallel surface. -->
    <ul class="sr-only sr-module-list" aria-label={config.msg.a11yModulesList()}>
      {#each sortedModules as mod (mod.id)}
        <li>
          <button
            type="button"
            onclick={() => {
              cue('select');
              openModule(mod);
            }}
            aria-current={selection.state.selectedId === mod.id ? 'true' : undefined}
          >
            {m.a11y_select_module_template({ name: mod.name, agency: mod.agency })}
          </button>
        </li>
      {/each}
      {#if config.srListIncludesVisitors}
        {#each sortedVisitors as ship (ship.id)}
          <li>
            <button
              type="button"
              onclick={() => {
                cue('select');
                openModule(ship);
              }}
              aria-current={selection.state.selectedId === ship.id ? 'true' : undefined}
            >
              {m.a11y_select_module_template({ name: ship.name, agency: ship.agency })}
            </button>
          </li>
        {/each}
      {/if}
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
        data-testid="{config.id}-blueprint"
      >
        <StationBlueprint
          modules={blueprintModules}
          view={viewMode === '2d-top' ? 'top' : viewMode === '2d-side' ? 'side' : 'front'}
          selectedId={selection.state.selectedId}
          onModuleClick={blueprintModuleClick}
          ariaLabel={m.station_blueprint_aria({ name: config.stationName })}
        />
      </div>
    {/if}

    <aside
      class="layer list-layer"
      class:drawer-mode={viewMode !== 'list'}
      class:fullscreen-mode={viewMode === 'list'}
      class:hidden={viewMode !== 'list' && !indexOpen}
      data-testid="{config.id}-list-view"
      data-audio-stage="{config.id}-module-list"
      aria-hidden={viewMode !== 'list' && !indexOpen}
      aria-label={config.msg.listHeading()}
    >
      {#if viewMode === 'list'}
        <button
          type="button"
          class="index-close"
          onclick={toggleViewMode}
          aria-label={config.msg.indexClose()}
          data-testid="{config.id}-list-close"
        >
          ×
        </button>
      {:else}
        <button
          type="button"
          class="index-close"
          onclick={() => (indexOpen = false)}
          aria-label={config.msg.indexClose()}
          data-testid="{config.id}-index-close"
        >
          ×
        </button>
      {/if}
      <h2 class="list-heading">{config.msg.listHeading()}</h2>
      <ul class="module-list">
        {#each sortedModules as mod (mod.id)}
          <li>
            <button
              type="button"
              class="module-row"
              class:canvas-hovered={selection.state.hoveredId === mod.id}
              onclick={() => {
                cue('select');
                openModule(mod);
              }}
              onkeydown={onRowKeydown}
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
              aria-current={selection.state.selectedId === mod.id ? 'true' : undefined}
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
        <h2 class="list-heading list-heading-visitors">{config.msg.visitorsHeading()}</h2>
        <ul class="module-list">
          {#each sortedVisitors as ship (ship.id)}
            <li>
              <button
                type="button"
                class="module-row"
                class:canvas-hovered={selection.state.hoveredId === ship.id}
                onclick={() => {
                  cue('select');
                  openModule(ship);
                }}
                onkeydown={onRowKeydown}
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
                aria-current={selection.state.selectedId === ship.id ? 'true' : undefined}
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
      <div class="timeline-overlay" data-testid="{config.id}-timeline">
        <button
          type="button"
          class="timeline-close"
          aria-label={m.timeline_close()}
          title={m.timeline_close()}
          onclick={() => (timelineOpen = false)}
        >
          ×
        </button>
        <StationTimelineStrip
          modules={sortedModules}
          visitors={sortedVisitors}
          selectedId={selection.state.selectedId}
          hoveredId={selection.state.hoveredId}
          heading="{config.stationName} assembly timeline — modules above, visiting spacecraft below"
          heroDir="{config.id}-modules"
          onSelect={(item) => {
            const m = [...sortedModules, ...sortedVisitors].find((x) => x.id === item.id);
            if (m) openModule(m);
          }}
          onHover={(id) => {
            visualRef.hoveredId = id;
            if (config.timelineOverlayHoverSyncsSelection) selection.state.hoveredId = id;
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
        durationMs={config.assembly.durationMs}
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
        data-testid="{config.id}-view-toggle"
        aria-pressed={indexOpen}
        aria-label={config.msg.btnModulesTitle()}
        title={config.msg.btnModulesTitle()}
        onclick={() => (indexOpen = !indexOpen)}
      >
        <span class="handle-label">{m.station_handle_modules()}</span>
      </button>
      <button
        type="button"
        class="edge-handle handle-bottom"
        data-testid="{config.id}-timeline-toggle"
        aria-pressed={timelineOpen}
        aria-label={config.msg.toggleTimelineAria()}
        title={config.msg.timelineTitle()}
        onclick={() => (timelineOpen = !timelineOpen)}
      >
        <span class="handle-label">{m.station_handle_timeline()}</span>
      </button>
    {/if}

    <!-- Mobile-only: view toggle + Reset View + Spin pinned top-left,
         below nav. Edge handles are hidden on mobile by CSS, so this
         cluster + the MobileDrawerGroup tabs below replace them. -->
    <div class="hud-top-mobile" role="group" aria-label={config.msg.hudAria()}>
      <button
        type="button"
        class="toggle"
        data-testid="{config.id}-blueprint-toggle-mobile"
        onclick={cycleBlueprintView}
        title={config.msg.btnBlueprintTitle()}
      >
        {viewMode === '2d-top'
          ? config.msg.blueprintLabelTop()
          : viewMode === '2d-side'
            ? config.msg.blueprintLabelSide()
            : viewMode === '2d-front'
              ? config.msg.blueprintLabelFront()
              : config.msg.blueprintLabel3d()}
      </button>
      {#if viewMode !== 'list'}
        <button
          type="button"
          class="toggle"
          data-testid="{config.id}-reset-camera-mobile"
          onclick={() => resetCamera()}
          disabled={viewMode !== '3d'}
        >
          {m.ui_reset_view()}
        </button>
        <button
          type="button"
          class="toggle"
          aria-pressed={!autoSpin}
          onclick={() => (autoSpin = !autoSpin)}
          disabled={viewMode !== '3d'}
          title={config.msg.btnSpinTitle()}
        >
          {config.msg.btnSpin()}
        </button>
      {/if}
    </div>

    <HoverLabel bind:this={hoverLabel} suppressed={viewMode !== '3d'} />

    {#snippet issControls()}
      {#if perfBanner}
        <p class="banner perf">{config.msg.fallbackPerf()}</p>
      {/if}
      {#if lowMemBanner}
        <p class="banner mem">{config.msg.fallbackMemory()}</p>
      {/if}
      <!-- Single hint row with min-height so the buttons row underneath
           doesn't jump when content changes between 3D ↔ 2D. The docked
           chip lives inline next to the drag-to-orbit chip in 3D; in
           2D modes it's replaced with view-axis info. -->
      <div class="ctrl-row hint-row">
        <span class="hint">{config.msg.hudHint()}</span>
        {#if viewMode === '3d'}
          <span class="hint hint-docked">{config.msg.dockedLegend()}</span>
        {:else if viewMode === '2d-top'}
          <span class="hint hint-docked">{config.msg.blueprintViewTop()}</span>
        {:else if viewMode === '2d-side'}
          <span class="hint hint-docked">{config.msg.blueprintViewSide()}</span>
        {:else if viewMode === '2d-front'}
          <span class="hint hint-docked">{config.msg.blueprintViewFront()}</span>
        {/if}
      </div>
      <!-- Always 4 buttons in a single row across all non-list modes;
           RESET + SPIN are 3D-only and grey out in 2D so the layout
           doesn't jump between modes. -->
      {#if viewMode !== 'list'}
        <div class="ctrl-row">
          <button
            type="button"
            class="toggle"
            data-testid="{config.id}-blueprint-toggle"
            onclick={cycleBlueprintView}
            title={config.msg.btnBlueprintTitle()}
          >
            {viewMode === '3d'
              ? config.msg.blueprintLabel3d()
              : viewMode === '2d-top'
                ? config.msg.blueprintLabelTop()
                : viewMode === '2d-side'
                  ? config.msg.blueprintLabelSide()
                  : config.msg.blueprintLabelFront()}
          </button>
          <button
            type="button"
            class="toggle"
            data-testid="{config.id}-reset-camera"
            onclick={() => resetCamera()}
            disabled={viewMode !== '3d'}
            title={config.msg.btnResetTitle()}
          >
            {m.ui_reset_view()}
          </button>
          <button
            type="button"
            class="toggle"
            data-testid="{config.id}-spin-toggle"
            aria-pressed={!autoSpin}
            onclick={() => (autoSpin = !autoSpin)}
            disabled={viewMode !== '3d'}
            title={config.msg.btnSpinTitle()}
          >
            {config.msg.btnSpin()}
          </button>
          <button
            type="button"
            class="toggle"
            data-testid="{config.id}-assembly-toggle"
            data-audio-stage="{config.id}-assembly-toggle"
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
            title={config.msg.watchAssemblyTitle()}
          >
            {m.station_assembly_btn()}
          </button>
        </div>
      {:else}
        <div class="ctrl-row">
          <button
            type="button"
            class="toggle"
            data-testid="{config.id}-view-toggle"
            onclick={toggleViewMode}
          >
            {m.iss_view_3d()}
          </button>
        </div>
      {/if}
    {/snippet}
    <div class="hud-controls" role="group" aria-label={config.msg.hudAria()}>
      {@render issControls()}
      <EnterArButton onEnter={() => void launchArScene(config.id)} />
      {#if config.liveLinkLabel}
        <a class="hud-live-link" href={localHref(`/live`)} data-testid="{config.id}-watch-live">
          <span class="live-dot" aria-hidden="true"></span>{config.liveLinkLabel()}
        </a>
      {/if}
    </div>

    {#snippet mobileModulesContent(close: () => void)}
      <StationTimelineStrip
        modules={sortedModules}
        visitors={sortedVisitors}
        selectedId={selection.state.selectedId}
        hoveredId={selection.state.hoveredId}
        heading="{config.stationName} assembly timeline — modules above, visiting spacecraft below"
        heroDir="{config.id}-modules"
        onSelect={(item) => {
          const mod = [...sortedModules, ...sortedVisitors].find((x) => x.id === item.id);
          if (mod) {
            openModule(mod);
            close();
          }
        }}
        onHover={(id) => {
          visualRef.hoveredId = id;
          requestMaterialRefresh();
        }}
      />
      <h2 class="list-heading">{config.msg.listHeading()}</h2>
      <ul class="module-list">
        {#each sortedModules as mod (mod.id)}
          <li>
            <button
              type="button"
              class="module-row"
              onclick={() => {
                openModule(mod);
                close();
              }}
              aria-current={selection.state.selectedId === mod.id ? 'true' : undefined}
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
        <h2 class="list-heading list-heading-visitors">{config.msg.visitorsHeading()}</h2>
        <ul class="module-list">
          {#each sortedVisitors as ship (ship.id)}
            <li>
              <button
                type="button"
                class="module-row"
                onclick={() => {
                  openModule(ship);
                  close();
                }}
                aria-current={selection.state.selectedId === ship.id ? 'true' : undefined}
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
    {/snippet}

    {#if viewMode !== 'list'}
      <MobileDrawerGroup
        tabs={[
          { id: 'list', label: 'List', icon: '▤', action: toggleViewMode },
          {
            id: 'assembly',
            label: 'Assembly',
            icon: '◫',
            action: () => {
              assemblyOpen = !assemblyOpen;
              if (assemblyOpen) {
                assemblyProgress = 0;
                assemblyPlaying = true;
              } else {
                assemblyPlaying = false;
              }
            },
            active: assemblyOpen,
          },
          { id: 'modules', label: 'Modules', icon: '⚑', content: mobileModulesContent },
        ]}
        --mcd-bottom="calc(8px + env(safe-area-inset-bottom, 0px))"
      />
    {/if}
  {/if}

  <!-- Hidden tour anchors (PRD-016 §S11 / RFC-019 §12). Programmatic
       module selection so the tour can demo "Click Destiny / Kibo /
       Zarya" without raycasting the 3D model. -->
  <div class="tour-anchors" aria-hidden="true">
    {#each config.tourAnchors as anchorId (anchorId)}
      <button
        type="button"
        data-audio-stage="{config.id}-select-{anchorId}"
        tabindex="-1"
        onclick={() => blueprintModuleClick(anchorId)}>select {anchorId}</button
      >
    {/each}
    {#if config.tourAssemblyAnchor}
      <!-- Open the assembly timeline + play it from the start, so the tour
           can fill the dead-air gaps with the station building up (user
           direction — regardless of narration). -->
      <button
        type="button"
        data-audio-stage="{config.id}-assembly-toggle"
        tabindex="-1"
        onclick={() => {
          assemblyOpen = true;
          assemblyProgress = 0;
          assemblyPlaying = true;
        }}>play assembly</button
      >
    {/if}
  </div>

  <StationModulePanel
    module={selection.state.item}
    open={selection.state.panelOpen}
    onClose={closePanel}
    galleryFetcher={config.loadGallery}
  />

  <!-- Orbital regime banner — Tier-1 lens-gated explainer (F.1+F.2). -->
  <StationOrbitBanner
    stationName={config.stationName}
    altitudeKm={config.orbit.altitudeKm}
    inclinationDeg={config.orbit.inclinationDeg}
    periodMin={config.orbit.periodMin}
  />

  <!-- Microgravity axes legend — pairs with the 3D ArrowHelpers added
       inside startThree() when the 'microgravity' layer is on. -->
  <MicrogravityAxesLegend />

  <!-- Layers panel — only the microgravity layer is meaningful on these
       routes today. Default-on so existing behaviour holds. -->
  <ScienceLayersPanel available={['microgravity']} />
</div>

<style>
  :global(.iss-root),
  :global(.tiangong-root) {
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
  @media (hover: hover) and (pointer: fine) {
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
  /* Drawer mode (3D mode + indexOpen) — overlays the canvas on the left.
   * Desktop: fixed-width sidebar starting below the HUD column (HUD is
   * top-left at top:10px and stacks ~3 rows tall). Mobile: bottom sheet
   * to avoid both HUD and detail-panel collisions. */
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
  @media (hover: none), (pointer: coarse) {
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
    width: 44px;
    height: 44px;
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
  /* Selection (current open module) — stronger accent than hover so
     it persists visually after the user clicks and the panel opens. */
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
  /* Close-button on the timeline overlay (mirrors the module-panel
     close affordance). Sits in the top-right of the strip so users
     can dismiss without hunting for the TIMELINE toggle. */
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
  .hud-live-link {
    pointer-events: auto;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    color: #ffd0d0;
    text-decoration: none;
    white-space: nowrap;
  }
  .hud-live-link:hover {
    text-decoration: underline;
  }
  .hud-live-link .live-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #c62f2f;
  }
  .ctrl-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  /* Edge handles — pinned to the station-root edge from which the panel
     they open will appear. Vertical on the left edge for MODULES,
     horizontal at the bottom for TIMELINE. position:absolute (not fixed)
     so they ride below the global nav and don't overlap unrelated UI. */
  .edge-handle {
    position: absolute;
    background: rgba(8, 10, 22, 0.82);
    color: rgba(255, 255, 255, 0.78);
    border: 1px solid rgba(255, 255, 255, 0.18);
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
    color: #ff8c8c;
  }
  /* Mobile-only top cluster: view toggle + Reset View, mirroring the
     desktop .hud-controls corner (.hud-controls itself is hidden on mobile). */
  .hud-top-mobile {
    display: none;
  }
  @media (hover: none), (pointer: coarse) {
    .hud-controls {
      display: none;
    }
    /* Edge handles replaced by the MODULES tab in MobileDrawerGroup. */
    .edge-handle {
      display: none;
    }
    .hud-top-mobile {
      display: flex;
      flex-wrap: wrap;
      position: fixed;
      top: calc(var(--nav-height) + 8px);
      left: 8px;
      gap: 6px;
      z-index: 45;
    }
  }
  @media (max-width: 500px) {
    .hud-controls {
      left: 8px;
      top: 8px;
    }
  }
</style>
