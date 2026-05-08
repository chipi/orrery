/**
 * Science Lens — a global on/off toggle that surfaces the underlying
 * physics layer across the app (Concept #2 from the science integrations
 * roadmap).
 *
 * State sticks via the `data-science-lens="on"` attribute on <html>, so
 * routes can target it from CSS without import gymnastics:
 *
 *   :global([data-science-lens='on']) .my-trajectory {
 *     stroke: var(--lens-trajectory);
 *   }
 *
 * Or read it in script via the exported store/listener pair.
 *
 * Design note: deliberately matches the high-contrast toggle pattern
 * from Theme C.C2 (ADR-029) — same lightweight attribute-on-<html>
 * approach, no localStorage (per CLAUDE.md "no localStorage" rule),
 * resets to off on every page load. Cheap, predictable, contained.
 */

const ATTR = 'data-science-lens';

function root(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.documentElement;
}

/** True when the lens is currently on. SSR-safe (returns false during prerender). */
export function isScienceLensOn(): boolean {
  const r = root();
  return r?.getAttribute(ATTR) === 'on';
}

/** Toggle the lens on/off; returns the new state. */
export function toggleScienceLens(): boolean {
  const r = root();
  if (!r) return false;
  const next = r.getAttribute(ATTR) === 'on' ? 'off' : 'on';
  r.setAttribute(ATTR, next);
  return next === 'on';
}

/** Subscribe to lens-state changes. Returns an unsubscribe function. The
 * callback fires once with the initial state, then on every flip via a
 * MutationObserver on the <html> attribute. */
export function onScienceLensChange(cb: (on: boolean) => void): (() => void) | undefined {
  const r = root();
  if (!r) return undefined;
  cb(r.getAttribute(ATTR) === 'on');
  const obs = new MutationObserver((mutations) => {
    for (const mut of mutations) {
      if (mut.type === 'attributes' && mut.attributeName === ATTR) {
        cb(r.getAttribute(ATTR) === 'on');
      }
    }
  });
  obs.observe(r, { attributes: true, attributeFilter: [ATTR] });
  return () => obs.disconnect();
}
