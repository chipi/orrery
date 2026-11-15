import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { integrateAscent, type LaunchProfile, type AscentEvent } from './ascent-physics';
import { buildAscentBeats } from '$lib/orbital/ascent-hud';

/**
 * Staging timeline of every launcher against its real nominal flight (2026-11-15 audit,
 * docs/wip/2026-11-15-launcher-timeline-audit.md). Each row is one event: the model time
 * must land within `tol` seconds of `real`. Tolerances: staging / booster sep ±10 s,
 * MECO ±10 s, SECO / orbit ±30 s. The source of each `real` is in the comment on its row.
 */
const load = (id: string): LaunchProfile =>
  JSON.parse(
    readFileSync(resolve(__dirname, `../../../../static/data/launch-profiles/${id}.json`), 'utf-8'),
  ) as LaunchProfile;

const first = (events: AscentEvent[], type: AscentEvent['type'], nth = 0): number | undefined =>
  events.filter((e) => e.type === type)[nth]?.t;

interface Row {
  event: string;
  type: AscentEvent['type'];
  /** Which occurrence of that event type (0 = first). */
  nth?: number;
  real: number;
  tol: number;
}

const TIMELINES: Record<string, Row[]> = {
  'space-shuttle-stack': [
    // NASA STS: SRBs jettisoned ~2 min after launch at ~45 km, burn time 123 s
    // (Wikipedia "Space Shuttle Solid Rocket Booster", "Space Shuttle" — secondary).
    { event: 'SRB sep', type: 'staging', nth: 0, real: 123, tol: 10 },
    // MECO at T+8:30 (510 s); Wikipedia "Space Shuttle external tank".
    { event: 'MECO', type: 'meco', real: 510, tol: 10 },
    // ET separated 18 s after MECO (Wikipedia "Space Shuttle").
    { event: 'ET sep', type: 'staging', nth: 1, real: 528, tol: 10 },
  ],
};

describe('launcher staging timelines vs the real nominal flight', () => {
  for (const [id, rows] of Object.entries(TIMELINES)) {
    describe(id, () => {
      const sum = integrateAscent(load(id));
      for (const r of rows) {
        it(`${r.event} at ~T+${r.real} s (±${r.tol})`, () => {
          const t = first(sum.events, r.type, r.nth ?? 0);
          expect(t).toBeDefined();
          expect(Math.abs((t as number) - r.real)).toBeLessThanOrEqual(r.tol);
        });
      }
    });
  }
});

describe('Space Shuttle ascent: no SECO, the tank leaves 18 s after MECO', () => {
  const sum = integrateAscent(load('space-shuttle-stack'));

  it('the SRBs burn a real 123 s on a burn-average thrust, not 94 s at peak thrust', () => {
    const srb = load('space-shuttle-stack').boosters!;
    expect(srb.thrustSlKN).toBeLessThan(12000); // average, not the 12 MN liftoff figure
    expect(first(sum.events, 'staging', 0)).toBeGreaterThan(115);
  });

  it('ET separation trails MECO by the stage separationDelayS', () => {
    const meco = first(sum.events, 'meco')!;
    const et = first(sum.events, 'staging', 1)!;
    expect(et - meco).toBeGreaterThanOrEqual(18);
    expect(et - meco).toBeLessThan(18.5);
  });

  it('the ET stays on the orbiter between MECO and its separation (no thrust, tank mass kept)', () => {
    const meco = first(sum.events, 'meco')!;
    const mid = sum.states.find((s) => s.t >= meco + 5)!;
    expect(mid.thrustN).toBe(0);
    expect(mid.stageIndex).toBe(0);
  });

  it('the beat list is LIFTOFF-side beats, MECO, STAGE SEP (the tank), ORBIT, and no SECO', () => {
    const labels = buildAscentBeats(sum).map((b) => b.label);
    expect(labels).not.toContain('SECO');
    expect(labels.filter((l) => l === 'MECO')).toHaveLength(1);
    expect(labels.at(-1)).toBe('ORBIT');
    const beats = buildAscentBeats(sum);
    const meco = beats.find((b) => b.label === 'MECO')!;
    const sep = beats.filter((b) => b.label === 'STAGE SEP').at(-1)!;
    expect(sep.t - meco.t).toBeGreaterThan(17);
  });

  it('the camera/clock bookkeeping event stays in the event list, flagged silent', () => {
    const seco = sum.events.find((e) => e.type === 'seco')!;
    expect(seco.silent).toBe(true);
  });

  it('other vehicles keep their SECO beat', () => {
    const f9 = integrateAscent(load('falcon-9'));
    expect(buildAscentBeats(f9).map((b) => b.label)).toContain('SECO');
    expect(f9.events.some((e) => e.silent)).toBe(false);
  });
});
