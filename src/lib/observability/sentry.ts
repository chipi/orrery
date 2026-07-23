/**
 * Sentry client-side init for Orrery (RFC-025 / ADR-067).
 *
 * Errors only — no performance tracing, no Web Vitals, no session
 * replay. PII scrubbed before each event leaves the browser:
 *   • URL query params + hash stripped (path only)
 *   • request.headers + request.cookies nulled
 *   • user.ip_address forced to '0.0.0.0' (Sentry's discard sentinel)
 *   • ui.input breadcrumbs dropped entirely
 *
 * Fork-silent default: if `PUBLIC_SENTRY_DSN` is empty, this function
 * returns immediately. No SDK init, no global handlers attached, no
 * outbound network traffic. Same posture as `src/lib/analytics.ts`
 * (Umami) — telemetry is opt-in by env var, never on by default.
 *
 * Web uses `@sentry/sveltekit`; the Capacitor iOS/Android/TV shells use
 * `@sentry/capacitor` (native crash handlers + the `@sentry/svelte` JS sibling)
 * so native + JS crashes land in the same GlitchTip project, split by a
 * `platform` tag + `mobile-<platform>` environment (#428). The whole `@sentry/*`
 * stack is pinned to 10.60.0 — the version @sentry/capacitor@4 requires.
 *
 * Privacy stance documented in README.md §Privacy.
 */
import * as Sentry from '@sentry/sveltekit';
import * as SentryCapacitor from '@sentry/capacitor';
import { init as sentrySvelteInit } from '@sentry/svelte';
import { Capacitor } from '@capacitor/core';
import { env as publicEnv } from '$env/dynamic/public';
import { dev } from '$app/environment';

/**
 * Initialise Sentry. No-op when DSN is empty or in `vite dev`.
 *
 * Safe to call at module-eval time of `src/hooks.client.ts` — Sentry's
 * `init()` is idempotent and the early-return paths fire before any
 * SDK side effects.
 */
export function initSentry(): void {
  const dsn = publicEnv.PUBLIC_SENTRY_DSN;
  if (!dsn) return; // Fork-silent + local-dev-silent default.
  if (dev) return; // Vite dev never reports.

  // The same web bundle runs on the web AND inside the Capacitor iOS/Android/TV
  // shells (WKWebView/WebView). Native shells report under `mobile-<platform>`
  // and every event carries a `platform` tag, so a shell-only regression stays
  // separable from web in GlitchTip. Capacitor.getPlatform() returns 'web'
  // off-device — the web takes the plain @sentry/sveltekit path below.
  const platform = Capacitor.getPlatform(); // 'web' | 'ios' | 'android'
  const isNative = platform !== 'web';

  const options = {
    dsn,
    environment: isNative ? `mobile-${platform}` : publicEnv.PUBLIC_SENTRY_ENVIRONMENT || 'prod',
    release: publicEnv.PUBLIC_SENTRY_RELEASE || undefined,

    // Tag every event `component: orrery` (+ `platform`) so streams stay
    // separable in the self-hosted GlitchTip we share with the podcast app
    // (orrery = GlitchTip project 2; the ingest-only public vhost lands events
    // there — see podcast_scraper-infra ORRERY-GLITCHTIP-CLIENT-ERRORS-BRIEF).
    initialScope: { tags: { component: 'orrery', platform } },

    // Errors only — explicitly NO performance tracing, NO Web Vitals.
    tracesSampleRate: 0,

    // sendDefaultPii: false means the SDK refuses to attach the IP,
    // session cookies, or user identifiers it can infer. beforeSend
    // below is the belt to that suspenders — some headers slip
    // through default PII heuristics depending on transport context.
    sendDefaultPii: false,

    // Empty integrations array would disable the SDK's defaults; we
    // explicitly want the default `globalHandlers` (catches window.onerror
    // + unhandledrejection) and `breadcrumbs` (UI + navigation history,
    // scrubbed below). Leaving `integrations` unset lets the SDK pick
    // its sensible defaults.

    beforeSend(event: Sentry.ErrorEvent) {
      // 1. URL — preserve path, strip query + hash.
      if (event.request?.url) {
        try {
          const u = new URL(event.request.url);
          event.request.url = u.origin + u.pathname;
        } catch {
          // Malformed URL; leave the original — Sentry will still
          // accept the event, and it's already unusable as PII.
        }
      }
      // 2. Headers + cookies — null. SDK occasionally attaches
      // Referer + Set-Cookie traces even with sendDefaultPii: false.
      if (event.request) {
        event.request = { ...event.request, headers: undefined, cookies: undefined };
      }
      // 3. IP — 0.0.0.0 tells Sentry's server side to discard it
      // (per Sentry's PII-discard rules in the project's data scrubbing
      // configuration).
      event.user = { ...event.user, ip_address: '0.0.0.0' };
      return event;
    },

    beforeBreadcrumb(crumb: Sentry.Breadcrumb) {
      // ui.input crumbs carry the typed value — drop entirely.
      if (crumb.category === 'ui.input') return null;
      // Navigation crumbs carry full URLs; strip query.
      if (crumb.category === 'navigation' && typeof crumb.data?.to === 'string') {
        const to = crumb.data.to;
        try {
          const u = new URL(to, location.origin);
          crumb.data = { ...crumb.data, to: u.pathname };
        } catch {
          // Leave as-is if not a parseable URL.
        }
      }
      return crumb;
    },
  };

  if (isNative) {
    // Capacitor shells: @sentry/capacitor initialises the NATIVE crash handlers
    // (sentry-cocoa / sentry-android) — Swift/Kotlin/plugin/startup/webview-
    // process crashes — AND the JS layer via the @sentry/svelte sibling init,
    // so native + JS land in the same GlitchTip project (correlation) with the
    // `platform` tag. Native stack frames are unsymbolicated in GlitchTip 6.2.2
    // (#428); App Store Connect / Play Console hold the symbolicated detail.
    SentryCapacitor.init(options, sentrySvelteInit);
  } else {
    Sentry.init(options); // web — @sentry/sveltekit
  }
}
