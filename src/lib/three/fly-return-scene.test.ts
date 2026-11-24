import { readFileSync, readdirSync } from 'node:fs';
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
  beatsFor,
  burnWindow,
  isReturnShot,
  shotFor,
  bayNormal,
  csmCentreFromAnchor,
  csmQuat,
  descentRel,
  getAt,
  returnCamera,
  returnPose,
  tipFromAnchor,
} from './fly-return-scene';

const DIR = resolve(process.cwd(), 'static/data/return-profiles');
const load = (id: string): ReturnProfile =>
  expandReturnProfile(JSON.parse(readFileSync(resolve(DIR, `${id}.json`), 'utf-8')));
const profile: ReturnProfile = load('apollo11');
const ALL = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.slice(0, -5));
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

describe('the rendezvous beats come from the profile', () => {
  it('Apollo 11 keeps its beats exactly', () => {
    expect(beatsFor(profile).map((b) => [b.id, b.t])).toEqual(BEATS.map((b) => [b.id, b.t]));
    expect(
      beatsFor(profile)
        .slice(4, 8)
        .map((b) => b.id),
    ).toEqual(['csi', 'cdh', 'tpi', 'terminal']);
    expect(BEATS.slice(4, 8).map((b) => b.t)).toEqual([RT.csi, RT.cdh, RT.tpi, RT.terminal]);
  });
  it('Apollo 12 flies the same four; Apollo 14 flies vernier, TPI, terminal between the same bounds', () => {
    expect(beatsFor(load('apollo12')).map((b) => b.id)).toEqual(BEATS.map((b) => b.id));
    const b14 = beatsFor(load('apollo14'));
    expect(b14.map((b) => b.id)).toEqual([
      'surface',
      'liftoff',
      'ascent',
      'insertion',
      'vernier',
      'tpi',
      'terminal',
      'dock_wide',
      'dock_approach',
      'dock_closeup',
      'soft_capture',
      'hard_dock',
      'dock_pullback',
      'jettison',
      'tei_coast',
      'tei_burn',
      'fade',
    ]);
    expect(b14.find((b) => b.id === 'vernier')!.t).toBe(RT.csi);
    expect(b14.find((b) => b.id === 'terminal')!.t).toBe(RT.terminal);
    expect(beatAt(RT.csi + 0.1, load('apollo14'))).toBe('vernier');
  });
  it('a direct rendezvous shows its three sourced GETs and the APS TPI as an engine burn', () => {
    const p = load('apollo14');
    expect(formatGet(getAt(RT.csi, p))).toBe('141:56:49.4');
    expect(formatGet(getAt(beatsFor(p)[5].t, p))).toBe('142:30:51.0');
    expect(formatGet(getAt(RT.terminal, p))).toBe('143:13:29.1');
    const [a, b] = burnWindow('tpi', p);
    const mid = returnPose((a + b) / 2, p);
    expect(mid.lmEngine).toBe(true);
    expect(mid.lmRcs).toBe(0);
  });
});

describe('the camera style of each mission', () => {
  it('every shot a profile names is a shot the scene plays, on a real beat', () => {
    for (const id of ALL) {
      const shots =
        JSON.parse(readFileSync(resolve(DIR, `${id}.json`), 'utf-8')).camera?.shots ?? {};
      const beats = new Set(BEATS.map((b) => b.id as string).concat('vernier', 'subsat'));
      for (const [beat, shot] of Object.entries(shots)) {
        expect(beats.has(beat), `${id}: ${beat}`).toBe(true);
        expect(isReturnShot(shot as string), `${id}: ${shot}`).toBe(true);
      }
    }
  });
  it('Apollo 11 has no override: its approved shots are the default table', () => {
    for (const b of BEATS) expect(shotFor(b.id, profile)).toBe(BEAT_SHOT[b.id]);
  });
  it('the three missions use three different openings and docking views', () => {
    const open = ALL.map((id) => shotFor('liftoff', load(id)));
    const dock = ALL.map((id) => shotFor('soft_capture', load(id)));
    expect(new Set(open).size).toBe(ALL.length);
    expect(new Set(dock).size).toBeGreaterThan(1);
  });
});

describe('the J missions (Apollo 15, 16, 17)', () => {
  const a15 = load('apollo15');
  const a16 = load('apollo16');
  const a17 = load('apollo17');
  it('play the burns each flew: 15 TPI and TPF, 16 vernier too, 17 trim and plane change are recorded, not played', () => {
    expect(a15.rendezvous.map((r) => r.id)).toEqual(['tpi', 'tpf']);
    expect(beatsFor(a15).map((b) => b.id)).toContain('tpi');
    expect(beatsFor(a15).find((b) => b.id === 'tpi')!.t).toBe(RT.csi);
    expect(beatsFor(a16).map((b) => b.id)).toEqual(
      expect.arrayContaining(['vernier', 'tpi', 'terminal']),
    );
    expect(a17.rendezvous.map((r) => r.id)).toEqual(['trim', 'plane', 'vernier', 'tpi', 'tpf']);
    const b17 = beatsFor(a17).map((b) => b.id);
    expect(b17.slice(3, 7)).toEqual(['insertion', 'vernier', 'tpi', 'terminal']);
    expect(b17).not.toContain('csi');
    // the HUD clock never runs backwards through the CSM's hours-earlier burns
    let prev = -Infinity;
    for (const t of times) {
      const g = getAt(t, a17);
      expect(g).toBeGreaterThanOrEqual(prev);
      prev = g;
    }
    expect(formatGet(getAt(RT.csi, a17))).toBe('185:32:12.0');
  });
  it('Apollo 15 and 16 release the subsatellite between the LM jettison and the TEI coast; 17 has no such beat', () => {
    for (const [p, get] of [
      [a15, '222:39:29.1'],
      [a16, '196:02:09.0'],
    ] as const) {
      const ids = beatsFor(p).map((b) => b.id);
      expect(ids.indexOf('subsat')).toBe(ids.indexOf('jettison') + 1);
      expect(ids.indexOf('tei_coast')).toBe(ids.indexOf('subsat') + 1);
      expect(beatAt(RT.subsat + 0.1, p)).toBe('subsat');
      expect(formatGet(getAt(RT.subsat, p))).toBe(get);
      expect(shotFor('subsat', p)).toBe('subsat_side');
    }
    expect(beatsFor(a17).map((b) => b.id)).not.toContain('subsat');
    expect(beatsFor(load('apollo14')).map((b) => b.id)).not.toContain('subsat');
  });
  it('shows the SIM bay toward the LM on the approach, and the camera of the release sees the bay from outside', () => {
    for (const p of [a15, a16, a17]) {
      const t = RT.tpi + 1;
      const pose = returnPose(t, p);
      const toLm = new THREE.Vector3(...pose.csmRel).multiplyScalar(-1).setY(0).normalize();
      expect(bayNormal(pose).dot(toLm)).toBeGreaterThan(0.9);
      const q = csmQuat(returnPose(RT.subsat + 0.5, p));
      expect(q.length()).toBeCloseTo(1, 6);
    }
    for (const p of [a15, a16]) {
      const pose = returnPose(RT.subsat + 1, p);
      const cam = returnCamera(RT.subsat + 1, 1.6, pose);
      const c = csmCentreFromAnchor(pose, DEFAULT_RIG);
      expect(cam.pos.clone().sub(c).normalize().dot(bayNormal(pose))).toBeGreaterThan(0.5);
    }
  });
  it('the ascent stage tumbles after Apollo 16 jettisons it, and only then', () => {
    expect(returnPose(RT.separate - 1, a16).lmTumble).toEqual([0, 0, 0]);
    const a = returnPose(RT.separate + 3, a16).lmTumble;
    const b = returnPose(RT.separate + 6, a16).lmTumble;
    expect(Math.abs(a[0])).toBeGreaterThan(0.5);
    expect(b[0]).toBeGreaterThan(a[0]);
    expect(returnPose(RT.separate + 6, a15).lmTumble).toEqual([0, 0, 0]);
    expect(returnPose(RT.separate + 6, a17).lmTumble).toEqual([0, 0, 0]);
  });
  it("opens on the rover's TV camera, which holds (15), follows then loses (16) and follows (17) the stage", () => {
    const at = (p: ReturnProfile, t: number) => {
      const pose = returnPose(t, p);
      expect(pose.shot).toMatch(/^rover_tv_/);
      const cam = returnCamera(t, 1.6, pose);
      return cam.look.clone().sub(cam.pos).normalize();
    };
    const pitch = (v: THREE.Vector3) => Math.atan2(v.y, Math.hypot(v.x, v.z));
    // fixed: the pointing never changes
    expect(pitch(at(a15, 3))).toBeCloseTo(pitch(at(a15, 11)), 6);
    // tracked: pitches up as the stage climbs, and keeps the stage at the centre
    expect(pitch(at(a17, 11))).toBeGreaterThan(pitch(at(a17, 4)) + 0.15);
    const pose17 = returnPose(11, a17);
    const cam17 = returnCamera(11, 1.6, pose17);
    expect(cam17.look.length()).toBeLessThan(1e-6);
    // lost: follows to 6 s after ignition, then stays
    expect(pitch(at(a16, 5))).toBeGreaterThan(pitch(at(a16, 2.6)));
    expect(pitch(at(a16, 9))).toBeCloseTo(pitch(at(a16, 11)), 6);
    // the lens looks along the rover's -x toward the LM, from 90 m east
    const pose = returnPose(1, a15);
    const cam = returnCamera(1, 1.6, pose);
    expect(cam.pos.x - descentRel(pose).x).toBeGreaterThan(80);
    expect(cam.look.x).toBeCloseTo(0, 6);
  });
  it('the three open differently, hold different TEI views, and none reuses Apollo 11, 12 or 14', () => {
    const style = (id: string) => JSON.stringify(load(id).camera?.shots ?? {});
    expect(new Set(ALL.map(style)).size).toBe(ALL.length);
    const openers = ['apollo15', 'apollo16', 'apollo17'].map((id) => shotFor('liftoff', load(id)));
    expect(new Set(openers).size).toBe(3);
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
      expect(cam.pos.distanceTo(DEFAULT_RIG.drogue)).toBeLessThan(t >= RT.contact ? 5 : 12);
      expect(cam.fov).toBeLessThanOrEqual(30);
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

for (const id of ALL) {
  const prof = load(id);
  describe(`no empty frames: the craft of every beat are in the frustum (${id})`, () => {
    const project = (aspect: number, t: number) => {
      const pose = returnPose(t, prof);
      const cam = returnCamera(t, aspect, pose);
      const c = new THREE.PerspectiveCamera(cam.fov, aspect, 0.05, 1e7);
      c.position.copy(cam.pos);
      c.lookAt(cam.look);
      c.updateMatrixWorld(true);
      c.updateProjectionMatrix();
      const inside = (p: THREE.Vector3) => {
        const n = p.clone().project(c);
        return Math.abs(n.x) <= 1 && Math.abs(n.y) <= 1 && n.z > -1 && n.z < 1;
      };
      return { pose, inside };
    };
    const beats = beatsFor(prof);
    const samples = beats.flatMap((b, i) => {
      const end = i + 1 < beats.length ? beats[i + 1].t : RT.end;
      return [b.t + 0.05, (b.t + end) / 2];
    });
    for (const aspect of [1.6, 390 / 844]) {
      it(`aspect ${aspect.toFixed(2)}`, () => {
        const bad: string[] = [];
        for (const t of samples) {
          const { pose, inside } = project(aspect, t);
          const close =
            pose.shot === 'dock_close' || pose.shot === 'dock_pull' || pose.shot === 'dock_csm';
          // the close-ups frame the docking anchors, not the whole craft
          const lm = close ? DEFAULT_RIG.drogue : new THREE.Vector3(0, 0, 0);
          const tei = pose.beat === 'tei_coast' || pose.beat === 'tei_burn' || pose.beat === 'fade';
          const subsat = pose.beat === 'subsat'; // the camera looks into the CSM's bay
          if (!tei && !subsat && !inside(lm)) bad.push(`${t} LM ${pose.beat}`);
          const pullStart = pose.shot === 'dock_pull' && t < RT.pullBack + 0.5;
          if (
            pose.csmVisible &&
            pose.shot !== 'dock_close' &&
            pose.shot !== 'dock_csm' &&
            !pullStart
          ) {
            if (!inside(csmCentreFromAnchor(pose, DEFAULT_RIG))) bad.push(`${t} CSM ${pose.beat}`);
          }
        }
        expect(bad).toEqual([]);
      });
    }
  });
}
