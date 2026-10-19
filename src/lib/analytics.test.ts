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
    // Pageviews record the path only: no ?id= / ?nb= selections (#601).
    expect(scripts[0].getAttribute('data-exclude-search')).toBe('true');
    // SRI-pinned, CORS mode (#601).
    expect(scripts[0].getAttribute('integrity')).toBe(A.UMAMI_SCRIPT_INTEGRITY);
    expect(A.UMAMI_SCRIPT_INTEGRITY).toMatch(/^sha384-[A-Za-z0-9+/]{64}$/);
    expect(scripts[0].getAttribute('crossorigin')).toBe('anonymous');
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

    A.track('search-open', { surface: 'cmdk' });

    expect(A.__pendingEventCountForTest()).toBe(1);
  });

  it('flushes the buffer, in order, after the page has loaded (after Umami’s pageview)', async () => {
    A.initAnalytics();
    const script = document.querySelector('script[data-umami-installed]')!;

    // Fired in the same tick as init.
    A.track('search-open', { surface: 'cmdk' });
    A.track('item-click', { kind: 'mission', id: 'apollo11', route: '/missions' });
    expect(A.__pendingEventCountForTest()).toBe(2);

    // Now the deferred script executes and defines the global.
    const umami = { track: vi.fn() };
    (window as unknown as { umami: unknown }).umami = umami;
    script.dispatchEvent(new Event('load'));
    // Not on the script's load event itself: Umami sends its pageview once the
    // document is complete, and our events must come after it.
    expect(umami.track).not.toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 0));

    expect(A.__pendingEventCountForTest()).toBe(0);
    expect(umami.track).toHaveBeenNthCalledWith(1, 'search-open', { surface: 'cmdk' });
    expect(umami.track).toHaveBeenNthCalledWith(2, 'item-click', {
      kind: 'mission',
      id: 'apollo11',
      route: '/missions',
    });
  });

  it('goes straight through once umami is present', () => {
    const umami = { track: vi.fn() };
    (window as unknown as { umami: unknown }).umami = umami;

    A.track('search-open', { surface: 'cmdk' });

    expect(A.__pendingEventCountForTest()).toBe(0);
    expect(umami.track).toHaveBeenCalledWith('search-open', { surface: 'cmdk' });
  });

  it('caps the buffer so a never-loading script cannot grow it without bound', () => {
    for (let i = 0; i < 60; i++) A.track('search-open', { i });
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

    A.trackExploreDepth('milky-way');
    A.trackExploreDepth('local-group');
    A.trackExploreDepth('milky-way'); // walked back in — must NOT re-fire
    A.trackExploreDepth('local-group');

    expect(umami.track).toHaveBeenCalledTimes(2);
    expect(umami.track).toHaveBeenCalledWith('explore-depth', { level: 'milky-way' });
    expect(umami.track).toHaveBeenCalledWith('explore-depth', { level: 'local-group' });
  });

  // The opening shell must NOT count as depth: contextId initialises to it and
  // the effect runs on mount, so emitting it would make "left the initial view"
  // read 100% for every visitor and inflate Engaged Learning Sessions.
  it('explore-depth never emits the entry shell', () => {
    const umami = mockUmami();
    A.trackExploreDepth('solar-system');
    expect(umami.track).not.toHaveBeenCalled();

    A.trackExploreDepth('milky-way');
    expect(umami.track).toHaveBeenCalledTimes(1);
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

  it('plan-window-select omits a missing departure year rather than sending null', () => {
    const umami = mockUmami();
    A.trackPlanWindowSelect('mars', null);
    expect(umami.track).toHaveBeenCalledWith('plan-window-select', { destination: 'mars' });
  });

  it('tour-complete fires once', () => {
    const umami = mockUmami();
    A.trackTourComplete('curator-full');
    A.trackTourComplete('curator-full');
    expect(umami.track).toHaveBeenCalledTimes(1);
    expect(umami.track).toHaveBeenCalledWith('tour-complete', { tour: 'curator-full' });
  });

  // Umami stores a null value as the literal string "null" (data_type 5), which
  // makes an absent value indistinguishable from a real one in every breakdown.
  // Found in live data: science-section-view.source had 10 rows reading 'null'.
  it('omits nullish properties rather than sending the string "null"', () => {
    const umami = mockUmami();

    A.track('science-section-view', { tab: 'physics', section: 'orbits', source: null });

    expect(umami.track).toHaveBeenCalledWith('science-section-view', {
      tab: 'physics',
      section: 'orbits',
    });
    const sent = umami.track.mock.calls[0][1] as Record<string, unknown>;
    expect('source' in sent, 'null source must be ABSENT, not "null"').toBe(false);
  });

  it('drops the props object entirely when every value is nullish', () => {
    const umami = mockUmami();
    A.track('search-open', { surface: undefined });
    expect(umami.track).toHaveBeenCalledWith('search-open', undefined);
  });

  it('keeps falsy-but-real values (0, false, empty string)', () => {
    const umami = mockUmami();
    A.track('layer-toggle', { surface: 'explore', layer: 'orbits', on: false });
    expect(umami.track).toHaveBeenCalledWith('layer-toggle', {
      surface: 'explore',
      layer: 'orbits',
      on: false,
    });
  });

  it('science-to-app carries the originating route as from_route', () => {
    const umami = mockUmami();
    A.trackRouteEnter('/explore');
    A.trackRouteEnter('/science/physics/orbits');
    umami.track.mockClear();

    A.trackScienceToApp('orbits', '/plan');

    expect(umami.track).toHaveBeenCalledWith('science-to-app', {
      topic: 'orbits',
      destination: '/plan',
      from_route: '/explore',
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

// 2026-10-19 Umami analysis: load-time events made every instant leaver a
// multi-event visit (bounce read ~7% against ~92% real), visits measured ~0 s,
// and a JS-rendering crawler with an impossible UA was ~40% of sessions.
describe('engagement-gated load events, heartbeat and bot filter', () => {
  let umami: { track: ReturnType<typeof vi.fn> };
  const realUA = navigator.userAgent;
  function setUA(ua: string): void {
    Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
  }
  beforeEach(() => {
    A.__resetAnalyticsStateForTest();
    enableAnalytics();
    umami = { track: vi.fn() };
    (window as unknown as { umami: unknown }).umami = umami;
  });
  afterEach(() => {
    vi.useRealTimers();
    setUA(realUA);
    disableAnalytics();
    A.__resetAnalyticsStateForTest();
    delete (window as unknown as { umami?: unknown }).umami;
    document.querySelectorAll('script[data-umami-installed]').forEach((s) => s.remove());
  });

  it('an instant leaver sends no custom event at all (only Umami’s pageview)', () => {
    A.track('app-load', { version: '1.2.3' });
    A.trackRouteEnter('/science/orbits/hill-sphere');
    A.track('science-section-view', { tab: 'orbits', section: 'hill-sphere' }, { passive: true });
    A.track('locale-suggest-shown', { to: 'de', from: 'en-US' });
    expect(umami.track).not.toHaveBeenCalled();
  });

  it('the first interaction sends the held load events first, in order, then itself', () => {
    A.track('app-load', { version: '1.2.3' });
    A.trackRouteEnter('/missions');
    A.trackMissionView('apollo11', 'list');
    expect(umami.track.mock.calls.map((c) => c[0])).toEqual([
      'app-load',
      'route-enter',
      'mission-view',
    ]);
  });

  it('after engagement, load events go straight through', () => {
    A.track('search-open', { surface: 'cmdk' });
    A.track('sw-activated', { version: '1.2.4' });
    expect(umami.track).toHaveBeenLastCalledWith('sw-activated', { version: '1.2.4' });
  });

  it('only the landing route-enter waits; a navigation is engagement', () => {
    A.trackRouteEnter('/');
    expect(umami.track).not.toHaveBeenCalled();
    A.trackRouteEnter('/explore');
    expect(umami.track.mock.calls.map((c) => c[0])).toEqual([
      'route-enter',
      'route-exit',
      'route-enter',
    ]);
  });

  it('the heartbeat sends engaged at 30 s and 120 s of visible time, which also releases held events', () => {
    vi.useFakeTimers();
    A.track('app-load', { version: '1.2.3' });
    const stop = A.startEngagementHeartbeat();
    vi.advanceTimersByTime(29_000);
    expect(umami.track).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_000);
    expect(umami.track.mock.calls).toEqual([
      ['app-load', { version: '1.2.3' }],
      ['engaged', { s: 30 }],
    ]);
    vi.advanceTimersByTime(90_000);
    expect(umami.track).toHaveBeenLastCalledWith('engaged', { s: 120 });
    vi.advanceTimersByTime(600_000);
    expect(umami.track).toHaveBeenCalledTimes(3);
    stop();
  });

  it('hidden-tab time does not count towards the heartbeat', () => {
    vi.useFakeTimers();
    const vis = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    const stop = A.startEngagementHeartbeat();
    vi.advanceTimersByTime(300_000);
    expect(umami.track).not.toHaveBeenCalled();
    vis.mockReturnValue('visible');
    vi.advanceTimersByTime(30_000);
    expect(umami.track).toHaveBeenCalledWith('engaged', { s: 30 });
    stop();
  });

  it.each([
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36; compatible; OAI-SearchBot/1.4; +https://openai.com/searchbot',
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36',
  ])('a crawler gets no tracker and no events: %s', (ua) => {
    setUA(ua);
    expect(A.isLikelyBot()).toBe(true);
    A.initAnalytics();
    expect(document.querySelector('script[data-umami-installed]')).toBeNull();
    A.track('search-open', { surface: 'cmdk' });
    expect(umami.track).not.toHaveBeenCalled();
  });

  it.each([
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.0.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 13; Cubot KingKong Power) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
  ])('a real browser is not taken for a bot: %s', (ua) => {
    setUA(ua);
    expect(A.isLikelyBot()).toBe(false);
  });
});
