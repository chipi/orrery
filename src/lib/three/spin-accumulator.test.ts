import { describe, it, expect } from 'vitest';
import { createSpinAccumulator } from './spin-accumulator';

describe('spin-accumulator', () => {
  it('starts at zero', () => {
    expect(createSpinAccumulator().value()).toBe(0);
  });

  it('integrates dt when running', () => {
    const s = createSpinAccumulator();
    s.tick(0, true); // first frame initialises lastFrameT, no growth
    s.tick(1, true); // dt = 1
    s.tick(2, true); // dt = 1
    expect(s.value()).toBe(2);
  });

  it('pauses without losing accumulated value', () => {
    const s = createSpinAccumulator();
    s.tick(0, true);
    s.tick(1, true); // value = 1
    s.tick(5, false); // dt = 4 but paused → stays at 1
    s.tick(6, true); // dt = 1 resumed
    expect(s.value()).toBe(2);
  });

  it('reset zeroes accumulator + first-frame state', () => {
    const s = createSpinAccumulator();
    s.tick(0, true);
    s.tick(10, true);
    expect(s.value()).toBe(10);
    s.reset();
    expect(s.value()).toBe(0);
    s.tick(100, true); // first-frame post-reset
    s.tick(101, true);
    expect(s.value()).toBe(1);
  });
});
