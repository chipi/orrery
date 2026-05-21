import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NasaSource, parseNasaRssXml, rssItemToRawEntry } from './nasa.js';

const FIXTURE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '__fixtures__', 'nasa-news.xml'),
  'utf8',
);

describe('parseNasaRssXml', () => {
  it('extracts items from the snapshot fixture', () => {
    const items = parseNasaRssXml(FIXTURE);
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items[0].title).toContain('Psyche');
  });
});

describe('rssItemToRawEntry', () => {
  it('maps a "<Agency> Launches <Mission>" press release to a RawLaunchEntry', () => {
    const item = {
      title: 'NASA Launches Psyche Mission Aboard SpaceX Falcon Heavy',
      pubDate: 'Fri, 13 Oct 2023 18:00:00 +0000',
      description: 'Psyche launched on a Falcon Heavy',
    };
    const e = rssItemToRawEntry(item, '2026-05-19T00:00:00Z');
    expect(e).not.toBeNull();
    expect(e?.mission_name).toContain('Psyche');
    expect(e?.rocket_family).toMatch(/Falcon/);
    expect(e?.agency_name).toBe('NASA');
    expect(e?.source_name).toBe('nasa-direct');
  });

  it('returns null when the title does not match a launch pattern', () => {
    const e = rssItemToRawEntry(
      {
        title: 'NASA Releases Technology Priorities to Energize Space Industry',
        pubDate: 'Fri, 13 Oct 2023 18:00:00 +0000',
        description: '',
      },
      '2026-05-19T00:00:00Z',
    );
    expect(e).toBeNull();
  });
});

describe('NasaSource', () => {
  it('declares the correct interface metadata', () => {
    const src = new NasaSource(async () => '');
    expect(src.name).toBe('nasa-direct');
    expect(src.priority).toBe(10);
    expect(src.defaultRole).toBe('primary');
  });

  it('returns PD-NASA citation', () => {
    const src = new NasaSource(async () => '');
    expect(src.attribution()).toMatchObject({
      citation_id: 'nasa-news',
      license: 'PD-NASA',
    });
  });

  it('parses the snapshot fixture end-to-end', async () => {
    const src = new NasaSource(async () => FIXTURE);
    const entries = await src.fetchWindow({
      mode: 'historic',
      fromIso: '2020-01-01T00:00:00Z',
      toIso: '2030-01-01T00:00:00Z',
    });
    // Only single-agency "<X> Launches <Y>" press releases match the pattern
    // v0.1; the "NASA, ULA Launch <Y>" co-launch shape is a v0.2 case.
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0].agency_name).toBe('NASA');
  });

  it('returns [] gracefully on downloader failure', async () => {
    const src = new NasaSource(async () => {
      throw new Error('network down');
    });
    const entries = await src.fetchWindow({
      mode: 'upcoming',
      fromIso: '2020-01-01T00:00:00Z',
      toIso: '2030-01-01T00:00:00Z',
    });
    expect(entries).toEqual([]);
  });
});
