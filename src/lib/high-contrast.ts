/**
 * `prefers-contrast: more` detection + manual override (ADR-029
 * / Theme C.C2).
 *
 * Two activation paths recognised:
 *   1. OS preference: matchMedia('(prefers-contrast: more)')
 *   2. Manual override: data-high-contrast="true" attribute on <html>
 *
 * The manual override takes precedence when set. Reflected as a
 * boolean by `prefersHighContrast()` so consumers don't have to read
 * both paths. Mirrors the shape of `reduced-motion.ts` 1:1.
 *
 * SSR-safe — returns false if `window.matchMedia` is unavailable.
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  if (document.documentElement.dataset.highContrast === 'true') return true;
  return window.matchMedia('(prefers-contrast: more)').matches;
}

/**
 * Subscribe to changes in the user's high-contrast preference. Calls
 * the listener immediately with the current value and again whenever
 * either path flips (OS preference OR manual attribute toggle).
 * Returns an unsubscribe function.
 */
export function onHighContrastChange(listener: (hi: boolean) => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) {
    listener(false);
    return () => {};
  }
  const mq = window.matchMedia('(prefers-contrast: more)');
  const fire = () => listener(prefersHighContrast());
  fire();
  mq.addEventListener('change', fire);
  // Watch the html attribute too — manual toggle changes need to fire
  // listeners just like OS-level changes do.
  const observer = new MutationObserver((mutations) => {
    for (const mut of mutations) {
      if (mut.type === 'attributes' && mut.attributeName === 'data-high-contrast') {
        fire();
        return;
      }
    }
  });
  observer.observe(document.documentElement, { attributes: true });
  return () => {
    mq.removeEventListener('change', fire);
    observer.disconnect();
  };
}

/** Toggle the manual high-contrast attribute on <html>. Returns the
 *  new state for caller convenience. */
export function toggleHighContrast(): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.documentElement;
  const next = el.dataset.highContrast !== 'true';
  if (next) el.dataset.highContrast = 'true';
  else delete el.dataset.highContrast;
  return next;
}
