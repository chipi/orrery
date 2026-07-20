/**
 * Unit tests for the launch manifest utility functions (PRD-020 / RFC-023 §8.1).
 *
 * Covers: decadeForYear, ALL_DECADES, formatNet, formatCountdown, groupByMonth.
 * loadUpcoming + loadHistoricDecade are async fetch wrappers tested via
 * fetch-mocking; SSR-safe (no DOM required).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  decadeForYear,
  ALL_DECADES,
  formatNet,
  formatCountdown,
  groupByMonth,
  loadUpcoming,
  loadHistoricDecade,
  type LaunchEntry,
  type Manifest,
} from './manifest.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<LaunchEntry> = {}): LaunchEntry {
  return {
    id: 'test-001',
    net: '2026-03-15T12:00:00.000Z',
    net_precision: 'minute',
    status: { code: 'GO', label: 'Go for Launch' },
    name: 'Test Launch',
    agency_name: 'SpaceX',
    rocket_config_name: 'Falcon 9 Block 5',
    rocket_family: 'Falcon 9',
    orrery_launcher_ref: null,
    tier: 'T1',
    tier_reason: 'crew mission',
    editorial_note: null,
    provenance_chain: [],
    fetched_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeManifest(entries: Record<string, LaunchEntry> = {}): Manifest {
  return {
    version: 1,
    generated_at: '2026-01-01T00:00:00.000Z',
    sources_active: ['ll2'],
    entries,
  };
}

// ---------------------------------------------------------------------------
// decadeForYear
// ---------------------------------------------------------------------------

describe('decadeForYear', () => {
  it('years before 1970 → "1957-1969"', () => {
    expect(decadeForYear(1957)).toBe('1957-1969');
    expect(decadeForYear(1969)).toBe('1957-1969');
  });

  it('1970–1979 → "1970-1979"', () => {
    expect(decadeForYear(1970)).toBe('1970-1979');
    expect(decadeForYear(1979)).toBe('1970-1979');
  });

  it('1980–1989 → "1980-1989"', () => {
    expect(decadeForYear(1980)).toBe('1980-1989');
    expect(decadeForYear(1989)).toBe('1980-1989');
  });

  it('1990–1999 → "1990-1999"', () => {
    expect(decadeForYear(1990)).toBe('1990-1999');
    expect(decadeForYear(1999)).toBe('1990-1999');
  });

  it('2000–2009 → "2000-2009"', () => {
    expect(decadeForYear(2000)).toBe('2000-2009');
    expect(decadeForYear(2009)).toBe('2000-2009');
  });

  it('2010–2019 → "2010-2019"', () => {
    expect(decadeForYear(2010)).toBe('2010-2019');
    expect(decadeForYear(2019)).toBe('2010-2019');
  });

  it('2020+ → "2020-2026"', () => {
    expect(decadeForYear(2020)).toBe('2020-2026');
    expect(decadeForYear(2026)).toBe('2020-2026');
    expect(decadeForYear(2099)).toBe('2020-2026');
  });
});

// ---------------------------------------------------------------------------
// ALL_DECADES constant
// ---------------------------------------------------------------------------

describe('ALL_DECADES', () => {
  it('contains all 7 decade strings', () => {
    expect(ALL_DECADES).toHaveLength(7);
  });

  it('starts with the earliest and ends with the most recent', () => {
    expect(ALL_DECADES[0]).toBe('1957-1969');
    expect(ALL_DECADES[ALL_DECADES.length - 1]).toBe('2020-2026');
  });

  it('each string matches decadeForYear output for its start year', () => {
    for (const decade of ALL_DECADES) {
      const startYear = parseInt(decade.split('-')[0], 10);
      expect(decadeForYear(startYear)).toBe(decade);
    }
  });
});

// ---------------------------------------------------------------------------
// formatNet
// ---------------------------------------------------------------------------

describe('formatNet', () => {
  // Fixed ISO string: 2026-03-05T18:42:00.000Z
  const iso = '2026-03-05T18:42:00.000Z';

  it('precision=year → "2026"', () => {
    expect(formatNet(iso, 'year')).toBe('2026');
  });

  it('precision=month → "Mar 2026"', () => {
    expect(formatNet(iso, 'month')).toBe('Mar 2026');
  });

  it('precision=day → "Mar 5, 2026"', () => {
    expect(formatNet(iso, 'day')).toBe('Mar 5, 2026');
  });

  it('precision=minute → "Mar 5, 2026 18:42Z"', () => {
    expect(formatNet(iso, 'minute')).toBe('Mar 5, 2026 18:42Z');
  });

  it('precision=second → "Mar 5, 2026 18:42Z" (same as minute)', () => {
    expect(formatNet(iso, 'second')).toBe('Mar 5, 2026 18:42Z');
  });

  it('precision=hour → uses HH:MM UTC format', () => {
    expect(formatNet(iso, 'hour')).toBe('Mar 5, 2026 18:42Z');
  });

  it('pads hours and minutes to two digits', () => {
    // 2026-01-01T09:05:00Z → "09:05Z"
    expect(formatNet('2026-01-01T09:05:00.000Z', 'minute')).toBe('Jan 1, 2026 09:05Z');
  });

  it('all 12 month abbreviations via month precision', () => {
    const expected = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    for (let m = 0; m < 12; m++) {
      const isoM = `2026-${String(m + 1).padStart(2, '0')}-15T00:00:00.000Z`;
      expect(formatNet(isoM, 'month')).toBe(`${expected[m]} 2026`);
    }
  });
});

// ---------------------------------------------------------------------------
// formatCountdown
// ---------------------------------------------------------------------------

describe('formatCountdown', () => {
  const base = new Date('2026-01-01T00:00:00.000Z');

  it('past target returns "in flight"', () => {
    const past = new Date('2025-12-31T23:59:59.000Z').toISOString();
    expect(formatCountdown(past, base)).toBe('in flight');
  });

  it('exactly now (ms=0) is not past so returns T-0 countdown (guard: only ms<0 is "in flight")', () => {
    // The code checks ms < 0, so 0 ms remaining is T-0 in 0m, not "in flight".
    expect(formatCountdown(base.toISOString(), base)).toBe('T-0 in 0m');
  });

  it('days remaining → "T-0 in Nd Nh"', () => {
    const target = new Date('2026-01-04T06:00:00.000Z').toISOString(); // 3d 6h ahead
    expect(formatCountdown(target, base)).toBe('T-0 in 3d 6h');
  });

  it('hours remaining (< 1 day) → "T-0 in Hh Mm"', () => {
    const target = new Date('2026-01-01T05:30:00.000Z').toISOString(); // 5h 30m ahead
    expect(formatCountdown(target, base)).toBe('T-0 in 5h 30m');
  });

  it('minutes remaining (< 1 hour) → "T-0 in Mm"', () => {
    const target = new Date('2026-01-01T00:45:00.000Z').toISOString(); // 45m ahead
    expect(formatCountdown(target, base)).toBe('T-0 in 45m');
  });

  it('uses default now argument (smoke test — just check return shape)', () => {
    // Just verify it returns a string and doesn't throw
    const r = formatCountdown('2099-12-31T00:00:00.000Z');
    expect(typeof r).toBe('string');
    expect(r).toMatch(/T-0 in \d+d \d+h/);
  });
});

// ---------------------------------------------------------------------------
// groupByMonth
// ---------------------------------------------------------------------------

describe('groupByMonth', () => {
  it('empty input returns empty array', () => {
    expect(groupByMonth([])).toEqual([]);
  });

  it('single entry creates one group with correct key + label', () => {
    const e = makeEntry({ net: '2026-03-15T12:00:00.000Z' });
    const groups = groupByMonth([e]);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe('2026-03');
    expect(groups[0].label).toBe("Mar '26");
    expect(groups[0].entries).toHaveLength(1);
  });

  it('entries in same month are grouped together and sorted by net', () => {
    const e1 = makeEntry({ id: 'a', net: '2026-03-20T00:00:00.000Z' });
    const e2 = makeEntry({ id: 'b', net: '2026-03-05T00:00:00.000Z' });
    const groups = groupByMonth([e1, e2]);
    expect(groups).toHaveLength(1);
    expect(groups[0].entries[0].id).toBe('b');
    expect(groups[0].entries[1].id).toBe('a');
  });

  it('entries in different months produce separate groups sorted by key', () => {
    const e1 = makeEntry({ id: 'may', net: '2026-05-01T00:00:00.000Z' });
    const e2 = makeEntry({ id: 'jan', net: '2026-01-15T00:00:00.000Z' });
    const e3 = makeEntry({ id: 'mar', net: '2026-03-10T00:00:00.000Z' });
    const groups = groupByMonth([e1, e2, e3]);
    expect(groups.map((g) => g.key)).toEqual(['2026-01', '2026-03', '2026-05']);
  });

  it('label format uses short year: "Jan \'26"', () => {
    const e = makeEntry({ net: '2026-01-01T00:00:00.000Z' });
    const groups = groupByMonth([e]);
    expect(groups[0].label).toBe("Jan '26");
  });

  it('handles January (month 01) — zero-indexed offset is 0', () => {
    const e = makeEntry({ net: '2026-01-20T00:00:00.000Z' });
    const groups = groupByMonth([e]);
    expect(groups[0].key).toBe('2026-01');
    expect(groups[0].label).toMatch(/^Jan/);
  });

  it('handles December (month 12) — zero-indexed offset is 11', () => {
    const e = makeEntry({ net: '2026-12-01T00:00:00.000Z' });
    const groups = groupByMonth([e]);
    expect(groups[0].key).toBe('2026-12');
    expect(groups[0].label).toMatch(/^Dec/);
  });

  it('entries from different years are grouped by year-month separately', () => {
    const e1 = makeEntry({ id: 'y1', net: '2025-11-01T00:00:00.000Z' });
    const e2 = makeEntry({ id: 'y2', net: '2026-11-01T00:00:00.000Z' });
    const groups = groupByMonth([e1, e2]);
    expect(groups).toHaveLength(2);
    expect(groups[0].key).toBe('2025-11');
    expect(groups[1].key).toBe('2026-11');
  });
});

// ---------------------------------------------------------------------------
// loadUpcoming + loadHistoricDecade — fetch mocks
// ---------------------------------------------------------------------------

describe('loadUpcoming', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the parsed manifest on HTTP 200', async () => {
    const manifest = makeManifest({ 'test-001': makeEntry() });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(manifest),
    } as Response);
    const result = await loadUpcoming();
    expect(result.version).toBe(1);
    expect(result.entries).toHaveProperty('test-001');
  });

  it('returns empty manifest on HTTP error', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    const result = await loadUpcoming();
    expect(result).toEqual({ version: 1, generated_at: null, sources_active: [], entries: {} });
  });
});

describe('loadHistoricDecade', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches the correct decade URL and parses result', async () => {
    const manifest = makeManifest();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(manifest),
    } as Response);
    const result = await loadHistoricDecade('1970-1979');
    expect(result.version).toBe(1);
    // Verify the fetch URL contained the decade path
    const fetchArg = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(fetchArg).toContain('1970-1979');
  });

  it('returns empty manifest on HTTP error', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    const result = await loadHistoricDecade('1980-1989');
    expect(result).toEqual({ version: 1, generated_at: null, sources_active: [], entries: {} });
  });
});
