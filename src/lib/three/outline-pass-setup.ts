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
 *
 * GH #322/#323 extension — accepts an optional `bloom` config that
 * appends a UnrealBloomPass after the outline pass (gated by the
 * caller's quality tier so low-end hardware skips it).
 */
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
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
  /** Optional bloom pass config. When provided, appends a
   *  UnrealBloomPass after the outline pass. Pass `null` (or omit)
   *  to skip — minimal/low quality tiers skip bloom this way. */
  bloom?: { strength: number; radius: number; threshold: number } | null;
  /** Composer pixel ratio cap. Defaults to `Math.min(dpr, 2)`. */
  pixelRatioCap?: number;
}

export interface OutlinePassSetup {
  composer: EffectComposer;
  outlinePass: OutlinePass;
  bloomPass: UnrealBloomPass | null;
}

export function createOutlinePassSetup(input: OutlinePassSetupInput): OutlinePassSetup {
  const { renderer, scene, camera, width, height } = input;
  const opts = { ...OUTLINE_PASS, ...input.options };

  const composer = new EffectComposer(renderer);
  composer.setSize(width, height);
  const dprCap = input.pixelRatioCap ?? 2;
  composer.setPixelRatio(Math.min(window.devicePixelRatio, dprCap));
  composer.addPass(new RenderPass(scene, camera));

  const outlinePass = new OutlinePass(new THREE.Vector2(width, height), scene, camera);
  outlinePass.edgeStrength = opts.edgeStrength;
  outlinePass.edgeGlow = opts.edgeGlow;
  outlinePass.edgeThickness = opts.edgeThickness;
  outlinePass.visibleEdgeColor.setHex(opts.visibleEdgeColor);
  outlinePass.hiddenEdgeColor.setHex(opts.hiddenEdgeColor);
  composer.addPass(outlinePass);

  let bloomPass: UnrealBloomPass | null = null;
  if (input.bloom) {
    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      input.bloom.strength,
      input.bloom.radius,
      input.bloom.threshold,
    );
    composer.addPass(bloomPass);
  }

  return { composer, outlinePass, bloomPass };
}
