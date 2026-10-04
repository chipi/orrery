// @vitest-environment jsdom
// @vitest-environment-options { "url": "http://127.0.0.1:34773/orrery/science/cosmology" }
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';

// #556-#559: a deploy-baked (staging/prod) DSN running on a loopback origin keeps
// reporting but is re-tagged `<tier>-loopback`, so it never counts as staging/prod.
// Native shells (http://localhost WebView), `vite dev` and real hosts are unaffected.
const { initMock, platform, devFlag } = vi.hoisted(() => ({
  initMock: vi.fn(),
  platform: { v: 'web' },
  devFlag: { v: false },
}));
vi.mock('@sentry/sveltekit', () => ({ init: initMock }));
vi.mock('@sentry/capacitor', () => ({ init: initMock }));
vi.mock('@sentry/svelte', () => ({ init: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => platform.v } }));
vi.mock('$env/dynamic/public', () => ({ env: {} }));
vi.mock('$app/environment', () => ({
  get dev() {
    return devFlag.v;
  },
}));
import { env as publicEnv } from '$env/dynamic/public';
import { initSentry } from './sentry';

beforeEach(() => {
  initMock.mockClear();
  platform.v = 'web';
  devFlag.v = false;
  for (const k of Object.keys(publicEnv)) delete (publicEnv as Record<string, unknown>)[k];
  publicEnv.PUBLIC_SENTRY_DSN = 'https://pub@glitch.example/6';
  publicEnv.PUBLIC_SENTRY_ENVIRONMENT = 'staging';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const initEnv = () => {
  initSentry();
  expect(initMock).toHaveBeenCalledTimes(1);
  return initMock.mock.calls[0][0].environment as string;
};
const onHost = (hostname: string) => vi.stubGlobal('location', { ...window.location, hostname });

describe('sentry loopback re-tagging', () => {
  it('web build with a baked staging DSN on 127.0.0.1 still inits, as staging-loopback', () => {
    expect(initEnv()).toBe('staging-loopback');
    expect(initMock.mock.calls[0][0].dsn).toBe('https://pub@glitch.example/6');
  });

  it('localhost and [::1] are loopback too; an unset tier is prod → prod-loopback', () => {
    delete (publicEnv as Record<string, unknown>).PUBLIC_SENTRY_ENVIRONMENT;
    onHost('localhost');
    expect(initEnv()).toBe('prod-loopback');
    initMock.mockClear();
    onHost('[::1]');
    expect(initEnv()).toBe('prod-loopback');
  });

  it('a real host keeps the plain tier (no re-tag)', () => {
    onHost('www.orrerylearn.com');
    expect(initEnv()).toBe('staging');
    initMock.mockClear();
    onHost('127.0.0.2.example.com');
    expect(initEnv()).toBe('staging');
  });

  it('vite dev on loopback stays the dev rung (no -loopback)', () => {
    devFlag.v = true;
    delete (publicEnv as Record<string, unknown>).PUBLIC_SENTRY_ENVIRONMENT;
    expect(initEnv()).toBe('dev');
  });

  it('a Capacitor shell (WebView on localhost) keeps its tier', () => {
    platform.v = 'ios';
    onHost('localhost');
    expect(initEnv()).toBe('staging');
  });
});
