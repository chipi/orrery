import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { descentPlayClock, wallTimeLayout } from './fly-clock';
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

describe('wallTimeLayout', () => {
  it('round-trips and is monotone', () => {
    // Fast in the middle: wall seconds per clock second dip there.
    const L = wallTimeLayout(100, (a, b) => (b - a) * (Math.abs((a + b) / 2 - 50) < 20 ? 0.1 : 1));
    expect(L.total).toBeCloseTo(60 + 4, 0);
    let prev = -1;
    for (let t = 0; t <= 100; t += 2.5) {
      const w = L.toBar(t);
      expect(w).toBeGreaterThan(prev);
      prev = w;
      expect(L.fromBar(w)).toBeCloseTo(t, 1);
    }
  });

  it('falls back to the clock itself when the act has no length', () => {
    const L = wallTimeLayout(0, () => 0);
    expect(L.toBar(3)).toBe(3);
  });
});

// F8 phase 2 (W6): the descent band of the bar is laid out by watching time, so playing at the
// default pill moves the playhead evenly while the clock itself runs fast and slow.
describe('the descent band moves evenly at the default pill', () => {
  for (const id of ['curiosity', 'apollo11']) {
    it(id, () => {
      const s = summary(id);
      const c = descentPlayClock(s)!;
      const dt = 0.25;
      let t = 0;
      const steps: number[] = [];
      while (t < s.totalDurationS - 1e-6 && steps.length < 4000) {
        const t2 = c.advance(t, dt, 3);
        steps.push(c.layout.toBar(t2) - c.layout.toBar(t));
        t = t2;
      }
      // A step across a separation's slow beat can be off by a little (the rate turns within a
      // table cell); the rest move by one wall step.
      const inner = steps.slice(2, -2);
      for (const d of inner) expect(Math.abs(d - dt)).toBeLessThan(0.1);
      const even = inner.filter((d) => Math.abs(d - dt) < 0.02).length;
      expect(even / inner.length).toBeGreaterThan(0.95);
      expect(steps.length * dt).toBeCloseTo(c.layout.total, -1);
    });
  }
});
