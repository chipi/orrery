// Curator Tour resume cookie (ADR-075 — narrow exception #2 to the
// no-client-storage rule). Holds the active-tour position so the user
// can close the tab and resume where they left off on the next visit.
//
// Schema:  { ep, pos, idx, cmp }    ~55–70 bytes URL-encoded
//   ep   episode id (must exist in the audio registry on read)
//   pos  positionSec, finite, 0 ≤ pos ≤ episode duration
//   idx  tourIndex, integer, 0 ≤ idx < tourSequence.length
//   cmp  compact-mode flag (0 | 1)
//
// Set when:    tour is active. Writes are throttled (~5 s) during
//              playback and immediate on pause / advance / compact-
//              toggle / overlay close.
// Cleared:     Stop Tour button, natural tour end, schema-validation
//              failure on read, unknown episode id on read.
// Compliance:  functional preference cookie under ePrivacy / GDPR.
//              No consent banner required. Mirrors ADR-057 precedent.

import { browser } from '$app/environment';

export const TOUR_COOKIE_NAME = 'orrery_tour';
export const TOUR_COOKIE_MAX_AGE_SEC = 2592000; // 30 days — see ADR-075
export const TOUR_COOKIE_WRITE_THROTTLE_MS = 5000;

export interface TourResumeState {
  ep: string;
  pos: number;
  idx: number;
  cmp: 0 | 1;
}

function validShape(value: unknown): value is TourResumeState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.ep !== 'string' || v.ep.length === 0 || v.ep.length > 80) return false;
  if (typeof v.pos !== 'number' || !Number.isFinite(v.pos) || v.pos < 0) return false;
  if (typeof v.idx !== 'number' || !Number.isInteger(v.idx) || v.idx < 0) return false;
  if (v.cmp !== 0 && v.cmp !== 1) return false;
  return true;
}

/**
 * Read the `orrery_tour` cookie. Returns null if absent, malformed,
 * fails schema, or `document` is unavailable (SSR). Callers that need
 * to clear a malformed cookie should follow up with `clearTourCookie()`
 * — this getter never side-effects.
 */
export function readTourCookie(): TourResumeState | null {
  if (!browser) return null;
  for (const raw of document.cookie.split(';')) {
    const eq = raw.indexOf('=');
    if (eq < 0) continue;
    const name = raw.slice(0, eq).trim();
    if (name !== TOUR_COOKIE_NAME) continue;
    const value = raw.slice(eq + 1).trim();
    try {
      const parsed = JSON.parse(decodeURIComponent(value));
      if (!validShape(parsed)) return null;
      return parsed;
    } catch {
      return null;
    }
  }
  return null;
}

function cookieSecureSuffix(): string {
  return location.protocol === 'https:' ? '; Secure' : '';
}

/**
 * Write the `orrery_tour` cookie. Caller is responsible for triggering
 * — this helper has no internal "should I write?" logic. See
 * `writeTourCookieDebounced` for the rate-limited variant.
 */
export function writeTourCookie(state: TourResumeState): void {
  if (!browser) return;
  if (!validShape(state)) return;
  const payload = encodeURIComponent(JSON.stringify(state));
  document.cookie = `${TOUR_COOKIE_NAME}=${payload}; Max-Age=${TOUR_COOKIE_MAX_AGE_SEC}; Path=/; SameSite=Lax${cookieSecureSuffix()}`;
}

/** Delete the cookie immediately (Max-Age=0). */
export function clearTourCookie(): void {
  if (!browser) return;
  document.cookie = `${TOUR_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax${cookieSecureSuffix()}`;
}

// Module-level debounce state. The writer only persists the LAST state
// the caller asked us to write within the throttle window — keeps the
// cookie traffic bounded under continuous `positionSec` updates while
// still flushing every 5 s during steady playback.
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingState: TourResumeState | null = null;

export function writeTourCookieDebounced(
  state: TourResumeState,
  delayMs: number = TOUR_COOKIE_WRITE_THROTTLE_MS,
): void {
  if (!browser) return;
  if (!validShape(state)) return;
  pendingState = state;
  if (debounceTimer !== null) return;
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    if (pendingState) {
      writeTourCookie(pendingState);
      pendingState = null;
    }
  }, delayMs);
}

/**
 * Flush any pending debounced write immediately. Used by callers that
 * need to capture a final state (e.g. overlay close, page unload)
 * without waiting for the throttle window to elapse.
 */
export function flushTourCookieWrite(): void {
  if (!browser) return;
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (pendingState) {
    writeTourCookie(pendingState);
    pendingState = null;
  }
}

/** Test-only: reset module-level debounce state between specs. */
export function __resetTourCookieDebounceForTest(): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  pendingState = null;
}
