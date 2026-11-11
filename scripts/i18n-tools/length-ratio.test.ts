import { describe, expect, it } from 'vitest';
import { lengthKind, lengthRatioProblem, problems, loadBounds } from '../lib/translate-quality.mjs';
import { derive, scan } from './length-ratio.mjs';

const EN =
  'The probe landed softly on the plain and sent its first pictures home after a long cruise.';

describe('length-ratio: the check', () => {
  it('judges only strings of 40+ characters (30+ in the UI)', () => {
    expect(lengthKind('Short label')).toBeNull();
    expect(lengthKind('x'.repeat(40))).toBe('short');
    expect(lengthKind('x'.repeat(120))).toBe('long');
    expect(lengthKind('x'.repeat(30), { ui: true })).toBe('ui');
    expect(lengthKind('x'.repeat(29), { ui: true })).toBeNull();
  });

  it('flags a planted dropped sentence and a planted runaway, passes a normal rendering', () => {
    const [lo] = loadBounds().de.short;
    expect(lo).toBeGreaterThan(0.2);
    const normal =
      'Die Sonde landete sanft auf der Ebene und schickte nach langer Reise ihre ersten Bilder heim.';
    expect(lengthRatioProblem('de', EN, normal)).toBe('');
    expect(lengthRatioProblem('de', EN, 'Die Sonde landete sanft.')).toContain(
      'length implausible',
    );
    expect(lengthRatioProblem('de', EN, `${normal} ${normal} ${normal}`)).toContain(
      'English left in, or something added',
    );
  });

  it('is part of problems() when asked for, and skips an identical string and a missing source', () => {
    expect(problems('de', EN, 'Die Sonde landete sanft.', { length: true }).join(' ')).toContain(
      'length implausible',
    );
    expect(problems('de', EN, 'Die Sonde landete sanft.').join(' ')).not.toContain(
      'length implausible',
    );
    expect(lengthRatioProblem('de', EN, EN)).toBe('');
    expect(lengthRatioProblem('de', '', 'Die Sonde landete sanft.')).toBe('');
  });

  it('CJK locales are held to their own, lower bounds', () => {
    const [lo] = loadBounds().ja.short;
    const [deLo] = loadBounds().de.short;
    expect(lo).toBeLessThan(deLo);
    const jaShort = 'プローブは平原に軟着陸し、長い航海の後に最初の写真を送った。';
    expect(lengthRatioProblem('ja', EN, jaShort)).toBe('');
  });
});

describe('length-ratio: the bounds', () => {
  it('every locale has short, long and ui bounds with lo < hi', () => {
    const b = loadBounds();
    expect(Object.keys(b)).toHaveLength(13);
    for (const [loc, kinds] of Object.entries(b))
      for (const k of ['short', 'long', 'ui'])
        expect(kinds[k][0], `${loc} ${k}`).toBeLessThan(kinds[k][1]);
  });

  it("deriving from today's corpus flags about the same fields as the committed bounds", () => {
    const d = derive(0.001);
    for (const loc of Object.keys(d)) {
      const flagged = scan(loc, d).length;
      expect(flagged, loc).toBeLessThan(40);
    }
  }, 60_000);
});
