// @vitest-environment jsdom
import * as THREE from 'three';
import { describe, it, expect } from 'vitest';
import {
  detailedDescentLander,
  detailedReturnCapsule,
  LM_PROBE_LENGTH_M,
  preloadDescentModels,
} from './descent-landers';

describe('descent models load on demand', () => {
  it('answer null before the preload, the central model after it', async () => {
    const tier0 = new THREE.Group().add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));
    expect(detailedDescentLander('apollo11', tier0)).toBeNull();
    expect(detailedReturnCapsule('mercury', tier0)).toBeNull();

    await preloadDescentModels();
    expect(detailedDescentLander('apollo11', tier0)?.userData.metresToScene).toBeGreaterThan(0);
    expect(detailedReturnCapsule('mercury', tier0)?.userData.metresToScene).toBeGreaterThan(0);
  });
});

describe("the Apollo LM's contact probes", () => {
  it('hang 1.7 m under three footpads, fly only, and reach the surface at the contact light', async () => {
    await preloadDescentModels();
    const tier0 = new THREE.Group().add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));
    const holder = detailedDescentLander('apollo17', tier0)!;
    const probes = holder.children.find((c) => c.userData.flightOnly);
    expect(probes?.children).toHaveLength(3);
    const k = holder.userData.metresToScene as number;
    const box = new THREE.Box3().setFromObject(probes!);
    // The pads stand on the surface: the probe tips are LM_PROBE_LENGTH_M below the ground line.
    const craft = holder.children.find((c) => !c.userData.flightOnly && !c.userData.surfaceOnly)!;
    expect(craft.position.y - box.min.y).toBeCloseTo(LM_PROBE_LENGTH_M * k, 3);
    expect(holder.userData.surfaceOnly).toBeUndefined();
  });
});
