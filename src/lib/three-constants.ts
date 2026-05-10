/**
 * Shared Three.js scene constants used across /iss + /tiangong + /mars
 * (and any future 3D route that wants the same look).
 *
 * Extracted in v0.5.x deep-review cleanup so the same hover-outline tuning
 * doesn't drift between routes silently. If you tune one of these, tune
 * all callers — they're meant to read as a unified visual language.
 *
 * Counterpart: `src/lib/orbit-overlays.ts` covers the lens-layer overlay
 * helpers (gravity arrows, SoI rings, conic classification, …).
 */

/**
 * EffectComposer + OutlinePass tuning for hover/selection feedback.
 * Used by /iss, /tiangong, /mars hover raycasters.
 *
 * - `edgeStrength` 4: makes the cyan glow visible against dark backdrops
 *   without washing out the underlying mesh. 1–10 range; 4 is the sweet
 *   spot from the v0.4.0 ISS polish pass.
 * - `edgeGlow` 0.4: medium falloff. Higher → softer; lower → razor-sharp.
 * - `edgeThickness` 1.5: 1.5 px outline reads at desktop + mobile zoom
 *   without becoming a "fat halo" effect.
 * - `visibleEdgeColor` (`#4ecdc4`): teal accent (matches design tokens).
 * - `hiddenEdgeColor` (`#224a48`): dimmed teal for parts of the outline
 *   that are occluded by other geometry — keeps the silhouette readable
 *   when the user is looking at the back side of a module.
 */
export const OUTLINE_PASS = {
  edgeStrength: 4,
  edgeGlow: 0.4,
  edgeThickness: 1.5,
  visibleEdgeColor: 0x4ecdc4,
  hiddenEdgeColor: 0x224a48,
} as const;

/**
 * Star-field counts per scene. Tuned per route — denser for /mars
 * (planet-scale view feels emptier without more stars) than for the
 * station explorers (where the station mesh occupies more of the FOV).
 */
export const STAR_FIELD = {
  /** /iss + /tiangong: station fills more of the view → fewer stars look right. */
  station: 1200,
  /** /mars: planet view feels too empty without a denser field. */
  planet: 1500,
} as const;
