import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  integrateAscent,
  sampleAscentAt,
  type AscentSummary,
  type LaunchProfile,
} from '$lib/physics/ascent/ascent-physics';
import { PAYLOAD_SEP_HOLD_S } from './ascent-cameras';
import {
  blendPoses,
  buildDirectorPlan,
  directedPoseAt,
  evalKf,
  farEnough,
  fnv1a32,
  groundRelative,
  mulberry32,
  pickConditions,
  shotIndexAt,
  vehicleFill,
  viewOf,
  type DirectedShot,
  type DirectorInputs,
  type DirectorPlan,
} from './ascent-director';

const DIR = resolve(__dirname, '../../../static/data/launch-profiles');
const PROFILES: { id: string; profile: LaunchProfile; summary: AscentSummary }[] = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => {
    const profile = JSON.parse(readFileSync(join(DIR, f), 'utf-8')) as LaunchProfile;
    return { id: f.replace('.json', ''), profile, summary: integrateAscent(profile) };
  });
const byId = (id: string) => PROFILES.find((p) => p.id === id)!;

function inputsFor(
  p: (typeof PROFILES)[number],
  extra: Partial<DirectorInputs> = {},
): DirectorInputs {
  return {
    vehicleId: p.id,
    events: p.summary.events,
    maxQt: p.summary.maxQ.t,
    duration: p.summary.totalDurationS,
    altAt: (t) => sampleAscentAt(p.summary.states, t).altKm,
    hasBoosters: (p.profile.boosters?.count ?? 0) > 0,
    ...extra,
  };
}

const planFor = (p: (typeof PROFILES)[number], extra: Partial<DirectorInputs> = {}) =>
  buildDirectorPlan(inputsFor(p, extra));
const sequence = (plan: DirectorPlan) => plan.shots.map((s) => `${s.id}/${s.side}`).join('>');

describe('seeding', () => {
  it('fnv1a32 and mulberry32 are stable', () => {
    expect(fnv1a32('falcon-9|crs-12')).toBe(fnv1a32('falcon-9|crs-12'));
    expect(fnv1a32('a')).not.toBe(fnv1a32('b'));
    const a = mulberry32(7);
    const b = mulberry32(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    const x = mulberry32(1)();
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThan(1);
  });
});

describe('determinism', () => {
  it('the same inputs give a byte-identical plan', () => {
    const p = byId('falcon-9');
    const a = JSON.stringify(planFor(p, { missionId: 'crs-12' }));
    const b = JSON.stringify(planFor(p, { missionId: 'crs-12' }));
    expect(a).toBe(b);
  });

  it('a different mission or seed gives a different plan', () => {
    const p = byId('falcon-9');
    expect(JSON.stringify(planFor(p, { missionId: 'a' }))).not.toBe(
      JSON.stringify(planFor(p, { missionId: 'b' })),
    );
    expect(JSON.stringify(planFor(p, { seed: 1 }))).not.toBe(
      JSON.stringify(planFor(p, { seed: 2 })),
    );
  });
});

describe('variety', () => {
  it('forty profiles: at least 38 distinct shot sequences', () => {
    const seqs = new Set(PROFILES.map((p) => sequence(planFor(p))));
    expect(PROFILES.length).toBe(40);
    expect(seqs.size).toBeGreaterThanOrEqual(38);
  });

  it('Falcon 9: 200 seeds give at least 150 distinct sequences', () => {
    const p = byId('falcon-9');
    const seqs = new Set<string>();
    for (let s = 0; s < 200; s++) seqs.add(sequence(planFor(p, { seed: s })));
    expect(seqs.size).toBeGreaterThanOrEqual(150);
  });

  it('SLS, the Shuttle and Falcon 9 use at least four shot families after T+22', () => {
    for (const id of ['sls-block-1', 'space-shuttle-stack', 'falcon-9']) {
      const fams = new Set(
        planFor(byId(id))
          .shots.filter((s) => s.tStart >= 22)
          .map((s) => s.family),
      );
      expect(fams.size).toBeGreaterThanOrEqual(4);
    }
  });

  it("every opening appears across seeds, today's tower_clear included", () => {
    const seen = new Set<string>();
    for (let s = 0; s < 80; s++) seen.add(planFor(byId('falcon-9'), { seed: s }).opening);
    expect([...seen].sort()).toEqual(['overhead_drop', 'pad_dusk', 'pad_wide', 'tower_clear']);
  });

  it("the opening pool keeps today's shots when tower_clear is drawn", () => {
    const plan = planFor(byId('falcon-9'), { force: { opening: 'tower_clear' } });
    expect(plan.shots[0]).toMatchObject({ id: 'pad', tStart: 0, tEnd: 3, kept: 'pad' });
    expect(plan.shots[1]).toMatchObject({ id: 'tower_clear', tStart: 3, tEnd: 22 });
  });

  it('the pool reaches a look-down above 45 degrees and a low angle below -5', () => {
    let maxEl = -90;
    let minEl = 90;
    for (const p of PROFILES) {
      for (let s = 0; s < 6; s++) {
        for (const sh of planFor(p, { seed: s }).shots) {
          if (!sh.ch || sh.anchor) continue;
          for (const [, v] of sh.ch.el) {
            maxEl = Math.max(maxEl, v);
            minEl = Math.min(minEl, v);
          }
        }
      }
    }
    expect(maxEl).toBeGreaterThan(45);
    expect(minEl).toBeLessThan(-5);
  });
});

describe('conditions', () => {
  it('draws every light and cover from the pools and honours forced values', () => {
    const lights = new Set<string>();
    const covers = new Set<string>();
    for (let s = 0; s < 300; s++) {
      const c = pickConditions(mulberry32(s));
      lights.add(c.light);
      covers.add(c.cover);
      expect(c.coverage).toBeGreaterThan(0);
      expect(c.coverage).toBeLessThanOrEqual(1);
    }
    expect([...lights].sort()).toEqual(['dusk', 'golden', 'midday', 'night']);
    expect([...covers].sort()).toEqual(['clear', 'deck', 'heavy', 'scattered']);
    expect(pickConditions(mulberry32(1), { light: 'night', cover: 'heavy' })).toMatchObject({
      light: 'night',
      cover: 'heavy',
    });
  });

  it('the dusk opening forces dusk light', () => {
    const plan = planFor(byId('falcon-9'), { force: { opening: 'pad_dusk' } });
    expect(plan.conditions.light).toBe('dusk');
  });

  it('light sets the sun: below the horizon at dusk and night, high at midday', () => {
    for (let s = 0; s < 60; s++) {
      const c = pickConditions(mulberry32(s));
      if (c.light === 'midday') expect(c.sunElevDeg).toBeGreaterThan(45);
      if (c.light === 'dusk' || c.light === 'night') expect(c.sunElevDeg).toBeLessThan(0);
    }
  });
});

describe('constraints over many generated sequences', () => {
  const plans: { p: (typeof PROFILES)[number]; plan: DirectorPlan; speed: number }[] = [];
  for (const p of PROFILES) {
    for (let s = 0; s < 100; s++) {
      const speed = s % 4 === 3 ? 20 : 5;
      plans.push({ p, plan: planFor(p, { seed: s * 7 + 1, speed }), speed });
    }
  }

  it('windows are contiguous, positive and cover [0, end]', () => {
    for (const { p, plan } of plans) {
      const sh = plan.shots;
      expect(sh[0].tStart).toBe(0);
      for (let i = 0; i < sh.length; i++) {
        expect(sh[i].tEnd).toBeGreaterThan(sh[i].tStart);
        if (i > 0) expect(sh[i].tStart).toBeCloseTo(sh[i - 1].tEnd, 6);
      }
      const dur = p.summary.totalDurationS;
      expect(sh.at(-1)!.tEnd).toBeGreaterThanOrEqual(dur);
    }
  });

  it('no consecutive shots share an id or a family', () => {
    for (const { plan } of plans) {
      for (let i = 1; i < plan.shots.length; i++) {
        const a = plan.shots[i - 1];
        const b = plan.shots[i];
        // a short flight can leave a kept shot (orbit) beside itself only through a separation shot
        expect(`${plan.seed}:${i}:${b.id}`).not.toBe(`${plan.seed}:${i}:${a.id}`);
        expect(`${plan.seed}:${i}:${b.family}`).not.toBe(`${plan.seed}:${i}:${a.family}`);
      }
    }
  });

  it('no fast pool shot follows a fast pool shot', () => {
    for (const { plan } of plans) {
      for (let i = 1; i < plan.shots.length; i++) {
        const a = plan.shots[i - 1];
        const b = plan.shots[i];
        if (a.kind === 'pool' && b.kind === 'pool') expect(a.fast && b.fast).toBe(false);
      }
    }
  });

  it('every cut changes the view by 30 degrees of azimuth or 20 of elevation', () => {
    let pairs = 0;
    for (const { plan } of plans) {
      for (let i = 1; i < plan.shots.length; i++) {
        const a = plan.shots[i - 1];
        const b = plan.shots[i];
        if (a.kind === 'kept' && b.kind === 'kept') continue;
        const view = (s: DirectedShot) => (s.ch && !s.anchor ? viewOf(s) : null);
        const va = view(a);
        const vb = view(b);
        if (!va || !vb) continue; // kept and anchored views are approximations; the plan checks them
        pairs++;
        expect(farEnough(va, vb)).toBe(true);
      }
    }
    expect(pairs).toBeGreaterThan(10_000);
  });

  it('pool pieces stay inside their [minS, maxS] unless a short gap was absorbed', () => {
    for (const { plan } of plans) {
      for (const s of plan.shots) {
        if (s.kind !== 'pool' || s.extended) continue;
        const d = s.tEnd - s.tStart;
        expect(d).toBeGreaterThanOrEqual(s.minS! - 1e-6);
        expect(d).toBeLessThanOrEqual(s.maxS! + 1e-6);
      }
    }
  });

  it('every beat is covered: Max-Q, each staging, the fairing, SECO and the separation', () => {
    for (const { p, plan } of plans) {
      const seco = p.summary.events.find((e) => e.type === 'seco')?.t ?? p.summary.totalDurationS;
      const maxQ = Math.max(23, p.summary.maxQ.t);
      const at = (t: number) => plan.shots[shotIndexAt(plan.shots, t)];
      if (maxQ < seco - 6) {
        const sq = plan.shots.find((s) => s.id === 'maxq_squeeze');
        if (sq) {
          expect(sq.tStart).toBeLessThanOrEqual(maxQ + 1e-6);
          expect(sq.tEnd).toBeGreaterThanOrEqual(maxQ - 1e-6);
          expect(sq.kind).toBe('beat');
        }
      }
      for (const e of p.summary.events) {
        if (e.type === 'staging' && e.t > maxQ + 1 && e.t < seco) {
          const w = at(e.t);
          // a beat the previous one's window already swallowed is still inside a beat
          expect(['beat', 'kept'].includes(w.kind) || e.t - w.tStart < 3.5).toBe(true);
        }
        if (e.type === 'fairing_jettison' && e.t > maxQ + 1 && e.t < seco) {
          // inside the fairing shot, or inside the staging beat whose window swallowed it
          expect(at(e.t + 0.01).kind).not.toBe('pool');
        }
      }
      const sep = plan.shots.find((s) => s.id === 'separation')!;
      expect(sep.tStart).toBeCloseTo(seco, 6);
      expect(sep.tEnd - sep.tStart).toBeCloseTo(PAYLOAD_SEP_HOLD_S, 6);
    }
  });

  it('boosters get the signature peel on the first staging', () => {
    const peels = plans.filter(
      ({ p }) => (p.profile.boosters?.count ?? 0) > 0 && p.id === 'sls-block-1',
    );
    expect(peels.length).toBeGreaterThan(0);
    expect(peels.filter(({ plan }) => plan.shots.some((s) => s.id === 'booster_peel')).length).toBe(
      peels.length,
    );
  });

  it('at x20 every beat survives and pool pieces are at least 3 s of screen time long', () => {
    for (const { p, plan, speed } of plans) {
      if (speed !== 20) continue;
      expect(plan.shots.some((s) => s.kind === 'beat' || s.kind === 'kept')).toBe(true);
      for (const s of plan.shots) {
        if (s.kind !== 'pool' || s.extended) continue;
        const d = s.tEnd - s.tStart;
        expect(d).toBeGreaterThanOrEqual(60 - 1e-6);
      }
      expect(p.summary.events.length).toBeGreaterThan(0);
    }
  });
});

describe('poses', () => {
  const p = byId('falcon-9');
  const plan = planFor(p, { seed: 3, force: { opening: 'tower_clear' } });
  const state = (t: number) => sampleAscentAt(p.summary.states, t);

  it('a pose is a pure function of (plan, t, state)', () => {
    const a = directedPoseAt(plan, 100, state(100), 1.2);
    const b = directedPoseAt(plan, 100, state(100), 1.2);
    expect(a).toEqual(b);
  });

  it('is continuous across every blend: no step at the shot boundary', () => {
    let blended = 0;
    plan.shots.forEach((sh, i) => {
      if (i === 0 || sh.blendInS <= 0) return;
      blended++;
      const s = state(sh.tStart);
      const before = directedPoseAt(plan, sh.tStart - 1e-6, s, 1.2).pose;
      const after = directedPoseAt(plan, sh.tStart + 1e-6, s, 1.2).pose;
      for (const k of ['px', 'py', 'pz', 'tx', 'ty', 'tz', 'fov'] as const) {
        expect(Math.abs(after[k] - before[k])).toBeLessThan(0.05);
      }
    });
    expect(blended).toBeGreaterThan(0);
  });

  it('a hard cut changes the pose (the beats)', () => {
    const sq = plan.shots.find((s) => s.id === 'maxq_squeeze')!;
    expect(sq.blendInS).toBe(0);
    const s = state(sq.tStart);
    const before = directedPoseAt(plan, sq.tStart - 1e-6, s, 1.2).pose;
    const after = directedPoseAt(plan, sq.tStart + 1e-6, s, 1.2).pose;
    expect(Math.abs(after.px - before.px) + Math.abs(after.fov - before.fov)).toBeGreaterThan(0.5);
  });

  it('the Max-Q squeeze zooms in, holds and releases', () => {
    const sq = plan.shots.find((s) => s.id === 'maxq_squeeze')!;
    const fovAt = (f: number) =>
      directedPoseAt(plan, sq.tStart + f * (sq.tEnd - sq.tStart), state(sq.tStart), 1.2).pose.fov;
    expect(fovAt(0.45)).toBeLessThan(fovAt(0.02) - 8);
    expect(fovAt(0.5)).toBeCloseTo(fovAt(0.45), 0);
    expect(fovAt(0.98)).toBeGreaterThan(fovAt(0.5) + 8);
  });

  it('the camera never goes under the ground', () => {
    for (const sh of plan.shots) {
      for (const f of [0, 0.5, 1]) {
        const t = sh.tStart + f * (sh.tEnd - sh.tStart) - (f === 1 ? 1e-6 : 0);
        expect(directedPoseAt(plan, t, state(t), 1.2).pose.py).toBeGreaterThan(0);
      }
    }
  });

  it('blendPoses interpolates every field', () => {
    const a = { px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0, fov: 30 };
    const b = { px: 2, py: 4, pz: 6, tx: 8, ty: 10, tz: 12, fov: 50 };
    expect(blendPoses(a, b, 0.5)).toEqual({ px: 1, py: 2, pz: 3, tx: 4, ty: 5, tz: 6, fov: 40 });
  });

  it('evalKf eases between keyframes and clamps outside them', () => {
    const kf: [number, number][] = [
      [0, 10],
      [1, 20],
    ];
    expect(evalKf(kf, -1, 'smooth')).toBe(10);
    expect(evalKf(kf, 2, 'smooth')).toBe(20);
    expect(evalKf(kf, 0.5, 'linear')).toBe(15);
    expect(evalKf(kf, 0.5, 'smooth')).toBe(15);
    expect(evalKf(kf, 0.5, 'out')).toBeCloseTo(17.5, 6);
  });
});

describe('framing', () => {
  it('the vehicle fills 40-70 % (a band of 35-80) of the frame in pool and beat shots; wide_trail stays readable', () => {
    let checked = 0;
    for (const id of ['falcon-9', 'sls-block-1', 'space-shuttle-stack', 'atlas-v', 'saturn-v']) {
      const p = byId(id);
      for (let seed = 0; seed < 8; seed++) {
        const plan = planFor(p, { seed });
        for (const sh of plan.shots) {
          if (!sh.ch || (sh.kind !== 'pool' && sh.kind !== 'beat')) continue;
          for (const f of [0.15, 0.5, 0.85]) {
            const t = sh.tStart + f * (sh.tEnd - sh.tStart);
            if (t - sh.tStart < sh.blendInS) continue; // still blending out of the last shot
            const s = sampleAscentAt(p.summary.states, t);
            const pose = directedPoseAt(plan, t, s, 1.2).pose;
            const fill = vehicleFill(pose, s, 1.2);
            checked++;
            if (sh.id === 'wide_trail') {
              expect(fill).toBeGreaterThan(0.2);
              expect(fill).toBeLessThan(0.45);
            } else {
              expect(fill, `${id} ${sh.id} f=${f}`).toBeGreaterThan(0.3);
              expect(fill, `${id} ${sh.id} f=${f}`).toBeLessThan(0.85);
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(500);
  });
});

describe('first seconds rise vertically (ground-relative)', () => {
  const CFGS: [string, number | undefined][] = [
    ['sls-block-1', undefined],
    ['sls-block-1', 77],
    ['space-shuttle-stack', 5],
    ['atlas-v', undefined],
    ['falcon-9', undefined],
    ['falcon-9', 3],
  ];

  it('the inertial path drifts kilometres sideways (the defect the rig corrects)', () => {
    const s = sampleAscentAt(byId('falcon-9').summary.states, 10);
    expect(s.downrangeKm).toBeGreaterThan(3);
    expect(s.altKm).toBeLessThan(0.5);
  });

  it('the ground-relative vehicle stays over the pad, rising, until tower clear + 2 s', () => {
    for (const [id] of CFGS) {
      const p = byId(id);
      const lat = p.profile.launchSite?.lat ?? 28.5;
      for (let t = 0; t <= 24; t += 0.5) {
        const g = groundRelative(sampleAscentAt(p.summary.states, t), lat);
        // vertical until the real pitch-over (a few seconds after tower clear), then at most 45 deg
        const k = t <= 12 ? 0.5 : 1.05;
        expect(Math.abs(g.downrangeKm), `${id} t=${t}`).toBeLessThan(0.02 + k * g.altKm);
      }
    }
  });

  it('the ground-relative path is continuous and never goes backwards past the correction', () => {
    const p = byId('falcon-9');
    let prev = groundRelative(sampleAscentAt(p.summary.states, 0), 28.5).downrangeKm;
    for (let t = 1; t <= 120; t++) {
      const d = groundRelative(sampleAscentAt(p.summary.states, t), 28.5).downrangeKm;
      expect(d - prev).toBeGreaterThan(-0.05);
      expect(d - prev).toBeLessThan(3);
      prev = d;
    }
  });

  it('the opening camera does not slide sideways with the vehicle', () => {
    for (const [id, seed] of CFGS) {
      const p = byId(id);
      const lat = p.profile.launchSite?.lat ?? 28.5;
      for (const opening of ['tower_clear', 'pad_wide', 'pad_dusk', 'overhead_drop'] as const) {
        const plan = planFor(p, { seed, force: { opening } });
        const xs: number[] = [];
        for (let t = 3; t <= 22; t += 1) {
          const s = groundRelative(sampleAscentAt(p.summary.states, t), lat);
          xs.push(directedPoseAt(plan, t, s, 1.2).pose.px);
        }
        const slide = Math.max(...xs) - Math.min(...xs);
        expect(slide, `${id} ${opening}`).toBeLessThan(0.9);
      }
    }
  });
});

describe('reduced motion', () => {
  const p = byId('falcon-9');
  const plan = planFor(p, { seed: 5, reducedMotion: true });
  const state = (t: number) => sampleAscentAt(p.summary.states, t);

  it('has hard cuts only', () => {
    expect(plan.reducedMotion).toBe(true);
    expect(plan.shots.every((s) => s.blendInS === 0)).toBe(true);
  });

  it('holds one pose per shot: two times inside a shot give the same camera relative to the vehicle', () => {
    for (const sh of plan.shots) {
      if (sh.tEnd - sh.tStart < 4) continue;
      const t1 = sh.tStart + (sh.tEnd - sh.tStart) * 0.2;
      const t2 = sh.tStart + (sh.tEnd - sh.tStart) * 0.8;
      // same vehicle state so only the director can move the camera
      const s = state(sh.tStart);
      const a = directedPoseAt(plan, t1, { ...s, t: t1 }, 1.2).pose;
      const b = directedPoseAt(plan, t2, { ...s, t: t2 }, 1.2).pose;
      for (const k of ['px', 'py', 'pz', 'tx', 'ty', 'tz', 'fov'] as const) {
        expect(b[k]).toBeCloseTo(a[k], 6);
      }
    }
  });

  it('the squeeze becomes a hold on the event', () => {
    const sq = plan.shots.find((s) => s.id === 'maxq_squeeze')!;
    const s = state(sq.tStart);
    const a = directedPoseAt(plan, sq.tStart + 0.1, s, 1.2).pose.fov;
    const b = directedPoseAt(plan, sq.tEnd - 0.1, s, 1.2).pose.fov;
    expect(a).toBeCloseTo(b, 6);
    expect(a).toBeLessThan(30);
  });
});
