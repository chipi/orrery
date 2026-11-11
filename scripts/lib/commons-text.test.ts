import { describe, expect, it } from 'vitest';
import { plainText } from './commons-text.ts';

describe('plainText (Commons extmetadata → credit text)', () => {
  it('drops hidden elements, so the "Unknown author" template is not read twice', () => {
    expect(plainText('Unknown author<span style="display: none;">Unknown author</span>')).toBe(
      'Unknown author',
    );
  });

  it('keeps visible markup text and collapses whitespace', () => {
    expect(plainText('<a href="x">NASA</a> /\n <b>JPL</b>')).toBe('NASA / JPL');
  });

  it('leaves no tag behind when stripping one reveals another', () => {
    expect(plainText('<<b>script>alert(1)')).toBe('scriptalert(1)');
    expect(plainText('<scr<b>ipt>x')).toBe('iptx');
    expect(
      plainText('<s<i style="display:none">a</i>pan style="display:none">b</s') ?? '',
    ).not.toMatch(/[<>]/);
  });

  it('returns null for empty input', () => {
    expect(plainText('')).toBeNull();
    expect(plainText('<span style="display:none">x</span>')).toBeNull();
  });
});
