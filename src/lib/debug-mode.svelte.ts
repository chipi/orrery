// Global debug mode (task #54) — one menu toggle gates every debug overlay: the
// generic DebugPanel and the AR diagnostic HUD. Available in EVERY build (so a
// prod/staging build on a device can flip it on to diagnose), defaults OFF, and
// persists across reloads. `?debug=1` still works (it just sets this on).
const STORAGE_KEY = 'orrery.debug';

/** The reactive flag. Import `{ debugMode }` and read `debugMode.enabled`. */
export const debugMode = $state({ enabled: false });

/** Initialise from localStorage + the `?debug=1` URL param. Client-only; call
 *  once from the root layout's onMount (SSR-safe — no-ops on the server). */
export function initDebugMode(): void {
  if (typeof window === 'undefined') return;
  let on = false;
  try {
    on = localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    /* storage unavailable */
  }
  try {
    if (new URLSearchParams(window.location.search).get('debug') === '1') on = true;
  } catch {
    /* no URL */
  }
  debugMode.enabled = on;
}

/** Set + persist the flag. */
export function setDebugMode(on: boolean): void {
  debugMode.enabled = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
  } catch {
    /* storage unavailable — stays in-memory for this session */
  }
}

export function toggleDebugMode(): void {
  setDebugMode(!debugMode.enabled);
}
