// WebGL star-field renderer for /explore v2 — the shared "PointField" render
// vocabulary from RFC-032 §4. One THREE.Points draw call, per-point spectral
// color + magnitude-driven size, distance-attenuated in the vertex shader, soft
// disc in the fragment shader. A uOpacity uniform drives the boundary cross-fade.
//
// Coverage-excluded (see vite.config.ts): it runs a WebGL pipeline that can't be
// meaningfully unit-tested in jsdom — the pure LOD + packing it consumes lives in
// star-selection.ts with its own tests. Same policy as explore-scene.ts.

import * as THREE from 'three';
import type { StarFieldArrays } from './star-selection';

const VERT = /* glsl */ `
  attribute float size;
  uniform float uSizeScale;
  uniform float uPixelRatio;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float dist = max(-mv.z, 0.001);
    gl_PointSize = clamp(size * uSizeScale * uPixelRatio * (220.0 / dist), 0.5, 64.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  void main() {
    // Crisp bright core + soft atmospheric halo (additive). The tight core reads
    // as a real star; the wide low-alpha glow keeps the nebular atmosphere.
    vec2 uv = gl_PointCoord - vec2(0.5);
    float r = length(uv) * 2.0;
    float halo = pow(smoothstep(1.0, 0.0, r), 2.8);
    float core = smoothstep(0.32, 0.0, r);
    float alpha = clamp(halo * 0.8 + core * 0.7, 0.0, 1.0) * uOpacity;
    if (alpha < 0.01) discard;
    // Hot core whitens toward the centre — mimics a bright stellar point.
    vec3 col = mix(vColor, vColor * 0.6 + vec3(0.4), core);
    gl_FragColor = vec4(col, alpha);
  }
`;

export interface PointFieldHandle {
  /** The renderable — add to the scene. */
  object: THREE.Points;
  /** 0..1 cross-fade opacity for the boundary reveal. */
  setOpacity(opacity: number): void;
  /** Tune overall point size (device/tier tuning). */
  setSizeScale(scale: number): void;
  /** Free GPU resources. Call on teardown. */
  dispose(): void;
}

/**
 * Build a PointField from packed star arrays. `sceneScale` maps parsecs
 * (the buffer units) to world units for the owning context.
 */
export function createPointField(
  data: StarFieldArrays,
  opts: { sceneScale?: number; pixelRatio?: number; sizeScale?: number } = {},
): PointFieldHandle {
  const { sceneScale = 1, pixelRatio = 1, sizeScale = 1 } = opts;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(data.sizes, 1));
  // A generous bounding sphere avoids per-frame recompute + premature frustum cull.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1e6);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 1 },
      uSizeScale: { value: sizeScale },
      uPixelRatio: { value: pixelRatio },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const object = new THREE.Points(geometry, material);
  object.scale.setScalar(sceneScale);
  object.frustumCulled = false;

  return {
    object,
    setOpacity(opacity: number) {
      material.uniforms.uOpacity.value = Math.min(1, Math.max(0, opacity));
    },
    setSizeScale(scale: number) {
      material.uniforms.uSizeScale.value = scale;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
