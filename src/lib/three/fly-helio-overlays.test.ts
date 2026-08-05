// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  buildTubeGeometry,
  buildTubeMaterial,
  buildSpacecraftSprite,
  buildEnginePlume,
  buildLabelSprite,
  drawLabelTexture,
} from './fly-helio-overlays';
import type { Vec2 } from '$lib/orbital/mission-arc';

// Structural smoke tests for the pure helio-overlay builders (RFC-036 WS-B/B2a).
// jsdom can construct Three.js geometry/materials + a 2D canvas (it just can't
// run WebGL), so the same policy as descent-models.test.ts applies: exercise the
// structure a GPU-free harness can see. These lock the extraction — a byte-drift
// in the tube vertex layout, the shader uniforms, or the sprite scale trips here.

const arc = (n: number): Vec2[] =>
  Array.from({ length: n }, (_, i) => ({ x: i * 0.1, y: 0, z: Math.sin(i * 0.3) }));

describe('buildTubeGeometry', () => {
  it('returns empty geometry for <2 points', () => {
    expect(buildTubeGeometry([], 0.4).getAttribute('position')).toBeUndefined();
    expect(buildTubeGeometry([{ x: 0, y: 0, z: 0 }], 0.4).getAttribute('position')).toBeUndefined();
  });

  it('builds ringCount × (radialSegs+1) vertices, each carrying an aT attribute', () => {
    const pts = arc(10);
    const geom = buildTubeGeometry(pts, 0.46);
    const pos = geom.getAttribute('position');
    const aT = geom.getAttribute('aT');
    expect(pos).toBeTruthy();
    // 10 rings × 9 verts-per-ring (radialSegs 8 + seam duplicate) = 90.
    expect(pos.count).toBe(10 * 9);
    expect(aT.count).toBe(10 * 9);
    // aT runs 0 → 1 across the rings (first ring 0, last ring 1).
    expect(aT.getX(0)).toBeCloseTo(0, 6);
    expect(aT.getX(aT.count - 1)).toBeCloseTo(1, 6);
    expect(geom.getIndex()).toBeTruthy();
  });

  it('scales point positions by SCALE_3D on the ring centre-line', () => {
    // A single straight 2-point arc: ring 0 centre ≈ pts[0] * SCALE_3D. The radial
    // offset is symmetric, so the mean of the ring's X ≈ the scaled centre.
    const pts: Vec2[] = [
      { x: 1, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
    ];
    const geom = buildTubeGeometry(pts, 0.4);
    const pos = geom.getAttribute('position');
    let sumX = 0;
    const perRing = 9;
    for (let r = 0; r < perRing; r++) sumX += pos.getX(r);
    // SCALE_3D = 80 → x=1 maps to 80. Radial offset is in Z for an X-tangent arc,
    // so every ring vertex shares x ≈ 80.
    expect(sumX / perRing).toBeCloseTo(80, 4);
  });
});

describe('buildTubeMaterial', () => {
  it('is a ShaderMaterial with the progress/colour/opacity uniforms, opaque + depth-writing', () => {
    const mat = buildTubeMaterial(0x4488ff, 0.95, 0.22);
    expect(mat).toBeInstanceOf(THREE.ShaderMaterial);
    expect(mat.uniforms.uProgress.value).toBe(0);
    expect(mat.uniforms.uBrightOpacity.value).toBe(0.95);
    expect(mat.uniforms.uDimOpacity.value).toBe(0.22);
    expect((mat.uniforms.uColor.value as THREE.Color).getHex()).toBe(0x4488ff);
    expect(mat.transparent).toBe(false);
    expect(mat.depthWrite).toBe(true);
  });
});

describe('buildSpacecraftSprite', () => {
  it('builds a face-camera sprite (renderOrder 999, scale 2.5, depthTest off) with a canvas texture', () => {
    const { sprite, texture, canvas } = buildSpacecraftSprite();
    expect(sprite).toBeInstanceOf(THREE.Sprite);
    expect(sprite.renderOrder).toBe(999);
    expect(sprite.scale.x).toBe(2.5);
    expect(sprite.scale.y).toBe(2.5);
    const mat = sprite.material as THREE.SpriteMaterial;
    expect(mat.depthTest).toBe(false);
    expect(mat.depthWrite).toBe(false);
    expect(texture).toBeInstanceOf(THREE.CanvasTexture);
    expect(canvas.width).toBe(64);
    expect(canvas.height).toBe(64);
  });
});

describe('buildEnginePlume', () => {
  it('builds a hidden additive cone (renderOrder 998) with a gradient shader', () => {
    const { mesh, material } = buildEnginePlume();
    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.visible).toBe(false);
    expect(mesh.renderOrder).toBe(998);
    expect(material.blending).toBe(THREE.AdditiveBlending);
    expect(material.uniforms.uOpacity.value).toBe(0);
    expect(mesh.material).toBe(material);
  });
});

describe('label sprites', () => {
  it('buildLabelSprite makes a 320×96 canvas sprite scaled to 34×10', () => {
    const { sprite, canvas } = buildLabelSprite();
    expect(sprite).toBeInstanceOf(THREE.Sprite);
    expect(canvas.width).toBe(320);
    expect(canvas.height).toBe(96);
    expect(sprite.scale.x).toBe(34);
    expect(sprite.scale.y).toBe(10);
  });

  it('drawLabelTexture writes to the 2D context without throwing (two lines)', () => {
    const { canvas } = buildLabelSprite();
    expect(() => drawLabelTexture(canvas, 'LAUNCH', '1962-02-20', '#4b9cd3')).not.toThrow();
  });
});
