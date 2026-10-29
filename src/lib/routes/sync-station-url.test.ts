import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mocks } = vi.hoisted(() => {
  let current = new URL('https://orrery.test/iss');
  return {
    mocks: {
      page: {
        get url() {
          return current;
        },
      },
      setUrl: (u: string) => {
        current = new URL(u);
      },
      goto: vi.fn(),
    },
  };
});

vi.mock('$app/state', () => ({ page: mocks.page }));
vi.mock('$app/navigation', () => ({ goto: mocks.goto }));
vi.mock('$app/paths', () => ({ base: '' }));

const { syncStationUrl } = await import('./sync-station-url');

describe('syncStationUrl', () => {
  beforeEach(() => mocks.goto.mockReset());

  it('sets ?module on the en-US route', () => {
    mocks.setUrl('https://orrery.test/iss?view=list');
    syncStationUrl('/iss', { moduleId: 'beam' });
    expect(mocks.goto.mock.calls[0]?.[0]).toBe('/iss?view=list&module=beam');
  });

  // /de/iss?view=list: a module click went to /iss (en) and lost the module,
  // so no panel opened in any non-English locale.
  it('keeps the locale prefix of the current path', () => {
    mocks.setUrl('https://orrery.test/de/iss?view=list');
    syncStationUrl('/iss', { moduleId: 'beam' });
    expect(mocks.goto.mock.calls[0]?.[0]).toBe('/de/iss?view=list&module=beam');
  });

  it('clears ?module and skips goto when the URL is already in sync', () => {
    mocks.setUrl('https://orrery.test/sr-Cyrl/tiangong?module=tianhe');
    syncStationUrl('/tiangong', { moduleId: null });
    expect(mocks.goto.mock.calls[0]?.[0]).toBe('/sr-Cyrl/tiangong');
    mocks.goto.mockReset();
    mocks.setUrl('https://orrery.test/sr-Cyrl/tiangong');
    syncStationUrl('/tiangong', { moduleId: null });
    expect(mocks.goto).not.toHaveBeenCalled();
  });
});
