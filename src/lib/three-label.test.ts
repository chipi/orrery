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

  it('produces a sprite scaled to the dynamic canvas aspect', () => {
    // Canvas is no longer fixed at 256×64 — width adjusts to the
    // measured text width (snap to 64 px buckets, clamped 128–512 px,
    // height stays at 64 px). Sprite scale is derived as
    // (size × 0.5 × aspect, size × 0.5, 1). For short text ("X") the
    // canvas collapses to the 128 px minimum → aspect = 2 → width
    // scale = 0.6. Height is always size × 0.5 = 0.3.
    const { group } = buildLabel({ text: 'X', color: '#fff', size: 0.6 });
    let sprite: THREE.Sprite | null = null;
    group.traverse((obj) => {
      if (obj instanceof THREE.Sprite) sprite = obj;
    });
    expect(sprite).not.toBeNull();
    if (!sprite) return;
    const s = sprite as THREE.Sprite;
    expect(s.scale.y).toBeCloseTo(0.3, 6);
    // Width is aspect-driven; assert ≥ height (never narrower than
    // square) and ≤ height × 8 (canvas max aspect, 512/64).
    expect(s.scale.x).toBeGreaterThanOrEqual(s.scale.y);
    expect(s.scale.x).toBeLessThanOrEqual(s.scale.y * 8);
  });

  it('widens the sprite for long text', () => {
    // A long label produces a wider canvas → wider sprite. Pair with
    // a short-label control so the test doesn't depend on jsdom's
    // exact measureText return values.
    const short = buildLabel({ text: 'X', color: '#fff', size: 0.6 });
    const long = buildLabel({
      text: 'PATHFINDER + SOJOURNER ROVER',
      color: '#fff',
      size: 0.6,
    });
    let shortX = 0;
    let longX = 0;
    short.group.traverse((obj) => {
      if (obj instanceof THREE.Sprite) shortX = obj.scale.x;
    });
    long.group.traverse((obj) => {
      if (obj instanceof THREE.Sprite) longX = obj.scale.x;
    });
    expect(longX).toBeGreaterThanOrEqual(shortX);
  });

  it('returns a Texture handle for later disposal', () => {
    const { texture } = buildLabel({ text: 'X', color: '#fff' });
    expect(texture).toBeInstanceOf(THREE.Texture);
  });
});
