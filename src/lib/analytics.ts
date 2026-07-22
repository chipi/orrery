/**
 * Umami analytics — env-gated loader + typed event API.
 *
 * Points at the self-hosted Umami behind `analytics.orrerylearn.com`
 * (browser → Cloudflare, origin-locked, tracking-only edge → homelab
 * Umami — the same secure shape as the GlitchTip telemetry vhost).
 *
 * ── Enablement (mirrors src/lib/observability/sentry.ts, ADR-067) ─────
 * Loading is gated on the two PUBLIC_ env vars being baked at build
 * time, NOT on hostname. So:
 *   • the deploy sets `PUBLIC_UMAMI_HOST` + `PUBLIC_UMAMI_WEBSITE_ID` →
 *     analytics is live on the production build;
 *   • local dev / vite preview / CI / screenshots leave them empty →
 *     silent by construction (`dev` is also hard-blocked);
 *   • forks populate their OWN vars in their CI and get their own
 *     dashboard without editing this file.
 * This replaced an earlier hostname allowlist that was pinned to the old
 * `chipi.github.io/orrery` mirror and therefore never fired on the
 * `orrerylearn.com` production domain.
 *
 * Privacy: Umami is cookieless, PII-free, GDPR-friendly. Free-text the
 * user typed (search queries) is length-capped before it leaves the
 * browser — we record what they search for at a coarse grain, never a
 * verbatim transcript, and never anything tied to an identity.
 *
 * ── Event registry (single source of truth) ──────────────────────────
 * Every event name lives in `EVENT_NAMES`; `track()` only accepts those,
 * so a typo or an ad-hoc name is a compile error (this is what stops the
 * Umami dashboard schema from drifting). Prefer the typed helpers below;
 * raw `track()` is fine for the handful of one-off events.
 *
 *  NAV / FLOW
 *   route-enter        { route, from_route? }
 *   route-exit         { route, dwell_ms }
 *  TOUR
 *   audio-stage-fire   { episode, action, at_sec, target_prefix? }
 *  GENERIC INTERACTION (reused on every route — "same spirit")
 *   item-click         { kind, id, route }   kind ∈ ClickKind
 *   filter-change      { surface, filter, value }
 *   search             { surface, query_len, query }   (query length-capped)
 *   layer-toggle       { surface, layer, on }
 *   gallery-image-open { entity_kind, entity, index? }
 *   panel-tab-open     { panel, tab, route }            (global click listener)
 *   view-toggle        { surface, view }
 *  ENTITY DETAIL VIEWS (popularity)
 *   mission-view       { id, source }
 *   fleet-entry-view   { id, category }
 *   science-section-view { tab, section }
 *  SCIENCE
 *   science-lens-toggle { on, source }
 *   science-chip-click  { chip, tab? }
 *   cmdk-search-hit     { query_len, … }
 *  /fly  (funnel: load → complete; abandon = load w/o complete)
 *   mission-load       { id, dest, view }
 *   mission-play-toggle{ id, playing }
 *   mission-complete   { id, dest }
 *  LOCALE
 *   locale-switch      { from, to }
 *  EXTERNAL
 *   external-link-click{ host, href, from }            (global click listener)
 */

import { env as publicEnv } from '$env/dynamic/public';
import { dev } from '$app/environment';

/** The canonical event vocabulary. `track()` accepts only these. */
export const EVENT_NAMES = [
  'route-enter',
  'route-exit',
  'audio-stage-fire',
  'item-click',
  'filter-change',
  'search',
  'layer-toggle',
  'gallery-image-open',
  'panel-tab-open',
  'view-toggle',
  'mission-view',
  'fleet-entry-view',
  'science-section-view',
  'science-lens-toggle',
  'science-chip-click',
  'cmdk-search-hit',
  'mission-load',
  'mission-play-toggle',
  'mission-complete',
  'locale-switch',
  'external-link-click',
  // PWA freshness observability (2026-06-30). `app-load` stamps every
  // session with the running build version → the live version distribution
  // is visible in the dashboard, so a cohort stuck on an old build (e.g.
  // the iOS-precache-quota freeze) shows up immediately instead of via a
  // user complaint weeks later. `sw-activated` / `sw-install-failed` track
  // whether SW updates are actually landing in the wild.
  'app-load',
  'sw-activated',
  'sw-install-failed',
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

/** Analytics fires only when BOTH env vars are baked (production build) and we
 *  are not in `vite dev`. Fork-silent + local-dev-silent by construction,
 *  mirroring `sentry.ts`. Empty vars → no script injected, every `track()` a
 *  no-op. */
function analyticsEnabled(): boolean {
  return !dev && !!publicEnv.PUBLIC_UMAMI_HOST && !!publicEnv.PUBLIC_UMAMI_WEBSITE_ID;
}

/** Inject the self-hosted Umami `<script>` exactly once, only when enabled.
 *  Idempotent. Call from the root +layout's onMount. */
export function initAnalytics(): void {
  if (dev) return;
  if (typeof document === 'undefined') return;
  const host = publicEnv.PUBLIC_UMAMI_HOST?.replace(/\/$/, '');
  const websiteId = publicEnv.PUBLIC_UMAMI_WEBSITE_ID;
  if (!host || !websiteId) return; // fork-silent + local-dev-silent
  if (document.querySelector('script[data-umami-installed]')) return;
  const s = document.createElement('script');
  s.defer = true;
  s.src = `${host}/script.js`;
  s.dataset.websiteId = websiteId;
  s.setAttribute('data-umami-installed', '1');
  document.head.appendChild(s);
}

type UmamiGlobal = {
  track?: (name: string, props?: Record<string, unknown>) => void;
};

/** Track a custom event. Name is constrained to the registry (typos are
 *  compile errors). Safe before the Umami script loads (it queues), and a
 *  no-op when analytics is disabled. */
export function track(name: EventName, props?: Record<string, unknown>): void {
  if (!analyticsEnabled()) return;
  if (typeof window === 'undefined') return;
  const u = (window as unknown as { umami?: UmamiGlobal }).umami;
  u?.track?.(name, props);
}

// ─── Typed helpers — prefer these over raw track() ───────────────────

export function trackStageFire(
  episode: string,
  action: string,
  at_sec: number,
  target?: string,
): void {
  // Strip the [data-audio-stage="…"] wrapper so dashboards group by hook.
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

/** Generic "user clicked/selected an entity" — reused on every route. */
export type ClickKind =
  | 'planet'
  | 'small-body'
  | 'satellite'
  | 'belt'
  | 'star'
  | 'deep-sky'
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

/** Entity detail-panel opens — the popularity signal for missions. */
export function trackMissionView(id: string, source: string): void {
  track('mission-view', { id, source });
}

export function trackFleetEntryView(id: string, category: string): void {
  track('fleet-entry-view', { id, category });
}

/** Filter chip / dropdown change on a list surface (missions, fleet, …). */
export function trackFilterChange(surface: string, filter: string, value: string): void {
  track('filter-change', { surface, filter, value });
}

/** Free-text list search. Query is length-capped (privacy) — enough to
 *  see WHAT people look for, never a full transcript. */
export function trackSearch(surface: string, query: string): void {
  const q = query.trim();
  if (!q) return;
  track('search', { surface, query_len: q.length, query: q.slice(0, 40) });
}

/** Visibility-layer toggle (explore layers, science layers, …). */
export function trackLayerToggle(surface: string, layer: string, on: boolean): void {
  track('layer-toggle', { surface, layer, on });
}

/** A 2D/3D (or similar) view-mode toggle. */
export function trackViewToggle(surface: string, view: string): void {
  track('view-toggle', { surface, view });
}

/** User opened a gallery image into the lightbox. */
export function trackGalleryImageOpen(entity_kind: string, entity: string, index?: number): void {
  track('gallery-image-open', { entity_kind, entity, index: index ?? null });
}

export function trackScienceLensToggle(on: boolean, source: string): void {
  track('science-lens-toggle', { on, source });
}

/** /fly arrival reached — the completion end of the load→complete funnel. */
export function trackMissionComplete(id: string, dest: string): void {
  track('mission-complete', { id, dest });
}
