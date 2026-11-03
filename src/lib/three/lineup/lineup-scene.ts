/**
 * True-scale line-up stage for /fleet: every craft on one ground line, in metres, seen face-on by
 * one orthographic camera, so the drawn ratios are the real ratios by construction. The canvas
 * spans the visible width; horizontal scrolling moves the camera (`setScrollM`), and the caller
 * lays out its HTML labels from `layout`.
 *
 * Showcase lighting (key + fill + rim, ACES tone mapping) on a transparent canvas — the backdrop
 * gradient is CSS. Rendering is on demand; the hovered craft turns slowly and only then does the
 * stage animate.
 */
import * as THREE from 'three';
import { buildScaleFigure, type ScaleFigureId } from './scale-figures';

export interface LineupItem {
  id: string;
  /** Builds the craft at any scale; the stage normalises it to `heightM`. */
  build: () => THREE.Object3D;
  /** Real overall height (launchers) or length standing on end (spacecraft), metres. */
  heightM: number;
  /** Set when the model shows only part of the craft (the re-entry capsule). */
  part?: 'capsule';
  /** Fit the model's width instead of its height to `heightM` (a sphere sized by its diameter). */
  fitWidth?: boolean;
}

export interface LineupSlot {
  id: string;
  /** Centre x and real height, metres (stage coordinates; ground at y = 0). */
  xM: number;
  heightM: number;
  widthM: number;
  part?: 'capsule';
}

export interface LineupOptions {
  /** Landmark at the end of the row. */
  landmark: ScaleFigureId;
  /** Minimum gap between craft, metres. */
  gapM: number;
  /** Put a person at the foot of every n-th craft (1 = every craft). */
  personEvery: number;
  /** Empty sky above the tallest object, as a fraction of its height. */
  headroom?: number;
}

export interface LineupStage {
  layout: LineupSlot[];
  /** Total row length, metres (first craft's left edge to the landmark's right edge). */
  rowLengthM: number;
  /** Tallest object, metres. */
  topM: number;
  /** Pixels per metre at the current canvas height. */
  pxPerM: () => number;
  resize: (widthPx: number, heightPx: number) => void;
  setScrollM: (leftM: number) => void;
  setHover: (id: string | null) => void;
  pick: (xPx: number, yPx: number) => string | null;
  render: () => void;
  dispose: () => void;
}

const GROUND_BAND_M_FRACTION = 0.06;

/**
 * Normalise an object so its height (or width, for a sphere sized by diameter) is `sizeM`: base on
 * y = 0, centred on x/z. Returns its drawn width and height.
 */
export function normalise(
  obj: THREE.Object3D,
  sizeM: number,
  fitWidth = false,
): { w: number; h: number } {
  const box = new THREE.Box3().setFromObject(obj);
  const d = fitWidth ? box.max.x - box.min.x : box.max.y - box.min.y;
  const s = d > 0 ? sizeM / d : 1;
  obj.scale.multiplyScalar(s);
  box.setFromObject(obj);
  const c = box.getCenter(new THREE.Vector3());
  obj.position.x -= c.x;
  obj.position.z -= c.z;
  obj.position.y -= box.min.y;
  return { w: box.max.x - box.min.x, h: box.max.y - box.min.y };
}

export function createLineupStage(
  canvas: HTMLCanvasElement,
  items: LineupItem[],
  opts: LineupOptions,
): LineupStage {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1a1f2b, 1.1));
  const key = new THREE.DirectionalLight(0xfff4e6, 2.6);
  key.position.set(-0.6, 0.8, 1);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9cc4ff, 1.6);
  rim.position.set(0.9, 0.4, -1);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(1, 0.2, 1);
  scene.add(fill);

  // Lay the craft out left to right with their real widths.
  const layout: LineupSlot[] = [];
  const crafts = new Map<string, THREE.Object3D>();
  let x = 0;
  let topM = 0;
  items.forEach((it, i) => {
    const obj = it.build();
    const size = normalise(obj, it.heightM, it.fitWidth);
    const w = Math.max(size.w, 0.5);
    const gap = Math.max(opts.gapM, w * 0.6);
    const cx = x + (i === 0 ? 0 : gap) + w / 2;
    obj.position.x += cx;
    obj.userData.lineupId = it.id;
    scene.add(obj);
    crafts.set(it.id, obj);
    layout.push({ id: it.id, xM: cx, heightM: it.heightM, widthM: w, part: it.part });
    if (i % Math.max(1, opts.personEvery) === 0) {
      const person = buildScaleFigure('person');
      person.position.set(cx + w / 2 + 0.6, 0, w);
      scene.add(person);
    }
    x = cx + w / 2;
    topM = Math.max(topM, size.h);
  });

  // The landmark closes the row, with a person beside it.
  const landmark = buildScaleFigure(opts.landmark);
  const lmBox = new THREE.Box3().setFromObject(landmark);
  const lmW = lmBox.max.x - lmBox.min.x;
  const lmX = x + Math.max(opts.gapM * 1.5, lmW * 0.4) + lmW / 2;
  landmark.position.set(lmX, 0, -2);
  scene.add(landmark);
  topM = Math.max(topM, lmBox.max.y);
  const rowLengthM = lmX + lmW / 2;
  const left = layout[0] ? layout[0].xM - layout[0].widthM / 2 : 0;

  // Ground: a band under the row, a hair below y = 0 so contact reads as contact.
  const groundBand = topM * GROUND_BAND_M_FRACTION;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(rowLengthM - left + topM * 4, groundBand),
    new THREE.MeshBasicMaterial({ color: 0x232c3d }),
  );
  ground.position.set((left + rowLengthM) / 2, -groundBand / 2, -5);
  scene.add(ground);
  const horizon = new THREE.Mesh(
    new THREE.PlaneGeometry(rowLengthM - left + topM * 4, topM * 0.004),
    new THREE.MeshBasicMaterial({ color: 0x4a5a76 }),
  );
  horizon.position.set((left + rowLengthM) / 2, 0, -4);
  scene.add(horizon);

  const headroom = opts.headroom ?? 0.1;
  const frameTop = topM * (1 + headroom);
  const frameBottom = -groundBand;
  const camera = new THREE.OrthographicCamera(0, 1, frameTop, frameBottom, -1000, 1000);
  camera.position.set(0, 0, 100);

  let widthPx = 1;
  let heightPx = 1;
  let scrollM = left;
  let hoverId: string | null = null;
  let raf = 0;
  const clock = new THREE.Clock();

  const pxPerM = () => heightPx / (frameTop - frameBottom);

  function applyCamera() {
    const wM = widthPx / pxPerM();
    camera.left = scrollM;
    camera.right = scrollM + wM;
    camera.top = frameTop;
    camera.bottom = frameBottom;
    camera.updateProjectionMatrix();
  }

  function render() {
    renderer.render(scene, camera);
  }

  function tick() {
    raf = 0;
    if (!hoverId) return;
    const obj = crafts.get(hoverId);
    if (obj) obj.rotation.y += clock.getDelta() * 0.6;
    render();
    raf = requestAnimationFrame(tick);
  }

  const raycaster = new THREE.Raycaster();

  return {
    layout,
    rowLengthM,
    topM,
    pxPerM,
    resize(w, h) {
      widthPx = Math.max(1, w);
      heightPx = Math.max(1, h);
      renderer.setSize(widthPx, heightPx, false);
      applyCamera();
      render();
    },
    setScrollM(m) {
      scrollM = m;
      applyCamera();
      render();
    },
    setHover(id) {
      if (id === hoverId) return;
      const prev = hoverId ? crafts.get(hoverId) : undefined;
      if (prev) prev.rotation.y = 0;
      hoverId = id;
      clock.getDelta();
      if (id && !raf) raf = requestAnimationFrame(tick);
      if (!id) render();
    },
    pick(xPx, yPx) {
      const ndc = new THREE.Vector2((xPx / widthPx) * 2 - 1, -(yPx / heightPx) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects([...crafts.values()], true);
      for (const h of hits) {
        let o: THREE.Object3D | null = h.object;
        while (o && !o.userData.lineupId) o = o.parent;
        if (o) return o.userData.lineupId as string;
      }
      // A thin rocket is hard to hit: fall back to the nearest slot under the pointer.
      const xM = scrollM + xPx / pxPerM();
      const yM = frameTop - yPx / pxPerM();
      const slot = layout.find(
        (s) => Math.abs(s.xM - xM) <= Math.max(s.widthM / 2, 2) && yM <= s.heightM,
      );
      return slot?.id ?? null;
    },
    render,
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
      renderer.dispose();
    },
  };
}
