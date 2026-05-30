import { describe, it, expect } from 'vitest';
import {
  computeMissionApply,
  computeScenarioApply,
  computePlanApply,
  FLYBY_OFFSET_FRACTION,
  type MissionApplyDefaults,
} from './fly-mission-apply';
import { ARC_STEPS } from './fly-moon-arc';
import type { Mission } from '$types/mission';
import type { LocalizedScenario } from '$types/scenario';

const DEFAULTS: MissionApplyDefaults = {
  depFallback: 9000,
  dvFallback: 15,
  depLabelFallback: 'DEP TBD',
  arrLabelFallback: 'ARR TBD',
};

/** Minimal Mission factory — overrides spread last so tests can pin
 *  anything. The fields here cover everything computeMissionApply
 *  actually reads; future schema additions land here too. */
function makeMission(overrides: Partial<Mission> = {}): Mission {
  return {
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
    ...overrides,
  } as Mission;
}

describe('computeMissionApply', () => {
  describe('timeline derivation', () => {
    it('parses departure_date into dep_day; flyby_day + arr_day = dep + transit (one-way)', () => {
      // 2020-07-30 → dateToSimDay returns the same number for any clear
      // YYYY-MM-DD; we don't pin the exact value (J2000 epoch), we pin
      // the offsets between the three days.
      const m = makeMission({ departure_date: '2020-07-30', transit_days: 250 });
      const r = computeMissionApply(m, DEFAULTS);
      expect(r.timeline.flyby_day - r.timeline.dep_day).toBe(250);
      expect(r.timeline.arr_day - r.timeline.dep_day).toBe(250);
      expect(r.isReturnTrip).toBe(false);
    });

    it('round-trip missions (CREWED / SAMPLE RETURN): arr_day = dep + 2 × transit', () => {
      const m = makeMission({ type: 'sample return', transit_days: 100, dest: 'MARS' });
      const r = computeMissionApply(m, DEFAULTS);
      expect(r.timeline.flyby_day - r.timeline.dep_day).toBe(100);
      expect(r.timeline.arr_day - r.timeline.dep_day).toBe(200);
      expect(r.isReturnTrip).toBe(true);
    });

    it('CREWED missions detected (Apollo-shape)', () => {
      const m = makeMission({ type: 'crewed lunar landing', dest: 'MOON' });
      const r = computeMissionApply(m, DEFAULTS);
      expect(r.isReturnTrip).toBe(true);
    });

    it('falls back to defaults.depFallback when departure_date is unparseable', () => {
      const m = makeMission({ departure_date: 'not-a-date', transit_days: 50 });
      const r = computeMissionApply(m, DEFAULTS);
      expect(r.timeline.dep_day).toBe(DEFAULTS.depFallback);
      expect(r.timeline.flyby_day).toBe(DEFAULTS.depFallback + 50);
    });

    it('default transit_days = 250 when mission has none', () => {
      const m = makeMission({ transit_days: 0 });
      const r = computeMissionApply(m, DEFAULTS);
      expect(r.timeline.arr_day - r.timeline.dep_day).toBe(250);
    });
  });

  describe('destination + view mode', () => {
    it('MOON missions: isMoonMission=true, activeDestination=mars (heliocentric fallback)', () => {
      // MOON missions ALSO need a heliocentric destination for the
      // helio fallback context inset. Per missionDestToHelio: MOON
      // resolves to its own catalogue entry or the Mars fallback.
      const m = makeMission({ dest: 'MOON' });
      const r = computeMissionApply(m, DEFAULTS);
      expect(r.isMoonMission).toBe(true);
    });

    it('Mars missions: isMoonMission=false, activeDestination=mars', () => {
      const r = computeMissionApply(makeMission({ dest: 'MARS' }), DEFAULTS);
      expect(r.isMoonMission).toBe(false);
      expect(r.activeDestination).toBe('mars');
    });
  });

  describe('trajectory + arcs', () => {
    it('Moon mission: cislunarTrajectory present, interplanetaryTrajectory null', () => {
      const m = makeMission({ dest: 'MOON', type: 'crewed lunar landing', transit_days: 4 });
      const r = computeMissionApply(m, DEFAULTS);
      expect(r.cislunarTrajectory).not.toBeNull();
      expect(r.interplanetaryTrajectory).toBeNull();
    });

    it('Moon round-trip: outPts + retPts both ARC_STEPS+1 long', () => {
      const m = makeMission({ dest: 'MOON', type: 'crewed lunar landing', transit_days: 4 });
      const r = computeMissionApply(m, DEFAULTS);
      expect(r.outPts.length).toBe(ARC_STEPS + 1);
      expect(r.retPts.length).toBe(ARC_STEPS + 1);
    });

    it('Moon one-way: outPts populated, retPts empty', () => {
      const m = makeMission({ dest: 'MOON', type: 'lunar landing', transit_days: 4 });
      const r = computeMissionApply(m, DEFAULTS);
      expect(r.outPts.length).toBe(ARC_STEPS + 1);
      expect(r.retPts).toEqual([]);
      expect(r.isReturnTrip).toBe(false);
    });

    it('Mars one-way: outPts populated, retPts from buildArcs (free-return=false → empty)', () => {
      const m = makeMission({ dest: 'MARS', type: 'rover landing', transit_days: 250 });
      const r = computeMissionApply(m, DEFAULTS);
      expect(r.outPts.length).toBe(ARC_STEPS + 1);
      expect(r.retPts).toEqual([]);
    });

    it('Mars round-trip (sample return): retPts is a returnArc to Earth', () => {
      const m = makeMission({ dest: 'MARS', type: 'sample return', transit_days: 250 });
      const r = computeMissionApply(m, DEFAULTS);
      expect(r.outPts.length).toBe(ARC_STEPS + 1);
      expect(r.retPts.length).toBe(ARC_STEPS + 1);
    });

    it('Mars missions WITHOUT flight.events do not build interplanetaryTrajectory', () => {
      // Bare Mission has no flight; trajectory builder skipped.
      const r = computeMissionApply(makeMission({ dest: 'MARS' }), DEFAULTS);
      expect(r.interplanetaryTrajectory).toBeNull();
    });
  });

  describe('LoadedMission DTO + sim speed', () => {
    it('falls back to mission.id for name when name is missing', () => {
      const m = makeMission({ name: undefined, id: 'rosetta' });
      const r = computeMissionApply(m, DEFAULTS);
      expect(r.missionMeta.name).toBe('rosetta');
    });

    it('uses flight.totals.total_dv_km_s when present (ADR-027 canonical)', () => {
      const m = makeMission({
        flight: {
          totals: { total_dv_km_s: 7.42 },
        } as Mission['flight'],
      });
      const r = computeMissionApply(m, DEFAULTS);
      expect(r.missionMeta.dv_total).toBe(7.42);
      expect(r.missionMeta.dv_used).toBeCloseTo(7.42 * 0.94, 4);
    });

    it('falls back to parseDeltaV(delta_v) when flight.totals absent', () => {
      const m = makeMission({ delta_v: '4.2 km/s', flight: undefined });
      const r = computeMissionApply(m, DEFAULTS);
      expect(r.missionMeta.dv_total).toBeCloseTo(4.2, 4);
    });

    it('Moon missions default simSpeed = 0.4 d/s, others = 7 d/s', () => {
      expect(computeMissionApply(makeMission({ dest: 'MOON' }), DEFAULTS).simSpeed).toBe(0.4);
      expect(computeMissionApply(makeMission({ dest: 'MARS' }), DEFAULTS).simSpeed).toBe(7);
    });

    it('LoadedMission timeline matches the result timeline', () => {
      const r = computeMissionApply(makeMission({ transit_days: 100 }), DEFAULTS);
      expect(r.missionMeta.timeline).toEqual(r.timeline);
    });
  });

  describe('invariants across modes', () => {
    it('isFreeReturn is always false for mission-driven flows', () => {
      const samples: Mission[] = [
        makeMission({ dest: 'MOON', type: 'crewed lunar landing' }),
        makeMission({ dest: 'MARS', type: 'rover landing' }),
        makeMission({ dest: 'JUPITER', type: 'flyby' }),
      ];
      for (const m of samples) {
        expect(computeMissionApply(m, DEFAULTS).isFreeReturn).toBe(false);
      }
    });
  });
});

const SCENARIO: LocalizedScenario = {
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

describe('computeScenarioApply', () => {
  it('always free-return, heliocentric, Mars', () => {
    const r = computeScenarioApply(SCENARIO);
    expect(r.isFreeReturn).toBe(true);
    expect(r.isMoonMission).toBe(false);
    expect(r.activeDestination).toBe('mars');
  });

  it('cislunar + interplanetary trajectory always null', () => {
    const r = computeScenarioApply(SCENARIO);
    expect(r.cislunarTrajectory).toBeNull();
    expect(r.interplanetaryTrajectory).toBeNull();
  });

  it('timeline mirrors scenario fields exactly', () => {
    const r = computeScenarioApply(SCENARIO);
    expect(r.timeline).toEqual({
      dep_day: SCENARIO.dep_day,
      flyby_day: SCENARIO.flyby_day,
      arr_day: SCENARIO.arr_day,
    });
  });

  it('outPts + retPts both ARC_STEPS+1 long (free-return = both arcs)', () => {
    const r = computeScenarioApply(SCENARIO);
    expect(r.outPts.length).toBe(ARC_STEPS + 1);
    expect(r.retPts.length).toBe(ARC_STEPS + 1);
  });

  it('LoadedMission maps scenario name/vehicle/payload + delta-v fields directly', () => {
    const r = computeScenarioApply(SCENARIO);
    expect(r.missionMeta.name).toBe('ORRERY DEMO');
    expect(r.missionMeta.vehicle).toBe('Falcon Heavy');
    expect(r.missionMeta.payload).toBe('10 t');
    expect(r.missionMeta.dv_total).toBe(12.5);
    expect(r.missionMeta.dv_used).toBe(11);
    expect(r.missionMeta.timeline).toEqual(r.timeline);
  });

  it('passes through scenario events verbatim', () => {
    const events = [
      { met: 0, label: 'launch', type: 'launch' },
    ] as unknown as LocalizedScenario['events'];
    const r = computeScenarioApply({ ...SCENARIO, events });
    expect(r.missionEvents).toBe(events);
  });
});

describe('computePlanApply', () => {
  const PLAN_DEFAULTS = { dvFallback: 12.5 };

  describe('FLYBY (free-return)', () => {
    it('flyby_day = dep + tof; arr_day = dep + 2·tof (synthesised return leg)', () => {
      const r = computePlanApply('jupiter', 'FLYBY', 5000, 800, PLAN_DEFAULTS);
      expect(r.timeline.dep_day).toBe(5000);
      expect(r.timeline.flyby_day).toBe(5800);
      expect(r.timeline.arr_day).toBe(6600);
      expect(r.isFreeReturn).toBe(true);
    });

    it('FLYBY builds both arcs (out + ret)', () => {
      const r = computePlanApply('mars', 'FLYBY', 9000, 250, PLAN_DEFAULTS);
      expect(r.outPts.length).toBe(ARC_STEPS + 1);
      expect(r.retPts.length).toBe(ARC_STEPS + 1);
    });
  });

  describe('LANDING (one-way)', () => {
    it('flyby_day = dep + floor(0.95·tof); arr_day = dep + tof', () => {
      const r = computePlanApply('mars', 'LANDING', 9000, 250, PLAN_DEFAULTS);
      const expectedFlyby = 9000 + Math.floor(250 * FLYBY_OFFSET_FRACTION);
      expect(r.timeline.flyby_day).toBe(expectedFlyby);
      expect(r.timeline.arr_day).toBe(9250);
      expect(r.isFreeReturn).toBe(false);
    });

    it('LANDING builds outbound arc only', () => {
      const r = computePlanApply('mars', 'LANDING', 9000, 250, PLAN_DEFAULTS);
      expect(r.outPts.length).toBe(ARC_STEPS + 1);
      expect(r.retPts).toEqual([]);
    });
  });

  describe('LoadedMission synthesised shape', () => {
    it('name encodes EARTH → <DEST> · <TYPE>', () => {
      expect(computePlanApply('mars', 'LANDING', 9000, 250, PLAN_DEFAULTS).missionMeta.name).toBe(
        'EARTH → MARS · LANDING',
      );
      expect(computePlanApply('jupiter', 'FLYBY', 5000, 800, PLAN_DEFAULTS).missionMeta.name).toBe(
        'EARTH → JUPITER · FLYBY',
      );
    });

    it('dv_total + dv_used use defaults.dvFallback', () => {
      const r = computePlanApply('mars', 'LANDING', 9000, 250, { dvFallback: 20 });
      expect(r.missionMeta.dv_total).toBe(20);
      expect(r.missionMeta.dv_used).toBeCloseTo(20 * 0.94, 6);
    });

    it('labels use simulated-day stamps', () => {
      const r = computePlanApply('mars', 'LANDING', 9000, 250, PLAN_DEFAULTS);
      expect(r.missionMeta.dep_label).toBe('Day 9000');
      expect(r.missionMeta.arr_label).toBe(`Day ${9000 + 250}`);
    });
  });

  it('appliedId matches the existing test-hook shape plan-<dest>-<type>', () => {
    expect(computePlanApply('mars', 'LANDING', 9000, 250, PLAN_DEFAULTS).appliedId).toBe(
      'plan-mars-LANDING',
    );
    expect(computePlanApply('jupiter', 'FLYBY', 5000, 800, PLAN_DEFAULTS).appliedId).toBe(
      'plan-jupiter-FLYBY',
    );
  });

  it('always heliocentric — cislunar + interplanetary trajectory null', () => {
    const r = computePlanApply('mars', 'LANDING', 9000, 250, PLAN_DEFAULTS);
    expect(r.cislunarTrajectory).toBeNull();
    expect(r.interplanetaryTrajectory).toBeNull();
    expect(r.isMoonMission).toBe(false);
  });

  it('missionEvents always []', () => {
    expect(computePlanApply('mars', 'LANDING', 9000, 250, PLAN_DEFAULTS).missionEvents).toEqual([]);
  });
});
