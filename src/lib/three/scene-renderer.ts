/**
 * Standard WebGL renderer setup for full-canvas 3D routes (#42).
 *
 * 5 of 7 3D routes (earth, moon, mars, fly, explore) shared the same
 * 4-line boilerplate: antialias + alpha:false renderer, pixel-ratio
 * capped at 2× (avoids retina performance cliffs on weaker GPUs),
 * sized to container, default dark space background.
 *
 * ISS and Tiangong don't use this — they thread a getContext() null
 * check + dispose + fallback path that needs richer integration.
 */
import * as THREE from 'three';

export function createSceneRenderer(
  container: HTMLElement,
  { clearColor = 0x04040c }: { clearColor?: number } = {},
): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(clearColor, 1);
  container.appendChild(renderer.domElement);
  return renderer;
}

/**
 * Standard renderer + composer teardown for cleanup paths (#42).
 *
 * Disposes the OutlinePass + the WebGLRenderer, FORCES the WebGL context
 * to be released, then removes the canvas from the DOM. Both surface
 * routes' cleanup blocks end with this.
 *
 * `renderer.dispose()` frees Three's own bookkeeping but does NOT tell
 * the browser to drop the underlying WebGL context — the GPU memory
 * (textures, buffers, the framebuffer) lingers until lazy GC, and Chrome
 * keeps a pool of live contexts. So navigating earth → moon → mars left
 * each surface scene's hundreds-of-MB context resident, piling up into
 * multiple GB until something (e.g. opening /home) finally let them be
 * collected. `forceContextLoss()` releases the context immediately, so
 * each navigation reclaims its GPU memory right away (#363).
 */
export function disposeSceneRenderer({
  renderer,
  outlinePass,
}: {
  renderer: THREE.WebGLRenderer;
  /** Optional — null on quality-tier minimal/low where the post stack
   *  is skipped (#342 Phase 23). Callers may pass null/undefined. */
  outlinePass?: { dispose: () => void } | null;
}): void {
  outlinePass?.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  renderer.domElement.remove();
}
