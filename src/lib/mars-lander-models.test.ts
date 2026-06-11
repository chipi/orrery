// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildMarsLanderModel, KNOWN_MARS_LANDER_IDS } from './mars-lander-models';

function countMeshes(g: THREE.Object3D): number {
  let n = 0;
  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh) n++;
  });
  return n;
}

describe('buildMarsLanderModel', () => {
  it('returns a Group with ≥1 mesh for every known Mars-lander id', () => {
    for (const id of KNOWN_MARS_LANDER_IDS) {
      const g = buildMarsLanderModel(id, undefined, undefined, '#bb1f24');
      expect(g).toBeInstanceOf(THREE.Group);
      expect(countMeshes(g), `${id} should have ≥1 mesh`).toBeGreaterThan(0);
    }
  });

  it('exposes dedicated builders for the canonical Mars-surface mission roster', () => {
    expect(KNOWN_MARS_LANDER_IDS).toEqual(
      expect.arrayContaining([
        'viking1-lander',
        'viking2-lander',
        'mars-pathfinder',
        'spirit',
        'opportunity',
        'curiosity',
        'perseverance',
        'phoenix',
        'insight',
        'mars2',
        'mars3',
        'mars6',
        'beagle2',
        'schiaparelli',
      ]),
    );
  });

  it('Viking 1 and Viking 2 share the same tripod silhouette (identical hardware)', () => {
    const g1 = buildMarsLanderModel('viking1-lander', undefined, undefined, '#c0c0c0');
    const g2 = buildMarsLanderModel('viking2-lander', undefined, undefined, '#c0c0c0');
    expect(countMeshes(g1)).toBe(countMeshes(g2));
  });

  it('Spirit and Opportunity share the same MER silhouette (twin rovers)', () => {
    const gS = buildMarsLanderModel('spirit', undefined, undefined, '#cc9900');
    const gO = buildMarsLanderModel('opportunity', undefined, undefined, '#cc9900');
    expect(countMeshes(gS)).toBe(countMeshes(gO));
  });

  it('Perseverance includes the Ingenuity helicopter; Curiosity does not', () => {
    const gC = buildMarsLanderModel('curiosity', undefined, undefined, '#cc6633');
    const gP = buildMarsLanderModel('perseverance', undefined, undefined, '#cc6633');
    // Both are MSL-class; perseverance variant adds the Ingenuity rotor
    // assembly so its mesh count is strictly higher.
    expect(countMeshes(gP)).toBeGreaterThan(countMeshes(gC));
  });

  it('Phoenix and InSight share the static-lander silhouette', () => {
    const gPh = buildMarsLanderModel('phoenix', undefined, undefined, '#7799cc');
    const gIn = buildMarsLanderModel('insight', undefined, undefined, '#7799cc');
    expect(countMeshes(gPh)).toBe(countMeshes(gIn));
  });

  it('Mars 2 / 3 / 6 share the Soviet-petal silhouette', () => {
    const g2 = buildMarsLanderModel('mars2', undefined, undefined, '#cc4422');
    const g3 = buildMarsLanderModel('mars3', undefined, undefined, '#cc4422');
    const g6 = buildMarsLanderModel('mars6', undefined, undefined, '#cc4422');
    expect(countMeshes(g2)).toBe(countMeshes(g3));
    expect(countMeshes(g3)).toBe(countMeshes(g6));
  });

  it('falls back to the generic-rover silhouette for an unknown rover-type id', () => {
    const g = buildMarsLanderModel('future-unknown-rover', 'Rover', 'NASA', '#888888');
    expect(g).toBeInstanceOf(THREE.Group);
    expect(countMeshes(g)).toBeGreaterThan(0);
  });

  it('falls back to the generic-lander silhouette for an unknown lander-type id', () => {
    const g = buildMarsLanderModel('future-unknown-lander', 'Lander', 'JAXA', '#888888');
    expect(g).toBeInstanceOf(THREE.Group);
    expect(countMeshes(g)).toBeGreaterThan(0);
  });

  it('routes an unknown ROSCOSMOS site to the Soviet-petal fallback regardless of mission_type', () => {
    const gPetalFallback = buildMarsLanderModel(
      'future-unknown-mars',
      'Lander',
      'ROSCOSMOS',
      '#cc4422',
    );
    const gMars3 = buildMarsLanderModel('mars3', undefined, undefined, '#cc4422');
    expect(countMeshes(gPetalFallback)).toBe(countMeshes(gMars3));
  });

  it('all builders produce a Group rooted at the origin (caller positions on the surface)', () => {
    for (const id of KNOWN_MARS_LANDER_IDS) {
      const g = buildMarsLanderModel(id, undefined, undefined, '#bb1f24');
      expect(g.position.x).toBe(0);
      expect(g.position.y).toBe(0);
      expect(g.position.z).toBe(0);
    }
  });
});
