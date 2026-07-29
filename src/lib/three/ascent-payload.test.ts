import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildGenericPayload, deployPayload, buildPayload } from './ascent-scene';

// Issue #2 — the generic bus rides stowed (wings folded ±90°, antenna folded down)
// while attached, then swings its panels flat and its antenna upright (all → 0°)
// and blooms to full scale as it separates at SECO.
describe('deployPayload', () => {
  const nodes = (g: THREE.Group): THREE.Object3D[] => {
    const out: THREE.Object3D[] = [];
    g.traverse((o) => {
      if (o.userData?.deploy) out.push(o);
    });
    return out;
  };

  it('generic payload has deployable wings + antenna, all folding flat to 0', () => {
    const g = buildGenericPayload();
    const ns = nodes(g);
    expect(ns.length).toBeGreaterThanOrEqual(3); // 2 solar wings + 1 antenna
    expect(ns.every((o) => o.userData.deploy.open === 0)).toBe(true);
    expect(ns.every((o) => o.userData.deploy.closed !== 0)).toBe(true);
    // the two solar wings fold symmetrically ±90°
    const wings = ns
      .map((o) => o.userData.deploy.closed)
      .filter((c) => Math.abs(Math.abs(c) - Math.PI / 2) < 1e-9);
    expect(wings.sort((a, b) => a - b)).toEqual([-Math.PI / 2, Math.PI / 2]);
  });

  it('dp=0 keeps every element folded to its stowed angle, bus shrunk', () => {
    const g = buildGenericPayload();
    const ns = nodes(g);
    deployPayload(g, 0);
    expect(ns.every((o) => Math.abs(o.rotation.z - o.userData.deploy.closed) < 1e-9)).toBe(true);
    expect(g.scale.x).toBeCloseTo(0.82, 5);
  });

  it('dp=1 swings every element flat and blooms to full scale', () => {
    const g = buildGenericPayload();
    const ns = nodes(g);
    deployPayload(g, 1);
    expect(ns.every((o) => Math.abs(o.rotation.z) < 1e-9)).toBe(true);
    expect(g.scale.x).toBeCloseTo(1, 5);
  });

  it('lerps monotonically to the midpoint and clamps out of range', () => {
    const g = buildGenericPayload();
    const ns = nodes(g);
    deployPayload(g, 0.5);
    expect(ns.every((o) => Math.abs(o.rotation.z - o.userData.deploy.closed * 0.5) < 1e-9)).toBe(
      true,
    );
    expect(g.scale.x).toBeCloseTo(0.91, 5);
    deployPayload(g, 2); // clamped to 1 — no overshoot past fully deployed
    expect(ns.every((o) => Math.abs(o.rotation.z) < 1e-9)).toBe(true);
    expect(g.scale.x).toBeCloseTo(1, 5);
  });
});

// The ascent payload resolves per mission: crewed flights get their bespoke
// capsule (tagged isCapsule so the scene rides it exposed), probes get their
// dedicated model, everything else the generic bus.
describe('buildPayload', () => {
  const hasMesh = (g: THREE.Group): boolean => {
    let found = false;
    g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) found = true;
    });
    return found;
  };

  it('crewed mission → capsule, tagged isCapsule for the exposed-ride path', () => {
    const mercury = buildPayload('friendship-7', 1.2); // Atlas / Mercury
    expect(mercury.userData.isCapsule).toBe(true);
    expect(hasMesh(mercury)).toBe(true);
    const apollo = buildPayload('apollo7', 1.2); // Saturn IB / Apollo CM
    expect(apollo.userData.isCapsule).toBe(true);
    const dragon = buildPayload('inspiration4', 1.2); // Falcon 9 / Crew Dragon
    expect(dragon.userData.isCapsule).toBe(true);
  });

  it('interplanetary probe → dedicated model, NOT tagged a capsule', () => {
    const nh = buildPayload('new-horizons', 1.2);
    expect(nh.userData.isCapsule).toBeUndefined();
    expect(hasMesh(nh)).toBe(true);
  });

  it('unknown / satellite mission → generic bus, NOT a capsule', () => {
    const generic = buildPayload('lro', 1.2); // no capsule, no dedicated probe
    expect(generic.userData.isCapsule).toBeUndefined();
    const none = buildPayload(undefined, 1.2);
    expect(none.userData.isCapsule).toBeUndefined();
  });
});
