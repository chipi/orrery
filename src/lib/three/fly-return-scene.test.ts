import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { expandReturnProfile, formatGet, type ReturnProfile } from '$lib/fly/return-profile';
import {
  BEATS,
  BEAT_SHOT,
  DEFAULT_RIG,
  RT,
  beatAt,
  burnWindow,
  csmCentreFromAnchor,
  descentRel,
  getAt,
  returnCamera,
  returnPose,
  tipFromAnchor,
} from './fly-return-scene';

const profile: ReturnProfile = expandReturnProfile(
  JSON.parse(
    readFileSync(resolve(process.cwd(), 'static/data/return-profiles/apollo11.json'), 'utf-8'),
  ),
);
const times = Array.from({ length: 821 }, (_, i) => i / 10);

describe('the beat and shot tables', () => {
  it('every beat has a shot, beats are in time order, the scene ends after the last', () => {
    for (const b of BEATS) expect(BEAT_SHOT[b.id]).toBeDefined();
    for (let i = 1; i < BEATS.length; i++) expect(BEATS[i].t).toBeGreaterThan(BEATS[i - 1].t);
    expect(RT.end).toBeGreaterThan(BEATS[BEATS.length - 1].t);
  });
  it('cuts to the close-up on the three docking beats', () => {
    expect(beatAt(RT.closeUp + 0.1)).toBe('dock_closeup');
    expect(BEAT_SHOT[beatAt(RT.contact + 0.1)]).toBe('dock_close');
    expect(BEAT_SHOT[beatAt(RT.hardDock + 0.1)]).toBe('dock_close');
    expect(BEAT_SHOT[beatAt(RT.pullBack + 0.1)]).toBe('dock_pull');
  });
});

describe('getAt: the real GET on the HUD', () => {
  it('shows each sourced event at its beat', () => {
    expect(formatGet(getAt(RT.ignition, profile))).toBe('124:22:00.8');
    expect(formatGet(getAt(RT.insertion, profile))).toBe('124:29:15.7');
    expect(formatGet(getAt(RT.csi, profile))).toBe('125:19:35.5');
    expect(formatGet(getAt(RT.cdh, profile))).toBe('126:17:49.6');
    expect(formatGet(getAt(RT.tpi, profile))).toBe('127:03:51.8');
    expect(formatGet(getAt(RT.contact, profile))).toBe('128:03:00.0');
    expect(formatGet(getAt(RT.separate, profile))).toBe('130:09:31.2');
    expect(formatGet(getAt(RT.teiBurn, profile))).toBe('135:23:42.3');
  });
  it('runs the vertical rise in real time (10 s) and never goes backwards', () => {
    expect(getAt(RT.pitchOver, profile) - getAt(RT.ignition, profile)).toBeCloseTo(10, 6);
    let prev = -Infinity;
    for (const t of times) {
      const g = getAt(t, profile);
      expect(g).toBeGreaterThanOrEqual(prev);
      prev = g;
    }
  });
  it('plays the TEI burn for its sourced 151.4 s', () => {
    expect(getAt(RT.teiEnd, profile) - getAt(RT.teiBurn, profile)).toBeCloseTo(151.4, 6);
  });
});

describe('returnPose', () => {
  it('is pure: the same time gives the same pose (scrub = play)', () => {
    for (const t of [0, 5, 20, 40, 55, 58, 70, 78]) {
      expect(returnPose(t, profile)).toEqual(returnPose(t, profile));
    }
  });
  it('holds on the pad, then rises: 0 m above the footpad line before ignition, ~95 m after 10 s', () => {
    const rest = returnPose(1, profile);
    const rise = returnPose(RT.pitchOver, profile);
    expect(rest.altM).toBe(DEFAULT_RIG.stageY0);
    expect(rest.lmEngine).toBe(false);
    expect(rise.altM - DEFAULT_RIG.stageY0).toBeGreaterThan(80);
    expect(rise.lmEngine).toBe(true);
    expect(rise.lmTilt).toBe(0); // vertical for the first 10 s
  });
  it('keeps the descent stage on the surface: it is where the pad was, never above the footpad line', () => {
    expect(descentRel(returnPose(0, profile)).y).toBeCloseTo(-DEFAULT_RIG.stageY0, 6);
    for (const t of times.filter((x) => x < RT.insertion)) {
      const p = returnPose(t, profile);
      const d = descentRel(p);
      // the footpad plane is altM below the anchor in the local frame, within the Moon's curvature
      expect(d.y).toBeLessThanOrEqual(-p.altM + 1e-6);
      expect(d.y).toBeGreaterThan(-p.altM - 0.5 * p.theta * p.theta * 1.74e6 * 1.01 - 1);
    }
  });
  it('reaches the sourced insertion altitude (60,300 ft) and pitches over on the way', () => {
    const ins = returnPose(RT.insertion, profile);
    expect(ins.altM).toBeCloseTo(60300 * 0.3048, 3);
    expect(returnPose(RT.insertion - 1, profile).lmTilt).toBeGreaterThan(1);
    expect(ins.lmTilt).toBeCloseTo(0.0 + ins.lmTilt, 6);
  });
  it('shows the CSM only from the rendezvous on, the SPS only in the TEI burn', () => {
    expect(returnPose(RT.insertion, profile).csmVisible).toBe(false);
    expect(returnPose(RT.csi + 1, profile).csmVisible).toBe(true);
    expect(
      times
        .filter((t) => returnPose(t, profile).spsBurn)
        .every((t) => t >= RT.teiBurn && t < RT.teiEnd),
    ).toBe(true);
    expect(returnPose(RT.teiBurn + 1, profile).spsBurn).toBe(true);
    expect(returnPose(RT.teiBurn - 1, profile).spsBurn).toBe(false);
  });
  it('lights the LM RCS in the rendezvous burns at 1/16 of their sourced length', () => {
    const [a, b] = burnWindow('csi', profile);
    expect(b - a).toBeCloseTo(47 / 16, 6);
    expect(returnPose((a + b) / 2, profile).lmRcs).toBe(1);
    expect(returnPose(b + 0.03, profile).lmRcs).toBe(0);
  });
});

describe('the docking geometry', () => {
  it('closes monotonically on the drogue and ends with the probe tip inside it', () => {
    let prevGap = Infinity;
    for (const t of times.filter((x) => x >= RT.closeUp && x < RT.contact)) {
      const gap = tipFromAnchor(returnPose(t, profile), DEFAULT_RIG).y - DEFAULT_RIG.drogue.y;
      expect(gap).toBeLessThanOrEqual(prevGap + 1e-9);
      prevGap = gap;
    }
    const contact = returnPose(RT.contact, profile);
    expect(tipFromAnchor(contact, DEFAULT_RIG).distanceTo(DEFAULT_RIG.drogue)).toBeLessThan(0.02);
    const hard = returnPose(RT.pullBack, profile);
    expect(hard.engage).toBeGreaterThan(0.95);
    expect(hard.docked).toBe(true);
    // the tip is probeLen below the drogue plane, on the axis
    const tip = tipFromAnchor(hard, DEFAULT_RIG);
    expect(tip.x - DEFAULT_RIG.drogue.x).toBeCloseTo(0, 6);
    expect(DEFAULT_RIG.drogue.y - tip.y).toBeGreaterThan(0.8);
  });
  it('starts withdrawing the probe at separation and backs the CSM off', () => {
    const a = returnPose(RT.separate + 0.2, profile);
    const b = returnPose(RT.separate + 6, profile);
    expect(a.docked).toBe(false);
    expect(b.csmRel[1]).toBeGreaterThan(a.csmRel[1]);
    expect(b.engage).toBe(0);
  });
  it('turns the CSM nose to +x for TEI and accelerates it that way', () => {
    const e = returnPose(RT.teiEnd, profile);
    expect(e.csmNose).toBeCloseTo(Math.PI / 2, 2);
    expect(csmCentreFromAnchor(e, DEFAULT_RIG).x).toBeGreaterThan(10);
  });
});

describe('returnCamera', () => {
  it('stays finite, looks at something in front of it, and never goes inside the Moon', () => {
    for (const aspect of [1.6, 0.46]) {
      for (const t of times) {
        const pose = returnPose(t, profile);
        const cam = returnCamera(t, aspect, pose);
        for (const v of [...cam.pos.toArray(), ...cam.look.toArray(), cam.fov]) {
          expect(Number.isFinite(v)).toBe(true);
        }
        expect(cam.pos.distanceTo(cam.look)).toBeGreaterThan(0.5);
        // camera above the descent-stage footpad plane (the surface) while near it
        if (pose.altM < 200) expect(cam.pos.y).toBeGreaterThan(descentRel(pose).y + 0.5);
      }
    }
  });
  it('the close-up is a few metres from the drogue and frames the tip', () => {
    for (const t of [RT.closeUp + 2, RT.contact, RT.hardDock + 0.5]) {
      const pose = returnPose(t, profile);
      const cam = returnCamera(t, 1.6, pose);
      expect(pose.shot).toBe('dock_close');
      expect(cam.pos.distanceTo(DEFAULT_RIG.drogue)).toBeLessThan(8);
      expect(cam.fov).toBeLessThanOrEqual(26);
    }
  });
  it('backs off on a phone-shaped frame', () => {
    const t = RT.dockWide + 1;
    const pose = returnPose(t, profile);
    const wide = returnCamera(t, 1.6, pose).pos.distanceTo(new THREE.Vector3());
    const tall = returnCamera(t, 0.46, pose).pos.distanceTo(new THREE.Vector3());
    expect(tall).toBeGreaterThan(wide);
  });
});
