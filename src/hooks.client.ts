/**
 * SvelteKit client-side hooks (RFC-025 / ADR-067).
 *
 * Wires Sentry's `handleError` to the framework so unhandled errors in
 * route navigation, load functions, and Svelte component lifecycle
 * are captured + scrubbed before being reported.
 *
 * If `PUBLIC_SENTRY_DSN` is empty, `initSentry()` returns immediately
 * and `handleErrorWithSentry` returns a no-op handler — the framework
 * sees a silent default. Forks + local dev pay zero runtime cost.
 */
import { handleErrorWithSentry } from '@sentry/sveltekit';
import { initSentry } from '$lib/observability/sentry';
import { analyticsSuppressed } from '$lib/analytics-optout';

// ADR-092. /privacy tells the user "turning this off stops everything on this
// page", and that page describes crash reports — so the opt-out has to gate
// Sentry too, not just Umami. Without this the toggle would be a false claim:
// an opted-out visitor who hit an error would still ship a stack trace.
// This module is client-only, so `document.cookie` and `navigator` are
// available; when suppressed we never init, and `handleErrorWithSentry()`
// degrades to the same silent no-op it already uses for an empty DSN.
if (!analyticsSuppressed()) initSentry();

export const handleError = handleErrorWithSentry();
