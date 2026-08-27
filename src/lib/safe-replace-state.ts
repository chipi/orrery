import { replaceState } from '$app/navigation';

/**
 * SvelteKit `replaceState` that does not throw when called before the client
 * router is initialized (#465). On a cold deep-link (`?context=` / `?id=`),
 * URL-sync effects can fire during hydration before SvelteKit's router is ready,
 * and `replaceState` throws "Cannot call replaceState(...) before the router is
 * initialized". We fall back to the History API — the URL still updates (the
 * point of the call); the shallow page-state sync is skipped only in that rare
 * pre-init window, after which normal `replaceState` takes over.
 */
export function safeReplaceState(url: string | URL, state: App.PageState): void {
  try {
    replaceState(url, state);
  } catch {
    try {
      history.replaceState(state, '', typeof url === 'string' ? url : url.href);
    } catch {
      /* history unavailable (SSR / locked-down env) — nothing more to do */
    }
  }
}
