// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Dev rung of the ladder — pin `dev: true`. The sibling sentry.prod.test.ts covers the
// non-dev (fork-silent + prod-default) side. Sentry's init is mocked so we assert on the
// exact config the app hands it, without attaching real global handlers or transport.
const { initMock } = vi.hoisted(() => ({ initMock: vi.fn() }));
vi.mock('@sentry/sveltekit', () => ({ init: initMock }));
vi.mock('$env/dynamic/public', () => ({ env: {} }));
vi.mock('$app/environment', () => ({ dev: true }));
import { env as publicEnv } from '$env/dynamic/public';
import { initSentry } from './sentry';

const DEV_DSN = 'http://310ad519a9da49b7b9aebc50d7c1399e@homelab:8090/7';

beforeEach(() => {
  initMock.mockClear();
  for (const k of Object.keys(publicEnv)) delete (publicEnv as Record<string, unknown>)[k];
});

describe('sentry dev rung (vite dev, no deploy env)', () => {
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
});
