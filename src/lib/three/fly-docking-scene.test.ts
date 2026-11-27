// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import {
  expandDockingProfile,
  isValidDockingProfile,
  type DockingProfile,
  type DockingProfileRaw,
} from '$lib/fly/docking-profile';
import { parseGet } from '$lib/fly/return-profile';
import {
  createFlyDocking,
  dockingBeatsFor,
  dockingEnd,
  dockingMetAt,
  dockingMetIsEstimate,
  dockingSteps,
} from './fly-docking-scene';
import { buildIssProxyStation, buildIssVisitor } from '$lib/iss-proxy-model';
import { ISS_DOCK_EVENTS, ISS_TRUSS_PHASES } from '$lib/iss-assembly-phases';
import { SHOWCASE } from './showcase/capsules-commercial';

const root = resolve(__dirname, '../../..');
const json = (p: string): unknown => JSON.parse(readFileSync(resolve(root, p), 'utf-8'));
const raw = json('static/data/docking-profiles/crew-dragon-demo-2.json') as DockingProfileRaw;
const p: DockingProfile = expandDockingProfile(raw);
const step = (ph: string) => dockingSteps().find((s) => s.phase === ph)!;

function epochs(): Map<string, number> {
  const m = new Map<string, number>();
  const rows = [
    ...(json('static/data/iss-modules.json') as { id: string; launch_date?: string }[]),
    ...(json('static/data/iss-visitors.json') as { id: string; launch_date?: string }[]),
    ...ISS_DOCK_EVENTS,
    ...ISS_TRUSS_PHASES,
  ];
  for (const r of rows) if (r.launch_date) m.set(r.id, Date.parse(r.launch_date));
  return m;
}

const build = () =>
  createFlyDocking(
    p,
    {
      station: buildIssProxyStation(),
      chaser: SHOWCASE['crew-dragon'].build(),
      visitor: buildIssVisitor,
    },
    { epochs: epochs() },
  );

describe('the docking profile (W9)', () => {
  it('Demo-2 validates, and a capture before the burn ends does not', () => {
    expect(isValidDockingProfile(raw)).toBe(true);
    expect(isValidDockingProfile({ ...raw, captureMet: '16:48:30.0' })).toBe(false);
    expect(isValidDockingProfile({ ...raw, hardDockMet: raw.captureMet })).toBe(false);
    const outward = [...raw.holds].reverse();
    expect(isValidDockingProfile({ ...raw, holds: outward })).toBe(false);
  });

  it('the METs are the sourced UTC times less the launch', () => {
    const l = Date.parse(raw.launchZeroUtc);
    const met = (utc: string) => (Date.parse(utc) - l) / 1000;
    expect(parseGet(raw.lastBurn.met)).toBe(met('2020-05-31T12:11:00Z'));
    expect(p.captureS).toBe(met('2020-05-31T14:16:00Z'));
    expect(p.hardDockS).toBe(met('2020-05-31T14:27:00Z'));
  });
});

describe('the docking: clock and beats', () => {
  it('passes through the sourced times, never runs back, and marks estimates', () => {
    expect(dockingMetAt(step('burn').t0, p)).toBeCloseTo(p.lastBurnS, 6);
    expect(dockingMetAt(step('capture').t0, p)).toBeCloseTo(p.captureS, 6);
    expect(dockingMetAt(step('retract').t1, p)).toBeCloseTo(p.hardDockS, 6);
    let prev = -Infinity;
    for (let t = 0; t <= dockingEnd(); t += 0.25) {
      const m = dockingMetAt(t, p);
      expect(m).toBeGreaterThan(prev);
      prev = m;
    }
    expect(dockingMetIsEstimate(step('toWp1').t0 + 1)).toBe(true);
    expect(dockingMetIsEstimate(step('burn').t0 + 1)).toBe(false);
    expect(dockingMetIsEstimate(step('retract').t0 + 1)).toBe(false);
  });

  it('plays the waypoints, the hold, contact and the hard capture in order', () => {
    expect(dockingBeatsFor().map((b) => b.id)).toEqual([
      'establish',
      'burn',
      'wp0',
      'wp1',
      'wp2',
      'hold',
      'final',
      'capture',
      'hardDock',
    ]);
  });
});

describe('the docking: geometry', () => {
  const d = build();
  const ring = () => {
    d.scene.updateMatrixWorld(true);
    const port = d.parts.chaser.getObjectByName('docking-port')!;
    return port.getWorldPosition(new THREE.Vector3());
  };
  const stationPort = () => d.parts.port.getWorldPosition(new THREE.Vector3());

  it('the station is drawn as of 31 May 2020', () => {
    const s = d.parts.station;
    const vis = (name: string) => {
      let o: THREE.Object3D | null = s.getObjectByName(name) ?? null;
      while (o) {
        if (!o.visible) return false;
        o = o.parent;
      }
      return true;
    };
    expect(vis('pma2')).toBe(false);
    let nauka = 0;
    let dock = 0;
    s.traverse((o) => {
      if (o.userData.moduleId === 'nauka' && o.visible) nauka++;
      if (String(o.userData.animModuleId ?? '').startsWith('dock-') && o.visible) dock++;
    });
    expect(nauka).toBe(0);
    expect(dock).toBe(0);
    let harmony = 0;
    s.traverse((o) => {
      if (o.userData.moduleId === 'harmony' && o.visible) harmony++;
    });
    expect(harmony).toBeGreaterThan(0);
    // the ships docked that day on their ports: Soyuz MS-16 above Poisk, Progress 74 below Pirs,
    // Progress 75 behind Zvezda's aft end
    const at = (port: string) =>
      new THREE.Box3()
        .setFromObject(s.getObjectByName(`neighbour-${port}`)!)
        .getCenter(new THREE.Vector3());
    const zvezda = -2.58 * 12.7;
    expect(at('poisk-zenith').y).toBeGreaterThan(8);
    expect(at('pirs-nadir').y).toBeLessThan(-8);
    expect(at('zvezda-aft').x).toBeLessThan(zvezda - 8);
    expect(vis('pirs-2020')).toBe(true);
  });

  it('the rings meet at contact, the waypoints sit at their ranges, the ring retracts', () => {
    d.update(step('capture').t0, 16 / 9);
    expect(ring().distanceTo(stationPort())).toBeLessThan(0.02);
    d.update(step('toWp2').t1, 16 / 9);
    expect(ring().distanceTo(stationPort())).toBeCloseTo(20, 1);
    d.update(step('toWp1').t1, 16 / 9);
    expect(ring().distanceTo(stationPort())).toBeCloseTo(220, 0);
    d.update(step('toWp0').t1, 16 / 9);
    // WP0 400 m below the station's centre line
    expect(stationPort().y - ring().y).toBeCloseTo(400, 0);
    d.update(dockingEnd(), 16 / 9);
    expect(stationPort().x - ring().x).toBeCloseTo(0.3, 3);
  });

  it('the capsule stays clear of the station until it touches the port', () => {
    const body = new THREE.Box3();
    const station = new THREE.Box3().setFromObject(d.parts.station);
    for (let t = 0; t < step('capture').t0; t += 0.5) {
      d.update(t, 16 / 9);
      d.scene.updateMatrixWorld(true);
      body.makeEmpty();
      d.parts.chaser.traverse((o) => {
        let a: THREE.Object3D | null = o;
        while (a && a.name !== 'nose-cone') a = a.parent;
        if (!a && (o as THREE.Mesh).isMesh) body.expandByObject(o, true);
      });
      const nose = new THREE.Box3().setFromObject(d.parts.chaser.getObjectByName('nose-cone')!);
      // the open nose cone stands beside the port, clear of PMA-2 and IDA-2 with its targets
      const sp = stationPort();
      const adapters = new THREE.Box3(
        new THREE.Vector3(sp.x - 3, sp.y - 0.95, sp.z - 1.3),
        new THREE.Vector3(sp.x, sp.y + 0.95, sp.z + 1.3),
      );
      expect(nose.intersectsBox(adapters), `t=${t} nose`).toBe(false);
      if (t < step('toWp1').t1) {
        expect(body.intersectsBox(station), `t=${t}`).toBe(false);
      } else {
        // on the axis ahead: the ring and its guide petals are the capsule's front (the petals
        // reach past the ring face, as the station's do, and mesh with them), the rest behind
        expect(body.min.x, `t=${t}`).toBeGreaterThan(stationPort().x - 0.35);
      }
    }
  });
});

describe('the docking: framing', () => {
  const d = build();
  const eases = dockingSteps().map((s) => s.t0);
  for (const [w, h] of [
    [1280, 800],
    [390, 844],
  ]) {
    it(`at ${w}x${h}: the craft is in frame, and the port once it is near`, () => {
      for (let t = 0; t <= d.end; t += 0.5) {
        const pose = d.update(t, w / h);
        d.scene.updateMatrixWorld(true);
        d.camera.updateMatrixWorld(true);
        if (eases.some((s0) => t >= s0 && t < s0 + 1.8)) continue;
        const c = new THREE.Box3().setFromObject(d.parts.chaser).getCenter(new THREE.Vector3());
        const subjects = [c];
        if (pose.rangeM < 60) subjects.push(d.parts.port.getWorldPosition(new THREE.Vector3()));
        for (const s of subjects) {
          const ndc = s.clone().project(d.camera);
          expect(Math.abs(ndc.x), `t=${t} ${pose.beat} x`).toBeLessThan(0.9);
          expect(Math.abs(ndc.y), `t=${t} ${pose.beat} y`).toBeLessThan(0.9);
          expect(ndc.z, `t=${t} in front`).toBeLessThan(1);
        }
      }
    });
  }
});
