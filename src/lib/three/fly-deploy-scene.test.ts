import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import {
  expandDeployProfile,
  type DeployProfile,
  type DeployProfileRaw,
} from '$lib/fly/deploy-profile';
import {
  DT,
  beatAt,
  beatsFor,
  createFlyDeploy,
  deployEnd,
  deployPose,
  metAt,
  metIsEstimate,
} from './fly-deploy-scene';
import { buildOrbiterOpenable } from './showcase/winged';
import { buildIusStack } from './showcase/ius';

const load = (id: string): DeployProfile =>
  expandDeployProfile(
    JSON.parse(
      readFileSync(resolve(__dirname, `../../../static/data/deploy-profiles/${id}.json`), 'utf-8'),
    ) as DeployProfileRaw,
  );
const IDS = ['galileo', 'magellan', 'ulysses'];

describe('deploy scene clock and pose (W10)', () => {
  for (const id of IDS) {
    const p = load(id);
    it(`${id}: the HUD clock passes through the sourced times and never runs back`, () => {
      expect(metAt(DT.release, p)).toBeCloseTo(p.releaseS, 6);
      expect(metAt(DT.separation, p)).toBeCloseTo(p.sepBurnsS[0], 6);
      expect(metAt(DT.stage1, p)).toBeCloseTo(p.stage1S, 6);
      expect(metAt(DT.stage2, p)).toBeCloseTo(p.stage2S, 6);
      if (p.pamSS !== undefined) expect(metAt(DT.pamS, p)).toBeCloseTo(p.pamSS, 6);
      let prev = -Infinity;
      for (let t = 0; t <= deployEnd(p); t += 0.25) {
        const m = metAt(t, p);
        expect(m).toBeGreaterThan(prev);
        prev = m;
      }
      expect(metIsEstimate(DT.release - 0.01)).toBe(true);
      expect(metIsEstimate(DT.release)).toBe(false);
    });

    it(`${id}: tilts to 29 deg, then the deployment angle, and lowers the table after release`, () => {
      const deploy = p.tilt[p.tilt.length - 1].deg;
      expect(deployPose(DT.tiltEnd + 1, p).stackDeg).toBeCloseTo(29, 6);
      expect(deployPose(DT.deployAngleEnd + 0.5, p).stackDeg).toBeCloseTo(deploy, 6);
      const later = deployPose(DT.coast, p);
      expect(later.stackDeg).toBe(deploy);
      expect(later.tableDeg).toBeCloseTo(p.tableLowerDeg, 6);
      expect(deployPose(DT.doors - 0.1, p).doors).toBe(0);
      expect(deployPose(DT.doorsEnd, p).doors).toBe(1);
    });

    it(`${id}: the stack drifts at the spring speed over the real seconds since release`, () => {
      const pose = deployPose(DT.separation, p);
      expect(pose.stackOutM).toBeCloseTo(p.springMs * (p.sepBurnsS[0] - p.releaseS), 6);
      expect(deployPose(DT.release - 0.01, p).stackOutM).toBe(0);
    });

    it(`${id}: the orbiter backs away at the burn's delta-v, and the burns light in order`, () => {
      expect(deployPose(DT.separation - 0.01, p).orbiterBackM).toBe(0);
      const sep = p.sepBurns[0];
      if (sep.dvFts) {
        const a = deployPose(DT.coast, p);
        const b = deployPose(DT.stage1, p);
        const v = (b.orbiterBackM - a.orbiterBackM) / (b.met - a.met);
        expect(v).toBeCloseTo(sep.dvFts * 0.3048, 6);
      }
      expect(deployPose((DT.separation + DT.separationEnd) / 2, p).burn).toBe('sep');
      expect(deployPose((DT.stage1 + DT.stage1End) / 2, p).burn).toBe('stage1');
      expect(deployPose((DT.stage2 + DT.stage2End) / 2, p).burn).toBe('stage2');
      expect(deployPose(DT.coast, p).burn).toBeNull();
    });

    it(`${id}: the pose is a pure function of scene time (a scrub equals play)`, () => {
      const a = deployPose(37.3, p);
      deployPose(5, p);
      expect(deployPose(37.3, p)).toEqual(a);
    });
  }

  it('Ulysses alone spins up and fires the PAM-S', () => {
    const u = load('ulysses');
    expect(beatsFor(u).map((b) => b.id)).toContain('pamS');
    expect(beatsFor(load('galileo')).map((b) => b.id)).not.toContain('spin');
    const spun = deployPose(DT.pamS, u);
    expect(spun.spinRad).toBeGreaterThan(0);
    expect(deployPose((DT.pamS + DT.pamSEnd) / 2, u).burn).toBe('pamS');
    expect(beatAt(DT.pamS + 1, u)).toBe('pamS');
    expect(deployEnd(u)).toBeGreaterThan(deployEnd(load('galileo')));
  });
});

describe('deploy scene framing', () => {
  for (const id of IDS) {
    const p = load(id);
    const payload = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2));
    payload.geometry.translate(0, 2, 0);
    const d = createFlyDeploy(p, {
      orbiter: buildOrbiterOpenable(),
      ius: buildIusStack({ payload, pamS: !!p.upperStage.pamS }),
    });
    for (const [w, h] of [
      [1280, 800],
      [390, 844],
    ]) {
      it(`${id} at ${w}x${h}: the subject of each beat is in frame`, () => {
        const shotStarts = [DT.doors, DT.tilt, DT.release, DT.separation, DT.coast];
        for (let t = 0; t <= d.end; t += 0.5) {
          const pose = d.update(t, w / h);
          d.scene.updateMatrixWorld(true);
          d.camera.updateMatrixWorld(true);
          // Skip the 1.6 s eases between shots: the camera is panning to the next subject.
          if (shotStarts.some((s0) => t >= s0 && t < s0 + 1.6)) continue;
          const centre = (o: THREE.Object3D) =>
            new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
          const subject =
            t < DT.release
              ? d.rig.orbiterCentre
              : t >= DT.separation && t < DT.coast
                ? centre(d.parts.orbiter)
                : t >= DT.stage1End
                  ? centre(payload)
                  : centre(d.parts.stack);
          const ndc = subject.clone().project(d.camera);
          expect(Math.abs(ndc.x), `${id} t=${t} ${pose.beat} x`).toBeLessThan(0.95);
          expect(Math.abs(ndc.y), `${id} t=${t} ${pose.beat} y`).toBeLessThan(0.95);
          expect(ndc.z, `${id} t=${t} in front`).toBeLessThan(1);
        }
      });
    }
  }
});
