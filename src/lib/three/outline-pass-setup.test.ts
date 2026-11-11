import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { createOutlinePassSetup } from './outline-pass-setup';

// EffectComposer only asks the renderer for its size and pixel ratio at construction.
const stubRenderer = {
  getPixelRatio: () => 1,
  getSize: (v: THREE.Vector2) => v.set(64, 64),
  getDrawingBufferSize: (v: THREE.Vector2) => v.set(64, 64),
  getRenderTarget: () => null,
  setRenderTarget: () => {},
} as unknown as THREE.WebGLRenderer;

function build(extra: { outputPass?: boolean; bloom?: boolean } = {}) {
  return createOutlinePassSetup({
    renderer: stubRenderer,
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    width: 64,
    height: 64,
    outputPass: extra.outputPass,
    bloom: extra.bloom ? { strength: 0.4, radius: 0.5, threshold: 0.9 } : null,
  });
}

describe('createOutlinePassSetup', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { devicePixelRatio: 1 });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('ends with an OutputPass when outputPass is true', () => {
    const { composer } = build({ outputPass: true });
    const passes = composer.passes;
    expect(passes[passes.length - 1]).toBeInstanceOf(OutputPass);
    expect(passes.filter((p) => p instanceof OutputPass)).toHaveLength(1);
  });

  it('keeps the OutputPass after the bloom pass', () => {
    const { composer } = build({ outputPass: true, bloom: true });
    const names = composer.passes.map((p) => p.constructor);
    expect(names).toEqual([RenderPass, OutlinePass, UnrealBloomPass, OutputPass]);
  });

  it('adds no OutputPass unless asked', () => {
    const { composer } = build();
    expect(composer.passes.some((p) => p instanceof OutputPass)).toBe(false);
  });
});
