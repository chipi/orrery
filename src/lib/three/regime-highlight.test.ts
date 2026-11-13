import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { buildRegimeHighlight } from './regime-highlight';
import type { RegimeShape } from '$lib/orbit-regime-geometry';

// The ring texture is a canvas drawing; a node test has no canvas, so the sprite takes a blank one.
vi.mock('$lib/universe/scene-pin-sprites', () => ({
  ringTexture: () => new THREE.Texture(),
  createRing: (tex: THREE.Texture) => new THREE.Sprite(new THREE.SpriteMaterial({ map: tex })),
}));

const shapes: Record<string, RegimeShape> = {
  LEO: { kind: 'band', inner: 31.3, outer: 35.4 },
  GEO: { kind: 'ring', inner: 41.7, outer: 41.7 },
  HILL: { kind: 'shell', inner: 49.4, outer: 49.4 },
  L2: { kind: 'marker', inner: 50, outer: 50 },
  OORT: { kind: 'ring', inner: 1000, outer: 1000, schematic: true },
};
const camera = new THREE.PerspectiveCamera(50, 1.5, 0.1, 5000);
camera.position.set(0, 60, 150);
camera.lookAt(0, 0, 0);
const frame = (hl: ReturnType<typeof buildRegimeHighlight>, t = 0, still = false) =>
  hl.update(camera, 800, 600, t, still);
const child = (hl: ReturnType<typeof buildRegimeHighlight>, i: number) =>
  hl.group.children[i] as THREE.Group;

describe('buildRegimeHighlight', () => {
  it('draws nothing until a regime is hovered or active', () => {
    const hl = buildRegimeHighlight({ shapes });
    frame(hl);
    expect(hl.group.visible).toBe(false);
    expect(hl.state()).toBe('');
  });

  it('shows the hovered regime only, and reports it', () => {
    const hl = buildRegimeHighlight({ shapes });
    hl.set('GEO', null);
    frame(hl);
    expect(hl.group.visible).toBe(true);
    expect(hl.state()).toBe('GEO:hover');
    const visible = hl.group.children.filter((c) => c.visible);
    expect(visible).toHaveLength(1);
  });

  it('hover wins over active in the state, both are drawn', () => {
    const hl = buildRegimeHighlight({ shapes });
    hl.set('GEO', 'LEO');
    frame(hl);
    expect(hl.state()).toBe('GEO:hover');
    expect(hl.group.children.filter((c) => c.visible)).toHaveLength(2);
    hl.set(null, 'LEO');
    expect(hl.state()).toBe('LEO:active');
  });

  it('an unknown id is no state', () => {
    const hl = buildRegimeHighlight({ shapes });
    hl.set('NOPE', null);
    expect(hl.state()).toBe('');
  });

  it('a band is an annulus plus two edge lines; a ring one line; a shell three', () => {
    const hl = buildRegimeHighlight({ shapes });
    const count = (i: number) => ({
      meshes: child(hl, i).children.filter(
        (c) => (c as THREE.Mesh).isMesh && !(c as THREE.Line).isLine,
      ).length,
      children: child(hl, i).children.length,
    });
    expect(count(0)).toEqual({ meshes: 3, children: 3 });
    expect(child(hl, 1).children).toHaveLength(1);
    expect(child(hl, 2).children).toHaveLength(3);
  });

  it('the active regime pulses between 0.55 and 0.9; reduced motion holds it steady', () => {
    const hl = buildRegimeHighlight({ shapes });
    hl.set(null, 'GEO');
    const line = () => (child(hl, 1).children[0] as THREE.Mesh).material as { opacity: number };
    const seen = new Set<number>();
    for (let t = 0; t < 1600; t += 100) {
      frame(hl, t);
      seen.add(Math.round(line().opacity * 1000));
    }
    expect(Math.min(...seen)).toBeGreaterThanOrEqual(550);
    expect(Math.max(...seen)).toBeLessThanOrEqual(900);
    expect(seen.size).toBeGreaterThan(3);
    const still = new Set<number>();
    for (let t = 0; t < 1600; t += 100) {
      frame(hl, t, true);
      still.add(line().opacity);
    }
    expect(still.size).toBe(1);
    hl.set('GEO', null);
    frame(hl, 0);
    expect(line().opacity).toBeCloseTo(0.9, 5);
  });

  it('a schematic regime is dashed', () => {
    const hl = buildRegimeHighlight({ shapes });
    const mat = (child(hl, 4).children[0] as THREE.Mesh).material as unknown as {
      dashed: boolean;
    };
    expect(mat.dashed).toBe(true);
    const solid = (child(hl, 1).children[0] as THREE.Mesh).material as unknown as {
      dashed: boolean;
    };
    expect(solid.dashed).toBe(false);
  });

  it('a marker rings each point the scene gives, and follows them', () => {
    const points = [new THREE.Vector3(50, 0, 0), new THREE.Vector3(0, 0, 50)];
    const hl = buildRegimeHighlight({ shapes, markerPoints: () => points });
    hl.set('L2', null);
    frame(hl);
    const rings = child(hl, 3).children as THREE.Sprite[];
    expect(rings).toHaveLength(2);
    expect(rings[0].position.x).toBe(50);
    points.pop();
    frame(hl);
    expect(rings[1].visible).toBe(false);
  });

  it('dispose detaches the group', () => {
    const scene = new THREE.Scene();
    const hl = buildRegimeHighlight({ shapes });
    scene.add(hl.group);
    hl.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
