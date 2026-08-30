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
 * `platform` tag — both ride the same `environment` tier (ADR-082/083), not a
 * separate `mobile-<platform>` environment. The whole `@sentry/*` stack is pinned
 * to 10.60.0 — the version @sentry/capacitor@4 requires.
 *
 * Privacy stance documented in README.md §Privacy.
 */
import * as Sentry from '@sentry/sveltekit';
import * as SentryCapacitor from '@sentry/capacitor';
import { init as sentrySvelteInit } from '@sentry/svelte';
import { Capacitor } from '@capacitor/core';
import { env as publicEnv } from '$env/dynamic/public';
import { dev } from '$app/environment';
import { MOBILE_INTERNAL, targetConfig } from '../target-env';

// Git branch, injected by vite.config's `define`. Tags dev events by worktree.
declare const __DEV_WORKTREE__: string;

// Dev rung of the env ladder (dev → staging → prod). In `vite dev`, with no deploy-injected
// PUBLIC_SENTRY_* override, errors go to the dedicated dev GlitchTip project via the
// Tailscale host `homelab` — NO fixed IP. Only a device ON the tailnet (the operator's
// machine) resolves `homelab`, so a stranger who checks out + runs the repo reports nothing
// (the transport silently fails). Staging/prod builds set PUBLIC_SENTRY_* and override this.
// The DSN key is a public browser id (ships in the bundle) — safe to commit.
const DEV_SENTRY_DSN = 'http://310ad519a9da49b7b9aebc50d7c1399e@homelab:8090/7';

/**
 * Initialise Sentry. No-op when the resolved DSN is empty (fork / non-dev build
 * with no baked env). `vite dev` reports to the dev rung; internal mobile builds
 * to the runtime target's tier (ADR-083).
 *
 * Safe to call at module-eval time of `src/hooks.client.ts` — Sentry's
 * `init()` is idempotent and the early-return paths fire before any
 * SDK side effects.
 */
export function initSentry(): void {
  // ADR-083: an INTERNAL mobile build resolves the DSN + tier from the runtime
  // target (staging/prod). Web + App Store release (`MOBILE_INTERNAL` false)
  // take the env ladder: a deploy-injected DSN (staging/prod) wins; in `vite dev`
  // fall back to the dev DSN; otherwise (non-dev build, no env) stay fork-silent.
  const target = MOBILE_INTERNAL ? targetConfig() : null;
  const dsn = target
    ? target.sentryDsn
    : publicEnv.PUBLIC_SENTRY_DSN || (dev ? DEV_SENTRY_DSN : '');
  if (!dsn) return;

  // The same web bundle runs on the web AND inside the Capacitor iOS/Android/TV
  // shells (WKWebView/WebView). Every event carries a `platform` tag
  // (web/ios/android) — the SEGMENT dimension — so a shell-only regression stays
  // separable from web in GlitchTip while both ride the same environment tier.
  // Capacitor.getPlatform() returns 'web' off-device — web takes the plain
  // @sentry/sveltekit path below; native takes @sentry/capacitor (see end).
  const platform = Capacitor.getPlatform(); // 'web' | 'ios' | 'android'
  const isNative = platform !== 'web';

  const options = {
    dsn,
    // Environment = the TIER (dev/staging/prod), uniform for web AND native (ADR-082
    // amendment): deploy-injected PUBLIC_SENTRY_ENVIRONMENT wins, `vite dev` → `dev`,
    // else `prod`. Mobile rides the SAME ladder — a simulator build bakes the staging
    // DSN+env (→ staging project 6), a release build bakes prod (→ prod project 18). The
    // `platform` tag below is the SEGMENT that splits app from browser; overloading
    // `environment` with the platform (the old `mobile-<platform>`) collided with the tier.
    // Internal builds (ADR-083) take the tier from the runtime target instead.
    environment: target
      ? target.sentryEnvironment
      : publicEnv.PUBLIC_SENTRY_ENVIRONMENT || (dev ? 'dev' : 'prod'),
    release: publicEnv.PUBLIC_SENTRY_RELEASE || undefined,

    // Tag every event `component: orrery` (+ `platform`) so streams stay separable in the
    // self-hosted GlitchTip shared with the podcast app. Per-environment projects: prod = 18,
    // staging = 6, dev = 7 (the DSN's project id selects it). In dev, also tag the worktree
    // (git branch) so parallel local sessions are distinguishable.
    initialScope: {
      tags: {
        component: 'orrery',
        platform,
        ...(dev ? { worktree: __DEV_WORKTREE__ || 'unknown' } : {}),
      },
    },

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
      // 0. Drop expected, non-actionable errors:
      //    - WebGLUnavailableError — the device can't start a 3D context; a
      //      fallback notice is shown (#474/#470/#430), not a bug to report.
      //    - deploy chunk-skew — a lazily-imported chunk 404s after a deploy; the
      //      vite:preloadError guard reloads to the fresh build.
      const exc = event.exception?.values?.[0];
      const sig = `${exc?.type ?? ''} ${exc?.value ?? ''}`;
      if (
        /WebGLUnavailableError|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(
          sig,
        )
      ) {
        return null;
      }
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
