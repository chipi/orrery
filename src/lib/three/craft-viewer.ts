/**
 * The fleet and mission pages' 3D craft viewer: one showcase model (src/lib/three/showcase/) in the
 * line-up's studio light, turning slowly; a horizontal drag turns it, a vertical one tilts it.
 * Loaded on demand (CraftViewer.svelte imports this module only when the viewer scrolls into view),
 * so a page that never shows it never loads three.js.
 */
import * as THREE from 'three';
import type { ShowcaseModel } from './showcase/types';
import { SHOWCASE_FAMILY } from './showcase-index';
import { installHeroEnvironment } from './hero-materials';

const FAMILIES = import.meta.glob<{ SHOWCASE?: Record<string, ShowcaseModel> }>([
  './showcase/*.ts',
  '!./showcase/*.test.ts',
]);

export interface CraftViewer {
  /** Pause the loop while the viewer is off screen. */
  setActive(active: boolean): void;
  dispose(): void;
}

async function loadModel(fleetId: string): Promise<ShowcaseModel | null> {
  const family = SHOWCASE_FAMILY[fleetId];
  const load = family ? FAMILIES[`./showcase/${family}.ts`] : undefined;
  if (!load) return null;
  return (await load()).SHOWCASE?.[fleetId] ?? null;
}

/** Turntable speed (rad/s) and the tilt range a drag may reach. */
const SPIN = 0.18;
const EL_MIN = -0.15;
const EL_MAX = 1.2;

export async function mountCraftViewer(
  canvas: HTMLCanvasElement,
  fleetId: string,
  opts: { reducedMotion: boolean },
): Promise<CraftViewer | null> {
  const model = await loadModel(fleetId);
  if (!model) return null;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f17);
  scene.add(new THREE.HemisphereLight(0xcfd8e8, 0x2a2c30, 0.55));
  const sun = new THREE.DirectionalLight(0xfff6ea, 3.0);
  sun.position.set(-1, 0.9, 1.2);
  scene.add(sun);
  installHeroEnvironment(renderer, scene);

  const craft = model.build();
  const box = new THREE.Box3().setFromObject(craft);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  craft.position.sub(new THREE.Vector3(centre.x, 0, centre.z));
  scene.add(craft);
  // A soft floor disc under the craft, at its base.
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(Math.max(size.x, size.z) * 0.6 + size.y * 0.1, 64),
    new THREE.MeshStandardMaterial({ color: 0x1b2130, roughness: 1, metalness: 0 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = box.min.y - 0.001;
  scene.add(floor);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 5000);
  const target = new THREE.Vector3(0, box.min.y + size.y * 0.5, 0);
  // The radius of the sphere around the craft: the camera keeps all of it in view at any angle.
  const radius = size.length() / 2;
  let az = 0.6;
  let el = 0.22;

  const resize = (): void => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const place = (): void => {
    const halfFov = (camera.fov * Math.PI) / 360;
    const fit = Math.min(1, camera.aspect);
    const d = (radius / Math.tan(halfFov) / fit) * 1.05;
    camera.position.set(
      target.x + Math.sin(az) * Math.cos(el) * d,
      target.y + Math.sin(el) * d,
      target.z + Math.cos(az) * Math.cos(el) * d,
    );
    camera.near = Math.max(0.01, d - radius * 2);
    camera.far = d + radius * 4;
    camera.updateProjectionMatrix();
    camera.lookAt(target);
  };

  // Drag to turn (x) and tilt (y). touch-action on the canvas keeps vertical page scroll on touch.
  let dragging: { x: number; y: number; id: number } | null = null;
  let lastInput = -Infinity;
  const onDown = (e: PointerEvent): void => {
    dragging = { x: e.clientX, y: e.clientY, id: e.pointerId };
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent): void => {
    if (!dragging || e.pointerId !== dragging.id) return;
    const s = 4 / Math.max(200, canvas.clientWidth);
    az -= (e.clientX - dragging.x) * s;
    el = Math.min(EL_MAX, Math.max(EL_MIN, el + (e.clientY - dragging.y) * s));
    dragging.x = e.clientX;
    dragging.y = e.clientY;
    lastInput = performance.now();
  };
  const onUp = (e: PointerEvent): void => {
    if (dragging?.id === e.pointerId) dragging = null;
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  let raf = 0;
  let last = performance.now();
  let disposed = false;
  let active = true;
  const frame = (now: number): void => {
    if (disposed || !active) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    // Turn on its own unless the visitor asked for less motion or dragged in the last 3 s.
    if (!opts.reducedMotion && !dragging && now - lastInput > 3000) az += SPIN * dt;
    place();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    setActive(next) {
      if (next === active || disposed) return;
      active = next;
      if (active) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      scene.environment?.dispose();
      renderer.dispose();
    },
  };
}
