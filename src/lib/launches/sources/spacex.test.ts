import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SpaceXSource, parseSpaceXHtml, spaceXArticleToRawEntry } from './spacex.js';

const FIXTURE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '__fixtures__', 'spacex-launches.html'),
  'utf8',
);

describe('parseSpaceXHtml', () => {
  it('extracts launch articles from the snapshot fixture', () => {
    const arts = parseSpaceXHtml(FIXTURE);
    expect(arts.length).toBeGreaterThanOrEqual(2);
    expect(arts[0].vehicle.toLowerCase()).toContain('starship');
  });
});

describe('spaceXArticleToRawEntry', () => {
  it('maps a parsed article to RawLaunchEntry', () => {
    const e = spaceXArticleToRawEntry(
      {
        title: 'Starlink Group 10-99',
        isoDate: '2026-06-20T18:00:00Z',
        vehicle: 'Falcon 9',
        pad: 'SLC-40',
      },
      '2026-05-19T00:00:00Z',
    );
    expect(e?.mission_name).toBe('Starlink Group 10-99');
    expect(e?.rocket_family).toBe('Falcon 9');
    expect(e?.agency_name).toBe('SpaceX');
    expect(e?.source_name).toBe('spacex-direct');
  });
});

describe('SpaceXSource', () => {
  it('declares the correct interface metadata', () => {
    const src = new SpaceXSource(async () => '');
    expect(src.name).toBe('spacex-direct');
    expect(src.priority).toBe(11);
    expect(src.defaultRole).toBe('primary');
  });

  it('returns [] for historic mode (upcoming-only source)', async () => {
    const src = new SpaceXSource(async () => FIXTURE);
    const entries = await src.fetchWindow({
      mode: 'historic',
      fromIso: '2020-01-01T00:00:00Z',
      toIso: '2030-01-01T00:00:00Z',
    });
    expect(entries).toEqual([]);
  });

  it('parses the snapshot fixture end-to-end', async () => {
    const src = new SpaceXSource(async () => FIXTURE);
    const entries = await src.fetchWindow({
      mode: 'upcoming',
      fromIso: '2026-01-01T00:00:00Z',
      toIso: '2027-01-01T00:00:00Z',
    });
    expect(entries.length).toBe(2);
  });

  it('returns [] on downloader failure', async () => {
    const src = new SpaceXSource(async () => {
      throw new Error('blocked');
    });
    const entries = await src.fetchWindow({
      mode: 'upcoming',
      fromIso: '2020-01-01T00:00:00Z',
      toIso: '2030-01-01T00:00:00Z',
    });
    expect(entries).toEqual([]);
  });
});
