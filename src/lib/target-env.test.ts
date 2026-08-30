// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { getTargetEnv, setTargetEnv, targetConfig, TARGET_ENVS } from './target-env';

// `MOBILE_INTERNAL` is a compile-time define (false in the vitest build), so the
// gated true-branch in asset-url/sentry/analytics is verified at build/device time.
// Here we cover the pure switch logic: config correctness + localStorage round-trip.
// The ambient test localStorage is an unusable stub (Node experimental storage);
// stub a clean Map-backed one so the round-trip is deterministic.
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
});

describe('target-env (ADR-083 mobile switcher)', () => {
  it('defaults to the staging sandbox when nothing is stored', () => {
    expect(getTargetEnv()).toBe('staging');
    const c = targetConfig();
    expect(c.sentryEnvironment).toBe('staging');
    expect(c.streamOrigin).toBe('https://chipi.github.io/orrery');
    expect(c.sentryDsn).toContain('@telemetry.orrerylearn.com/6'); // staging project
  });

  it('persists a selection and resolves the prod config', () => {
    setTargetEnv('prod');
    expect(getTargetEnv()).toBe('prod');
    const c = targetConfig();
    expect(c.sentryEnvironment).toBe('prod');
    expect(c.streamOrigin).toBe('https://www.orrerylearn.com');
    expect(c.sentryDsn).toContain('@telemetry.orrerylearn.com/18'); // prod project (orrery-prod)
    expect(c.umamiWebsiteId).toBe('4a25d8da-63a1-4ef7-b9d3-1b6b8c8a6bce');
  });

  it('falls back to staging on a garbage stored value', () => {
    localStorage.setItem('orrery.targetEnv', 'bananas');
    expect(getTargetEnv()).toBe('staging');
  });

  it('on-device tiers are staging + prod only (dev is tailnet-only, excluded)', () => {
    expect([...TARGET_ENVS]).toEqual(['staging', 'prod']);
  });

  it('both tiers share the one Umami host (identical per ADR-082 amendment)', () => {
    setTargetEnv('staging');
    const s = targetConfig().umamiHost;
    setTargetEnv('prod');
    const p = targetConfig().umamiHost;
    expect(s).toBe(p);
    expect(s).toBe('https://analytics.orrerylearn.com');
  });
});
