import { describe, it, expect } from 'vitest';
import { buildShotSchedule, composeShot, selectShot, type AscentShotName } from './ascent-cameras';
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
  const shots: AscentShotName[] = ['pad', 'tower_clear', 'ascent', 'onboard_down', 'staging', 'chase', 'orbit'];

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
