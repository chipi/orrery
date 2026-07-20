import { describe, it, expect } from 'vitest';
import {
  activeShotAt,
  buildShotSchedule,
  composeShot,
  selectShot,
  sepProgress,
  sepSlowmoFactor,
  SEP_SLOWMO_MIN_FACTOR,
  SEP_SLOWMO_WINDOW_S,
  type AscentShotName,
} from './ascent-cameras';
import { integrateAscent, type AscentState } from './ascent-physics';
import { FALCON9_SAMPLE } from './ascent-profiles';

const summary = integrateAscent(FALCON9_SAMPLE);
const schedule = buildShotSchedule({
  events: summary.events,
  maxQt: summary.maxQ.t,
  duration: summary.totalDurationS,
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
  const shots: AscentShotName[] = [
    'pad',
    'tower_clear',
    'ascent',
    'onboard_down',
    'staging',
    'fairing',
    'chase',
    'separation',
    'orbit',
  ];

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

describe('fairing shot', () => {
  it('is slotted at the fairing-jettison beat, between staging and separation', () => {
    const names = schedule.map((w) => w.name);
    expect(names).toContain('fairing');
    expect(names.indexOf('fairing')).toBeGreaterThan(names.indexOf('staging'));
    expect(names.indexOf('fairing')).toBeLessThan(names.indexOf('separation'));
    // The fairing window brackets the fairing_jettison MET.
    const met = summary.events.find((e) => e.type === 'fairing_jettison')!.t;
    const w = schedule.find((x) => x.name === 'fairing')!;
    expect(met).toBeGreaterThanOrEqual(w.tStart);
    expect(met).toBeLessThanOrEqual(w.tEnd);
  });
});

describe('sepSlowmoFactor', () => {
  const events = [100, 200, 300];

  it('is full rate (1) far from any event', () => {
    expect(sepSlowmoFactor(50, events)).toBe(1);
    expect(sepSlowmoFactor(150, events)).toBe(1); // exactly between, > window away
  });

  it('holds at the minimum factor across the flat zone straddling the event', () => {
    expect(sepSlowmoFactor(200, events)).toBeCloseTo(SEP_SLOWMO_MIN_FACTOR, 6);
    // A small offset within the hold zone is still full-slow.
    const hold = SEP_SLOWMO_WINDOW_S * 0.18;
    expect(sepSlowmoFactor(200 + hold * 0.5, events)).toBeCloseTo(SEP_SLOWMO_MIN_FACTOR, 6);
  });

  it('eases smoothly between full rate and the minimum inside the window', () => {
    const mid = sepSlowmoFactor(100 + SEP_SLOWMO_WINDOW_S * 0.5, events);
    expect(mid).toBeGreaterThan(SEP_SLOWMO_MIN_FACTOR);
    expect(mid).toBeLessThan(1);
    // Monotone on the ramp-out: closer to the event ⇒ slower.
    expect(sepSlowmoFactor(100 + 0.8, events)).toBeLessThan(sepSlowmoFactor(100 + 2.5, events));
  });

  it('is asymmetric — the ramp-out lingers longer than the slow-in', () => {
    // Equal distance before vs after the event: the "after" side is still
    // slower (longer savor ramp) than the "before" side at the same offset.
    const off = SEP_SLOWMO_WINDOW_S; // beyond the slow-in half-width, inside ramp-out
    expect(sepSlowmoFactor(100 + off, events)).toBeLessThan(sepSlowmoFactor(100 - off, events));
    // Slow-in is the quicker side: a point one window before the event is full rate.
    expect(sepSlowmoFactor(100 - off, events)).toBe(1);
    // The mirror point after the event is still slowed.
    expect(sepSlowmoFactor(100 + off, events)).toBeLessThan(1);
  });

  it('ignores undefined event times and returns 1 when none are defined', () => {
    expect(sepSlowmoFactor(200, [undefined, undefined])).toBe(1);
    expect(sepSlowmoFactor(200, [])).toBe(1);
    expect(sepSlowmoFactor(300.2, [undefined, 300])).toBeLessThan(1);
  });

  it('respects a custom window', () => {
    // With a 100-s window, a point 40 s after the event is still slowed.
    expect(sepSlowmoFactor(140, events, 100)).toBeLessThan(1);
    // With the default ~3-s window, the same point is full rate.
    expect(sepSlowmoFactor(140, events)).toBe(1);
  });
});
