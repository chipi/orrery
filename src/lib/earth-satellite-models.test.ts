// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildSatelliteModel, KNOWN_SATELLITE_IDS } from './earth-satellite-models';

/**
 * Three.js operations don't strictly require a browser, but the Sprite
 * texture path in the label helper does (HTMLCanvasElement). Tests
 * here stay strictly geometric — no Sprite, no canvas — so node would
 * suffice, but the jsdom pragma matches the rest of the suite that
 * touches Three primitives in a browser-like context.
 */

describe('buildSatelliteModel', () => {
  it('returns a Group for every known satellite id', () => {
    for (const id of KNOWN_SATELLITE_IDS) {
      const g = buildSatelliteModel(id, '#4ecdc4');
      expect(g).toBeInstanceOf(THREE.Group);
      // Each model has at least one mesh child (sanity check that
      // no builder accidentally returned an empty group).
      let meshCount = 0;
      g.traverse((obj) => {
        if (obj instanceof THREE.Mesh) meshCount++;
      });
      expect(meshCount, `${id} should have ≥1 mesh`).toBeGreaterThan(0);
    }
  });

  it('falls back to a generic probe for unknown ids', () => {
    const g = buildSatelliteModel('unknown-future-sat', '#ff0000');
    expect(g).toBeInstanceOf(THREE.Group);
    let meshCount = 0;
    g.traverse((obj) => {
      if (obj instanceof THREE.Mesh) meshCount++;
    });
    expect(meshCount).toBeGreaterThan(0);
  });

  it('exposes all 20 known satellite ids (13 base + 7 lunar-orbiter backfill)', () => {
    expect(KNOWN_SATELLITE_IDS).toHaveLength(20);
    expect(KNOWN_SATELLITE_IDS).toEqual(
      expect.arrayContaining([
        'iss',
        'tiangong',
        'hubble',
        'jwst',
        'chandra',
        'xmm',
        'gaia',
        'lro',
        'geo',
        'gps',
        'galileo',
        'glonass',
        'beidou',
      ]),
    );
  });

  it('ISS model has the expected silhouette: truss + modules + 8 wing panels', () => {
    const g = buildSatelliteModel('iss', '#4ecdc4');
    let meshCount = 0;
    g.traverse((obj) => {
      if (obj instanceof THREE.Mesh) meshCount++;
    });
    // truss(1) + 3 modules + 8 wing panels + 2 radiator panels +
    // 1 accent stripe (v0.1.7) = 15
    expect(meshCount).toBe(15);
  });

  it('JWST model has hexagonal mirror + sunshield + tripod + secondary', () => {
    const g = buildSatelliteModel('jwst', '#ffc850');
    let meshCount = 0;
    g.traverse((obj) => {
      if (obj instanceof THREE.Mesh) meshCount++;
    });
    // shield(1) + mirror(1) + 3 tripod legs + secondary(1) = 6
    expect(meshCount).toBe(6);
  });

  it('constellation builders all produce identical mesh counts (visually equivalent)', () => {
    const counts = new Set<number>();
    for (const id of ['gps', 'galileo', 'glonass', 'beidou']) {
      const g = buildSatelliteModel(id, '#4466ff');
      let meshCount = 0;
      g.traverse((obj) => {
        if (obj instanceof THREE.Mesh) meshCount++;
      });
      counts.add(meshCount);
    }
    expect(counts.size).toBe(1);
  });
});
