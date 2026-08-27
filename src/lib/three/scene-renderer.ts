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

/** Thrown when the browser can't create a WebGL context (WebGL disabled, a weak
 *  GPU, or too many live contexts). Callers catch it to bail their scene init
 *  gracefully — a fallback message is already shown in the container (#474/#470/#430). */
export class WebGLUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('WebGL is unavailable on this device');
    this.name = 'WebGLUnavailableError';
    this.cause = cause;
  }
}

/** Inject an honest "3D unavailable" notice into the scene container. */
function showWebglFallback(container: HTMLElement): void {
  if (container.querySelector('.webgl-unavailable')) return;
  const el = document.createElement('div');
  el.className = 'webgl-unavailable';
  el.setAttribute('role', 'note');
  el.style.cssText =
    'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
    'padding:24px;text-align:center;color:rgba(255,255,255,0.7);' +
    "font:14px/1.6 var(--font-mono,'Space Mono',monospace);background:#04040c;";
  el.textContent =
    "This view needs 3D graphics (WebGL), which this device or browser can't start right now. Try another browser, or enable hardware acceleration.";
  container.appendChild(el);
}

export function createSceneRenderer(
  container: HTMLElement,
  {
    clearColor = 0x04040c,
    pixelRatioCap = 2,
  }: { clearColor?: number; pixelRatioCap?: number } = {},
): THREE.WebGLRenderer {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  } catch (err) {
    // Context creation can throw on constrained devices / disabled WebGL. Show a
    // fallback + throw a typed error so callers bail init instead of an uncaught
    // crash flooding telemetry (#474/#470/#430).
    showWebglFallback(container);
    throw new WebGLUnavailableError(err);
  }
  // Pixel-ratio cap is the single biggest fill-rate lever on Retina/mobile.
  // Callers pass `quality.pixelRatioCap` (minimal 0.75 / low 1.0 / … / 2.0)
  // so weak GPUs don't render at full DPR; defaults to 2 (the historical cap)
  // when no tier is threaded. Surface routes (#363 follow-up) previously
  // skipped this entirely and paid 2×+ fill on mobile.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap));
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
