import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import {
  expandRmsDeployProfile,
  type RmsDeployProfile,
  type RmsDeployProfileRaw,
} from '$lib/fly/deploy-profile';
import {
  createFlyRmsDeploy,
  rmsBeatsFor,
  rmsDeployEnd,
  rmsMetAt,
  rmsMetIsEstimate,
  rmsSteps,
  solveArm,
} from './fly-rms-deploy-scene';
import { buildOrbiterOpenable } from './showcase/winged';
import { buildCompton, buildHubble } from './showcase/observatories';

const load = (id: string): RmsDeployProfile =>
  expandRmsDeployProfile(
    JSON.parse(
      readFileSync(resolve(__dirname, `../../../static/data/deploy-profiles/${id}.json`), 'utf-8'),
    ) as RmsDeployProfileRaw,
  );
const build = (id: string) =>
  createFlyRmsDeploy(load(id), {
    orbiter: buildOrbiterOpenable(),
    payload: (id === 'hubble' ? buildHubble : buildCompton)({ asLaunched: true }),
  });
const stepT = (p: RmsDeployProfile, ph: string) => rmsSteps(p).find((s) => s.phase === ph)!;

describe('the arm release: clock and beats (W10)', () => {
  for (const id of ['hubble', 'compton-gro']) {
    const p = load(id);
    it(`${id}: the HUD clock passes through the sourced times and never runs back`, () => {
      const rel = stepT(p, 'release').t0;
      expect(rmsMetAt(rel, p)).toBeCloseTo(p.releaseS, 6);
      expect(rmsMetAt(stepT(p, 'separation').t0, p)).toBeCloseTo(p.sepBurnsS[0], 6);
      let prev = -Infinity;
      for (let t = 0; t <= rmsDeployEnd(p); t += 0.25) {
        const m = rmsMetAt(t, p);
        expect(m).toBeGreaterThan(prev);
        prev = m;
      }
      expect(rmsMetIsEstimate(rel - 0.01, p)).toBe(true);
      expect(rmsMetIsEstimate(rel, p)).toBe(false);
    });
  }

  it('Hubble plays the stuck array and its retry; Compton the stuck antenna and the spacewalk', () => {
    const h = rmsBeatsFor(load('hubble')).map((b) => b.id);
    expect(h).toEqual([
      'establish',
      'grapple',
      'unberth',
      'arrays',
      'arrayStuck',
      'arrayRetry',
      'antennas',
      'release',
      'separation',
    ]);
    const c = load('compton-gro');
    expect(rmsBeatsFor(c).map((b) => b.id)).toEqual([
      'establish',
      'grapple',
      'unberth',
      'arrays',
      'antennaStuck',
      'eva',
      'release',
      'separation',
    ]);
    // the spacewalk's clock is the profile's EVA time
    expect(rmsMetAt(stepT(c, 'lower').t0, c)).toBeCloseTo(c.evaS!, 6);
  });

  it('solves a reachable point and refuses one out of reach', () => {
    expect(solveArm(new THREE.Vector3(0.5, -10, -2))).not.toBeNull();
    expect(solveArm(new THREE.Vector3(0, -20, -2))).toBeNull();
  });
});

describe('the arm release: kinematics', () => {
  for (const id of ['hubble', 'compton-gro']) {
    const p = load(id);
    const d = build(id);
    const tipAt = (t: number) => {
      d.update(t, 16 / 9);
      d.scene.updateMatrixWorld(true);
      return d.parts.tip.getWorldPosition(new THREE.Vector3());
    };
    const grip = () =>
      ((d.parts.payload.userData.grapple as THREE.Object3D) ?? d.parts.payload).getWorldPosition(
        new THREE.Vector3(),
      );

    it(`${id}: the end effector closes on the grapple fixture and holds it to the release`, () => {
      const g = stepT(p, 'grip');
      expect(tipAt(g.t1).distanceTo(grip())).toBeLessThan(0.02);
      for (const t of [stepT(p, 'lift').t1, stepT(p, 'toRelease').t1, stepT(p, 'release').t0]) {
        expect(tipAt(t).distanceTo(grip()), `t=${t}`).toBeLessThan(0.02);
      }
      // after the release the arm backs off and the observatory stays put
      const free = grip();
      expect(tipAt(stepT(p, 'release').t1).distanceTo(free)).toBeGreaterThan(1);
      tipAt(stepT(p, 'separation').t1);
      expect(grip().distanceTo(free)).toBeLessThan(1e-6);
    });

    it(`${id}: the arm keeps the observatory's heading and holds it clear above the orbiter`, () => {
      const q0 = (() => {
        d.update(stepT(p, 'lift').t1, 1);
        d.scene.updateMatrixWorld(true);
        return d.parts.payload.getWorldQuaternion(new THREE.Quaternion());
      })();
      d.update(stepT(p, 'toRelease').t1, 1);
      d.scene.updateMatrixWorld(true);
      const q1 = d.parts.payload.getWorldQuaternion(new THREE.Quaternion());
      expect(q0.angleTo(q1)).toBeLessThan(0.01);
      const pay = new THREE.Box3().setFromObject(d.parts.payload);
      const orb = new THREE.Box3().setFromObject(d.parts.orbiter);
      // the orbiter's tallest point is its fin; the observatory's underside is above the bay sill
      // by more than the crew cabin's height
      expect(pay.min.y).toBeGreaterThan(orb.min.y + 6);
    });

    it(`${id}: no boom of the arm passes through the observatory's body while it holds it`, () => {
      // the body as stowed, in the observatory's own frame (the deployed arrays left out)
      const body = new THREE.Box3().setFromObject(
        (id === 'hubble' ? buildHubble : buildCompton)({ asLaunched: true }),
      );
      body.expandByScalar(-0.05);
      const holds = [stepT(p, 'lift').t1, stepT(p, 'toRelease').t1, stepT(p, 'release').t0];
      const lower = rmsSteps(p).find((s) => s.phase === 'lower');
      if (lower) holds.push(lower.t1);
      for (const t of holds) {
        d.update(t, 1);
        d.scene.updateMatrixWorld(true);
        const names = ['rms-shoulder-pitch', 'rms-elbow', 'rms-wrist-pitch'];
        const pts = names.map((n) =>
          d.scene.getObjectByName(n)!.getWorldPosition(new THREE.Vector3()),
        );
        for (let s = 0; s < 2; s++)
          for (let k = 0; k <= 20; k++) {
            const w = pts[s].clone().lerp(pts[s + 1], k / 20);
            const local = d.parts.payload.worldToLocal(w);
            expect(body.containsPoint(local), `t=${t} boom ${s} at ${k}/20`).toBe(false);
          }
      }
    });
  }
});

describe('the arm release: framing', () => {
  for (const id of ['hubble', 'compton-gro']) {
    const p = load(id);
    const d = build(id);
    const eases = rmsSteps(p).map((s) => s.t0);
    for (const [w, h] of [
      [1280, 800],
      [390, 844],
    ]) {
      it(`${id} at ${w}x${h}: the observatory is in frame, the orbiter after the separation`, () => {
        for (let t = 0; t <= d.end; t += 0.5) {
          const pose = d.update(t, w / h);
          d.scene.updateMatrixWorld(true);
          d.camera.updateMatrixWorld(true);
          if (eases.some((s0) => t >= s0 && t < s0 + 1.8)) continue;
          const centre = (o: THREE.Object3D) =>
            new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
          // the observatory near the middle while held (on a phone its length runs off the
          // sides otherwise); within the frame once it is free and the orbiter shares the shot
          const held = t < stepT(p, 'release').t0;
          const ndcP = centre(d.parts.payload).project(d.camera);
          if (held) expect(Math.abs(ndcP.x), `${id} t=${t} ${pose.beat} centred`).toBeLessThan(0.6);
          const subjects = [centre(d.parts.payload)];
          if (t >= stepT(p, 'separation').t0) subjects.push(centre(d.parts.orbiter));
          for (const s of subjects) {
            const ndc = s.clone().project(d.camera);
            expect(Math.abs(ndc.x), `${id} t=${t} ${pose.beat} x`).toBeLessThan(0.95);
            expect(Math.abs(ndc.y), `${id} t=${t} ${pose.beat} y`).toBeLessThan(0.95);
            expect(ndc.z, `${id} t=${t} in front`).toBeLessThan(1);
          }
        }
      });
    }
  }
});
