// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';

// Env-gated (mirrors sentry.ts): a mutable mocked env lets each test flip
// analytics on/off; `dev: false` so the enabled path is reachable under vitest.
vi.mock('$env/dynamic/public', () => ({ env: {} }));
// `browser: true` so the ADR-092 opt-out gate (cookie + GPC/DNT) is live in
// these tests rather than short-circuiting on the SSR guard.
vi.mock('$app/environment', () => ({ dev: false, browser: true }));
import { env as publicEnv } from '$env/dynamic/public';

import * as A from './analytics';
import { EVENT_NAMES } from './analytics';

const UMAMI_HOST = 'https://analytics.orrerylearn.com';
const UMAMI_ID = '00000000-0000-0000-0000-000000000000';
function enableAnalytics(): void {
  publicEnv.PUBLIC_UMAMI_HOST = UMAMI_HOST;
  publicEnv.PUBLIC_UMAMI_WEBSITE_ID = UMAMI_ID;
}
function disableAnalytics(): void {
  delete publicEnv.PUBLIC_UMAMI_HOST;
  delete publicEnv.PUBLIC_UMAMI_WEBSITE_ID;
}

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

describe('analytics tracking helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    disableAnalytics();
    delete (window as unknown as { umami?: unknown }).umami;
    document.querySelectorAll('script[data-umami-installed]').forEach((s) => s.remove());
  });

  it('every helper is a safe no-op when analytics is disabled (no env vars)', () => {
    disableAnalytics();
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

  it('emits typed events to umami when enabled (env vars baked)', () => {
    enableAnalytics();
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

  it('caps the cmdk-search-hit query — it must never ship a raw transcript', () => {
    enableAnalytics();
    const umami = { track: vi.fn() };
    (window as unknown as { umami: unknown }).umami = umami;

    const long = 'a'.repeat(120);
    A.trackSearchHit(`  ${long}  `, 'physics', 'orbits');

    expect(umami.track).toHaveBeenCalledWith('cmdk-search-hit', {
      query_len: 120,
      query: 'a'.repeat(40),
      tab: 'physics',
      section: 'orbits',
    });
    const sent = umami.track.mock.calls[0][1] as { query: string };
    expect(sent.query.length).toBe(40);
  });

  it('initAnalytics injects the umami script once, only when enabled', () => {
    disableAnalytics();
    A.initAnalytics();
    expect(document.querySelector('script[data-umami-installed]')).toBeNull();

    enableAnalytics();
    A.initAnalytics();
    A.initAnalytics(); // idempotent
    const scripts = document.querySelectorAll('script[data-umami-installed]');
    expect(scripts.length).toBe(1);
    expect(scripts[0].getAttribute('src')).toBe(`${UMAMI_HOST}/script.js`);
    expect(scripts[0].getAttribute('data-website-id')).toBe(UMAMI_ID);
  });
});

// Regression guard for the 2026-09-10 prod finding: `app-load` had fired ZERO
// times against 731 route-enters, because +layout calls initAnalytics() (which
// appends a <script defer>) and then track() on the very next line — with
// window.umami still undefined, the event evaporated. Anything fired in the
// same tick as init was being lost.
describe('events fired before the umami script executes', () => {
  beforeEach(() => {
    A.__resetAnalyticsStateForTest();
    enableAnalytics();
    delete (window as unknown as { umami?: unknown }).umami;
    document.querySelectorAll('script[data-umami-installed]').forEach((s) => s.remove());
  });
  afterEach(() => {
    vi.restoreAllMocks();
    disableAnalytics();
    A.__resetAnalyticsStateForTest();
    delete (window as unknown as { umami?: unknown }).umami;
    document.querySelectorAll('script[data-umami-installed]').forEach((s) => s.remove());
  });

  it('buffers instead of dropping when window.umami is not there yet', () => {
    expect((window as unknown as { umami?: unknown }).umami).toBeUndefined();

    A.track('app-load', { version: '1.2.3' });

    expect(A.__pendingEventCountForTest()).toBe(1);
  });

  it('flushes the buffer, in order, when the script loads', () => {
    A.initAnalytics();
    const script = document.querySelector('script[data-umami-installed]')!;

    // Fired in the same tick as init — the exact app-load case.
    A.track('app-load', { version: '1.2.3' });
    A.trackRouteEnter('/explore');
    expect(A.__pendingEventCountForTest()).toBe(2);

    // Now the deferred script executes and defines the global.
    const umami = { track: vi.fn() };
    (window as unknown as { umami: unknown }).umami = umami;
    script.dispatchEvent(new Event('load'));

    expect(A.__pendingEventCountForTest()).toBe(0);
    expect(umami.track).toHaveBeenNthCalledWith(1, 'app-load', { version: '1.2.3' });
    expect(umami.track).toHaveBeenNthCalledWith(2, 'route-enter', {
      route: '/explore',
      from_route: null,
    });
  });

  it('goes straight through once umami is present', () => {
    const umami = { track: vi.fn() };
    (window as unknown as { umami: unknown }).umami = umami;

    A.track('app-load', { version: '1.2.3' });

    expect(A.__pendingEventCountForTest()).toBe(0);
    expect(umami.track).toHaveBeenCalledWith('app-load', { version: '1.2.3' });
  });

  it('caps the buffer so a never-loading script cannot grow it without bound', () => {
    for (let i = 0; i < 60; i++) A.track('app-load', { i });
    expect(A.__pendingEventCountForTest()).toBe(50);
  });

  it('does not buffer when the visitor has opted out', () => {
    document.cookie = 'orrery_analytics_optout=1; Path=/';
    A.track('app-load', { version: '1.2.3' });
    expect(A.__pendingEventCountForTest()).toBe(0);
    document.cookie = 'orrery_analytics_optout=; Max-Age=0; Path=/';
  });
});

// Journey instrumentation (2026-09-10). These are MILESTONE events; the thing
// that makes them useful is that they fire once. A re-render, a scrub, or a
// walk back up the scale ladder must not inflate the funnel.
describe('journey milestone events', () => {
  beforeEach(() => {
    A.__resetAnalyticsStateForTest();
    enableAnalytics();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    disableAnalytics();
    A.__resetAnalyticsStateForTest();
    delete (window as unknown as { umami?: unknown }).umami;
  });

  function mockUmami() {
    const umami = { track: vi.fn() };
    (window as unknown as { umami: unknown }).umami = umami;
    return umami;
  }

  it('explore-depth fires once per level, not once per visit to it', () => {
    const umami = mockUmami();

    A.trackExploreDepth('solar-system');
    A.trackExploreDepth('milky-way');
    A.trackExploreDepth('solar-system'); // walked back in — must NOT re-fire
    A.trackExploreDepth('milky-way');

    expect(umami.track).toHaveBeenCalledTimes(2);
    expect(umami.track).toHaveBeenCalledWith('explore-depth', { level: 'solar-system' });
    expect(umami.track).toHaveBeenCalledWith('explore-depth', { level: 'milky-way' });
  });

  it('explore-depth ignores the off-ladder body-scene context', () => {
    const umami = mockUmami();
    A.trackExploreDepth('body-scene');
    A.trackExploreDepth('');
    expect(umami.track).not.toHaveBeenCalled();
  });

  // One event NAME per act — Umami funnel steps match on name, not property.
  it('emits a per-act event name, deduped per mission+act', () => {
    const umami = mockUmami();

    A.trackFlyPhase('apollo11', 'MOON', 'ascent');
    A.trackFlyPhase('apollo11', 'MOON', 'ascent'); // scrubbed back — no re-fire
    A.trackFlyPhase('apollo11', 'MOON', 'descent');
    A.trackFlyPhase('curiosity', 'MARS', 'ascent'); // different mission — fires

    expect(umami.track).toHaveBeenCalledTimes(3);
    expect(umami.track).toHaveBeenCalledWith('fly-ascent', {
      mission: 'apollo11',
      dest: 'MOON',
    });
    expect(umami.track).toHaveBeenCalledWith('fly-descent', {
      mission: 'apollo11',
      dest: 'MOON',
    });
    expect(umami.track).toHaveBeenCalledWith('fly-ascent', {
      mission: 'curiosity',
      dest: 'MARS',
    });
  });

  it('maps every act the /fly state machine can report', () => {
    const umami = mockUmami();
    for (const act of ['ascent', 'coast', 'cruise', 'descent', 'recovery']) {
      A.trackFlyPhase('apollo11', 'MOON', act);
    }
    expect(umami.track.mock.calls.map((c) => c[0])).toEqual([
      'fly-ascent',
      'fly-coast',
      'fly-cruise',
      'fly-descent',
      'fly-recovery',
    ]);
  });

  it('ignores a non-act state rather than inventing an event name', () => {
    const umami = mockUmami();
    A.trackFlyPhase('apollo11', 'MOON', 'opening');
    A.trackFlyPhase('apollo11', 'MOON', 'something-new');
    expect(umami.track).not.toHaveBeenCalled();
  });

  it('plan-run separates the landing default from a deliberate change', () => {
    const umami = mockUmami();

    A.trackPlanRun('mars', 'LANDING', 'initial');
    A.trackPlanRun('mars', 'LANDING', 'initial'); // re-render — no re-fire
    A.trackPlanRun('venus', 'LANDING', 'destination-change');

    expect(umami.track).toHaveBeenCalledTimes(2);
    expect(umami.track).toHaveBeenCalledWith('plan-run', {
      destination: 'mars',
      mission_type: 'LANDING',
      trigger: 'initial',
    });
    expect(umami.track).toHaveBeenCalledWith('plan-run', {
      destination: 'venus',
      mission_type: 'LANDING',
      trigger: 'destination-change',
    });
  });

  it('plan-window-select is NOT deduped — repeat picks are real engagement', () => {
    const umami = mockUmami();

    A.trackPlanWindowSelect('mars', 2028);
    A.trackPlanWindowSelect('mars', 2031);
    A.trackPlanWindowSelect('mars', 2028);

    expect(umami.track).toHaveBeenCalledTimes(3);
    expect(umami.track).toHaveBeenCalledWith('plan-window-select', {
      destination: 'mars',
      dep_year: 2028,
    });
  });

  it('plan-window-select tolerates a missing departure year', () => {
    const umami = mockUmami();
    A.trackPlanWindowSelect('mars', null);
    expect(umami.track).toHaveBeenCalledWith('plan-window-select', {
      destination: 'mars',
      dep_year: null,
    });
  });

  it('tour-complete fires once', () => {
    const umami = mockUmami();
    A.trackTourComplete('curator-full');
    A.trackTourComplete('curator-full');
    expect(umami.track).toHaveBeenCalledTimes(1);
    expect(umami.track).toHaveBeenCalledWith('tour-complete', { tour: 'curator-full' });
  });

  it('science-to-app carries the originating route as from_tab', () => {
    const umami = mockUmami();
    A.trackRouteEnter('/explore');
    A.trackRouteEnter('/science/physics/orbits');
    umami.track.mockClear();

    A.trackScienceToApp('orbits', '/plan');

    expect(umami.track).toHaveBeenCalledWith('science-to-app', {
      topic: 'orbits',
      destination: '/plan',
      from_tab: '/explore',
    });
  });

  it('sourceRoute is null on a cold entry — itself the signal', () => {
    // No prior route-enter in this reset state.
    A.trackRouteEnter('/science/physics/orbits');
    expect(A.sourceRoute()).toBeNull();
  });

  it('every journey helper is a safe no-op when analytics is disabled', () => {
    disableAnalytics();
    const umami = mockUmami();

    expect(() => {
      A.trackExploreDepth('milky-way');
      A.trackPlanRun('mars', 'LANDING', 'initial');
      A.trackPlanWindowSelect('mars', 2028);
      A.trackFlyPhase('apollo11', 'MOON', 'ascent');
      A.trackScienceToApp('orbits', '/plan');
      A.trackTourComplete('curator-full');
    }).not.toThrow();

    expect(umami.track).not.toHaveBeenCalled();
  });
});

// ADR-092. The opt-out has to bite BEFORE injection, not just on track():
// Umami's autotrack binds history listeners at script load and they cannot be
// unbound, so a script that has already loaded keeps collecting pageviews.
describe('analytics opt-out gate (ADR-092)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    disableAnalytics();
    delete (window as unknown as { umami?: unknown }).umami;
    document.querySelectorAll('script[data-umami-installed]').forEach((s) => s.remove());
    document.cookie = 'orrery_analytics_optout=; Max-Age=0; Path=/';
    Object.defineProperty(navigator, 'globalPrivacyControl', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  it('never injects the script when the user has opted out', () => {
    enableAnalytics();
    document.cookie = 'orrery_analytics_optout=1; Path=/';

    A.initAnalytics();

    expect(document.querySelector('script[data-umami-installed]')).toBeNull();
  });

  it('never injects the script when the browser signals GPC', () => {
    enableAnalytics();
    Object.defineProperty(navigator, 'globalPrivacyControl', {
      value: true,
      configurable: true,
      writable: true,
    });

    A.initAnalytics();

    expect(document.querySelector('script[data-umami-installed]')).toBeNull();
  });

  it('makes every track() a no-op while opted out, even if umami already loaded', () => {
    enableAnalytics();
    const umami = { track: vi.fn() };
    (window as unknown as { umami: unknown }).umami = umami;
    document.cookie = 'orrery_analytics_optout=1; Path=/';

    A.track('route-enter', { route: '/x' });
    A.trackMissionView('apollo11', 'list');
    A.trackSearch('missions', 'curiosity');
    A.trackSearchHit('curiosity', 'physics', 'orbits');

    expect(umami.track).not.toHaveBeenCalled();
  });

  it('still fires once the opt-out is lifted', () => {
    enableAnalytics();
    const umami = { track: vi.fn() };
    (window as unknown as { umami: unknown }).umami = umami;

    document.cookie = 'orrery_analytics_optout=1; Path=/';
    A.trackMissionView('apollo11', 'list');
    expect(umami.track).not.toHaveBeenCalled();

    document.cookie = 'orrery_analytics_optout=; Max-Age=0; Path=/';
    A.trackMissionView('apollo11', 'list');
    expect(umami.track).toHaveBeenCalledWith('mission-view', { id: 'apollo11', source: 'list' });
  });
});
