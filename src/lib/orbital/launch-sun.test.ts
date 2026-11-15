import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  integrateAscent,
  sampleAscentAt,
  type LaunchProfile,
} from '$lib/physics/ascent/ascent-physics';
import { buildDirectorPlan, pickConditions, mulberry32 } from './ascent-director';
import {
  compassToSceneAz,
  launchUtcMsFor,
  lightFromSunElevation,
  sunAt,
  type LaunchInstant,
} from './launch-sun';

const profile = (id: string): LaunchProfile =>
  JSON.parse(
    readFileSync(resolve(__dirname, `../../../static/data/launch-profiles/${id}.json`), 'utf-8'),
  ) as LaunchProfile;

describe('sunAt', () => {
  it('the March equinox at noon on the equator is near the zenith', () => {
    // 2024-03-20 12:07 UTC: solar noon at lon 0 (equation of time about -7 min)
    const s = sunAt(Date.UTC(2024, 2, 20, 12, 7), 0, 0);
    expect(s.elevDeg).toBeGreaterThan(88);
  });

  it('the June solstice at local noon at 28.6 N is about 85 degrees, due south of overhead', () => {
    // lon -80.6: solar noon about 17:22 UTC less the equation of time (-2 min in late June)
    const s = sunAt(Date.UTC(2024, 5, 20, 17, 24), 28.6, -80.6);
    expect(s.elevDeg).toBeGreaterThan(83);
    expect(s.elevDeg).toBeLessThan(86);
  });

  it('the December solstice at noon at 28.6 N is about 38 degrees and due south', () => {
    const s = sunAt(Date.UTC(2024, 11, 21, 17, 20), 28.6, -80.6);
    expect(s.elevDeg).toBeGreaterThan(36);
    expect(s.elevDeg).toBeLessThan(40);
    expect(Math.abs(s.azDeg - 180)).toBeLessThan(5);
  });

  it('the Sun is in the east in the morning and in the west in the afternoon', () => {
    const am = sunAt(Date.UTC(2024, 2, 20, 9, 0), 28.6, -80.6); // 05:00 local... rising
    const pm = sunAt(Date.UTC(2024, 2, 20, 21, 0), 28.6, -80.6);
    expect(am.azDeg).toBeLessThan(180);
    expect(pm.azDeg).toBeGreaterThan(180);
  });

  it('local midnight is far below the horizon', () => {
    // Beresheet, Falcon 9 from the Cape, 2019-02-22 01:45 UTC = 20:45 EST
    const s = sunAt(Date.UTC(2019, 1, 22, 1, 45), 28.56, -80.58);
    expect(s.elevDeg).toBeLessThan(-30);
  });
});

describe('light rule', () => {
  it('maps elevation to the four picks', () => {
    expect(lightFromSunElevation(-20)).toBe('night');
    expect(lightFromSunElevation(-6.1)).toBe('night');
    expect(lightFromSunElevation(-6)).toBe('dusk');
    expect(lightFromSunElevation(0)).toBe('dusk');
    expect(lightFromSunElevation(5.9)).toBe('dusk');
    expect(lightFromSunElevation(6)).toBe('golden');
    expect(lightFromSunElevation(15)).toBe('golden');
    expect(lightFromSunElevation(15.1)).toBe('midday');
    expect(lightFromSunElevation(60)).toBe('midday');
  });

  it('a compass bearing maps to the scene azimuth (east = +x downrange, south = +z)', () => {
    expect(compassToSceneAz(90)).toBe(0);
    expect(compassToSceneAz(180)).toBe(90);
    expect(compassToSceneAz(0)).toBe(270);
  });
});

describe('real launch light in the director', () => {
  const shuttle = profile('space-shuttle-stack');
  const falcon = profile('falcon-9');
  const planFor = (p: LaunchProfile, extra: object = {}) => {
    const s = integrateAscent(p);
    return buildDirectorPlan({
      vehicleId: p.id,
      missionId: 'x',
      events: s.events,
      maxQt: s.maxQ.t,
      duration: s.totalDurationS,
      altAt: (t) => sampleAscentAt(s.states, t).altKm,
      ...extra,
    });
  };
  const at = (utc: string, p: LaunchProfile): LaunchInstant => ({
    utcMs: Date.parse(utc),
    latDeg: p.launchSite!.lat,
    lonDeg: p.launchSite!.lon,
  });

  it('STS-34 Galileo (1989-10-18 16:53:40 UTC, LC-39B, 12:53 EDT) is midday', () => {
    const plan = planFor(shuttle, { launch: at('1989-10-18T16:53:40Z', shuttle) });
    expect(plan.conditions.light).toBe('midday');
    expect(plan.conditions.sunElevDeg).toBeGreaterThan(45);
    expect(plan.opening).not.toBe('pad_dusk');
  });

  it('a real night launch (Beresheet, Falcon 9, 2019-02-22 01:45 UTC, 20:45 EST) is night', () => {
    const plan = planFor(falcon, { launch: at('2019-02-22T01:45:00Z', falcon) });
    expect(plan.conditions.light).toBe('night');
    expect(plan.conditions.sunElevDeg).toBeLessThan(-6);
  });

  it('the real Sun azimuth drives the scene sun direction', () => {
    const plan = planFor(shuttle, { launch: at('1989-10-18T16:53:40Z', shuttle) });
    // before solar noon in the northern hemisphere: the Sun is south-east, bearing 90..180,
    // scene azimuth 0..90
    expect(plan.conditions.sunAzDeg).toBeGreaterThan(0);
    expect(plan.conditions.sunAzDeg).toBeLessThan(90);
  });

  it('a Plan-style input (no instant) is seeded exactly as before', () => {
    const a = planFor(falcon);
    const b = planFor(falcon, { launch: undefined });
    expect(JSON.stringify(a.conditions)).toBe(JSON.stringify(b.conditions));
    // the light varies across seeds when it is rolled
    const lights = new Set<string>();
    for (let seed = 0; seed < 40; seed++) lights.add(planFor(falcon, { seed }).conditions.light);
    expect(lights.size).toBeGreaterThanOrEqual(3);
  });

  it('a real instant changes only the light and the sun, never the clouds', () => {
    const seeded = planFor(falcon, { seed: 11 });
    const real = planFor(falcon, { seed: 11, launch: at('1989-10-18T16:53:40Z', falcon) });
    for (const k of ['coverage', 'deckAltKm', 'cloudSeed', 'cloudType', 'cover'] as const)
      expect(real.conditions[k]).toBe(seeded.conditions[k]);
  });

  it('a forced light still wins over the real sun', () => {
    const plan = planFor(falcon, {
      launch: at('1989-10-18T16:53:40Z', falcon),
      force: { light: 'night' },
    });
    expect(plan.conditions.light).toBe('night');
  });

  it('pickConditions consumes the same draws with or without a real sun', () => {
    const a = pickConditions(mulberry32(5));
    const b = pickConditions(mulberry32(5), undefined, false, { elevDeg: 40, azDeg: 100 });
    expect(b.cloudSeed).toBe(a.cloudSeed);
    expect(b.coverage).toBe(a.coverage);
    expect(b.light).toBe('midday');
  });
});

describe('launchUtcMsFor', () => {
  const entries = [
    { orrery_mission_ref: 'beresheet', net: '2019-02-22T01:45:00.000Z', net_precision: 'minute' },
    { orrery_mission_ref: 'dayonly', net: '1990-01-01T00:00:00.000Z', net_precision: 'day' },
    { orrery_mission_ref: null, net: '2000-01-01T00:00:00.000Z', net_precision: 'minute' },
  ];
  it('returns the instant for a minute-precision entry', () => {
    expect(launchUtcMsFor(entries, 'beresheet')).toBe(Date.UTC(2019, 1, 22, 1, 45));
  });
  it('returns null for a date-only entry, an unknown mission or no id: the light is then seeded', () => {
    expect(launchUtcMsFor(entries, 'dayonly')).toBeNull();
    expect(launchUtcMsFor(entries, 'galileo')).toBeNull();
    expect(launchUtcMsFor(entries, undefined)).toBeNull();
  });
});
