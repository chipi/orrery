import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { descentPlayClock, EARTH_ENTRY_PLAY_CAP_S } from './fly-clock';
import {
  expandDescentProfile,
  type RawDescentProfile,
} from '$lib/physics/descent/descent-profile-registry';
import { integrateDescent } from '$lib/physics/descent/descent-physics';

function summary(id: string) {
  const p = resolve(__dirname, `../../../static/data/descent-profiles/${id}.json`);
  return integrateDescent(
    expandDescentProfile(JSON.parse(readFileSync(p, 'utf-8')) as RawDescentProfile),
  );
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
