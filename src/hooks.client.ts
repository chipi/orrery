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

initSentry();

export const handleError = handleErrorWithSentry();
