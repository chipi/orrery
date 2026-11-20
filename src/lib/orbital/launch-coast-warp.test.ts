import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { integrateAscent, type LaunchProfile } from '$lib/physics/ascent/ascent-physics';
import {
  COAST_EDGE_S,
  COAST_SCENE_S,
  advanceMissionT,
  directorTimesOnPlayClock,
  launchCoastWarp,
  toMissionT,
  toSceneT,
} from './launch-coast-warp';
import { ascentStatus, buildAscentBeats, directInsertionCoastStatus } from './ascent-hud';
import { buildDirectorPlan } from './ascent-director';

const load = (id: string): LaunchProfile =>
  JSON.parse(
    readFileSync(resolve(__dirname, `../../../static/data/launch-profiles/${id}.json`), 'utf-8'),
  ) as LaunchProfile;

const events = [
  { type: 'liftoff', t: 0 },
  { type: 'staging', t: 123 },
  { type: 'meco', t: 516 },
  { type: 'staging', t: 534 },
  { type: 'insertion_burn', t: 2081 },
  { type: 'orbit', t: 2131 },
];

describe('launchCoastWarp', () => {
  const w = launchCoastWarp(events)!;

  it('compresses the coast from 20 s after the tank separation to 20 s before the burn', () => {
    expect(w.coastStart).toBe(534 + COAST_EDGE_S);
    expect(w.coastEnd).toBe(2081 - COAST_EDGE_S);
    expect(w.toScene(w.coastEnd) - w.toScene(w.coastStart)).toBeCloseTo(COAST_SCENE_S, 9);
  });

  it('keeps the real clock before and after the coast (identity, then a constant offset)', () => {
    expect(w.toScene(0)).toBe(0);
    expect(w.toScene(516)).toBe(516);
    const offset = w.coastEnd - w.coastStart - COAST_SCENE_S;
    expect(w.toScene(2131)).toBeCloseTo(2131 - offset, 9);
    expect(w.toScene(2140) - w.toScene(2130)).toBeCloseTo(10, 9);
  });

  it('toScene and toMission are exact inverses across the whole act', () => {
    for (const t of [-12, 0, 300, 554, 600, 1200, 2000, 2061, 2100, 2266]) {
      expect(w.toMission(w.toScene(t))).toBeCloseTo(t, 6);
    }
  });

  it('advancing through the coast takes COAST_SCENE_S of play clock', () => {
    let t = w.coastStart;
    let sceneS = 0;
    while (t < w.coastEnd) {
      t = advanceMissionT(w, t, 0.1);
      sceneS += 0.1;
    }
    expect(sceneS).toBeCloseTo(COAST_SCENE_S, 0);
  });

  it('is null (identity) without an insertion burn or for a short coast', () => {
    expect(launchCoastWarp(events.filter((e) => e.type !== 'insertion_burn'))).toBeNull();
    expect(
      launchCoastWarp([
        { type: 'staging', t: 534 },
        { type: 'insertion_burn', t: 534 + 2 * COAST_EDGE_S + COAST_SCENE_S - 1 },
      ]),
    ).toBeNull();
    expect(toSceneT(null, 777)).toBe(777);
    expect(toMissionT(null, 777)).toBe(777);
    expect(advanceMissionT(null, 100, 5)).toBe(105);
  });
});

describe('the Shuttle launch act with the compressed coast', () => {
  const s = integrateAscent(load('space-shuttle-stack'));
  const w = launchCoastWarp(s.events)!;

  it('has a warp, and the act plays about as long as before the direct insertion', () => {
    expect(w).not.toBeNull();
    // Mission time ~2,266 s; play clock ~ the ascent to the tank separation + edges + the
    // compressed coast + the OMS-2 burn + the post-SECO coast.
    expect(s.totalDurationS).toBeGreaterThan(2000);
    expect(w.toScene(s.totalDurationS)).toBeLessThan(800);
  });

  it('the status reads STAGE SEP, then COAST, then OMS-2 through the burn, then ORBIT', () => {
    const beats = buildAscentBeats(s);
    const status = (t: number) => directInsertionCoastStatus(t, s.events) ?? ascentStatus(t, beats);
    const sep = s.events.filter((e) => e.type === 'staging').at(-1)!.t;
    const burn = s.events.find((e) => e.type === 'insertion_burn')!.t;
    const orbit = s.events.find((e) => e.type === 'orbit')!.t;
    expect(status(sep + 5)).toBe('STAGE SEP');
    expect(status(sep + 60)).toBe('COAST');
    expect(status(burn - 1)).toBe('COAST');
    expect(status(burn + 30)).toBe('OMS-2');
    expect(status(orbit + 1)).toBe('ORBIT');
  });

  it('the camera director plans the coast as at most one cut, on the play clock', () => {
    const plan = buildDirectorPlan({
      vehicleId: 'space-shuttle-stack',
      missionId: 'sts-1',
      payloadInBay: true,
      hasBoosters: true,
      altAt: () => 200,
      ...directorTimesOnPlayClock(w, {
        events: s.events,
        maxQt: s.maxQ.t,
        duration: s.totalDurationS,
        endT: s.totalDurationS,
      }),
    });
    // The plan spans the play clock (the rig looks shots up at the scene time)...
    expect(plan.shots.at(-1)!.tEnd).toBeCloseTo(w.toScene(s.totalDurationS), 0);
    // ...and the coast's 15 s of play clock shows at most two shots (one cut).
    const a = w.toScene(w.coastStart);
    const b = w.toScene(w.coastEnd);
    const seen = new Set<string>();
    for (let x = a; x <= b; x += 0.25) {
      const sh = plan.shots.find((q) => x >= q.tStart && x < q.tEnd);
      if (sh) seen.add(`${sh.id}@${sh.tStart}`);
    }
    expect(seen.size).toBeGreaterThan(0);
    expect(seen.size).toBeLessThanOrEqual(2);
  });

  it('the beat strip has OMS-2 before ORBIT', () => {
    const labels = buildAscentBeats(s).map((b) => b.label);
    expect(labels.indexOf('OMS-2')).toBeGreaterThan(labels.indexOf('MECO'));
    expect(labels.indexOf('OMS-2')).toBeLessThan(labels.indexOf('ORBIT'));
  });
});
