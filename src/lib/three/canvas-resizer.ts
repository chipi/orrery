/**
 * Standard window-resize handler for 3D canvas routes (#42).
 *
 * Wraps the recurring "update camera aspect + resize renderer + resize
 * composer + update outline-pass resolution + run any extra hook"
 * dance that /moon, /mars (and others) duplicate.
 *
 * Returns the handler — caller wires it via
 * `window.addEventListener('resize', handler)` and removes it in
 * cleanup. Optional `onResize` runs after the standard work
 * (e.g. /mars uses it to repaint the 2D view).
 */
import type * as THREE from 'three';

export function createCanvasResizer({
  container,
  camera,
  renderer,
  composer,
  outlinePass,
  onResize,
}: {
  container: HTMLElement;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  composer?: { setSize: (w: number, h: number) => void };
  outlinePass?: { resolution: { set: (w: number, h: number) => void } };
  onResize?: () => void;
}): () => void {
  return () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer?.setSize(w, h);
    outlinePass?.resolution.set(w, h);
    onResize?.();
  };
}
