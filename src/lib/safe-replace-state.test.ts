// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { replaceState } = vi.hoisted(() => ({ replaceState: vi.fn() }));
vi.mock('$app/navigation', () => ({ replaceState }));

import { currentUrl, safeReplaceState } from './safe-replace-state';

beforeEach(() => {
  replaceState.mockReset();
  history.replaceState(null, '', '/explore?context=neighborhood');
});

describe('currentUrl', () => {
  it('is the address bar, including a shallow write page.url never sees', () => {
    expect(currentUrl().search).toBe('?context=neighborhood');
    history.replaceState(null, '', '/explore?goto=sirius');
    expect(currentUrl().searchParams.get('goto')).toBe('sirius');
    expect(currentUrl().searchParams.has('context')).toBe(false);
  });

  it('returns a fresh URL each call (mutating one does not touch the next)', () => {
    const a = currentUrl();
    a.searchParams.set('x', '1');
    expect(currentUrl().searchParams.has('x')).toBe(false);
  });
});

describe('safeReplaceState', () => {
  it('uses SvelteKit replaceState when the router is ready', () => {
    const url = new URL('/explore?id=mars', location.origin);
    safeReplaceState(url, {});
    expect(replaceState).toHaveBeenCalledExactlyOnceWith(url, {});
  });

  it('falls back to history.replaceState before the router is initialized', () => {
    replaceState.mockImplementation(() => {
      throw new Error('Cannot call replaceState(...) before router is initialized');
    });
    safeReplaceState('/explore?id=saturn', {});
    expect(location.search).toBe('?id=saturn');
  });
});
