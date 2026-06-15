/**
 * Umami analytics — production-only loader + thin event API.
 *
 * The Umami `script.js` is intentionally NOT in `src/app.html` because
 * that loads it on every host (localhost, vite preview, CI smoke
 * tests, GitHub Pages). We only want production traffic from
 * `chipi.github.io` counted; local dev + preview should be silent.
 *
 * Privacy stance: Umami is cookieless, PII-free, GDPR-friendly. Even
 * so, we restrict loading to the public host so the analytics dataset
 * is "real visitors" and not "engineer reloads".
 *
 * Event API: pass-through to `window.umami.track(name, props?)`.
 * Safe to call before the script loads (Umami queues internally) and
 * safe to call outside production (no-op).
 *
 * Event schema (#342 Phase 14 — was a 7-item suggestion list, expanded
 * to track tour-fire, interaction, and nav-flow telemetry across the
 * full app):
 *
 *  TOUR
 *   - `audio-stage-fire`   { episode, action, at_sec, target_prefix? }
 *                          fires once per stage from AudioOverlay's
 *                          executor. `target_prefix` is the bare hook
 *                          name without the [data-audio-stage="…"]
 *                          wrapper (so dashboards group cleanly).
 *
 *  NAV-FLOW (root +layout's afterNavigate)
 *   - `route-enter`        { route, from_route? }
 *                          fires whenever the SvelteKit pathname
 *                          changes. `from_route` is the previous one.
 *   - `route-exit`         { route, dwell_ms }
 *                          fires on the NEXT route-enter using a
 *                          captured timestamp from the prior enter.
 *
 *  ITEM-CLICK (per-route entry points)
 *   - `item-click`         { kind, id, route }
 *                          kind ∈ planet | mission | fleet | marker |
 *                          module | section | tab | card.
 *
 *  GALLERY (PRD-007 / pickHero)
 *   - `gallery-image-load` { entity, entity_kind, image_index,
 *                            total_images, layer? }
 *                          fires when an image becomes visible in a
 *                          gallery (cycler index advances, lightbox
 *                          open, or initial mount).
 *
 *  SCIENCE
 *   - `science-section-view`   { tab, section }
 *   - `science-lens-toggle`    { on }
 *   - `science-layer-toggle`   { layer, on }
 *   - `cmdk-search`            { query }
 *
 *  /fly
 *   - `mission-load`        { id, dest, view }
 *
 *  PANELS
 *   - `panel-tab-open`      { entity, tab }
 *
 *  LOCALE
 *   - `locale-switch`       { from, to }
 *
 * Use the typed helpers below where possible — they normalise prop
 * names and prevent dashboard schema drift. Raw `track()` is for
 * one-off events that don't fit the schema yet.
 */

const UMAMI_SCRIPT_URL = 'https://cloud.umami.is/script.js';
const UMAMI_WEBSITE_ID = 'fb07dfd6-1186-4a09-8e3b-524e6b5ac145';

/** Production URLs where Umami should actually load. Each entry is a
 *  (hostname, pathPrefix) pair. Both must match. Hosts where Orrery is
 *  *not* the only thing served — chipi.github.io hosts the user's
 *  other repos too — are scoped down to the `/orrery` sub-path so we
 *  don't count traffic that doesn't belong to this app. Localhost,
 *  `vite preview`, screenshot pipeline, e2e runs are all silent. */
const PRODUCTION_URLS: ReadonlyArray<{ hostname: string; pathPrefix: string }> = [
  { hostname: 'chipi.github.io', pathPrefix: '/orrery' },
];

function isProductionUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const { hostname, pathname } = window.location;
  return PRODUCTION_URLS.some(
    (entry) => entry.hostname === hostname && pathname.startsWith(entry.pathPrefix),
  );
}

/** Inject the Umami `<script>` exactly once, only on production URLs.
 *  Safe to call multiple times (idempotent). Call from the root
 *  +layout's onMount so it lands AFTER the route mounts but before
 *  most user interactions. */
export function initAnalytics(): void {
  if (!isProductionUrl()) return;
  if (document.querySelector('script[data-umami-installed]')) return;
  const s = document.createElement('script');
  s.defer = true;
  s.src = UMAMI_SCRIPT_URL;
  s.dataset.websiteId = UMAMI_WEBSITE_ID;
  s.setAttribute('data-umami-installed', '1');
  document.head.appendChild(s);
}

type UmamiGlobal = {
  track?: (name: string, props?: Record<string, unknown>) => void;
};

/** Track a custom event. Safe to call before the Umami script loads
 *  (it queues internally), and a no-op on non-production URLs. The
 *  second-line production-URL guard means in-app events never fire if
 *  the user somehow navigates outside /orrery on the same domain. */
export function track(name: string, props?: Record<string, unknown>): void {
  if (!isProductionUrl()) return;
  const u = (window as unknown as { umami?: UmamiGlobal }).umami;
  if (u?.track) {
    u.track(name, props);
  }
}

// ─── Typed helpers (Phase 14 schema). Use these to avoid prop drift ───

export function trackStageFire(
  episode: string,
  action: string,
  at_sec: number,
  target?: string,
): void {
  // Strip the [data-audio-stage="…"] wrapper so dashboards group by
  // hook name. `cue` actions pass null target (their target is body text).
  const target_prefix = target?.match(/data-audio-stage="([^"]+)"/)?.[1] ?? null;
  track('audio-stage-fire', { episode, action, at_sec, target_prefix });
}

let lastRouteEnter: { route: string; t: number } | null = null;
export function trackRouteEnter(route: string): void {
  const now = Date.now();
  if (lastRouteEnter) {
    track('route-exit', { route: lastRouteEnter.route, dwell_ms: now - lastRouteEnter.t });
  }
  track('route-enter', { route, from_route: lastRouteEnter?.route ?? null });
  lastRouteEnter = { route, t: now };
}

export type ClickKind =
  | 'planet'
  | 'mission'
  | 'fleet'
  | 'marker'
  | 'module'
  | 'section'
  | 'tab'
  | 'card';
export function trackItemClick(kind: ClickKind, id: string, route: string): void {
  track('item-click', { kind, id, route });
}

export type GalleryEntityKind = 'mission' | 'fleet' | 'planet' | 'site' | 'episode';
export function trackGalleryImageLoad(
  entity: string,
  entity_kind: GalleryEntityKind,
  image_index: number,
  total_images: number,
  layer?: string,
): void {
  track('gallery-image-load', {
    entity,
    entity_kind,
    image_index,
    total_images,
    layer: layer ?? null,
  });
}

export function trackScienceLensToggle(on: boolean): void {
  track('science-lens-toggle', { on });
}

export function trackScienceLayerToggle(layer: string, on: boolean): void {
  track('science-layer-toggle', { layer, on });
}

export function trackPanelTabOpen(entity: string, tab: string): void {
  track('panel-tab-open', { entity, tab });
}
