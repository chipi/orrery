import { describe, expect, it } from 'vitest';
import { PREVIEW, isCapped, previewList } from './preview-list';

const rows = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('previewList', () => {
  it('shows the first PREVIEW rows of a longer list', () => {
    expect(PREVIEW).toBe(10);
    expect(previewList(rows(25), false)).toEqual(rows(10));
  });

  it('shows every row once expanded', () => {
    expect(previewList(rows(25), true)).toEqual(rows(25));
  });

  it('keeps a list of PREVIEW rows or fewer whole, expanded or not', () => {
    expect(previewList(rows(10), false)).toEqual(rows(10));
    expect(previewList(rows(3), false)).toEqual(rows(3));
    expect(previewList([], false)).toEqual([]);
  });

  it('takes another cap', () => {
    expect(previewList(rows(25), false, 4)).toEqual(rows(4));
  });

  it('treats an unset expanded flag as collapsed', () => {
    expect(previewList(rows(25), undefined)).toEqual(rows(10));
  });
});

describe('isCapped', () => {
  it('is true only while a list longer than the cap is collapsed', () => {
    expect(isCapped(11, false)).toBe(true);
    expect(isCapped(11, undefined)).toBe(true);
    expect(isCapped(11, true)).toBe(false);
    expect(isCapped(10, false)).toBe(false);
    expect(isCapped(0, false)).toBe(false);
  });
});
