// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';

// The non-dev side of the ladder — pin `dev: false`. Covers the two behaviours the dev
// file can't reach: fork-silence (no DSN → no init at all) and the prod-default env tag /
// absence of the dev-only worktree tag.
const { initMock } = vi.hoisted(() => ({ initMock: vi.fn() }));
vi.mock('@sentry/sveltekit', () => ({ init: initMock }));
vi.mock('$env/dynamic/public', () => ({ env: {} }));
vi.mock('$app/environment', () => ({ dev: false }));
import { env as publicEnv } from '$env/dynamic/public';
import { initSentry } from './sentry';

beforeEach(() => {
  initMock.mockClear();
  for (const k of Object.keys(publicEnv)) delete (publicEnv as Record<string, unknown>)[k];
});

describe('sentry non-dev rung', () => {
  it('is fork-silent: a non-dev build with no DSN never inits', () => {
    initSentry();
    expect(initMock).not.toHaveBeenCalled();
  });

  it('a baked DSN inits with environment=prod default and no worktree tag', () => {
    publicEnv.PUBLIC_SENTRY_DSN = 'https://pub@glitch.example/18';

    initSentry();

    const cfg = initMock.mock.calls[0][0];
    expect(cfg.environment).toBe('prod');
    expect(cfg.initialScope.tags.component).toBe('orrery');
    // The worktree tag is dev-only — it must NOT leak into staging/prod events.
    expect(cfg.initialScope.tags.worktree).toBeUndefined();
  });

  it('respects an explicit environment override', () => {
    publicEnv.PUBLIC_SENTRY_DSN = 'https://pub@glitch.example/6';
    publicEnv.PUBLIC_SENTRY_ENVIRONMENT = 'staging';

    initSentry();

    expect(initMock.mock.calls[0][0].environment).toBe('staging');
  });
});
