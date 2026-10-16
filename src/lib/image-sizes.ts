/**
 * `sizes` hints for `responsive()` (#482), one per layout slot. Each must match the
 * slot's real CSS width at every breakpoint, or the browser picks the wrong rung.
 * Lazy images lead with `auto` (Chromium uses the laid-out width); the rest is the
 * fallback for engines without it, and for eager images (where `auto` is ignored).
 */
export const IMAGE_SIZES = {
  /** .entity-card-grid card cover: 150px-min columns ≤600px, 260px-min above
   *  (src/lib/styles/entity-card-grid.css). Measured 172-264 CSS px, 375 on tablet. */
  card: 'auto, (max-width: 840px) 50vw, 340px',
  /** 300px-min card grids (/programs, /essays): one column on phones. */
  wideCard: 'auto, (max-width: 700px) 100vw, 420px',
  /** Side panel hero: full width on phones, --panel-width (400px) on desktop. */
  panel: '(max-width: 768px) 100vw, 400px',
  /** Panel gallery-tab grid thumbnails (2-3 columns inside the panel). */
  panelThumb: 'auto, (max-width: 768px) 50vw, 200px',
  /** Full-screen lightbox / page-wide hero banners. */
  full: '100vw',
  /** Content column images (essays, program detail): ~720px reading column. */
  column: '(max-width: 760px) 100vw, 720px',
  /** Floated left/right figure in a reading column: 42% of ~720px, full width ≤640px. */
  floatFig: '(max-width: 640px) 100vw, 320px',
  /** /science hero banner: max-height 260px → ~466px wide on desktop. */
  banner: '(max-width: 520px) 100vw, 480px',
  /** /colophon thumbnail grid (150px-min columns). */
  colophonThumb: 'auto, (max-width: 560px) 50vw, 260px',
  /** /colophon wide thumbnail grid (230px-min columns). */
  colophonWide: 'auto, (max-width: 560px) 100vw, 360px',
  /** /credits row thumbnail: 64px, 96px from 768px. */
  creditThumb: 'auto, (min-width: 768px) 96px, 64px',
} as const;
