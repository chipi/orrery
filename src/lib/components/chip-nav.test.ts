import { describe, it, expect } from 'vitest';
import { nextChoiceIndex } from './chip-nav';

describe('nextChoiceIndex', () => {
  it('moves forward and wraps on ArrowRight / ArrowDown', () => {
    expect(nextChoiceIndex('ArrowRight', 0, 3)).toBe(1);
    expect(nextChoiceIndex('ArrowDown', 2, 3)).toBe(0);
  });
  it('moves back and wraps on ArrowLeft / ArrowUp', () => {
    expect(nextChoiceIndex('ArrowLeft', 1, 3)).toBe(0);
    expect(nextChoiceIndex('ArrowUp', 0, 3)).toBe(2);
  });
  it('swaps Left and Right in RTL', () => {
    expect(nextChoiceIndex('ArrowLeft', 0, 3, true)).toBe(1);
    expect(nextChoiceIndex('ArrowRight', 0, 3, true)).toBe(2);
  });
  it('jumps on Home / End', () => {
    expect(nextChoiceIndex('Home', 2, 4)).toBe(0);
    expect(nextChoiceIndex('End', 0, 4)).toBe(3);
  });
  it('ignores other keys, an unknown target and an empty group', () => {
    expect(nextChoiceIndex('a', 0, 3)).toBeNull();
    expect(nextChoiceIndex('ArrowRight', -1, 3)).toBeNull();
    expect(nextChoiceIndex('ArrowRight', 0, 0)).toBeNull();
  });
});
