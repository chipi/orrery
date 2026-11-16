// @vitest-environment jsdom
// Nova-C (IM-1), Mars Reconnaissance Orbiter and Mariner 2: each model is present and its drawn
// size is within 10% of the published dimension it was built from (see the builders' doc comments).
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  buildMariner2,
  buildMro,
  MARINER_2_HEIGHT_M,
  MARINER_2_SPAN_M,
  MRO_ARRAY_M,
  MRO_DISH_M,
  MRO_HIRISE_M,
  MRO_SHARAD_M,
} from './showcase/orbiters';
import { buildNovaC, NOVA_C_HEIGHT_M, NOVA_C_WIDTH_M } from './showcase/landers';

const within = (got: number, want: number, tol = 0.1): void => {
  expect(Math.abs(got - want) / want, `${got} vs ${want}`).toBeLessThanOrEqual(tol);
};
const sizeOf = (o: THREE.Object3D): THREE.Vector3 =>
  new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
const meshes = (o: THREE.Object3D): THREE.Mesh[] => {
  const out: THREE.Mesh[] = [];
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) out.push(c as THREE.Mesh);
  });
  return out;
};
const cylinders = (o: THREE.Object3D): THREE.CylinderGeometry[] =>
  meshes(o)
    .map((m) => m.geometry)
    .filter((g): g is THREE.CylinderGeometry => g instanceof THREE.CylinderGeometry);

describe('Nova-C (IM-1 Odysseus)', () => {
  const g = buildNovaC();
  it('has meshes and stands on its feet', () => {
    expect(meshes(g).length).toBeGreaterThan(20);
    expect(Math.abs(new THREE.Box3().setFromObject(g).min.y)).toBeLessThan(0.05);
  });
  it('is 4.3 m tall and 1.57 m wide across the hexagonal body', () => {
    within(sizeOf(g).y, NOVA_C_HEIGHT_M);
    const hex = cylinders(g)
      .filter((c) => c.parameters.radialSegments === 6)
      .map((c) => c.parameters.radiusTop * 2);
    within(Math.min(...hex.filter((d) => d > 1.5)), NOVA_C_WIDTH_M, 0.02);
  });
  it('has six landing legs and three solar panels', () => {
    const pads = cylinders(g).filter((c) => c.parameters.height === 0.05);
    expect(pads.length).toBe(6);
    const panels: THREE.Object3D[] = [];
    g.traverse((o) => {
      if (o.userData.solarArray) panels.push(o);
    });
    expect(panels.length).toBe(3);
  });
});

describe('Mars Reconnaissance Orbiter', () => {
  const g = buildMro();
  it('has meshes and rests on y = 0', () => {
    expect(meshes(g).length).toBeGreaterThan(40);
    expect(Math.abs(new THREE.Box3().setFromObject(g).min.y)).toBeLessThan(0.05);
  });
  it('draws two 5.35 x 2.53 m solar arrays', () => {
    const rows: THREE.Object3D[] = [];
    g.traverse((o) => {
      if (o.userData.solarArray) rows.push(o);
    });
    expect(rows.length).toBe(2);
    for (const r of rows) {
      const s = sizeOf(r);
      within(s.x, MRO_ARRAY_M.len);
      within(s.y, MRO_ARRAY_M.wid);
    }
  });
  it('carries a 3 m dish, a 10 m SHARAD dipole and the 1.6 x 0.9 m HiRISE barrel', () => {
    const rim = meshes(g)
      .map((m) => m.geometry)
      .filter((x): x is THREE.TorusGeometry => x instanceof THREE.TorusGeometry)
      .map((t) => t.parameters.radius * 2);
    within(Math.max(...rim), MRO_DISH_M);
    let sharad: THREE.Object3D | undefined;
    let hirise: THREE.Object3D | undefined;
    g.traverse((o) => {
      if (o.userData.sharad) sharad = o;
      if (o.userData.hirise) hirise = o;
    });
    within(sizeOf(sharad!).x, MRO_SHARAD_M);
    const barrel = cylinders(hirise!)[0];
    within(barrel.parameters.height, MRO_HIRISE_M.len, 0.01);
    within(barrel.parameters.radiusTop * 2, MRO_HIRISE_M.dia, 0.01);
  });
});

describe('Mariner 2', () => {
  const g = buildMariner2();
  it('has meshes and rests on y = 0', () => {
    expect(meshes(g).length).toBeGreaterThan(30);
    expect(Math.abs(new THREE.Box3().setFromObject(g).min.y)).toBeLessThan(0.05);
  });
  it('is 3.66 m tall with a 5.05 m panel span', () => {
    const s = sizeOf(g);
    within(s.y, MARINER_2_HEIGHT_M);
    within(s.x, MARINER_2_SPAN_M);
  });
  it('has a 1.04 m hexagonal bus and two panels, 183 and 152 cm long', () => {
    const hex = cylinders(g).filter((c) => c.parameters.radialSegments === 6);
    within(Math.max(...hex.map((c) => c.parameters.radiusTop * 2)), 1.04, 0.02);
    const rows: THREE.Object3D[] = [];
    g.traverse((o) => {
      if (o.userData.solarArray) rows.push(o);
    });
    expect(rows.map((r) => sizeOf(r).x).sort((a, b) => a - b)).toHaveLength(2);
    const lens = rows.map((r) => sizeOf(r).x).sort((a, b) => a - b);
    within(lens[0], 1.52);
    within(lens[1], 1.83);
  });
});
