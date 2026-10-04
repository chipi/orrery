import { afterEach, describe, expect, it, vi } from 'vitest';
import { configFromEnv } from './index';

// The built-in defaults are the production (VPS / compose) paths; local dev
// gets its per-checkout paths from .config/workspace/setup (LAB_STATE_PATH,
// LAB_ALLOWLIST_PATH) or the lab-api:dev fallback, never from these defaults.
describe('configFromEnv paths', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('defaults to the production /srv/lab-api-state paths', () => {
    vi.stubEnv('LAB_STATE_PATH', undefined);
    vi.stubEnv('LAB_ALLOWLIST_PATH', undefined);
    const cfg = configFromEnv();
    expect(cfg.statePath).toBe('/srv/lab-api-state/state.json');
    expect(cfg.allowlistPath).toBe('/srv/lab-api-state/allowlist.json');
  });

  it('LAB_STATE_PATH / LAB_ALLOWLIST_PATH override them independently', () => {
    vi.stubEnv('LAB_STATE_PATH', '/co/.lab-api-state/state.json');
    vi.stubEnv('LAB_ALLOWLIST_PATH', '/main/.lab-api-state/allowlist.json');
    const cfg = configFromEnv();
    expect(cfg.statePath).toBe('/co/.lab-api-state/state.json');
    expect(cfg.allowlistPath).toBe('/main/.lab-api-state/allowlist.json');
  });
});
