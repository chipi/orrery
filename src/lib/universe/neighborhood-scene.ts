// The Stellar Neighborhood context scene for /explore v2 (RFC-032 §1/§3).
//
// A self-contained THREE.Scene holding the real HYG star field (PointField) plus
// the Sun rendered as a single luminous sprite at the origin. This is context-1:
// units are parsecs (1 pc = 1 world unit). The caller drives `update(camDistPc)`
// to play the boundary reveal — the field fades in and the Sun shrinks to a dot
// as the camera pulls back — and renders this scene with the shared camera when
// the ContextGraph's active context is 'neighborhood'.
//
// Coverage-excluded (WebGL, like point-field.ts / explore-scene.ts). Its pure
// inputs (star selection, budget, context math) are tested separately.

import * as THREE from 'three';
import { selectVisibleStars, type ShellData } from './star-selection';
import { createPointField, type PointFieldHandle } from './point-field';
import { tierToStarBudget } from './budget';
import { describeAnonymousStar, type AnonymousStar } from './anonymous-star';
import type { NamedStar } from '$lib/data';
import type { QualityTier } from '$lib/quality/quality-tier';

export interface NeighborhoodScene {
  scene: THREE.Scene;
  starCount: number;
  /** THREE.Points object for the background field — the anonymous-pick raycast target. */
  fieldObject: THREE.Points;
  /** Named-star marker groups — the raycast targets for selection/hover. */
  namedStarPickables: THREE.Object3D[];
  /** World position of a named star, or null. */
  starPosition(id: string): THREE.Vector3 | null;
  /** Emphasize one named star (hover/selection), or clear with null. */
  highlightStar(id: string | null): void;
  /** Lightweight readout for a background point-field star by its vertex index. */
  anonymousStarAt(index: number): AnonymousStar | null;
  /** Toggle the constellation-line overlay. */
  setConstellationsVisible(on: boolean): void;
  /** Reveal state + per-frame marker sizing. Pass the camera so markers keep a
   *  constant on-screen size regardless of each star's distance. */
  update(camDistPc: number, camera?: THREE.Camera): void;
  dispose(): void;
}

export interface ConstellationLines {
  con: string;
  /** Flat parsec XYZ; every 2 points (6 numbers) is one line segment. */
  vertices: number[];
}

export interface NeighborhoodOptions {
  shells: ShellData[];
  tier?: QualityTier;
  pixelRatio?: number;
  /** Curated named stars to render as pickable markers + labels. */
  namedStars?: NamedStar[];
  /** Constellation line segments (baked 3D positions) for the overlay. */
  constellations?: ConstellationLines[];
}

/** Fetch the constellation-line data from static/data/universe/. */
export async function loadConstellationLines(
  fetchFn: typeof fetch,
  base = '',
): Promise<ConstellationLines[]> {
  try {
    const doc = (await (
      await fetchFn(`${base}/data/universe/constellation-lines.json`)
    ).json()) as { constellations: ConstellationLines[] };
    return doc.constellations ?? [];
  } catch {
    return [];
  }
}

/** Fetch the tiled HYG shells from static/data/universe/stars/ via the app base. */
export async function loadNeighborhoodShells(
  fetchFn: typeof fetch,
  base = '',
): Promise<ShellData[]> {
  const index = (await (await fetchFn(`${base}/data/universe/stars/index.json`)).json()) as {
    shells: { file: string }[];
  };
  return Promise.all(
    index.shells.map(async (s) => {
      const doc = (await (await fetchFn(`${base}/data/universe/stars/${s.file}`)).json()) as {
        stars: number[][];
      };
      return { stars: doc.stars } satisfies ShellData;
    }),
  );
}

function makeSunSprite(): THREE.Sprite {
  const size = 128;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = size;
  const ctx = cvs.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,246,1)');
  g.addColorStop(0.25, 'rgba(255,245,216,0.95)');
  g.addColorStop(0.5, 'rgba(255,226,164,0.34)');
  g.addColorStop(1, 'rgba(255,222,150,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cvs);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return new THREE.Sprite(mat);
}

/** Field reveal opacity for a given camera distance (pc). Faint at the boundary,
 *  full by ~0.5 pc as the camera pulls back into the neighborhood. */
function revealOpacity(camDistPc: number): number {
  return Math.min(1, Math.max(0, (camDistPc - 0.04) / (0.5 - 0.04)));
}

/** Ring texture — a discoverable "selectable" halo around a named star. Drawn as
 *  a crisp teal annulus (the app's accent) so it reads clearly against the white
 *  stars rather than washing out. Normal (not additive) blending keeps the colour
 *  true where it overlaps a bright star. */
function makeHaloTexture(): THREE.CanvasTexture {
  const s = 128;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  const c = s / 2;
  // Outer soft glow.
  const g = ctx.createRadialGradient(c, c, s * 0.28, c, c, s * 0.5);
  g.addColorStop(0, 'rgba(78,205,196,0)');
  g.addColorStop(0.72, 'rgba(78,205,196,0.18)');
  g.addColorStop(1, 'rgba(78,205,196,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  // Crisp accent ring.
  ctx.strokeStyle = 'rgba(78,205,196,0.95)';
  ctx.lineWidth = s * 0.045;
  ctx.beginPath();
  ctx.arc(c, c, s * 0.36, 0, Math.PI * 2);
  ctx.stroke();
  return new THREE.CanvasTexture(cvs);
}

/** Canvas-backed text sprite for a star name (world-scaled; caller sizes it). */
function makeLabelSprite(text: string): { sprite: THREE.Sprite; texture: THREE.CanvasTexture } {
  const upper = text.toUpperCase();
  const pad = 10;
  const font = 'bold 26px "Space Mono", monospace';
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = font;
  const w = Math.ceil(measure.measureText(upper).width) + pad * 2;
  const h = 40;
  const cvs = document.createElement('canvas');
  cvs.width = w;
  cvs.height = h;
  const ctx = cvs.getContext('2d')!;
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 4;
  ctx.fillStyle = '#eaf6ff';
  ctx.fillText(upper, pad, h / 2 + 1);
  const texture = new THREE.CanvasTexture(cvs);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false }),
  );
  sprite.userData.aspect = w / h;
  return { sprite, texture };
}

/** Named stars brighter than this always show their label; the rest label on hover/select. */
const ALWAYS_LABEL_MAG = 1.6;

interface StarMarker {
  id: string;
  group: THREE.Group;
  halo: THREE.Sprite;
  label: THREE.Sprite;
  labelAspect: number;
  alwaysLabel: boolean;
}

export function createNeighborhoodScene(opts: NeighborhoodOptions): NeighborhoodScene {
  const { shells, tier = 'high', pixelRatio = 1, namedStars = [], constellations = [] } = opts;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070f);

  // ── Constellation-line overlay (one LineSegments draw call, off by default) ──
  let constellationLines: THREE.LineSegments | null = null;
  if (constellations.length > 0) {
    const all: number[] = [];
    for (const c of constellations) all.push(...c.vertices);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(all, 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1e6);
    constellationLines = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({
        color: 0x4ecdc4,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    );
    constellationLines.frustumCulled = false;
    constellationLines.visible = false;
    scene.add(constellationLines);
  }

  const sun = makeSunSprite();
  sun.scale.setScalar(0.02); // world units (pc) — collapses to a dot as camera recedes
  scene.add(sun);

  const data = selectVisibleStars(shells, tierToStarBudget(tier));
  const field: PointFieldHandle = createPointField(data, { sceneScale: 1, pixelRatio });
  field.setOpacity(0);
  scene.add(field.object);

  // ── Named-star markers: a halo + a name label per curated star ──────────────
  const haloTex = makeHaloTexture();
  const markers: StarMarker[] = [];
  const pickables: THREE.Object3D[] = [];
  const markerGroup = new THREE.Group();
  for (const s of namedStars) {
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: haloTex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      }),
    );
    const { sprite: label, texture: labelTex } = makeLabelSprite(s.proper);
    void labelTex;
    const alwaysLabel = s.mag < ALWAYS_LABEL_MAG;
    label.visible = alwaysLabel;

    const group = new THREE.Group();
    group.position.set(s.x, s.y, s.z);
    group.userData.starId = s.id;
    halo.userData.starId = s.id;
    group.add(halo);
    group.add(label);
    markerGroup.add(group);

    markers.push({ id: s.id, group, halo, label, labelAspect: label.userData.aspect, alwaysLabel });
    pickables.push(halo);
  }
  scene.add(markerGroup);

  let highlightId: string | null = null;

  const _camPos = new THREE.Vector3();
  function applyMarkerScale(camera?: THREE.Camera) {
    if (camera) camera.getWorldPosition(_camPos);
    for (const m of markers) {
      // Scale each marker by ITS distance to the camera → constant screen size
      // whatever the star's true distance (they span ~1–150 pc).
      const distToCam = camera ? Math.max(0.01, _camPos.distanceTo(m.group.position)) : 1;
      const base = distToCam * 0.04;
      const hi = m.id === highlightId;
      const halo = base * (hi ? 1.7 : 1);
      m.halo.scale.set(halo, halo, 1);
      const lh = base * 1.05;
      m.label.scale.set(lh * m.labelAspect, lh, 1);
      m.label.position.set(0, halo * 1.1, 0);
      m.label.visible = m.alwaysLabel || hi;
      (m.halo.material as THREE.SpriteMaterial).opacity = hi ? 1 : 0.8;
    }
  }

  return {
    scene,
    starCount: data.count,
    fieldObject: field.object,
    namedStarPickables: pickables,
    starPosition(id: string) {
      const m = markers.find((x) => x.id === id);
      return m ? m.group.position.clone() : null;
    },
    highlightStar(id: string | null) {
      highlightId = id;
    },
    setConstellationsVisible(on: boolean) {
      if (constellationLines) constellationLines.visible = on;
    },
    anonymousStarAt(index: number) {
      if (index < 0 || index >= data.count) return null;
      return describeAnonymousStar(
        data.positions[index * 3],
        data.positions[index * 3 + 1],
        data.positions[index * 3 + 2],
        data.mags[index],
        data.cis[index],
      );
    },
    update(camDistPc: number, camera?: THREE.Camera) {
      field.setOpacity(revealOpacity(camDistPc));
      applyMarkerScale(camera);
    },
    dispose() {
      field.dispose();
      sun.material.map?.dispose();
      sun.material.dispose();
      haloTex.dispose();
      if (constellationLines) {
        constellationLines.geometry.dispose();
        (constellationLines.material as THREE.Material).dispose();
      }
      for (const m of markers) {
        (m.halo.material as THREE.SpriteMaterial).dispose();
        (m.label.material as THREE.SpriteMaterial).map?.dispose();
        (m.label.material as THREE.SpriteMaterial).dispose();
      }
    },
  };
}
