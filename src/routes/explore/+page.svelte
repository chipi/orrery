<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import * as THREE from 'three';
  import { getPlanets, getSun, getMissionIndex, getMission } from '$lib/data';
  import { auToPx } from '$lib/scale';
  import { earthPos, outboundArc, type Vec2 } from '$lib/mission-arc';
  import { dateToSimDay } from '$lib/sim-day';
  import { DESTINATIONS, type DestinationId } from '$lib/lambert-grid.constants';
  import smallBodiesData from '$data/small-bodies.json';
  import { onReducedMotionChange } from '$lib/reduced-motion';
  import type { LocalizedPlanet } from '$types/planet';
  import type { LocalizedSun } from '$types/sun';
  import type { Mission } from '$types/mission';
  import PlanetPanel from '$lib/components/PlanetPanel.svelte';
  import SunPanel from '$lib/components/SunPanel.svelte';
  import SizesCanvas from '$lib/components/SizesCanvas.svelte';
  import SmallBodyPanel from '$lib/components/SmallBodyPanel.svelte';
  import * as m from '$lib/paraglide/messages';

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
    /** Filename in static/textures/. ADR-016: assets are local. */
    texture: string;
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
      texture: '2k_mercury.jpg',
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
      texture: '2k_venus_atmosphere.jpg',
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
      texture: '2k_earth_daymap.jpg',
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
      texture: '2k_mars.jpg',
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
      texture: '2k_jupiter.jpg',
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
      texture: '2k_saturn.jpg',
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
      texture: '2k_uranus.jpg',
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
      texture: '2k_neptune.jpg',
    },
  ];

  // Small bodies: dwarf planets, comets, the one known interstellar
  // visitor. Clickable on the 2D view since v0.x.x — same data drives
  // the SmallBodyPanel's overview/technical/learn tabs.
  type SmallBody = {
    id: string;
    name: string;
    type: 'dwarf' | 'comet' | 'interstellar';
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
  function sampleOrbitPoints(b: SmallBody, steps: number): { x: number; z: number }[] {
    const pts: { x: number; z: number }[] = [];
    const cosL = Math.cos(b.L0);
    const sinL = Math.sin(b.L0);
    if (b.type === 'interstellar') {
      // Hyperbolic: r = |a|(e²-1)/(1+e·cos ν). Sample ν in the valid
      // interval; render as an open polyline (NOT closed).
      const absA = Math.abs(b.a);
      const semiLatus = absA * (b.e * b.e - 1);
      const nuMax = Math.acos(-1 / b.e) * 0.985; // shy of asymptote so we don't get +∞
      for (let i = 0; i <= steps; i++) {
        const nu = -nuMax + (2 * nuMax * i) / steps;
        const rAu = semiLatus / (1 + b.e * Math.cos(nu));
        const xL = Math.cos(nu) * auToPx(rAu);
        const zL = Math.sin(nu) * auToPx(rAu);
        pts.push({ x: xL * cosL - zL * sinL, z: xL * sinL + zL * cosL });
      }
    } else {
      // Closed ellipse with foci offset toward Sun.
      const semiMajor = auToPx(b.a);
      const semiMinor = semiMajor * Math.sqrt(1 - b.e * b.e);
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const xL = Math.cos(a) * semiMajor - semiMajor * b.e;
        const zL = Math.sin(a) * semiMinor;
        pts.push({ x: xL * cosL - zL * sinL, z: xL * sinL + zL * cosL });
      }
    }
    return pts;
  }

  /**
   * Body position for a given simT (years from epoch). Interstellar
   * bodies pin to perihelion (no time evolution — they passed through
   * once in 2017 and are gone). Closed orbits advance with simT.
   */
  function smallBodyPosition(b: SmallBody, simT: number): { x: number; z: number } {
    const cosL = Math.cos(b.L0);
    const sinL = Math.sin(b.L0);
    if (b.type === 'interstellar') {
      // Pin at perihelion (ν=0): a fixed teaching marker.
      const absA = Math.abs(b.a);
      const semiLatus = absA * (b.e * b.e - 1);
      const rAu = semiLatus / (1 + b.e); // ν=0
      const xL = auToPx(rAu);
      return { x: xL * cosL, z: xL * sinL };
    }
    const semiMajor = auToPx(b.a);
    const semiMinor = semiMajor * Math.sqrt(1 - b.e * b.e);
    const Tyr = b.T / 365.25;
    const ang = b.L0 + simT * ((2 * Math.PI) / Tyr);
    const xL = Math.cos(ang) * semiMajor - semiMajor * b.e;
    const zL = Math.sin(ang) * semiMinor;
    return { x: xL * cosL - zL * sinL, z: xL * sinL + zL * cosL };
  }

  let container: HTMLDivElement | undefined = $state();
  let canvas2d: HTMLCanvasElement | undefined = $state();
  let view: '3d' | '2d' = $state('3d');
  let localizedPlanets: LocalizedPlanet[] = $state([]);
  let localizedSun: LocalizedSun | null = $state(null);
  let selectedId: string | null = $state(null);
  let panelOpen = $state(false);
  let sunPanelOpen = $state(false);
  let sizesOpen = $state(false);
  let selectedSmallBodyId: string | null = $state(null);
  let smallBodyPanelOpen = $state(false);
  let selectedSmallBody = $derived(
    selectedSmallBodyId ? (smallBodyById.get(selectedSmallBodyId) ?? null) : null,
  );

  // ESC closes the sizes overlay. Using a window listener here (gated
  // by sizesOpen) so the dialog is keyboard-dismissible without a
  // svelte:window element inside the {#if} block, which prettier
  // doesn't like nested.
  $effect(() => {
    if (!sizesOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') sizesOpen = false;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  let hoverData: {
    name: string;
    velocity: string;
    distance: string;
    extras: string;
    x: number;
    y: number;
  } | null = $state(null);
  let cleanup: (() => void) | undefined;

  // ─── Mission overlay (Theme A.A1 — v0.1.10 / issue #16) ──────────
  // When `/explore?mission=ID` is loaded, fetch the mission and
  // compute its outbound arc once. Rendered as a 2D Canvas line in
  // draw2d (3D rendering is stretch — deferred to a follow-up).
  let overlayMission: Mission | null = $state(null);
  let overlayArcPx: { x: number; z: number }[] = $state([]);
  let overlayArrivalPx: { x: number; z: number } | null = $state(null);
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
      const dest = entry.dest === 'MARS' ? 'mars' : 'mars'; // overlay is Mars-only for now
      const mission = await getMission(id, entry.dest);
      if (!mission || cancelled) return;
      const depDay = dateToSimDay(mission.departure_date) ?? 0;
      const earthDep = earthPos(depDay);
      const destA = DESTINATIONS[dest as DestinationId].a;
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

  function selectPlanet(id: string) {
    selectedId = id;
    panelOpen = true;
    sunPanelOpen = false;
    smallBodyPanelOpen = false;
  }

  function selectSun() {
    sunPanelOpen = true;
    panelOpen = false;
    smallBodyPanelOpen = false;
  }

  function selectSmallBody(id: string) {
    selectedSmallBodyId = id;
    smallBodyPanelOpen = true;
    panelOpen = false;
    sunPanelOpen = false;
  }

  function closePanel() {
    panelOpen = false;
  }

  function closeSunPanel() {
    sunPanelOpen = false;
  }

  function onPlanMission() {
    if (selectedPlanet?.missionable) {
      goto(`${base}/plan`);
    }
  }

  onMount(() => {
    if (!container || !canvas2d) return;

    // Async-load localised planet + sun data; safe to run alongside scene setup.
    getPlanets()
      .then((p) => {
        localizedPlanets = p;
      })
      .catch((err) => console.error('Failed to load planets:', err));
    getSun()
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

    const textureLoader = new THREE.TextureLoader();
    const loadTexture = (file: string): THREE.Texture =>
      textureLoader.load(`${base}/textures/${file}`);

    const sunMap = loadTexture('2k_sun.jpg');
    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(18, 32, 32),
      new THREE.MeshBasicMaterial({ map: sunMap, color: 0xfff0a0 }),
    );
    sunMesh.userData = { planetId: '__sun__' };
    scene.add(sunMesh);
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
        map: loadTexture(p.texture),
        color: 0xffffff,
        emissive: p.color3,
        emissiveIntensity: 0.06,
        shininess: 25,
        specular: 0x222222,
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.size3, 32, 32), mat);
      mesh.userData = { planetId: p.id };
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

    // ── Small bodies (3D) ─────────────────────────────────────────
    // Mirrors the 2D treatment: eccentric ellipse + foci offset + L0
    // rotation, plus a small sphere mesh per body. Comets get a faint
    // anti-solar tail line that updates each frame.
    type SmallBodyObj = {
      mesh: THREE.Mesh;
      tail?: THREE.Line;
      body: SmallBody;
    };
    const smallBodyObjs: SmallBodyObj[] = SMALL_BODIES.map((b) => {
      // Orbit path — closed ellipse for dwarf/comet, open hyperbola
      // for interstellar bodies. Use Line (open) for interstellar so
      // the trajectory doesn't visually close back on itself.
      const orbitPts = sampleOrbitPoints(b, 128).map((p) => new THREE.Vector3(p.x, 0, p.z));
      const trajColor =
        b.type === 'interstellar' ? 0xff8866 : b.type === 'comet' ? 0x88ddff : 0xc8b48c;
      const TrajCtor = b.type === 'interstellar' ? THREE.Line : THREE.LineLoop;
      scene.add(
        new TrajCtor(
          new THREE.BufferGeometry().setFromPoints(orbitPts),
          new THREE.LineBasicMaterial({
            color: trajColor,
            transparent: true,
            opacity: b.type === 'interstellar' ? 0.4 : 0.22,
            depthWrite: false,
          }),
        ),
      );

      // Body mesh — tiny coloured sphere.
      const colorInt = parseInt(b.color.slice(1), 16);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(b.type === 'comet' ? 1.2 : 1.8, 12, 12),
        new THREE.MeshPhongMaterial({
          color: colorInt,
          emissive: colorInt,
          emissiveIntensity: 0.5,
        }),
      );
      mesh.userData = { smallBodyId: b.id };
      scene.add(mesh);

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

      return { mesh, tail, body: b };
    });

    // Selection ring (3D) — single torus reused for whichever planet is
    // selected. Hidden when nothing is selected. Pulses by modulating
    // material opacity in the animation loop.
    const selRingGeo = new THREE.TorusGeometry(1, 0.18, 12, 64);
    const selRingMat = new THREE.MeshBasicMaterial({
      color: 0x4466ff,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const selRing = new THREE.Mesh(selRingGeo, selRingMat);
    selRing.visible = false;
    scene.add(selRing);

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
    let dragMoved3d = false;
    let downX3d = 0;
    let downY3d = 0;

    const ray3d = new THREE.Raycaster();
    const planetMeshes = planetObjs.map((o) => o.mesh);
    // Sun is included so it can be picked but it's never the selectedPlanet.
    const pickables: THREE.Object3D[] = [...planetMeshes, sunMesh];

    const tryPick3d = (e: MouseEvent) => {
      const rect = el3d.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray3d.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const hits = ray3d.intersectObjects(pickables, false);
      const hit = hits.find((h) => typeof h.object.userData.planetId === 'string');
      if (!hit) return;
      const id = hit.object.userData.planetId as string;
      if (id === '__sun__') selectSun();
      else selectPlanet(id);
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
    const onHover = (e: MouseEvent) => {
      if (view !== '3d' || isDrag3d) {
        if (hoverData) hoverData = null;
        return;
      }
      const rect = el3d.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray3dHover.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const hits = ray3dHover.intersectObjects(planetMeshes, false);
      if (hits.length === 0) {
        if (hoverData) hoverData = null;
        return;
      }
      const id = hits[0].object.userData.planetId as string;
      const planet = planetById.get(id);
      if (!planet) return;
      // Mean velocity at r=a; vis-viva collapses to sqrt(μ/a). μ ≈ 4π²
      // in AU³/yr², 4.7404 km/s per AU/yr (IAU 2012).
      const v = Math.sqrt((4 * Math.PI ** 2) / planet.a) * 4.7404;
      hoverData = {
        name: planet.name,
        velocity: `~${v.toFixed(2)} km/s orbital velocity`,
        distance: `${(planet.a * 149.5978707).toFixed(0)} M km from Sun`,
        extras: `e=${planet.e.toFixed(3)} · i=${planet.incl.toFixed(1)}° · tilt=${planet.axialTilt.toFixed(1)}°`,
        x: e.clientX,
        y: e.clientY,
      };
    };
    const onHoverLeave = () => {
      hoverData = null;
    };

    const on3dMouseDown = (e: MouseEvent) => {
      isDrag3d = true;
      dragMoved3d = false;
      lmx3d = e.clientX;
      lmy3d = e.clientY;
      downX3d = e.clientX;
      downY3d = e.clientY;
      el3d.style.cursor = 'grabbing';
    };
    const on3dMouseMove = (e: MouseEvent) => {
      if (!isDrag3d) return;
      const dx = e.clientX - lmx3d;
      const dy = e.clientY - lmy3d;
      if (Math.abs(e.clientX - downX3d) + Math.abs(e.clientY - downY3d) > 4) {
        dragMoved3d = true;
      }
      camT -= dx * 0.006;
      camP = Math.max(0.08, Math.min(Math.PI * 0.48, camP + dy * 0.005));
      lmx3d = e.clientX;
      lmy3d = e.clientY;
      updateCam();
    };
    const on3dMouseUp = (e: MouseEvent) => {
      const wasDrag = dragMoved3d;
      isDrag3d = false;
      el3d.style.cursor = 'grab';
      if (!wasDrag && view === '3d') tryPick3d(e);
    };
    const on3dWheel = (e: WheelEvent) => {
      camR = Math.max(120, Math.min(1400, camR + e.deltaY * 0.7));
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
          const ratio = pinchPrev3d / dist;
          camR = Math.max(120, Math.min(1400, camR * ratio));
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
      if (
        wasActive &&
        !wasMoved &&
        view === '3d' &&
        e.changedTouches.length === 1 &&
        e.touches.length === 0
      ) {
        const t = e.changedTouches[0];
        tryPick3d({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
      }
    };

    el3d.style.cursor = 'grab';
    el3d.addEventListener('mousedown', on3dMouseDown);
    window.addEventListener('mousemove', on3dMouseMove);
    window.addEventListener('mouseup', on3dMouseUp);
    el3d.addEventListener('wheel', on3dWheel, { passive: true });
    el3d.addEventListener('touchstart', on3dTouchStart, { passive: true });
    el3d.addEventListener('touchmove', on3dTouchMove, { passive: true });
    el3d.addEventListener('touchend', on3dTouchEnd);
    el3d.addEventListener('mousemove', onHover);
    el3d.addEventListener('mouseleave', onHoverLeave);

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
      SMALL_BODIES.forEach((b) => {
        const pts = sampleOrbitPoints(b, 96);
        ctx2.save();
        ctx2.beginPath();
        for (let i = 0; i < pts.length; i++) {
          if (i === 0) ctx2.moveTo(pts[i].x, pts[i].z);
          else ctx2.lineTo(pts[i].x, pts[i].z);
        }
        if (b.type === 'interstellar') {
          // Open hyperbolic trajectory — solid faint orange.
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

      // Planets
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
      // they passed through once and are gone).
      smallBody2dPos.clear();
      SMALL_BODIES.forEach((b) => {
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
      resize2d();
    };
    window.addEventListener('resize', onResize);

    // ──────────────────────────────────────────────────────────────
    // Animation loop — dispatches by `view`
    // ──────────────────────────────────────────────────────────────

    let simT = 0;
    let lastTime = performance.now();
    let rafId = 0;
    let reducedMotion = false;
    const stopReducedMotionWatch = onReducedMotionChange((r) => {
      reducedMotion = r;
    });
    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      // ADR-025: when prefers-reduced-motion is set we freeze sim
      // time. User-initiated camera drag still works.
      if (!reducedMotion) simT += dt * 0.04;

      if (view === '3d') {
        planetObjs.forEach(({ group, mesh, planet }) => {
          const angle = planet.a0 + (2 * Math.PI * simT) / planet.period;
          const inc = (planet.inc * Math.PI) / 180;
          const x = Math.cos(angle) * planet.orbitR;
          const zf = Math.sin(angle) * planet.orbitR;
          group.position.set(x, zf * Math.sin(inc), zf * Math.cos(inc));
          // ADR-025: gate the per-frame axial spin under reduced-motion
          // alongside the orbit advance. The audit caught this bypass
          // in v1.0 — planets kept spinning even with simT frozen.
          if (!reducedMotion) mesh.rotation.y += 0.005;
        });

        // Small bodies — closed ellipse advance for dwarfs/comets,
        // pinned-to-perihelion for interstellar visitors (Oumuamua).
        // Comet tails recompute per-frame pointing anti-solar.
        smallBodyObjs.forEach(({ mesh, tail, body }) => {
          const { x: px, z: pz } = smallBodyPosition(body, simT);
          mesh.position.set(px, 0, pz);

          if (tail) {
            const distFromSun = Math.hypot(px, pz);
            if (distFromSun > 0) {
              const tailLen = 12;
              const tx = px + (px / distFromSun) * tailLen;
              const tz = pz + (pz / distFromSun) * tailLen;
              tail.geometry.dispose();
              tail.geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(px, 0, pz),
                new THREE.Vector3(tx, 0, tz),
              ]);
            }
          }
        });

        // Track selected planet with the 3D selection ring (lying in
        // the planet's orbital plane). Hidden when nothing is selected.
        if (selectedId) {
          const selObj = planetObjs.find((o) => o.planet.id === selectedId);
          if (selObj) {
            const ringR = selObj.planet.size3 * 1.9;
            selRing.scale.set(ringR, ringR, 1);
            selRing.position.copy(selObj.group.position);
            // Lay flat in the ecliptic plane (XZ), then tilt to the planet's
            // orbital inclination so the ring matches the local orbit normal.
            selRing.rotation.set(Math.PI / 2, 0, 0);
            const incRad = (selObj.planet.inc * Math.PI) / 180;
            selRing.rotateZ(incRad);
            const pulse = 0.5 + 0.5 * Math.sin(simT * 80);
            selRingMat.opacity = 0.35 + pulse * 0.45;
            selRing.visible = true;
          } else {
            selRing.visible = false;
          }
        } else {
          selRing.visible = false;
        }

        renderer.render(scene, camera);
      } else {
        draw2d();
      }
    };
    animate(performance.now());

    cleanup = () => {
      cancelAnimationFrame(rafId);
      stopReducedMotionWatch();
      el3d.removeEventListener('mousedown', on3dMouseDown);
      window.removeEventListener('mousemove', on3dMouseMove);
      window.removeEventListener('mouseup', on3dMouseUp);
      el3d.removeEventListener('wheel', on3dWheel);
      el3d.removeEventListener('touchstart', on3dTouchStart);
      el3d.removeEventListener('touchmove', on3dTouchMove);
      el3d.removeEventListener('touchend', on3dTouchEnd);
      el3d.removeEventListener('mousemove', onHover);
      el3d.removeEventListener('mouseleave', onHoverLeave);
      c2.removeEventListener('wheel', on2dWheel);
      c2.removeEventListener('mousedown', on2dMouseDown);
      window.removeEventListener('mouseup', on2dMouseUp);
      window.removeEventListener('mousemove', on2dMouseMove);
      c2.removeEventListener('touchstart', on2dTouchStart);
      c2.removeEventListener('touchmove', on2dTouchMove);
      c2.removeEventListener('touchend', on2dTouchEnd);
      window.removeEventListener('resize', onResize);

      // Dispose any textures attached to materials before disposing
      // the materials themselves — Three.js doesn't cascade.
      const disposeMatTextures = (m: THREE.Material) => {
        const mat = m as THREE.Material & {
          map?: THREE.Texture | null;
          emissiveMap?: THREE.Texture | null;
          normalMap?: THREE.Texture | null;
        };
        mat.map?.dispose();
        mat.emissiveMap?.dispose();
        mat.normalMap?.dispose();
      };
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => {
              disposeMatTextures(m);
              m.dispose();
            });
          } else if (obj.material) {
            disposeMatTextures(obj.material);
            obj.material.dispose();
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
  <div
    class="layer"
    bind:this={container}
    class:hidden={view !== '3d'}
    role="region"
    aria-label="3D solar system. Drag to orbit, scroll or pinch to zoom, click planets and Sun for details."
  ></div>
  <canvas
    class="layer"
    bind:this={canvas2d}
    class:hidden={view !== '2d'}
    aria-label="2D top-down solar system. Drag to pan, scroll or pinch to zoom, tap planets and Sun for details."
  ></canvas>
  <button
    class="toggle"
    class:panel-shifted={panelOpen || sunPanelOpen}
    type="button"
    onclick={toggleView}
    aria-pressed={view === '2d'}
  >
    {view === '3d' ? '2D' : '3D'}
  </button>
  <button
    class="toggle sizes-toggle"
    class:panel-shifted={panelOpen || sunPanelOpen}
    type="button"
    onclick={() => (sizesOpen = !sizesOpen)}
    aria-pressed={sizesOpen}
    aria-label={m.explore_sizes_toggle()}
    data-testid="sizes-toggle"
  >
    {m.explore_sizes_toggle()}
  </button>

  {#if sizesOpen}
    <!-- Size comparison overlay — modal-style, mirrors selected planet
         (if any) so the user keeps context. ESC + backdrop click close. -->
    <button
      type="button"
      class="sizes-backdrop"
      aria-label={m.explore_sizes_close()}
      onclick={() => (sizesOpen = false)}
    ></button>
    <div class="sizes-card" role="dialog" aria-modal="true" aria-label={m.explore_sizes_toggle()}>
      <button
        type="button"
        class="sizes-close"
        aria-label={m.explore_sizes_close()}
        onclick={() => (sizesOpen = false)}>×</button
      >
      <div class="sizes-canvas-wrap">
        <SizesCanvas highlightId={selectedId} />
      </div>
    </div>
  {/if}

  {#if hoverData && view === '3d'}
    <div
      class="tooltip"
      role="status"
      aria-live="polite"
      aria-label="{hoverData.name} — {hoverData.velocity}, {hoverData.distance}, {hoverData.extras}"
      style:left="{Math.min(hoverData.x + 14, (container?.clientWidth ?? 0) - 200)}px"
      style:top="{Math.max(hoverData.y - 60, 60)}px"
    >
      <div class="tt-line">{hoverData.velocity}</div>
      <div class="tt-line dim">{hoverData.distance}</div>
      <div class="tt-line dim">{hoverData.extras}</div>
    </div>
  {/if}
</div>

<PlanetPanel
  planet={selectedPlanet}
  open={panelOpen}
  onClose={closePanel}
  onPlanMission={selectedPlanet?.missionable ? onPlanMission : undefined}
/>

<SunPanel sun={localizedSun} open={sunPanelOpen} onClose={closeSunPanel} />

<SmallBodyPanel
  body={selectedSmallBody}
  open={smallBodyPanelOpen}
  onClose={() => (smallBodyPanelOpen = false)}
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
  :global(.explore canvas) {
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
    transition:
      border-color 120ms,
      background 120ms,
      right 200ms;
  }
  .toggle:hover,
  .toggle:focus-visible {
    border-color: #4466ff;
    background: rgba(20, 26, 50, 0.95);
    outline: none;
  }
  .sizes-toggle {
    /* Sit just below the 2D/3D toggle. min-height 44px + 8px gap. */
    top: calc(var(--nav-height) + 12px + 44px + 8px);
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
    height: min(540px, calc(100vh - 110px));
  }
  .sizes-canvas-wrap :global(canvas) {
    width: 100%;
    height: 100%;
  }

  /* When a detail panel is open on desktop, shift the toggle left so
     it clears the right-drawer (314px wide). On mobile the panel is a
     bottom-sheet and never overlaps the top-right toggle. */
  @media (min-width: 768px) {
    .toggle.panel-shifted {
      right: calc(var(--panel-width, 314px) + 16px);
    }
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
  .tt-line {
    font-size: 9px;
    line-height: 1.5;
    color: rgba(230, 235, 255, 0.85);
  }
  .tt-line.dim {
    color: rgba(255, 255, 255, 0.5);
    font-size: 8px;
  }
</style>
