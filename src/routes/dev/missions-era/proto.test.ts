import { describe, expect, it } from 'vitest';
import { EPOCH_BANDS } from '../../../lib/epoch-bands';
import {
  CARD_BG,
  PAGE_BG,
  PROPOSED_PALETTE,
  bandLanes,
  contrast,
  deltaE,
  filterOrder,
  isCyanTeal,
  leadAgency,
  minPairDelta,
  overlapYears,
  packDots,
  placeLabels,
  simulate,
} from './proto';

describe('proposed agency palette', () => {
  const names = filterOrder(Object.keys(PROPOSED_PALETTE));

  it('has one distinct colour per agency', () => {
    expect(new Set(Object.values(PROPOSED_PALETTE)).size).toBe(names.length);
  });

  it.each(names)('%s clears 4.5:1 on the page and the card and is not cyan or teal', (n) => {
    const c = PROPOSED_PALETTE[n];
    expect(contrast(c, PAGE_BG)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c, CARD_BG)).toBeGreaterThanOrEqual(4.5);
    expect(isCyanTeal(c)).toBe(false);
  });

  it('keeps every pair distinguishable under normal vision and protan / deutan / tritan', () => {
    for (let i = 0; i < names.length; i++)
      for (let j = i + 1; j < names.length; j++) {
        const r = minPairDelta(PROPOSED_PALETTE[names[i]], PROPOSED_PALETTE[names[j]]);
        expect(r.de, `${names[i]} / ${names[j]} (${r.kind})`).toBeGreaterThan(5);
      }
  });

  it('keeps neighbours in the filter row at 7 or more', () => {
    for (let i = 0; i < names.length - 1; i++) {
      const r = minPairDelta(PROPOSED_PALETTE[names[i]], PROPOSED_PALETTE[names[i + 1]]);
      expect(r.de, `${names[i]} / ${names[i + 1]}`).toBeGreaterThanOrEqual(7);
    }
  });
});

describe('colour maths', () => {
  it('deltaE2000 of identical colours is 0 and black / white is 100', () => {
    expect(deltaE('#336699', '#336699')).toBeCloseTo(0, 6);
    expect(deltaE('#000000', '#ffffff')).toBeCloseTo(100, 0);
  });
  it('a colour-blind simulation leaves grey unchanged', () => {
    expect(simulate('#808080', 'deutan')).toBe('#808080');
  });
  it('splits a compound agency to its lead', () => {
    expect(leadAgency('ESA / NASA')).toBe('ESA');
    expect(leadAgency('Roscosmos')).toBe('Roscosmos');
  });
});

describe('strip geometry', () => {
  it('packDots never lets two dots of one row touch', () => {
    const missions = Array.from({ length: 80 }, (_, i) => ({
      id: `m${i}`,
      agency: 'NASA',
      year: 1957 + ((i * 7) % 60),
      color: '#fff',
    }));
    const { dots, rows } = packDots(
      missions,
      { width: 340, min: 1957, max: 2040, size: 6, gap: 1 },
      () => '#fff',
    );
    expect(dots).toHaveLength(80);
    for (let r = 0; r < rows; r++) {
      const row = dots.filter((d) => d.row === r).sort((a, b) => a.x - b.x);
      for (let i = 1; i < row.length; i++)
        expect(row[i].x - row[i - 1].x).toBeGreaterThanOrEqual(6);
    }
  });

  it('placeLabels puts touching labels in different rows', () => {
    const { rows, count } = placeLabels(
      [
        { x: 0, w: 90 },
        { x: 65, w: 85 },
        { x: 200, w: 70 },
      ],
      8,
    );
    expect(rows).toEqual([0, 1, 0]);
    expect(count).toBe(2);
  });

  it('puts the overlapping Shuttle & Mir era in a second lane and nothing else', () => {
    const lanes = bandLanes(EPOCH_BANDS);
    const second = EPOCH_BANDS.filter((_, i) => lanes[i] === 1).map((b) => b.id);
    expect(second).toEqual(['shuttle-and-mir']);
    expect(overlapYears(EPOCH_BANDS[3], EPOCH_BANDS[4])).toBe(5);
  });
});
