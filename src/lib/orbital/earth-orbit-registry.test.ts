import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  hasEarthOrbitCoast,
  getEarthOrbitCoast,
  coastAltitudeKm,
  type EarthOrbitCoast,
} from './earth-orbit-registry';
import { CAPSULE_FAMILY_IDS } from '../three/capsule-models';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../');

describe('earth-orbit-registry pure functions', () => {
  it('hasEarthOrbitCoast gates known missions + rejects the rest', () => {
    expect(hasEarthOrbitCoast('friendship-7')).toBe(true);
    expect(hasEarthOrbitCoast('gemini7')).toBe(true);
    expect(hasEarthOrbitCoast('cassini')).toBe(false);
    expect(hasEarthOrbitCoast(undefined)).toBe(false);
    expect(hasEarthOrbitCoast(null)).toBe(false);
  });

  it('getEarthOrbitCoast returns the descriptor or null', () => {
    const c = getEarthOrbitCoast('friendship-7');
    expect(c?.missionId).toBe('friendship-7');
    expect(c?.revolutions).toBe(3);
    expect(getEarthOrbitCoast('cassini')).toBeNull();
    expect(getEarthOrbitCoast(null)).toBeNull();
  });

  it('coastAltitudeKm is the apogee/perigee mean', () => {
    const c: EarthOrbitCoast = {
      missionId: 'x',
      capsuleId: 'mercury',
      apogeeKm: 300,
      perigeeKm: 200,
      inclinationDeg: 30,
      revolutions: 1,
      coastDurationS: 5400,
    };
    expect(coastAltitudeKm(c)).toBe(250);
  });
});

// Every mission the coast registry knows, resolved for the join checks below.
const COAST_IDS = [
  'friendship-7',
  'vostok-1',
  'apollo7',
  'aurora-7',
  'sigma-7',
  'faith-7',
  'freedom-7',
  'liberty-bell-7',
  'gemini3',
  'gemini4',
  'gemini6a',
  'gemini7',
  'gemini8',
  'gemini12',
  'vostok-2',
  'vostok-3',
  'vostok-4',
  'vostok-5',
  'vostok-6',
  'voskhod-1',
  'voskhod-2',
  'apollo9',
  'apollo-soyuz',
  'skylab-2',
  'skylab-3',
  'skylab-4',
  'soyuz-1',
  'soyuz-11',
  'inspiration4',
  'polaris-dawn',
  'shenzhou-1',
];

describe('Space Shuttle flights coast in Earth orbit (no cislunar arc after the climb)', () => {
  it('STS-1 carries its mission record: 166 nmi (307 km), 40.3 degrees, 37 revolutions', () => {
    const c = getEarthOrbitCoast('sts-1')!;
    expect(c.winged).toBe(true);
    expect(c.apogeeKm).toBe(307);
    expect(c.perigeeKm).toBe(307);
    expect(c.inclinationDeg).toBe(40.3);
    expect(c.revolutions).toBe(37);
    // 54 h 20 min 53 s on the record (the climb is the first 9 min of it)
    expect(c.coastDurationS / 3600).toBeGreaterThan(53.5);
    expect(c.coastDurationS / 3600).toBeLessThan(54.4);
  });

  it('STS-107 is a 16-day Earth-orbit flight at 39 degrees', () => {
    const c = getEarthOrbitCoast('sts-107')!;
    expect(c.winged).toBe(true);
    expect(c.inclinationDeg).toBe(39);
    expect(c.coastDurationS / 86400).toBeGreaterThan(15.5); // the record: lost at MET 15.93 d
    expect(c.coastDurationS / 86400).toBeLessThan(16);
  });

  it.each(['sts-1', 'sts-107'])('%s: a consistent LEO period and a runway, not a capsule', (id) => {
    const c = getEarthOrbitCoast(id)!;
    const min = c.coastDurationS / c.revolutions / 60;
    expect(min).toBeGreaterThan(85);
    expect(min).toBeLessThan(115);
    expect(c.capsuleId).toBe('orbiter');
    expect(CAPSULE_FAMILY_IDS).not.toContain(c.capsuleId); // never built as a capsule
  });
});

// A dest-EARTH mission that can launch, and has a Fly chip, must continue after the climb into the
// Earth-orbit coast: with no descriptor the router falls through to the cislunar view (a Moon arc
// for a 2-day Shuttle flight). Missions that still fall through are listed, so a new Earth mission
// without a descriptor fails here until it is handled or listed.
describe('every launchable Earth mission has a coast descriptor (never the cislunar fall-through)', () => {
  const KNOWN_GAPS = new Set([
    'otv-1',
    'otv-2',
    'otv-3',
    'otv-4',
    'otv-5',
    'otv-6',
    'otv-7',
    'shenzhou-5',
    'sputnik1',
  ]);
  const dir = resolve(ROOT, 'static/data/missions/earth');
  const missions = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(resolve(dir, f), 'utf8')) as Record<string, unknown>);

  it('the Shuttle and every other launchable flown Earth mission is covered or listed', () => {
    const missing: string[] = [];
    for (const m of missions) {
      const refs = (m.fleet_refs as { role: string }[] | undefined) ?? [];
      const launchable = refs.some((r) => r.role === 'launcher') && m.status === 'FLOWN';
      const hasChip = typeof m.flight_data_quality === 'string';
      if (!launchable || !hasChip) continue;
      if (!getEarthOrbitCoast(m.id as string) && !KNOWN_GAPS.has(m.id as string))
        missing.push(m.id as string);
    }
    expect(missing).toEqual([]);
  });

  it('the listed gaps really are gaps (the list shrinks as they are fixed)', () => {
    for (const id of KNOWN_GAPS) expect(getEarthOrbitCoast(id), id).toBeNull();
  });
});

describe('coast ↔ descent ↔ capsule join guard', () => {
  it('every listed id resolves to a coast descriptor (catches a dropped entry)', () => {
    for (const id of COAST_IDS) expect(getEarthOrbitCoast(id), id).not.toBeNull();
  });

  it.each(COAST_IDS)('%s: capsuleId resolves to a real capsule builder', (id) => {
    const c = getEarthOrbitCoast(id)!;
    expect(CAPSULE_FAMILY_IDS).toContain(c.capsuleId);
  });

  it.each(COAST_IDS)('%s: has an Earth re-entry descent profile (no coast → nowhere)', (id) => {
    const p = resolve(ROOT, `static/data/descent-profiles/${id}.json`);
    expect(existsSync(p), `${id}.json`).toBe(true);
    const raw = JSON.parse(readFileSync(p, 'utf8')) as { body: string };
    expect(raw.body).toBe('earth');
  });

  it('orbital coasts have a consistent ~85–115 min LEO period', () => {
    for (const id of COAST_IDS) {
      const c = getEarthOrbitCoast(id)!;
      if (c.suborbital || c.revolutions === 0) continue;
      const minPerOrbit = c.coastDurationS / c.revolutions / 60;
      expect(minPerOrbit, `${id} min/orbit`).toBeGreaterThan(85);
      expect(minPerOrbit, `${id} min/orbit`).toBeLessThan(115);
    }
  });
});
