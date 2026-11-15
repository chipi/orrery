import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { VARIANT_FAMILY, type PadSpec, type PadVariant } from '$lib/launches/pad-family';
import { buildPad, padTowerHeightM } from './launch-pads';

const VEH_LEN = 1.2;
/** A representative vehicle height (m) per variant, for the true-scale check. */
const VEH_M: Record<PadVariant, number> = {
  'apollo-lut': 363 * 0.3048,
  shuttle: 56,
  sls: 98,
  soyuz: 46,
  proton: 58,
  'f9-39a': 70,
  'f9-cat': 70,
  'f9-te': 70,
  starbase: 121,
  'atlas-v': 58,
  'cape-classic': 60,
  'kourou-a5': 52,
  'kourou-a6': 63,
  'chinese-fst': 57,
  tanegashima: 53,
  sriharikota: 44,
};
const SITE: Partial<Record<PadVariant, string>> = {
  'chinese-fst': 'wenchang-lc-101',
};
const spec = (variant: PadVariant): PadSpec => ({
  family: VARIANT_FAMILY[variant],
  variant,
  siteId: SITE[variant] ?? 'x',
});
const variants = Object.keys(VEH_M) as PadVariant[];

function towerHeightM(variant: PadVariant): number {
  const b = buildPad(spec(variant), VEH_M[variant], VEH_LEN);
  b.group.updateMatrixWorld(true);
  const tower = b.group.getObjectByName('pad-tower');
  expect(tower, `${variant} has a pad-tower`).toBeTruthy();
  const box = new THREE.Box3().setFromObject(tower as THREE.Object3D);
  b.dispose();
  return box.max.y / (VEH_LEN / VEH_M[variant]);
}

describe('pad builders (G4)', () => {
  it.each(variants)('%s: meshes present, parts few enough to draw cheaply', (v) => {
    const b = buildPad(spec(v), VEH_M[v], VEH_LEN);
    let meshes = 0;
    b.group.traverse((o) => {
      if (o instanceof THREE.Mesh) meshes++;
    });
    expect(meshes).toBeGreaterThan(2);
    expect(meshes).toBeLessThan(60);
    b.dispose();
  });

  it.each(variants)(
    '%s: main tower height is within 10% of the table, against the vehicle',
    (v) => {
      const want = padTowerHeightM(spec(v), VEH_M[v]);
      const got = towerHeightM(v);
      expect(got / want).toBeGreaterThan(0.9);
      expect(got / want).toBeLessThan(1.1);
    },
  );

  it('the LUT is 380 ft and the Saturn V 363 ft: the tower stands 1.05 times the vehicle', () => {
    expect(towerHeightM('apollo-lut') / VEH_M['apollo-lut']).toBeGreaterThan(0.95);
    expect(towerHeightM('apollo-lut') / VEH_M['apollo-lut']).toBeLessThan(1.15);
  });

  it('a vehicle-relative tower keeps its height against the drawn vehicle, whatever the vehicle', () => {
    const a = buildPad(spec('soyuz'), 46, VEH_LEN);
    const b = buildPad(spec('soyuz'), 92, VEH_LEN);
    const ha = new THREE.Box3().setFromObject(a.group).max.y;
    const hb = new THREE.Box3().setFromObject(b.group).max.y;
    expect(Math.abs(ha - hb)).toBeLessThan(ha * 0.02); // same scene height: the scale is metres per vehicle
    a.dispose();
    b.dispose();
  });

  it('Soviet support arms hold the stack before T+0 and have fallen away after', () => {
    const b = buildPad(spec('soyuz'), 46, VEH_LEN);
    const tops = (t: number): number => {
      b.update(t);
      b.group.updateMatrixWorld(true);
      let maxY = 0;
      b.group.traverse((o) => {
        // a moving arm group carries a position at the pad's ring and a quaternion
        if (o instanceof THREE.Group && o !== b.group && o.position.y === 0 && o.children.length) {
          const bx = new THREE.Box3().setFromObject(o);
          if (o.position.length() > 0.001 && bx.max.y > 0.01) maxY = Math.max(maxY, bx.max.y);
        }
      });
      return maxY;
    };
    const before = tops(-3);
    const after = tops(6);
    expect(before).toBeGreaterThan(0.3 * VEH_LEN * 0.5);
    expect(after).toBeLessThan(before * 0.5);
    b.dispose();
  });

  it('the Falcon strongback leans 1.5 degrees before liftoff and 45 degrees after', () => {
    const b = buildPad(spec('f9-te'), 70, VEH_LEN);
    const sb = b.group.getObjectByName('pad-tower') as THREE.Object3D;
    b.update(-5);
    expect(Math.abs(sb.rotation.z) * (180 / Math.PI)).toBeCloseTo(1.5, 1);
    b.update(6);
    expect(Math.abs(sb.rotation.z) * (180 / Math.PI)).toBeCloseTo(45, 0);
    b.dispose();
  });

  it('LUT swing arms are folded at T-5 and open at T+3', () => {
    const b = buildPad(spec('apollo-lut'), VEH_M['apollo-lut'], VEH_LEN);
    const hinges: THREE.Group[] = [];
    b.group.traverse((o) => {
      if (o instanceof THREE.Group && o !== b.group && o.name === '' && o.position.y > 1)
        hinges.push(o);
    });
    expect(hinges.length).toBeGreaterThanOrEqual(8);
    b.update(-5);
    expect(hinges[0].rotation.y).toBe(0);
    b.update(3);
    expect(hinges[0].rotation.y).toBeGreaterThan(1.3);
    b.dispose();
  });
});
