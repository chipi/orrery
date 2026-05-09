<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
  import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
  import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
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
  import type { BlueprintModule } from '$lib/station-blueprint';
  import * as m from '$lib/paraglide/messages';

  let container: HTMLDivElement | undefined = $state();
  let modules: TiangongModule[] = $state([]);
  let visitors: TiangongModule[] = $state([]);
  let loadFailed = $state(false);
  let viewMode: '3d' | '2d-top' | '2d-side' | '2d-front' | 'list' = $state('3d');
  let selected: TiangongModule | null = $state(null);
  let panelOpen = $state(false);
  let ignoreModuleParamUntilClear = $state(false);
  let perfBanner = $state(false);
  let lowMemBanner = $state(false);
  let autoSpin = $state(true);
  let indexOpen = $state(false);
  let hoverLabelEl: HTMLDivElement | undefined = $state();
  let hoverLabelText = $state('');
  let hoverLabelVisible = $state(false);
  let hoverLabelLeft = $state(0);
  let hoverLabelTop = $state(0);

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
        if (!cancelled) modules = list;
      })
      .catch(() => {
        if (!cancelled) loadFailed = true;
      });
    void getTiangongVisitors(L)
      .then((list) => {
        if (!cancelled) visitors = list;
      })
      .catch(() => {
        if (!cancelled) loadFailed = true;
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

  function syncUrl(partial: {
    view?: '3d' | '2d-top' | '2d-side' | '2d-front' | 'list';
    moduleId?: string | null;
  }) {
    const params = new URLSearchParams(get(page).url.searchParams);
    if (partial.view === 'list') params.set('view', 'list');
    else if (partial.view === '2d-top') params.set('view', '2d-top');
    else if (partial.view === '2d-side') params.set('view', '2d-side');
    else if (partial.view === '2d-front') params.set('view', '2d-front');
    else if (partial.view === '3d') params.delete('view');
    if (partial.moduleId === null) params.delete('module');
    else if (partial.moduleId !== undefined) params.set('module', partial.moduleId);
    const qs = params.toString();
    const target = `${base}/tiangong${qs ? `?${qs}` : ''}`;
    const cur = `${get(page).url.pathname}${get(page).url.search}`;
    if (target !== cur) {
      void goto(target, { replaceState: true, keepFocus: true, noScroll: true });
    }
  }

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

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x04040c, 1);
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

    const initialCamPos = camera.position.clone();
    const initialTarget = controls.target.clone();
    const initialDistance = camera.position.distanceTo(controls.target);
    controls.minDistance = initialDistance * 0.6;
    controls.maxDistance = initialDistance * 3;

    const composer = new EffectComposer(renderer);
    composer.setSize(container.clientWidth, container.clientHeight);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    composer.addPass(new RenderPass(scene, camera));
    const outlinePass = new OutlinePass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      scene,
      camera,
    );
    outlinePass.edgeStrength = 4;
    outlinePass.edgeGlow = 0.4;
    outlinePass.edgeThickness = 1.5;
    outlinePass.visibleEdgeColor.setHex(0x4ecdc4);
    outlinePass.hiddenEdgeColor.setHex(0x224a48);
    composer.addPass(outlinePass);

    scene.add(new THREE.AmbientLight(0x445566, 0.55));
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

    const STAR_COUNT = 1200;
    const sp = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const r = 180 + Math.random() * 100;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      sp[i * 3] = r * Math.sin(p) * Math.cos(t);
      sp[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      sp[i * 3 + 2] = r * Math.cos(p);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    scene.add(
      new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({
          color: 0xdde4ff,
          size: 1.0,
          sizeAttenuation: false,
          transparent: true,
          opacity: 0.5,
        }),
      ),
    );

    const texLoader = new THREE.TextureLoader();
    const cloudsTex = texLoader.load(`${base}/textures/2k_earth_daymap.jpg`);
    const earthBackdrop = new THREE.Mesh(
      new THREE.SphereGeometry(42, 40, 40),
      new THREE.MeshPhongMaterial({
        map: cloudsTex,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
      }),
    );
    earthBackdrop.position.set(0, -48, -120);
    scene.add(earthBackdrop);

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
    station.traverse((o) => {
      if (o instanceof THREE.Mesh && o.userData.stationPickable && o.userData.moduleId) {
        const mid = o.userData.moduleId as string;
        const arr = meshById.get(mid) ?? [];
        arr.push(o);
        meshById.set(mid, arr);
      }
    });

    function refreshMeshMaterials(timeSec: number) {
      const sel = visualRef.selectedId;
      const pan = visualRef.panelOpen;
      const hov = visualRef.hoveredId;
      const pulseScale = 1 + Math.sin(timeSec * 2.6) * 0.04;
      meshById.forEach((meshes, id) => {
        const isSel = id === sel;
        const targetScale = isSel && pan ? pulseScale : 1;
        for (const mesh of meshes) {
          mesh.scale.setScalar(targetScale);
          const mat = mesh.material;
          if (!(mat instanceof THREE.MeshStandardMaterial)) continue;
          if (isSel && pan) {
            mat.emissive.setHex(0x4466ff);
            mat.emissiveIntensity = 0.32 + Math.sin(timeSec * 2.6) * 0.14;
          } else if (isSel) {
            mat.emissive.setHex(0x4466ff);
            mat.emissiveIntensity = 0.38;
          } else {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          }
        }
      });
      const hoveredMeshes = hov && hov !== sel ? (meshById.get(hov) ?? []) : [];
      outlinePass.selectedObjects = hoveredMeshes;
    }

    const hoverLabelAnchor = new THREE.Vector3();
    function updateHoverLabel() {
      const hov = visualRef.hoveredId;
      if (!hov || !container) {
        if (hoverLabelVisible) hoverLabelVisible = false;
        return;
      }
      const mod = moduleListRef.list.find((x) => x.id === hov);
      const meshes = meshById.get(hov);
      if (!mod || !meshes || meshes.length === 0) {
        if (hoverLabelVisible) hoverLabelVisible = false;
        return;
      }
      meshes[0].getWorldPosition(hoverLabelAnchor);
      hoverLabelAnchor.project(camera);
      if (hoverLabelAnchor.z > 1 || hoverLabelAnchor.z < -1) {
        if (hoverLabelVisible) hoverLabelVisible = false;
        return;
      }
      hoverLabelLeft = (hoverLabelAnchor.x * 0.5 + 0.5) * container.clientWidth;
      hoverLabelTop = (-hoverLabelAnchor.y * 0.5 + 0.5) * container.clientHeight;
      hoverLabelText = mod.name;
      hoverLabelVisible = true;
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
        refreshMeshMaterials(performance.now() / 1000);
      }
    }

    function onPointerLeave() {
      if (visualRef.hoveredId !== null) {
        visualRef.hoveredId = null;
        refreshMeshMaterials(performance.now() / 1000);
      }
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);

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
    let raf = 0;
    let spinTimeAccum = 0;
    let lastFrameT = 0;

    function onResize() {
      if (!container) return;
      camera.aspect = container.clientWidth / Math.max(1, container.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      composer.setSize(container.clientWidth, container.clientHeight);
      outlinePass.resolution.set(container.clientWidth, container.clientHeight);
    }
    window.addEventListener('resize', onResize);

    function animate() {
      raf = requestAnimationFrame(animate);
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
      if (lastFrameT === 0) lastFrameT = t;
      const dt = t - lastFrameT;
      if (autoSpin) spinTimeAccum += dt;
      lastFrameT = t;
      station.rotation.y = spinTimeAccum * 0.028;
      // Sun-tracking solar arrays — slow continuous rotation around each
      // array's SADA axis (one full revolution every ~4 minutes).
      const sunPhase = t * 0.026;
      station.traverse((obj) => {
        if (obj.userData.tracksSun) {
          const axis = obj.userData.sadaAxis as 'x' | 'y' | 'z';
          const base = (obj.userData.baseRotation as number) ?? 0;
          obj.rotation[axis] = base + sunPhase;
        }
      });
      refreshMeshMaterials(t);
      controls.update();
      composer.render();
      updateHoverLabel();
    }
    animate();

    cleanupThree = () => {
      cancelAnimationFrame(raf);
      stopLensWatch?.();
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      controls.dispose();
      const disposeMatTex = (mat: THREE.Material) => {
        const mm = mat as THREE.MeshStandardMaterial & { map?: THREE.Texture | null };
        mm.map?.dispose();
      };
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => {
              disposeMatTex(m);
              m.dispose();
            });
          } else if (obj.material) {
            disposeMatTex(obj.material);
            obj.material.dispose();
          }
        }
      });
      cloudsTex.dispose();
      outlinePass.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      visualRef.hoveredId = null;
      hoverLabelVisible = false;
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
      queueMicrotask(() => startThree());
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
      queueMicrotask(() => startThree());
    }
  });

  onDestroy(() => stopThree());
</script>

<svelte:head><title>{m.tiangong_page_title()}</title></svelte:head>

<div class="tiangong-root">
  {#if loadFailed}
    <p class="load-banner" role="alert">{m.tiangong_load_failed()}</p>
  {:else}
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
              onclick={() => openModule(mod)}
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
                onclick={() => openModule(ship)}
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

    <div
      bind:this={hoverLabelEl}
      class="hover-label"
      class:hidden={!hoverLabelVisible || viewMode !== '3d'}
      style="left: {hoverLabelLeft}px; top: {hoverLabelTop}px"
      aria-hidden="true"
    >
      {hoverLabelText}
    </div>

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
      <!-- Always 4 buttons in a single row across all non-list modes;
           RESET + SPIN are 3D-only and grey out in 2D so the layout
           doesn't jump between modes. -->
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
            data-testid="tiangong-view-toggle"
            aria-pressed={indexOpen}
            onclick={() => (indexOpen = !indexOpen)}
            title={m.tiangong_btn_modules_title()}
          >
            MODULES
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
  .hover-label {
    position: absolute;
    z-index: 5;
    pointer-events: none;
    transform: translate(-50%, calc(-100% - 12px));
    padding: 4px 8px;
    background: rgba(8, 10, 22, 0.85);
    border: 1px solid rgba(78, 205, 196, 0.5);
    border-radius: 4px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    color: #4ecdc4;
    white-space: nowrap;
    text-transform: uppercase;
    backdrop-filter: blur(4px);
  }
  .hover-label.hidden {
    display: none;
  }
  @media (hover: none) {
    .hover-label {
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
  .module-row:focus-visible {
    border-color: rgba(68, 102, 255, 0.55);
    background: rgba(68, 102, 255, 0.12);
    outline: none;
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
    /* Match drawer width below so HUD + module list align in a single rail. */
    width: min(300px, calc(100vw - 24px));
    pointer-events: none;
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
