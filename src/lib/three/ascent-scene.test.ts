// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { stageDropRotation } from './ascent-scene';
import { buildLauncherModel } from './launcher-models';

/** The world direction of a dropped stage's body axis (+Y, nose up) at drop progress `p`. */
function bodyAxis(p: number, fromVertical: number, recovered: boolean): THREE.Vector3 {
  const vehicle = new THREE.Group();
  vehicle.rotation.z = -fromVertical; // as setState orients the vehicle along its thrust
  const stage = new THREE.Group();
  stage.rotation.set(...stageDropRotation(p, fromVertical, recovered));
  vehicle.add(stage);
  vehicle.updateMatrixWorld(true);
  return new THREE.Vector3(0, 1, 0).applyQuaternion(
    stage.getWorldQuaternion(new THREE.Quaternion()),
  );
}

describe('a booster that lands drops away upright, tail-down (operator 2026-11-19)', () => {
  it('ends with its body axis straight up in the world, whatever the vehicle pitch', () => {
    for (const deg of [20, 55, 80]) {
      const up = bodyAxis(1, (deg * Math.PI) / 180, true);
      expect(up.y).toBeCloseTo(1, 6);
    }
  });

  it('a spent stage still tumbles off the vertical', () => {
    expect(bodyAxis(1, (55 * Math.PI) / 180, false).y).toBeLessThan(0.9);
  });

  it('the reusable vehicles are the ones that land: Falcon 9, Falcon Heavy side boosters, New Glenn, Super Heavy', () => {
    expect(buildLauncherModel('falcon-9', 1).recovered).toEqual({ booster: true });
    expect(buildLauncherModel('falcon-heavy', 1).recovered).toEqual({ strapOns: true });
    expect(buildLauncherModel('new-glenn', 1).recovered).toEqual({ booster: true });
    expect(buildLauncherModel('starship', 1).recovered).toEqual({ booster: true });
    expect(buildLauncherModel('atlas-v', 1).recovered).toBeUndefined();
  });
});
