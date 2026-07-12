import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildArSceneContent, type SurfaceArType } from './ar-scene';
import { buildSolarSystem, PLANETS } from '../explore-scene';

// The pure content builders are testable without AR; createArScene's session +
// render loop needs an AR-capable device (Marko: Android / iPhone).

describe('buildArSceneContent (earth/moon/mars globe)', () => {
  it('names the group + builds a single named sphere with lighting', () => {
    for (const t of ['earth', 'moon', 'mars'] as SurfaceArType[]) {
      const g = buildArSceneContent(t);
      expect(g.name).toBe(`ar-scene-${t}`);
      expect(g.getObjectByName(t)).toBeInstanceOf(THREE.Mesh);
      expect(g.getObjectByName('sun')).toBeUndefined();
      expect(g.children.some((c) => (c as THREE.Light).isLight)).toBe(true);
    }
  });
});

describe('buildSolarSystem (real /explore scene, shared with the route)', () => {
  const stub = () => new THREE.Texture();

  it('builds the Sun + all planets and tracks satellites', () => {
    const s = buildSolarSystem({ loadTexture: stub, scale: 0.0004, quality: 'ar' });
    expect(s.sun).toBeInstanceOf(THREE.Mesh);
    expect(s.planetById.size).toBe(PLANETS.length);
    // Earth's Moon is a tracked satellite.
    expect(s.satelliteById.has('moon')).toBe(true);
    s.dispose();
  });

  it('positions planets off the origin after an update, without throwing', () => {
    const s = buildSolarSystem({ loadTexture: stub, scale: 0.0004, quality: 'ar' });
    s.setInitialSimT(0);
    expect(() => s.update(0, 0)).not.toThrow();
    expect(() => s.update(1.5, 0.016)).not.toThrow();
    expect(s.planetById.get('earth')!.position.length()).toBeGreaterThan(0);
    s.dispose();
  });
});
