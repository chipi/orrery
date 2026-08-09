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
  | 'thrust' // R — ascent thrust force vector (/fly launch only, RFC-034 §11.2)
  | 'drag' // R — ascent drag force vector (/fly launch only, RFC-034 §11.2)
  | 'ascent-losses' // R — ascent Δv-loss ledger panel (/fly launch only, RFC-034 §11.2)
  | 'soi' // C — sphere-of-influence rings
  | 'hover' // D — hover info cards
  | 'centripetal' // E — centripetal acceleration arrows
  | 'apsides' // G — perihelion/aphelion + true anomaly callouts
  | 'coast' // H — engine-off coast preview (/fly only)
  | 'conics' // I — conic-section family side panel (/fly only)
  | 'microgravity' // F — microgravity 3D axes (/iss + /tiangong only)
  | 'atmosphere' // J.3 — atmosphere altitude shells (terrestrial bodies)
  | 'tidal-lock' // J.4 — tidal-locking indicator (/moon only)
  | 'ozone' // J.5 — ozone hole indicator (/earth only)
  | 'galaxies' // K — Local Group galaxy billboards (/explore only, GH #86)
  | 'hill-sphere' // L1 — gravity-dominance boundary (/explore only, PRD-023 Slice B)
  | 'lagrange-points' // L2 — L1/L2 markers around each planet (PRD-023 Slice B)
  | 'magnetosphere' // L3 — stylised magnetic-field shell + magnetic axis (PRD-023 Slice D/E.3b)
  | 'sub-solar' // L4 — noon-longitude marker + terminator emphasis (PRD-023 Slice D)
  | 'planet-stats' // L5 — tactical scan overlay (GRAVITY / ATMO / ROTATION) at planet focus (PRD-023 Slice E.4)
  | 'moons' // L6 — major moons + orbit rings around each planet (/fly + /explore)
  | 'axial-tilt' // M1 — spin axis + obliquity arc + ecliptic plane (terrestrial surface scenes)
  | 'mag-north' // M2 — geographic vs magnetic north pole markers (/earth)
  | 'tides' // M3 — Earth–Moon tidal bulges aligned to the Moon (/earth)
  | 'hydrosphere' // M4 — ocean-sheen shell + "71% water" stat (/earth)
  | 'sub-earth' // N1 — sub-Earth point + libration envelope (/moon)
  | 'far-side' // N2 — far-side hemisphere tint (/moon)
  | 'dead-dynamo' // O1 — Mars crustal-magnetism patches (dead global field)
  | 'polar-caps' // O2 — Mars seasonal CO₂/H₂O ice caps
  | 'mars-moons' // O3 — Phobos + Deimos orbit rings + markers (/mars)
  | 'climate' // P1 — climate bands + insolation ("Sun is life", #386, surface scenes)
  // WS-3 (RFC-039 Contract D) — /explore teaching layers, unified into the lens.
  | 'constellations' // Q1 — constellation figures over the stellar neighbourhood
  | 'deep-sky' // Q2 — deep-sky objects (nebulae, clusters, galaxies) in the neighbourhood
  | 'hr-diagram' // Q3 — Hertzsprung–Russell diagram of the nearby stars
  | 'light-cones' // Q4 — causal light-cones / look-back shells around the Sun
  | 'rotation-curve' // Q5 — Milky Way rotation curve overlay
  | 'dark-matter-halo' // Q6 — Milky Way dark-matter halo overlay
  | 'stellar-populations'; // Q7 — Milky Way stellar-population (disc/halo/bulge) overlay

/** All layers in canonical display order — used by the UI panel. */
export const LAYER_ORDER: readonly LayerKey[] = [
  'soi',
  'hover',
  'gravity',
  'velocity',
  'thrust',
  'drag',
  'ascent-losses',
  'centripetal',
  'apsides',
  'coast',
  'conics',
  'microgravity',
  'atmosphere',
  'tidal-lock',
  'ozone',
  'galaxies',
  'hill-sphere',
  'lagrange-points',
  'magnetosphere',
  'sub-solar',
  'climate',
  'planet-stats',
  'moons',
  'axial-tilt',
  'mag-north',
  'tides',
  'hydrosphere',
  'sub-earth',
  'far-side',
  'dead-dynamo',
  'polar-caps',
  'mars-moons',
  // WS-3 — /explore teaching layers (neighbourhood then Milky Way).
  'constellations',
  'deep-sky',
  'hr-diagram',
  'light-cones',
  'rotation-curve',
  'dark-matter-halo',
  'stellar-populations',
];

/** Default visibility when the lens first activates. Sensible "starter
 * set" so first-time users see something interesting without being
 * overwhelmed; advanced layers stay opt-in. */
export const LAYER_DEFAULTS: Record<LayerKey, boolean> = {
  soi: true,
  hover: true,
  gravity: true,
  velocity: false,
  thrust: false,
  drag: false,
  'ascent-losses': false,
  centripetal: false,
  apsides: false,
  coast: false,
  conics: false,
  microgravity: true,
  atmosphere: true,
  'tidal-lock': true,
  ozone: false,
  galaxies: false,
  'hill-sphere': false,
  'lagrange-points': false,
  magnetosphere: false,
  'sub-solar': false,
  climate: false,
  'planet-stats': false,
  moons: false,
  'axial-tilt': false,
  'mag-north': false,
  tides: false,
  hydrosphere: false,
  'sub-earth': false,
  'far-side': false,
  'dead-dynamo': false,
  'polar-caps': false,
  'mars-moons': false,
  // WS-3 — neighbourhood scenery reads on lens-on; the heavier overlays stay opt-in.
  constellations: true,
  'deep-sky': true,
  'hr-diagram': false,
  'light-cones': false,
  'rotation-curve': false,
  'dark-matter-halo': false,
  'stellar-populations': false,
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
