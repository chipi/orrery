import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import {
  expandWingedProfile,
  type WingedProfile,
  type WingedProfileRaw,
} from '$lib/fly/winged-profile';
import {
  WT,
  beatAt,
  beatsFor,
  createFlyWinged,
  finalHeight,
  metAt,
  metIsEstimate,
  reversalAt,
  runwayLeg,
  wingedPose,
} from './fly-winged-return-scene';
import { buildOrbiterOpenable } from './showcase/winged';
import { buildRunway } from './showcase/runway';
import { ORBITER_REST_PITCH_DEG } from './showcase/orbiter-stance';

const FT = 0.3048;
const p: WingedProfile = expandWingedProfile(
  JSON.parse(
    readFileSync(resolve(__dirname, '../../../static/data/winged-profiles/sts-1.json'), 'utf-8'),
  ) as WingedProfileRaw,
);

describe('winged return clock and pose (W12, STS-1)', () => {
  it('the HUD clock passes through the profile times, never runs back, and is flown only at touchdown', () => {
    expect(metAt(WT.entry, p)).toBeCloseTo(p.entryS, 6);
    expect(metAt(WT.taem, p)).toBeCloseTo(p.taemS, 6);
    expect(metAt(WT.touchdown, p)).toBeCloseTo(p.touchdownS, 6);
    expect(metAt(WT.deorbit + 7, p) - metAt(WT.deorbit + 1, p)).toBeCloseTo(p.deorbit.burnS, 6);
    let prev = -Infinity;
    for (let t = 0; t <= WT.end; t += 0.25) {
      const m = metAt(t, p);
      expect(m).toBeGreaterThan(prev);
      prev = m;
    }
    expect(metIsEstimate(WT.touchdown)).toBe(false);
    expect(metIsEstimate(WT.taem)).toBe(true);
  });

  it('the beats run in order, with one roll reversal per sourced Mach number', () => {
    const ts = beatsFor().map((b) => b.t);
    expect([...ts].sort((a, b) => a - b)).toEqual(ts);
    expect(beatAt(WT.touchdown + 0.1)).toBe('touchdown');
    const seen = new Set<number>();
    for (let t = WT.entry; t < WT.taem; t += 0.25) seen.add(reversalAt(t, p));
    seen.delete(-1);
    expect(seen.size).toBe(p.entry.reversalsMach.length);
    // the bank changes sign across each reversal
    const bank = (t: number) => wingedPose(t, p).bankDeg;
    expect(Math.sign(bank(WT.rev1 - 0.5))).toBe(-Math.sign(bank(WT.rev2 - 0.5)));
  });

  it('the final approach holds the sourced glideslopes and meets the ground at the touchdown point', () => {
    const L = runwayLeg(p);
    expect(L.zTd).toBeCloseTo(p.touchdown.mainFt * FT, 6);
    expect(L.zStop).toBeCloseTo(p.rollout.stopFt * FT, 6);
    expect(finalHeight(0, p)).toBe(0);
    expect(finalHeight(1, p)).toBeGreaterThanOrEqual(0);
    // far out: the 20 deg outer glideslope; near in: the 1.5 deg inner one
    const slope = (d0: number, d1: number) =>
      (Math.atan((finalHeight(d1, p) - finalHeight(d0, p)) / (d1 - d0)) * 180) / Math.PI;
    expect(slope(6000, 7000)).toBeCloseTo(p.approach.outerGlideDeg, 1);
    expect(slope(300, 600)).toBeCloseTo(p.approach.innerGlideDeg, 1);
    // the final starts at the 18,500 ft turn onto final and the turn ends on the runway heading
    expect(finalHeight(L.dFinal, p)).toBeCloseTo(18_500 * FT, -1);
    const end = wingedPose(WT.final - 1e-6, p);
    expect(Math.abs(end.yaw)).toBeLessThan(0.01);
    expect(end.pos.x).toBeCloseTo(0, 0);
  });

  it('the gear is down by the gear-down height, the mains touch first and the craft stops at the sourced distance', () => {
    const atGearDown = wingedPose(WT.gear + 2.5, p);
    expect(atGearDown.gear).toBe(1);
    expect(atGearDown.pos.y / FT).toBeLessThan(p.approach.preflareFt);
    expect(wingedPose(WT.gear - 0.01, p).gear).toBe(0);
    const td = wingedPose(WT.touchdown, p);
    expect(td.onGround).toBe(true);
    expect(td.pos.z).toBeCloseTo(p.touchdown.mainFt * FT, 3);
    expect(td.pitchDeg).toBeGreaterThan(0);
    const L = runwayLeg(p);
    let noseDownZ = Infinity;
    for (let t = WT.touchdown; t <= WT.stop; t += 0.05) {
      const q = wingedPose(t, p);
      if (q.pitchDeg < ORBITER_REST_PITCH_DEG + 1e-6) {
        noseDownZ = q.pos.z;
        break;
      }
    }
    expect(noseDownZ).toBeCloseTo(L.zNose, -1);
    expect(wingedPose(WT.stop, p).pos.z).toBeCloseTo(p.rollout.stopFt * FT, 3);
    expect(wingedPose(WT.end, p).pos.z).toBeCloseTo(p.rollout.stopFt * FT, 3);
  });

  it('descends throughout and fires the OMS only in the deorbit burn', () => {
    let prev = Infinity;
    for (let t = WT.coast; t < WT.taem; t += 0.5) {
      const a = wingedPose(t, p).altM;
      expect(a).toBeLessThanOrEqual(prev + 1e-6);
      prev = a;
    }
    expect(wingedPose(WT.deorbit + 3, p).oms).toBe(true);
    expect(wingedPose(WT.coast, p).oms).toBe(false);
  });

  it('the pose is a pure function of scene time (a scrub equals play)', () => {
    const a = wingedPose(66.3, p);
    wingedPose(5, p);
    expect(wingedPose(66.3, p)).toEqual(a);
  });
});

describe('winged return framing', () => {
  const w = createFlyWinged(p, { orbiter: buildOrbiterOpenable(), runway: buildRunway(p.runway) });
  const cuts = [WT.coast, WT.entry, WT.rev1, WT.final, WT.preflare, WT.touchdown, WT.rollout];
  for (const [vw, vh] of [
    [1280, 800],
    [390, 844],
  ]) {
    it(`at ${vw}x${vh}: the orbiter is in frame through every beat`, () => {
      for (let t = 0; t <= w.end; t += 0.5) {
        const pose = w.update(t, vw / vh);
        if (cuts.some((s0) => t >= s0 && t < s0 + 1.6)) continue;
        w.scene.updateMatrixWorld(true);
        w.camera.updateMatrixWorld(true);
        const c = new THREE.Box3().setFromObject(w.parts.craft).getCenter(new THREE.Vector3());
        const ndc = c.project(w.camera);
        expect(Math.abs(ndc.x), `t=${t} ${pose.beat} x`).toBeLessThan(0.95);
        expect(Math.abs(ndc.y), `t=${t} ${pose.beat} y`).toBeLessThan(0.95);
        expect(ndc.z, `t=${t} in front`).toBeLessThan(1);
      }
    });
  }

  it('the main wheels sit on the runway at the touchdown', () => {
    w.update(WT.touchdown, 16 / 9);
    w.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(w.parts.craft.children[0]);
    expect(box.min.y).toBeGreaterThan(-0.6);
    expect(box.min.y).toBeLessThan(0.6);
  });
});
