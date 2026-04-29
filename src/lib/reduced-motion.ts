/**
 * `prefers-reduced-motion` detection (RFC-005 / ADR-025).
 *
 * Wraps `matchMedia('(prefers-reduced-motion: reduce)')` so consumers
 * don't have to type the same media-query string. SSR-safe — returns
 * false if `window.matchMedia` is unavailable.
 *
 * The contract per ADR-025: when this returns true, screens stop
 * UNSOLICITED motion (auto-orbit, auto-rotate, sim-time advancing on
 * its own). User-initiated motion (drag, scroll, scrubber) still
 * works — accessibility is about agency, not paralysis.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Subscribe to changes in the user's reduced-motion preference. Calls
 * the listener immediately with the current value, and again whenever
 * the OS-level preference flips. Returns an unsubscribe function.
 *
 * Usage:
 *   const stop = onReducedMotionChange((reduced) => { ... });
 *   onDestroy(stop);
 */
export function onReducedMotionChange(listener: (reduced: boolean) => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) {
    listener(false);
    return () => {};
  }
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const handler = () => listener(mq.matches);
  handler();
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
