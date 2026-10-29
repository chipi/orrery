import { describe, it, expect, vi } from 'vitest';
import {
  applyMissionToPage,
  applyPlanSelectionMoonToPage,
  applyPlanSelectionToPage,
  applyScenarioToPage,
  type FlyApplyContext,
} from './apply-to-page';
import type { FlyUpdaters } from '$lib/three/fly-updaters';
import type { Mission } from '$types/mission';
import type { LocalizedScenario } from '$types/scenario';

const SCENARIO = {
  id: 'orrery-1',
  schema: 1,
  status: 'demo',
  type: 'free-return flyby',
  dest: 'MARS',
  name: 'ORRERY DEMO',
  vehicle: 'Falcon Heavy',
  payload: '10 t',
  dep_day: 9000,
  flyby_day: 9250,
  arr_day: 9500,
  dv_total_km_s: 12.5,
  dv_used_km_s: 11,
  dep_label: '2024 Sep',
  arr_label: '2025 Jun',
  events: [],
} as unknown as LocalizedScenario;

const MISSION = {
  id: 'test-mission',
  name: 'Test Mission',
  status: 'flown',
  type: 'flyby',
  dest: 'MARS',
  agency: 'NASA',
  country: 'United States',
  vehicle: 'Atlas V',
  payload: 'Test Payload',
  delta_v: '4.2 km/s',
  departure_date: '2020-07-30',
  arrival_date: '2021-02-18',
  transit_days: 203,
  summary: '',
  events: [],
} as unknown as Mission;

function harness(opts: { openingActive?: boolean; updaters?: boolean } = {}) {
  const log: string[] = [];
  const values: Record<string, unknown> = {};
  const set =
    (name: string) =>
    (v: unknown): void => {
      log.push(name);
      values[name] = v;
    };
  const helio = {
    applyDestination: vi.fn(() => log.push('helio.applyDestination')),
    setSpacecraftModel: vi.fn((id: string) => log.push(`helio.setSpacecraftModel:${id}`)),
    resetCamera: vi.fn(() => log.push('helio.resetCamera')),
  };
  const cislunar = {
    rebuildLines: vi.fn(() => log.push('cislunar.rebuildLines')),
    rebuildAnnotations: vi.fn(() => log.push('cislunar.rebuildAnnotations')),
  };
  const updaters = { helio, cislunar } as unknown as FlyUpdaters;
  const ctx: FlyApplyContext = {
    setArcTimeline: set('arcTimeline'),
    setIsFreeReturn: set('isFreeReturn'),
    setIsMoonMission: set('isMoonMission'),
    setActiveDestination: set('activeDestination'),
    setCurrentDestMeshId: set('currentDestMeshId'),
    setCislunarTrajectory: set('cislunarTrajectory'),
    setInterplanetaryTrajectory: set('interplanetaryTrajectory'),
    setOutPts: set('outPts'),
    setRetPts: set('retPts'),
    setMission: set('mission'),
    setSimDay: set('simDay'),
    setSimSpeed: set('simSpeed'),
    setMissionEvents: set('missionEvents'),
    setLastAppliedMissionId: set('lastAppliedMissionId'),
    getFlyUpdaters: () => (opts.updaters === false ? undefined : updaters),
    resetCinematicForMissionSwap: () => log.push('resetCinematic'),
    isOpeningActive: () => opts.openingActive ?? false,
    getOpeningDurationMs: () => 12000,
    setLaunchDwellUntil: set('launchDwellUntil'),
    now: () => 5000,
    missionDefaults: {
      depFallback: 9000,
      dvFallback: 15,
      depLabelFallback: 'DEP TBD',
      arrLabelFallback: 'ARR TBD',
    },
    planDefaults: { dvFallback: 15 },
    defaultScenarioId: 'orrery-1',
  };
  return { ctx, log, values, helio, cislunar };
}

describe('applyScenarioToPage', () => {
  it('writes in the scenario order: isMoonMission AFTER the helio destination call', () => {
    const h = harness();
    applyScenarioToPage(h.ctx, SCENARIO);
    expect(h.log).toEqual([
      'arcTimeline',
      'isFreeReturn',
      'activeDestination',
      'helio.applyDestination',
      'currentDestMeshId',
      'helio.setSpacecraftModel:orrery-1',
      'isMoonMission',
      'cislunarTrajectory',
      'interplanetaryTrajectory',
      'outPts',
      'retPts',
      'helio.resetCamera',
      'mission',
      'simDay',
      'missionEvents',
      'resetCinematic',
      'launchDwellUntil',
      'lastAppliedMissionId',
    ]);
    expect(h.values.simDay).toBe(9000);
    expect(h.values.lastAppliedMissionId).toBe('orrery-1');
  });

  it('is a no-op on the three-side when the updaters are not mounted yet', () => {
    const h = harness({ updaters: false });
    applyScenarioToPage(h.ctx, SCENARIO);
    expect(h.helio.applyDestination).not.toHaveBeenCalled();
    expect(h.values.lastAppliedMissionId).toBe('orrery-1');
  });

  it('dwell is 4 s without an opening, opening duration + 300 ms with one', () => {
    const plain = harness({ openingActive: false });
    applyScenarioToPage(plain.ctx, SCENARIO);
    expect(plain.values.launchDwellUntil).toBe(5000 + 4000);
    const opening = harness({ openingActive: true });
    applyScenarioToPage(opening.ctx, SCENARIO);
    expect(opening.values.launchDwellUntil).toBe(5000 + 12000 + 300);
  });
});

describe('applyMissionToPage', () => {
  it('writes isMoonMission BEFORE the helio destination call and the id LAST', () => {
    const h = harness();
    applyMissionToPage(h.ctx, MISSION);
    expect(h.log.indexOf('isMoonMission')).toBeLessThan(h.log.indexOf('helio.applyDestination'));
    expect(h.log.indexOf('simSpeed')).toBeLessThan(h.log.indexOf('resetCinematic'));
    expect(h.log.indexOf('resetCinematic')).toBeLessThan(h.log.indexOf('launchDwellUntil'));
    expect(h.log.at(-1)).toBe('lastAppliedMissionId');
    expect(h.values.lastAppliedMissionId).toBe('test-mission');
    expect(h.log).toContain('helio.setSpacecraftModel:test-mission');
    expect(h.cislunar.rebuildLines).toHaveBeenCalledTimes(1);
    expect(h.cislunar.rebuildAnnotations).toHaveBeenCalledTimes(1);
  });
});

describe('applyPlanSelectionToPage', () => {
  it('clears the spacecraft model and commits the plan-<dest>-<type> id last', () => {
    const h = harness();
    applyPlanSelectionToPage(h.ctx, 'mars', 'LANDING', 9000, 200);
    expect(h.log).toContain('helio.setSpacecraftModel:');
    expect(h.log).not.toContain('simSpeed');
    expect(h.log.at(-1)).toBe('lastAppliedMissionId');
    expect(String(h.values.lastAppliedMissionId)).toMatch(/^plan-/);
  });
});

describe('applyPlanSelectionMoonToPage', () => {
  it('forces the Moon-mission sim speed before the cinematic reset', () => {
    const h = harness();
    applyPlanSelectionMoonToPage(h.ctx, 9000, 3.5);
    expect(h.values.simSpeed).toBe(0.4);
    expect(h.values.isMoonMission).toBe(true);
    expect(h.log.indexOf('simSpeed')).toBeLessThan(h.log.indexOf('resetCinematic'));
    expect(h.log.at(-1)).toBe('lastAppliedMissionId');
  });
});
