import { describe, expect, it } from 'vitest';
import { plainText } from './build-image-provenance.ts';

describe('plainText (Commons extmetadata → credit text)', () => {
  it('drops hidden elements, so the "Unknown author" template is not read twice', () => {
    expect(plainText('Unknown author<span style="display: none;">Unknown author</span>')).toBe(
      'Unknown author',
    );
  });

  it('keeps visible markup text and collapses whitespace', () => {
    expect(plainText('<a href="x">NASA</a> /\n <b>JPL</b>')).toBe('NASA / JPL');
  });

  it('returns null for empty input', () => {
    expect(plainText('')).toBeNull();
    expect(plainText('<span style="display:none">x</span>')).toBeNull();
  });
});
