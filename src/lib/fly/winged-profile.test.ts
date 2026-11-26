import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  WINGED_MISSION_IDS,
  expandWingedProfile,
  hasWingedProfile,
  isValidWingedProfile,
  loadWingedProfile,
  type WingedProfileRaw,
} from './winged-profile';

const raw = (id: string): WingedProfileRaw =>
  JSON.parse(
    readFileSync(resolve(__dirname, `../../../static/data/winged-profiles/${id}.json`), 'utf-8'),
  ) as WingedProfileRaw;

describe('winged-return profiles (W12)', () => {
  it('STS-1 has one; capsule returns do not', () => {
    expect([...WINGED_MISSION_IDS]).toContain('sts-1');
    expect(hasWingedProfile('sts-1')).toBe(true);
    expect(hasWingedProfile('apollo11')).toBe(false);
    expect(hasWingedProfile(undefined)).toBe(false);
  });

  for (const id of WINGED_MISSION_IDS) {
    it(`${id} is valid`, () => {
      expect(isValidWingedProfile(raw(id))).toBe(true);
      expect(raw(id).missionId).toBe(id);
    });
  }

  it('STS-1 keeps the flown touchdown MET and the post-flight runway distances', () => {
    const p = expandWingedProfile(raw('sts-1'));
    expect(p.touchdownS).toBe(54 * 3600 + 20 * 60 + 53);
    // Symposium: wheels stopped 15,046 ft from the threshold after an 8,993 ft roll.
    expect(p.rollFt).toBe(8993);
    expect(p.rollout.chute).toBe(false); // the first Shuttle drag chute flew on STS-49
    // The press kit's plan offsets kept: EI 31 min 41 s and TAEM 6 min 13 s before touchdown.
    expect(p.touchdownS - p.entryS).toBe(31 * 60 + 41);
    expect(p.touchdownS - p.taemS).toBe(6 * 60 + 13);
  });

  it('fails closed on a broken profile', () => {
    const ok = raw('sts-1');
    const bad = (patch: (p: WingedProfileRaw) => void) => {
      const p = structuredClone(ok);
      patch(p);
      return isValidWingedProfile(p);
    };
    expect(bad(() => {})).toBe(true);
    expect(isValidWingedProfile(null)).toBe(false);
    expect(bad((p) => (p.taem.met = '53:00:00'))).toBe(false);
    expect(bad((p) => (p.entry.reversalsMach = [4.8, 9.8]))).toBe(false);
    expect(bad((p) => (p.rollout.stopFt = 6000))).toBe(false);
    expect(bad((p) => (p.approach.gearDownFt = 3000))).toBe(false);
    expect(bad((p) => (p.runway.lengthM = 3000))).toBe(false);
    expect(bad((p) => (p.runway.headingDeg = 360))).toBe(false);
    expect(bad((p) => ((p as { vehicle: string }).vehicle = 'capsule'))).toBe(false);
    expect(bad((p) => (p.deorbit.burnS = 3600))).toBe(false);
  });

  it('loads through fetch and returns null on a miss or bad JSON', async () => {
    const body = raw('sts-1');
    const ok = (async () => ({ ok: true, json: async () => body })) as unknown as typeof fetch;
    expect((await loadWingedProfile('sts-1', ok))?.rollFt).toBe(8993);
    expect(await loadWingedProfile('apollo11', ok)).toBeNull();
    const notOk = (async () => ({ ok: false })) as unknown as typeof fetch;
    expect(await loadWingedProfile('sts-1', notOk)).toBeNull();
    const junk = (async () => ({ ok: true, json: async () => ({}) })) as unknown as typeof fetch;
    expect(await loadWingedProfile('sts-1', junk)).toBeNull();
    const boom = (async () => {
      throw new Error('net');
    }) as unknown as typeof fetch;
    expect(await loadWingedProfile('sts-1', boom)).toBeNull();
  });
});
