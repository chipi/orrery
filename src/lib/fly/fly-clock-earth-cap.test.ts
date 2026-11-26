import { beforeAll, describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { descentPlayClock, EARTH_ENTRY_PLAY_CAP_S } from './fly-clock';
import {
  expandDescentProfile,
  type RawDescentProfile,
} from '$lib/physics/descent/descent-profile-registry';
import { integrateDescent } from '$lib/physics/descent/descent-physics';

const PROFILES = ['apollo11-splashdown', 'friendship-7', 'gemini4', 'curiosity'];
// Integrated once, before the tests: CI ran this file 10.4 s against the 5 s test default when
// every call integrated again (2026-11-26).
const summaries = new Map<string, ReturnType<typeof integrateDescent>>();
function summary(id: string) {
  const s = summaries.get(id);
  if (!s) throw new Error(`profile ${id} not in PROFILES`);
  return s;
}

function wallToEnd(id: string, speed: number): number {
  const s = summary(id);
  const c = descentPlayClock(s)!;
  const dt = 1 / 60;
  let t = 0;
  let wall = 0;
  while (t < s.totalDurationS - 1e-6 && wall < 2000) {
    t = c.advance(t, dt, speed);
    wall += dt;
  }
  return wall;
}

describe('descent play clock: the Earth entry cap', () => {
  beforeAll(() => {
    for (const id of PROFILES) {
      const p = resolve(__dirname, `../../../static/data/descent-profiles/${id}.json`);
      summaries.set(
        id,
        integrateDescent(
          expandDescentProfile(JSON.parse(readFileSync(p, 'utf-8')) as RawDescentProfile),
        ),
      );
    }
  });

  it('an Earth entry plays in about the capped length at the default speed', () => {
    for (const id of ['apollo11-splashdown', 'friendship-7', 'gemini4']) {
      const w = wallToEnd(id, 3);
      expect(w).toBeLessThanOrEqual(EARTH_ENTRY_PLAY_CAP_S + 1);
      expect(w).toBeGreaterThan(EARTH_ENTRY_PLAY_CAP_S - 5);
    }
  });

  it('a faster pill still plays it faster', () => {
    expect(wallToEnd('apollo11-splashdown', 10)).toBeLessThan(
      wallToEnd('apollo11-splashdown', 3) / 2,
    );
  });

  it('other bodies are not capped', () => {
    expect(wallToEnd('curiosity', 3)).toBeGreaterThan(EARTH_ENTRY_PLAY_CAP_S + 20);
  });
});
