import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  hasDockingProfile,
  isDockingProfile,
  isValidDockingProfile,
  loadDockingProfile,
  type DockingProfileRaw,
} from './docking-profile';

const raw = JSON.parse(
  readFileSync(
    resolve(__dirname, '../../../static/data/docking-profiles/crew-dragon-demo-2.json'),
    'utf-8',
  ),
) as DockingProfileRaw;

describe('docking profiles (W9)', () => {
  it('lists the missions with a profile file', () => {
    expect(hasDockingProfile('crew-dragon-demo-2')).toBe(true);
    expect(hasDockingProfile('hubble')).toBe(false);
    expect(hasDockingProfile(null)).toBe(false);
  });

  it('rejects a wrong port, a hold that is not a range, an unknown neighbour', () => {
    expect(isValidDockingProfile(raw)).toBe(true);
    expect(isValidDockingProfile(null)).toBe(false);
    expect(isValidDockingProfile({ ...raw, port: 'zvezda-aft' })).toBe(false);
    expect(isValidDockingProfile({ ...raw, stationDate: 'soon' })).toBe(false);
    expect(isValidDockingProfile({ ...raw, holds: [{ id: 'x', rangeM: -1, from: 'axis' }] })).toBe(
      false,
    );
    expect(isValidDockingProfile({ ...raw, holds: [{ id: 'x', rangeM: 10, from: 'above' }] })).toBe(
      false,
    );
    expect(isValidDockingProfile({ ...raw, neighbours: [{ id: 'cygnus' }] })).toBe(false);
    expect(isValidDockingProfile({ ...raw, lastBurn: { id: 'x', met: 'never', burnS: 1 } })).toBe(
      false,
    );
  });

  it('loads and expands the profile; null on a miss, a failed fetch or junk', async () => {
    const ok = (async () => ({ ok: true, json: async () => raw })) as unknown as typeof fetch;
    const p = await loadDockingProfile('crew-dragon-demo-2', ok);
    expect(p && isDockingProfile(p)).toBe(true);
    expect(p?.captureS).toBe(18 * 3600 + 53 * 60 + 15);
    expect(await loadDockingProfile('hubble', ok)).toBeNull();
    const notOk = (async () => ({ ok: false })) as unknown as typeof fetch;
    expect(await loadDockingProfile('crew-dragon-demo-2', notOk)).toBeNull();
    const junk = (async () => ({ ok: true, json: async () => ({}) })) as unknown as typeof fetch;
    expect(await loadDockingProfile('crew-dragon-demo-2', junk)).toBeNull();
    const boom = (async () => {
      throw new Error('net');
    }) as unknown as typeof fetch;
    expect(await loadDockingProfile('crew-dragon-demo-2', boom)).toBeNull();
  });
});
