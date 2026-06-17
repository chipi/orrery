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

/**
 * Per-route advertisement: "this route supports the science lens."
 * Set on mount by `ScienceLayersPanel` (the component that actually
 * surfaces lens-conditional content), cleared on unmount. Lens-aware
 * routes get `<html data-science-lens-available>` while they're
 * active; lens-blind routes (/missions, /fleet, /library, /credits,
 * /, ...) leave the attribute absent.
 *
 * Nav uses the attribute to gate the lens-toggle's hover-affordance:
 * on lens-blind routes the toggle still renders + still toggles the
 * underlying state, but mousing over it doesn't shift colour, since
 * clicking it wouldn't change anything the user can see (2026-06-15
 * user note: "physics layer button should not change color on hover
 * when on pages that do not have science lens").
 *
 * Idempotent under concurrent mounts (the panel can mount + unmount
 * inside Svelte component lifecycle without interfering with another
 * panel on the same page) — currently no route mounts two, but the
 * ref-counted set keeps the contract future-proof.
 */
const AVAIL_ATTR = 'data-science-lens-available';
const availableMounts = new Set<symbol>();

export function markScienceLensAvailable(): () => void {
  const token = Symbol();
  availableMounts.add(token);
  const r = root();
  if (r) r.setAttribute(AVAIL_ATTR, '');
  return () => {
    availableMounts.delete(token);
    if (availableMounts.size === 0) {
      const r2 = root();
      if (r2) r2.removeAttribute(AVAIL_ATTR);
    }
  };
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

/**
 * Subscribe to availability changes (route mount/unmount). Same shape
 * as `onScienceLensChange` — fires once with initial state, then on
 * every flip via a MutationObserver on the AVAIL_ATTR attribute on
 * <html>. Used by Nav to set the lens-toggle button's `disabled` state
 * on routes that don't surface lens content (2026-06-17 user direction:
 * "can we also disable science button in the same way when not being
 * able to be used"). Mirrors the gear-toggle's
 * settingsState.available wiring.
 */
export function onScienceLensAvailableChange(
  cb: (available: boolean) => void,
): (() => void) | undefined {
  const r = root();
  if (!r) return undefined;
  cb(r.hasAttribute(AVAIL_ATTR));
  const obs = new MutationObserver((mutations) => {
    for (const mut of mutations) {
      if (mut.type === 'attributes' && mut.attributeName === AVAIL_ATTR) {
        cb(r.hasAttribute(AVAIL_ATTR));
      }
    }
  });
  obs.observe(r, { attributes: true, attributeFilter: [AVAIL_ATTR] });
  return () => obs.disconnect();
}
