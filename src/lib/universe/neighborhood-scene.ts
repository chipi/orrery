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
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import * as m from '$lib/paraglide/messages';
import { selectVisibleStars, type ShellData } from './star-selection';
import { createPointField, type PointFieldHandle } from './point-field';
import { tierToStarBudget } from './budget';
import { describeAnonymousStar, type AnonymousStar } from './anonymous-star';
import { buildDeepSkyLayer, type DeepSkyLayerHandle } from './deep-sky-scene';
import { lightShells, CAUSALITY_EPOCHS, CAUSALITY_NOW, type LightShell } from './causality';
import type { NamedStar, DeepSkyObject } from '$lib/data';
import type { QualityTier } from '$lib/quality/quality-tier';
import { labelSprite, ringTexture, createRing } from './scene-pin-sprites';
import {
  LABEL_SPRITE_PX,
  RING_PX,
  applyRing,
  cameraFov,
  labelOffset,
  liftOnScreen,
  labelRect,
  lyRampColor,
  newLabelSlot,
  placeLabels,
  snapshotPins,
  viewDepth,
  worldPerPx,
  type LabelSlot,
  type PinsSnapshot,
  type ProbePin,
} from './scene-pins';

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
  highlightStar(id: string | null, selectedId?: string | null): void;
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
  highlightDeepSky(id: string | null, selectedId?: string | null): void;
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
  update(camDistPc: number, camera?: THREE.Camera, viewportH?: number): void;
  /** Probe for the e2e specs: every label and ring as it is on screen (client px). */
  pinsSnapshot(camera: THREE.Camera, w: number, h: number): PinsSnapshot;
  /** World points on the four light-year rings, for the readability probe. */
  referenceRingPoints(): THREE.Vector3[];
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
  tex.colorSpace = THREE.SRGBColorSpace;
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

/** Named stars brighter than this always show their label; the rest label on hover/select. */
const ALWAYS_LABEL_MAG = 1.6;

interface StarMarker {
  id: string;
  group: THREE.Group;
  dot: THREE.Sprite;
  /** Hover / selection ring; Sol's is the gold anchor and stays up. */
  ring: THREE.Sprite;
  /** Label priority when labels collide: lower wins (Sol, then the brightest). */
  slot: LabelSlot;
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
  g.addColorStop(0.35, 'rgba(226,244,255,0.9)'); // a3-keep: universe scene colour coding (star, galaxy, structure), palette review at the end
  g.addColorStop(1, 'rgba(226,244,255,0)'); // a3-keep: universe scene colour coding (star, galaxy, structure), palette review at the end
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, c, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
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
    // Soft blue like the finder lines; a wider dim underlay gives a
    // gentle glow without the old neon heaviness.
    const layers: Array<[number, number, number]> = [
      [CONSTELLATION_BASE_WIDTH[0], 0x6fa8d8, 0.14], // faint glow underlay
      [CONSTELLATION_BASE_WIDTH[1], 0x9fd0ee, 0.72], // crisp soft-blue line // a3-keep: universe scene colour coding (star, galaxy, structure), palette review at the end
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

  // ── Named-star markers: a ring + a name label per curated star ──────────────
  const ringTex = ringTexture();
  const markers: StarMarker[] = [];
  const slots: LabelSlot[] = [];
  const pickables: THREE.Object3D[] = [];
  const markerGroup = new THREE.Group();
  for (const s of namedStars) {
    // Idle marker: a subtle dot. The ring only shows on hover/select.
    const dot = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: dotTex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      }),
    );
    const ring = createRing(ringTex, false);
    const { sprite: label, aspect } = labelSprite(s.proper, { color: 'rgba(223, 236, 247, 0.92)' });
    // Always-label rule: the enterable systems (exoplanet hosts) + the brightest
    // naked-eye stars. Everything else reveals its name on hover/select.
    const alwaysLabel = s.mag < ALWAYS_LABEL_MAG || hostIds.has(s.id);
    label.visible = alwaysLabel;

    const group = new THREE.Group();
    group.position.set(s.x, s.y, s.z);
    group.userData.starId = s.id;
    ring.userData.starId = s.id;
    dot.userData.starId = s.id;
    group.add(ring);
    group.add(dot);
    group.add(label);
    markerGroup.add(group);

    const slot = newLabelSlot(label, aspect, s.mag);
    slots.push(slot);
    markers.push({ id: s.id, group, dot, ring, slot, alwaysLabel });
    pickables.push(ring);
  }

  // Our Solar System — a "you are here" label + selectable ring on the Sun at
  // the origin. Clicking it opens the Sun panel in-context (the page keeps you
  // in the neighborhood — see selectSolInContext).
  {
    const { sprite: solLabel, aspect } = labelSprite('Sol', { color: 'rgba(223, 236, 247, 0.92)' });
    solLabel.visible = true;
    const solRing = createRing(ringTex, true);
    solRing.userData.starId = 'sol';
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
    group.add(solRing);
    group.add(solDot);
    group.add(solLabel);
    markerGroup.add(group);
    pickables.push(solRing);
    const slot = newLabelSlot(solLabel, aspect, -100);
    slots.push(slot);
    markers.push({ id: 'sol', group, dot: solDot, ring: solRing, slot, alwaysLabel: true });
  }
  scene.add(markerGroup);

  // ── "You are here": concentric light-year distance rings centred on the Sun.
  // A persistent orientation + scale reference on the galactic plane (XZ): four 2 px
  // lines, one ramp from the state blue towards white, so distance reads at a glance and
  // you can always find your way home. The labels join the placement pass last.
  const LY_PER_PC = 3.2615638;
  const REFERENCE_LY = [5, 10, 25, 50];
  const referenceGroup = new THREE.Group();
  const referenceMats: LineMaterial[] = [];
  const referenceSlots: LabelSlot[] = [];
  REFERENCE_LY.forEach((ly, i) => {
    const rPc = ly / LY_PER_PC;
    const SEG = 128;
    const pts: number[] = [];
    for (let k = 0; k <= SEG; k++) {
      const a = (k / SEG) * Math.PI * 2;
      pts.push(Math.cos(a) * rPc, 0, Math.sin(a) * rPc);
    }
    const geo = new LineGeometry();
    geo.setPositions(pts);
    const mat = new LineMaterial({
      color: lyRampColor(i, REFERENCE_LY.length),
      linewidth: 2, // screen pixels
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      depthTest: false,
    });
    mat.resolution.set(window.innerWidth || 1, window.innerHeight || 1);
    referenceMats.push(mat);
    const line = new Line2(geo, mat);
    line.computeLineDistances();
    line.frustumCulled = false;
    referenceGroup.add(line);
    const { sprite: lbl, aspect } = labelSprite(m.unit_ly_value({ value: String(ly) }), {
      color: 'rgba(223, 236, 247, 0.92)',
      halo: true,
    });
    lbl.position.set(rPc, 0, 0);
    referenceGroup.add(lbl);
    const slot = newLabelSlot(lbl, aspect, 1000 + i);
    referenceSlots.push(slot);
    slots.push(slot);
  });
  scene.add(referenceGroup);

  let highlightId: string | null = null;
  let selectedId: string | null = null;

  const _tmp = new THREE.Vector3();
  const _ORIGIN = new THREE.Vector3();
  function applyMarkerScale(camera: THREE.Camera | undefined, viewportH: number) {
    camera?.updateMatrixWorld();
    const fov = camera ? cameraFov(camera) : 55;
    for (const mk of markers) {
      // Scale each marker by ITS distance to the camera → constant screen size
      // whatever the star's true distance (they span ~1–150 pc).
      const distToCam = camera ? Math.max(0.01, viewDepth(camera, mk.group.position)) : 1;
      const wpp = worldPerPx(distToCam, fov, viewportH);
      const base = distToCam * 0.04;
      const hi = mk.id === highlightId || mk.id === selectedId;
      const isSol = mk.id === 'sol';
      // Idle marker is a small dot; the ring only fades in on hover/select so the field
      // isn't cluttered with always-on rings. Sol keeps its gold ring as the persistent
      // "you are here" anchor.
      const dotS = (isSol ? 0.42 : 0.3) * base;
      mk.dot.scale.set(dotS, dotS, 1);
      (mk.dot.material as THREE.SpriteMaterial).opacity = hi ? 1 : isSol ? 0.95 : 0.8;
      mk.ring.position.set(0, 0, 0);
      applyRing(mk.ring, isSol, hi, wpp);
      // One 12 px label size at every scale, clear of the 44 px ring, steady on hover.
      const lh = wpp * LABEL_SPRITE_PX;
      const slot = mk.slot;
      slot.sprite.scale.set(lh * slot.aspect, lh, 1);
      const lift = labelOffset(0, lh, wpp * (RING_PX / 2));
      if (camera) liftOnScreen(slot.sprite.position, _ORIGIN, camera, lift);
      else slot.sprite.position.set(0, lift, 0);
      slot.force = hi;
      const wanted = mk.alwaysLabel || hi;
      slot.visible = camera && wanted ? labelRect(slot.sprite, camera, slot.rect, _tmp) : wanted;
    }
    // Reference-ring labels: constant 12 px, pinned to each shell's +X edge.
    for (const slot of referenceSlots) {
      if (!camera) {
        slot.visible = true;
        continue;
      }
      slot.sprite.getWorldPosition(_tmp);
      const lh =
        worldPerPx(Math.max(0.01, viewDepth(camera, _tmp)), fov, viewportH) * LABEL_SPRITE_PX;
      slot.sprite.scale.set(lh * slot.aspect, lh, 1);
      slot.visible = labelRect(slot.sprite, camera, slot.rect, _tmp);
    }
    // Declutter: around Sol at the default zoom "Proxima Centauri", "Rigil Kentaurus" and
    // "Sol" printed over each other. Labels are placed in priority order (the hovered /
    // selected star, Sol, the brightest, the light-year rings last); one that would overlap a
    // label already placed is hidden, and its name still shows on hover / select.
    placeLabels(slots);
  }

  const probePins: ProbePin[] = [
    ...markers.map((mk) => ({ id: mk.id, slot: mk.slot, ring: mk.ring })),
    ...referenceSlots.map((slot, i) => ({ id: `ly-${REFERENCE_LY[i]}`, slot })),
  ];

  return {
    scene,
    starCount: data.count,
    fieldObject: field.object,
    namedStarPickables: pickables,
    starPosition(id: string) {
      const mk = markers.find((x) => x.id === id);
      return mk ? mk.group.position.clone() : null;
    },
    highlightStar(id: string | null, sel: string | null = null) {
      highlightId = id;
      selectedId = sel;
    },
    setConstellationsVisible(on: boolean) {
      if (constellationLines) constellationLines.visible = on;
    },
    setSize(width: number, height: number) {
      for (const mat of constellationMats) mat.resolution.set(width, height);
      for (const mat of referenceMats) mat.resolution.set(width, height);
    },
    referenceRingPoints() {
      const pts: THREE.Vector3[] = [];
      for (const ly of REFERENCE_LY) {
        const r = ly / LY_PER_PC;
        for (let k = 0; k < 96; k++) {
          const a = (k / 96) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
        }
      }
      return pts;
    },
    pinsSnapshot(camera: THREE.Camera, w: number, h: number) {
      return snapshotPins('neighborhood', probePins, camera, w, h);
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
    highlightDeepSky(id: string | null, sel: string | null = null) {
      deepSky?.highlight(id, sel);
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
    update(camDistPc: number, camera?: THREE.Camera, viewportH = window.innerHeight) {
      field.setOpacity(revealOpacity(camDistPc));
      applyMarkerScale(camera, viewportH);
      if (camera) deepSky?.update(camDistPc, camera, viewportH);
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
      ringTex.dispose();
      dotTex.dispose();
      if (constellationLines) {
        for (const mat of constellationMats) mat.dispose();
        (constellationLines.children[0] as LineSegments2 | undefined)?.geometry.dispose();
      }
      if (constellationNodes) {
        constellationNodes.geometry.dispose();
        (constellationNodes.material as THREE.PointsMaterial).dispose();
      }
      for (const mk of markers) {
        (mk.dot.material as THREE.SpriteMaterial).dispose();
        (mk.ring.material as THREE.SpriteMaterial).dispose();
        (mk.slot.sprite.material as THREE.SpriteMaterial).map?.dispose();
        (mk.slot.sprite.material as THREE.SpriteMaterial).dispose();
      }
      for (const mat of referenceMats) mat.dispose();
      for (const child of referenceGroup.children) {
        if (child instanceof Line2) child.geometry.dispose();
        else if (child instanceof THREE.Sprite) {
          child.material.map?.dispose();
          child.material.dispose();
        }
      }
      deepSky?.dispose();
    },
  };
}
