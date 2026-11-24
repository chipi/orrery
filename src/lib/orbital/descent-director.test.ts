import { describe, expect, it } from 'vitest';
import { buildDescentShots, descentPoseAt, GROUND_SHOT_S, shotAt } from './descent-director';

const EVENTS = [
  { type: 'parachute_deploy', t: 248 },
  { type: 'heatshield_sep', t: 268 },
  { type: 'backshell_sep', t: 354 },
  { type: 'skycrane_lower', t: 410 },
  { type: 'touchdown', t: 435 },
];
const shots = buildDescentShots(439, EVENTS, 'curiosity');
const subject = { core: { cy: 0.3, r: 0.6 }, whole: { cy: 3, r: 4 } };

describe('descent director', () => {
  it('covers the whole descent with back-to-back shots and an open landed shot', () => {
    expect(shots[0].t0).toBe(0);
    for (let i = 1; i < shots.length; i++) expect(shots[i].t0).toBeCloseTo(shots[i - 1].t1, 6);
    expect(shots[shots.length - 1].t1).toBe(Infinity);
  });

  it('cuts on every beat, with the shot that suits it', () => {
    expect(shots.find((s) => s.t0 === 248)?.kind).toBe('under'); // look up at the canopy
    expect(shots.find((s) => s.t0 === 354)?.kind).toBe('pullOut'); // backshell flies off
  });

  it('films the last seconds from the ground, ending at touchdown', () => {
    const g = shotAt(shots, 435 - 5);
    expect(g.kind).toBe('ground');
    expect(g.t0).toBeCloseTo(435 - GROUND_SHOT_S, 6);
    expect(g.t1).toBe(435);
  });

  it('varies the shots: no kind twice in a row, several kinds over the descent', () => {
    for (let i = 1; i < shots.length; i++) expect(shots[i].kind).not.toBe(shots[i - 1].kind);
    expect(new Set(shots.map((s) => s.kind)).size).toBeGreaterThanOrEqual(5);
  });

  it('never puts the camera under the ground, even for a shot from below near touchdown', () => {
    for (let t = 0; t < 500; t += 0.5) {
      const alt = 0.2; // low the whole way: a shot from below would go under the ground
      const pose = descentPoseAt(shots, t, subject, alt, 16 / 9);
      expect(pose.pos[1]).toBeGreaterThan(-alt);
    }
  });

  it('is a function of time alone: a scrub lands on the pose play shows', () => {
    const a = descentPoseAt(shots, 300, subject, 2, 16 / 9);
    descentPoseAt(shots, 120, subject, 5, 16 / 9);
    expect(descentPoseAt(shots, 300, subject, 2, 16 / 9)).toEqual(a);
  });

  it('backs off on a phone so the subject still fits the narrow frame', () => {
    const t = shots.find((s) => s.kind === 'orbit')!.t0 + 1;
    const d = (aspect: number) => Math.hypot(...descentPoseAt(shots, t, subject, 50, aspect).pos);
    expect(d(9 / 19.5)).toBeGreaterThan(d(16 / 9) * 1.5);
  });
});

describe('descent director: an airbag landing', () => {
  const BALL = [
    { type: 'parachute_deploy', t: 195 },
    { type: 'bridle_lower', t: 236 },
    { type: 'bridle_cut', t: 327 },
    { type: 'touchdown', t: 329 },
    { type: 'at_rest', t: 382 },
    { type: 'petals_open', t: 390 },
  ];
  const ball = buildDescentShots(396, BALL, 'mars-pathfinder');

  it('cuts under the lander as it slides down the bridle', () => {
    expect(ball.find((s) => s.t0 === 236)?.kind).toBe('under');
  });

  it('keeps the ground shot through the bounces and roll, to rest', () => {
    const g = shotAt(ball, 350);
    expect(g.kind).toBe('ground');
    expect(g.t1).toBe(382);
  });

  it('holds close on the petals as they open, then circles the landed craft', () => {
    const c = shotAt(ball, 391);
    expect(c.kind).toBe('close');
    expect(c.t0).toBe(382);
    expect(c.t1).toBe(398);
    expect(shotAt(ball, 400).kind).toBe('orbit');
  });
});
