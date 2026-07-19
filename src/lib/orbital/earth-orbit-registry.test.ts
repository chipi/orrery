import { readFileSync, existsSync } from 'node:fs';
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
