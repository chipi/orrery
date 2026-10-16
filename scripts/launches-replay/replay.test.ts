/**
 * Regression gate for #566 over the frozen 2026-10-16 corpus: the new code
 * reads GCAT 1.8.8 and tags only vehicles LL2 says have never flown.
 * The old-vs-new comparison needs a baseline worktree (README.md); its
 * criteria are unit-tested here on synthetic results.
 */
import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkAgainstBaseline, checkNew, runCheck } from './check.js';
import { runReplay, type ReplayResult, type Tiered } from './replay.js';

const repo = resolve(fileURLToPath(new URL('../..', import.meta.url)));

const t = (tier_reason: string, over: Partial<Tiered> = {}): Tiered => ({
  tier: tier_reason === 'first-flight-vehicle' ? 'T1' : 'T3',
  tier_reason,
  net: '2027-01-01T00:00:00.000Z',
  ...over,
});
const result = (over: Partial<ReplayResult> = {}): ReplayResult => ({
  errors: [],
  upcoming: {},
  historic: {},
  ...over,
});
const manyHistoric = Object.fromEntries(
  Array.from({ length: 7000 }, (_, i) => [`h${i}`, t('standard')]),
);

describe('launches replay — 2026-10-16 corpus', () => {
  it('meets the first-flight and GCAT criteria', async () => {
    const { summary, failures } = await runCheck();
    expect(failures).toEqual([]);
    expect(summary).toBe('new: 465 upcoming (24 first flights), 7367 historic');
  }, 60_000);

  it('reads the same history from GCAT projected onto the 1.8.0 columns', async () => {
    const real = await runReplay(repo);
    const projected = await runReplay(repo, { gcat180: true });
    expect(projected.errors).toEqual([]);
    expect(projected.historic).toEqual(real.historic);
  }, 60_000);
});

describe('checkNew', () => {
  const flagged = (upcoming: Record<string, Tiered>) =>
    checkNew(result({ upcoming, historic: manyHistoric }));

  it('passes a first flight on a configuration LL2 says never flew', () => {
    expect(flagged({ neutron: t('first-flight-vehicle', { rocket_config_id: '476' }) })).toEqual(
      [],
    );
  });

  it('fails a first flight on a configuration with launches (Falcon 9 Block 5)', () => {
    const fail = flagged({ f9: t('first-flight-vehicle', { rocket_config_id: '164' }) });
    expect(fail.some((f) => f.includes('has 640 launches'))).toBe(true);
  });

  it('fails a first flight on a placeholder configuration', () => {
    const fail = flagged({ u: t('first-flight-vehicle', { rocket_config_id: '511' }) });
    expect(fail.some((f) => f.includes('placeholder config 511'))).toBe(true);
  });

  it('fails a generic configuration whose family has flown (Vulcan)', () => {
    const fail = flagged({ v: t('first-flight-vehicle', { rocket_config_id: '200' }) });
    expect(fail.some((f) => f.includes('family has flown 4'))).toBe(true);
  });

  it('fails a first flight without an LL2 configuration', () => {
    expect(flagged({ x: t('first-flight-vehicle') })).toEqual([
      'x: first flight without an LL2 configuration',
    ]);
  });

  it('fails two first flights for one configuration, and one that is not the earliest', () => {
    const fail = flagged({
      a: t('first-flight-vehicle', { rocket_config_id: '476', net: '2027-01-01T00:00:00.000Z' }),
      b: t('first-flight-vehicle', { rocket_config_id: '476', net: '2028-01-01T00:00:00.000Z' }),
    });
    expect(fail).toContain('b: second first flight for config 476');
    expect(fail.some((f) => f.startsWith('b: not the earliest launch of config 476'))).toBe(true);
  });

  it('fails source errors and a short history', () => {
    const fail = checkNew(result({ errors: ['gcat (historic): boom'] }));
    expect(fail.some((f) => f.includes('source errors'))).toBe(true);
    expect(fail.some((f) => f.includes('only 0 historic'))).toBe(true);
  });
});

describe('checkAgainstBaseline', () => {
  const faithfulBase = () =>
    result({
      errors: ['gcat (historic): GCAT header assertion failed (column-mismatch): …'],
      upcoming: {},
    });

  it('fails a baseline that does not reproduce prod', () => {
    const fail = checkAgainstBaseline(result(), result(), result());
    expect(fail.some((f) => f.includes('expected the prod GCAT header failure'))).toBe(true);
    expect(fail.some((f) => f.includes('prod published 465'))).toBe(true);
    expect(fail.some((f) => f.includes("first flights differ from prod's"))).toBe(true);
  });

  it('fails any historic difference between the 1.8.0 projection and the new code', () => {
    const fail = checkAgainstBaseline(
      faithfulBase(),
      result({ historic: { a: t('standard'), gone: t('standard') } }),
      result({ historic: { a: t('first-flight-vehicle') } }),
    );
    expect(fail).toContain('historic: 1 entries vs 2 from the 1.8.0 projection');
    expect(fail).toContain('historic a: T3/standard -> T1/first-flight-vehicle');
  });

  it('fails tier changes outside first flights, and ignores first-flight changes', () => {
    const fail = checkAgainstBaseline(
      faithfulBase(),
      result(),
      result({
        upcoming: {
          moved: t('routine-constellation', { tier: 'T4' }),
          ff: t('standard'),
          fresh: t('standard'),
        },
      }),
    );
    expect(fail).toContain('upcoming moved: missing from baseline');
    expect(fail).toContain('upcoming fresh: missing from baseline');

    const base = faithfulBase();
    base.upcoming = { moved: t('standard'), ff: t('first-flight-vehicle') };
    const fail2 = checkAgainstBaseline(
      base,
      result(),
      result({
        upcoming: { moved: t('routine-constellation', { tier: 'T4' }), ff: t('standard') },
      }),
    );
    expect(fail2).toContain(
      'upcoming moved: T3/standard -> T4/routine-constellation outside first-flight',
    );
    expect(fail2.some((f) => f.startsWith('upcoming ff'))).toBe(false);
  });
});
