/**
 * SvelteKit server-side hooks. Runs during prerender (adapter-static
 * has no runtime server — these execute at build time only).
 *
 * The Paraglide handle wrapper inspects the request URL for a locale
 * prefix (`/de/...`, `/fr/...`) and binds that locale to the request
 * scope so `getLocale()` returns the right value during server-side
 * message resolution. At prerender time this means each per-locale
 * URL emits a static page with that locale's strings baked in.
 *
 * Per-route `<html lang>` + `<html dir>` injection: %paraglide.lang%
 * and %paraglide.textDirection% in src/app.html are filled by the
 * `transformPageChunk` step below.
 */
import { paraglideMiddleware } from '$lib/paraglide/server';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = ({ event, resolve }) =>
  paraglideMiddleware(event.request, ({ request, locale }) => {
    event.request = request;
    return resolve(event, {
      transformPageChunk: ({ html }) =>
        html.replace('%paraglide.lang%', locale).replace(
          '%paraglide.textDirection%',
          locale === 'ar' ? 'rtl' : 'ltr',
        ),
    });
  });
