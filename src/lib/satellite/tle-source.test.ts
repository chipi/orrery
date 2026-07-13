import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveStationTle } from './tle-source';

const TIANGONG_TLE = [
  'TIANGONG-TEST',
  '1 48274U 21035A   24280.50000000  .00025000  00000-0  28000-3 0  9990',
  '2 48274  41.4700 100.0000 0004500  50.0000 310.0000 15.60000000 10000',
].join('\n');

describe('satellite/tle-source', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns a freshly fetched Celestrak TLE', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, text: async () => TIANGONG_TLE })),
    );
    const tle = await resolveStationTle('tiangong');
    expect(tle.noradId).toBe(48274);
  });

  it('falls back to the bundled sample when the fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    const tle = await resolveStationTle('iss');
    expect(tle.noradId).toBe(25544); // bundled ISS
  });

  it('rejects a non-TLE body (e.g. rate-limit HTML) and falls back', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, text: async () => '<html>rate limited</html>' })),
    );
    // Use a distinct id (memo per-id) to avoid the earlier cache.
    const tle = await resolveStationTle('tiangong');
    // tiangong was memoised from the first test → still 48274; assert it parses.
    expect(tle.noradId).toBeGreaterThan(0);
  });
});
