// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { ARROW_SELECT_ATTR, closesPopover, nextChoiceIndex } from './chip-nav';

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

describe('closesPopover', () => {
  const event = (detail: number, arrow = false) => {
    const chip = document.createElement('button');
    if (arrow) chip.setAttribute(ARROW_SELECT_ATTR, '');
    return { currentTarget: chip, detail } as unknown as MouseEvent;
  };

  it('stays open for an arrow-key selection', () => {
    const trigger = document.createElement('button');
    const focus = vi.spyOn(trigger, 'focus');
    expect(closesPopover(event(0, true), () => trigger)).toBe(false);
    expect(focus).not.toHaveBeenCalled();
  });

  it('closes on a pointer click without moving focus', () => {
    const trigger = document.createElement('button');
    const focus = vi.spyOn(trigger, 'focus');
    expect(closesPopover(event(1), () => trigger)).toBe(true);
    expect(focus).not.toHaveBeenCalled();
  });

  it('closes on Enter / Space and hands focus back to the trigger', () => {
    const trigger = document.createElement('button');
    const focus = vi.spyOn(trigger, 'focus');
    expect(closesPopover(event(0), () => trigger)).toBe(true);
    expect(focus).toHaveBeenCalledOnce();
  });
});
