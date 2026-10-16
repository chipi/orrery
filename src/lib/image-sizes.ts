/**
 * `sizes` hints for <ResponsiveImage> (#482), one per layout slot. Each must match
 * the slot's real CSS width at every breakpoint, or the browser picks the wrong rung.
 * Lazy images lead with `auto` (Chromium uses the laid-out width); the rest is the
 * fallback for engines without it.
 */
export const IMAGE_SIZES = {
  /** .entity-card-grid card cover: 150px-min columns ≤600px, 260px-min above
   *  (src/lib/styles/entity-card-grid.css). Measured 172-264 CSS px, 375 on tablet. */
  card: 'auto, (max-width: 840px) 50vw, 340px',
} as const;
