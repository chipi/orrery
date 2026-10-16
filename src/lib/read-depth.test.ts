import { describe, expect, it } from 'vitest';
import { readDepthPct } from './read-depth';

const box = (scrollTop: number, scrollHeight: number, clientHeight: number) => ({
  scrollTop,
  scrollHeight,
  clientHeight,
});

describe('readDepthPct', () => {
  // /science article measured on prod 2026-10-16: 1863 px of content in a 660 px
  // .science-root box. At the top that is 0%, not the 100% the window-based
  // measure reported (the window itself never scrolls there).
  it('is 0 at the top of a long article', () => {
    expect(readDepthPct(box(0, 1863, 660))).toBe(0);
  });
  it('tracks the scroll position', () => {
    expect(readDepthPct(box(601, 1863, 660))).toBe(50);
    expect(readDepthPct(box(1203, 1863, 660))).toBe(100);
  });
  it('treats content that fits as fully read', () => {
    expect(readDepthPct(box(0, 500, 660))).toBe(100);
  });
  it('clamps overscroll (iOS rubber-banding) to 0-100', () => {
    expect(readDepthPct(box(-40, 1863, 660))).toBe(0);
    expect(readDepthPct(box(1300, 1863, 660))).toBe(100);
  });
});
