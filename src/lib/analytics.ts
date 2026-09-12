/**
 * Umami analytics — env-gated loader + typed event API.
 *
 * Points at the self-hosted Umami behind `analytics.orrerylearn.com`
 * (browser → Cloudflare, origin-locked, tracking-only edge → homelab
 * Umami — the same secure shape as the GlitchTip telemetry vhost).
 *
 * ── Enablement: the env ladder (mirrors sentry.ts; ADR-082) ──────────
 * Gated on host + website id resolving for the current rung, NOT on
 * hostname. Three rungs, each its own isolated Umami site:
 *   • deploy (staging/prod) bakes `PUBLIC_UMAMI_HOST` +
 *     `PUBLIC_UMAMI_WEBSITE_ID` → analytics live, tagged by environment;
 *   • `vite dev` with no override falls back to the DEV_UMAMI_* defaults
 *     below — the dev site, reachable ONLY over the Tailscale `homelab`
 *     host (no fixed IP), so a fork's `vite dev` transport-fails silently;
 *   • vite preview / CI / screenshots are not `dev` and carry no baked
 *     vars → neither resolves → no script injected, every `track()` a
 *     no-op;
 *   • forks populate their OWN deploy vars and get their own dashboard
 *     without editing this file.
 * Fork-silence is by construction (empty deploy vars + a tailnet-only dev
 * host), NOT a `dev` hard-block — `vite dev` on the maintainer's tailnet
 * DOES report. This replaced an earlier hostname allowlist pinned to the
 * old `chipi.github.io/orrery` mirror that never fired on `orrerylearn.com`.
 *
 * Privacy: Umami is cookieless, PII-free, GDPR-friendly. Free-text the
 * user typed (search queries) is length-capped before it leaves the
 * browser — we record what they search for at a coarse grain, never a
 * verbatim transcript, and never anything tied to an identity. EVERY
 * free-text path goes through `trackSearch` / `trackSearchHit`; do not
 * call `track()` with a raw query (2026-09-10: `cmdk-search-hit` was
 * doing exactly that and shipped the untruncated string).
 *
 * Opt-out (ADR-092): `analyticsSuppressed()` — the `orrery_analytics_optout`
 * cookie, GPC, or DNT — hard-gates BOTH the script injection and every
 * `track()`. See `analytics-optout.ts`. No consent banner is required
 * (cookieless, self-hosted, no third-party sharing); the opt-out is what
 * makes that posture defensible rather than merely asserted.
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
 *   science-section-view { tab, section, source }  (source = route came FROM)
 *  SCIENCE
 *   science-lens-toggle { on, source }
 *   science-chip-click  { chip, tab? }
 *   cmdk-search-hit     { query_len, query, tab, section }  (query length-capped)
 *  /fly  (funnel: load → complete; abandon = load w/o complete)
 *   mission-load       { id, dest, view }
 *   mission-play-toggle{ id, playing }
 *   mission-complete   { id, dest }
 *  LOCALE
 *   locale-switch      { from, to }
 *  EXTERNAL
 *   external-link-click{ host, href, from }            (global click listener)
 *  JOURNEY — milestone events, deduped per page-load (2026-09-10)
 *   explore-depth      { level }                       scale shell reached
 *   plan-run           { destination, mission_type, trigger }
 *                      trigger ∈ initial | destination-change
 *   plan-window-select { destination, dep_year }       deliberate picks only
 *   fly-ascent | fly-coast | fly-cruise | fly-descent | fly-recovery
 *                      { mission, dest }               first reach of an act
 *                      (one name per act — Umami funnel steps match on NAME)
 *   science-to-app     { topic, destination, from_route }
 *   tour-complete      { tour }                        natural end, not stop
 */

import { env as publicEnv } from '$env/dynamic/public';
import { dev } from '$app/environment';
import { MOBILE_INTERNAL, targetConfig } from './target-env';
import { analyticsSuppressed } from './analytics-optout';

// Dev rung of the env ladder (mirrors sentry.ts). In `vite dev`, with no deploy-injected
// PUBLIC_UMAMI_* override, analytics go to the dedicated dev Umami site via the Tailscale
// host `homelab` — NO fixed IP, so only the operator's tailnet machine reaches it; a
// stranger who runs the repo silently sends nothing. Staging/prod override via env.
const DEV_UMAMI_HOST = 'http://homelab:3001';
const DEV_UMAMI_WEBSITE_ID = '1d2f214c-801c-45e4-b56b-446a333e88b2';

/** The self-hosted Umami host for the current rung: on an INTERNAL mobile build
 *  (ADR-083) the runtime target's host; else an env override (staging/prod) or, in
 *  `vite dev`, the dev default. Empty otherwise (fork / non-dev build) → silent. */
function umamiHost(): string {
  if (MOBILE_INTERNAL) return targetConfig().umamiHost.replace(/\/$/, '');
  return (publicEnv.PUBLIC_UMAMI_HOST || (dev ? DEV_UMAMI_HOST : '')).replace(/\/$/, '');
}
function umamiWebsiteId(): string {
  if (MOBILE_INTERNAL) return targetConfig().umamiWebsiteId;
  return publicEnv.PUBLIC_UMAMI_WEBSITE_ID || (dev ? DEV_UMAMI_WEBSITE_ID : '');
}

/** The canonical event vocabulary. `track()` accepts only these. */
export const EVENT_NAMES = [
  'route-enter',
  'card-open',
  'card-share',
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
  // ── Journey instrumentation (2026-09-10). The registry above answers
  // "what is popular"; these answer "did the visitor get anywhere". Each one
  // exists because a specific question was unanswerable without it:
  //   explore-depth      — do visitors leave the opening view at all?
  //   plan-run           — is the planner USED, or only opened? (/plan fired
  //                        nothing but two filter-change events before this)
  //   plan-window-select — after computing, do they engage a solution?
  //   fly-<act>          — where do visitors stop? (/fly had a start and an
  //                        end with nothing in between)
  //   science-to-app     — does learning send them back into a tool?
  //   tour-complete      — does guided onboarding finish?
  // Every one is milestone-deduped: they fire on first reach, never per frame,
  // per tick, or per re-render.
  'explore-depth',
  'plan-run',
  'plan-window-select',
  // One event name PER ACT, not one `fly-phase` event with a `phase` property.
  // Umami's Funnel / Journey / Goal steps match on an event NAME or a URL —
  // there is no property condition in the step form (docs.umami.is/docs/funnel).
  // A single `fly-phase` event would therefore collapse to one indistinguishable
  // funnel step. `mission` + `dest` stay as properties because nothing needs to
  // funnel on them. This is the one place the "stable vocabulary + properties"
  // rule is deliberately inverted, and the reason is Umami's step matcher.
  'fly-ascent',
  'fly-coast',
  'fly-cruise',
  'fly-descent',
  'fly-recovery',
  'science-to-app',
  'tour-complete',
  // Measurement blind spots closed (#521):
  //   science-read-depth — do visitors READ science articles (the #2 acquisition
  //                        vector) or bounce? Fires at 25/50/75/100% scroll,
  //                        once per threshold per article. `pct` property.
  //   search-open        — distinguishes "nobody opens search" from "opens but
  //                        doesn't type" (0 search events in the launch window).
  //   pwa-install-available / pwa-installed — installability + installs, and
  //                        `app-load` now carries `display_mode` so engagement
  //                        can be split by installed-PWA vs browser.
  'science-read-depth',
  'search-open',
  'pwa-install-available',
  'pwa-installed',
  // Language-suggestion banner (#519). Shown when a visitor's browser-preferred
  // language differs from the page's locale and we support it; `accepted ÷ shown`
  // is the take rate. Suggest-only (never auto-redirect — Google penalizes it).
  'locale-suggest-shown',
  'locale-suggest-accepted',
  // Data-layer observability (#517). The per-locale i18n overlay bundle
  // (~1.75 MB) occasionally fails to load client-side; the loader retries
  // transient failures and, when they survive, emits this ONCE per locale so
  // the real failure rate is measurable instead of only inferable from nginx
  // per-file 404 bursts. `status` = the HTTP status (or null for a network error).
  'i18n-bundle-load-failed',
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

/** Analytics fires when a host + website id resolve for the current rung — a deploy env
 *  override (staging/prod) or the `vite dev` default — AND the user has not opted out
 *  (cookie) and their browser is not signalling GPC/DNT. Fork-silent by construction: a
 *  non-dev build with no env vars resolves neither, so no script is injected and every
 *  `track()` is a no-op. Mirrors `sentry.ts`. */
function analyticsEnabled(): boolean {
  if (analyticsSuppressed()) return false;
  return !!umamiHost() && !!umamiWebsiteId();
}

/** Inject the self-hosted Umami `<script>` exactly once, only when enabled.
 *  Idempotent. Call from the root +layout's onMount.
 *
 *  An opted-out user (or a GPC/DNT browser) never gets the script at all — that
 *  matters because Umami's autotrack binds its own history listeners at load
 *  and cannot be unbound afterwards, so suppression has to happen BEFORE
 *  injection to stop pageview collection, not just our custom events. */
export function initAnalytics(): void {
  if (typeof document === 'undefined') return;
  if (analyticsSuppressed()) return; // ADR-092 — opt-out cookie / GPC / DNT
  const host = umamiHost();
  const websiteId = umamiWebsiteId();
  if (!host || !websiteId) return; // fork-silent (non-dev build, no env) by construction
  if (document.querySelector('script[data-umami-installed]')) return;
  const s = document.createElement('script');
  s.defer = true;
  s.src = `${host}/script.js`;
  s.dataset.websiteId = websiteId;
  s.setAttribute('data-umami-installed', '1');
  // Flush anything tracked between this call and the deferred script actually
  // executing. See `pendingEvents` — without this, every event fired in the
  // same tick as init is silently lost.
  s.addEventListener('load', flushPendingEvents, { once: true });
  document.head.appendChild(s);
}

type UmamiGlobal = {
  track?: (name: string, props?: Record<string, unknown>) => void;
};

/**
 * Events fired before the deferred Umami script has executed.
 *
 * THE BUG THIS FIXES (found 2026-09-10 in the live prod data): `app-load` had
 * fired **0 times** against 731 `route-enter`s. `+layout.svelte` calls
 * `initAnalytics()` and then `track('app-load', …)` on the next line — but
 * `initAnalytics` appends a `<script defer>`, which by definition has NOT run
 * yet, so `window.umami` was `undefined` and the call evaporated. This module
 * previously claimed "safe before the script loads (it queues)"; that was
 * wrong — Umami's queue only exists once its own script defines the global.
 * Anything fired in the same tick as init was lost, which is exactly where
 * app-open and first-paint milestones live.
 *
 * Bounded: a visitor who never loads the script (offline, blocked, opted out
 * mid-flight) accumulates at most CAP entries and then drops the oldest.
 */
const PENDING_CAP = 50;
let pendingEvents: Array<{ name: EventName; props?: Record<string, unknown> }> = [];

function umamiGlobal(): UmamiGlobal | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { umami?: UmamiGlobal }).umami;
}

/** Drain the pre-load buffer into Umami, in the order the events happened. */
function flushPendingEvents(): void {
  const u = umamiGlobal();
  if (!u?.track) return;
  const queued = pendingEvents;
  pendingEvents = [];
  for (const e of queued) u.track(e.name, e.props);
}

/** Buffer size — test seam. */
export function __pendingEventCountForTest(): number {
  return pendingEvents.length;
}

/** Track a custom event. Name is constrained to the registry (typos are
 *  compile errors). Genuinely safe before the Umami script loads — the event is
 *  buffered and flushed on script load (see `pendingEvents`) — and a no-op when
 *  analytics is disabled or the visitor has opted out. */
export function track(name: EventName, props?: Record<string, unknown>): void {
  if (!analyticsEnabled()) return;
  if (typeof window === 'undefined') return;
  const u = umamiGlobal();
  if (u?.track) {
    u.track(name, props);
    return;
  }
  // Script not executed yet — hold it rather than drop it. At the cap we drop
  // the NEWEST rather than shift() out the oldest: the events worth keeping are
  // the earliest ones (app-load and the first route-enter are the whole reason
  // this buffer exists), and a page that has queued 50 events without the
  // tracker ever loading is one where the tail is noise.
  if (pendingEvents.length >= PENDING_CAP) return;
  pendingEvents.push({ name, props });
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
/** The route the visitor came FROM, kept after `lastRouteEnter` advances. This is
 *  the provenance every "did X lead to Y" question needs, and it costs nothing —
 *  the value already flows through `route-enter`'s `from_route`. */
let previousRoute: string | null = null;
export function trackRouteEnter(route: string): void {
  const now = Date.now();
  if (lastRouteEnter) {
    track('route-exit', { route: lastRouteEnter.route, dwell_ms: now - lastRouteEnter.t });
    previousRoute = lastRouteEnter.route;
  }
  track('route-enter', { route, from_route: previousRoute });
  lastRouteEnter = { route, t: now };
}

/** Where the visitor arrived from, for `source`-style properties, read from a
 *  context that runs AFTER the destination's `afterNavigate` — e.g. a click
 *  handler. Null on a cold entry (direct link / search), which is itself the
 *  useful signal.
 *
 *  Do NOT call this from a page component's `onMount`: SvelteKit registers
 *  `afterNavigate` via its own `onMount` and invokes it only after the root
 *  `$set` and two `tick()`s, so a page's `onMount` runs BEFORE the
 *  `trackRouteEnter` for that same page. At that moment `previousRoute` still
 *  holds the route before the one being left — off by one. Use
 *  `arrivedFromRoute()` instead, which is correct in that window. */
export function sourceRoute(): string | null {
  return previousRoute;
}

/** The route the visitor came from, correct when read during a page's own
 *  `onMount` — i.e. before that page's `trackRouteEnter` has advanced the
 *  pointers. `lastRouteEnter` is still the PREVIOUS page at that instant,
 *  which is exactly the provenance a mount-time view event wants. Null on a
 *  cold entry. */
export function arrivedFromRoute(): string | null {
  return lastRouteEnter?.route ?? null;
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

/** Command-palette search that landed on a hit. Same length cap as
 *  `trackSearch` — this event previously shipped the untruncated query
 *  string, which contradicted both this module's contract and the promise
 *  made to users on /credits (fixed 2026-09-10, ADR-092). */
export function trackSearchHit(query: string, tab: string, section: string): void {
  const q = query.trim();
  track('cmdk-search-hit', {
    query_len: q.length,
    query: q.slice(0, 40).toLowerCase(),
    tab,
    section,
  });
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

// ─── Journey helpers ─────────────────────────────────────────────────
//
// All six are MILESTONE events: they fire the first time a visitor reaches
// something, never on the repeat. The dedup keys live in module-level Sets —
// deliberately not in a cookie or storage (ADR-057 bans client storage, and
// ADR-092 already spent the third cookie). Module scope survives SPA
// navigation and dies on reload, which is the right lifetime: a genuine
// return visit should count again.

const firedMilestones = new Set<string>();
/** Fire `emit` once per key for the life of this page-load. Exported so other
 *  milestone emitters (e.g. #521 science read-depth in the article route) share
 *  the same page-load-scoped dedup instead of a private per-component Set. */
export function once(key: string, emit: () => void): void {
  if (firedMilestones.has(key)) return;
  firedMilestones.add(key);
  emit();
}

/** Reset all module-level analytics state (milestone dedup + route provenance)
 *  — test-only seam. Both are per-page-load state in production, so a test that
 *  wants a cold-entry visitor has to clear them explicitly. */
export function __resetAnalyticsStateForTest(): void {
  firedMilestones.clear();
  lastRouteEnter = null;
  previousRoute = null;
  pendingEvents = [];
}

/** A scale shell was reached on /explore. `level` is the product's own context
 *  id (`solar-system` … `cosmic-web`), so the vocabulary can't drift from the
 *  scene. Answers: do visitors leave the opening view at all, and how far out? */
export function trackExploreDepth(level: string): void {
  if (!level || level === 'body-scene') return; // off-ladder, not a depth
  // `solar-system` is the OPENING view — `contextId` initialises to it and the
  // effect runs on mount, so emitting it would fire for every single /explore
  // visitor and make "did they explore beyond the initial view" tautologically
  // 100%. Depth means leaving the entry shell; the denominator for any rate is
  // the /explore pageview, not this event.
  if (level === EXPLORE_ENTRY_LEVEL) return;
  once(`explore-depth:${level}`, () => track('explore-depth', { level }));
}

/** The shell /explore opens in. Not a depth signal — see `trackExploreDepth`. */
const EXPLORE_ENTRY_LEVEL = 'solar-system';

/** A porkchop grid was actually computed/loaded for a destination — the
 *  difference between opening /plan and using it. `trigger` separates the
 *  initial default from a deliberate change, so both "% who engaged" and
 *  "% who explored a second destination" are derivable. */
export function trackPlanRun(
  destination: string,
  missionType: string,
  trigger: 'initial' | 'destination-change',
): void {
  once(`plan-run:${destination}:${missionType}:${trigger}`, () =>
    track('plan-run', { destination, mission_type: missionType, trigger }),
  );
}

/** The visitor selected a launch window from the porkchop — engagement with a
 *  computed solution, not just its existence. Deliberate user picks only; the
 *  auto-selected "cheapest viable" default and deep-link restores do NOT fire. */
export function trackPlanWindowSelect(destination: string, depYear: number | null): void {
  track('plan-window-select', { destination, dep_year: depYear });
}

/** The app's `flyAct` states → their Umami event names. Keyed by the act the
 *  state machine actually reports, so an act that gains a name in the app can
 *  only reach analytics by being added here deliberately. */
const FLY_ACT_EVENT: Record<string, EventName | undefined> = {
  ascent: 'fly-ascent',
  coast: 'fly-coast',
  cruise: 'fly-cruise',
  descent: 'fly-descent',
  recovery: 'fly-recovery',
};

/** A /fly act was first reached for this mission. Deduped per mission+act, so
 *  scrubbing back and forth doesn't inflate the funnel. Emits ONE EVENT NAME PER
 *  ACT (`fly-cruise`, …) rather than a `phase` property, because Umami funnel
 *  steps match on event name — see the registry comment. Act names are the
 *  app's real ones; no invented analytics stages. */
export function trackFlyPhase(mission: string, dest: string, phase: string): void {
  const name = FLY_ACT_EVENT[phase];
  if (!name) return; // 'opening' and any future non-act state are not funnel steps
  once(`${name}:${mission}`, () => track(name, { mission, dest }));
}

/** The visitor left science content for an interactive tool — the learning →
 *  experimentation half of the loop. */
export function trackScienceToApp(topic: string, destination: string): void {
  track('science-to-app', { topic, destination, from_route: sourceRoute() });
}

/** A guided tour ran to its natural end. */
export function trackTourComplete(tour: string): void {
  once(`tour-complete:${tour}`, () => track('tour-complete', { tour }));
}

/** /fly arrival reached — the completion end of the load→complete funnel. */
export function trackMissionComplete(id: string, dest: string): void {
  track('mission-complete', { id, dest });
}
