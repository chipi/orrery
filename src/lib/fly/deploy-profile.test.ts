import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DEPLOY_MISSION_IDS,
  expandDeployProfile,
  expandRmsDeployProfile,
  hasDeployProfile,
  isValidDeployProfile,
  isValidRmsDeployProfile,
  loadDeployProfile,
  type DeployProfileRaw,
  type RmsDeployProfileRaw,
} from './deploy-profile';

const raw = (id: string): DeployProfileRaw =>
  JSON.parse(
    readFileSync(resolve(__dirname, `../../../static/data/deploy-profiles/${id}.json`), 'utf-8'),
  ) as DeployProfileRaw;

describe('deploy profiles (W10)', () => {
  it('the IUS missions and the arm-released observatories have one', () => {
    expect([...DEPLOY_MISSION_IDS].sort()).toEqual([
      'chandra',
      'compton-gro',
      'galileo',
      'hubble',
      'magellan',
      'ulysses',
    ]);
    expect(hasDeployProfile('galileo')).toBe(true);
    expect(hasDeployProfile('cassini')).toBe(false);
    expect(hasDeployProfile(null)).toBe(false);
  });

  const RMS = new Set(['hubble', 'compton-gro']);
  for (const id of RMS) {
    it(`${id} is a valid arm release and names its mission`, () => {
      const r = raw(id) as unknown as RmsDeployProfileRaw;
      expect(isValidRmsDeployProfile(r)).toBe(true);
      expect(isValidDeployProfile(r)).toBe(false);
      expect(r.missionId).toBe(id);
      expect(r.payload).toBe(id);
    });
  }

  // The report times (STS-31 and STS-37 mission reports, GMT) through launch zero.
  it('keeps the arm releases at the reports’ GMT', () => {
    const iso = (p: { launchZeroUtc: string }, s: number) =>
      new Date(Math.round(Date.parse(p.launchZeroUtc) / 1000 + s) * 1000)
        .toISOString()
        .slice(0, 19);
    const h = expandRmsDeployProfile(raw('hubble') as unknown as RmsDeployProfileRaw);
    expect(iso(h, h.releaseS)).toBe('1990-04-25T19:37:51');
    expect(iso(h, h.sepBurnsS[0])).toBe('1990-04-25T19:38:20');
    expect(iso(h, h.sepBurnsS[1])).toBe('1990-04-25T19:58:28');
    const c = expandRmsDeployProfile(raw('compton-gro') as unknown as RmsDeployProfileRaw);
    expect(iso(c, c.releaseS)).toBe('1991-04-07T22:36:47');
    expect(c.evaS! + c.eva!.durationS).toBeLessThan(c.releaseS);
    const ch = expandDeployProfile(raw('chandra'));
    expect(iso(ch, ch.releaseS)).toBe('1999-07-23T11:47:01');
    expect(iso(ch, ch.sepBurnsS[1])).toBe('1999-07-23T12:02:25');
  });

  it('fails closed on a broken arm release', () => {
    const ok = raw('compton-gro') as unknown as RmsDeployProfileRaw;
    const bad = (patch: (p: RmsDeployProfileRaw) => void) => {
      const p = structuredClone(ok);
      patch(p);
      return isValidRmsDeployProfile(p);
    };
    expect(bad(() => {})).toBe(true);
    expect(bad((p) => (p.eva!.met = '56:00:00.0'))).toBe(false); // spacewalk past the release
    expect(bad((p) => (p.anomaly = undefined))).toBe(false); // a spacewalk needs its anomaly
    expect(bad((p) => ((p as { anomaly: string }).anomaly = 'gremlins'))).toBe(false);
    expect(bad((p) => (p.sepBurns[0].met = '56:13:00.0'))).toBe(false); // before the release
    expect(bad((p) => ((p as { payload?: string }).payload = undefined))).toBe(false);
  });

  for (const id of [...DEPLOY_MISSION_IDS].filter((x) => !RMS.has(x))) {
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
    expect(bad((p) => ((p as { method: string }).method = 'rms'))).toBe(false); // not an RMS shape
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
