import { describe, expect, it } from 'vitest';
import { DARK_TEXT, LIGHT_TEXT, readableTextOn } from './readable-text';

describe('readableTextOn', () => {
  it('puts dark text on the bright badge fills that failed with white', () => {
    expect(readableTextOn('#ddba00')).toBe(DARK_TEXT); // ESA yellow: white 1.89:1
    expect(readableTextOn('rgb(221, 132, 44)')).toBe(DARK_TEXT); // ISRO orange: white 2.83:1
    expect(readableTextOn('rgb(188, 108, 38)')).toBe(DARK_TEXT); // white 3.95:1
  });

  it('keeps white on dark fills', () => {
    expect(readableTextOn('#0B3D91')).toBe(LIGHT_TEXT); // NASA blue
    expect(readableTextOn('#c1440e')).toBe(LIGHT_TEXT);
    expect(readableTextOn('#000')).toBe(LIGHT_TEXT);
  });

  it('composites translucent fills over the page background', () => {
    // The default badge fill, teal at 16% over near-black, is dark.
    expect(readableTextOn('rgba(78, 205, 196, 0.16)')).toBe(LIGHT_TEXT);
    expect(readableTextOn('rgba(255, 255, 255, 0.9)')).toBe(DARK_TEXT);
    expect(readableTextOn('rgb(255 204 0 / 100%)')).toBe(DARK_TEXT);
  });

  it('falls back to white for missing or unparseable fills', () => {
    expect(readableTextOn(null)).toBe(LIGHT_TEXT);
    expect(readableTextOn(undefined)).toBe(LIGHT_TEXT);
    expect(readableTextOn('var(--x)')).toBe(LIGHT_TEXT);
  });
});
