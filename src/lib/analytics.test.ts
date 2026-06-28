// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import * as A from './analytics';
import { EVENT_NAMES } from './analytics';

// The event registry is the single source of truth for Umami dashboards.
// These guard against the schema drift that previously crept in (parallel
// raw names + dead helpers).
describe('analytics EVENT_NAMES registry', () => {
  it('has no duplicate event names', () => {
    expect(new Set(EVENT_NAMES).size).toBe(EVENT_NAMES.length);
  });

  it('uses lower-kebab-case names only (dashboard-stable)', () => {
    for (const name of EVENT_NAMES) {
      expect(name, `"${name}" should be lower-kebab-case`).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it('covers the funnel + popularity events the product relies on', () => {
    for (const required of [
      'mission-view',
      'mission-load',
      'mission-complete',
      'fleet-entry-view',
      'science-section-view',
      'item-click',
      'filter-change',
      'search',
      'gallery-image-open',
      'panel-tab-open',
    ] as const) {
      expect(EVENT_NAMES).toContain(required);
    }
  });
});

// Override window.location so isProductionUrl() can be flipped per-test.
function setLocation(hostname: string, pathname: string): void {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { hostname, pathname },
  });
}

describe('analytics tracking helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as unknown as { umami?: unknown }).umami;
    document.querySelectorAll('script[data-umami-installed]').forEach((s) => s.remove());
  });

  it('every helper is a safe no-op on non-production URLs', () => {
    setLocation('localhost', '/');
    const umami = { track: vi.fn() };
    (window as unknown as { umami: unknown }).umami = umami;

    expect(() => {
      A.track('route-enter', { route: '/x' });
      A.trackStageFire('ep01', 'click', 12, 'data-audio-stage="moon-hook"');
      A.trackStageFire('ep01', 'cue', 5); // no target → target_prefix null branch
      A.trackRouteEnter('/moon');
      A.trackRouteEnter('/mars'); // second call exercises the route-exit branch
      A.trackItemClick('mission', 'apollo11', '/missions');
      A.trackMissionView('apollo11', 'list');
      A.trackFleetEntryView('falcon-9', 'rocket');
      A.trackFilterChange('missions', 'dest', 'mars');
      A.trackSearch('missions', '  curiosity  ');
      A.trackSearch('missions', '   '); // blank → early return branch
      A.trackLayerToggle('explore', 'orbits', true);
      A.trackViewToggle('moon', '2d');
      A.trackGalleryImageOpen('mission', 'apollo11', 2);
      A.trackGalleryImageOpen('mission', 'apollo11'); // index undefined branch
      A.trackScienceLensToggle(true, 'nav');
      A.trackMissionComplete('apollo11', 'moon');
    }).not.toThrow();

    expect(umami.track).not.toHaveBeenCalled();
  });

  it('emits typed events to umami on a production URL', () => {
    setLocation('chipi.github.io', '/orrery/missions');
    const umami = { track: vi.fn() };
    (window as unknown as { umami: unknown }).umami = umami;

    A.trackMissionView('apollo11', 'list');
    A.trackSearch('missions', 'curiosity');
    A.trackStageFire('ep01', 'click', 30, 'data-audio-stage="moon-hook"');

    expect(umami.track).toHaveBeenCalledWith('mission-view', { id: 'apollo11', source: 'list' });
    expect(umami.track).toHaveBeenCalledWith('search', {
      surface: 'missions',
      query_len: 9,
      query: 'curiosity',
    });
    expect(umami.track).toHaveBeenCalledWith('audio-stage-fire', {
      episode: 'ep01',
      action: 'click',
      at_sec: 30,
      target_prefix: 'moon-hook',
    });
  });

  it('initAnalytics injects the umami script once, production-only', () => {
    setLocation('localhost', '/');
    A.initAnalytics();
    expect(document.querySelector('script[data-umami-installed]')).toBeNull();

    setLocation('chipi.github.io', '/orrery/');
    A.initAnalytics();
    A.initAnalytics(); // idempotent
    expect(document.querySelectorAll('script[data-umami-installed]').length).toBe(1);
  });
});
