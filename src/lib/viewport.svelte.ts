/**
 * Viewport capability model — the single source of truth for "is this a touch
 * device, in what orientation, with how much room" (0.7.2 responsive redesign).
 * Replaces the scattered hardcoded `max-width: 767px` breakpoints.
 *
 * "Mobile" is decided by CAPABILITY (touch vs pointer) + ORIENTATION +
 * short-viewport, NOT width — so a landscape phone (wide but short + touch)
 * keeps the touch UX instead of falling through to the desktop layout.
 *
 * Consumed two ways:
 *   - JS: `import { viewport } from '$lib/viewport.svelte'` → read
 *     `viewport.isTouch` etc. reactively (Svelte 5 rune-store singleton, same
 *     shape as immersive-mode.svelte.ts).
 *   - CSS: `initViewport()` reflects the state onto <html> as data-* attributes
 *     (data-touch / data-orientation / data-short / data-form) so component
 *     styles key off `:global(html[data-touch][data-orientation='landscape'])`.
 *     An inline <head> script in app.html stamps the same attributes pre-paint
 *     (no FOUC); this store keeps them live after hydration.
 *
 * SSR-safe: on the server (no window/matchMedia) the store keeps its defaults
 * (`ready:false`, `form:'desktop'`) and reflects nothing. Mirrors the
 * `reduced-motion.ts` / `high-contrast.ts` guard shape.
 */

export type ViewportForm = 'phone' | 'tablet' | 'desktop';

export type ViewportState = {
  /** false on the server / before the first browser seed. */
  ready: boolean;
  /** coarse pointer OR no hover — the primary "touch device" signal. */
  isTouch: boolean;
  isCoarsePointer: boolean;
  isLandscape: boolean;
  /** short viewport (≤560px tall) — the landscape-phone signal. */
  isShort: boolean;
  /** narrow viewport (≤640px) — horizontal-fit signal (nav). */
  isNarrow: boolean;
  form: ViewportForm;
};

export const viewport = $state<ViewportState>({
  ready: false,
  isTouch: false,
  isCoarsePointer: false,
  isLandscape: false,
  isShort: false,
  isNarrow: false,
  form: 'desktop',
});

// One matchMedia string per signal — the single source of truth. The inline
// <head> script in src/app.html duplicates these query strings; keep in sync.
const Q = {
  coarse: '(pointer: coarse)',
  hoverNone: '(hover: none)',
  landscape: '(orientation: landscape)',
  short: '(max-height: 560px)',
  narrow: '(max-width: 640px)',
  // tablet = the SHORTER side is ≥600px (true in either orientation), which
  // separates tablets (short side ≈768) from phones-in-landscape (≈390).
  tablet: '(min-width: 600px) and (min-height: 600px)',
} as const;

function mm(query: string): boolean {
  return window.matchMedia(query).matches;
}

/** Recompute every derived field from the live media queries. Browser-only. */
function derive(): void {
  const coarse = mm(Q.coarse);
  const isTouch = coarse || mm(Q.hoverNone);
  viewport.isCoarsePointer = coarse;
  viewport.isTouch = isTouch;
  viewport.isLandscape = mm(Q.landscape);
  viewport.isShort = mm(Q.short);
  viewport.isNarrow = mm(Q.narrow);
  viewport.form = !isTouch ? 'desktop' : mm(Q.tablet) ? 'tablet' : 'phone';
  viewport.ready = true;
}

/** Reflect the current state onto <html> as data-* attributes for CSS. Writes
 *  only its own keys — never touches data-high-contrast. Presence semantics
 *  (`html[data-touch]`), matching the `[data-high-contrast='true']` house style. */
function reflect(): void {
  const { dataset } = document.documentElement;
  if (viewport.isTouch) dataset.touch = '';
  else delete dataset.touch;
  dataset.orientation = viewport.isLandscape ? 'landscape' : 'portrait';
  if (viewport.isShort) dataset.short = '';
  else delete dataset.short;
  dataset.form = viewport.form;
}

// Seed synchronously at module load so the store is valid the instant it's
// imported — some consumers read it at child-script init (e.g. fly's hudHidden
// default), which fires before the layout's onMount runs initViewport().
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  derive();
  reflect();
}

/**
 * Start watching the media queries — call ONCE from +layout onMount. Attaches a
 * `change` listener per query that re-derives the store + re-stamps <html>.
 * Returns an unsubscribe. No-op + SSR-safe when matchMedia is unavailable.
 */
export function initViewport(): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const update = () => {
    derive();
    reflect();
  };
  update(); // covers any change between the module-load seed and mount
  const mqls = Object.values(Q).map((q) => window.matchMedia(q));
  for (const mql of mqls) mql.addEventListener('change', update);
  return () => {
    for (const mql of mqls) mql.removeEventListener('change', update);
  };
}
