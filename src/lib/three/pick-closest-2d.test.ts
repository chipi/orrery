import { describe, expect, it } from 'vitest';
import { pickClosest2d } from './pick-closest-2d';

function fakeCanvas(): HTMLCanvasElement {
  return {
    getBoundingClientRect: () => ({ left: 0, top: 0 }) as DOMRect,
  } as unknown as HTMLCanvasElement;
}

describe('pickClosest2d', () => {
  it('returns null when positions map is empty', () => {
    expect(
      pickClosest2d({
        canvas: fakeCanvas(),
        clientX: 50,
        clientY: 50,
        positions: new Map(),
        tolerance: 20,
      }),
    ).toBe(null);
  });

  it('returns the id of the closest marker inside tolerance', () => {
    const positions = new Map([
      ['far', { x: 200, y: 200 }],
      ['near', { x: 52, y: 51 }],
      ['mid', { x: 80, y: 80 }],
    ]);
    expect(
      pickClosest2d({
        canvas: fakeCanvas(),
        clientX: 50,
        clientY: 50,
        positions,
        tolerance: 20,
      }),
    ).toBe('near');
  });

  it('returns null when every marker exceeds tolerance', () => {
    const positions = new Map([['far', { x: 500, y: 500 }]]);
    expect(
      pickClosest2d({
        canvas: fakeCanvas(),
        clientX: 50,
        clientY: 50,
        positions,
        tolerance: 20,
      }),
    ).toBe(null);
  });

  it('subtracts canvas rect offset from the click coordinates', () => {
    const canvas = {
      getBoundingClientRect: () => ({ left: 100, top: 100 }) as DOMRect,
    } as unknown as HTMLCanvasElement;
    const positions = new Map([['origin', { x: 0, y: 0 }]]);
    // clientX/Y of (105, 105) → canvas-local (5, 5) → 7.07 away from origin.
    expect(pickClosest2d({ canvas, clientX: 105, clientY: 105, positions, tolerance: 10 })).toBe(
      'origin',
    );
  });

  it('prefers the closer of two equally-eligible markers', () => {
    const positions = new Map([
      ['a', { x: 60, y: 50 }], // 10 away
      ['b', { x: 55, y: 50 }], // 5 away
    ]);
    expect(
      pickClosest2d({
        canvas: fakeCanvas(),
        clientX: 50,
        clientY: 50,
        positions,
        tolerance: 20,
      }),
    ).toBe('b');
  });
});
