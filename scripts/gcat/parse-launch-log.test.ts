/**
 * Tests for the GCAT `launch.tsv` parser (S2 of v0.7 Launches Calendar).
 *
 * Coverage:
 *   - Header assertion (release-pin safety per RFC-023 §12.1)
 *   - Date parsing across the precisions GCAT uses
 *   - Status-code mapping (S/F/U → SUCCESS/FAILURE)
 *   - Stable-id construction
 *   - Full row → RawLaunchEntry mapping
 *   - End-to-end TSV parsing with known historic launches
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertGcatHeader,
  buildStableId,
  gcatRowToRawEntry,
  parseGcatLaunchDate,
  parseGcatLaunchCode,
  parseGcatLaunchTsv,
  rocketFamilyFromLvType,
  slugify,
  GCAT_1_8_0_INDEX,
  GCAT_LAUNCH_COLUMNS,
} from './parse-launch-log.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '__fixtures__');
// Release 1.8.8 (live since 2026-09-03): 33 columns.
const HEADER_FIXTURE = readFileSync(join(fixturesDir, 'launch-log-header.tsv'), 'utf8');
const HEADER_1_8_0 = readFileSync(join(fixturesDir, 'launch-log-header-1.8.0.tsv'), 'utf8');
// Real 1.8.8 rows: Sputnik 1 and Apollo 11.
const ROWS_1_8_8 = readFileSync(join(fixturesDir, 'launch-log-rows-1.8.8.tsv'), 'utf8');

describe('assertGcatHeader', () => {
  it('accepts the 33-column Release 1.8.8 header and locates columns by name', () => {
    const res = assertGcatHeader(HEADER_FIXTURE);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.index.width).toBe(33);
    expect(res.index.at.Launch_Date).toBe(2);
    expect(res.index.at.Mission).toBe(8);
    expect(res.index.at.Dest).toBe(22);
    expect(res.index.at.Category).toBe(29);
    expect(res.index.at.Notes).toBe(32);
  });

  it('still accepts the 28-column Release 1.8.0 header', () => {
    const res = assertGcatHeader(HEADER_1_8_0);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.index).toEqual(GCAT_1_8_0_INDEX);
  });

  it('flags missing header', () => {
    const res = assertGcatHeader('');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('no-header');
  });

  it('flags a removed required column, naming it', () => {
    const removed = HEADER_FIXTURE.trimEnd()
      .split('\t')
      .filter((c) => c !== 'Mission')
      .join('\t');
    const res = assertGcatHeader(removed);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('column-mismatch');
      expect(res.details).toContain("'Mission'");
    }
  });

  it('flags column-name drift', () => {
    const renamed = HEADER_FIXTURE.replace('#Launch_Tag', '#LaunchTag');
    const res = assertGcatHeader(renamed);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('column-mismatch');
  });

  it('flags a duplicated required column', () => {
    const res = assertGcatHeader(HEADER_FIXTURE.trimEnd() + '\tCategory');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('column-mismatch');
      expect(res.details).toContain("'Category'");
    }
  });

  it('exports the canonical column order', () => {
    expect(GCAT_LAUNCH_COLUMNS).toHaveLength(28);
    expect(GCAT_LAUNCH_COLUMNS[0]).toBe('#Launch_Tag');
    expect(GCAT_LAUNCH_COLUMNS[GCAT_LAUNCH_COLUMNS.length - 1]).toBe('Notes');
  });
});

describe('parseGcatLaunchDate', () => {
  it('parses second precision (Apollo 11 launch time)', () => {
    expect(parseGcatLaunchDate('1969 Jul 16 1332:00')).toEqual({
      iso: '1969-07-16T13:32:00.000Z',
      precision: 'second',
    });
  });

  it('parses Sputnik 1 launch time', () => {
    expect(parseGcatLaunchDate('1957 Oct  4 1928:34')).toEqual({
      iso: '1957-10-04T19:28:34.000Z',
      precision: 'second',
    });
  });

  it('parses minute precision (no seconds)', () => {
    expect(parseGcatLaunchDate('1942 Jun 13 1052')).toEqual({
      iso: '1942-06-13T10:52:00.000Z',
      precision: 'minute',
    });
  });

  it('parses day-only precision', () => {
    expect(parseGcatLaunchDate('1960 Apr 1')).toEqual({
      iso: '1960-04-01T00:00:00.000Z',
      precision: 'day',
    });
  });

  it('returns null on unparseable date', () => {
    expect(parseGcatLaunchDate('garbage')).toBeNull();
  });
});

describe('parseGcatLaunchCode', () => {
  it('maps SS / OS / AS / MS / DS to SUCCESS', () => {
    for (const code of ['SS', 'OS', 'AS', 'MS', 'DS']) {
      expect(parseGcatLaunchCode(code).code).toBe('SUCCESS');
    }
  });

  it('maps OF / MF / SF / AF to FAILURE', () => {
    for (const code of ['OF', 'MF', 'SF', 'AF']) {
      expect(parseGcatLaunchCode(code).code).toBe('FAILURE');
    }
  });

  it('treats Unknown second-char as FAILURE (conservative bucket)', () => {
    expect(parseGcatLaunchCode('SU').code).toBe('FAILURE');
    expect(parseGcatLaunchCode('MU').code).toBe('FAILURE');
  });

  it('preserves the raw code in the label', () => {
    expect(parseGcatLaunchCode('OS75').label).toBe('OS75');
  });
});

describe('slugify + rocketFamilyFromLvType + buildStableId', () => {
  it('slugifies free text', () => {
    expect(slugify('Falcon 9 Block 5')).toBe('falcon-9-block-5');
    expect(slugify('Starlink Group 10-31')).toBe('starlink-group-10-31');
  });

  it('strips Block / Mk variant from rocket family', () => {
    expect(rocketFamilyFromLvType('Falcon 9 Block 5')).toBe('Falcon 9');
    expect(rocketFamilyFromLvType('Saturn V')).toBe('Saturn V');
  });

  it('builds a deterministic stable id', () => {
    const id = buildStableId({
      iso: '1969-07-16T13:32:00.000Z',
      rocketFamily: 'Saturn V',
      missionName: 'Apollo 11',
    });
    expect(id).toBe('1969-07-16-saturn-v-apollo-11');
  });
});

describe('gcatRowToRawEntry', () => {
  it('maps a 28-column Sputnik 1 row to RawLaunchEntry', () => {
    const sputnik = [
      '1957 ALP  ',
      '2436116.31 ',
      '1957 Oct  4 1928:34',
      'Sputnik 8K71PS',
      '-',
      'M1-PS',
      'PS-1',
      'PS-1',
      '-',
      '-',
      'NIIP-5',
      'LC1',
      '-',
      '-',
      '    938',
      ' ',
      '    -',
      ' ',
      '-',
      '   0.084 ',
      'MVS',
      'OS',
      '-',
      'G',
      'Sat LEO O 1',
      'Energiya',
      'SFLT39-331',
      '-',
    ];
    const entry = gcatRowToRawEntry({
      row: sputnik,
      source_name: 'gcat',
      source_observed_at: '2026-05-19T00:00:00.000Z',
    });
    expect(entry).not.toBeNull();
    expect(entry?.net).toBe('1957-10-04T19:28:34.000Z');
    expect(entry?.status.code).toBe('SUCCESS');
    expect(entry?.rocket_family).toBe('Sputnik 8K71PS');
    expect(entry?.mission_name).toBe('PS-1');
    expect(entry?.agency_name).toBe('MVS');
    expect(entry?.id).toMatch(/^1957-10-04-sputnik-8k71ps-/);
  });

  it('returns null when required fields are missing', () => {
    const empty = Array(28).fill('');
    expect(
      gcatRowToRawEntry({
        row: empty,
        source_name: 'gcat',
        source_observed_at: '2026-05-19T00:00:00.000Z',
      }),
    ).toBeNull();
  });
});

describe('parseGcatLaunchTsv', () => {
  it('reads real Release 1.8.8 rows by header name, not position', () => {
    const tsv = [HEADER_FIXTURE.trimEnd(), '# Updated 2026 Oct 15 2354:30', ROWS_1_8_8].join('\n');
    const { entries, unparsed } = parseGcatLaunchTsv({
      tsv,
      source_name: 'gcat',
      source_observed_at: '2026-10-16T00:00:00.000Z',
    });
    expect(unparsed).toBe(0);
    expect(entries).toHaveLength(2);
    const [sputnik, apollo] = entries;
    expect(sputnik.net).toBe('1957-10-04T19:28:34.000Z');
    expect(sputnik.mission_name).toBe('PS-1');
    expect(sputnik.agency_name).toBe('MVS');
    expect(sputnik.status.code).toBe('SUCCESS');
    expect(sputnik.pad_location).toBe('NIIP-5');
    expect(sputnik.pad_name).toBe('LC1');
    expect(apollo.mission_name).toBe('Apollo CM-107');
    expect(apollo.rocket_family).toBe('Saturn V');
    expect(apollo.agency_name).toBe('MSFC');
    expect(apollo.status.label).toBe('DS');
    expect(apollo.pad_location).toBe('KSC');
  });

  it('parses a 1.8.0 multi-row TSV correctly + skips comment lines', () => {
    const tsv = [
      HEADER_1_8_0.trimEnd(),
      '# Updated 2026 May 20 0822:50',
      [
        '1957 ALP  ',
        '2436116.31 ',
        '1957 Oct  4 1928:34',
        'Sputnik 8K71PS',
        '-',
        'M1-PS',
        'PS-1',
        'PS-1',
        '-',
        '-',
        'NIIP-5',
        'LC1',
        '-',
        '-',
        '    938',
        ' ',
        '    -',
        ' ',
        '-',
        '   0.084 ',
        'MVS',
        'OS',
        '-',
        'G',
        'Sat LEO O 1',
        'Energiya',
        'SFLT39-331',
        '-',
      ].join('\t'),
      [
        '1969-059 ',
        '2440419.06 ',
        '1969 Jul 16 1332:00',
        'Saturn V',
        '-',
        'SA-506',
        'Apollo 11',
        'Apollo CM-107',
        '-',
        'LUT1',
        'KSC',
        'LC39A',
        '-',
        '-',
        ' 150000',
        ' ',
        '    -',
        ' ',
        '-',
        '  45.060 ',
        'MSFC',
        'DS',
        '-',
        'G',
        'Sat EEO E',
        'KHR-1',
        '-',
        '-',
      ].join('\t'),
    ].join('\n');
    const { entries, unparsed } = parseGcatLaunchTsv({
      tsv,
      source_name: 'gcat',
      source_observed_at: '2026-05-19T00:00:00.000Z',
    });
    expect(entries).toHaveLength(2);
    expect(unparsed).toBe(0);
    expect(entries[0].mission_name).toBe('PS-1');
    expect(entries[1].mission_name).toBe('Apollo CM-107');
    expect(entries[1].rocket_family).toBe('Saturn V');
    expect(entries[1].status.code).toBe('SUCCESS');
  });

  it('counts malformed rows as unparsed without crashing', () => {
    const tsv = HEADER_FIXTURE + '\nbad-row-with-wrong-columns\n';
    const { entries, unparsed } = parseGcatLaunchTsv({
      tsv,
      source_name: 'gcat',
      source_observed_at: '2026-05-19T00:00:00.000Z',
    });
    expect(entries).toHaveLength(0);
    expect(unparsed).toBe(1);
  });
});
