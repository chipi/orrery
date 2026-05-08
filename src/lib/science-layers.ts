/**
 * Science Layers — sub-toggle system that opts users into individual
 * physics overlays once the master Science Lens is on. Phase G of the
 * /science integration roadmap.
 *
 * Mirrors the attribute-on-<html> pattern used by science-lens.ts and
 * the high-contrast toggle (ADR-029): one boolean per layer, stored as
 * `data-science-layer-<key>="on"|"off"` on the document element.
 *
 * Why per-layer attributes (not a single JSON blob): CSS can target
 * `[data-science-layer-soi="on"] .my-ring` directly without script.
 *
 * Lens master coupling: when the master lens flips off, every layer
 * should be treated as off by consumers — `isLayerOn()` enforces this
 * so individual overlays don't need to also subscribe to the lens. The
 * layer attribute itself is preserved across lens-toggle cycles so a
 * user's per-layer preferences sit waiting for the next lens-on.
 */

import { isScienceLensOn, onScienceLensChange } from './science-lens';

export type LayerKey =
  | 'gravity' // A — gravity arrows
  | 'velocity' // B — velocity tangent arrows
  | 'soi' // C — sphere-of-influence rings
  | 'hover' // D — hover info cards
  | 'centripetal' // E — centripetal acceleration arrows
  | 'apsides' // G — perihelion/aphelion + true anomaly callouts
  | 'coast' // H — engine-off coast preview (/fly only)
  | 'conics' // I — conic-section family side panel (/fly only)
  | 'microgravity' // F — microgravity 3D axes (/iss + /tiangong only)
  | 'atmosphere'; // J.3 — atmosphere altitude shells (terrestrial bodies)

/** All layers in canonical display order — used by the UI panel. */
export const LAYER_ORDER: readonly LayerKey[] = [
  'soi',
  'hover',
  'gravity',
  'velocity',
  'centripetal',
  'apsides',
  'coast',
  'conics',
  'microgravity',
  'atmosphere',
];

/** Default visibility when the lens first activates. Sensible "starter
 * set" so first-time users see something interesting without being
 * overwhelmed; advanced layers stay opt-in. */
export const LAYER_DEFAULTS: Record<LayerKey, boolean> = {
  soi: true,
  hover: true,
  gravity: true,
  velocity: false,
  centripetal: false,
  apsides: false,
  coast: false,
  conics: false,
  microgravity: true,
  atmosphere: true,
};

const ATTR_PREFIX = 'data-science-layer-';

function root(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.documentElement;
}

function attrName(key: LayerKey): string {
  return `${ATTR_PREFIX}${key}`;
}

/** True iff the master lens is on AND this layer is on. SSR-safe. */
export function isLayerOn(key: LayerKey): boolean {
  if (!isScienceLensOn()) return false;
  const r = root();
  return r?.getAttribute(attrName(key)) === 'on';
}

/** Set this layer's stored preference. Does not auto-enable the lens —
 * if the lens is off, the new value is remembered for next lens-on. */
export function setLayer(key: LayerKey, on: boolean): void {
  const r = root();
  if (!r) return;
  r.setAttribute(attrName(key), on ? 'on' : 'off');
}

/** Apply LAYER_DEFAULTS for any layer that has no stored preference yet
 * (i.e. attribute absent). Idempotent — call once per route mount. */
export function ensureLayerDefaults(): void {
  const r = root();
  if (!r) return;
  for (const key of LAYER_ORDER) {
    if (r.getAttribute(attrName(key)) == null) {
      setLayer(key, LAYER_DEFAULTS[key]);
    }
  }
}

/** Subscribe to a layer's effective on/off state. Fires once with the
 * current value, then whenever EITHER the master lens flips OR this
 * layer's attribute changes. Returns an unsubscribe function. */
export function onLayerChange(key: LayerKey, cb: (on: boolean) => void): (() => void) | undefined {
  const r = root();
  if (!r) return undefined;

  const emit = () => cb(isLayerOn(key));
  emit();

  // Watch the layer's own attribute.
  const obs = new MutationObserver((mutations) => {
    for (const mut of mutations) {
      if (mut.type === 'attributes' && mut.attributeName === attrName(key)) {
        emit();
        return;
      }
    }
  });
  obs.observe(r, { attributes: true, attributeFilter: [attrName(key)] });

  // Also re-emit when the master lens flips (effective state may change).
  const stopLens = onScienceLensChange(() => emit());

  return () => {
    obs.disconnect();
    stopLens?.();
  };
}
