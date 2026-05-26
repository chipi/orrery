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
 * Disposes the OutlinePass + the WebGLRenderer, then removes the
 * canvas from the DOM. Both surface routes' cleanup blocks end with
 * this trio.
 */
export function disposeSceneRenderer({
  renderer,
  outlinePass,
}: {
  renderer: THREE.WebGLRenderer;
  outlinePass: { dispose: () => void };
}): void {
  outlinePass.dispose();
  renderer.dispose();
  renderer.domElement.remove();
}
