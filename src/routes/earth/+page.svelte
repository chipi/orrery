<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { base } from '$app/paths';
  import * as THREE from 'three';
  import { getEarthObjects } from '$lib/data';
  import { altToOrbitRadius } from '$lib/scale';
  import { onReducedMotionChange } from '$lib/reduced-motion';
  import { categoriseEarthSatellite } from '$lib/earth-satellite-category';
  import type { EarthObject } from '$types/earth-object';
  import Panel from '$lib/components/Panel.svelte';
  import * as m from '$lib/paraglide/messages';

  // ─── Earth scene constants ────────────────────────────────────────
  const EARTH_RADIUS = 8;
  const MOON_DISTANCE_KM = 384400;
  const REGIME_COLORS: Record<string, number> = {
    LEO: 0x4ecdc4,
    MEO: 0x7b9cff,
    GEO: 0xffc850,
    HEO: 0xff8c3c,
    MOON: 0xaaaacc,
    L2: 0xffd700,
  };

  let view: '3d' | '2d' = $state('3d');
  let container: HTMLDivElement | undefined = $state();
  let canvas2d: HTMLCanvasElement | undefined = $state();
  let objects: EarthObject[] = $state([]);
  let loadFailed = $state(false);
  let selected: EarthObject | null = $state(null);
  let panelOpen = $state(false);
  let cleanup: (() => void) | undefined;

  function selectObject(id: string) {
    const o = objects.find((x) => x.id === id);
    if (o) {
      selected = o;
      panelOpen = true;
    }
  }
  function toggleView() {
    view = view === '3d' ? '2d' : '3d';
  }

  // 2D hit-test position cache (canvas pixel coords).
  const pos2d = new Map<string, { x: number; y: number }>();

  onMount(() => {
    if (!container || !canvas2d) return;

    getEarthObjects()
      .then((list) => {
        objects = list;
      })
      .catch((err) => {
        console.error('Failed to load earth objects:', err);
        loadFailed = true;
      });

    // ──────────────────────────────────────────────────────────────
    // 3D — Earth + satellites in scene-space
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

    scene.add(new THREE.AmbientLight(0x444466, 0.6));
    const sun = new THREE.DirectionalLight(0xfff4d0, 1.4);
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

    // Earth
    const textureLoader = new THREE.TextureLoader();
    const earthMap = textureLoader.load(`${base}/textures/2k_earth_daymap.jpg`);
    const earthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS, 64, 64),
      new THREE.MeshPhongMaterial({ map: earthMap, color: 0xffffff, shininess: 12 }),
    );
    scene.add(earthMesh);

    // Moon — small textured sphere at the Moon-orbit radius. Click goes to /moon.
    const moonMap = textureLoader.load(`${base}/textures/2k_moon.jpg`);
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.0, 32, 32),
      new THREE.MeshPhongMaterial({ map: moonMap, color: 0xffffff, shininess: 4 }),
    );
    const moonR = altToOrbitRadius(MOON_DISTANCE_KM);
    moonMesh.position.set(moonR, 0, 0);
    moonMesh.userData = { isMoon: true };
    scene.add(moonMesh);

    // Orbit rings — one per regime, drawn as a faint torus at the
    // representative altitude. Inclination not modelled in v1; the
    // ring sits in the equatorial plane.
    function buildOrbitRings() {
      // Find one representative altitude per regime present in the data.
      const repAlt: Record<string, number> = {};
      for (const o of objects) {
        const alt = o.altitude_km ?? o.earth_distance_km;
        if (!(o.regime in repAlt)) repAlt[o.regime] = alt;
      }
      for (const [regime, alt] of Object.entries(repAlt)) {
        const r = altToOrbitRadius(alt);
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(r, 0.04, 6, 128),
          new THREE.MeshBasicMaterial({
            color: REGIME_COLORS[regime] ?? 0x666666,
            transparent: true,
            opacity: 0.35,
          }),
        );
        ring.rotation.x = Math.PI / 2; // equatorial
        scene.add(ring);
      }
    }

    type SatObj = { group: THREE.Group; id: string; orbitR: number; phase: number };
    const sats: SatObj[] = [];

    function buildSatGeometry(
      category: ReturnType<typeof categoriseEarthSatellite>,
      color: string,
    ): THREE.Group {
      const group = new THREE.Group();
      const mat = new THREE.MeshPhongMaterial({
        color,
        shininess: 30,
        emissive: color,
        emissiveIntensity: 0.2,
      });
      const panelMat = new THREE.MeshPhongMaterial({ color: 0x0b1840, shininess: 60 });
      switch (category) {
        case 'station': {
          // Cube body + four solar-panel wings (cross pattern).
          const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.7), mat);
          group.add(body);
          for (const dx of [-0.9, 0.9]) {
            const wing = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.55), panelMat);
            wing.position.set(dx, 0, 0);
            group.add(wing);
          }
          break;
        }
        case 'constellation': {
          // 6 dots arranged on a small inclined ring representing the cluster.
          const ringR = 0.5;
          for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * Math.PI * 2;
            const dot = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), mat);
            dot.position.set(Math.cos(ang) * ringR, Math.sin(ang) * ringR * 0.6, 0);
            group.add(dot);
          }
          break;
        }
        case 'telescope': {
          // Cylinder scope + small lens cap; recognisable Hubble silhouette.
          const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.9, 12), mat);
          tube.rotation.z = Math.PI / 2; // lay scope on its side
          group.add(tube);
          const lens = new THREE.Mesh(
            new THREE.CylinderGeometry(0.26, 0.26, 0.06, 12),
            new THREE.MeshBasicMaterial({ color: 0x222222 }),
          );
          lens.rotation.z = Math.PI / 2;
          lens.position.x = 0.48;
          group.add(lens);
          // Small solar panels on the side
          const panel = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.32), panelMat);
          panel.position.set(-0.1, 0.3, 0);
          group.add(panel);
          break;
        }
        case 'comsat': {
          // Cube body + parabolic dish (cone-as-paraboloid approximation).
          const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), mat);
          group.add(body);
          const dish = new THREE.Mesh(
            new THREE.ConeGeometry(0.5, 0.15, 16, 1, true),
            new THREE.MeshPhongMaterial({ color, side: THREE.DoubleSide }),
          );
          dish.position.set(0, 0.32, 0);
          dish.rotation.x = Math.PI;
          group.add(dish);
          break;
        }
        case 'moon-orbiter': {
          // Tiny probe; rendered near the Moon, not on a regime ring.
          const probe = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), mat);
          group.add(probe);
          break;
        }
      }
      return group;
    }

    function rebuildSats() {
      for (const s of sats) {
        s.group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material?.dispose();
          }
        });
        scene.remove(s.group);
      }
      sats.length = 0;

      for (let i = 0; i < objects.length; i++) {
        const o = objects[i];
        const category = categoriseEarthSatellite(o.id);
        const group = buildSatGeometry(category, o.color);

        // Phase angle distributes objects around their regime ring so
        // they don't pile up at +X. Deterministic so the visual is
        // stable across renders.
        const phase = (i * 2.4) % (Math.PI * 2);

        let orbitR: number;
        if (category === 'moon-orbiter') {
          // LRO sits next to the Moon mesh.
          group.position.set(moonR + 2.5, 1, 0);
          orbitR = moonR;
        } else {
          const alt = o.altitude_km ?? o.earth_distance_km;
          orbitR = altToOrbitRadius(alt);
          group.position.set(Math.cos(phase) * orbitR, 0, Math.sin(phase) * orbitR);
        }
        group.userData = { id: o.id };
        group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) obj.userData = { id: o.id };
        });
        scene.add(group);
        sats.push({ group, id: o.id, orbitR, phase });
      }
    }

    // Camera + controls
    let camR = 35;
    let camP = Math.PI / 2.2;
    let camT = 0.4;
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
      // Test sats first (smaller targets, take priority).
      const satHits = ray.intersectObjects(
        sats.map((s) => s.group),
        true,
      );
      const satHit = satHits.find((h) => typeof h.object.userData.id === 'string');
      if (satHit) {
        selectObject(satHit.object.userData.id as string);
        return;
      }
      // Moon click → navigate to /moon.
      const moonHits = ray.intersectObject(moonMesh, false);
      if (moonHits.length > 0) {
        window.location.href = `${base}/moon`;
      }
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
      camR = Math.max(12, Math.min(120, camR + e.deltaY * 0.04));
      updateCam();
    };

    // Touch
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
        camR = Math.max(12, Math.min(120, camR * (pinchPrev / d)));
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

    // ──────────────────────────────────────────────────────────────
    // 2D — Top-down concentric rings + satellite dots
    // ──────────────────────────────────────────────────────────────
    const c2 = canvas2d;
    const _maybeCtx = c2.getContext('2d');
    if (!_maybeCtx) throw new Error('2D context unavailable');
    const ctx2: CanvasRenderingContext2D = _maybeCtx;

    function draw2d() {
      if (c2.width !== c2.clientWidth || c2.height !== c2.clientHeight) {
        c2.width = c2.clientWidth;
        c2.height = c2.clientHeight;
      }
      const W = c2.width;
      const H = c2.height;
      if (W === 0 || H === 0) return;

      ctx2.fillStyle = '#04040c';
      ctx2.fillRect(0, 0, W, H);

      const cx = W / 2;
      const cy = H / 2;
      // Px-per-scene-unit so the 3D log scale maps cleanly to 2D pixels.
      const pxPerUnit = Math.min(W, H) / 70;

      // Stars
      for (let i = 0; i < 80; i++) {
        const sx = (i * 137.5 * 31 + i * 71) % W;
        const sy = (i * 137.5 * 17 + i * 53) % H;
        ctx2.beginPath();
        ctx2.arc(sx, sy, i % 8 === 0 ? 1.2 : 0.5, 0, Math.PI * 2);
        ctx2.fillStyle = `rgba(210,215,255,${0.06 + (i % 5) * 0.04})`;
        ctx2.fill();
      }

      // Regime rings (concentric)
      const seen: Record<string, true> = {};
      for (const o of objects) {
        if (seen[o.regime]) continue;
        seen[o.regime] = true;
        const alt = o.altitude_km ?? o.earth_distance_km;
        const r = altToOrbitRadius(alt) * pxPerUnit;
        const colorHex = REGIME_COLORS[o.regime] ?? 0x666666;
        ctx2.beginPath();
        ctx2.arc(cx, cy, r, 0, Math.PI * 2);
        ctx2.strokeStyle = `rgba(${(colorHex >> 16) & 0xff}, ${(colorHex >> 8) & 0xff}, ${
          colorHex & 0xff
        }, 0.35)`;
        ctx2.lineWidth = 1;
        ctx2.stroke();
        // Regime label
        ctx2.font = "bold 8px 'Space Mono',monospace";
        ctx2.fillStyle = `rgba(${(colorHex >> 16) & 0xff}, ${(colorHex >> 8) & 0xff}, ${
          colorHex & 0xff
        }, 0.85)`;
        ctx2.textAlign = 'left';
        ctx2.fillText(o.regime, cx + r + 4, cy);
      }

      // Earth disc
      const eg = ctx2.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, EARTH_RADIUS * pxPerUnit);
      eg.addColorStop(0, '#6ab8e8');
      eg.addColorStop(1, '#0d3050');
      ctx2.beginPath();
      ctx2.arc(cx, cy, EARTH_RADIUS * pxPerUnit, 0, Math.PI * 2);
      ctx2.fillStyle = eg;
      ctx2.fill();

      // Moon disc + label
      const moonRpx = altToOrbitRadius(MOON_DISTANCE_KM) * pxPerUnit;
      const moonAng = Math.PI * 0.25;
      const mx = cx + Math.cos(moonAng) * moonRpx;
      const my = cy - Math.sin(moonAng) * moonRpx;
      ctx2.beginPath();
      ctx2.arc(mx, my, 5, 0, Math.PI * 2);
      ctx2.fillStyle = '#aaaacc';
      ctx2.fill();
      ctx2.font = "8px 'Space Mono',monospace";
      ctx2.fillStyle = 'rgba(170,170,200,0.85)';
      ctx2.textAlign = 'left';
      ctx2.fillText('MOON', mx + 9, my + 3);

      // Satellites
      pos2d.clear();
      for (let i = 0; i < objects.length; i++) {
        const o = objects[i];
        const category = categoriseEarthSatellite(o.id);
        const phase = (i * 2.4) % (Math.PI * 2);
        let r: number;
        let x: number;
        let y: number;
        if (category === 'moon-orbiter') {
          x = mx + 8;
          y = my - 6;
          r = 4;
        } else {
          const alt = o.altitude_km ?? o.earth_distance_km;
          r = altToOrbitRadius(alt) * pxPerUnit;
          x = cx + Math.cos(phase) * r;
          y = cy - Math.sin(phase) * r;
        }
        const dotR = 4 + Math.min(2, Math.log10(Math.max(1, o.count)));
        const isSel = selected?.id === o.id;

        const gl = ctx2.createRadialGradient(x, y, 0, x, y, dotR * 4);
        gl.addColorStop(0, o.color + '99');
        gl.addColorStop(1, 'rgba(0,0,0,0)');
        ctx2.beginPath();
        ctx2.arc(x, y, dotR * 4, 0, Math.PI * 2);
        ctx2.fillStyle = gl;
        ctx2.fill();

        if (isSel) {
          ctx2.beginPath();
          ctx2.arc(x, y, dotR + 6, 0, Math.PI * 2);
          ctx2.strokeStyle = '#fff';
          ctx2.lineWidth = 1.5;
          ctx2.stroke();
        }

        ctx2.beginPath();
        ctx2.arc(x, y, dotR, 0, Math.PI * 2);
        ctx2.fillStyle = o.color;
        ctx2.fill();

        ctx2.font = "9px 'Space Mono',monospace";
        ctx2.fillStyle = 'rgba(255,255,255,0.7)';
        ctx2.textAlign = 'left';
        ctx2.fillText(o.short ?? o.name ?? o.id, x + dotR + 6, y + 3);

        pos2d.set(o.id, { x, y });
      }
    }

    function on2dClick(e: MouseEvent) {
      const rect = c2.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      let best: { id: string; d: number } | null = null;
      for (const [id, p] of pos2d.entries()) {
        const d = Math.hypot(cx - p.x, cy - p.y);
        if (d < 22 && (!best || d < best.d)) best = { id, d };
      }
      if (best) selectObject(best.id);
    }
    c2.addEventListener('click', on2dClick);

    // ──────────────────────────────────────────────────────────────
    // Animation + lifecycle
    // ──────────────────────────────────────────────────────────────
    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    let lastTime = performance.now();
    let rafId = 0;
    let reducedMotion = false;
    let prevSatLen = -1;
    const stopReducedMotionWatch = onReducedMotionChange((r) => {
      reducedMotion = r;
    });

    buildOrbitRings(); // empty first paint draws nothing; second pass after data load adds rings

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Rebuild satellites once when data loads (cheap; happens once).
      if (objects.length !== prevSatLen) {
        rebuildSats();
        // Also rebuild orbit rings now that we know which regimes exist.
        // (Cheap — at most 6 rings.)
        prevSatLen = objects.length;
      }

      // ADR-025: gate axial Earth rotation + slow satellite drift under
      // reduced-motion. User-initiated drag/zoom still works.
      if (!reducedMotion) {
        earthMesh.rotation.y += dt * 0.05;
        for (const s of sats) {
          if (s.id === 'lro') continue;
          s.phase += dt * 0.05;
          s.group.position.set(Math.cos(s.phase) * s.orbitR, 0, Math.sin(s.phase) * s.orbitR);
        }
      }

      if (view === '3d') renderer.render(scene, camera);
      else draw2d();
    };
    animate(performance.now());

    cleanup = () => {
      cancelAnimationFrame(rafId);
      stopReducedMotionWatch();
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

<svelte:head><title>Earth Orbit · Orrery</title></svelte:head>

<div class="earth">
  <div class="layer" bind:this={container} class:hidden={view !== '3d'}></div>
  <canvas
    class="layer"
    bind:this={canvas2d}
    class:hidden={view !== '2d'}
    aria-label={m.earth_canvas_label()}
  ></canvas>

  <button class="toggle" type="button" onclick={toggleView} aria-pressed={view === '2d'}>
    {view === '3d' ? m.earth_label_view_2d() : m.earth_label_view_3d()}
  </button>

  {#if loadFailed}
    <div class="load-banner" role="alert">{m.earth_load_failed()}</div>
  {/if}

  <Panel
    open={panelOpen}
    title={selected?.name ?? selected?.short ?? selected?.id ?? ''}
    onClose={() => (panelOpen = false)}
  >
    {#if selected}
      <div class="head">
        <div class="agency-row">
          <span class="agency-badge" style:background-color={selected.color}>
            {selected.agencies.join(' · ')}
          </span>
          <span class="status status-{selected.status.toLowerCase()}">{selected.status}</span>
        </div>
        <h1 class="name">{selected.name ?? selected.id}</h1>
      </div>

      <div class="grid">
        <div class="cell">
          <div class="cell-label">{m.earth_panel_alt()}</div>
          <div class="cell-value">
            {m.earth_alt_km({
              value: (selected.altitude_km ?? selected.earth_distance_km).toLocaleString('en-US'),
            })}
          </div>
        </div>
        <div class="cell">
          <div class="cell-label">{m.earth_panel_period()}</div>
          <div class="cell-value">
            {selected.period_min
              ? m.earth_period_min({ value: selected.period_min.toFixed(0) })
              : '—'}
          </div>
        </div>
        <div class="cell">
          <div class="cell-label">{m.earth_panel_inclination()}</div>
          <div class="cell-value">
            {selected.inclination !== undefined
              ? m.earth_inclination_deg({ value: selected.inclination.toFixed(1) })
              : '—'}
          </div>
        </div>
        <div class="cell">
          <div class="cell-label">{m.earth_panel_launched()}</div>
          <div class="cell-value">{selected.launched}</div>
        </div>
        <div class="cell">
          <div class="cell-label">{m.earth_panel_count()}</div>
          <div class="cell-value">{selected.count}</div>
        </div>
        <div class="cell">
          <div class="cell-label">{m.earth_panel_crew()}</div>
          <div class="cell-value">{selected.crew}</div>
        </div>
      </div>

      {#if selected.scale_fact}
        <div class="scale-fact" style:--accent={selected.color}>
          {selected.scale_fact}
        </div>
      {/if}

      {#if selected.description}
        <p class="editorial">{selected.description}</p>
      {/if}

      {#if selected.credit}
        <div class="credit">{selected.credit}</div>
      {/if}
    {/if}
  </Panel>
</div>

<style>
  .earth {
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
  :global(.earth canvas) {
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
    padding: 8px 16px;
    background: rgba(193, 68, 14, 0.2);
    border: 1px solid rgba(193, 68, 14, 0.5);
    color: #ffc850;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    border-radius: 4px;
    z-index: 40;
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
    border: 1px solid;
  }
  .status-active {
    color: #4ecdc4;
    border-color: rgba(78, 205, 196, 0.4);
    background: rgba(78, 205, 196, 0.08);
  }
  .status-retired {
    color: rgba(255, 255, 255, 0.5);
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.03);
  }
  .status-planned {
    color: #4466ff;
    border-color: rgba(68, 102, 255, 0.4);
    background: rgba(68, 102, 255, 0.08);
  }
  .name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 28px;
    letter-spacing: 3px;
    color: var(--color-text);
    line-height: 1;
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
  .scale-fact {
    margin: 0 0 14px;
    padding: 10px 12px;
    border-left: 3px solid var(--accent, #4466ff);
    background: rgba(255, 255, 255, 0.02);
    border-radius: 2px;
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.75);
    line-height: 1.5;
  }
  .editorial {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.6;
    margin: 0 0 14px;
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
