// Exoplanet BodyScene builder (/explore v2 Slice 2, RFC-032 §4).
//
// A self-contained mini-orrery for one host star + its known planets, on real
// Keplerian orbits (period / a / e from the NASA Exoplanet Archive). Orbits keep
// their true *relative* sizes (the outermost maps to a fixed display radius);
// bodies are proportional but enlarged for visibility and rendered as procedural
// shaded spheres — no invented textures (RFC-032 non-goal). The honest "not to
// scale · procedural" caption is shown by the panel. Pure orbit math lives in
// kepler.ts (unit-tested); this module is the WebGL builder (coverage-excluded).

import * as THREE from 'three';
import { bvToRgb, kelvinToRgb } from './bv-to-rgb';
import {
  orbitalPlanePosition,
  meanAnomaly,
  phaseForIndex,
  sampleEllipse,
} from '../physics/ephemeris/kepler';
import type { ExoplanetSystem } from '$lib/data';

export interface BodyScene {
  scene: THREE.Scene;
  root: THREE.Group;
  /** Per-planet pickable meshes; each carries userData.planetId. */
  planetPickables: THREE.Object3D[];
  /** World-unit radius of the outermost orbit — the caller frames the camera to it. */
  framingRadius: number;
  highlightPlanet(id: string | null): void;
  /** Advance the orrery to `simYears` of elapsed time. */
  update(simYears: number): void;
  dispose(): void;
}

const R_DISPLAY = 40; // world units: the outermost orbit maps here

const SPECTRAL_KELVIN: Record<string, number> = {
  O: 30000,
  B: 15000,
  A: 8500,
  F: 6500,
  G: 5500,
  K: 4500,
  M: 3200,
};
function spectralToKelvin(spect: string): number {
  const c = (spect || '').trim().charAt(0).toUpperCase();
  return SPECTRAL_KELVIN[c] ?? 5500;
}

/** Earth-radius estimate when only a mass is known (rough mass–radius relation). */
function effectiveRadiusEarth(radiusEarth: number | null, massEarth: number | null): number {
  if (radiusEarth != null) return radiusEarth;
  if (massEarth != null) return massEarth < 2 ? massEarth ** 0.28 : 1.0 * massEarth ** 0.55;
  return 1.5;
}
/** World-unit sphere size for a body — proportional (log) but enlarged + capped. */
function planetSize(radiusEarth: number): number {
  return Math.min(0.6 + Math.log2(1 + radiusEarth) * 0.75, 4);
}
/** Rough procedural body colour by size class (rocky → sub-Neptune → gas). */
function planetColor(radiusEarth: number): THREE.Color {
  if (radiusEarth < 1.6) return new THREE.Color(0xc2a184); // rocky, warm rock-brown
  if (radiusEarth < 4) return new THREE.Color(0x7fb8dd); // sub-Neptune, hazy blue
  return new THREE.Color(0xdcae72); // gas giant, banded tan
}

/** A soft radial-gradient texture for the star's glow sprite (no asset load). */
function makeGlowTexture(): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

export function createBodyScene(system: ExoplanetSystem): BodyScene {
  const disposables: Array<{ dispose(): void }> = [];
  const track = <T extends { dispose(): void }>(x: T): T => {
    disposables.push(x);
    return x;
  };

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x03050c);
  const root = new THREE.Group();
  scene.add(root);

  // Background starfield — distant stars so the system reads as a place in space,
  // not a void (matches the solar-system view). Decorative; a far shell well inside
  // BODY_FAR and beyond the outermost orbit.
  {
    const N = 1500;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const R_SKY = R_DISPLAY * 26;
    for (let i = 0; i < N; i++) {
      const th = Math.acos(2 * Math.random() - 1);
      const ph = Math.random() * Math.PI * 2;
      const r = R_SKY * (0.92 + Math.random() * 0.16);
      pos[i * 3] = r * Math.sin(th) * Math.cos(ph);
      pos[i * 3 + 1] = r * Math.cos(th);
      pos[i * 3 + 2] = r * Math.sin(th) * Math.sin(ph);
      const t = 0.55 + Math.random() * 0.45;
      const warm = Math.random() < 0.28;
      col[i * 3] = t * (warm ? 1 : 0.82);
      col[i * 3 + 1] = t * 0.9;
      col[i * 3 + 2] = t * (warm ? 0.78 : 1);
    }
    const g = track(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = track(
      new THREE.PointsMaterial({
        size: 1.7,
        sizeAttenuation: false,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    const stars = new THREE.Points(g, m);
    stars.frustumCulled = false;
    scene.add(stars);
  }

  // Host is the light source; a dim fill keeps night sides legible.
  scene.add(new THREE.AmbientLight(0x223044, 0.5));
  const starLight = new THREE.PointLight(0xffffff, 2.4, 0, 0.25);
  root.add(starLight);

  // Orbit display scale: relative sizes stay real; the outermost maps to R_DISPLAY.
  const maxA = Math.max(...system.planets.map((p) => p.a_au), 1e-3);
  const scale = R_DISPLAY / maxA;

  // ── Host star ─────────────────────────────────────────────────────────────
  const [sr, sgRaw, sbRaw] =
    system.star.bv != null
      ? bvToRgb(system.star.bv)
      : kelvinToRgb(spectralToKelvin(system.star.spect));
  // Deepen cool-star colour so red/orange dwarfs read as red-orange rather than
  // peach — the raw blackbody tint is warm but pale, and the additive glow below
  // would otherwise clip the core to white.
  const warm = sr > sbRaw;
  const sg = warm ? sgRaw * 0.85 : sgRaw;
  const sb = warm ? sbRaw * 0.65 : sbRaw;
  const starColor = new THREE.Color(sr, sg, sb);
  starLight.color = starColor.clone();
  const starMesh = new THREE.Mesh(
    track(new THREE.SphereGeometry(2.6, 48, 32)),
    track(new THREE.MeshBasicMaterial({ color: starColor })),
  );
  root.add(starMesh);
  // Soft radial glow via an additive sprite — a halo around the star, kept dim
  // enough that the coloured core still shows through (no white-out).
  const glowTex = track(makeGlowTexture());
  const glow = new THREE.Sprite(
    track(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: starColor,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );
  glow.scale.setScalar(10);
  root.add(glow);

  // ── Planets + orbit lines ────────────────────────────────────────────────
  const planetPickables: THREE.Object3D[] = [];
  const states: Array<{
    mesh: THREE.Mesh;
    a: number;
    e: number;
    period: number;
    phase: number;
  }> = [];

  system.planets.forEach((p, i) => {
    const aScene = p.a_au * scale;
    // Orbit line: ellipse with the star at a focus, drawn in the XZ plane.
    const pts = sampleEllipse(aScene, p.e, 192).map(([x, y]) => new THREE.Vector3(x, 0, y));
    const geo = track(new THREE.BufferGeometry().setFromPoints(pts));
    const line = new THREE.Line(
      geo,
      track(
        new THREE.LineBasicMaterial({
          color: 0x8fb7ff,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
        }),
      ),
    );
    root.add(line);

    const rE = effectiveRadiusEarth(p.radius_earth, p.mass_earth);
    const mesh = new THREE.Mesh(
      track(new THREE.SphereGeometry(planetSize(rE), 32, 24)),
      track(
        new THREE.MeshStandardMaterial({ color: planetColor(rE), roughness: 0.9, metalness: 0 }),
      ),
    );
    mesh.userData = { planetId: p.id };
    root.add(mesh);
    planetPickables.push(mesh);
    states.push({
      mesh,
      a: aScene,
      e: p.e,
      period: p.period_days,
      phase: phaseForIndex(i, system.planets.length),
    });
  });

  function positionAt(simYears: number) {
    for (const st of states) {
      const M = meanAnomaly(simYears, st.period, st.phase);
      const { x, y } = orbitalPlanePosition(st.a, st.e, M);
      st.mesh.position.set(x, 0, y);
    }
  }
  positionAt(0);

  return {
    scene,
    root,
    planetPickables,
    framingRadius: R_DISPLAY,
    highlightPlanet(id: string | null) {
      for (const st of states) {
        st.mesh.scale.setScalar(st.mesh.userData.planetId === id ? 1.5 : 1);
      }
    },
    update(simYears: number) {
      positionAt(simYears);
    },
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}
