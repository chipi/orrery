/**
 * Framework-free builder for the /explore solar-system Three.js scene.
 * Extracted from src/routes/explore/+page.svelte so the same geometry
 * can be shared by the /explore route and the AR renderer.
 *
 * Callers inject `loadTexture` (which resolves the base path); the module
 * never touches $app/paths, window, or the DOM at import time (SSR-safe).
 */
import * as THREE from 'three';
import { createLayeredStarField } from '$lib/three/star-field.js';

// ─── Public data types ──────────────────────────────────────────────────────

export type SatelliteDef = {
  id: string;
  name: string;
  /** Filename under static/textures/. */
  texture?: string;
  /** Hex colour fallback when `texture` is omitted. */
  fallbackColor?: number;
  /** Scene-units sphere radius. */
  sizeUnits: number;
  /** Scene-units orbital radius from parent centre. */
  orbitUnits: number;
  /** Sidereal period in days. Negative = retrograde. */
  periodDays: number;
  /** Orbital inclination relative to parent equator, degrees. */
  inclDeg?: number;
};

export type PlanetVisual = {
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
  texture: string;
  texture4k?: string;
  emissiveMap?: string;
  satellites?: SatelliteDef[];
  halo?: { color: number; opacityMax: number };
  axialTiltDeg: number;
  rotationHours: number;
  magneticTiltDeg?: number;
};

// ─── Planet catalogue (verbatim from explore/+page.svelte) ──────────────────

export const PLANETS: PlanetVisual[] = [
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
    axialTiltDeg: 0.034,
    rotationHours: 1407.5,
    magneticTiltDeg: 0.7,
    texture: '2k_mercury.jpg',
    texture4k: '4k_mercury.jpg',
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
    axialTiltDeg: 177.36,
    rotationHours: -5832.5,
    texture: '2k_venus_atmosphere.jpg',
    texture4k: '4k_venus_atmosphere.jpg',
    halo: { color: 0xe8cda0, opacityMax: 0.28 },
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
    axialTiltDeg: 23.4393,
    rotationHours: 23.9345,
    magneticTiltDeg: 10.5,
    texture: '2k_earth_daymap.jpg',
    texture4k: '4k_earth_daymap.jpg',
    emissiveMap: '2k_earth_nightmap.jpg',
    halo: { color: 0x6aa8ff, opacityMax: 0.25 },
    satellites: [
      {
        id: 'moon',
        name: 'Moon',
        texture: '2k_moon.jpg',
        sizeUnits: 0.9,
        orbitUnits: 24,
        periodDays: 27.32,
        inclDeg: 5.14,
      },
    ],
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
    axialTiltDeg: 25.19,
    rotationHours: 24.6229,
    texture: '2k_mars.jpg',
    texture4k: '4k_mars.jpg',
    satellites: [
      {
        id: 'phobos',
        name: 'Phobos',
        texture: '2k_phobos.jpg',
        sizeUnits: 0.45,
        orbitUnits: 12,
        periodDays: 0.3189,
        inclDeg: 1.08,
      },
      {
        id: 'deimos',
        name: 'Deimos',
        texture: '2k_deimos.jpg',
        sizeUnits: 0.32,
        orbitUnits: 18,
        periodDays: 1.263,
        inclDeg: 1.79,
      },
    ],
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
    axialTiltDeg: 3.13,
    rotationHours: 9.925,
    magneticTiltDeg: 9.6,
    texture: '2k_jupiter.jpg',
    texture4k: '4k_jupiter.jpg',
    halo: { color: 0xd0b07a, opacityMax: 0.18 },
    satellites: [
      {
        id: 'io',
        name: 'Io',
        texture: '4k_io.jpg',
        sizeUnits: 1.3,
        orbitUnits: 24,
        periodDays: 1.769,
      },
      {
        id: 'europa',
        name: 'Europa',
        texture: '2k_europa.jpg',
        sizeUnits: 1.1,
        orbitUnits: 30,
        periodDays: 3.551,
      },
      {
        id: 'ganymede',
        name: 'Ganymede',
        texture: '2k_ganymede.jpg',
        sizeUnits: 1.7,
        orbitUnits: 38,
        periodDays: 7.155,
      },
      {
        id: 'callisto',
        name: 'Callisto',
        texture: '2k_callisto.jpg',
        sizeUnits: 1.6,
        orbitUnits: 48,
        periodDays: 16.689,
      },
    ],
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
    axialTiltDeg: 26.73,
    rotationHours: 10.656,
    magneticTiltDeg: 0.0,
    hasRings: true,
    texture: '2k_saturn.jpg',
    texture4k: '4k_saturn.jpg',
    halo: { color: 0xd0c08a, opacityMax: 0.15 },
    satellites: [
      {
        id: 'titan',
        name: 'Titan',
        texture: '4k_titan.jpg',
        sizeUnits: 1.7,
        orbitUnits: 36,
        periodDays: 15.945,
        inclDeg: 0.33,
      },
      {
        id: 'enceladus',
        name: 'Enceladus',
        texture: '4k_enceladus.jpg',
        sizeUnits: 0.8,
        orbitUnits: 22,
        periodDays: 1.37,
        inclDeg: 0.02,
      },
    ],
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
    axialTiltDeg: 97.77,
    rotationHours: -17.24,
    magneticTiltDeg: 58.6,
    texture: '2k_uranus.jpg',
    satellites: [
      {
        id: 'miranda',
        name: 'Miranda',
        fallbackColor: 0xb8b8c0,
        sizeUnits: 0.6,
        orbitUnits: 14,
        periodDays: 1.413,
        inclDeg: 4.34,
      },
      {
        id: 'ariel',
        name: 'Ariel',
        fallbackColor: 0xd4d4d4,
        sizeUnits: 0.95,
        orbitUnits: 20,
        periodDays: 2.52,
        inclDeg: 0.04,
      },
      {
        id: 'umbriel',
        name: 'Umbriel',
        fallbackColor: 0x8c8a86,
        sizeUnits: 0.95,
        orbitUnits: 26,
        periodDays: 4.144,
        inclDeg: 0.13,
      },
      {
        id: 'titania',
        name: 'Titania',
        fallbackColor: 0xc4b8a8,
        sizeUnits: 1.2,
        orbitUnits: 33,
        periodDays: 8.706,
        inclDeg: 0.08,
      },
      {
        id: 'oberon',
        name: 'Oberon',
        fallbackColor: 0xb8a898,
        sizeUnits: 1.15,
        orbitUnits: 40,
        periodDays: 13.463,
        inclDeg: 0.07,
      },
    ],
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
    axialTiltDeg: 28.32,
    rotationHours: 16.11,
    magneticTiltDeg: 46.9,
    texture: '2k_neptune.jpg',
    satellites: [
      {
        id: 'triton',
        name: 'Triton',
        texture: '2k_triton.jpg',
        fallbackColor: 0xd4b8a0,
        sizeUnits: 1.5,
        orbitUnits: 22,
        periodDays: -5.877,
        inclDeg: 156.86,
      },
    ],
  },
  {
    id: 'pluto',
    name: 'Pluto',
    orbitR: 580,
    size3: 1.5,
    size2: 1.8,
    color3: 0xd0b48c,
    css: '#d0b48c',
    period: 247.94,
    a0: 4.2,
    inc: 17.16,
    axialTiltDeg: 122.53,
    rotationHours: -153.3,
    texture: '4k_pluto.jpg',
    texture4k: '4k_pluto.jpg',
    satellites: [
      {
        id: 'charon',
        name: 'Charon',
        texture: '2k_charon.jpg',
        sizeUnits: 0.78,
        orbitUnits: 6,
        periodDays: 6.387,
        inclDeg: 0.0,
      },
    ],
  },
];

// ─── J2000 mean longitudes — used by setInitialSimT() ────────────────────────

const MEAN_LON_J2000_DEG: Record<string, number> = {
  mercury: 252.25,
  venus: 181.98,
  earth: 100.46,
  mars: 355.43,
  jupiter: 34.4,
  saturn: 49.94,
  uranus: 313.23,
  neptune: 304.88,
  pluto: 238.93,
};

const DAYS_PER_YEAR = 365.25;
const J2000_MS = Date.UTC(2000, 0, 1, 12);

// ─── Public API types ────────────────────────────────────────────────────────

export interface SolarSystemOptions {
  /** Caller injects — resolves `${base}/textures/<file>` and tags colorSpace. */
  loadTexture: (file: string) => THREE.Texture;
  /**
   * Multiply ALL positions and radii. Web passes 1; AR passes a small factor
   * (e.g. 0.2/450) to fit a tabletop. Relative proportions are unchanged.
   * Default 1.
   */
  scale?: number;
  /**
   * 'ar' reduces starfield counts, skips 4K LOD, disables shadow maps.
   * 'full' matches the route defaults. Default 'full'.
   */
  quality?: 'full' | 'ar';
  /** Override star counts. Defaults depend on quality. */
  starCounts?: { dim: number; bright: number; milkyWay: number };
}

export interface SolarSystem {
  /** Add to your scene. Contains sun, planets, orbit lines, starfield. */
  group: THREE.Group;
  /**
   * Advance the scene.
   * @param simT  Years since epoch (same clock the route uses).
   * @param dtSeconds  Wall-clock delta since last call. Used for self-spin
   *                   and satellite phase advance so bodies spin even when
   *                   simT is frozen.
   */
  update(simT: number, dtSeconds: number): void;
  /** Planet pivot group per planet id. */
  planetById: Map<string, THREE.Object3D>;
  /** Satellite mesh per satellite id. */
  satelliteById: Map<string, THREE.Object3D>;
  sun: THREE.Mesh;
  /**
   * Anchor all planet a0 angles to a real calendar date from simT.
   * Pass the route's J2000-derived simT (which is 0 for "today").
   * AR can pass 0 to use today's sky positions, or any offset.
   */
  setInitialSimT(simT: number): void;
  /** Dispose all geometries, materials, and textures created by this module. */
  dispose(): void;
}

// ─── Internal types ──────────────────────────────────────────────────────────

type SatState = {
  def: SatelliteDef;
  mesh: THREE.Mesh;
  orbitLine: THREE.LineLoop;
  angle: number;
  inclRad: number;
};

type PlanetState = {
  planet: PlanetVisual;
  group: THREE.Group;
  mesh: THREE.Mesh;
  satellites: SatState[];
  satellitesGroup: THREE.Group;
  haloMesh: THREE.Mesh | null;
};

// ─── Builder ─────────────────────────────────────────────────────────────────

export function buildSolarSystem(opts: SolarSystemOptions): SolarSystem {
  const sc = opts.scale ?? 1;
  const isAR = opts.quality === 'ar';
  const load = opts.loadTexture;

  // Track every disposable so dispose() can be thorough.
  const disposables: Array<THREE.BufferGeometry | THREE.Material | THREE.Texture> = [];

  function track<T extends THREE.BufferGeometry | THREE.Material | THREE.Texture>(v: T): T {
    disposables.push(v);
    return v;
  }

  const root = new THREE.Group();

  // ── Lighting ──────────────────────────────────────────────────────────────
  // PointLight at origin = Sun (shadow caster for Saturn rings).
  const sunLight = new THREE.PointLight(0xfff4d0, 4.5, 2500 * sc, 1.2);
  if (!isAR) {
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.1;
    sunLight.shadow.bias = -0.001;
  }
  root.add(sunLight);

  root.add(new THREE.HemisphereLight(0x08101a, 0x000000, 0.08));

  const fill = new THREE.DirectionalLight(0x223366, 0.3);
  fill.position.set(-200 * sc, 100 * sc, -200 * sc);
  root.add(fill);

  // ── Sun ──────────────────────────────────────────────────────────────────
  const SUN_RADIUS = 18 * sc;
  const sunTex = load('2k_sun.jpg');
  disposables.push(sunTex);
  const sunMat = track(new THREE.MeshBasicMaterial({ map: sunTex, color: 0xfff0a0 }));
  const sunGeo = track(new THREE.SphereGeometry(SUN_RADIUS, 32, 32));
  const sunMesh = new THREE.Mesh(sunGeo, sunMat);
  sunMesh.userData = { planetId: '__sun__' };
  root.add(sunMesh);

  // 4 additive glow shells around the Sun.
  const glowConfigs = [
    { r: 22, color: 0xffdd66, opacity: 0.18 },
    { r: 40, color: 0xff9922, opacity: 0.08 },
    { r: 58, color: 0xff6600, opacity: 0.04 },
    { r: 76, color: 0xff4400, opacity: 0.02 },
  ] as const;
  for (const g of glowConfigs) {
    const geo = track(new THREE.SphereGeometry(g.r * sc, 16, 16));
    const mat = track(
      new THREE.MeshBasicMaterial({
        color: g.color,
        transparent: true,
        opacity: g.opacity,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    root.add(new THREE.Mesh(geo, mat));
  }

  // ── Starfield ─────────────────────────────────────────────────────────────
  const defaultCounts = isAR
    ? { dim: 1200, bright: 200, milkyWay: 400 }
    : { dim: 1800, bright: 380, milkyWay: 1500 };
  const counts = opts.starCounts ?? defaultCounts;
  const stars = createLayeredStarField({ counts, shellRadius: 3000 * sc });
  root.add(stars);

  // ── Planet orbit rings ────────────────────────────────────────────────────
  for (const p of PLANETS) {
    const inc = (p.inc * Math.PI) / 180;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      const x = Math.cos(a) * p.orbitR * sc;
      const zf = Math.sin(a) * p.orbitR * sc;
      pts.push(new THREE.Vector3(x, zf * Math.sin(inc), zf * Math.cos(inc)));
    }
    const mat = track(
      new THREE.LineBasicMaterial({
        color: 0xc0d0ff,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      }),
    );
    const geo = track(new THREE.BufferGeometry().setFromPoints(pts));
    root.add(new THREE.LineLoop(geo, mat));
  }

  // ── Planet meshes, rings, satellites ─────────────────────────────────────
  const planetStates: PlanetState[] = [];
  const planetById = new Map<string, THREE.Object3D>();
  const satelliteById = new Map<string, THREE.Object3D>();

  for (const p of PLANETS) {
    const group = new THREE.Group();

    // Planet sphere
    const tex2k = load(p.texture);
    disposables.push(tex2k);
    const emissiveMapTex = p.emissiveMap ? load(p.emissiveMap) : undefined;
    if (emissiveMapTex) disposables.push(emissiveMapTex);

    const mat = track(
      new THREE.MeshStandardMaterial({
        map: tex2k,
        color: 0xb0b0b0,
        emissive: p.emissiveMap ? 0xffffff : p.color3,
        emissiveMap: emissiveMapTex,
        emissiveIntensity: p.emissiveMap ? 1.0 : 0.1,
        roughness: 1.0,
        metalness: 0,
      }),
    );
    const meshGeo = track(new THREE.SphereGeometry(p.size3 * sc, 32, 32));
    const mesh = new THREE.Mesh(meshGeo, mat);
    mesh.userData = { planetId: p.id };
    if (!isAR && p.id === 'saturn') mesh.receiveShadow = true;
    group.add(mesh);

    // Saturn rings
    if (p.hasRings) {
      const r0 = p.size3 * 1.4 * sc;
      const rOuter = p.size3 * 2.6 * sc;
      const span = rOuter - r0;
      const ringsGroup = new THREE.Group();
      const ringBands = [
        { inner: 0.0, outer: 0.18, color: 0x8a7858, opacity: 0.35 },
        { inner: 0.18, outer: 0.55, color: 0xf1d7a3, opacity: 0.62 },
        { inner: 0.55, outer: 0.6, color: 0x4a3f2c, opacity: 0.18 },
        { inner: 0.6, outer: 0.92, color: 0xddc497, opacity: 0.5 },
        { inner: 0.92, outer: 0.94, color: 0x4a3f2c, opacity: 0.15 },
        { inner: 0.94, outer: 1.0, color: 0xe4d191, opacity: 0.28 },
      ] as const;
      for (const b of ringBands) {
        const rg = track(new THREE.RingGeometry(r0 + b.inner * span, r0 + b.outer * span, 96));
        const rm = track(
          new THREE.MeshBasicMaterial({
            color: b.color,
            transparent: true,
            opacity: b.opacity,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        );
        const ringMesh = new THREE.Mesh(rg, rm);
        if (!isAR) ringMesh.castShadow = true;
        ringsGroup.add(ringMesh);
      }
      ringsGroup.rotation.x = Math.PI / 2.2;
      group.add(ringsGroup);
    }

    // Satellites
    const satellitesGroup = new THREE.Group();
    satellitesGroup.visible = true;
    const satellites: SatState[] = (p.satellites ?? []).map((s) => {
      const satMat = s.texture
        ? track(
            new THREE.MeshStandardMaterial({
              map: (() => {
                const t = load(s.texture!);
                disposables.push(t);
                return t;
              })(),
              color: 0xffffff,
              roughness: 1.0,
              metalness: 0,
            }),
          )
        : track(
            new THREE.MeshStandardMaterial({
              color: s.fallbackColor ?? 0xc8c8c8,
              roughness: 1.0,
              metalness: 0,
            }),
          );
      const satGeo = track(new THREE.SphereGeometry(s.sizeUnits * sc, 32, 32));
      const satMesh = new THREE.Mesh(satGeo, satMat);
      satMesh.userData = { satelliteId: s.id, parentPlanetId: p.id };
      satellitesGroup.add(satMesh);
      satelliteById.set(s.id, satMesh);

      // Dashed orbit ring — hidden initially, caller reveals at zoom.
      const inclRad = ((s.inclDeg ?? 0) * Math.PI) / 180;
      const cosI = Math.cos(inclRad);
      const sinI = Math.sin(inclRad);
      const segments = 96;
      const orbitPts: THREE.Vector3[] = [];
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * 2 * Math.PI;
        orbitPts.push(
          new THREE.Vector3(
            Math.cos(a) * s.orbitUnits * sc,
            Math.sin(a) * s.orbitUnits * sc * sinI,
            Math.sin(a) * s.orbitUnits * sc * cosI,
          ),
        );
      }
      const orbitGeo = track(new THREE.BufferGeometry().setFromPoints(orbitPts));
      const orbitMat = track(
        new THREE.LineDashedMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
          dashSize: s.orbitUnits * sc * 0.06,
          gapSize: s.orbitUnits * sc * 0.035,
        }),
      );
      const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat);
      orbitLine.computeLineDistances();
      orbitLine.visible = false;
      satellitesGroup.add(orbitLine);

      // Deterministic initial phase spread — avoids all moons piling at 0.
      const angle =
        ([...s.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0) % 360) * (Math.PI / 180);

      return { def: s, mesh: satMesh, orbitLine, angle, inclRad };
    });
    group.add(satellitesGroup);

    // Atmospheric halo — hidden, caller reveals at zoom.
    let haloMesh: THREE.Mesh | null = null;
    if (p.halo) {
      const hGeo = track(new THREE.SphereGeometry(p.size3 * 1.06 * sc, 32, 32));
      const hMat = track(
        new THREE.MeshBasicMaterial({
          color: p.halo.color,
          transparent: true,
          opacity: p.halo.opacityMax,
          side: THREE.BackSide,
          depthWrite: false,
        }),
      );
      haloMesh = new THREE.Mesh(hGeo, hMat);
      haloMesh.visible = false;
      group.add(haloMesh);
    }

    root.add(group);
    planetById.set(p.id, group);
    planetStates.push({ planet: p, group, mesh, satellites, satellitesGroup, haloMesh });
  }

  // Working copy of a0 — mutated by setInitialSimT() without touching PLANETS.
  const a0: Record<string, number> = {};
  for (const p of PLANETS) a0[p.id] = p.a0;

  // ── Public handle ─────────────────────────────────────────────────────────

  const DAYS_PER_YEAR_LOCAL = DAYS_PER_YEAR; // local alias for closure

  function setInitialSimT(simT: number): void {
    // Anchor planet start-angles to the real sky at the given simT offset.
    // Same math as the route's Layer 2-A block:
    //   deg = (L0 + 360 * yrSinceJ2000 / period) mod 360
    // where yrSinceJ2000 = (epochMs + simT*msPerYear - J2000_MS) / msPerYear.
    const epochMs = Date.now();
    const yrSinceJ2000 =
      (epochMs + simT * DAYS_PER_YEAR_LOCAL * 86_400_000 - J2000_MS) /
      (DAYS_PER_YEAR_LOCAL * 86_400_000);
    for (const p of PLANETS) {
      const L0 = MEAN_LON_J2000_DEG[p.id];
      if (L0 === undefined) continue;
      const deg = (((L0 + (360 * yrSinceJ2000) / p.period) % 360) + 360) % 360;
      a0[p.id] = deg * (Math.PI / 180);
    }
  }

  function update(simT: number, dtSeconds: number): void {
    const dt = Math.min(dtSeconds, 0.05);

    // Planet orbital positions + self-spin.
    // Route math (lines 4500–4508 of explore/+page.svelte):
    //   angle = a0 + 2π * simT / period
    //   x = cos(angle) * orbitR
    //   zf = sin(angle) * orbitR
    //   group.position = (x, zf*sin(inc), zf*cos(inc))
    //   mesh.rotation.y += 0.005  (every frame, not gated on simT)
    for (const ps of planetStates) {
      const p = ps.planet;
      const inc = (p.inc * Math.PI) / 180;
      const angle = a0[p.id] + (2 * Math.PI * simT) / p.period;
      const x = Math.cos(angle) * p.orbitR * sc;
      const zf = Math.sin(angle) * p.orbitR * sc;
      ps.group.position.set(x, zf * Math.sin(inc), zf * Math.cos(inc));
      // Self-spin uses dt (not simT) so bodies spin even when sim is paused.
      // Route uses a fixed 0.005 rad/frame at ~60 fps ≈ 0.3 rad/s.
      ps.mesh.rotation.y += 0.3 * dt;

      // Satellite phase advance.
      // Route math (lines 2714–2723):
      //   s.angle += (dt * yrPerSec * 2π) / periodDays
      //   where yrPerSec = simSpeed / DAYS_PER_YEAR (days/sec → yr/sec)
      // Here we fold the simSpeed into the caller's dtSeconds: the caller
      // passes wall-clock dt scaled by simSpeed/DAYS_PER_YEAR when they
      // want real-rate playback, or raw dt for 1× speed. AR passes raw dt.
      // To keep the interface simple we advance at 1 yr/sec by default;
      // the route's simSpeed scaling is a UI concern the route keeps.
      for (const s of ps.satellites) {
        s.angle += (dt * (2 * Math.PI)) / (s.def.periodDays * DAYS_PER_YEAR_LOCAL);
        const ca = Math.cos(s.angle);
        const sa = Math.sin(s.angle);
        const ci = Math.cos(s.inclRad);
        const si = Math.sin(s.inclRad);
        s.mesh.position.set(
          ca * s.def.orbitUnits * sc,
          sa * s.def.orbitUnits * sc * si,
          sa * s.def.orbitUnits * sc * ci,
        );
      }
    }
  }

  function dispose(): void {
    // Dispose all tracked geometries, materials, and textures.
    for (const d of disposables) d.dispose();
    disposables.length = 0;

    // Also traverse the root group for anything we might have missed
    // (e.g. starfield internals managed by createLayeredStarField).
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          for (const m of obj.material) m.dispose();
        } else {
          (obj.material as THREE.Material)?.dispose();
        }
      }
    });
  }

  return { group: root, update, planetById, satelliteById, sun: sunMesh, setInitialSimT, dispose };
}
