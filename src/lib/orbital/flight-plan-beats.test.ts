import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { integrateAscent } from '$lib/physics/ascent/ascent-physics';
import { buildGenericProfile } from '$lib/physics/ascent/launch-profile-registry';
import { integrateDescent } from '$lib/physics/descent/descent-physics';
import { expandDescentProfile } from '$lib/physics/descent/descent-profile-registry';
import { buildDescentBeats } from './descent-hud';
import { buildPlanBeats, descentPlanBeats } from './flight-plan-beats';

const summary = integrateAscent(buildGenericProfile('x', 'X'));

describe('buildPlanBeats — the flight plan shared by the HUD list and the play bar', () => {
  it('opens with LIFTOFF at t=0 and carries the ascent beats in time order', () => {
    const beats = buildPlanBeats(summary, null);
    expect(beats[0]).toEqual({ label: 'LIFTOFF', t: 0 });
    expect(beats.map((b) => b.label)).toContain('MAX-Q');
    expect(beats.map((b) => b.label)).toContain('SECO');
    const ts = beats.map((b) => b.t);
    expect(ts).toEqual([...ts].sort((a, b) => a - b));
  });

  it('drops ORBIT when it lands on the same second as SECO (the cutoff is the beat)', () => {
    const labels = buildPlanBeats(summary, null).map((b) => b.label);
    const seco = labels.includes('SECO');
    const orbit = labels.includes('ORBIT');
    expect(seco && orbit).toBe(false);
  });

  it('adds the parking orbit, the injection burn and the spacecraft separation when the mission leaves orbit', () => {
    const beats = buildPlanBeats(summary, { burnType: 'TMI' } as never);
    const tail = beats.slice(-3);
    expect(tail.map((b) => b.label)).toEqual([
      'PARKING ORBIT',
      'TRANS-MARS INJECTION',
      'SPACECRAFT SEP',
    ]);
    expect(tail.every((b) => b.untimed)).toBe(true);
    expect(tail[0].t).toBeCloseTo(summary.totalDurationS, 6);
    expect(tail[2].t).toBeGreaterThan(tail[1].t);
  });

  it('adds a timed separation the vehicle delay after SECO when there is no injection beat', () => {
    const beats = buildPlanBeats(summary, null, 169);
    const last = beats[beats.length - 1];
    expect(last).toEqual({ label: 'SPACECRAFT SEP', t: summary.totalDurationS + 169 });
    expect(buildPlanBeats(summary, { burnType: 'TMI' } as never, 169).at(-1)?.untimed).toBe(true);
    expect(buildPlanBeats(summary, null).map((b) => b.label)).not.toContain('SPACECRAFT SEP');
  });
});

describe('descentPlanBeats — descent beats in the bar’s own (unwarped) clock', () => {
  const profile = expandDescentProfile(
    JSON.parse(readFileSync('static/data/descent-profiles/curiosity.json', 'utf8')),
  );
  const dsum = integrateDescent(profile);

  it('has one beat per timeline-strip beat, in order, none past the descent duration', () => {
    const beats = descentPlanBeats(dsum);
    expect(beats.map((b) => b.label)).toEqual(buildDescentBeats(dsum).map((b) => b.label));
    const ts = beats.map((b) => b.t);
    expect(ts).toEqual([...ts].sort((a, b) => a - b));
    expect(ts.at(-1)!).toBeLessThanOrEqual(dsum.totalDurationS + 1e-6);
  });
});
