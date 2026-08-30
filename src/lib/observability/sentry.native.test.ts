// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Native shell (Capacitor) path — pin `Capacitor.getPlatform() === 'ios'`. The web
// tests (sentry.test.ts / sentry.prod.test.ts) exercise the plain @sentry/sveltekit
// path (getPlatform → 'web' in jsdom). Here we lock the ADR-082 model: mobile rides
// the SAME environment tier as web (NOT a flat `mobile-<platform>`), separated only by
// the `platform` tag, and inits via @sentry/capacitor + the @sentry/svelte sibling.
const { capInit, webInit, svelteInit } = vi.hoisted(() => ({
  capInit: vi.fn(),
  webInit: vi.fn(),
  svelteInit: vi.fn(),
}));
vi.mock('@sentry/capacitor', () => ({ init: capInit }));
vi.mock('@sentry/sveltekit', () => ({ init: webInit }));
vi.mock('@sentry/svelte', () => ({ init: svelteInit }));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'ios' } }));
vi.mock('$env/dynamic/public', () => ({ env: {} }));
vi.mock('$app/environment', () => ({ dev: false }));
import { env as publicEnv } from '$env/dynamic/public';
import { initSentry } from './sentry';

beforeEach(() => {
  capInit.mockClear();
  webInit.mockClear();
  svelteInit.mockClear();
  for (const k of Object.keys(publicEnv)) delete (publicEnv as Record<string, unknown>)[k];
});

describe('sentry native shell (Capacitor iOS)', () => {
  it('rides the environment TIER (not mobile-ios) + platform=ios SEGMENT tag, via @sentry/capacitor', () => {
    publicEnv.PUBLIC_SENTRY_DSN = 'https://pub@telemetry.example/6'; // staging project
    publicEnv.PUBLIC_SENTRY_ENVIRONMENT = 'staging';

    initSentry();

    expect(capInit).toHaveBeenCalledTimes(1);
    expect(webInit).not.toHaveBeenCalled(); // native never takes the sveltekit path
    const [options, sibling] = capInit.mock.calls[0];
    expect(options.environment).toBe('staging'); // the TIER — NOT 'mobile-ios'
    expect(options.initialScope.tags.platform).toBe('ios'); // the SEGMENT
    expect(options.initialScope.tags.component).toBe('orrery');
    expect(sibling).toBe(svelteInit); // native = capacitor init + the JS svelte sibling
  });

  it('defaults to the prod tier when no env override (release build bakes prod)', () => {
    publicEnv.PUBLIC_SENTRY_DSN = 'https://pub@telemetry.example/18'; // prod project

    initSentry();

    expect(capInit.mock.calls[0][0].environment).toBe('prod');
  });
});
