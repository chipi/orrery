// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildLabel } from './three-label';

/**
 * jsdom is required: the helper paints text into an
 * HTMLCanvasElement and wraps it in a THREE.Texture. Both objects
 * exist in the jsdom environment (canvas 2D context is partial but
 * enough for these structural assertions).
 */

describe('buildLabel', () => {
  it('returns a Group containing a Line and a Sprite', () => {
    const { group } = buildLabel({ text: 'ISS', color: '#4ecdc4' });
    let lineCount = 0;
    let spriteCount = 0;
    group.traverse((obj) => {
      if (obj instanceof THREE.Line) lineCount++;
      if (obj instanceof THREE.Sprite) spriteCount++;
    });
    expect(lineCount).toBe(1);
    expect(spriteCount).toBe(1);
  });

  it('places the sprite at the configured offset', () => {
    const offset = new THREE.Vector3(0, 5, 0);
    const { group } = buildLabel({ text: 'X', color: '#fff', offset });
    let sprite: THREE.Sprite | null = null;
    group.traverse((obj) => {
      if (obj instanceof THREE.Sprite) sprite = obj;
    });
    expect(sprite).not.toBeNull();
    if (!sprite) return;
    const s = sprite as THREE.Sprite;
    expect(s.position.equals(offset)).toBe(true);
  });

  it('produces a 4:1 aspect ratio sprite at the requested size', () => {
    const { group } = buildLabel({ text: 'X', color: '#fff', size: 0.6 });
    let sprite: THREE.Sprite | null = null;
    group.traverse((obj) => {
      if (obj instanceof THREE.Sprite) sprite = obj;
    });
    expect(sprite).not.toBeNull();
    if (!sprite) return;
    const s = sprite as THREE.Sprite;
    // size×2 = 1.2 width, size×0.5 = 0.3 height — ratio 4:1 matches
    // the 256×64 canvas
    expect(s.scale.x).toBeCloseTo(1.2, 6);
    expect(s.scale.y).toBeCloseTo(0.3, 6);
  });

  it('returns a Texture handle for later disposal', () => {
    const { texture } = buildLabel({ text: 'X', color: '#fff' });
    expect(texture).toBeInstanceOf(THREE.Texture);
  });
});
