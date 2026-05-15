/**
 * Umami analytics — production-only loader + thin event API.
 *
 * The Umami `script.js` is intentionally NOT in `src/app.html` because
 * that loads it on every host (localhost, vite preview, CI smoke
 * tests, GitHub Pages). We only want production traffic from
 * `chipi.github.io` counted; local dev + preview should be silent.
 *
 * Privacy stance: Umami is cookieless, PII-free, GDPR-friendly. Even
 * so, we restrict loading to the public host so the analytics dataset
 * is "real visitors" and not "engineer reloads".
 *
 * Event API: pass-through to `window.umami.track(name, props?)`.
 * Safe to call before the script loads (Umami queues internally) and
 * safe to call outside production (no-op).
 *
 * Suggested events to wire (see issue tracker — out-of-scope for this
 * file):
 *  - `mission-load` { id, dest, view } when a mission is loaded on /fly
 *  - `lens-toggle` { on } when the Science Lens flips
 *  - `layer-toggle` { layer, on } when a science layer flips
 *  - `science-section-view` { tab, section } on /science section page mount
 *  - `panel-tab-open` { entity, tab } on the mission/planet/etc panel tabs
 *  - `locale-switch` { from, to } when the user picks a locale chip
 *  - `cmdk-search` { query } when /science Cmd-K search lands a hit
 */

const UMAMI_SCRIPT_URL = 'https://cloud.umami.is/script.js';
const UMAMI_WEBSITE_ID = 'fb07dfd6-1186-4a09-8e3b-524e6b5ac145';

/** Production URLs where Umami should actually load. Each entry is a
 *  (hostname, pathPrefix) pair. Both must match. Hosts where Orrery is
 *  *not* the only thing served — chipi.github.io hosts the user's
 *  other repos too — are scoped down to the `/orrery` sub-path so we
 *  don't count traffic that doesn't belong to this app. Localhost,
 *  `vite preview`, screenshot pipeline, e2e runs are all silent. */
const PRODUCTION_URLS: ReadonlyArray<{ hostname: string; pathPrefix: string }> = [
  { hostname: 'chipi.github.io', pathPrefix: '/orrery' },
];

function isProductionUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const { hostname, pathname } = window.location;
  return PRODUCTION_URLS.some(
    (entry) => entry.hostname === hostname && pathname.startsWith(entry.pathPrefix),
  );
}

/** Inject the Umami `<script>` exactly once, only on production URLs.
 *  Safe to call multiple times (idempotent). Call from the root
 *  +layout's onMount so it lands AFTER the route mounts but before
 *  most user interactions. */
export function initAnalytics(): void {
  if (!isProductionUrl()) return;
  if (document.querySelector('script[data-umami-installed]')) return;
  const s = document.createElement('script');
  s.defer = true;
  s.src = UMAMI_SCRIPT_URL;
  s.dataset.websiteId = UMAMI_WEBSITE_ID;
  s.setAttribute('data-umami-installed', '1');
  document.head.appendChild(s);
}

type UmamiGlobal = {
  track?: (name: string, props?: Record<string, unknown>) => void;
};

/** Track a custom event. Safe to call before the Umami script loads
 *  (it queues internally), and a no-op on non-production URLs. The
 *  second-line production-URL guard means in-app events never fire if
 *  the user somehow navigates outside /orrery on the same domain. */
export function track(name: string, props?: Record<string, unknown>): void {
  if (!isProductionUrl()) return;
  const u = (window as unknown as { umami?: UmamiGlobal }).umami;
  if (u?.track) {
    u.track(name, props);
  }
}
