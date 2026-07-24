// @vitest-environment jsdom
import { describe, expect, it, afterEach, vi } from 'vitest';

// The dev rung of the env ladder: `vite dev` with NO deploy-injected PUBLIC_UMAMI_*
// falls back to the dedicated dev Umami site (via the Tailscale `homelab` host). The
// sibling analytics.test.ts pins `dev: false`; this file pins `dev: true` so the
// fallback path is the one under test. A mutable env mock lets the override case flip on.
vi.mock('$env/dynamic/public', () => ({ env: {} }));
vi.mock('$app/environment', () => ({ dev: true }));
import { env as publicEnv } from '$env/dynamic/public';
import * as A from './analytics';

// Must match the dev defaults in analytics.ts (asserted on observable output, since
// the constants aren't exported).
const DEV_UMAMI_HOST = 'http://homelab:3001';
const DEV_UMAMI_ID = '1d2f214c-801c-45e4-b56b-446a333e88b2';

afterEach(() => {
  vi.restoreAllMocks();
  delete publicEnv.PUBLIC_UMAMI_HOST;
  delete publicEnv.PUBLIC_UMAMI_WEBSITE_ID;
  delete (window as unknown as { umami?: unknown }).umami;
  document.querySelectorAll('script[data-umami-installed]').forEach((s) => s.remove());
});

describe('analytics dev rung (vite dev, no deploy env)', () => {
  it('is enabled by the dev default and emits typed events', () => {
    const umami = { track: vi.fn() };
    (window as unknown as { umami: unknown }).umami = umami;

    A.trackMissionView('apollo11', 'list');

    expect(umami.track).toHaveBeenCalledWith('mission-view', { id: 'apollo11', source: 'list' });
  });

  it('initAnalytics injects the DEV umami script (homelab host + dev site id)', () => {
    A.initAnalytics();
    const s = document.querySelector('script[data-umami-installed]');
    expect(s).not.toBeNull();
    expect(s!.getAttribute('src')).toBe(`${DEV_UMAMI_HOST}/script.js`);
    expect(s!.getAttribute('data-website-id')).toBe(DEV_UMAMI_ID);
  });

  it('a deploy env override wins over the dev default', () => {
    publicEnv.PUBLIC_UMAMI_HOST = 'https://analytics.orrerylearn.com';
    publicEnv.PUBLIC_UMAMI_WEBSITE_ID = 'prod-site-id';

    A.initAnalytics();

    const s = document.querySelector('script[data-umami-installed]');
    expect(s!.getAttribute('src')).toBe('https://analytics.orrerylearn.com/script.js');
    expect(s!.getAttribute('data-website-id')).toBe('prod-site-id');
  });
});
