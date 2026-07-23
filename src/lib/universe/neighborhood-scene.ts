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
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { selectVisibleStars, type ShellData } from './star-selection';
import { createPointField, type PointFieldHandle } from './point-field';
import { tierToStarBudget } from './budget';
import { describeAnonymousStar, type AnonymousStar } from './anonymous-star';
import { buildDeepSkyLayer, type DeepSkyLayerHandle } from './deep-sky-scene';
import { lightShells, CAUSALITY_EPOCHS, CAUSALITY_NOW, type LightShell } from './causality';
import type { NamedStar, DeepSkyObject } from '$lib/data';
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
  /** Sampled (B–V, absolute magnitude) for the Slice-7 HR-diagram overlay —
   *  the same real stars, re-projected onto physical axes. */
  hrStars(maxCount?: number): Array<{ bv: number; absMag: number }>;
  /** Toggle the constellation-line overlay. */
  setConstellationsVisible(on: boolean): void;
  /** Update the fat constellation lines' pixel resolution (call on resize). */
  setSize(width: number, height: number): void;
  /** Toggle the deep-sky (Messier + gallery) glint layer. Off by default. */
  setDeepSkyVisible(on: boolean): void;
  /** The light-cone shells + a top-down census of stars within `maxPc` of the Sun,
   *  for the Slice-7 causality map overlay. `field` is the anonymous census (scatter);
   *  `named` carries labels for the recognizable nearby stars. */
  causalityData(maxPc?: number): {
    shells: LightShell[];
    field: Array<{ x: number; z: number; bv: number }>;
    named: Array<{ name: string; distPc: number; x: number; z: number; bv: number }>;
  };
  /** Raycast targets for deep-sky objects (each carries userData.deepSkyId). */
  deepSkyPickables: THREE.Object3D[];
  /** Emphasize one deep-sky object (hover/selection) + reveal its label. */
  highlightDeepSky(id: string | null): void;
  /** Focus a deep-sky object for the approach warp (its glint blooms). */
  focusDeepSky(id: string | null): void;
  /** Approach ramp 0 → 1 for the focused deep-sky object. */
  setDeepSkyApproach(a: number): void;
  /** Scene position of a deep-sky object (for warp targeting), or null. */
  deepSkyObjectPosition(id: string): THREE.Vector3 | null;
  /** The deep-sky record for an id, or null. */
  deepSkyObject(id: string): DeepSkyObject | null;
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
  /** Exoplanet-host ids — always labelled (the enterable systems), so the notable
   *  targets read at a glance rather than only on hover. */
  hostIds?: Set<string>;
  /** Constellation line segments (baked 3D positions) for the overlay. */
  constellations?: ConstellationLines[];
  /** Deep-sky objects (Messier + gallery) for the off-by-default glint layer. */
  deepSkyObjects?: DeepSkyObject[];
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
  g.addColorStop(0.72, 'rgba(78,205,196,0.1)');
  g.addColorStop(1, 'rgba(78,205,196,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  // Crisp accent ring — kept dim so the halos don't out-shine the stars inside.
  ctx.strokeStyle = 'rgba(78,205,196,0.75)';
  ctx.lineWidth = s * 0.045;
  ctx.beginPath();
  ctx.arc(c, c, s * 0.36, 0, Math.PI * 2);
  ctx.stroke();
  return new THREE.CanvasTexture(cvs);
}

/** Canvas-backed text sprite for a star name (world-scaled; caller sizes it). */
function makeLabelSprite(text: string): { sprite: THREE.Sprite; texture: THREE.CanvasTexture } {
  const upper = text.toUpperCase();
  const pad = 12;
  // Lighter weight + wide tracking reads modern/editorial rather than the old bold
  // mono-HUD look; on-screen size is trimmed via the marker scale (applyMarkerScale).
  const font = '400 24px "Space Mono", monospace';
  const tracking = '2px';
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = font;
  measure.letterSpacing = tracking;
  const w = Math.ceil(measure.measureText(upper).width) + pad * 2;
  const h = 40;
  const cvs = document.createElement('canvas');
  cvs.width = w;
  cvs.height = h;
  const ctx = cvs.getContext('2d')!;
  ctx.font = font;
  ctx.letterSpacing = tracking;
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 5;
  ctx.fillStyle = 'rgba(223, 236, 247, 0.92)';
  ctx.fillText(upper, pad, h / 2 + 1);
  const texture = new THREE.CanvasTexture(cvs);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    }),
  );
  sprite.userData.aspect = w / h;
  return { sprite, texture };
}

/** Named stars brighter than this always show their label; the rest label on hover/select. */
const ALWAYS_LABEL_MAG = 1.6;

interface StarMarker {
  id: string;
  group: THREE.Group;
  dot: THREE.Sprite;
  halo: THREE.Sprite;
  label: THREE.Sprite;
  labelAspect: number;
  alwaysLabel: boolean;
}

/** A small soft filled dot — the idle marker for a named star (the ring only shows
 *  on hover/select). Radial white gradient so it reads as a crisp point + glow. */
function makeDotTexture(): THREE.CanvasTexture {
  const s = 64;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  const c = s / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(226,244,255,0.9)');
  g.addColorStop(1, 'rgba(226,244,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, c, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(cvs);
}

export function createNeighborhoodScene(opts: NeighborhoodOptions): NeighborhoodScene {
  const {
    shells,
    tier = 'high',
    pixelRatio = 1,
    namedStars = [],
    constellations = [],
    deepSkyObjects = [],
    hostIds = new Set<string>(),
  } = opts;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070f);

  // ── Deep-sky glint layer (Slice 4) — off by default, faint by design ──
  const deepSky: DeepSkyLayerHandle | null =
    deepSkyObjects.length > 0 ? buildDeepSkyLayer(deepSkyObjects) : null;
  if (deepSky) scene.add(deepSky.group);

  // ── Causality lens (Slice 7) — the light-cone shells render as a 2-D top-down
  // map overlay (CausalityMap.svelte), NOT in-scene: the neighbourhood camera sits
  // near the Sun, i.e. *inside* the shells, where wireframe spheres read as an
  // inside-out web. The overlay plots the same real named stars at true distance
  // against concentric light-horizon rings. `causalityData()` feeds it. ──

  const dotTex = makeDotTexture();

  // ── Constellation-line overlay — matches the StarPanel ConstellationFinder
  //    style: thin soft-blue figures with a whisper of glow + faint node dots at
  //    each vertex. Off by default. The figures live on the celestial sphere
  //    (r ≈ 700 pc); the whole group is re-scaled per-frame to track the camera
  //    distance in update() so they scale + move as you zoom/pan (otherwise, at
  //    fixed r ≫ camR, they'd sit frozen at infinity).
  let constellationLines: THREE.Group | null = null;
  const constellationMats: LineMaterial[] = [];
  const CONSTELLATION_BASE_WIDTH = [3, 1.5] as const; // faint glow underlay, crisp line
  const CONSTELLATION_SPHERE_R = 700; // baked vertex radius (pc)
  let constellationNodes: THREE.Points | null = null;
  if (constellations.length > 0) {
    const all: number[] = [];
    for (const c of constellations) all.push(...c.vertices);
    const geo = new LineSegmentsGeometry();
    geo.setPositions(all);
    const grp = new THREE.Group();
    grp.frustumCulled = false;
    // Soft blue like the finder (rgba(120,190,230)); a wider dim underlay gives a
    // gentle glow without the old neon heaviness.
    const layers: Array<[number, number, number]> = [
      [CONSTELLATION_BASE_WIDTH[0], 0x6fa8d8, 0.14], // faint glow underlay
      [CONSTELLATION_BASE_WIDTH[1], 0x9fd0ee, 0.72], // crisp soft-blue line
    ];
    for (const [w, color, op] of layers) {
      const mat = new LineMaterial({
        color,
        linewidth: w,
        transparent: true,
        opacity: op,
        depthWrite: false,
        depthTest: false,
      });
      mat.resolution.set(window.innerWidth || 1, window.innerHeight || 1);
      constellationMats.push(mat);
      const line = new LineSegments2(geo, mat);
      line.frustumCulled = false;
      grp.add(line);
    }
    // Faint node dots at each vertex — the finder's endpoint dots.
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute('position', new THREE.Float32BufferAttribute(all, 3));
    constellationNodes = new THREE.Points(
      nodeGeo,
      new THREE.PointsMaterial({
        map: dotTex,
        color: 0xc8dcff,
        size: 7,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        depthTest: false,
      }),
    );
    constellationNodes.frustumCulled = false;
    grp.add(constellationNodes);
    grp.visible = false;
    constellationLines = grp;
    scene.add(grp);
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
    // Idle marker: a subtle dot. The ring (halo) only fades in on hover/select.
    const dot = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: dotTex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      }),
    );
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: haloTex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        opacity: 0,
      }),
    );
    const { sprite: label, texture: labelTex } = makeLabelSprite(s.proper);
    void labelTex;
    // Always-label rule: the enterable systems (exoplanet hosts) + the brightest
    // naked-eye stars. Everything else reveals its name on hover/select.
    const alwaysLabel = s.mag < ALWAYS_LABEL_MAG || hostIds.has(s.id);
    label.visible = alwaysLabel;

    const group = new THREE.Group();
    group.position.set(s.x, s.y, s.z);
    group.userData.starId = s.id;
    halo.userData.starId = s.id;
    dot.userData.starId = s.id;
    group.add(halo);
    group.add(dot);
    group.add(label);
    markerGroup.add(group);

    markers.push({
      id: s.id,
      group,
      dot,
      halo,
      label,
      labelAspect: label.userData.aspect,
      alwaysLabel,
    });
    pickables.push(halo);
  }

  // Our Solar System — a "you are here" label + selectable ring on the Sun at
  // the origin. Clicking it opens the Sun panel in-context (the page keeps you
  // in the neighborhood — see selectSolInContext).
  {
    const { sprite: solLabel } = makeLabelSprite('Sol');
    solLabel.visible = true;
    const solHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: haloTex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        color: new THREE.Color(0xffcf8f), // warm gold — the Sun reads apart from teal stars
      }),
    );
    solHalo.userData.starId = 'sol';
    const solDot = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: dotTex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        color: new THREE.Color(0xffe1b0), // warm gold dot
      }),
    );
    solDot.userData.starId = 'sol';
    const group = new THREE.Group(); // at the origin (the Sun)
    group.userData.starId = 'sol';
    group.add(solHalo);
    group.add(solDot);
    group.add(solLabel);
    markerGroup.add(group);
    pickables.push(solHalo);
    markers.push({
      id: 'sol',
      group,
      dot: solDot,
      halo: solHalo,
      label: solLabel,
      labelAspect: solLabel.userData.aspect,
      alwaysLabel: true,
    });
  }
  scene.add(markerGroup);

  // ── "You are here": concentric light-year distance rings centred on the Sun.
  // A persistent orientation + scale reference on the galactic plane (XZ), each
  // shell a distinct colour so you can read distance at a glance and always find
  // your way home. Subtle by design — a compass grid, not a foreground element.
  const LY_PER_PC = 3.2615638;
  // On-brand shells: warm gold → brand teal → soft accent-blue → pale white. No
  // off-palette violet (site is gold/teal/white on navy).
  const REFERENCE_SHELLS: Array<{ ly: number; color: number }> = [
    { ly: 5, color: 0xffcf8f }, // warm gold — nearest neighbours
    { ly: 10, color: 0x6fd8ce }, // brand teal
    { ly: 25, color: 0x8fb8ff }, // soft accent-blue
    { ly: 50, color: 0xcfe0ea }, // pale white — outer shell
  ];
  const referenceGroup = new THREE.Group();
  const referenceMats: THREE.Material[] = [];
  const referenceLabels: THREE.Sprite[] = [];
  for (const shell of REFERENCE_SHELLS) {
    const rPc = shell.ly / LY_PER_PC;
    const SEG = 128;
    const pts: number[] = [];
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      pts.push(Math.cos(a) * rPc, 0, Math.sin(a) * rPc);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const mat = new THREE.LineBasicMaterial({
      color: shell.color,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      depthTest: false,
    });
    referenceMats.push(mat);
    referenceGroup.add(new THREE.Line(geo, mat));
    const { sprite: lbl } = makeLabelSprite(`${shell.ly} ly`);
    lbl.position.set(rPc, 0, 0);
    lbl.userData.refRadius = rPc;
    referenceLabels.push(lbl);
    referenceGroup.add(lbl);
  }
  scene.add(referenceGroup);

  let highlightId: string | null = null;

  const _camPos = new THREE.Vector3();
  const _lblPos = new THREE.Vector3();
  function applyMarkerScale(camera?: THREE.Camera) {
    if (camera) camera.getWorldPosition(_camPos);
    for (const m of markers) {
      // Scale each marker by ITS distance to the camera → constant screen size
      // whatever the star's true distance (they span ~1–150 pc).
      const distToCam = camera ? Math.max(0.01, _camPos.distanceTo(m.group.position)) : 1;
      const base = distToCam * 0.04;
      const hi = m.id === highlightId;
      const isSol = m.id === 'sol';
      // Idle marker is a small dot; the ring (halo) only fades in on hover/select
      // so the field isn't cluttered with always-on teal rings. Sol keeps its ring
      // as the persistent "you are here" anchor.
      const dotS = (isSol ? 0.42 : 0.3) * base;
      m.dot.scale.set(dotS, dotS, 1);
      (m.dot.material as THREE.SpriteMaterial).opacity = hi ? 1 : isSol ? 0.95 : 0.8;
      const halo = isSol ? base * 1.35 : base;
      m.halo.scale.set(halo, halo, 1);
      m.halo.position.set(0, 0, 0);
      (m.halo.material as THREE.SpriteMaterial).opacity = isSol ? 0.92 : hi ? 0.9 : 0;
      const lh = base * 0.55; // smaller, lighter star-name labels (less HUD-heavy)
      m.label.scale.set(lh * m.labelAspect, lh, 1);
      m.label.position.set(0, halo * 1.1, 0);
      m.label.visible = m.alwaysLabel || hi;
    }
    // Reference-ring labels: constant screen size, pinned to each shell's +X edge.
    if (camera) {
      for (const lbl of referenceLabels) {
        const s = Math.max(0.01, _camPos.distanceTo(lbl.getWorldPosition(_lblPos))) * 0.03;
        lbl.scale.set(s * ((lbl.userData.aspect as number) ?? 3), s, 1);
      }
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
    setSize(width: number, height: number) {
      for (const mat of constellationMats) mat.resolution.set(width, height);
    },
    setDeepSkyVisible(on: boolean) {
      deepSky?.setVisible(on);
    },
    causalityData(maxPc = 92) {
      const shells = lightShells(CAUSALITY_EPOCHS, CAUSALITY_NOW, maxPc);
      // Anonymous census within the horizon — roughly uniform density, so the outer
      // annuli (where the teaching lives) populate while the centre stays sparse.
      const inRange: Array<{ x: number; z: number; bv: number }> = [];
      for (let i = 0; i < data.count; i++) {
        const x = data.positions[i * 3];
        const y = data.positions[i * 3 + 1];
        const z = data.positions[i * 3 + 2];
        if (Math.hypot(x, y, z) <= maxPc) inRange.push({ x, z, bv: data.cis[i] });
      }
      const step = Math.max(1, Math.floor(inRange.length / 1600));
      const field = inRange.filter((_, i) => i % step === 0);
      const named = namedStars
        .filter((s) => s.dist_pc > 0 && s.dist_pc <= maxPc)
        .map((s) => ({ name: s.proper, distPc: s.dist_pc, x: s.x, z: s.z, bv: s.bv ?? 0.6 }));
      return { shells, field, named };
    },
    deepSkyPickables: deepSky?.pickables ?? [],
    highlightDeepSky(id: string | null) {
      deepSky?.highlight(id);
    },
    focusDeepSky(id: string | null) {
      deepSky?.setFocus(id);
    },
    setDeepSkyApproach(a: number) {
      deepSky?.setApproach(a);
    },
    deepSkyObjectPosition(id: string) {
      return deepSky?.objectPosition(id) ?? null;
    },
    deepSkyObject(id: string) {
      return deepSky?.objectById(id) ?? null;
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
    hrStars(maxCount = 2000) {
      const step = Math.max(1, Math.floor(data.count / maxCount));
      const out: Array<{ bv: number; absMag: number }> = [];
      for (let i = 0; i < data.count; i += step) {
        const x = data.positions[i * 3];
        const y = data.positions[i * 3 + 1];
        const z = data.positions[i * 3 + 2];
        const distPc = Math.max(0.01, Math.hypot(x, y, z));
        const absMag = data.mags[i] - 5 * (Math.log10(distPc) - 1);
        out.push({ bv: data.cis[i], absMag });
      }
      return out;
    },
    update(camDistPc: number, camera?: THREE.Camera) {
      field.setOpacity(revealOpacity(camDistPc));
      applyMarkerScale(camera);
      if (camera) deepSky?.update(camDistPc, camera);
      if (constellationLines?.visible) {
        // Anchor the figures at a moderate radius that stays just ahead of the
        // camera (instead of frozen at the baked 700 pc), so they visibly scale +
        // shift as you zoom and pan rather than sitting fixed at infinity.
        const effR = Math.max(80, camDistPc * 3);
        constellationLines.scale.setScalar(effR / CONSTELLATION_SPHERE_R);
        if (constellationMats.length) {
          const s = Math.max(0.7, Math.min(1.3, 10 / Math.max(2, camDistPc)));
          constellationMats[0].linewidth = CONSTELLATION_BASE_WIDTH[0] * s;
          constellationMats[1].linewidth = CONSTELLATION_BASE_WIDTH[1] * s;
        }
      }
    },
    dispose() {
      field.dispose();
      sun.material.map?.dispose();
      sun.material.dispose();
      haloTex.dispose();
      dotTex.dispose();
      if (constellationLines) {
        for (const mat of constellationMats) mat.dispose();
        (constellationLines.children[0] as LineSegments2 | undefined)?.geometry.dispose();
      }
      if (constellationNodes) {
        constellationNodes.geometry.dispose();
        (constellationNodes.material as THREE.PointsMaterial).dispose();
      }
      for (const m of markers) {
        (m.dot.material as THREE.SpriteMaterial).dispose();
        (m.halo.material as THREE.SpriteMaterial).dispose();
        (m.label.material as THREE.SpriteMaterial).map?.dispose();
        (m.label.material as THREE.SpriteMaterial).dispose();
      }
      for (const mat of referenceMats) mat.dispose();
      for (const child of referenceGroup.children) {
        if (child instanceof THREE.Line) child.geometry.dispose();
        else if (child instanceof THREE.Sprite) {
          child.material.map?.dispose();
          child.material.dispose();
        }
      }
      deepSky?.dispose();
    },
  };
}
