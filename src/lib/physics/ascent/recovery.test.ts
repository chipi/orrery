import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  LANDING_BURN_DEFAULT_S,
  landingsFor,
  recoveryFor,
  type LaunchProfile,
} from './ascent-physics';

const DATA = resolve(__dirname, '../../../../static/data');
const load = (id: string): LaunchProfile =>
  JSON.parse(readFileSync(resolve(DATA, 'launch-profiles', `${id}.json`), 'utf-8'));
const profiles = readdirSync(resolve(DATA, 'launch-profiles')).map((f) =>
  load(f.replace(/\.json$/, '')),
);

describe('booster recovery per flight (0.9.11 F2)', () => {
  it('a mission entry replaces the vehicle default; other missions keep it', () => {
    const p = {
      recovery: [{ part: 'booster' as const, outcome: 'landed' as const }],
      recoveryByMission: { x: [{ part: 'booster' as const, outcome: 'expended' as const }] },
    };
    expect(recoveryFor(p, 'x')[0].outcome).toBe('expended');
    expect(recoveryFor(p, 'y')[0].outcome).toBe('landed');
    expect(recoveryFor({}, 'x')).toEqual([]);
  });

  it('landings drop expended parts and fill in the landing-burn start', () => {
    const p = {
      recovery: [
        { part: 'strapOns' as const, outcome: 'landed' as const, touchdownS: 500 },
        { part: 'booster' as const, outcome: 'expended' as const },
      ],
    };
    const l = landingsFor(p, undefined);
    expect(l).toHaveLength(1);
    expect(l[0].landingBurnS).toBe(500 - LANDING_BURN_DEFAULT_S);
  });

  it('every per-mission key names a mission that exists; every timed landing has a site', () => {
    const missionIds = new Set(
      readdirSync(resolve(DATA, 'missions'), { recursive: true })
        .map(String)
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace(/^.*\//, '').replace(/\.json$/, '')),
    );
    for (const p of profiles) {
      for (const id of Object.keys(p.recoveryByMission ?? {}))
        expect(missionIds.has(id), `${p.id}: ${id}`).toBe(true);
      const all = [p.recovery ?? [], ...Object.values(p.recoveryByMission ?? {})].flat();
      for (const r of all) {
        if (r.touchdownS == null) continue;
        expect(r.site, `${p.id}`).toBeDefined();
        expect(r.timeClass, `${p.id}`).toBeDefined();
        if (r.landingBurnS != null) expect(r.landingBurnS).toBeLessThan(r.touchdownS);
      }
    }
  });

  it('the sourced flights (docs/wip/2026-11-22-booster-recovery-sourced.md)', () => {
    const f9 = load('falcon-9');
    const fh = load('falcon-heavy');
    expect(landingsFor(f9, 'hera')).toEqual([]); // B1061 expended
    expect(landingsFor(fh, 'europa-clipper')).toEqual([]); // all three cores expended
    const psyche = landingsFor(fh, 'psyche-mission');
    expect(psyche).toHaveLength(1);
    expect(psyche[0]).toMatchObject({ part: 'strapOns', landingBurnS: 480, touchdownS: 497 });
    expect(recoveryFor(fh, 'psyche-mission').find((r) => r.part === 'booster')?.outcome).toBe(
      'expended',
    );
    expect(landingsFor(f9, 'inspiration4')[0]).toMatchObject({
      landingBurnS: 544,
      touchdownS: 571,
      site: 'droneship',
    });
    expect(landingsFor(f9, 'dart')[0].touchdownS).toBe(532);
    expect(landingsFor(load('starship'), 'starship-demo')[0].outcome).toBe('caught');
  });
});
