import { describe, expect, it } from 'vitest';
import { fitChips } from './chip-fit';

// The solar-system chips in a 296 px rail: All, Planets, Dwarfs, Asteroids, Moons, Comets.
const W = [46, 78, 70, 94, 62, 70];

describe('fitChips', () => {
  it('folds nothing when every chip fits the line', () => {
    expect(fitChips(W, 6, 600, [1, 2, 3, 4, 5])).toEqual({
      visible: [0, 1, 2, 3, 4, 5],
      folded: [],
    });
  });

  it('keeps All, then the chips in priority order while they fit', () => {
    // 46; Planets 78 -> 130; Moons 62 -> 198; Dwarfs 70 -> 274; Asteroids 94 -> 374 does not fit
    expect(fitChips(W, 6, 296, [1, 4, 2, 3, 5])).toEqual({
      visible: [0, 1, 2, 4],
      folded: [3, 5],
    });
  });

  it('ends the walk at the first chip that does not fit, even if a later one would', () => {
    // a 200 px chip does not fit beside All; the 30 px one behind it is not taken
    expect(fitChips([50, 250, 30], 6, 280, [1, 2])).toEqual({ visible: [0], folded: [1, 2] });
  });

  it('keeps visible chips in their own order, not in priority order', () => {
    expect(fitChips(W, 6, 296, [4, 1]).visible).toEqual([0, 1, 4]);
  });

  it('always keeps All, even on a line narrower than All', () => {
    expect(fitChips(W, 6, 30, [1, 2])).toEqual({ visible: [0], folded: [1, 2, 3, 4, 5] });
  });

  it('is a no-op for a row of one chip', () => {
    expect(fitChips([50], 6, 10, [])).toEqual({ visible: [0], folded: [] });
  });

  it('ignores a priority entry that is All, repeated or out of range', () => {
    expect(fitChips(W, 6, 296, [0, 1, 1, 99, 4]).visible).toEqual([0, 1, 4]);
  });
});
