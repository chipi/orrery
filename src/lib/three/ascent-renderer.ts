/**
 * The broadcast-look post-processing renderer for Scene 0 (RFC-034 §7) — ACES
 * tone-map + film grain + vignette over any {@link FlightPhaseScene}. Owns the
 * renderer + composer + resize + dispose contract for the /fly launch pre-roll
 * (LaunchScene), keeping the pipeline (vignette values, forceContextLoss
 * teardown) in one place.
 *
 * Browser-only (touches WebGL + the DOM). The animate loop stays with the
 * caller — it owns the per-frame simulation state; this only owns the pixels.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import type { FlightPhaseScene } from './flight-phase-scene';

export interface AscentRenderer {
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  /** Re-fit renderer + composer to the container's current size + scene aspect. */
  resize: () => void;
  /** Render one composed frame. */
  render: () => void;
  /** Tear down the GL context + passes (call from onDestroy). */
  dispose: () => void;
}

/**
 * Mount a tone-mapped + graded composer for `scene` into `container` (appends
 * the canvas). Returns the renderer, the composer, and the resize / render /
 * dispose handles the caller drives from its mount + animate loop + teardown.
 */
export function createAscentRenderer(
  container: HTMLElement,
  scene: FlightPhaseScene,
): AscentRenderer {
  const w = container.clientWidth;
  const h = container.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.setSize(w, h);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  const composer = new EffectComposer(renderer);
  composer.setSize(w, h);
  composer.addPass(new RenderPass(scene.scene, scene.camera));
  composer.addPass(new FilmPass(0.1));
  const vignette = new ShaderPass(VignetteShader);
  vignette.uniforms['offset'].value = 0.95;
  vignette.uniforms['darkness'].value = 0.55;
  composer.addPass(vignette);

  return {
    renderer,
    composer,
    resize: () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      scene.setAspect(cw / ch);
      renderer.setSize(cw, ch);
      composer.setSize(cw, ch);
    },
    render: () => composer.render(),
    dispose: () => {
      composer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
