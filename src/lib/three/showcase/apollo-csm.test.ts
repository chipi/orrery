import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { SHOWCASE as FREIGHTERS } from './station-freighters';
import { SHOWCASE as LM } from './lunar-module';

const csm = (): THREE.Group => FREIGHTERS['apollo-csm-block-ii'].build();
const named = (root: THREE.Object3D, prefix: string): THREE.Object3D[] => {
  const out: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o.name.startsWith(prefix)) out.push(o);
  });
  return out;
};
const world = (o: THREE.Object3D): THREE.Vector3 => o.getWorldPosition(new THREE.Vector3());

describe('Apollo CSM Block II showcase model', () => {
  it('is 11.0 m tall and 3.91 m across, the probe head the highest point on the axis', () => {
    const g = csm();
    g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g);
    expect(box.min.y).toBeCloseTo(0, 1);
    expect(box.max.y).toBeCloseTo(11, 1);
    const tip = world(g.getObjectByName('probe-tip')!);
    expect(tip.y).toBeCloseTo(box.max.y, 1);
    expect(Math.hypot(tip.x, tip.z)).toBeLessThan(1e-6);
    // sector 2 spans 25 to 95 degrees, so it reaches the +x edge of the 3.91 m skin
    const sec = new THREE.Box3().setFromObject(g.getObjectByName('sm-sector-2')!);
    expect(sec.max.x).toBeCloseTo(3.91 / 2, 2);
  });

  it('keeps Block I at its 10.6 m, without a probe', () => {
    const g = FREIGHTERS['apollo-csm-block-i'].build();
    expect(new THREE.Box3().setFromObject(g).max.y).toBeCloseTo(10.6, 1);
    expect(g.getObjectByName('docking-probe')).toBeUndefined();
    expect(g.getObjectByName('descent-module')).toBeDefined();
  });

  it('carries every named part a scene hangs things on', () => {
    const g = csm();
    for (const n of [
      'descent-module',
      'command-module',
      'docking-probe',
      'docking-probe-head',
      'probe-tip',
      'service-module',
      'sps-engine',
      'engine-exit',
      'high-gain-antenna',
      'umbilical-fairing',
      'side-hatch',
      'window-hatch',
    ]) {
      expect(g.getObjectByName(n), n).toBeDefined();
    }
    expect(g.getObjectByName('descent-module')!.getObjectByName('command-module')).toBeDefined();
    expect(named(g, 'sm-sector-')).toHaveLength(6);
    expect(named(g, 'radiator-')).toHaveLength(2);
    expect(named(g, 'scimitar-mount-')).toHaveLength(2);
    expect(named(g, 'hga-dish-')).toHaveLength(4);
    expect(named(g, 'capture-latch-')).toHaveLength(3);
    expect(named(g, 'window-rendezvous-')).toHaveLength(2);
    expect(named(g, 'window-side-')).toHaveLength(2);
    expect(named(g, 'cm-rcs-')).toHaveLength(12);
  });

  it('has four RCS quads of four named nozzles each', () => {
    const g = csm();
    for (let q = 0; q < 4; q++) {
      const quad = g.getObjectByName(`rcs-quad-${q}`)!;
      expect(quad, `rcs-quad-${q}`).toBeDefined();
      for (let n = 0; n < 4; n++) expect(quad.getObjectByName(`rcs-${q}-${n}`)).toBeDefined();
    }
  });

  it('puts the SPS exit plane at y = 0, 2.5 m across, with the exhaust pointing down', () => {
    const g = csm();
    g.updateMatrixWorld(true);
    const exit = g.getObjectByName('engine-exit')!;
    expect(world(exit).y).toBeCloseTo(0, 3);
    const dir = new THREE.Vector3(0, 1, 0).applyQuaternion(
      exit.getWorldQuaternion(new THREE.Quaternion()),
    );
    expect(dir.y).toBeCloseTo(-1, 3);
    const bell = new THREE.Box3().setFromObject(g.getObjectByName('sps-engine')!);
    expect(bell.max.x - bell.min.x).toBeGreaterThan(2.501);
    expect(bell.max.x - bell.min.x).toBeLessThan(2.56); // the exit lip plus its stiffener ring
    expect(bell.max.y - bell.min.y).toBeCloseTo(3.882, 2);
  });

  it('lets the probe be taken off without touching the command module', () => {
    const g = csm();
    g.getObjectByName('docking-probe')!.removeFromParent();
    expect(g.getObjectByName('command-module')).toBeDefined();
    expect(g.getObjectByName('probe-tip')).toBeUndefined();
  });
});

describe('Apollo LM stages and anchors', () => {
  const lm = (): THREE.Group => LM['apollo-lm'].build();

  it('names its stages, RCS quads and anchors', () => {
    const g = lm();
    for (const n of ['ascent-stage', 'descent-stage', 'docking-drogue', 'ascent-engine-exit']) {
      expect(g.getObjectByName(n), n).toBeDefined();
    }
    expect(named(g, 'lm-rcs-quad-')).toHaveLength(4);
    expect(g.getObjectByName('ascent-stage')!.getObjectByName('lm-rcs-quad-0')).toBeDefined();
  });

  it('separates: without the ascent stage the descent stage is intact, and vice versa', () => {
    const g = lm();
    const before = new THREE.Box3().setFromObject(g.getObjectByName('descent-stage')!);
    g.getObjectByName('ascent-stage')!.removeFromParent();
    expect(g.getObjectByName('descent-stage')).toBeDefined();
    const after = new THREE.Box3().setFromObject(g.getObjectByName('descent-stage')!);
    expect(after.min.toArray()).toEqual(before.min.toArray());
    expect(after.max.toArray()).toEqual(before.max.toArray());
    expect(after.max.y).toBeLessThan(new THREE.Box3().setFromObject(g).max.y);
  });

  it('keeps its 7.04 m height', () => {
    const g = lm();
    const box = new THREE.Box3().setFromObject(g);
    expect(box.max.y - box.min.y).toBeCloseTo(7.04, 1);
  });
});

describe('CSM probe on the LM drogue', () => {
  it('seats the probe tip on the drogue anchor with both axes on +y', () => {
    const c = csm();
    const l = LM['apollo-lm'].build();
    // as dockedApolloCsm does: nose down
    c.rotation.x = Math.PI;
    c.updateMatrixWorld(true);
    l.updateMatrixWorld(true);
    const drogue = l.getObjectByName('docking-drogue')!;
    c.position.add(world(drogue).sub(world(c.getObjectByName('probe-tip')!)));
    c.updateMatrixWorld(true);
    expect(world(c.getObjectByName('probe-tip')!).distanceTo(world(drogue))).toBeLessThan(1e-6);
    const up = new THREE.Vector3(0, 1, 0);
    const csmUp = up
      .clone()
      .applyQuaternion(c.getObjectByName('probe-tip')!.getWorldQuaternion(new THREE.Quaternion()));
    expect(csmUp.y).toBeCloseTo(-1, 6);
    // the drogue is on top of the ascent stage's tunnel, above the stage it belongs to
    const asc = new THREE.Box3().setFromObject(l.getObjectByName('ascent-stage')!);
    expect(world(drogue).y).toBeGreaterThan(asc.max.y - 0.6);
    expect(world(drogue).y).toBeLessThanOrEqual(asc.max.y + 1e-6);
  });
});
