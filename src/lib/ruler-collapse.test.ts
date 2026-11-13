import { describe, it, expect } from 'vitest';
import {
  RULER_COLLAPSE_KEY,
  RULER_SHORT_VIEWPORT_PX,
  initialCollapsed,
  saveCollapsed,
} from './ruler-collapse';

const memory = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    raw: m,
  };
};
const blocked = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('ruler collapse', () => {
  it('starts expanded on a tall window and folded below 560 px with no saved choice', () => {
    expect(initialCollapsed(900, memory())).toBe(false);
    expect(initialCollapsed(RULER_SHORT_VIEWPORT_PX, memory())).toBe(false);
    expect(initialCollapsed(RULER_SHORT_VIEWPORT_PX - 1, memory())).toBe(true);
  });

  it('a saved choice wins over the window height, both ways', () => {
    const s = memory();
    saveCollapsed(false, s);
    expect(initialCollapsed(375, s)).toBe(false);
    saveCollapsed(true, s);
    expect(initialCollapsed(1200, s)).toBe(true);
    expect(s.raw.get(RULER_COLLAPSE_KEY)).toBe('1');
  });

  it('survives blocked storage: reads fall back to the default, writes do not throw', () => {
    expect(initialCollapsed(900, blocked)).toBe(false);
    expect(initialCollapsed(300, blocked)).toBe(true);
    expect(() => saveCollapsed(true, blocked)).not.toThrow();
    expect(initialCollapsed(900, null)).toBe(false);
  });
});
