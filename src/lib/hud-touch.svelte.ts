/**
 * Whether the viewer has a touch-first device ((hover: none), (pointer: coarse)). On the Worlds
 * that decides which host carries the locate chip: the bottom-left stack on a pointer device, the
 * scene's bottom bar on a phone. One DOM instance either way (its data-testid is unique).
 */
export const hudTouch = $state({ value: false });

/** Starts following the media query; returns the stop function. Browser only (call from onMount). */
export function watchHudTouch(): () => void {
  const mq = window.matchMedia('(hover: none), (pointer: coarse)');
  hudTouch.value = mq.matches;
  const on = () => (hudTouch.value = mq.matches);
  mq.addEventListener('change', on);
  return () => mq.removeEventListener('change', on);
}
