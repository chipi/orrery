/**
 * EffectComposer + OutlinePass setup helper (#57).
 *
 * Five canvas routes (earth, iss, mars, moon, tiangong) previously had
 * 15-line setup blocks for the hover/selection outline pass — each
 * identical apart from minor tuning. The helper centralises that.
 *
 * Returned object exposes the underlying composer + outlinePass refs
 * so callers can keep their existing `composer.render()` /
 * `outlinePass.selectedObjects = ...` / `composer.setSize(...)`
 * lifecycle calls.
 */
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import * as THREE from 'three';

import { OUTLINE_PASS } from '$lib/three-constants';

export interface OutlinePassSetupInput {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
  width: number;
  height: number;
  /** Override tuning (defaults from `$lib/three-constants:OUTLINE_PASS`). */
  options?: Partial<typeof OUTLINE_PASS>;
}

export interface OutlinePassSetup {
  composer: EffectComposer;
  outlinePass: OutlinePass;
}

export function createOutlinePassSetup(input: OutlinePassSetupInput): OutlinePassSetup {
  const { renderer, scene, camera, width, height } = input;
  const opts = { ...OUTLINE_PASS, ...input.options };

  const composer = new EffectComposer(renderer);
  composer.setSize(width, height);
  composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.addPass(new RenderPass(scene, camera));

  const outlinePass = new OutlinePass(new THREE.Vector2(width, height), scene, camera);
  outlinePass.edgeStrength = opts.edgeStrength;
  outlinePass.edgeGlow = opts.edgeGlow;
  outlinePass.edgeThickness = opts.edgeThickness;
  outlinePass.visibleEdgeColor.setHex(opts.visibleEdgeColor);
  outlinePass.hiddenEdgeColor.setHex(opts.hiddenEdgeColor);
  composer.addPass(outlinePass);

  return { composer, outlinePass };
}
