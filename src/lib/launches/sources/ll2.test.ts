/**
 * Tests for `LL2Source` — uses constructor-injected downloader (no network).
 */

import { describe, expect, it } from 'vitest';
import { LL2Source, ll2RawToRawEntry } from './ll2.js';

const fakeRaw = {
  id: 'ef65c43b-aaaa-4ddd-9155-289eaabdd000',
  url: 'https://ll.thespacedevs.com/2.3.0/launches/ef65c43b-aaaa-4ddd-9155-289eaabdd000/',
  name: 'Falcon 9 Block 5 | Starlink Group 10-31',
  net: '2026-05-26T18:42:00Z',
  net_precision: { name: 'Minute' },
  status: { id: 1, name: 'Go for Launch', abbrev: 'Go' },
  window_start: '2026-05-26T18:42:00Z',
  window_end: '2026-05-26T22:12:00Z',
  mission: {
    name: 'Starlink Group 10-31',
    type: 'Communications',
    orbit: { name: 'Low Earth Orbit', abbrev: 'LEO' },
  },
  launch_service_provider: {
    id: 121,
    name: 'SpaceX',
    type: { name: 'Commercial' },
    country: [{ alpha_2_code: 'US' }],
  },
  rocket: {
    configuration: {
      id: 164,
      full_name: 'Falcon 9 Block 5',
      name: 'Falcon 9',
      family: 'Falcon 9',
    },
  },
  pad: {
    name: 'SLC-40',
    location: { name: 'Cape Canaveral SFS, FL, USA' },
  },
  image: { image_url: '/static/img/foo.jpg', credit: 'SpaceX' },
  webcast_live: false,
};

describe('ll2RawToRawEntry', () => {
  it('maps a full LL2 payload to RawLaunchEntry', () => {
    const e = ll2RawToRawEntry(fakeRaw, '2026-05-19T14:30:00.000Z');
    expect(e).not.toBeNull();
    expect(e?.id).toBe('2026-05-26-falcon-9-starlink-group-10-31');
    expect(e?.status.code).toBe('GO');
    expect(e?.net).toBe('2026-05-26T18:42:00.000Z');
    expect(e?.agency_type).toBe('Commercial');
    expect(e?.country).toBe('US');
    expect(e?.orbit_abbrev).toBe('LEO');
    expect(e?.rocket_family).toBe('Falcon 9');
    expect(e?.pad_name).toBe('SLC-40');
    expect(e?.source_name).toBe('ll2');
    expect(e?.source_url).toBe(
      'https://ll.thespacedevs.com/2.3.0/launches/ef65c43b-aaaa-4ddd-9155-289eaabdd000/',
    );
  });

  it('returns null on missing id', () => {
    expect(
      ll2RawToRawEntry({ ...fakeRaw, id: undefined as unknown as string }, '2026-05-19T00:00:00Z'),
    ).toBeNull();
  });

  it('returns null on unparseable net', () => {
    expect(ll2RawToRawEntry({ ...fakeRaw, net: 'tbd' }, '2026-05-19T00:00:00Z')).toBeNull();
  });

  it('maps status codes', () => {
    const e = ll2RawToRawEntry(
      { ...fakeRaw, status: { id: 4, name: 'Launch Failure' } },
      '2026-05-19T00:00:00Z',
    );
    expect(e?.status.code).toBe('FAILURE');
  });
});

describe('LL2Source', () => {
  it('declares correct interface metadata', () => {
    const src = new LL2Source(async () => []);
    expect(src.name).toBe('ll2');
    expect(src.priority).toBe(90);
    expect(src.mode).toBe('both');
    expect(src.defaultRole).toBe('fallback-primary');
  });

  it('returns CC-BY-style permissive citation', () => {
    const src = new LL2Source(async () => []);
    const att = src.attribution();
    expect(att.citation_id).toBe('ll2-thespacedevs');
    expect(att.license).toBe('permissive');
  });

  it('returns parsed + window-filtered entries for upcoming mode', async () => {
    const src = new LL2Source(async () => [fakeRaw]);
    const entries = await src.fetchWindow({
      mode: 'upcoming',
      fromIso: '2026-01-01T00:00:00Z',
      toIso: '2027-01-01T00:00:00Z',
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('2026-05-26-falcon-9-starlink-group-10-31');
  });

  it('returns empty for historic mode (v0.1 default — GCAT covers historic)', async () => {
    const src = new LL2Source(async () => [fakeRaw]);
    const entries = await src.fetchWindow({
      mode: 'historic',
      fromIso: '1957-01-01T00:00:00Z',
      toIso: '2026-01-01T00:00:00Z',
    });
    expect(entries).toEqual([]);
  });

  it('drops entries outside the window', async () => {
    const old = { ...fakeRaw, net: '1999-01-01T00:00:00Z' };
    const src = new LL2Source(async () => [old]);
    const entries = await src.fetchWindow({
      mode: 'upcoming',
      fromIso: '2026-01-01T00:00:00Z',
      toIso: '2027-01-01T00:00:00Z',
    });
    expect(entries).toHaveLength(0);
  });
});
