import { describe, expect, it } from 'vitest';
import { dismissesHint, HINT_DRAG_PX, HINT_TIMEOUT_MS, timeoutEvent } from './hint-state';

describe('dismissesHint', () => {
  it('goes after a wheel turn, a pinch, a tap or a close', () => {
    expect(dismissesHint({ type: 'wheel' })).toBe(true);
    expect(dismissesHint({ type: 'pinch' })).toBe(true);
    expect(dismissesHint({ type: 'tap' })).toBe(true);
    expect(dismissesHint({ type: 'close' })).toBe(true);
  });

  it('stays through a wobble and goes once the press travels', () => {
    expect(dismissesHint({ type: 'drag', travelPx: 0 })).toBe(false);
    expect(dismissesHint({ type: 'drag', travelPx: HINT_DRAG_PX - 1 })).toBe(false);
    expect(dismissesHint({ type: 'drag', travelPx: HINT_DRAG_PX })).toBe(true);
  });

  it('the timer path always dismisses (a measured elapsed time could read 11 999.9)', () => {
    expect(dismissesHint(timeoutEvent())).toBe(true);
    expect(timeoutEvent()).toEqual({ type: 'timeout', elapsedMs: HINT_TIMEOUT_MS });
  });

  it('goes after twelve seconds, not before', () => {
    expect(HINT_TIMEOUT_MS).toBe(12_000);
    expect(dismissesHint({ type: 'timeout', elapsedMs: HINT_TIMEOUT_MS - 1 })).toBe(false);
    expect(dismissesHint({ type: 'timeout', elapsedMs: HINT_TIMEOUT_MS })).toBe(true);
  });
});
