import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DEPLOY_MISSION_IDS,
  expandDeployProfile,
  hasDeployProfile,
  isValidDeployProfile,
  loadDeployProfile,
  type DeployProfileRaw,
} from './deploy-profile';

const raw = (id: string): DeployProfileRaw =>
  JSON.parse(
    readFileSync(resolve(__dirname, `../../../static/data/deploy-profiles/${id}.json`), 'utf-8'),
  ) as DeployProfileRaw;

describe('deploy profiles (W10)', () => {
  it('the three IUS missions have one', () => {
    expect([...DEPLOY_MISSION_IDS].sort()).toEqual(['galileo', 'magellan', 'ulysses']);
    expect(hasDeployProfile('galileo')).toBe(true);
    expect(hasDeployProfile('cassini')).toBe(false);
    expect(hasDeployProfile(null)).toBe(false);
  });

  for (const id of DEPLOY_MISSION_IDS) {
    it(`${id} is valid and names its mission`, () => {
      const r = raw(id);
      expect(isValidDeployProfile(r)).toBe(true);
      expect(r.missionId).toBe(id);
      expect(r.tilt[0].deg).toBe(29);
    });
  }

  // The gaps the post-flight reports' GMT times give (mission reports STS-34, STS-30, STS-41).
  it('keeps the reports’ release-to-burn gaps', () => {
    const g = expandDeployProfile(raw('galileo'));
    expect(g.sepBurnsS[0] - g.releaseS).toBeCloseTo(899.2, 1);
    expect(g.stage1S - g.releaseS).toBeCloseTo(3612, 0);
    const m = expandDeployProfile(raw('magellan'));
    expect(m.sepBurnsS[0] - m.releaseS).toBeCloseTo(889.1, 1);
    expect(m.stage2S - m.stage1S).toBeCloseTo(310, 0);
    const u = expandDeployProfile(raw('ulysses'));
    expect(u.sepBurnsS[0] - u.releaseS).toBeCloseTo(59, 0);
    expect(u.stage1S - u.releaseS).toBeCloseTo(3899, 0);
    expect(u.pamSS).toBeGreaterThan(u.stage2S);
    expect(g.pamSS).toBeUndefined();
  });

  it('release MET matches launch zero plus the report’s GMT', () => {
    const g = expandDeployProfile(raw('galileo'));
    const at = new Date(Date.parse(g.launchZeroUtc) + g.releaseS * 1000).toISOString();
    expect(at.slice(0, 19)).toBe('1989-10-18T23:15:03');
  });

  it('fails closed on a broken profile', () => {
    const ok = raw('ulysses');
    const bad = (patch: (p: DeployProfileRaw) => void) => {
      const p = structuredClone(ok);
      patch(p);
      return isValidDeployProfile(p);
    };
    expect(bad(() => {})).toBe(true);
    expect(isValidDeployProfile(null)).toBe(false);
    expect(bad((p) => (p.releaseMet = '7:30:00'))).toBe(false); // after the separation burn
    expect(bad((p) => (p.tilt = [{ deg: 58 }, { deg: 29 }]))).toBe(false);
    expect(bad((p) => (p.upperStage.stage2.met = '7:06:00'))).toBe(false); // inside stage 1's burn
    expect(bad((p) => (p.method = 'rms'))).toBe(false); // reserved, not built
    expect(bad((p) => ((p as { orbiter: string }).orbiter = 'buran'))).toBe(false);
    expect(bad((p) => (p.tableLowerDeg = 6))).toBe(false);
    expect(bad((p) => (p.upperStage.pamS!.spinRpm = 0))).toBe(false);
    expect(bad((p) => (p.sepBurns = []))).toBe(false);
    expect(bad((p) => (p.launchZeroUtc = 'soon'))).toBe(false);
  });

  it('loads through fetch and returns null on a miss or bad JSON', async () => {
    const body = raw('galileo');
    const ok = (async () => ({ ok: true, json: async () => body })) as unknown as typeof fetch;
    const p = await loadDeployProfile('galileo', ok);
    expect(p?.releaseS).toBeCloseTo(6 * 3600 + 21 * 60 + 23, 6);
    expect(await loadDeployProfile('cassini', ok)).toBeNull();
    const notOk = (async () => ({ ok: false })) as unknown as typeof fetch;
    expect(await loadDeployProfile('galileo', notOk)).toBeNull();
    const junk = (async () => ({ ok: true, json: async () => ({}) })) as unknown as typeof fetch;
    expect(await loadDeployProfile('galileo', junk)).toBeNull();
    const boom = (async () => {
      throw new Error('net');
    }) as unknown as typeof fetch;
    expect(await loadDeployProfile('galileo', boom)).toBeNull();
  });
});
