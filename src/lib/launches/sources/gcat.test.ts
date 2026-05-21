/**
 * Tests for the `GcatSource` provider. The TSV download is mocked via the
 * constructor injection seam — no network in tests. Live network paths
 * are exercised end-to-end in the orchestrator integration test (S3).
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GcatSource, GCAT_RELEASE_PIN } from './gcat.js';

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  'scripts',
  'gcat',
  '__fixtures__',
);
const HEADER = readFileSync(join(fixturesDir, 'launch-log-header.tsv'), 'utf8');

const SPUTNIK_ROW = [
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
].join('\t');

const APOLLO_ROW = [
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
].join('\t');

function buildTsv(rows: string[]): string {
  return [HEADER.trimEnd(), '# Updated 2026 May 20 0822:50', ...rows].join('\n');
}

describe('GcatSource', () => {
  it('declares the correct interface metadata', () => {
    const src = new GcatSource(async () => '');
    expect(src.name).toBe('gcat');
    expect(src.priority).toBe(20);
    expect(src.mode).toBe('historic');
    expect(src.defaultRole).toBe('primary');
  });

  it('returns CC-BY citation pinned to the current release', () => {
    const src = new GcatSource(async () => '');
    const att = src.attribution();
    expect(att.citation_id).toBe('gcat-mcdowell');
    expect(att.license).toBe('CC-BY-4.0');
    expect(att.citation).toContain(GCAT_RELEASE_PIN);
    expect(att.url).toBe('https://planet4589.org/space/gcat/');
  });

  it('returns empty array for upcoming mode (historic-only source)', async () => {
    const src = new GcatSource(async () => buildTsv([SPUTNIK_ROW]));
    const entries = await src.fetchWindow({
      mode: 'upcoming',
      fromIso: '2020-01-01T00:00:00Z',
      toIso: '2030-01-01T00:00:00Z',
    });
    expect(entries).toEqual([]);
  });

  it('filters parsed entries by the requested window', async () => {
    const src = new GcatSource(async () => buildTsv([SPUTNIK_ROW, APOLLO_ROW]));
    const lunarOnly = await src.fetchWindow({
      mode: 'historic',
      fromIso: '1969-01-01T00:00:00Z',
      toIso: '1970-01-01T00:00:00Z',
    });
    expect(lunarOnly.map((e) => e.mission_name)).toEqual(['Apollo CM-107']);
  });

  it('throws when the TSV header drifts from the pinned column list', async () => {
    const badTsv = buildTsv([SPUTNIK_ROW]).replace('#Launch_Tag', '#LaunchTag');
    const src = new GcatSource(async () => badTsv);
    await expect(
      src.fetchWindow({
        mode: 'historic',
        fromIso: '1900-01-01T00:00:00Z',
        toIso: '2030-01-01T00:00:00Z',
      }),
    ).rejects.toThrow(/header assertion failed/i);
  });

  it('records source_name + source_observed_at on every entry', async () => {
    const src = new GcatSource(async () => buildTsv([APOLLO_ROW]));
    const [entry] = await src.fetchWindow({
      mode: 'historic',
      fromIso: '1969-01-01T00:00:00Z',
      toIso: '1970-01-01T00:00:00Z',
    });
    expect(entry.source_name).toBe('gcat');
    expect(entry.source_observed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
