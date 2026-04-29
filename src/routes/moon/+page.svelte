<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { base } from '$app/paths';
  import * as THREE from 'three';
  import { getMoonSites } from '$lib/data';
  import type { MoonSite } from '$types/moon-site';
  import Panel from '$lib/components/Panel.svelte';
  import * as m from '$lib/paraglide/messages';

  // ─── Nation palette (per IA §shared-tokens) ──────────────────────
  const NATION_COLORS: Record<string, string> = {
    USA: '#0B3D91',
    USSR: '#8B0000',
    Russia: '#cc4444',
    China: '#DE2910',
    India: '#FF9933',
    Japan: '#003087',
  };

  let view: '3d' | '2d' = $state('3d');
  let container: HTMLDivElement | undefined = $state();
  let canvas2d: HTMLCanvasElement | undefined = $state();
  let sites: MoonSite[] = $state([]);
  let loadFailed = $state(false);
  let selected: MoonSite | null = $state(null);
  let panelOpen = $state(false);
  let cleanup: (() => void) | undefined;

  function colorFor(site: MoonSite): string {
    return NATION_COLORS[site.nation] ?? '#888';
  }

  function selectSite(id: string) {
    const s = sites.find((x) => x.id === id);
    if (s) {
      selected = s;
      panelOpen = true;
    }
  }
  function toggleView() {
    view = view === '3d' ? '2d' : '3d';
  }

  // Site canvas positions for 2D hit-testing.
  const sitePos2d = new Map<string, { x: number; y: number }>();

  onMount(() => {
    if (!container || !canvas2d) return;

    getMoonSites()
      .then((list) => {
        sites = list;
      })
      .catch((err) => {
        console.error('Failed to load moon sites:', err);
        loadFailed = true;
      });

    // ──────────────────────────────────────────────────────────────
    // 3D — Moon sphere with surface texture
    // ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.5,
      400,
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x04040c, 1);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x666688, 0.7));
    const sun = new THREE.DirectionalLight(0xfff4d0, 1.2);
    sun.position.set(120, 60, 100);
    scene.add(sun);

    // Stars
    const STAR_COUNT = 1500;
    const sp = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const r = 200 + Math.random() * 80;
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
          opacity: 0.55,
        }),
      ),
    );

    const textureLoader = new THREE.TextureLoader();
    const moonMap = textureLoader.load(`${base}/textures/2k_moon.jpg`);
    const moonRadius = 30;
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(moonRadius, 64, 64),
      new THREE.MeshPhongMaterial({ map: moonMap, color: 0xffffff, shininess: 4 }),
    );
    scene.add(moonMesh);

    // Site markers — small spheres anchored on the surface, lifted
    // slightly (1.04× radius) so they don't z-fight with the texture.
    type MarkerObj = { mesh: THREE.Mesh; siteId: string };
    const markers: MarkerObj[] = [];
    function rebuildMarkers() {
      // Clear old
      for (const mk of markers) {
        mk.mesh.geometry.dispose();
        if (!Array.isArray(mk.mesh.material)) mk.mesh.material.dispose();
        scene.remove(mk.mesh);
      }
      markers.length = 0;
      for (const site of sites) {
        // lat/lon → cartesian on unit sphere
        const lat = (site.lat * Math.PI) / 180;
        const lon = (site.lon * Math.PI) / 180;
        const x = Math.cos(lat) * Math.cos(lon);
        const y = Math.sin(lat);
        const z = -Math.cos(lat) * Math.sin(lon); // -sin so +lon is east
        const r = moonRadius * 1.03;
        const color = colorFor(site);
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.6, 12, 12),
          new THREE.MeshBasicMaterial({ color }),
        );
        mesh.position.set(x * r, y * r, z * r);
        mesh.userData = { siteId: site.id };
        scene.add(mesh);
        markers.push({ mesh, siteId: site.id });
      }
    }

    // Camera + controls
    let camR = 80;
    let camP = Math.PI / 2;
    let camT = 0;
    const updateCam = () => {
      camera.position.set(
        camR * Math.sin(camP) * Math.sin(camT),
        camR * Math.cos(camP),
        camR * Math.sin(camP) * Math.cos(camT),
      );
      camera.lookAt(0, 0, 0);
    };
    updateCam();

    const el3d = renderer.domElement;
    let isDrag = false;
    let lmx = 0;
    let lmy = 0;
    let dragMoved = false;
    let downX = 0;
    let downY = 0;

    const ray = new THREE.Raycaster();
    function tryPick3d(clientX: number, clientY: number) {
      const rect = el3d.getBoundingClientRect();
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const hits = ray.intersectObjects(
        markers.map((mk) => mk.mesh),
        false,
      );
      const hit = hits.find((h) => typeof h.object.userData.siteId === 'string');
      if (hit) selectSite(hit.object.userData.siteId as string);
    }

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
      camP = Math.max(0.05, Math.min(Math.PI - 0.05, camP + (e.clientY - lmy) * 0.005));
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
      camR = Math.max(45, Math.min(200, camR + e.deltaY * 0.05));
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
        const d = tDist(e.touches[0], e.touches[1]);
        camR = Math.max(45, Math.min(200, camR * (pinchPrev / d)));
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
      camP = Math.max(0.05, Math.min(Math.PI - 0.05, camP + (e.touches[0].clientY - lmy) * 0.005));
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
    el3d.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el3d.addEventListener('wheel', onWheel, { passive: true });
    el3d.addEventListener('touchstart', onTouchStart, { passive: true });
    el3d.addEventListener('touchmove', onTouchMove, { passive: true });
    el3d.addEventListener('touchend', onTouchEnd);
    el3d.addEventListener('touchcancel', onTouchEnd);

    // 2D context
    const c2 = canvas2d;
    const _maybeCtx = c2.getContext('2d');
    if (!_maybeCtx) throw new Error('2D context unavailable');
    const ctx2: CanvasRenderingContext2D = _maybeCtx;

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

      // Equirectangular map area — leave a margin for the lat/lon
      // gridlines and nation legend. lon spans -180..180, lat -90..90.
      const margin = 36;
      const mapW = W - margin * 2;
      const mapH = H - margin * 2 - 60; // bottom legend
      const x0 = margin;
      const y0 = margin;

      // Map background — subtle moon-grey gradient instead of texture
      // (the equirectangular flat-map projection at 2K resolution would
      // require a separate flat-map texture; the colour fill keeps the
      // 2D view legible without doubling the texture asset).
      const gr = ctx2.createLinearGradient(x0, y0, x0, y0 + mapH);
      gr.addColorStop(0, '#1a1a1f');
      gr.addColorStop(1, '#101012');
      ctx2.fillStyle = gr;
      ctx2.fillRect(x0, y0, mapW, mapH);
      ctx2.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx2.lineWidth = 1;
      ctx2.strokeRect(x0 + 0.5, y0 + 0.5, mapW - 1, mapH - 1);

      // Lat/Lon grid
      ctx2.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx2.lineWidth = 0.5;
      ctx2.font = "7px 'Space Mono',monospace";
      ctx2.fillStyle = 'rgba(255,255,255,0.3)';
      ctx2.textAlign = 'center';
      for (let lon = -150; lon <= 150; lon += 30) {
        const x = x0 + ((lon + 180) / 360) * mapW;
        ctx2.beginPath();
        ctx2.moveTo(x, y0);
        ctx2.lineTo(x, y0 + mapH);
        ctx2.stroke();
        ctx2.fillText(`${lon}°`, x, y0 + mapH + 12);
      }
      ctx2.textAlign = 'right';
      for (let lat = -60; lat <= 60; lat += 30) {
        const y = y0 + ((90 - lat) / 180) * mapH;
        ctx2.beginPath();
        ctx2.moveTo(x0, y);
        ctx2.lineTo(x0 + mapW, y);
        ctx2.stroke();
        ctx2.fillText(`${lat}°`, x0 - 4, y + 3);
      }

      // Site markers
      sitePos2d.clear();
      for (const site of sites) {
        const x = x0 + ((site.lon + 180) / 360) * mapW;
        const y = y0 + ((90 - site.lat) / 180) * mapH;
        const color = colorFor(site);
        const isSel = selected?.id === site.id;

        // Glow
        const gl = ctx2.createRadialGradient(x, y, 0, x, y, 10);
        gl.addColorStop(0, color + '99');
        gl.addColorStop(1, 'transparent');
        ctx2.beginPath();
        ctx2.arc(x, y, 10, 0, Math.PI * 2);
        ctx2.fillStyle = gl;
        ctx2.fill();

        if (isSel) {
          ctx2.beginPath();
          ctx2.arc(x, y, 9, 0, Math.PI * 2);
          ctx2.strokeStyle = '#fff';
          ctx2.lineWidth = 1.5;
          ctx2.stroke();
        }

        ctx2.beginPath();
        ctx2.arc(x, y, 4, 0, Math.PI * 2);
        ctx2.fillStyle = color;
        ctx2.fill();

        sitePos2d.set(site.id, { x, y });
      }

      // Nation legend (bottom-left)
      const legendY = H - 36;
      ctx2.font = "bold 7px 'Space Mono',monospace";
      ctx2.textAlign = 'left';
      let legendX = margin;
      for (const [nation, color] of Object.entries(NATION_COLORS)) {
        ctx2.beginPath();
        ctx2.arc(legendX + 5, legendY + 6, 3, 0, Math.PI * 2);
        ctx2.fillStyle = color;
        ctx2.fill();
        ctx2.fillStyle = 'rgba(255,255,255,0.7)';
        ctx2.fillText(nation, legendX + 12, legendY + 9);
        legendX += ctx2.measureText(nation).width + 32;
      }
    }

    function on2dClick(e: MouseEvent) {
      const rect = c2.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      let best: { id: string; d: number } | null = null;
      for (const [id, pos] of sitePos2d.entries()) {
        const d = Math.hypot(cx - pos.x, cy - pos.y);
        if (d < 22 && (!best || d < best.d)) best = { id, d };
      }
      if (best) selectSite(best.id);
    }
    c2.addEventListener('click', on2dClick);

    // Resize + animation loop
    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    let lastTime = performance.now();
    let rafId = 0;
    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Rebuild markers if the site list changed (cheap — happens once
      // when the data loads). Could optimise but 16 markers is trivial.
      if (sites.length !== markers.length) rebuildMarkers();

      moonMesh.rotation.y += dt * 0.05; // slow auto-rotate; reduced-motion override lands in 6a-1

      if (view === '3d') renderer.render(scene, camera);
      else draw2d();
    };
    animate(performance.now());

    cleanup = () => {
      cancelAnimationFrame(rafId);
      el3d.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el3d.removeEventListener('wheel', onWheel);
      el3d.removeEventListener('touchstart', onTouchStart);
      el3d.removeEventListener('touchmove', onTouchMove);
      el3d.removeEventListener('touchend', onTouchEnd);
      el3d.removeEventListener('touchcancel', onTouchEnd);
      c2.removeEventListener('click', on2dClick);
      window.removeEventListener('resize', onResize);
      const disposeMatTextures = (mat: THREE.Material) => {
        const m = mat as THREE.Material & { map?: THREE.Texture | null };
        m.map?.dispose();
      };
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material))
            obj.material.forEach((mat) => {
              disposeMatTextures(mat);
              mat.dispose();
            });
          else if (obj.material) {
            disposeMatTextures(obj.material);
            (obj.material as THREE.Material).dispose();
          }
        }
      });
      renderer.dispose();
      el3d.remove();
    };
  });

  onDestroy(() => cleanup?.());
</script>

<svelte:head><title>Moon Map · Orrery</title></svelte:head>

<div class="moon">
  <div class="layer" bind:this={container} class:hidden={view !== '3d'}></div>
  <canvas
    class="layer"
    bind:this={canvas2d}
    class:hidden={view !== '2d'}
    aria-label={m.moon_canvas_label()}
  ></canvas>

  <button class="toggle" type="button" onclick={toggleView} aria-pressed={view === '2d'}>
    {view === '3d' ? m.moon_label_view_2d() : m.moon_label_view_3d()}
  </button>

  {#if loadFailed}
    <div class="load-banner" role="alert">{m.moon_load_failed()}</div>
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
          </p>
        {/if}
      </div>

      <div class="grid">
        <div class="cell">
          <div class="cell-label">{m.moon_panel_year()}</div>
          <div class="cell-value">{selected.year}</div>
        </div>
        <div class="cell">
          <div class="cell-label">{m.moon_panel_landing()}</div>
          <div class="cell-value">{selected.landing_date ?? '—'}</div>
        </div>
        <div class="cell">
          <div class="cell-label">{m.moon_panel_lat()}</div>
          <div class="cell-value">{m.moon_lat_deg({ value: selected.lat.toFixed(2) })}</div>
        </div>
        <div class="cell">
          <div class="cell-label">{m.moon_panel_lon()}</div>
          <div class="cell-value">{m.moon_lon_deg({ value: selected.lon.toFixed(2) })}</div>
        </div>
        <div class="cell">
          <div class="cell-label">{m.moon_panel_duration()}</div>
          <div class="cell-value">
            {selected.surface_duration_days
              ? m.moon_days({ value: selected.surface_duration_days.toString() })
              : '—'}
          </div>
        </div>
        <div class="cell">
          <div class="cell-label">{m.moon_panel_eva()}</div>
          <div class="cell-value">
            {selected.eva_duration_hours
              ? m.moon_hours({ value: selected.eva_duration_hours.toString() })
              : '—'}
          </div>
        </div>
        <div class="cell">
          <div class="cell-label">{m.moon_panel_samples()}</div>
          <div class="cell-value">{m.moon_kg({ value: selected.samples_kg.toString() })}</div>
        </div>
        <div class="cell">
          <div class="cell-label">{m.moon_panel_crew()}</div>
          <div class="cell-value short">
            {selected.crew && selected.crew.length > 0 ? selected.crew.join(', ') : '—'}
          </div>
        </div>
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

      {#if selected.credit}
        <div class="credit">{selected.credit}</div>
      {/if}
    {/if}
  </Panel>
</div>

<style>
  .moon {
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
  :global(.moon canvas) {
    display: block;
  }
  .toggle {
    position: fixed;
    top: calc(var(--nav-height) + 12px);
    right: 16px;
    z-index: 35;
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
  }
  .toggle:hover,
  .toggle:focus-visible {
    border-color: #4466ff;
    outline: none;
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

  .credit {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    color: rgba(255, 255, 255, 0.25);
    line-height: 1.6;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 10px;
  }
</style>
