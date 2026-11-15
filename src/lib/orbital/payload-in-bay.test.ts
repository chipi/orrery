import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  integrateAscent,
  sampleAscentAt,
  type LaunchProfile,
} from '$lib/physics/ascent/ascent-physics';
import { launchSeparationTimes } from '$lib/fly/fly-clock';
import { launchInjection, payloadSepTFor } from './ascent-hud';
import { buildPlanBeats } from './flight-plan-beats';
import { buildDirectorPlan } from './ascent-director';

const load = (id: string): LaunchProfile =>
  JSON.parse(
    readFileSync(resolve(__dirname, `../../../static/data/launch-profiles/${id}.json`), 'utf-8'),
  ) as LaunchProfile;

const IUS = { burnType: 'tmi', kickStage: true, stageName: 'IUS' } as never;

describe('payloadInBay (the Space Shuttle keeps its payload in the bay)', () => {
  const shuttle = load('space-shuttle-stack');
  const falcon = load('falcon-9');

  it('only the Shuttle profile carries the flag', () => {
    expect(shuttle.payloadInBay).toBe(true);
    expect(falcon.payloadInBay).toBeUndefined();
  });

  it('the Shuttle launch has no injection beat, so no parking orbit, burn or spacecraft separation', () => {
    expect(launchInjection(shuttle, IUS)).toBeNull();
    const sum = integrateAscent(shuttle);
    const labels = buildPlanBeats(sum, launchInjection(shuttle, IUS)).map((b) => b.label);
    expect(labels).not.toContain('SPACECRAFT SEP');
    expect(labels).not.toContain('PARKING ORBIT');
    expect(payloadSepTFor(sum.totalDurationS, launchInjection(shuttle, IUS))).toBeUndefined();
  });

  it('the physics events hold no payload separation, and no fairing jettison', () => {
    const types = integrateAscent(shuttle).events.map((e) => e.type);
    expect(types).not.toContain('fairing_jettison');
    expect(types.filter((t) => t === 'staging')).toHaveLength(2); // SRBs, then the tank with MECO
  });

  it('the slow-motion separation times drop the SECO payload event for the Shuttle only', () => {
    const sum = integrateAscent(shuttle);
    const seco = sum.events.find((e) => e.type === 'seco')!.t;
    expect(launchSeparationTimes(sum, undefined, false)).toContain(seco);
    expect(launchSeparationTimes(sum, undefined, true)).not.toContain(seco);
  });

  it('a non-Shuttle profile keeps its beats unchanged', () => {
    const sum = integrateAscent(falcon);
    expect(launchInjection(falcon, IUS)).toBe(IUS);
    const labels = buildPlanBeats(sum, launchInjection(falcon, IUS)).map((b) => b.label);
    expect(labels).toContain('SPACECRAFT SEP');
    expect(labels).toContain('PARKING ORBIT');
  });

  it('the director plan has no payload-separation shot with the flag, and one without', () => {
    const mk = (p: LaunchProfile, bay: boolean) => {
      const s = integrateAscent(p);
      return buildDirectorPlan({
        vehicleId: p.id,
        events: s.events,
        maxQt: s.maxQ.t,
        duration: s.totalDurationS,
        altAt: (t) => sampleAscentAt(s.states, t).altKm,
        payloadInBay: bay,
      });
    };
    expect(mk(shuttle, true).shots.some((s) => s.id === 'separation')).toBe(false);
    expect(mk(shuttle, true).shots.at(-1)!.id).toBe('orbit');
    expect(mk(falcon, false).shots.some((s) => s.id === 'separation')).toBe(true);
  });
});
