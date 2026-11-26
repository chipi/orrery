import type * as THREE from 'three';

/**
 * A size-attenuated point cloud seen from a few scene units away draws each point many pixels
 * wide, as a square: the main belt behind Lucy's Donaldjohanson flyby filled the frame with
 * blocks. This caps the drawn size and rounds the points.
 */
export function patchPointsShader(
  vertexShader: string,
  fragmentShader: string,
  maxPx: number,
): { vertexShader: string; fragmentShader: string } {
  const v = vertexShader.replace(
    '#include <fog_vertex>',
    `gl_PointSize = min(gl_PointSize, ${maxPx.toFixed(1)});\n#include <fog_vertex>`,
  );
  const f = fragmentShader.replace(
    '#include <clipping_planes_fragment>',
    `vec2 pc = gl_PointCoord - 0.5;\nif (dot(pc, pc) > 0.25) discard;\n#include <clipping_planes_fragment>`,
  );
  if (v === vertexShader || f === fragmentShader) throw new Error('points shader hooks not found');
  return { vertexShader: v, fragmentShader: f };
}

/** Caps a PointsMaterial's drawn point size at `maxPx` device pixels, round points. */
export function capPointSize(material: THREE.PointsMaterial, maxPx: number): void {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader, patchPointsShader(shader.vertexShader, shader.fragmentShader, maxPx));
  };
  material.customProgramCacheKey = () => `point-cap-${maxPx}`;
}
