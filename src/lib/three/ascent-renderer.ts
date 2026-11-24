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
import { newWebGLRenderer } from '$lib/three/scene-renderer';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import type { FlightPhaseScene } from './flight-phase-scene';
import { heroEnvironment } from './hero-materials';

export interface AscentRenderer {
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  /** Re-fit renderer + composer to the container's current size + scene aspect. */
  resize: () => void;
  /** Render one composed frame, then an inset view over it when given (the booster-landing
   *  inset, 0.9.11 F2): its scene drawn straight into `rect` (CSS px from the canvas's top-left). */
  render: (inset?: InsetView | null) => void;
  /** Tear down the GL context + passes (call from onDestroy). */
  dispose: () => void;
}

/** A second scene drawn into a rectangle of the canvas, after the composed frame. */
export interface InsetView {
  scene: THREE.Scene;
  camera: THREE.Camera;
  rect: { x: number; y: number; w: number; h: number };
  /** The view fills the frame: the composed main scene is not drawn under it. */
  full?: boolean;
}

/**
 * Mount a tone-mapped + graded composer for `scene` into `container` (appends
 * the canvas). Returns the renderer, the composer, and the resize / render /
 * dispose handles the caller drives from its mount + animate loop + teardown.
 */
export interface AscentRendererOptions {
  /** Install the hero IBL environment (reflections on the PBR launcher/capsule/
   *  lander models). Tier-gated by the caller — high+ only. Default false: the
   *  per-fragment env sampling is a per-frame cost that starves software-GL /
   *  GPU-less renderers (it tipped the /fly-descent CI e2e handoff over its wall),
   *  so opt in only when the quality tier can afford it. See quality-tier.ts. */
  iblEnabled?: boolean;
}

export function createAscentRenderer(
  container: HTMLElement,
  scene: FlightPhaseScene,
  opts: AscentRendererOptions = {},
): AscentRenderer {
  const w = container.clientWidth;
  const h = container.clientHeight;

  const renderer = newWebGLRenderer({ antialias: true }, container);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.setSize(w, h);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  // Hero IBL — the bespoke launcher (metalness ~0.45) + earth curve pick up
  // real reflections/glints. The pad is rough (barely reflects) and the sky /
  // exhaust glows are MeshBasic (untouched). Layers on top of the scene's own
  // sun light rather than replacing it. Tier-gated (high+) by the caller.
  if (opts.iblEnabled) scene.scene.environment = heroEnvironment(renderer);
  container.appendChild(renderer.domElement);

  const composer = new EffectComposer(renderer);
  composer.setSize(w, h);
  composer.addPass(new RenderPass(scene.scene, scene.camera));
  composer.addPass(new FilmPass(0.1));
  const vignette = new ShaderPass(VignetteShader);
  vignette.uniforms['offset'].value = 0.95;
  vignette.uniforms['darkness'].value = 1.0;
  composer.addPass(vignette);
  composer.addPass(new OutputPass());

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
    render: (inset) => {
      if (!inset?.full) composer.render();
      if (!inset || inset.rect.w < 2 || inset.rect.h < 2) return;
      // Stainless boosters are full metal: without an environment they render black. The inset
      // is a small viewport, so it gets the hero IBL whatever the main scene's tier.
      if (!inset.scene.environment) inset.scene.environment = heroEnvironment(renderer);
      const { x, y, w: iw, h: ih } = inset.rect;
      const bottom = container.clientHeight - (y + ih);
      renderer.setViewport(x, bottom, iw, ih);
      renderer.setScissor(x, bottom, iw, ih);
      renderer.setScissorTest(true);
      renderer.render(inset.scene, inset.camera);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, container.clientWidth, container.clientHeight);
    },
    dispose: () => {
      composer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
