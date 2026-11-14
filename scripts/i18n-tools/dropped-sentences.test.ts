import { describe, expect, it } from 'vitest';
import { sentences } from './dropped-sentences.mjs';

describe('dropped-sentences · sentence count', () => {
  it('counts plain sentences', () => {
    expect(sentences('One. Two! Three?')).toBe(3);
  });

  it('does not end a sentence at "U.S."', () => {
    expect(
      sentences('U.S. Federal Communications Commission. Outbound reference links only.'),
    ).toBe(2);
    expect(sentences('U.S. Department of Energy. Outbound links only.')).toBe(2);
  });

  it('still ends a sentence at a decimal-free full stop after another word', () => {
    expect(sentences('Run by the agency. U.S. data follows.')).toBe(2);
  });
});
