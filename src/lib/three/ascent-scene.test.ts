// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { recoveredParts, stageDropRotation } from './ascent-scene';
import { recoveryFor, type LaunchProfile } from '$lib/physics/ascent/ascent-physics';

const load = (id: string): LaunchProfile =>
  JSON.parse(
    readFileSync(resolve(__dirname, `../../../static/data/launch-profiles/${id}.json`), 'utf-8'),
  );

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

  it('what lands is per flight (0.9.11 F2): Hera and Europa Clipper expend theirs', () => {
    const at = (id: string, mission?: string) => recoveredParts(recoveryFor(load(id), mission));
    expect(at('falcon-9', 'dart')).toEqual({ booster: true, strapOns: false });
    expect(at('falcon-9', 'hera')).toEqual({ booster: false, strapOns: false });
    expect(at('falcon-heavy', 'psyche-mission')).toEqual({ booster: false, strapOns: true });
    expect(at('falcon-heavy', 'europa-clipper')).toEqual({ booster: false, strapOns: false });
    expect(at('new-glenn', 'blue-moon-mk1')).toEqual({ booster: true, strapOns: false });
    expect(at('starship', 'starship-demo')).toEqual({ booster: true, strapOns: false });
    expect(at('atlas-v')).toEqual({ booster: false, strapOns: false });
  });
});
