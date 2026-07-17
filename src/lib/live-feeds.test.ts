// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deriveLaunchFeedState, getLiveFeeds, getNextLaunch } from './live-feeds';
import { __resetVideoProvenanceCache } from './video-provenance';

/** PRD-031 / RFC-033 §7 — the time-gate is pure and must be honest: only
 *  live-or-imminent launches surface, computed from scheduled net vs now. */
describe('deriveLaunchFeedState', () => {
  const now = new Date('2026-07-16T12:00:00Z');
  const at = (offsetMin: number) => new Date(now.getTime() + offsetMin * 60_000).toISOString();

  it("T-30min → 'imminent'", () => {
    expect(deriveLaunchFeedState(at(30), now)).toBe('imminent');
  });

  it("T-59min → 'imminent' (inside the window)", () => {
    expect(deriveLaunchFeedState(at(59), now)).toBe('imminent');
  });

  it("T-60min exactly → 'imminent' (inclusive boundary)", () => {
    expect(deriveLaunchFeedState(at(60), now)).toBe('imminent');
  });

  it('T-90min → null (beyond the imminent window)', () => {
    expect(deriveLaunchFeedState(at(90), now)).toBeNull();
  });

  it("T-0 exactly → 'live'", () => {
    expect(deriveLaunchFeedState(at(0), now)).toBe('live');
  });

  it("T+10min → 'live' (within the grace window)", () => {
    expect(deriveLaunchFeedState(at(-10), now)).toBe('live');
  });

  it('T+31min → null (just past the 30-min grace boundary)', () => {
    expect(deriveLaunchFeedState(at(-31), now)).toBeNull();
  });

  it('T+40min → null (grace window is 30 min, so this is past it)', () => {
    expect(deriveLaunchFeedState(at(-40), now)).toBeNull();
  });

  it('invalid net → null', () => {
    expect(deriveLaunchFeedState('not-a-date', now)).toBeNull();
  });
});

// ─── getLiveFeeds / getNextLaunch (mocked manifests) ─────────────────
const NOW = new Date('2026-07-16T12:00:00Z');
const netAt = (min: number) => new Date(NOW.getTime() + min * 60_000).toISOString();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clip = (over: Record<string, unknown>): any => ({
  id: 'vid-x',
  entity_id: 'e',
  entity_kind: 'mission',
  provider: 'youtube',
  provider_ref: 'abcdefghijk',
  source_url: 'https://y/x',
  channel: 'NASA',
  agency: 'NASA',
  title: 't',
  caption: null,
  kind: 'milestone',
  poster: null,
  duration_seconds: null,
  start_seconds: 0,
  license_or_fair_use: 'PD',
  content_advisory: null,
  last_verified: '',
  notes: null,
  ...over,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const launch = (id: string, net: string, name: string): any => ({
  id,
  net,
  name,
  agency_name: 'Agency',
  provenance_chain: [{ source: 'll2', source_url: `https://ll2/${id}`, role: 'primary' }],
});

const VIDEO_MANIFEST = {
  schema_version: 1,
  generated_at: '',
  script_version: '',
  commit_sha: null,
  entries: [
    clip({
      id: 'vid-iss',
      entity_id: 'iss-live',
      entity_kind: 'live-pin',
      kind: 'live',
      title: 'ISS',
    }),
    clip({ id: 'vid-clip', entity_id: 'apollo11', entity_kind: 'mission' }), // must NOT surface
  ],
};
const LAUNCHES = {
  version: 1,
  generated_at: null,
  sources_active: [],
  entries: {
    imminent: launch('imminent', netAt(20), 'Imminent One'),
    live: launch('live', netAt(-5), 'Live One'),
    far: launch('far', netAt(300), 'Far One'), // dropped from feeds; is the next launch
  },
};

function stubManifests() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.includes('video-provenance'))
        return Promise.resolve({ ok: true, json: async () => VIDEO_MANIFEST });
      if (url.includes('launches.json'))
        return Promise.resolve({ ok: true, json: async () => LAUNCHES });
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    }),
  );
}

describe('getLiveFeeds (mocked manifests)', () => {
  beforeEach(() => {
    __resetVideoProvenanceCache();
    vi.unstubAllGlobals();
    stubManifests();
  });

  it('surfaces the ISS live-pin, drops non-pin clips', async () => {
    const feeds = await getLiveFeeds(NOW);
    const iss = feeds.filter((f) => f.kind === 'iss-permanent');
    expect(iss).toHaveLength(1);
    expect(iss[0].state).toBe('live');
    expect(iss[0].video?.entity_id).toBe('iss-live');
    // the ordinary mission clip must never appear as a live feed
    expect(feeds.some((f) => f.id === 'vid-clip')).toBe(false);
  });

  it('time-gates launches (live + imminent surface, far dropped)', async () => {
    const feeds = await getLiveFeeds(NOW);
    const launches = feeds.filter((f) => f.kind === 'launch-broadcast');
    const byId = Object.fromEntries(launches.map((f) => [f.id, f.state]));
    expect(byId['launch-live']).toBe('live');
    expect(byId['launch-imminent']).toBe('imminent');
    expect(byId['launch-far']).toBeUndefined();
  });

  it('sorts live before imminent', async () => {
    const feeds = await getLiveFeeds(NOW);
    const firstImminent = feeds.findIndex((f) => f.state === 'imminent');
    const lastLive = feeds.map((f) => f.state).lastIndexOf('live');
    expect(lastLive).toBeLessThan(firstImminent);
  });
});

describe('getNextLaunch', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    stubManifests();
  });

  it('returns the soonest still-upcoming launch', async () => {
    const next = await getNextLaunch(NOW);
    // 'live' is in the past; 'imminent' (T-20) is the soonest future.
    expect(next?.name).toBe('Imminent One');
    expect(next?.source_url).toBe('https://ll2/imminent');
  });
});
