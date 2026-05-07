<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import { getIssModules } from '$lib/data';
  import { localeFromPage } from '$lib/locale';
  import { buildIssProxyStation } from '$lib/iss-proxy-model';
  import type { IssModule } from '$types/iss-module';
  import IssModulePanel from '$lib/components/IssModulePanel.svelte';
  import * as m from '$lib/paraglide/messages';

  let container: HTMLDivElement | undefined = $state();
  let modules: IssModule[] = $state([]);
  let loadFailed = $state(false);
  let viewMode: '3d' | 'list' = $state('3d');
  let selected: IssModule | null = $state(null);
  let panelOpen = $state(false);
  let ignoreModuleParamUntilClear = $state(false);
  let perfBanner = $state(false);
  let lowMemBanner = $state(false);
  let autoSpin = $state(true);

  let cleanupThree: (() => void) | undefined;
  let perfCheckPending = true;

  /** Fresh view mode for rAF perf gate (avoids a stale `viewMode` read). */
  const viewBag = { mode: '3d' as '3d' | 'list' };

  /** Pick handler reads latest list (avoids stale closure). */
  const moduleListRef: { list: IssModule[] } = { list: [] };
  $effect(() => {
    moduleListRef.list = modules;
    viewBag.mode = viewMode;
  });

  /** Hover + selection styling inside the Three scene (synced from state below). */
  const issVisualRef: {
    selectedId: string | null;
    panelOpen: boolean;
    hoveredId: string | null;
  } = { selectedId: null, panelOpen: false, hoveredId: null };

  let requestIssMaterialRefresh: () => void = () => {};
  let resetIssCamera: () => void = () => {};

  $effect(() => {
    issVisualRef.selectedId = selected?.id ?? null;
    issVisualRef.panelOpen = panelOpen;
    requestIssMaterialRefresh();
  });

  const loc = $derived(localeFromPage($page));

  $effect(() => {
    const L = loc;
    let cancelled = false;
    void getIssModules(L)
      .then((list) => {
        if (!cancelled) modules = list;
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

  function urlWantsList(url: URL): boolean {
    return url.searchParams.get('view') === 'list';
  }

  function deviceLowMemory(): boolean {
    if (!browser) return false;
    const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    return dm != null && dm <= 2;
  }

  function syncUrl(partial: { view?: '3d' | 'list'; moduleId?: string | null }) {
    const params = new URLSearchParams(get(page).url.searchParams);
    if (partial.view === 'list') params.set('view', 'list');
    else if (partial.view === '3d') params.delete('view');
    if (partial.moduleId === null) params.delete('module');
    else if (partial.moduleId !== undefined) params.set('module', partial.moduleId);
    const qs = params.toString();
    const target = `${base}/iss${qs ? `?${qs}` : ''}`;
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

  function openModule(mod: IssModule) {
    selected = mod;
    panelOpen = true;
    syncUrl({ moduleId: mod.id });
  }

  $effect(() => {
    const id = $page.url.searchParams.get('module');
    if (modules.length === 0) return;
    if (!id) {
      ignoreModuleParamUntilClear = false;
      // URL is canonical source: no `module` param means no open panel.
      if (selected !== null || panelOpen) {
        selected = null;
        panelOpen = false;
      }
      return;
    }
    if (ignoreModuleParamUntilClear) return;
    const mod = modules.find((x) => x.id === id);
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
    camera.position.set(1.5, -3.0, 10.5);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x04040c, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.dataset.testid = 'iss-canvas';
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', m.iss_canvas_aria());
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(-0.35, 0.1, 0);
    controls.update();

    const initialCamPos = camera.position.clone();
    const initialTarget = controls.target.clone();
    const initialDistance = camera.position.distanceTo(controls.target);
    controls.minDistance = initialDistance * 0.6;
    controls.maxDistance = initialDistance * 3;

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

    const station = buildIssProxyStation();
    scene.add(station);

    const meshById = new Map<string, THREE.Mesh[]>();
    station.traverse((o) => {
      if (o instanceof THREE.Mesh && o.userData.issPickable && o.userData.moduleId) {
        const mid = o.userData.moduleId as string;
        const arr = meshById.get(mid) ?? [];
        arr.push(o);
        meshById.set(mid, arr);
      }
    });

    function refreshIssMeshMaterials(timeSec: number) {
      const sel = issVisualRef.selectedId;
      const pan = issVisualRef.panelOpen;
      const hov = issVisualRef.hoveredId;
      const pulseScale = 1 + Math.sin(timeSec * 2.6) * 0.04;
      meshById.forEach((meshes, id) => {
        const isSel = id === sel;
        const isHov = id === hov && !isSel;
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
          } else if (isHov) {
            mat.emissive.setHex(0x4ecdc4);
            mat.emissiveIntensity = 0.24;
          } else {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          }
        }
      });
    }

    requestIssMaterialRefresh = () => refreshIssMeshMaterials(performance.now() / 1000);

    resetIssCamera = () => {
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
          if (o.userData?.issPickable && mid) {
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
          if (o.userData?.issPickable && mid) {
            found = mid;
            break;
          }
          o = o.parent;
        }
        if (found) break;
      }
      if (found !== issVisualRef.hoveredId) {
        issVisualRef.hoveredId = found;
        refreshIssMeshMaterials(performance.now() / 1000);
      }
    }

    function onPointerLeave() {
      if (issVisualRef.hoveredId !== null) {
        issVisualRef.hoveredId = null;
        refreshIssMeshMaterials(performance.now() / 1000);
      }
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);

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
          if (fps < 20 && viewBag.mode === '3d') {
            perfBanner = true;
            viewMode = 'list';
            stopThree();
            resetIssCamera = () => {};
            requestIssMaterialRefresh = () => {};
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
      refreshIssMeshMaterials(t);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    cleanupThree = () => {
      cancelAnimationFrame(raf);
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
      renderer.dispose();
      renderer.domElement.remove();
      issVisualRef.hoveredId = null;
      resetIssCamera = () => {};
      requestIssMaterialRefresh = () => {};
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
    if (urlWantsList(u)) {
      viewMode = 'list';
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

<svelte:head><title>{m.iss_page_title()}</title></svelte:head>

<div class="iss-root">
  {#if loadFailed}
    <p class="load-banner" role="alert">{m.iss_load_failed()}</p>
  {:else}
    <div
      class="layer canvas-layer"
      bind:this={container}
      class:hidden={viewMode !== '3d'}
      aria-hidden={viewMode !== '3d'}
    ></div>

    <div
      class="layer list-layer"
      class:hidden={viewMode !== 'list'}
      data-testid="iss-list-view"
      aria-hidden={viewMode !== 'list'}
    >
      <h2 class="list-heading">{m.iss_list_heading()}</h2>
      <ul class="module-list">
        {#each sortedModules as mod (mod.id)}
          <li>
            <button
              type="button"
              class="module-row"
              onclick={() => openModule(mod)}
              aria-current={selected?.id === mod.id ? 'true' : undefined}
            >
              <span class="mod-name">{mod.name}</span>
              <span class="mod-meta">{mod.agency}</span>
            </button>
          </li>
        {/each}
      </ul>
    </div>

    <div class="hud-controls" role="group" aria-label={m.iss_hud_aria()}>
      {#if perfBanner}
        <p class="banner perf">{m.iss_fallback_perf()}</p>
      {/if}
      {#if lowMemBanner}
        <p class="banner mem">{m.iss_fallback_memory()}</p>
      {/if}
      <div class="ctrl-row">
        <span class="hint">{m.iss_hud_hint()}</span>
      </div>
      {#if viewMode === '3d'}
        <div class="ctrl-row">
          <span class="hint hint-docked">{m.iss_docked_legend()}</span>
        </div>
      {/if}
      <div class="ctrl-row">
        {#if viewMode === '3d'}
          <button
            type="button"
            class="toggle"
            data-testid="iss-reset-camera"
            onclick={() => resetIssCamera()}
          >
            {m.iss_reset_camera()}
          </button>
          <button
            type="button"
            class="toggle"
            data-testid="iss-spin-toggle"
            aria-pressed={!autoSpin}
            onclick={() => (autoSpin = !autoSpin)}
          >
            {autoSpin ? m.iss_pause_spin() : m.iss_resume_spin()}
          </button>
        {/if}
        <button
          type="button"
          class="toggle"
          data-testid="iss-view-toggle"
          aria-pressed={viewMode === 'list'}
          onclick={toggleViewMode}
        >
          {viewMode === '3d' ? m.iss_view_list() : m.iss_view_3d()}
        </button>
      </div>
    </div>
  {/if}

  <IssModulePanel module={selected} open={panelOpen} onClose={closePanel} />
</div>

<style>
  .iss-root {
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
  .layer.hidden {
    display: none;
  }
  .list-layer {
    overflow: auto;
    padding: 72px 16px 24px;
    -webkit-overflow-scrolling: touch;
  }
  .list-heading {
    font-family: var(--font-display);
    font-size: 18px;
    letter-spacing: 4px;
    color: rgba(255, 255, 255, 0.85);
    margin: 0 0 16px;
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
    max-width: min(420px, calc(100vw - 24px));
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
  .toggle {
    min-width: 44px;
    min-height: 44px;
    padding: 0 14px;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid rgba(68, 102, 255, 0.4);
    color: #dde4ff;
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    letter-spacing: 0.06em;
    border-radius: 4px;
    cursor: pointer;
    backdrop-filter: blur(6px);
    pointer-events: auto;
  }
  .toggle:hover,
  .toggle:focus-visible {
    border-color: #4466ff;
    outline: none;
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
