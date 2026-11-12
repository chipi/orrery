/** Arrow-key target inside a radiogroup of chips (WAI-ARIA radio group): the index to move to, or null. */
export function nextChoiceIndex(
  key: string,
  index: number,
  count: number,
  rtl = false,
): number | null {
  if (count <= 0 || index < 0) return null;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
  const back = rtl ? 'ArrowRight' : 'ArrowLeft';
  if (key === forward || key === 'ArrowDown') return (index + 1) % count;
  if (key === back || key === 'ArrowUp') return (index - 1 + count) % count;
  return null;
}

/** Marks the click a radiogroup arrow key fires on the chip it moves to (see ChipGroup). */
export const ARROW_SELECT_ATTR = 'data-arrow-select';

/**
 * A popover of choice chips (the mobile speed slot) closes on a pointer click, Enter or Space,
 * but stays open while arrow keys move through it — closing would unmount the focused chip.
 * Returns true when the popover should close; on a keyboard close focus goes back to `trigger`.
 */
export function closesPopover(
  e: MouseEvent,
  trigger: () => HTMLElement | null | undefined,
): boolean {
  const chip = e.currentTarget as HTMLElement | null;
  if (chip?.hasAttribute(ARROW_SELECT_ATTR)) return false;
  if (e.detail === 0) trigger()?.focus();
  return true;
}
