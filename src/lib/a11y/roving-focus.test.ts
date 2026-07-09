import { describe, it, expect } from 'vitest';
import { stepInOrder, nearestInDirection, type RovingItem } from './roving-focus.svelte';

const list = (...ids: string[]): RovingItem[] => ids.map((id) => ({ id }));

describe('stepInOrder (list mode)', () => {
  const items = list('a', 'b', 'c');

  it('steps forward and back', () => {
    expect(stepInOrder(items, 'a', 1)).toBe('b');
    expect(stepInOrder(items, 'b', 1)).toBe('c');
    expect(stepInOrder(items, 'c', -1)).toBe('b');
  });

  it('clamps at the ends without wrap', () => {
    expect(stepInOrder(items, 'c', 1)).toBe('c');
    expect(stepInOrder(items, 'a', -1)).toBe('a');
  });

  it('wraps when enabled', () => {
    expect(stepInOrder(items, 'c', 1, true)).toBe('a');
    expect(stepInOrder(items, 'a', -1, true)).toBe('c');
  });

  it('starts at the first item when current is unknown/null', () => {
    expect(stepInOrder(items, null, 1)).toBe('a');
    expect(stepInOrder(items, 'zzz', 1)).toBe('a');
  });

  it('skips disabled items', () => {
    const withDisabled: RovingItem[] = [{ id: 'a' }, { id: 'b', disabled: true }, { id: 'c' }];
    expect(stepInOrder(withDisabled, 'a', 1)).toBe('c');
  });

  it('respects explicit order over array position', () => {
    const reordered: RovingItem[] = [
      { id: 'a', order: 2 },
      { id: 'b', order: 0 },
      { id: 'c', order: 1 },
    ];
    expect(stepInOrder(reordered, 'b', 1)).toBe('c'); // b(0) → c(1)
    expect(stepInOrder(reordered, 'c', 1)).toBe('a'); // c(1) → a(2)
  });

  it('returns null for an empty group', () => {
    expect(stepInOrder([], 'a', 1)).toBeNull();
  });
});

describe('nearestInDirection (spatial mode)', () => {
  // Grid layout:  b is right of a; c is below a; d is far below-right.
  const grid: RovingItem[] = [
    { id: 'a', pos: { x: 0, y: 0 } },
    { id: 'b', pos: { x: 100, y: 0 } },
    { id: 'c', pos: { x: 0, y: 100 } },
    { id: 'd', pos: { x: 200, y: 300 } },
  ];

  it('moves to the nearest item in each direction', () => {
    expect(nearestInDirection(grid, 'a', 'right')).toBe('b');
    expect(nearestInDirection(grid, 'a', 'down')).toBe('c');
    expect(nearestInDirection(grid, 'b', 'left')).toBe('a');
    expect(nearestInDirection(grid, 'c', 'up')).toBe('a');
  });

  it('returns null when nothing lies in that direction', () => {
    expect(nearestInDirection(grid, 'a', 'up')).toBeNull();
    expect(nearestInDirection(grid, 'a', 'left')).toBeNull();
  });

  it('penalises cross-axis drift (prefers straight-ahead)', () => {
    const items: RovingItem[] = [
      { id: 'cur', pos: { x: 0, y: 0 } },
      { id: 'straight', pos: { x: 120, y: 0 } }, // dead right, dist 120
      { id: 'diagonal', pos: { x: 100, y: 90 } }, // right but drifting: 100 + 90*2 = 280
    ];
    expect(nearestInDirection(items, 'cur', 'right')).toBe('straight');
  });

  it('falls back to the first positioned item when current has no position', () => {
    expect(nearestInDirection(grid, 'nope', 'right')).toBe('a');
  });

  it('returns null when no items have positions', () => {
    expect(nearestInDirection(list('a', 'b'), 'a', 'right')).toBeNull();
  });
});
