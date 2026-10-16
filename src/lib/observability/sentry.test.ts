// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Dev rung of the ladder — pin `dev: true`. The sibling sentry.prod.test.ts covers the
// non-dev (fork-silent + prod-default) side. Sentry's init is mocked so we assert on the
// exact config the app hands it, without attaching real global handlers or transport.
const { initMock, captureMock } = vi.hoisted(() => ({ initMock: vi.fn(), captureMock: vi.fn() }));
vi.mock('@sentry/sveltekit', () => ({ init: initMock, captureException: captureMock }));
vi.mock('$env/dynamic/public', () => ({ env: {} }));
vi.mock('$app/environment', () => ({ dev: true }));
import { env as publicEnv } from '$env/dynamic/public';
import { initSentry } from './sentry';

const DEV_DSN = 'http://183d550946d24740a87983a1b75d86ee@homelab:8090/30';

beforeEach(() => {
  initMock.mockReset();
  captureMock.mockReset();
  for (const k of Object.keys(publicEnv)) delete (publicEnv as Record<string, unknown>)[k];
});

describe('sentry dev rung (vite dev, no deploy env)', () => {
  // #553: a page-injected addEventListener wrapper threw inside Sentry.init (from
  // browserTracingIntegration's setup). initSentry runs at hooks.client module-eval,
  // so the throw must not escape — it would abort the app's client boot.
  it('a throw inside Sentry.init does not escape, and is reported once as a warning', () => {
    const hostile = new TypeError("Cannot read properties of null (reading 'tagName')");
    initMock.mockImplementation(() => {
      throw hostile;
    });
    expect(() => initSentry()).not.toThrow();
    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledWith(hostile, {
      level: 'warning',
      tags: { sentry_init_failed: 'true' },
    });
  });

  it('a failing report after a failed init still does not escape', () => {
    initMock.mockImplementation(() => {
      throw new Error('init');
    });
    captureMock.mockImplementation(() => {
      throw new Error('no client');
    });
    expect(() => initSentry()).not.toThrow();
  });

  it('inits with the dev DSN, environment=dev, and a worktree tag', () => {
    initSentry();

    expect(initMock).toHaveBeenCalledTimes(1);
    const cfg = initMock.mock.calls[0][0];
    expect(cfg.dsn).toBe(DEV_DSN);
    expect(cfg.environment).toBe('dev');
    expect(cfg.initialScope.tags.component).toBe('orrery');
    // Worktree tag present in dev (value is the injected git branch — just assert shape).
    expect(typeof cfg.initialScope.tags.worktree).toBe('string');
    expect(cfg.tracesSampleRate).toBe(0);
    expect(cfg.sendDefaultPii).toBe(false);
  });

  it('a deploy-injected DSN overrides the dev default', () => {
    publicEnv.PUBLIC_SENTRY_DSN = 'https://pub@glitch.example/6';
    publicEnv.PUBLIC_SENTRY_ENVIRONMENT = 'staging';

    initSentry();

    const cfg = initMock.mock.calls[0][0];
    expect(cfg.dsn).toBe('https://pub@glitch.example/6');
    expect(cfg.environment).toBe('staging');
  });

  it('beforeSend strips query+hash, nulls headers/cookies, discards the ip', () => {
    initSentry();
    const { beforeSend } = initMock.mock.calls[0][0];

    const scrubbed = beforeSend({
      request: {
        url: 'https://orrery.test/fly?mission=curiosity#phase-3',
        headers: { Referer: 'https://orrery.test/missions' },
        cookies: 'session=abc',
      },
      user: { id: 'visitor-1' },
    });

    expect(scrubbed.request.url).toBe('https://orrery.test/fly');
    expect(scrubbed.request.headers).toBeUndefined();
    expect(scrubbed.request.cookies).toBeUndefined();
    expect(scrubbed.user.ip_address).toBe('0.0.0.0');
  });

  it('beforeBreadcrumb drops ui.input crumbs and strips navigation query', () => {
    initSentry();
    const { beforeBreadcrumb } = initMock.mock.calls[0][0];

    expect(beforeBreadcrumb({ category: 'ui.input', message: 'typed secret' })).toBeNull();

    const nav = beforeBreadcrumb({
      category: 'navigation',
      data: { to: 'https://orrery.test/missions?q=apollo' },
    });
    expect(nav.data.to).toBe('/missions');
  });

  describe('beforeSend noise filter', () => {
    const run = (exception: unknown) => {
      initSentry();
      const { beforeSend } = initMock.mock.calls[0][0];
      return beforeSend({ exception: { values: [exception] } });
    };
    const frame = (fn: string, filename?: string) => ({ function: fn, filename });

    // #553 (addEL_hook, an extension's addEventListener wrapper): no filter ships without
    // the raw GlitchTip event confirming the throw-site frame — the issue text is
    // ambiguous (it may be thrown inside app.<hash>.js). Pin that it still reports
    // under either reading, so a future rule has to come with that evidence.
    it('still reports the #553 addEL_hook TypeError (no injected-script filter)', () => {
      const value = "Cannot read properties of null (reading 'tagName')";
      const app = '/orrery/_app/immutable/entry/app.BDE7eXFQ.js';
      expect(
        run({
          type: 'TypeError',
          value,
          stacktrace: { frames: [frame('init', app), frame('addEL_hook', '<anonymous>')] },
        }),
      ).not.toBeNull();
      initMock.mockClear();
      expect(
        run({
          type: 'TypeError',
          value,
          stacktrace: { frames: [frame('addEL_hook', '<anonymous>'), frame('h', app)] },
        }),
      ).not.toBeNull();
    });

    it('keeps CSS preload failures (not skew: guard reloads, stable hash) and still drops chunk skew', () => {
      expect(
        run({
          type: 'Error',
          value: 'Unable to preload CSS for /orrery/_app/immutable/assets/1.x.css',
        }),
      ).not.toBeNull();
      initMock.mockClear();
      expect(
        run({ type: 'TypeError', value: 'Failed to fetch dynamically imported module: x' }),
      ).toBeNull();
    });
  });
});
