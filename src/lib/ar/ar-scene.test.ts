import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildArSceneContent, type ArSceneType } from './ar-scene';

// The pure content builder is testable without AR — createArScene's session +
// render loop needs an AR-capable device (Marko: Android / iPhone).

describe('buildArSceneContent', () => {
  it('names the group per scene type', () => {
    for (const t of ['explore', 'earth', 'moon', 'mars'] as ArSceneType[]) {
      expect(buildArSceneContent(t).name).toBe(`ar-scene-${t}`);
    }
  });

  it('/explore builds a sun + eight planets on rings', () => {
    const g = buildArSceneContent('explore');
    expect(g.getObjectByName('sun')).toBeInstanceOf(THREE.Mesh);
    const planets = g.children.filter((c) => c.name.startsWith('planet-'));
    expect(planets).toHaveLength(8);
    // Each planet has an orbit ring (Line) → 8 rings too.
    const rings = g.children.filter((c) => c instanceof THREE.Line);
    expect(rings).toHaveLength(8);
  });

  it('a body scene builds a single named sphere', () => {
    const g = buildArSceneContent('mars');
    expect(g.getObjectByName('mars')).toBeInstanceOf(THREE.Mesh);
    expect(g.getObjectByName('sun')).toBeUndefined();
  });

  it('every scene includes lighting so bodies read in a room', () => {
    const g = buildArSceneContent('moon');
    const hasLight = g.children.some((c) => (c as THREE.Light).isLight);
    expect(hasLight).toBe(true);
  });
});
