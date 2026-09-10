// Analytics opt-out + browser privacy signals (ADR-092 — narrow exception #3
// to the no-client-storage rule). Two independent ways for a user to switch
// usage analytics off; `analyticsSuppressed()` is the OR of both and is the
// single gate `analytics.ts` consults.
//
//   1. EXPLICIT — the `orrery_analytics_optout` cookie, set from the toggle on
//      /privacy. Present with value '1' → suppressed. Opting back in DELETES
//      the cookie rather than writing '0', so the default state stores nothing
//      at all and a user who never touches the toggle carries no cookie.
//
//   2. SIGNALLED — the browser told us, before we ever rendered a control:
//      • `navigator.globalPrivacyControl === true` (GPC). This is the signal
//        with actual legal force — binding under CCPA/CPRA in California and
//        recognised in Colorado + Connecticut.
//      • `navigator.doNotTrack === '1'` (DNT). The W3C group closed in 2019
//        without a standard and Firefox dropped its toggle, so no jurisdiction
//        requires this. It costs one expression to honour alongside GPC, so we
//        do — but GPC is the one that matters, and DNT alone would have been
//        the wrong thing to build.
//
// Compliance: the opt-out cookie is a strictly-necessary cookie under
// ePrivacy — it records the user's objection and exists only to be obeyed.
// It is the narrowest possible category and needs no consent banner. Umami
// itself remains cookieless; see ADR-092 for why no banner is required for
// the analytics as a whole, and ADR-081 for the integration.

import { browser } from '$app/environment';

export const OPTOUT_COOKIE_NAME = 'orrery_analytics_optout';
/** 1 year — mirrors `orrery_locale` (ADR-057). An objection should outlive a session. */
export const OPTOUT_COOKIE_MAX_AGE_SEC = 31536000;

function cookieSecureSuffix(): string {
  return location.protocol === 'https:' ? '; Secure' : '';
}

/**
 * Has the user explicitly opted out via the /privacy toggle?
 * SSR-safe (returns false with no `document`).
 */
export function readOptOutCookie(): boolean {
  if (!browser) return false;
  for (const raw of document.cookie.split(';')) {
    const eq = raw.indexOf('=');
    if (eq < 0) continue;
    if (raw.slice(0, eq).trim() !== OPTOUT_COOKIE_NAME) continue;
    return raw.slice(eq + 1).trim() === '1';
  }
  return false;
}

/**
 * Record (or clear) the explicit opt-out. `true` writes the cookie; `false`
 * deletes it, so the opted-in default leaves nothing behind on the device.
 */
export function writeOptOutCookie(optedOut: boolean): void {
  if (!browser) return;
  const suffix = `Path=/; SameSite=Lax${cookieSecureSuffix()}`;
  document.cookie = optedOut
    ? `${OPTOUT_COOKIE_NAME}=1; Max-Age=${OPTOUT_COOKIE_MAX_AGE_SEC}; ${suffix}`
    : `${OPTOUT_COOKIE_NAME}=; Max-Age=0; ${suffix}`;
}

/**
 * Is the browser itself asking us not to track? GPC first (legally
 * meaningful), DNT second (goodwill). Reads defensively — both properties are
 * non-standard on `Navigator`, and older browsers put DNT on `window`.
 */
export function browserPrivacySignal(): boolean {
  if (!browser) return false;
  const nav = navigator as Navigator & {
    globalPrivacyControl?: boolean;
    msDoNotTrack?: string;
  };
  if (nav.globalPrivacyControl === true) return true;
  const win = window as Window & { doNotTrack?: string };
  const dnt = nav.doNotTrack ?? win.doNotTrack ?? nav.msDoNotTrack;
  return dnt === '1' || dnt === 'yes';
}

/**
 * The single gate. True when analytics must not run — either the user said so
 * or their browser did. `analytics.ts` checks this before injecting the Umami
 * script AND on every `track()`, so flipping the toggle stops custom events
 * immediately (the /privacy toggle reloads to also drop Umami's own autotrack,
 * whose history listeners are bound at script load and cannot be unbound).
 */
export function analyticsSuppressed(): boolean {
  return readOptOutCookie() || browserPrivacySignal();
}
