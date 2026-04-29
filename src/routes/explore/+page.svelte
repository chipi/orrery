<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';

  // ──────────────────────────────────────────────────────────────────
  // Planet visual config — compressed orbital radii & display sizes,
  // ported faithfully from P01 prototype. Physical params (a, e, T, L0)
  // live in static/data/planets.json; these values are screen-specific
  // visualisation parameters that don't belong in the data layer.
  // ──────────────────────────────────────────────────────────────────

  type PlanetVisual = {
    id: string;
    name: string;
    orbitR: number;
    size3: number;
    color3: number;
    period: number;
    a0: number;
    inc: number;
    hasRings?: boolean;
  };

  const PLANETS: PlanetVisual[] = [
    {
      id: 'mercury',
      name: 'Mercury',
      orbitR: 52,
      size3: 2.8,
      color3: 0xb5b5b5,
      period: 0.241,
      a0: 0.5,
      inc: 7.0,
    },
    {
      id: 'venus',
      name: 'Venus',
      orbitR: 83,
      size3: 5.0,
      color3: 0xe8cda0,
      period: 0.615,
      a0: 2.1,
      inc: 3.4,
    },
    {
      id: 'earth',
      name: 'Earth',
      orbitR: 113,
      size3: 5.2,
      color3: 0x3a8fcc,
      period: 1.0,
      a0: 0,
      inc: 0.0,
    },
    {
      id: 'mars',
      name: 'Mars',
      orbitR: 155,
      size3: 3.8,
      color3: 0xc1440e,
      period: 1.881,
      a0: 1.8,
      inc: 1.85,
    },
    {
      id: 'jupiter',
      name: 'Jupiter',
      orbitR: 248,
      size3: 13.5,
      color3: 0xc88b3a,
      period: 11.86,
      a0: 1.2,
      inc: 1.3,
    },
    {
      id: 'saturn',
      name: 'Saturn',
      orbitR: 320,
      size3: 11.0,
      color3: 0xe4d191,
      period: 29.46,
      a0: 3.5,
      inc: 2.49,
      hasRings: true,
    },
    {
      id: 'uranus',
      name: 'Uranus',
      orbitR: 378,
      size3: 7.5,
      color3: 0x7de8e8,
      period: 84.01,
      a0: 5.1,
      inc: 0.77,
    },
    {
      id: 'neptune',
      name: 'Neptune',
      orbitR: 430,
      size3: 7.0,
      color3: 0x3f54ba,
      period: 164.8,
      a0: 2.8,
      inc: 1.77,
    },
  ];

  let container: HTMLDivElement | undefined = $state();
  let cleanup: (() => void) | undefined;

  onMount(() => {
    if (!container) return;

    // ── Scene ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.5,
      8000,
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x04040c, 1);
    container.appendChild(renderer.domElement);

    // ── Lights ──
    scene.add(new THREE.PointLight(0xfff4d0, 3.5, 2500, 1.2));
    scene.add(new THREE.AmbientLight(0x111133, 0.8));
    const fill = new THREE.DirectionalLight(0x223366, 0.3);
    fill.position.set(-200, 100, -200);
    scene.add(fill);

    // ── Sun + corona glow ──
    scene.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(18, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xfff0a0 }),
      ),
    );
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

    // ── Stars ──
    const STAR_COUNT = 3000;
    const sp = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const r = 3000 + Math.random() * 1000;
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
          size: 1.2,
          sizeAttenuation: false,
          transparent: true,
          opacity: 0.7,
        }),
      ),
    );

    // ── Asteroid belt ──
    const BELT_COUNT = 1800;
    const bp = new Float32Array(BELT_COUNT * 3);
    for (let i = 0; i < BELT_COUNT; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 195 + Math.random() * 42;
      bp[i * 3] = Math.cos(a) * r;
      bp[i * 3 + 1] = (Math.random() - 0.5) * 8;
      bp[i * 3 + 2] = Math.sin(a) * r;
    }
    const beltGeo = new THREE.BufferGeometry();
    beltGeo.setAttribute('position', new THREE.BufferAttribute(bp, 3));
    scene.add(
      new THREE.Points(
        beltGeo,
        new THREE.PointsMaterial({
          color: 0xb8a470,
          size: 1.0,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.5,
        }),
      ),
    );

    // ── Orbit rings ──
    PLANETS.forEach((p) => {
      const inc = (p.inc * Math.PI) / 180;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        const x = Math.cos(a) * p.orbitR;
        const zf = Math.sin(a) * p.orbitR;
        pts.push(new THREE.Vector3(x, zf * Math.sin(inc), zf * Math.cos(inc)));
      }
      const mat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.06,
        depthWrite: false,
      });
      scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat));
    });

    // ── Planets ──
    type PlanetObj = { group: THREE.Group; mesh: THREE.Mesh; planet: PlanetVisual };
    const planetObjs: PlanetObj[] = PLANETS.map((p) => {
      const group = new THREE.Group();
      const mat = new THREE.MeshPhongMaterial({
        color: p.color3,
        emissive: p.color3,
        emissiveIntensity: 0.12,
        shininess: 25,
        specular: 0x444444,
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.size3, 32, 32), mat);
      group.add(mesh);
      if (p.hasRings) {
        const rg = new THREE.RingGeometry(p.size3 * 1.4, p.size3 * 2.6, 64);
        const rm = new THREE.MeshBasicMaterial({
          color: 0xe4d191,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const ring = new THREE.Mesh(rg, rm);
        ring.rotation.x = Math.PI / 2.2;
        group.add(ring);
      }
      scene.add(group);
      return { group, mesh, planet: p };
    });

    // ── Camera (spherical orbit) ──
    let camR = 680;
    let camP = 1.05;
    let camT = 0.6;
    const updateCam = () => {
      camera.position.set(
        camR * Math.sin(camP) * Math.sin(camT),
        camR * Math.cos(camP),
        camR * Math.sin(camP) * Math.cos(camT),
      );
      camera.lookAt(0, 0, 0);
    };
    updateCam();

    // ── Drag-to-rotate + wheel zoom + touch ──
    const el = renderer.domElement;
    let isDrag = false;
    let lmx = 0;
    let lmy = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDrag = true;
      lmx = e.clientX;
      lmy = e.clientY;
      el.style.cursor = 'grabbing';
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDrag) return;
      const dx = e.clientX - lmx;
      const dy = e.clientY - lmy;
      camT -= dx * 0.006;
      camP = Math.max(0.08, Math.min(Math.PI * 0.48, camP + dy * 0.005));
      lmx = e.clientX;
      lmy = e.clientY;
      updateCam();
    };
    const onMouseUp = () => {
      isDrag = false;
      el.style.cursor = 'grab';
    };
    const onWheel = (e: WheelEvent) => {
      camR = Math.max(120, Math.min(1400, camR + e.deltaY * 0.7));
      updateCam();
    };
    let touchActive = false;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchActive = true;
        lmx = e.touches[0].clientX;
        lmy = e.touches[0].clientY;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!touchActive || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - lmx;
      const dy = e.touches[0].clientY - lmy;
      camT -= dx * 0.006;
      camP = Math.max(0.08, Math.min(Math.PI * 0.48, camP + dy * 0.005));
      lmx = e.touches[0].clientX;
      lmy = e.touches[0].clientY;
      updateCam();
    };
    const onTouchEnd = () => {
      touchActive = false;
    };

    el.style.cursor = 'grab';
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('wheel', onWheel, { passive: true });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);

    // ── Resize ──
    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // ── Animation loop ──
    let simT = 0;
    let lastTime = performance.now();
    let rafId = 0;
    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      simT += dt * 0.04;

      planetObjs.forEach(({ group, mesh, planet }) => {
        const angle = planet.a0 + (2 * Math.PI * simT) / planet.period;
        const inc = (planet.inc * Math.PI) / 180;
        const x = Math.cos(angle) * planet.orbitR;
        const zf = Math.sin(angle) * planet.orbitR;
        group.position.set(x, zf * Math.sin(inc), zf * Math.cos(inc));
        mesh.rotation.y += 0.005;
      });

      renderer.render(scene, camera);
    };
    animate(performance.now());

    cleanup = () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', onResize);

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
      renderer.dispose();
      el.remove();
    };
  });

  onDestroy(() => {
    cleanup?.();
  });
</script>

<svelte:head><title>Solar System Explorer · Orrery</title></svelte:head>

<div class="explore" bind:this={container}></div>

<style>
  .explore {
    position: absolute;
    inset: var(--nav-height) 0 0 0;
    overflow: hidden;
  }
  :global(.explore canvas) {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
