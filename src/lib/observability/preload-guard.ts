/**
 * Reload-once guard for Vite preload failures (`vite:preloadError`).
 *
 * Vite's preload helper fires this for BOTH failed dynamic-import chunks and failed
 * stylesheet preloads ("Unable to preload CSS for …") through the same
 * `handlePreloadError`, and rethrows unless the event is `preventDefault()`ed. A stale tab
 * after a deploy, or a transient network drop, is fixed by one reload to a fresh manifest.
 * Rate-limited so a genuinely missing asset surfaces instead of looping.
 */
const SKEW_KEY = 'orrery.skew-reload-at';
export const SKEW_WINDOW_MS = 20000;

let installed = false;
// Once the guard has decided to reload, this page is being discarded. A prevented
// preload error makes Vite's helper resolve the import to undefined, so code waiting
// on it can still throw before the reload lands (SvelteKit reads `node.universal` on
// the missing route node — #616). Those errors describe an abandoned page, not a bug.
let reloading = false;

/** True once the guard has started a reload of this page. */
export function isGuardReloading(): boolean {
  return reloading;
}

export function installPreloadReloadGuard(): void {
  if (typeof window === 'undefined' || installed) return;
  installed = true;
  window.addEventListener('vite:preloadError', (e) => {
    let last = 0;
    try {
      last = Number(sessionStorage.getItem(SKEW_KEY) || '0');
    } catch {
      /* storage unavailable */
    }
    if (Date.now() - last < SKEW_WINDOW_MS) return;
    e.preventDefault();
    try {
      sessionStorage.setItem(SKEW_KEY, String(Date.now()));
    } catch {
      /* storage unavailable */
    }
    reloading = true;
    window.location.reload();
  });
}

/** Test seam: allow re-installing in a fresh jsdom window. */
export function _resetPreloadGuardForTests(): void {
  installed = false;
  reloading = false;
}
