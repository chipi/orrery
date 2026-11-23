// @vitest-environment jsdom
import * as THREE from 'three';
import { describe, it, expect } from 'vitest';
import {
  detailedDescentLander,
  detailedReturnCapsule,
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
