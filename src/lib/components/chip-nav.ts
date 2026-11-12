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
