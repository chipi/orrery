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
/**
 * The address-bar URL — what a shallow URL mirror must start from. A shallow
 * `replaceState` changes the address bar and `page.state` but never `page.url`,
 * which keeps the last real navigation's URL (SvelteKit's `replaceState`), so a
 * mirror built from `page.url` re-adds params another mirror removed and misses
 * the ones it wrote itself.
 */
export function currentUrl(): URL {
  return new URL(window.location.href);
}

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
