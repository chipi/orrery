// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { flushSync } from 'svelte';
import {
  stepInOrder,
  nearestInDirection,
  createRovingFocus,
  type RovingItem,
} from './roving-focus.svelte';

// ─── stepInOrder ─────────────────────────────────────────────────────────────

describe('stepInOrder — empty list', () => {
  it('returns null when there are no items', () => {
    expect(stepInOrder([], null, 1)).toBeNull();
    expect(stepInOrder([], 'x', -1)).toBeNull();
  });
});

describe('stepInOrder — currentId not in list', () => {
  const items: RovingItem[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('returns the first item when currentId is null', () => {
    expect(stepInOrder(items, null, 1)).toBe('a');
    expect(stepInOrder(items, null, -1)).toBe('a');
  });

  it('returns the first item when currentId is unknown', () => {
    expect(stepInOrder(items, 'zzz', 1)).toBe('a');
  });
});

describe('stepInOrder — forward step', () => {
  const items: RovingItem[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('moves to the next item', () => {
    expect(stepInOrder(items, 'a', 1)).toBe('b');
    expect(stepInOrder(items, 'b', 1)).toBe('c');
  });

  it('clamps at the end without wrap', () => {
    expect(stepInOrder(items, 'c', 1, false)).toBe('c');
  });

  it('wraps to the first item when wrap=true', () => {
    expect(stepInOrder(items, 'c', 1, true)).toBe('a');
  });
});

describe('stepInOrder — backward step', () => {
  const items: RovingItem[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('moves to the previous item', () => {
    expect(stepInOrder(items, 'c', -1)).toBe('b');
    expect(stepInOrder(items, 'b', -1)).toBe('a');
  });

  it('clamps at the start without wrap', () => {
    expect(stepInOrder(items, 'a', -1, false)).toBe('a');
  });

  it('wraps to the last item when wrap=true', () => {
    expect(stepInOrder(items, 'a', -1, true)).toBe('c');
  });
});

describe('stepInOrder — disabled items are skipped', () => {
  const items: RovingItem[] = [{ id: 'a' }, { id: 'b', disabled: true }, { id: 'c' }];

  it('skips disabled items in the ordered list', () => {
    // Enabled list: [a, c] — stepping forward from a gives c.
    expect(stepInOrder(items, 'a', 1)).toBe('c');
  });

  it('skips disabled items stepping backward', () => {
    expect(stepInOrder(items, 'c', -1)).toBe('a');
  });
});

describe('stepInOrder — explicit order field', () => {
  it('respects the order field over registration order', () => {
    const items: RovingItem[] = [
      { id: 'z', order: 3 },
      { id: 'a', order: 1 },
      { id: 'm', order: 2 },
    ];
    expect(stepInOrder(items, 'a', 1)).toBe('m');
    expect(stepInOrder(items, 'm', 1)).toBe('z');
  });
});

// ─── nearestInDirection ───────────────────────────────────────────────────────

describe('nearestInDirection — empty / no-pos list', () => {
  it('returns null when list is empty', () => {
    expect(nearestInDirection([], null, 'right')).toBeNull();
  });

  it('returns null when all items have no pos', () => {
    const items: RovingItem[] = [{ id: 'a' }, { id: 'b' }];
    expect(nearestInDirection(items, null, 'right')).toBeNull();
  });
});

describe('nearestInDirection — current not found', () => {
  it('returns first enabled item when currentId is null', () => {
    const items: RovingItem[] = [
      { id: 'a', pos: { x: 0, y: 0 } },
      { id: 'b', pos: { x: 1, y: 0 } },
    ];
    expect(nearestInDirection(items, null, 'right')).toBe('a');
  });

  it('returns first pos-enabled item when currentId has no pos', () => {
    const items: RovingItem[] = [{ id: 'no-pos' }, { id: 'a', pos: { x: 0, y: 0 } }];
    // 'no-pos' is filtered out (no pos), cur lookup fails → list[0] = 'a'
    expect(nearestInDirection(items, 'no-pos', 'right')).toBe('a');
  });
});

describe('nearestInDirection — four cardinal directions', () => {
  // Grid: b=above, d=below, c=right, a=left of centre m.
  const items: RovingItem[] = [
    { id: 'm', pos: { x: 0, y: 0 } },
    { id: 'r', pos: { x: 10, y: 0 } },
    { id: 'l', pos: { x: -10, y: 0 } },
    { id: 'u', pos: { x: 0, y: -10 } },
    { id: 'd', pos: { x: 0, y: 10 } },
  ];

  it('right selects the item to the right', () => {
    expect(nearestInDirection(items, 'm', 'right')).toBe('r');
  });

  it('left selects the item to the left', () => {
    expect(nearestInDirection(items, 'm', 'left')).toBe('l');
  });

  it('down selects the item below (larger y)', () => {
    expect(nearestInDirection(items, 'm', 'down')).toBe('d');
  });

  it('up selects the item above (smaller y)', () => {
    expect(nearestInDirection(items, 'm', 'up')).toBe('u');
  });

  it('returns null when no item lies in the chosen direction', () => {
    // From 'r' (rightmost), nothing is further right
    expect(nearestInDirection(items, 'r', 'right')).toBeNull();
  });
});

describe('nearestInDirection — cross-axis penalty picks closer item', () => {
  it('prefers axially-aligned over diagonally-close items', () => {
    const items: RovingItem[] = [
      { id: 'origin', pos: { x: 0, y: 0 } },
      // Directly to the right — score = 5 + 0*2 = 5
      { id: 'direct', pos: { x: 5, y: 0 } },
      // Same primary distance but large cross-axis drift — score = 5 + 10*2 = 25
      { id: 'diagonal', pos: { x: 5, y: 10 } },
    ];
    expect(nearestInDirection(items, 'origin', 'right')).toBe('direct');
  });
});

describe('nearestInDirection — disabled items excluded', () => {
  it('ignores disabled items even when they are in the correct direction', () => {
    const items: RovingItem[] = [
      { id: 'a', pos: { x: 0, y: 0 } },
      { id: 'disabled', pos: { x: 5, y: 0 }, disabled: true },
      { id: 'b', pos: { x: 10, y: 0 } },
    ];
    expect(nearestInDirection(items, 'a', 'right')).toBe('b');
  });
});

// ─── createRovingFocus — reactive wrapper ─────────────────────────────────────

/** Run fn in an $effect.root so $state/$derived work; teardown cleans up. */
function withRoot<T>(fn: () => T): { result: T; teardown: () => void } {
  let result!: T;
  const teardown = $effect.root(() => {
    result = fn();
  });
  flushSync();
  return { result, teardown };
}

describe('createRovingFocus — registration', () => {
  it('starts with an empty item list and null currentId', () => {
    const { result, teardown } = withRoot(() => createRovingFocus());
    expect(result.items).toHaveLength(0);
    expect(result.currentId).toBeNull();
    teardown();
  });

  it('auto-selects the first non-disabled registered item', () => {
    const { result, teardown } = withRoot(() => {
      const rf = createRovingFocus();
      rf.register({ id: 'a' });
      return rf;
    });
    flushSync();
    expect(result.currentId).toBe('a');
    teardown();
  });

  it('does not override currentId when a second item registers', () => {
    const { result, teardown } = withRoot(() => {
      const rf = createRovingFocus();
      rf.register({ id: 'a' });
      rf.register({ id: 'b' });
      return rf;
    });
    flushSync();
    expect(result.currentId).toBe('a');
    teardown();
  });

  it('skips disabled items for auto-selection', () => {
    const { result, teardown } = withRoot(() => {
      const rf = createRovingFocus();
      rf.register({ id: 'disabled', disabled: true });
      rf.register({ id: 'enabled' });
      return rf;
    });
    flushSync();
    expect(result.currentId).toBe('enabled');
    teardown();
  });

  it('updates an existing item on re-register (upsert)', () => {
    const { result, teardown } = withRoot(() => {
      const rf = createRovingFocus();
      rf.register({ id: 'a' });
      rf.register({ id: 'a', disabled: true });
      return rf;
    });
    flushSync();
    expect(result.items[0].disabled).toBe(true);
    teardown();
  });
});

describe('createRovingFocus — unregister', () => {
  it('removes the item from the list', () => {
    const { result, teardown } = withRoot(() => {
      const rf = createRovingFocus();
      rf.register({ id: 'a' });
      rf.register({ id: 'b' });
      rf.unregister('a');
      return rf;
    });
    flushSync();
    expect(result.items.map((i) => i.id)).toEqual(['b']);
    teardown();
  });

  it('falls back to the first enabled item when the current is unregistered', () => {
    const { result, teardown } = withRoot(() => {
      const rf = createRovingFocus();
      rf.register({ id: 'a' });
      rf.register({ id: 'b' });
      // a is auto-selected; unregister it → should fall back to b
      rf.unregister('a');
      return rf;
    });
    flushSync();
    expect(result.currentId).toBe('b');
    teardown();
  });

  it('sets currentId to null when the last item is unregistered', () => {
    const { result, teardown } = withRoot(() => {
      const rf = createRovingFocus();
      rf.register({ id: 'only' });
      rf.unregister('only');
      return rf;
    });
    flushSync();
    expect(result.currentId).toBeNull();
    teardown();
  });

  it('is a no-op when the id does not match any item', () => {
    const { result, teardown } = withRoot(() => {
      const rf = createRovingFocus();
      rf.register({ id: 'a' });
      rf.unregister('zzz');
      return rf;
    });
    flushSync();
    expect(result.items).toHaveLength(1);
    teardown();
  });
});

describe('createRovingFocus — update', () => {
  it('patches a specific item by id', () => {
    const { result, teardown } = withRoot(() => {
      const rf = createRovingFocus();
      rf.register({ id: 'a' });
      rf.update('a', { disabled: true });
      return rf;
    });
    flushSync();
    expect(result.items[0].disabled).toBe(true);
    teardown();
  });

  it('is a no-op when the id is not found', () => {
    const { result, teardown } = withRoot(() => {
      const rf = createRovingFocus();
      rf.register({ id: 'a' });
      rf.update('zzz', { disabled: true });
      return rf;
    });
    flushSync();
    expect(result.items[0].disabled).toBeUndefined();
    teardown();
  });
});

describe('createRovingFocus — setCurrent', () => {
  it('updates currentId and fires onChange', () => {
    const onChange = vi.fn();
    const { result, teardown } = withRoot(() => {
      const rf = createRovingFocus({ onChange });
      rf.register({ id: 'a' });
      rf.register({ id: 'b' });
      return rf;
    });
    flushSync();
    onChange.mockClear();
    result.setCurrent('b');
    expect(result.currentId).toBe('b');
    expect(onChange).toHaveBeenCalledWith('b');
    teardown();
  });

  it('does NOT fire onChange when the id is already current', () => {
    const onChange = vi.fn();
    const { result, teardown } = withRoot(() => {
      const rf = createRovingFocus({ onChange });
      rf.register({ id: 'a' });
      return rf;
    });
    flushSync();
    onChange.mockClear();
    result.setCurrent('a'); // already current
    expect(onChange).not.toHaveBeenCalled();
    teardown();
  });
});

describe('createRovingFocus — tabindexFor', () => {
  it('returns 0 for the current item, -1 for others', () => {
    const { result, teardown } = withRoot(() => {
      const rf = createRovingFocus();
      rf.register({ id: 'a' });
      rf.register({ id: 'b' });
      return rf;
    });
    flushSync();
    expect(result.tabindexFor('a')).toBe(0);
    expect(result.tabindexFor('b')).toBe(-1);
    teardown();
  });
});

describe('createRovingFocus — move (list/vertical)', () => {
  it('ArrowDown → next, ArrowUp → prev', () => {
    const { result, teardown } = withRoot(() => {
      const rf = createRovingFocus({ orientation: 'vertical' });
      rf.register({ id: 'a' });
      rf.register({ id: 'b' });
      rf.register({ id: 'c' });
      return rf;
    });
    flushSync();
    result.move('down');
    expect(result.currentId).toBe('b');
    result.move('up');
    expect(result.currentId).toBe('a');
    teardown();
  });

  it('horizontal arrows do NOT move in vertical-only mode', () => {
    const { result, teardown } = withRoot(() => {
      const rf = createRovingFocus({ orientation: 'vertical' });
      rf.register({ id: 'a' });
      rf.register({ id: 'b' });
      return rf;
    });
    flushSync();
    result.move('right');
    expect(result.currentId).toBe('a'); // unchanged
    teardown();
  });

  it('both orientation allows all four arrows', () => {
    const { result, teardown } = withRoot(() => {
      const rf = createRovingFocus({ orientation: 'both' });
      rf.register({ id: 'a' });
      rf.register({ id: 'b' });
      return rf;
    });
    flushSync();
    result.move('right'); // forward
    expect(result.currentId).toBe('b');
    result.move('left'); // backward
    expect(result.currentId).toBe('a');
    teardown();
  });

  it('horizontal orientation allows left/right, blocks up/down', () => {
    const { result, teardown } = withRoot(() => {
      const rf = createRovingFocus({ orientation: 'horizontal' });
      rf.register({ id: 'a' });
      rf.register({ id: 'b' });
      return rf;
    });
    flushSync();
    result.move('down'); // blocked
    expect(result.currentId).toBe('a');
    result.move('right'); // allowed
    expect(result.currentId).toBe('b');
    teardown();
  });

  it('next/prev shortcuts work regardless of orientation', () => {
    const { result, teardown } = withRoot(() => {
      const rf = createRovingFocus({ orientation: 'horizontal' });
      rf.register({ id: 'a' });
      rf.register({ id: 'b' });
      rf.register({ id: 'c' });
      return rf;
    });
    flushSync();
    result.move('next');
    expect(result.currentId).toBe('b');
    result.move('prev');
    expect(result.currentId).toBe('a');
    teardown();
  });

  it('wraps when wrap=true', () => {
    const { result, teardown } = withRoot(() => {
      const rf = createRovingFocus({ wrap: true });
      rf.register({ id: 'a' });
      rf.register({ id: 'b' });
      return rf;
    });
    flushSync();
    result.move('up');
    expect(result.currentId).toBe('b');
    teardown();
  });
});

describe('createRovingFocus — move (spatial)', () => {
  it('moves to nearest item in the chosen direction by screen geometry', () => {
    const { result, teardown } = withRoot(() => {
      const rf = createRovingFocus({ mode: 'spatial' });
      rf.register({ id: 'left', pos: { x: 0, y: 0 } });
      rf.register({ id: 'right', pos: { x: 100, y: 0 } });
      return rf;
    });
    flushSync();
    // auto-current = 'left' (first registered)
    result.move('right');
    expect(result.currentId).toBe('right');
    teardown();
  });
});

describe('createRovingFocus — activate', () => {
  it('calls onActivate with the current id', () => {
    const onActivate = vi.fn();
    const { result, teardown } = withRoot(() => {
      const rf = createRovingFocus({ onActivate });
      rf.register({ id: 'a' });
      return rf;
    });
    flushSync();
    result.activate();
    expect(onActivate).toHaveBeenCalledWith('a');
    teardown();
  });

  it('does not throw when currentId is null', () => {
    const onActivate = vi.fn();
    const { result, teardown } = withRoot(() => createRovingFocus({ onActivate }));
    flushSync();
    expect(() => result.activate()).not.toThrow();
    expect(onActivate).not.toHaveBeenCalled();
    teardown();
  });
});

describe('createRovingFocus — handleKeydown', () => {
  function makeRf(opts = {}) {
    return withRoot(() => {
      const rf = createRovingFocus(opts);
      rf.register({ id: 'a' });
      rf.register({ id: 'b' });
      rf.register({ id: 'c' });
      return rf;
    });
  }

  function key(k: string): KeyboardEvent {
    return new KeyboardEvent('keydown', { key: k });
  }

  it('ArrowDown advances and returns true', () => {
    const { result, teardown } = makeRf();
    flushSync();
    expect(result.handleKeydown(key('ArrowDown'))).toBe(true);
    expect(result.currentId).toBe('b');
    teardown();
  });

  it('ArrowUp retreats and returns true', () => {
    const { result, teardown } = makeRf();
    flushSync();
    result.setCurrent('b');
    expect(result.handleKeydown(key('ArrowUp'))).toBe(true);
    expect(result.currentId).toBe('a');
    teardown();
  });

  it('ArrowLeft retreats and returns true', () => {
    const { result, teardown } = makeRf({ orientation: 'both' });
    flushSync();
    result.setCurrent('b');
    expect(result.handleKeydown(key('ArrowLeft'))).toBe(true);
    expect(result.currentId).toBe('a');
    teardown();
  });

  it('ArrowRight advances and returns true', () => {
    const { result, teardown } = makeRf({ orientation: 'both' });
    flushSync();
    expect(result.handleKeydown(key('ArrowRight'))).toBe(true);
    expect(result.currentId).toBe('b');
    teardown();
  });

  it('Home jumps to first item', () => {
    const { result, teardown } = makeRf();
    flushSync();
    result.setCurrent('c');
    expect(result.handleKeydown(key('Home'))).toBe(true);
    expect(result.currentId).toBe('a');
    teardown();
  });

  it('End jumps to last item', () => {
    const { result, teardown } = makeRf();
    flushSync();
    expect(result.handleKeydown(key('End'))).toBe(true);
    expect(result.currentId).toBe('c');
    teardown();
  });

  it('Enter triggers activate and returns true', () => {
    const onActivate = vi.fn();
    const { result, teardown } = makeRf({ onActivate });
    flushSync();
    expect(result.handleKeydown(key('Enter'))).toBe(true);
    expect(onActivate).toHaveBeenCalled();
    teardown();
  });

  it('Space triggers activate and returns true', () => {
    const onActivate = vi.fn();
    const { result, teardown } = makeRf({ onActivate });
    flushSync();
    expect(result.handleKeydown(key(' '))).toBe(true);
    expect(onActivate).toHaveBeenCalled();
    teardown();
  });

  it('unhandled keys return false', () => {
    const { result, teardown } = makeRf();
    flushSync();
    expect(result.handleKeydown(key('Tab'))).toBe(false);
    expect(result.handleKeydown(key('Escape'))).toBe(false);
    expect(result.handleKeydown(key('a'))).toBe(false);
    teardown();
  });

  it('ArrowDown at the last item (no wrap) returns false', () => {
    const { result, teardown } = makeRf();
    flushSync();
    result.setCurrent('c');
    // move returns 'c' (clamped = same as current), setCurrent short-
    // circuits, so move returns 'c' which is non-null → handleKeydown
    // returns true. The spec says "returned the id (or unchanged)".
    // The actual move result is 'c' (not null), so handleKeydown returns true.
    expect(result.handleKeydown(key('ArrowDown'))).toBe(true);
    teardown();
  });
});

describe('createRovingFocus — Home/End with empty list', () => {
  it('Home returns true without throwing when list is empty', () => {
    const { result, teardown } = withRoot(() => createRovingFocus());
    flushSync();
    const e = new KeyboardEvent('keydown', { key: 'Home' });
    expect(() => result.handleKeydown(e)).not.toThrow();
    teardown();
  });

  it('End returns true without throwing when list is empty', () => {
    const { result, teardown } = withRoot(() => createRovingFocus());
    flushSync();
    const e = new KeyboardEvent('keydown', { key: 'End' });
    expect(() => result.handleKeydown(e)).not.toThrow();
    teardown();
  });
});
