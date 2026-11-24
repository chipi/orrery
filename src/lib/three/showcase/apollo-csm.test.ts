import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  SHOWCASE as FREIGHTERS,
  buildApolloCsm,
  type ApolloCsmOptions,
} from './station-freighters';
import { SHOWCASE as ROVERS } from './rovers';
import { SHOWCASE as LM, buildApolloLunarModule, type ApolloLmOptions } from './lunar-module';

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

describe('Apollo J-mission CSM: the open SIM bay', () => {
  const j = (o: ApolloCsmOptions = {}): THREE.Group => buildApolloCsm(true, { simBay: true, ...o });

  it('leaves Apollo 7-14 without a bay, and the J-mission height unchanged', () => {
    expect(csm().getObjectByName('sim-bay')).toBeUndefined();
    const g = j();
    g.updateMatrixWorld(true);
    expect(new THREE.Box3().setFromObject(g).max.y).toBeCloseTo(11, 1);
    expect(g.getObjectByName('sm-sector-1')!.getObjectByName('sim-bay')).toBeDefined();
    expect(named(g, 'sm-sector-')).toHaveLength(6);
  });

  it('opens sector 1 with a recess and Apollo 15/16 instruments inside it', () => {
    const g = j();
    g.updateMatrixWorld(true);
    const bay = g.getObjectByName('sim-bay')!;
    for (const n of [
      'sim-bay-recess',
      'mapping-camera',
      'stellar-camera',
      'laser-altimeter',
      'panoramic-camera',
      'xray-spectrometer',
      'alpha-particle-spectrometer',
      'gamma-ray-boom',
      'gamma-ray-spectrometer',
      'mass-spec-boom',
      'mass-spectrometer',
      'subsatellite-launcher',
      'pfs-subsatellite',
    ]) {
      expect(bay.getObjectByName(n), n).toBeDefined();
    }
    // every instrument sits inside the recess's box (the skin radius 1.955 outward, z)
    const rec = new THREE.Box3().setFromObject(bay.getObjectByName('sim-bay-recess')!);
    for (const n of [
      'mapping-camera',
      'panoramic-camera',
      'laser-altimeter',
      'subsatellite-launcher',
    ]) {
      const b = new THREE.Box3().setFromObject(bay.getObjectByName(n)!);
      expect(b.min.y, n).toBeGreaterThanOrEqual(rec.min.y);
      expect(b.max.y, n).toBeLessThanOrEqual(rec.max.y);
      expect(b.min.z, n).toBeGreaterThanOrEqual(1.0 - 1e-6);
      expect(b.max.z, n).toBeLessThanOrEqual(1.955);
    }
    // the skin is gone: nothing at the sector's centre on the 3.91 m cylinder but the bay's walls
    expect(rec.max.z).toBeLessThan(1.955);
  });

  it('shows the Apollo 17 set instead: sounder and radiometer, no spectrometer booms or subsatellite', () => {
    const bay = j({ mission: 17 }).getObjectByName('sim-bay')!;
    for (const n of [
      'lunar-sounder',
      'infrared-radiometer',
      'uv-spectrometer',
      'panoramic-camera',
    ]) {
      expect(bay.getObjectByName(n), n).toBeDefined();
    }
    for (const n of ['gamma-ray-boom', 'mass-spec-boom', 'pfs-subsatellite']) {
      expect(bay.getObjectByName(n), n).toBeUndefined();
    }
  });

  it('slides the spectrometer booms out to 7.5 m and lets the subsatellite go', () => {
    const g = j();
    const bay = g.getObjectByName('sim-bay')!;
    (bay.userData.setBoomExtension as (a: number, b: number) => void)(1, 0.5);
    g.updateMatrixWorld(true);
    const gr = world(bay.getObjectByName('gamma-ray-spectrometer')!);
    expect(gr.distanceTo(world(bay.getObjectByName('gamma-ray-boom')!))).toBeGreaterThan(7.5);
    const ms = world(bay.getObjectByName('mass-spectrometer')!);
    expect(ms.distanceTo(world(bay.getObjectByName('mass-spec-boom')!))).toBeCloseTo(4.05, 1);
    const before = world(bay.getObjectByName('pfs-subsatellite')!);
    const sat = (bay.userData.releaseSubsatellite as () => THREE.Object3D)();
    expect(sat.parent).toBeNull();
    expect(sat.position.distanceTo(before)).toBeLessThan(1e-6);
    expect(bay.getObjectByName('pfs-subsatellite')).toBeUndefined();
  });

  it('keeps the named anchors of the standard CSM', () => {
    const g = j();
    for (const n of ['probe-tip', 'engine-exit', 'high-gain-antenna', 'umbilical-fairing']) {
      expect(g.getObjectByName(n), n).toBeDefined();
    }
    expect(named(g, 'rcs-quad-')).toHaveLength(4);
  });
});

describe('Apollo J-mission LM and the LRV', () => {
  const lmx = (o: ApolloLmOptions = {}): THREE.Group =>
    buildApolloLunarModule({ extended: true, ...o });

  it('keeps the standard LM anchors, 7.04 m height and adds the LRV bay', () => {
    const g = lmx();
    for (const n of [
      'ascent-stage',
      'descent-stage',
      'docking-drogue',
      'ascent-engine-exit',
      'lrv-bay',
      'lrv-folded',
    ]) {
      expect(g.getObjectByName(n), n).toBeDefined();
    }
    expect(named(g, 'lm-rcs-quad-')).toHaveLength(4);
    const box = new THREE.Box3().setFromObject(g);
    expect(box.max.y - box.min.y).toBeCloseTo(7.04, 1);
    expect(LM['apollo-lm'].build().getObjectByName('lrv-bay')).toBeUndefined();
  });

  it('empties the bay once the rover is driven off, and lengthens the engine bell by 0.25 m', () => {
    expect(lmx({ lrvStowed: false }).getObjectByName('lrv-folded')).toBeUndefined();
    expect(lmx({ lrvStowed: false }).getObjectByName('lrv-bay')).toBeDefined();
    expect(lmx().userData.engineExitY).toBeLessThan(
      buildApolloLunarModule().userData.engineExitY - 0.24,
    );
  });
});

describe('LRV standalone', () => {
  it('stands on the ground and carries the TV camera anchor on its front, lens toward +z', () => {
    const l = ROVERS['lrv-apollo'].build();
    l.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(l);
    expect(box.min.y).toBeCloseTo(0, 3);
    const cam = l.getObjectByName('tv-camera')!;
    expect(cam).toBeDefined();
    const p = world(cam);
    expect(p.z).toBeGreaterThan(box.max.z * 0.7);
    expect(p.y).toBeGreaterThan(0.5);
  });
});
