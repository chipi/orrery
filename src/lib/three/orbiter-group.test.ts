// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  applyOrbiterLayerVisibility,
  buildOrbiterGroup,
  tickOrbiterDot,
  type OrbiterMarker,
} from './orbiter-group';

function build(over: Partial<Parameters<typeof buildOrbiterGroup>[0]> = {}): OrbiterMarker {
  return buildOrbiterGroup({
    site: { id: 'lro', name: 'LRO' },
    color: '#4ecdc4',
    ringRadius: 40,
    inclinationRad: 0.5,
    dimmed: false,
    orbitPhase: 1.25,
    ...over,
  });
}

describe('buildOrbiterGroup', () => {
  it('returns the ring, a pickable dot group and a hidden halo under one group', () => {
    const om = build();
    expect(om.siteId).toBe('lro');
    expect(om.ringRadius).toBe(40);
    expect(om.inclinationRad).toBe(0.5);
    expect(om.orbitPhase).toBe(1.25);
    expect(om.group.children).toContain(om.ringMesh);
    expect(om.group.children).toContain(om.dotGroup);
    expect(om.dotGroup.userData.siteId).toBe('lro');
    expect(om.halo?.parent).toBe(om.dotGroup);
    expect(om.halo?.visible).toBe(false);
    // invisible hit sphere carries the id so a raycast hit resolves
    const hits = om.dotGroup.children.filter(
      (c): c is THREE.Mesh =>
        c instanceof THREE.Mesh && !(c.material as THREE.MeshBasicMaterial).visible,
    );
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].userData.siteId).toBe('lro');
  });

  it('lays the ring flat first (pi/2) then tilts by the inclination', () => {
    const om = build({ inclinationRad: 0.5 });
    expect(om.ringMesh.rotation.x).toBeCloseTo(Math.PI / 2 + 0.5, 10);
  });

  it('active orbiters are bright and fast; dimmed ones are faint and slow', () => {
    const active = build({ dimmed: false });
    const dim = build({ dimmed: true });
    const op = (o: OrbiterMarker) => (o.ringMesh.material as THREE.MeshBasicMaterial).opacity;
    expect(op(active)).toBe(0.4);
    expect(op(dim)).toBe(0.2);
    expect(active.orbitSpeed).toBe(0.2);
    expect(dim.orbitSpeed).toBe(0.06);
  });

  it('honours ring-opacity overrides and the model scale', () => {
    const om = build({ activeRingOpacity: 0.18, modelScale: 3 });
    expect((om.ringMesh.material as THREE.MeshBasicMaterial).opacity).toBe(0.18);
    expect(om.dotGroup.scale.x).toBe(3);
    const dim = build({ dimmed: true, dimmedRingOpacity: 0.35 });
    expect((dim.ringMesh.material as THREE.MeshBasicMaterial).opacity).toBe(0.35);
  });

  it('adds a label sprite under the dot group only when asked', () => {
    const countSprites = (o: OrbiterMarker) => {
      let n = 0;
      o.dotGroup.traverse((c) => {
        if (c instanceof THREE.Sprite) n++;
      });
      return n;
    };
    const without = build();
    const withLabel = build({ label: { size: 2 } });
    expect(countSprites(withLabel)).toBe(countSprites(without) + 1);
  });

  it('uses the site id as label text when the site has no name', () => {
    const om = build({ site: { id: 'mro', name: null }, label: {} });
    let lines = 0;
    om.dotGroup.traverse((c) => {
      if (c instanceof THREE.Line) lines++;
    });
    expect(lines).toBeGreaterThanOrEqual(1);
  });
});

describe('tickOrbiterDot', () => {
  it('advances the phase by dt * speed and rides the inclined circle', () => {
    const om = build({ orbitPhase: 0, inclinationRad: 0 });
    tickOrbiterDot(om, 5, false);
    expect(om.orbitPhase).toBeCloseTo(5 * 0.2, 10);
    const a = om.orbitPhase;
    expect(om.dotGroup.position.x).toBeCloseTo(Math.cos(a) * 40, 10);
    expect(om.dotGroup.position.y).toBeCloseTo(0, 10);
    expect(om.dotGroup.position.z).toBeCloseTo(Math.sin(a) * 40, 10);
  });

  it('keeps the dot at ringRadius from the centre for any inclination', () => {
    const om = build({ orbitPhase: 0.7, inclinationRad: 1.2 });
    tickOrbiterDot(om, 1, false);
    expect(om.dotGroup.position.length()).toBeCloseTo(40, 8);
    const a = om.orbitPhase;
    expect(om.dotGroup.position.y).toBeCloseTo(-Math.sin(a) * 40 * Math.sin(1.2), 10);
  });

  it('a polar orbit (90deg) puts the dot in the XY plane', () => {
    const om = build({ orbitPhase: Math.PI / 2, inclinationRad: Math.PI / 2 });
    tickOrbiterDot(om, 0, true);
    expect(om.dotGroup.position.x).toBeCloseTo(0, 8);
    expect(om.dotGroup.position.y).toBeCloseTo(-40, 8);
    expect(om.dotGroup.position.z).toBeCloseTo(0, 8);
  });

  it('reduced motion freezes the phase but still positions the dot', () => {
    const om = build({ orbitPhase: 0, inclinationRad: 0 });
    tickOrbiterDot(om, 100, true);
    expect(om.orbitPhase).toBe(0);
    expect(om.dotGroup.position.x).toBeCloseTo(40, 10);
  });
});

describe('applyOrbiterLayerVisibility', () => {
  it('ORBITERS gates the model, ORBITS gates the ring only while orbiters are shown', () => {
    const om = build();
    applyOrbiterLayerVisibility(om, { showOrbiters: true, showOrbits: true });
    expect([om.dotGroup.visible, om.ringMesh.visible]).toEqual([true, true]);
    applyOrbiterLayerVisibility(om, { showOrbiters: true, showOrbits: false });
    expect([om.dotGroup.visible, om.ringMesh.visible]).toEqual([true, false]);
    applyOrbiterLayerVisibility(om, { showOrbiters: false, showOrbits: true });
    expect([om.dotGroup.visible, om.ringMesh.visible]).toEqual([false, false]);
  });
});
