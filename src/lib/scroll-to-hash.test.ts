// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { scrollToHash } from './scroll-to-hash';

describe('scrollToHash', () => {
  let scrolls: string[];

  beforeEach(() => {
    scrolls = [];
    document.body.innerHTML = '<article id="src-nasa"></article><article id="a b"></article>';
    for (const el of document.querySelectorAll('article')) {
      el.scrollIntoView = () => void scrolls.push(el.id);
    }
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(cb, 0));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    location.hash = '';
  });

  it('scrolls to the element the hash names, again after two frames', async () => {
    location.hash = '#src-nasa';
    await scrollToHash();
    expect(scrolls).toEqual(['src-nasa', 'src-nasa']);
  });

  it('decodes the hash', async () => {
    location.hash = '#a%20b';
    await scrollToHash();
    expect(scrolls).toEqual(['a b', 'a b']);
  });

  it('ignores an empty hash, a hash that names nothing and a malformed escape', async () => {
    for (const h of ['', '#nothing', '#%E0%A4%A']) {
      location.hash = h;
      await scrollToHash();
    }
    expect(scrolls).toEqual([]);
  });
});
