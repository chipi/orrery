<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';

  // ──────────────────────────────────────────────────────────────────
  // Planet visual config — compressed orbital radii & display sizes,
  // ported faithfully from P01 prototype. Physical params (a, e, T, L0)
  // live in static/data/planets.json; these values are screen-specific
  // visualisation parameters that don't belong in the data layer.
  //
  // size3 = sphere radius in 3D scene units (AU-scaled)
  // size2 = pixel radius in 2D top-down canvas
  // color3 = THREE numeric colour
  // css = CSS hex string used by 2D canvas gradients & labels
  // ──────────────────────────────────────────────────────────────────

  type PlanetVisual = {
    id: string;
    name: string;
    orbitR: number;
    size3: number;
    size2: number;
    color3: number;
    css: string;
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
      size2: 3,
      color3: 0xb5b5b5,
      css: '#b5b5b5',
      period: 0.241,
      a0: 0.5,
      inc: 7.0,
    },
    {
      id: 'venus',
      name: 'Venus',
      orbitR: 83,
      size3: 5.0,
      size2: 5,
      color3: 0xe8cda0,
      css: '#e8cda0',
      period: 0.615,
      a0: 2.1,
      inc: 3.4,
    },
    {
      id: 'earth',
      name: 'Earth',
      orbitR: 113,
      size3: 5.2,
      size2: 5.5,
      color3: 0x3a8fcc,
      css: '#4b9cd3',
      period: 1.0,
      a0: 0,
      inc: 0.0,
    },
    {
      id: 'mars',
      name: 'Mars',
      orbitR: 155,
      size3: 3.8,
      size2: 4,
      color3: 0xc1440e,
      css: '#c1440e',
      period: 1.881,
      a0: 1.8,
      inc: 1.85,
    },
    {
      id: 'jupiter',
      name: 'Jupiter',
      orbitR: 248,
      size3: 13.5,
      size2: 13,
      color3: 0xc88b3a,
      css: '#c88b3a',
      period: 11.86,
      a0: 1.2,
      inc: 1.3,
    },
    {
      id: 'saturn',
      name: 'Saturn',
      orbitR: 320,
      size3: 11.0,
      size2: 11,
      color3: 0xe4d191,
      css: '#e4d191',
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
      size2: 7.5,
      color3: 0x7de8e8,
      css: '#7de8e8',
      period: 84.01,
      a0: 5.1,
      inc: 0.77,
    },
    {
      id: 'neptune',
      name: 'Neptune',
      orbitR: 430,
      size3: 7.0,
      size2: 7,
      color3: 0x3f54ba,
      css: '#3f54ba',
      period: 164.8,
      a0: 2.8,
      inc: 1.77,
    },
  ];

  let container: HTMLDivElement | undefined = $state();
  let canvas2d: HTMLCanvasElement | undefined = $state();
  let view: '3d' | '2d' = $state('3d');
  let cleanup: (() => void) | undefined;

  onMount(() => {
    if (!container || !canvas2d) return;

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
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x04040c, 1);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.PointLight(0xfff4d0, 3.5, 2500, 1.2));
    scene.add(new THREE.AmbientLight(0x111133, 0.8));
    const fill = new THREE.DirectionalLight(0x223366, 0.3);
    fill.position.set(-200, 100, -200);
    scene.add(fill);

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

    const el3d = renderer.domElement;
    let isDrag3d = false;
    let lmx3d = 0;
    let lmy3d = 0;

    const on3dMouseDown = (e: MouseEvent) => {
      isDrag3d = true;
      lmx3d = e.clientX;
      lmy3d = e.clientY;
      el3d.style.cursor = 'grabbing';
    };
    const on3dMouseMove = (e: MouseEvent) => {
      if (!isDrag3d) return;
      const dx = e.clientX - lmx3d;
      const dy = e.clientY - lmy3d;
      camT -= dx * 0.006;
      camP = Math.max(0.08, Math.min(Math.PI * 0.48, camP + dy * 0.005));
      lmx3d = e.clientX;
      lmy3d = e.clientY;
      updateCam();
    };
    const on3dMouseUp = () => {
      isDrag3d = false;
      el3d.style.cursor = 'grab';
    };
    const on3dWheel = (e: WheelEvent) => {
      camR = Math.max(120, Math.min(1400, camR + e.deltaY * 0.7));
      updateCam();
    };
    let touchActive3d = false;
    const on3dTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchActive3d = true;
        lmx3d = e.touches[0].clientX;
        lmy3d = e.touches[0].clientY;
      }
    };
    const on3dTouchMove = (e: TouchEvent) => {
      if (!touchActive3d || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - lmx3d;
      const dy = e.touches[0].clientY - lmy3d;
      camT -= dx * 0.006;
      camP = Math.max(0.08, Math.min(Math.PI * 0.48, camP + dy * 0.005));
      lmx3d = e.touches[0].clientX;
      lmy3d = e.touches[0].clientY;
      updateCam();
    };
    const on3dTouchEnd = () => {
      touchActive3d = false;
    };

    el3d.style.cursor = 'grab';
    el3d.addEventListener('mousedown', on3dMouseDown);
    window.addEventListener('mousemove', on3dMouseMove);
    window.addEventListener('mouseup', on3dMouseUp);
    el3d.addEventListener('wheel', on3dWheel, { passive: true });
    el3d.addEventListener('touchstart', on3dTouchStart, { passive: true });
    el3d.addEventListener('touchmove', on3dTouchMove, { passive: true });
    el3d.addEventListener('touchend', on3dTouchEnd);

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
    const on2dMouseDown = (e: MouseEvent) => {
      isDrag2d = true;
      drag2dX = e.clientX;
      drag2dY = e.clientY;
      c2.style.cursor = 'grabbing';
    };
    const on2dMouseUp = () => {
      isDrag2d = false;
      if (view === '2d') c2.style.cursor = 'grab';
    };
    const on2dMouseMove = (e: MouseEvent) => {
      if (!isDrag2d || view !== '2d') return;
      zx2d += e.clientX - drag2dX;
      zy2d += e.clientY - drag2dY;
      drag2dX = e.clientX;
      drag2dY = e.clientY;
    };
    let touchActive2d = false;
    const on2dTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchActive2d = true;
        drag2dX = e.touches[0].clientX;
        drag2dY = e.touches[0].clientY;
      }
    };
    const on2dTouchMove = (e: TouchEvent) => {
      if (!touchActive2d || e.touches.length !== 1) return;
      zx2d += e.touches[0].clientX - drag2dX;
      zy2d += e.touches[0].clientY - drag2dY;
      drag2dX = e.touches[0].clientX;
      drag2dY = e.touches[0].clientY;
    };
    const on2dTouchEnd = () => {
      touchActive2d = false;
    };

    c2.style.cursor = 'grab';
    c2.addEventListener('wheel', on2dWheel, { passive: false });
    c2.addEventListener('mousedown', on2dMouseDown);
    window.addEventListener('mouseup', on2dMouseUp);
    window.addEventListener('mousemove', on2dMouseMove);
    c2.addEventListener('touchstart', on2dTouchStart, { passive: true });
    c2.addEventListener('touchmove', on2dTouchMove, { passive: true });
    c2.addEventListener('touchend', on2dTouchEnd);

    // ──────────────────────────────────────────────────────────────
    // 2D draw — ported from P01 lines 393–533
    // Deferred to later checkpoints: SMALL bodies, comets, Kuiper Belt,
    // Planet Nine ring, selection ring, tooltip (3a-5/3a-6).
    // ──────────────────────────────────────────────────────────────

    const draw2d = () => {
      const W = c2.width;
      const H = c2.height;
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

      // Orbit rings
      PLANETS.forEach((p) => {
        ctx2.beginPath();
        ctx2.arc(0, 0, p.orbitR, 0, Math.PI * 2);
        ctx2.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx2.lineWidth = 0.5;
        ctx2.stroke();
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

      // Planets
      PLANETS.forEach((p) => {
        const ang = p.a0 + simT * ((2 * Math.PI) / p.period);
        const pr = Math.max(3, p.size2);
        const px = Math.cos(ang) * p.orbitR;
        const py = Math.sin(ang) * p.orbitR;

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
      resize2d();
    };
    window.addEventListener('resize', onResize);

    // ──────────────────────────────────────────────────────────────
    // Animation loop — dispatches by `view`
    // ──────────────────────────────────────────────────────────────

    let simT = 0;
    let lastTime = performance.now();
    let rafId = 0;
    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      simT += dt * 0.04;

      if (view === '3d') {
        planetObjs.forEach(({ group, mesh, planet }) => {
          const angle = planet.a0 + (2 * Math.PI * simT) / planet.period;
          const inc = (planet.inc * Math.PI) / 180;
          const x = Math.cos(angle) * planet.orbitR;
          const zf = Math.sin(angle) * planet.orbitR;
          group.position.set(x, zf * Math.sin(inc), zf * Math.cos(inc));
          mesh.rotation.y += 0.005;
        });
        renderer.render(scene, camera);
      } else {
        draw2d();
      }
    };
    animate(performance.now());

    cleanup = () => {
      cancelAnimationFrame(rafId);
      el3d.removeEventListener('mousedown', on3dMouseDown);
      window.removeEventListener('mousemove', on3dMouseMove);
      window.removeEventListener('mouseup', on3dMouseUp);
      el3d.removeEventListener('wheel', on3dWheel);
      el3d.removeEventListener('touchstart', on3dTouchStart);
      el3d.removeEventListener('touchmove', on3dTouchMove);
      el3d.removeEventListener('touchend', on3dTouchEnd);
      c2.removeEventListener('wheel', on2dWheel);
      c2.removeEventListener('mousedown', on2dMouseDown);
      window.removeEventListener('mouseup', on2dMouseUp);
      window.removeEventListener('mousemove', on2dMouseMove);
      c2.removeEventListener('touchstart', on2dTouchStart);
      c2.removeEventListener('touchmove', on2dTouchMove);
      c2.removeEventListener('touchend', on2dTouchEnd);
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
      el3d.remove();
    };
  });

  onDestroy(() => {
    cleanup?.();
  });

  function toggleView() {
    view = view === '3d' ? '2d' : '3d';
  }
</script>

<svelte:head><title>Solar System Explorer · Orrery</title></svelte:head>

<div class="explore">
  <div class="layer" bind:this={container} class:hidden={view !== '3d'}></div>
  <canvas class="layer" bind:this={canvas2d} class:hidden={view !== '2d'}></canvas>
  <button class="toggle" type="button" onclick={toggleView} aria-pressed={view === '2d'}>
    {view === '3d' ? '2D' : '3D'}
  </button>
</div>

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
  }
  .layer.hidden {
    display: none;
  }
  :global(.explore canvas) {
    display: block;
  }
  .toggle {
    position: absolute;
    top: 12px;
    right: 16px;
    z-index: 25;
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
</style>
