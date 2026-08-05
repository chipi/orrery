// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  CISLUNAR_PHASE_COLORS,
  LUNAR_LOCAL_PHASE_TYPES,
  buildCislunarStarField,
  buildCislunarLineMaterial,
  buildCislunarSpacecraftSprite,
  buildAnnotationSprite,
} from './fly-cislunar-overlays';

// Structural smoke tests for the pure cislunar-overlay builders (RFC-036 WS-B/B3).
// Same policy as fly-helio-overlays.test.ts / descent-models.test.ts: jsdom can
// construct Three.js geometry/materials + a 2D canvas but not render, so exercise
// the structure a GPU-free harness can see. These lock the extraction.

describe('cislunar phase constants', () => {
  it('maps every documented phase type to a colour', () => {
    expect(CISLUNAR_PHASE_COLORS.tli_coast).toBe(0xffd166);
    expect(CISLUNAR_PHASE_COLORS.lunar_orbit).toBe(0xc77dff);
    expect(CISLUNAR_PHASE_COLORS.tei_coast).toBe(0x06d6a0);
  });

  it('flags the Moon-frame-local phase types', () => {
    for (const t of ['lunar_orbit', 'spiral_lunar', 'lunar_flyby', 'descent', 'ascent']) {
      expect(LUNAR_LOCAL_PHASE_TYPES.has(t)).toBe(true);
    }
    // Earth-frame phases are NOT Moon-local.
    expect(LUNAR_LOCAL_PHASE_TYPES.has('tli_coast')).toBe(false);
    expect(LUNAR_LOCAL_PHASE_TYPES.has('parking')).toBe(false);
  });
});

describe('buildCislunarStarField', () => {
  it('builds a 1500-point non-attenuating star field on a 200–300u shell', () => {
    const pts = buildCislunarStarField();
    expect(pts).toBeInstanceOf(THREE.Points);
    const pos = pts.geometry.getAttribute('position');
    expect(pos.count).toBe(1500);
    // Every star sits on the 200–300u radius shell.
    for (let i = 0; i < pos.count; i += 137) {
      const r = Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i));
      expect(r).toBeGreaterThanOrEqual(200);
      expect(r).toBeLessThanOrEqual(300);
    }
    const mat = pts.material as THREE.PointsMaterial;
    expect(mat.sizeAttenuation).toBe(false);
  });
});

describe('buildCislunarLineMaterial', () => {
  it('is a ShaderMaterial with the 0.95/0.22 cislunar opacities + the phase colour', () => {
    const mat = buildCislunarLineMaterial(0xc77dff);
    expect(mat).toBeInstanceOf(THREE.ShaderMaterial);
    expect(mat.uniforms.uProgress.value).toBe(0);
    expect(mat.uniforms.uBrightOpacity.value).toBe(0.95);
    expect(mat.uniforms.uDimOpacity.value).toBe(0.22);
    expect((mat.uniforms.uColor.value as THREE.Color).getHex()).toBe(0xc77dff);
    expect(mat.transparent).toBe(false);
    expect(mat.depthWrite).toBe(true);
  });
});

describe('buildCislunarSpacecraftSprite', () => {
  it('builds a face-camera sprite (renderOrder 999, depthTest off) with a 64px canvas texture', () => {
    const { sprite, texture, canvas } = buildCislunarSpacecraftSprite();
    expect(sprite).toBeInstanceOf(THREE.Sprite);
    expect(sprite.renderOrder).toBe(999);
    const mat = sprite.material as THREE.SpriteMaterial;
    expect(mat.depthTest).toBe(false);
    expect(mat.depthWrite).toBe(false);
    expect(texture).toBeInstanceOf(THREE.CanvasTexture);
    expect(canvas.width).toBe(64);
    expect(canvas.height).toBe(64);
  });
});

describe('buildAnnotationSprite', () => {
  it('builds an 8×3 sprite from a 256×96 canvas without throwing', () => {
    let sprite: THREE.Sprite;
    expect(() => {
      sprite = buildAnnotationSprite('TLI', '3.12 km/s', '#ffd166');
    }).not.toThrow();
    sprite = buildAnnotationSprite('LOI', '0.85 km/s', '#c77dff');
    expect(sprite).toBeInstanceOf(THREE.Sprite);
    expect(sprite.scale.x).toBe(8);
    expect(sprite.scale.y).toBe(3);
    const mat = sprite.material as THREE.SpriteMaterial;
    expect(mat.depthTest).toBe(false);
  });
});
