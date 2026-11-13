import { describe, expect, it } from 'vitest';
import {
  BOX_BODY_LINE,
  BOX_HEADER_LINE,
  BOX_MAX_W,
  BOX_PAD_X,
  BOX_PAD_Y,
  BOX_ROW_GAP,
  boxHeader,
  layoutBox,
  wrapText,
} from './iconic-box';

// A monospace stand-in for ctx.measureText: 7 px per code unit.
const mono: (text: string) => number = (t) => t.length * 7;
const TEXT_W = BOX_MAX_W - BOX_PAD_X * 2;

describe('boxHeader', () => {
  it('is milestone number of total, then the data date as it is', () => {
    expect(boxHeader(3, 7, '1979-03-05')).toBe('3/7 · 1979-03-05');
    expect(boxHeader(1, 4, '1972-07')).toBe('1/4 · 1972-07');
  });
});

describe('wrapText', () => {
  it('keeps a label that fits on one line, uncut', () => {
    expect(wrapText('Jupiter flyby', TEXT_W, mono, 2)).toEqual({
      lines: ['Jupiter flyby'],
      truncated: false,
    });
  });

  it('wraps a 40-character label onto two lines without cutting it', () => {
    const label = 'Mercury orbit insertion and first flyby!'.slice(0, 40);
    const out = wrapText(label, TEXT_W, mono, 2);
    expect(label).toHaveLength(40);
    expect(out.truncated).toBe(false);
    expect(out.lines).toHaveLength(2);
    expect(out.lines.join(' ')).toBe(label);
    for (const l of out.lines) expect(mono(l)).toBeLessThanOrEqual(TEXT_W);
  });

  it('ends the last line in an ellipsis only when the text does not fit the lines', () => {
    const long = 'one two three four five six seven eight nine ten eleven twelve thirteen';
    const out = wrapText(long, TEXT_W, mono, 2);
    expect(out.truncated).toBe(true);
    expect(out.lines).toHaveLength(2);
    expect(out.lines[1].endsWith('…')).toBe(true);
    expect(mono(out.lines[1])).toBeLessThanOrEqual(TEXT_W);
  });

  it('breaks a word wider than the box and a CJK run with no spaces', () => {
    const word = wrapText('Supercalifragilisticexpialidocious-and-more', 100, mono, 5);
    for (const l of word.lines) expect(mono(l)).toBeLessThanOrEqual(100);
    expect(word.lines.join('')).toBe('Supercalifragilisticexpialidocious-and-more');
    const cjk = wrapText('土星周回軌道への投入と大気圏突入', 50, mono, 5);
    expect(cjk.lines.length).toBeGreaterThan(1);
    expect(cjk.lines.join('')).toBe('土星周回軌道への投入と大気圏突入');
  });

  it('never splits a Devanagari conjunct in the middle', () => {
    const text = 'क्रांतिवृत्त'.repeat(6);
    const out = wrapText(text, 60, mono, 20);
    expect(out.lines.join('')).toBe(text);
    // a combining mark never starts a line (it would be a detached vowel sign or virama)
    for (const l of out.lines) expect(/^[ा-्]/.test(l)).toBe(false);
  });
});

describe('layoutBox', () => {
  const base = { measureHeader: (t: string) => t.length * 6.6, measureBody: mono };

  it('has two rows (header, name), no mission name, and a width that follows the text', () => {
    const header = boxHeader(2, 5, '1979-03-05');
    const box = layoutBox({ header, body: 'Jupiter flyby', ...base });
    expect(box.header).toBe('2/5 · 1979-03-05');
    expect(box.header).not.toMatch(/voyager/i);
    expect(box.lines).toEqual(['Jupiter flyby']);
    expect(box.h).toBe(BOX_PAD_Y * 2 + BOX_HEADER_LINE + BOX_ROW_GAP + BOX_BODY_LINE);
    expect(box.w).toBeLessThan(BOX_MAX_W);
    expect(box.w).toBe(Math.ceil(Math.max(header.length * 6.6, 13 * 7)) + BOX_PAD_X * 2);
  });

  it('grows by one line per wrapped body line and never passes the max width', () => {
    const one = layoutBox({ header: '1/2 · 1977', body: 'Launch', ...base });
    const two = layoutBox({
      header: '1/2 · 1977',
      body: 'Grand Finale dive between the planet and its rings',
      ...base,
    });
    expect(two.lines).toHaveLength(2);
    expect(two.h - one.h).toBe(BOX_BODY_LINE);
    expect(two.w).toBeLessThanOrEqual(BOX_MAX_W);
  });

  it('lets the mission box use more width and three lines', () => {
    const box = layoutBox({
      header: 'VOYAGER 1',
      body: '172 AU · ~23.8 light-hours from the Sun, heading out of the Solar System for good',
      ...base,
      maxW: 240,
      maxLines: 3,
    });
    expect(box.lines.length).toBeGreaterThan(1);
    expect(box.truncated).toBe(false);
    expect(box.w).toBeLessThanOrEqual(240);
  });
});
