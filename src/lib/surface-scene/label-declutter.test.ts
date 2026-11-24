import { describe, expect, it } from 'vitest';
import { declutterLabels } from './label-declutter';

describe('declutterLabels', () => {
  it('puts a lone label right of its dot', () => {
    expect(declutterLabels([{ x: 50, y: 50, w: 60, h: 12 }], 390)).toEqual([{ left: 56 }]);
  });
  it('flips a label left at the right edge', () => {
    expect(declutterLabels([{ x: 360, y: 50, w: 60, h: 12 }], 390)).toEqual([{ left: 294 }]);
  });
  it('drops a label that would overlap one already placed; the first keeps its place', () => {
    const out = declutterLabels(
      [
        { x: 100, y: 50, w: 60, h: 12 },
        { x: 102, y: 52, w: 60, h: 12 },
      ],
      390,
    );
    expect(out[0].left).toBe(106);
    // Right of it overlaps the first; left of it (36..96) is free.
    expect(out[1].left).toBe(36);
  });
  it('drops a label with no free side', () => {
    const out = declutterLabels(
      [
        { x: 100, y: 50, w: 60, h: 12 },
        { x: 100, y: 50, w: 60, h: 12 },
        { x: 100, y: 50, w: 60, h: 12 },
      ],
      390,
    );
    expect(out[2].left).toBeNull();
  });
});
