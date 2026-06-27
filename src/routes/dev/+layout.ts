import { error } from '@sveltejs/kit';

/**
 * Production guard for all /dev/* developer tooling (model preview,
 * staging-ground review, Slice-A approval surface, UI style-guide).
 *
 * These routes opt out of SSR + prerender, but with adapter-static's SPA
 * 404.html fallback they were still reachable client-side in the deployed
 * site (their chunks ship; the page renders). Their file-backed `+server.ts`
 * APIs also can't run on static hosting. This single layout guard 404s the
 * whole /dev subtree in any non-dev build, so the tooling is dev-only in
 * practice, not just by intent. `import.meta.env.DEV` is a compile-time
 * constant — false in the prod bundle, so this collapses to an always-404.
 */
export const prerender = false;
export const ssr = false;

export function load() {
  if (!import.meta.env.DEV) {
    throw error(404, 'Not found');
  }
}
