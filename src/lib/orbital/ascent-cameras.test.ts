import { describe, it, expect } from 'vitest';
import {
  activeShotAt,
  buildShotSchedule,
  composeShot,
  selectShot,
  sepProgress,
  type AscentShotName,
} from './ascent-cameras';
import { integrateAscent, type AscentState } from './ascent-physics';
import { FALCON9_SAMPLE } from './ascent-profiles';

const summary = integrateAscent(FALCON9_SAMPLE);
const schedule = buildShotSchedule({
  events: summary.events,
  maxQt: summary.maxQ.t,
  duration: summary.states.at(-1)!.t,
});

describe('buildShotSchedule', () => {
  it('spans [0, duration] with no gaps and no inversions', () => {
    expect(schedule[0].tStart).toBe(0);
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].tStart).toBeCloseTo(schedule[i - 1].tEnd, 5);
      expect(schedule[i].tEnd).toBeGreaterThan(schedule[i].tStart);
    }
    expect(schedule.at(-1)!.tEnd).toBeCloseTo(summary.states.at(-1)!.t, 5);
  });

  it('opens on the pad and ends on the orbit limb', () => {
    expect(schedule[0].name).toBe('pad');
    expect(schedule.at(-1)!.name).toBe('orbit');
  });

  it('includes a staging beat for a two-stage vehicle', () => {
    expect(schedule.map((w) => w.name)).toContain('staging');
  });
});

describe('selectShot', () => {
  it('clamps below the first + above the last window', () => {
    expect(selectShot(schedule, -5)).toBe('pad');
    expect(selectShot(schedule, 1e9)).toBe('orbit');
  });

  it('picks the pad shot at ignition and a later shot downrange', () => {
    expect(selectShot(schedule, 1)).toBe('pad');
    const late: AscentShotName = selectShot(schedule, summary.states.at(-1)!.t - 1);
    expect(late).toBe('orbit');
  });
});

describe('composeShot', () => {
  const state: AscentState = summary.states[Math.floor(summary.states.length / 2)];
  const shots: AscentShotName[] = ['pad', 'tower_clear', 'ascent', 'onboard_down', 'staging', 'chase', 'separation', 'orbit'];

  it('returns finite poses with sane FOV for every shot', () => {
    for (const name of shots) {
      const p = composeShot(name, state, 1.2);
      for (const v of [p.px, p.py, p.pz, p.tx, p.ty, p.tz, p.fov]) {
        expect(Number.isFinite(v)).toBe(true);
      }
      expect(p.fov).toBeGreaterThan(20);
      expect(p.fov).toBeLessThan(90);
    }
  });

  it('keeps the camera above the ground for the pad shot', () => {
    const p = composeShot('pad', summary.states[0], 1.2);
    expect(p.py).toBeGreaterThan(0);
  });
});

describe('director-cut motion', () => {
  const st = summary.states[Math.floor(summary.states.length / 2)];

  it('activeShotAt reports progress 0→1 across a shot window', () => {
    const first = schedule[0];
    expect(activeShotAt(schedule, first.tStart).progress).toBeCloseTo(0, 5);
    const mid = (first.tStart + first.tEnd) / 2;
    expect(activeShotAt(schedule, mid).progress).toBeCloseTo(0.5, 2);
  });

  it('the pad camera orbits — pose changes across progress', () => {
    const a = composeShot('pad', summary.states[0], 1.2, 0.05);
    const b = composeShot('pad', summary.states[0], 1.2, 0.95);
    // A real orbit sweep moves the camera in x or z appreciably.
    expect(Math.hypot(a.px - b.px, a.pz - b.pz)).toBeGreaterThan(0.5);
  });

  it('the ascent shot dollies out — distance grows with progress', () => {
    const near = composeShot('ascent', st, 1.2, 0.0);
    const far = composeShot('ascent', st, 1.2, 1.0);
    const dNear = Math.hypot(near.px - near.tx, near.py - near.ty, near.pz - near.tz);
    const dFar = Math.hypot(far.px - far.tx, far.py - far.ty, far.pz - far.tz);
    expect(dFar).toBeGreaterThan(dNear);
  });
});

describe('sepProgress', () => {
  it('is 0 before the event, ramps linearly, then clamps at 1', () => {
    expect(sepProgress(90, 100, 4)).toBe(0);
    expect(sepProgress(100, 100, 4)).toBe(0);
    expect(sepProgress(102, 100, 4)).toBeCloseTo(0.5, 5);
    expect(sepProgress(104, 100, 4)).toBe(1);
    expect(sepProgress(500, 100, 4)).toBe(1);
  });

  it('returns 0 when the event never fired or duration is non-positive', () => {
    expect(sepProgress(120, undefined, 4)).toBe(0);
    expect(sepProgress(120, 100, 0)).toBe(0);
  });
});

describe('separation shot', () => {
  it('is slotted between chase and orbit', () => {
    const names = schedule.map((w) => w.name);
    expect(names).toContain('separation');
    expect(names.indexOf('separation')).toBeGreaterThan(names.indexOf('chase'));
    expect(names.indexOf('separation')).toBeLessThan(names.indexOf('orbit'));
  });
});
